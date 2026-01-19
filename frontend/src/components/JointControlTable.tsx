import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from 'sonner';

const JointControlTable = () => {
  const { t } = useTranslation();

  // Local state for joints (simplified)
  const [joints, setJoints] = useState([
    { id: 1, name: 'Base', angle: 0, min: -360, max: 360 },
    { id: 2, name: 'Shoulder', angle: 0, min: -360, max: 360 },
    { id: 3, name: 'Elbow', angle: 0, min: -360, max: 360 },
    { id: 4, name: 'Wrist 1', angle: 0, min: -360, max: 360 },
    { id: 5, name: 'Wrist 2', angle: 0, min: -360, max: 360 },
    { id: 6, name: 'Wrist 3', angle: 0, min: -360, max: 360 },
  ]);

  // Step values for each joint (in radians)
  const jointStepValues: { [key: number]: number } = {
    1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1, 6: 0.1
  };

  const setJointAngle = (id: number, angle: number) => {
    setJoints(prev => prev.map(j => j.id === id ? { ...j, angle: parseFloat(angle.toFixed(2)) } : j));
  };

  const handleJog = async (jointId: number, direction: '+' | '-') => {
    const stepValue = jointStepValues[jointId] || 0.1;

    // Convert radians to degrees for display (roughly 1 rad = 57.3 deg)
    const deltaDegrees = (stepValue * 180) / Math.PI;
    const joint = joints.find(j => j.id === jointId);
    if (!joint) return;

    const newAngle = direction === '+' ? joint.angle + deltaDegrees : joint.angle - deltaDegrees;
    setJointAngle(jointId, newAngle);

    try {
      await api.jointMove(jointId, stepValue, direction);
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    }
  };

  const resetJoints = () => {
    setJoints(prev => prev.map(j => ({ ...j, angle: 0 })));
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
            className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg bg-secondary/10 border border-border/50"
          >
            {/* Joint Name & ID */}
            <div className="col-span-3">
              <div className="text-[10px] text-muted-foreground">Z{joint.id}</div>
              <div className="text-sm font-bold text-foreground leading-tight">{joint.name}</div>
            </div>

            {/* Jog Controls */}
            <div className="col-span-2 flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleJog(joint.id, '-')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleJog(joint.id, '+')}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>

            {/* Angle Slider */}
            <div className="col-span-4 px-2">
              <Slider
                value={[joint.angle]}
                onValueChange={(values) => setJointAngle(joint.id, values[0])}
                min={joint.min}
                max={joint.max}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Current Angle */}
            <div className="col-span-3">
              <div className="flex items-center bg-background border rounded h-8 px-2">
                <Input
                  type="number"
                  value={joint.angle}
                  onChange={(e) => setJointAngle(joint.id, parseFloat(e.target.value) || 0)}
                  className="border-0 p-0 h-6 text-sm text-center focus-visible:ring-0"
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
