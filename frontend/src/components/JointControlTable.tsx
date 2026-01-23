import { useState } from 'react';
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

  // Local state for global increment override
  const [incrementOverride, setIncrementOverride] = useState<string>("5.0");

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
    // Use override if valid, otherwise fallback to metadata default
    const step = parseFloat(incrementOverride) || meta.defaultIncrement;
    const delta = direction === '+' ? step : -step;

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
      <div className="flex flex-col gap-4 mb-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {t('robot.jointControl')}
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-secondary/5 rounded-lg border border-border/40">
          {/* Global Increment Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
              {t('robot.increment') || 'Step'}:
            </span>
            <div className="relative w-16">
              <Input
                type="number"
                value={incrementOverride}
                onChange={(e) => setIncrementOverride(e.target.value)}
                className="h-7 pr-4 text-xs text-right bg-background shadow-sm"
                min={0.1}
                step={0.1}
                disabled={isMoving}
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">°</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isMoving}
              className="gap-2 h-7 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('robot.reset') || 'Reset'}
            </Button>

            {isTargetDirty && (
              <Button
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={isMoving}
                className="gap-2 h-7 text-xs bg-primary hover:bg-primary/90"
              >
                {isMoving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('robot.moving') || 'Moving...'}
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {t('robot.apply') || 'Apply'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Joint Rows */}
      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
        {jointMetadata.map((joint) => {
          const isDirty = isJointDirty(joint.id);
          const delta = getDelta(joint.id);
          const targetAngle = targetJoints[joint.id - 1];
          const actualAngle = actualJoints[joint.id - 1];

          return (
            <div
              key={joint.id}
              // Reduced gap-3 to gap-2, reduced p-3 to p-2 for tighter vertical/horizontal spacing
              className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isDirty
                ? 'bg-primary/5 border-primary/50 shadow-sm'
                : 'bg-secondary/10 border-border/50'
                } ${isMoving ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {/* Joint Name - Reduced width to w-16 */}
              <div className="w-16 shrink-0">
                <div className="text-[10px] text-muted-foreground font-mono">J{joint.id}</div>
                <div className="text-sm font-bold text-foreground leading-tight truncate" title={joint.name}>
                  {joint.name}
                </div>
              </div>

              {/* Buttons - Kept compact */}
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  onClick={() => handleIncrement(joint.id, '-')}
                  disabled={isMoving}
                  title={`-${incrementOverride}°`}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                  onClick={() => handleIncrement(joint.id, '+')}
                  disabled={isMoving}
                  title={`+${incrementOverride}°`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Slider - flex-1 allows it to fill all gained space */}
              <div className="flex-1 px-2 min-w-[40px]">
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

              {/* Input - Reduced width to w-20 (~80px) */}
              <div className="w-20 shrink-0">
                <div className="flex items-center bg-background border rounded h-8 px-1 focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
                  <Input
                    type="number"
                    value={targetAngle.toFixed(2)}
                    onChange={(e) => handleInputChange(joint.id, e.target.value)}
                    disabled={isMoving}
                    className="border-0 p-0 h-6 text-sm text-center focus-visible:ring-0 font-mono w-full min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] text-muted-foreground ml-0.5">°</span>
                </div>
              </div>

              {/* Actual Display - Reduced width to w-24 and aligned text to right to eliminate visual gap */}
              <div className="w-24 shrink-0 flex flex-col gap-0.5 text-right">
                <div className="text-[10px] text-muted-foreground font-mono truncate" title={`Actual: ${actualAngle.toFixed(2)}°`}>
                  Act: {actualAngle.toFixed(2)}°
                </div>
                {isDirty && (
                  <div className={`text-[10px] font-semibold font-mono truncate ${delta > 0 ? 'text-primary' : 'text-destructive'
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