import { useTranslation } from "react-i18next";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useRobotStore } from '@/stores/robotStore';

const JointControlTable = () => {
  const { t } = useTranslation();
  const { joints, updateJoint, setJoints } = useRobotStore();

  // Step values for each joint (in degrees)
  const jointStepValues: { [key: number]: number } = {
    1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5
  };

  const handleJog = async (jointId: number, direction: '+' | '-') => {
    const stepValue = jointStepValues[jointId] || 5;
    const joint = joints.find(j => j.id === jointId);
    if (!joint) return;

    const newAngle = direction === '+' ? joint.angle + stepValue : joint.angle - stepValue;
    updateJoint(jointId, parseFloat(newAngle.toFixed(2)));

    try {
      await api.jointMove(jointId, stepValue, direction);
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    }
  };

  const resetJoints = () => {
    setJoints(joints.map(j => ({ ...j, angle: 0 })));
    toast.success('Joints reset locally');
  };

  return (
    <div className="bg-card border rounded-xl p-6 h-full flex flex-col shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t('robot.jointControl')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={resetJoints}
          className="gap-2 h-8"
        >
          <RotateCcw className="w-4 h-4" />
          {t('logs.clear')}
        </Button>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1 pr-2">
        {joints.map((joint) => (
          <div
            key={joint.id}
            className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg bg-secondary/10 border border-border/50 hover:bg-secondary/20 transition-colors"
          >
            {/* Joint Name & ID */}
            <div className="col-span-3">
              <div className="text-[10px] text-muted-foreground font-mono">Z{joint.id}</div>
              <div className="text-sm font-bold text-foreground leading-tight">{joint.name}</div>
            </div>

            {/* Jog Controls */}
            <div className="col-span-2 flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => handleJog(joint.id, '-')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => handleJog(joint.id, '+')}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>

            {/* Angle Slider */}
            <div className="col-span-4 px-2">
              <Slider
                value={[joint.angle]}
                onValueChange={(values) => updateJoint(joint.id, values[0])}
                min={joint.min}
                max={joint.max}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Current Angle */}
            <div className="col-span-3">
              <div className="flex items-center bg-background border rounded h-8 px-2 focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
                <Input
                  type="number"
                  value={joint.angle}
                  onChange={(e) => updateJoint(joint.id, parseFloat(e.target.value) || 0)}
                  className="border-0 p-0 h-6 text-sm text-center focus-visible:ring-0 appearance-none font-mono"
                />
                <span className="text-[10px] text-muted-foreground ml-1">°</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JointControlTable;
