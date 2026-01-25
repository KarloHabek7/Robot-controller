import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Minus, Plus, RotateCcw, Check, Loader2, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
    isEStopActive,
    updateTargetJoint,
    commitTargetJoints,
    resetTargetToActual,
    directControlEnabled,
    setDirectControlEnabled,
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

    if (directControlEnabled) {
      // Small timeout to ensure store is updated before commit
      setTimeout(() => commitTargetJoints(), 0);
    }
  };

  // Slider handler
  const handleSliderChange = (jointId: number, value: number) => {
    updateTargetJoint(jointId, parseFloat(value.toFixed(2)));
  };

  const handleSliderCommit = () => {
    if (directControlEnabled) {
      commitTargetJoints();
    }
  };

  // Input handler
  const handleInputChange = (jointId: number, value: string) => {
    const meta = jointMetadata.find(j => j.id === jointId);
    if (!meta) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const clampedValue = Math.max(meta.min, Math.min(meta.max, numValue));
    updateTargetJoint(jointId, parseFloat(clampedValue.toFixed(2)));

    if (directControlEnabled) {
      setTimeout(() => commitTargetJoints(), 0);
    }
  };

  // Apply handler
  const handleApply = async () => {
    try {
      await commitTargetJoints();
      toast.success(t('robot.movingToTarget'));
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    }
  };

  // Reset handler
  const handleReset = () => {
    resetTargetToActual();
    toast.info(t('robot.targetReset'));
  };

  return (
    <div className="bg-card border rounded-xl p-6 h-full flex flex-col shadow-sm">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-secondary/5 rounded-lg border border-border/40">
          {/* Global Increment Adjustment */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-secondary/10 rounded-full border border-border/40 pl-3 pr-1 py-0.5 gap-2">
              <span className="text-[9px] text-muted-foreground font-black tracking-tighter uppercase whitespace-nowrap">
                {t('robot.step', { unit: '°' })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full hover:bg-white/10"
                  onClick={() => setIncrementOverride((Math.max(0.1, parseFloat(incrementOverride) - 0.5)).toFixed(1))}
                  disabled={isMoving || isEStopActive}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-8">
                  <Input
                    type="number"
                    value={incrementOverride}
                    onChange={(e) => setIncrementOverride(e.target.value)}
                    className="h-5 border-0 bg-transparent p-0 text-[11px] font-black text-center focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    disabled={isMoving || isEStopActive}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full hover:bg-white/10"
                  onClick={() => setIncrementOverride((parseFloat(incrementOverride) + 0.5).toFixed(1))}
                  disabled={isMoving || isEStopActive}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="h-4 w-px bg-border/40 mx-1" />

            <div className="flex items-center gap-2">
              <Zap className={`w-3.5 h-3.5 ${directControlEnabled ? 'text-amber-500 fill-amber-500/20' : 'text-muted-foreground'}`} />
              <Label htmlFor="direct-control" className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground cursor-pointer">
                {t('robot.directControl')}
              </Label>
              <Switch
                id="direct-control"
                checked={directControlEnabled}
                onCheckedChange={setDirectControlEnabled}
                className="scale-75"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isMoving || isEStopActive}
              className="gap-2 h-7 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('robot.reset')}
            </Button>

            {!directControlEnabled && isTargetDirty && (
              <Button
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={isMoving || isEStopActive}
                className="gap-2 h-7 text-xs bg-primary hover:bg-primary/90"
              >
                {isMoving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('robot.moving')}
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {t('robot.apply')}
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
                } ${(isMoving || isEStopActive) ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {/* Joint Name - Compact */}
              <div className="w-14 shrink-0">
                <div className="text-[10px] text-muted-foreground font-mono">J{joint.id}</div>
                <div className="text-sm font-bold text-foreground leading-tight truncate" title={t(joint.name)}>
                  {t(joint.name)}
                </div>
              </div>

              {/* Buttons - Circular style like TCP */}
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  onClick={() => handleIncrement(joint.id, '-')}
                  disabled={isMoving}
                  title={`-${incrementOverride}°`}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                  onClick={() => handleIncrement(joint.id, '+')}
                  disabled={isMoving}
                  title={`+${incrementOverride}°`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Slider - flex-1 takes all available middle space */}
              <div className="flex-1 px-4 min-w-[60px]">
                <Slider
                  value={[targetAngle]}
                  onValueChange={(values) => handleSliderChange(joint.id, values[0])}
                  onValueCommit={handleSliderCommit}
                  min={joint.min}
                  max={joint.max}
                  step={0.1}
                  className="w-full"
                  disabled={isMoving}
                />
              </div>

              {/* Right Cluster: Input and status */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 shrink-0">
                  <div className="flex items-center bg-background border rounded h-8 px-1 focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
                    <Input
                      type="number"
                      value={targetAngle.toFixed(2)}
                      onChange={(e) => handleInputChange(joint.id, e.target.value)}
                      disabled={isMoving}
                      className="border-0 p-0 h-6 text-sm text-center focus-visible:ring-0 font-mono w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-muted-foreground ml-0.5">°</span>
                  </div>
                </div>

                <div className="w-20 shrink-0 flex flex-col gap-0 justify-center text-right overflow-hidden pr-1">
                  <div className="text-[9px] text-muted-foreground/60 font-mono leading-tight truncate">
                    {t('robot.act')} <span className="text-foreground/80">{actualAngle.toFixed(2)}°</span>
                  </div>
                  {isDirty && (
                    <div className="text-[9px] font-bold font-mono text-primary leading-tight truncate">
                      {t('robot.delta')} {delta > 0 ? '+' : ''}{delta.toFixed(2)}°
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JointControlTable;