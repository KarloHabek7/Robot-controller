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
    programState,
  } = useRobotStore();

  const isProgramRunning = programState === 1;

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
    } catch (error: any) {
      toast.error(error.message || t('errors.commandFailed'));
    }
  };

  // Reset handler
  const handleReset = () => {
    resetTargetToActual();
    toast.info(t('robot.targetReset'));
  };

  return (
    <div className="bg-card border rounded-xl p-3 sm:p-6 h-full flex flex-col shadow-sm">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 mb-4 sm:mb-6 shrink-0">
        <div className="flex flex-nowrap items-center justify-between gap-1 sm:gap-3 p-1 sm:p-2 bg-secondary/5 rounded-lg border border-border/40 overflow-hidden">
          {/* Global Increment Adjustment */}
          <div className="flex items-center gap-1 sm:gap-3 min-w-0">
            <div className="flex items-center bg-secondary/10 rounded-full border border-border/40 pl-2 sm:pl-3 pr-1 py-0.5 gap-1 sm:gap-2 shrink-0">
              <span className="text-[8px] sm:text-[9px] text-muted-foreground font-black tracking-tighter uppercase whitespace-nowrap">
                {t('robot.step', { unit: '°' })}
              </span>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 sm:h-5 sm:w-5 rounded-full hover:bg-white/10"
                  onClick={() => setIncrementOverride((Math.max(0.1, parseFloat(incrementOverride) - 0.5)).toFixed(1))}
                  disabled={isMoving || isEStopActive || isProgramRunning}
                >
                  <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
                <div className="w-7 sm:w-8">
                  <Input
                    type="number"
                    value={incrementOverride}
                    onChange={(e) => setIncrementOverride(e.target.value)}
                    className="h-4 sm:h-5 border-0 bg-transparent p-0 text-[10px] sm:text-[11px] font-black text-center focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    disabled={isMoving || isEStopActive || isProgramRunning}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 sm:h-5 sm:w-5 rounded-full hover:bg-white/10"
                  onClick={() => setIncrementOverride((parseFloat(incrementOverride) + 0.5).toFixed(1))}
                  disabled={isMoving || isEStopActive || isProgramRunning}
                >
                  <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
              <Zap className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${directControlEnabled ? 'text-amber-500 fill-amber-500/20' : 'text-muted-foreground'}`} />
              <Label htmlFor="direct-control" className="text-[8px] sm:text-[10px] uppercase font-bold tracking-tight text-muted-foreground cursor-pointer whitespace-nowrap">
                <span className="hidden sm:inline">{t('robot.directControl')}</span>
                <span className="sm:hidden">{t('robot.direct')}</span>
              </Label>
              <Switch
                id="direct-control"
                checked={directControlEnabled}
                onCheckedChange={setDirectControlEnabled}
                disabled={isProgramRunning}
                className="scale-[0.6] sm:scale-75 origin-left"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isMoving || isEStopActive || isProgramRunning}
              className="gap-1 h-6 sm:h-7 px-1.5 sm:px-2 text-[9px] sm:text-xs"
            >
              <RotateCcw className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{t('robot.reset')}</span>
            </Button>

            {!directControlEnabled && isTargetDirty && (
              <Button
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={isMoving || isEStopActive || isProgramRunning}
                className="gap-1 h-6 sm:h-7 px-1.5 sm:px-2 text-[9px] sm:text-xs bg-primary hover:bg-primary/90"
              >
                {isMoving ? (
                  <>
                    <Loader2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 animate-spin" />
                    <span className="hidden sm:inline">{t('robot.moving')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">{t('robot.apply')}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Joint Rows */}
      <div className="space-y-2 overflow-y-auto flex-1 pr-1 no-scrollbar">
        {jointMetadata.map((joint) => {
          const isDirty = isJointDirty(joint.id);
          const delta = getDelta(joint.id);
          const targetAngle = targetJoints[joint.id - 1];
          const actualAngle = actualJoints[joint.id - 1];

          return (
            <div
              key={joint.id}
              className={`flex flex-col sm:flex-nowrap sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 rounded-lg border transition-all ${isDirty
                ? 'bg-primary/5 border-primary/50 shadow-sm'
                : 'bg-secondary/10 border-border/50'
                } ${(isMoving || isEStopActive || isProgramRunning) ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {/* Row 1: Controls and Info */}
              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                <div className="w-10 sm:w-14 shrink-0">
                  <div className="text-[8px] sm:text-[10px] text-muted-foreground font-mono">J{joint.id}</div>
                  <div className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate px-0.5" title={t(joint.name)}>
                    {t(joint.name)}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => handleIncrement(joint.id, '-')}
                    disabled={isMoving || isProgramRunning}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => handleIncrement(joint.id, '+')}
                    disabled={isMoving || isProgramRunning}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Actual and Input on Row 1 for mobile */}
                <div className="flex flex-1 items-center justify-end gap-2">
                  <div className="flex flex-col items-end shrink-0 sm:hidden">
                    <span className="text-[8px] text-muted-foreground/60 font-mono leading-none">{t('robot.act')}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-foreground/80 font-mono">{actualAngle.toFixed(1)}°</span>
                      {isDirty && (
                        <span className="text-[9px] font-black text-primary font-mono whitespace-nowrap">
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}°
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-16 sm:w-20 shrink-0">
                    <div className="flex items-center bg-background border rounded h-7 sm:h-8 px-1 focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
                      <Input
                        type="number"
                        value={targetAngle.toFixed(2)}
                        onChange={(e) => handleInputChange(joint.id, e.target.value)}
                        disabled={isMoving || isProgramRunning}
                        className="border-0 p-0 h-5 sm:h-6 text-xs sm:text-sm text-center focus-visible:ring-0 font-mono w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-0.5">°</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slider - takes available space (full width on mobile second row, flex-1 on desktop) */}
              <div className="w-full sm:flex-1 px-1 sm:px-4">
                <Slider
                  value={[targetAngle]}
                  onValueChange={(values) => handleSliderChange(joint.id, values[0])}
                  onValueCommit={handleSliderCommit}
                  min={joint.min}
                  max={joint.max}
                  step={0.1}
                  className="w-full"
                  disabled={isMoving || isProgramRunning}
                />
              </div>

              {/* Desktop-only status cluster */}
              <div className="hidden sm:flex w-20 shrink-0 flex-col gap-0 justify-center text-right overflow-hidden pr-1">
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
          );
        })}
      </div>
    </div>
  );
};

export default JointControlTable;