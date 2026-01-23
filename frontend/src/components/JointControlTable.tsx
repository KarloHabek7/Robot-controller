import { useTranslation } from "react-i18next";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Minus, Plus, RotateCcw, Check, Loader2 } from 'lucide-react';

import { toast } from 'sonner';
import { useRobotStore } from '@/stores/robotStore';

const JointControlTable = () => {
  const { t } = useTranslation();
  const {
    actualJoints,
    targetJoints,
    jointMetadata,
    isTargetDirty,
    isMoving,
    updateTargetJoint,
    commitTargetJoints,
    resetTargetToActual,
  } = useRobotStore();

  // Calculate delta for a joint
  const getDelta = (jointId: number): number => {
    const delta = targetJoints[jointId - 1] - actualJoints[jointId - 1];
    return parseFloat(delta.toFixed(2));
  };

  // Check if a specific joint is dirty
  const isJointDirty = (jointId: number): boolean => {
    return Math.abs(getDelta(jointId)) > 0.1;
  };

  // Increment handler
  const handleIncrement = (jointId: number, direction: '+' | '-') => {
    const meta = jointMetadata.find(j => j.id === jointId);
    if (!meta) return;

    const currentTarget = targetJoints[jointId - 1];
    const delta = direction === '+' ? meta.defaultIncrement : -meta.defaultIncrement;
    const newAngle = Math.max(meta.min, Math.min(meta.max, currentTarget + delta));
    updateTargetJoint(jointId, parseFloat(newAngle.toFixed(2)));
  };

  // Slider handler
  const handleSliderChange = (jointId: number, value: number) => {
    updateTargetJoint(jointId, parseFloat(value.toFixed(2)));
  };

  // Input handler
  const handleInputChange = (jointId: number, value: string) => {
    const meta = jointMetadata.find(j => j.id === jointId);
    if (!meta) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const clampedValue = Math.max(meta.min, Math.min(meta.max, numValue));
    updateTargetJoint(jointId, parseFloat(clampedValue.toFixed(2)));
  };

  // Apply handler
  const handleApply = async () => {
    try {
      await commitTargetJoints();
      toast.success(t('robot.movingToTarget') || 'Moving to target position...');
    } catch (error) {
      toast.error(t('errors.commandFailed') || 'Failed to send movement command');
    }
  };

  // Reset handler
  const handleReset = () => {
    resetTargetToActual();
    toast.info(t('robot.targetReset') || 'Target reset to actual position');
  };

  return (
    <div className="bg-card border rounded-xl p-6 h-full flex flex-col shadow-sm">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t('robot.jointControl')}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isMoving}
            className="gap-2 h-8"
          >
            <RotateCcw className="w-4 h-4" />
            {t('robot.reset') || 'Reset'}
          </Button>
          {isTargetDirty && (
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={isMoving}
              className="gap-2 h-8 bg-primary hover:bg-primary/90"
            >
              {isMoving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('robot.moving') || 'Moving...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t('robot.apply') || 'Apply'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Joint Rows */}
      <div className="space-y-3 overflow-y-auto flex-1 pr-2">
        {jointMetadata.map((joint) => {
          const isDirty = isJointDirty(joint.id);
          const delta = getDelta(joint.id);
          const targetAngle = targetJoints[joint.id - 1];
          const actualAngle = actualJoints[joint.id - 1];

          return (
            <div
              key={joint.id}
              className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg border transition-all ${isDirty
                  ? 'bg-primary/5 border-primary/50 shadow-sm'
                  : 'bg-secondary/10 border-border/50'
                } ${isMoving ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {/* Joint Name & ID */}
              <div className="col-span-2">
                <div className="text-[10px] text-muted-foreground font-mono">J{joint.id}</div>
                <div className="text-sm font-bold text-foreground leading-tight">{joint.name}</div>
              </div>

              {/* Increment/Decrement Buttons */}
              <div className="col-span-2 flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => handleIncrement(joint.id, '-')}
                  disabled={isMoving}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => handleIncrement(joint.id, '+')}
                  disabled={isMoving}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Slider */}
              <div className="col-span-3 px-2">
                <Slider
                  value={[targetAngle]}
                  onValueChange={(values) => handleSliderChange(joint.id, values[0])}
                  min={joint.min}
                  max={joint.max}
                  step={0.1}
                  className="w-full"
                  disabled={isMoving}
                />
              </div>

              {/* Target Input */}
              <div className="col-span-2">
                <div className="flex items-center bg-background border rounded h-8 px-2 focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
                  <Input
                    type="number"
                    value={targetAngle.toFixed(2)}
                    onChange={(e) => handleInputChange(joint.id, e.target.value)}
                    disabled={isMoving}
                    className="border-0 p-0 h-6 text-sm text-center focus-visible:ring-0 appearance-none font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground ml-1">°</span>
                </div>
              </div>

              {/* Actual Display & Delta */}
              <div className="col-span-3 flex flex-col gap-0.5">
                <div className="text-[10px] text-muted-foreground font-mono">
                  Actual: {actualAngle.toFixed(2)}°
                </div>
                {isDirty && (
                  <div className={`text-[10px] font-semibold font-mono ${delta > 0 ? 'text-primary' : 'text-destructive'
                    }`}>
                    Δ {delta > 0 ? '+' : ''}{delta.toFixed(2)}°
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JointControlTable;
