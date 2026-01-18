import { useRobotStore } from '@/stores/robotStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { urRobotService } from '@/services/urRobotService';
import { toast } from 'sonner';

const JointControlTable = () => {
  const { currentConfig, updateJoint, setJointAngle, resetJoints } = useRobotStore();

  // Step values for each joint (in radians, as per PDF specification)
  const jointStepValues: { [key: number]: number } = {
    1: 0.01, // Z1
    2: 0.02, // Z2
    3: 0.03, // Z3
    4: 0.04, // Z4
    5: 0.05, // Z5
    6: 0.06, // Z6
  };

  if (!currentConfig) {
    return (
      <div className="card-premium rounded-xl p-6 text-center text-muted-foreground">
        No robot configuration loaded
      </div>
    );
  }

  const handleJog = async (jointId: number, direction: '+' | '-') => {
    const joint = currentConfig.joints.find(j => j.id === jointId);
    if (!joint) return;
    
    const stepValue = jointStepValues[jointId] || 0.01;
    const delta = direction === '+' ? stepValue : -stepValue;
    
    // Convert radians to degrees for display
    const deltaDegrees = (delta * 180) / Math.PI;
    
    const newAngle = Math.max(
      joint.minLimit,
      Math.min(joint.maxLimit, joint.angle + deltaDegrees)
    );
    setJointAngle(jointId, newAngle);

    // Send to robot backend
    try {
      await urRobotService.moveJoint({
        joint: jointId,
        value: stepValue,
        direction,
      });
    } catch (error) {
      toast.error(`Failed to move joint ${jointId}`);
    }
  };

  return (
    <div className="card-premium rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Joint Control
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={resetJoints}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset All
        </Button>
      </div>

      <div className="space-y-4 overflow-y-auto flex-1">
        {currentConfig.joints.map((joint) => (
          <div
            key={joint.id}
            className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors border border-border/50"
          >
            {/* Joint Name & ID */}
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Z{joint.id} (Step: {jointStepValues[joint.id]}rad)</div>
              <div className="text-sm font-semibold text-foreground">{joint.name}</div>
            </div>

            {/* Jog Controls */}
            <div className="col-span-2 flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleJog(joint.id, '-')}
                disabled={!joint.enabled}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleJog(joint.id, '+')}
                disabled={!joint.enabled}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>

            {/* Angle Slider */}
            <div className="col-span-4">
              <Slider
                value={[joint.angle]}
                onValueChange={(values) => setJointAngle(joint.id, values[0])}
                min={joint.minLimit}
                max={joint.maxLimit}
                step={0.1}
                disabled={!joint.enabled}
                className="w-full"
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{joint.minLimit}°</span>
                <span>{joint.maxLimit}°</span>
              </div>
            </div>

            {/* Current Angle */}
            <div className="col-span-2">
              <Input
                type="number"
                value={joint.angle.toFixed(1)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    const clamped = Math.max(joint.minLimit, Math.min(joint.maxLimit, value));
                    setJointAngle(joint.id, clamped);
                  }
                }}
                disabled={!joint.enabled}
                className="h-8 text-sm text-center"
              />
              <div className="text-xs text-muted-foreground text-center mt-1">degrees</div>
            </div>

            {/* Status Indicators */}
            <div className="col-span-1 flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground">Load</div>
              <div className="text-xs font-semibold">{joint.torque}%</div>
            </div>

            {/* Enable Switch */}
            <div className="col-span-1 flex justify-center">
              <Switch
                checked={joint.enabled}
                onCheckedChange={(checked) => updateJoint(joint.id, { enabled: checked })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JointControlTable;
