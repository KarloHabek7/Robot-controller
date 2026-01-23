import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  MoveUp, MoveDown, RotateCw, RotateCcw,
  Check, RotateCcw as ResetIcon, Settings2
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { toast } from 'sonner';
import { useRobotStore } from '@/stores/robotStore';
import { cn } from '@/lib/utils';

// Props made optional since the component uses the store internally
interface ControlPanelProps {
  onMove?: (direction: string, value?: number) => void;
  onGoToPosition?: (x: number, y: number, z: number) => void;
}

// Helper to format numbers for display
const fmt = (num: number) => num.toFixed(2);

const ControlPanel = ({ onMove: _onMove, onGoToPosition: _onGoToPosition }: ControlPanelProps = {}) => {
  const { t } = useTranslation();

  // Store state
  const {
    actualTcpPose,
    targetTcpPose,
    isTargetDirty,
    isMoving,
    updateTargetTcp,
    commitTargetTcp,
    resetTargetToActual
  } = useRobotStore();

  // Local state for step sizes
  const [positionStep, setPositionStep] = useState(10); // mm
  const [rotationStep, setRotationStep] = useState(5);  // degrees

  // --- Handlers ---

  // Update a specific index of the target pose directly (Input fields)
  const handleInputChange = (index: number, value: string) => {
    const numVal = parseFloat(value);
    if (isNaN(numVal)) return;

    const newPose = [...targetTcpPose];
    newPose[index] = numVal;
    updateTargetTcp(newPose);
  };

  // Jog handler (Buttons)
  // Axis mapping: 0:X, 1:Y, 2:Z, 3:RX, 4:RY, 5:RZ
  const handleJog = (axisIndex: number, direction: 1 | -1) => {
    if (isMoving) return;

    const isRotation = axisIndex >= 3;
    const step = isRotation ? rotationStep : positionStep;
    const newPose = [...targetTcpPose];

    newPose[axisIndex] = newPose[axisIndex] + (step * direction);
    updateTargetTcp(newPose);
  };

  // Apply Changes
  const handleApply = async () => {
    if (!isTargetDirty || isMoving) return;
    try {
      await commitTargetTcp();
      toast.success(t('robot.movingToTarget') || 'Moving to target TCP position...');
    } catch (error) {
      toast.error(t('errors.commandFailed') || 'Failed to send TCP movement command');
    }
  };

  // Reset Changes
  const handleReset = () => {
    resetTargetToActual();
    toast.info(t('robot.targetReset') || 'Target reset to actual position');
  };

  // --- Render Helpers ---

  const renderInputRow = (
    label: string,
    index: number,
    unit: string
  ) => {
    const target = targetTcpPose[index];
    const actual = actualTcpPose[index];
    // Calculate diff
    const diff = target - actual;
    // Determine if this specific field is dirty (tolerance 0.001)
    const isDirty = Math.abs(diff) > 0.001;

    return (
      <div className="flex items-center gap-3 mb-2 text-sm">
        <span className="w-8 font-bold text-muted-foreground">{label}:</span>

        <div className="relative flex-1">
          <Input
            type="number"
            value={target} // Controlled by target state
            onChange={(e) => handleInputChange(index, e.target.value)}
            disabled={isMoving}
            className={cn(
              "h-8 font-mono text-right pr-8 transition-colors",
              isDirty ? "border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400" : "text-foreground"
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">
            {unit}
          </span>
        </div>

        <div className="w-36 flex flex-col items-end text-xs">
          <span className="text-muted-foreground whitespace-nowrap">
            Actual: {fmt(actual)} {unit}
          </span>
          {isDirty && (
            <span className="text-amber-500 font-mono font-bold">
              Δ {diff > 0 ? '+' : ''}{fmt(diff)} {unit}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">

      {/* Header / Global Actions */}
      <div className="flex items-center justify-between bg-card border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          <h2 className="font-black text-sm uppercase tracking-widest text-foreground">
            TCP Control
          </h2>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isMoving}
            className="text-muted-foreground hover:text-foreground"
          >
            <ResetIcon className="w-4 h-4 mr-2" />
            {t('common.reset') || 'Reset'}
          </Button>

          {isTargetDirty && (
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isMoving}
              className="bg-amber-500 hover:bg-amber-600 text-white animate-in fade-in zoom-in duration-200"
            >
              <Check className="w-4 h-4 mr-2" />
              {t('common.apply') || 'Apply'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* --- POSITION CARD --- */}
        <div className="relative group bg-card border rounded-3xl p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent opacity-50" />

          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
            Position
          </h3>

          {/* Numeric Inputs */}
          <div className="mb-6 space-y-1 bg-secondary/20 p-4 rounded-xl border border-border/50">
            {renderInputRow("X", 0, "mm")}
            {renderInputRow("Y", 1, "mm")}
            {renderInputRow("Z", 2, "mm")}
          </div>

          {/* Jog Controls */}
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-3 gap-3 mb-6 relative">
              {/* Visual Guide Lines */}
              <div className="absolute inset-0 border border-dashed border-primary/10 rounded-full scale-150 pointer-events-none" />

              {/* D-Pad Mapping: Up/Down = X, Left/Right = Y (Standard Cartesian Top-Down) */}
              <div />
              <Button
                onClick={() => handleJog(0, 1)} // X+ (Up arrow usually maps to forward/X+ in robot frames depending on view)
                disabled={isMoving}
                className="h-14 w-14 rounded-2xl shadow-lg border-2 border-primary/5 hover:border-primary/20 bg-background hover:bg-primary/5 text-primary"
                variant="outline"
              >
                <ArrowUp className="h-6 w-6" />
              </Button>
              <div />

              <Button
                onClick={() => handleJog(1, 1)} // Y+ (Left arrow usually maps to Left/Y+ in standard ISO)
                disabled={isMoving}
                className="h-14 w-14 rounded-2xl shadow-lg border-2 border-primary/5 hover:border-primary/20 bg-background hover:bg-primary/5 text-primary"
                variant="outline"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>

              {/* Center spacer (Stop button removed per layout requirements) */}
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-primary/20 rounded-full" />
              </div>

              <Button
                onClick={() => handleJog(1, -1)} // Y-
                disabled={isMoving}
                className="h-14 w-14 rounded-2xl shadow-lg border-2 border-primary/5 hover:border-primary/20 bg-background hover:bg-primary/5 text-primary"
                variant="outline"
              >
                <ArrowRight className="h-6 w-6" />
              </Button>

              <div />
              <Button
                onClick={() => handleJog(0, -1)} // X-
                disabled={isMoving}
                className="h-14 w-14 rounded-2xl shadow-lg border-2 border-primary/5 hover:border-primary/20 bg-background hover:bg-primary/5 text-primary"
                variant="outline"
              >
                <ArrowDown className="h-6 w-6" />
              </Button>
              <div />
            </div>

            {/* Z Axis */}
            <div className="flex gap-4 w-full mb-6">
              <Button
                onClick={() => handleJog(2, 1)} // Z+
                disabled={isMoving}
                variant="secondary"
                className="flex-1 h-12 rounded-xl gap-2 font-bold border border-border/50"
              >
                <MoveUp className="h-4 w-4" /> Z+
              </Button>
              <Button
                onClick={() => handleJog(2, -1)} // Z-
                disabled={isMoving}
                variant="secondary"
                className="flex-1 h-12 rounded-xl gap-2 font-bold border border-border/50"
              >
                <MoveDown className="h-4 w-4" /> Z-
              </Button>
            </div>

            {/* Step Size */}
            <div className="flex items-center justify-center gap-3 w-full bg-secondary/30 p-3 rounded-2xl border border-border/50">
              <span className="text-[10px] font-black text-muted-foreground uppercase opacity-50 tracking-tighter">Step Size</span>
              <div className="flex items-center gap-1 bg-background border rounded-lg px-2 py-1">
                <Input
                  type="number"
                  value={positionStep}
                  onChange={(e) => setPositionStep(parseFloat(e.target.value) || 0)}
                  className="w-12 border-0 p-0 h-6 text-xs text-center focus-visible:ring-0 font-mono"
                />
                <span className="text-[10px] text-muted-foreground mr-1 italic">mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- ROTATION CARD --- */}
        <div className="bg-card border rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:shadow-2xl flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-50" />

          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
            Rotation
          </h3>

          {/* Numeric Inputs */}
          <div className="mb-6 space-y-1 bg-secondary/20 p-4 rounded-xl border border-border/50">
            {renderInputRow("RX", 3, "°")}
            {renderInputRow("RY", 4, "°")}
            {renderInputRow("RZ", 5, "°")}
          </div>

          {/* Rotation Buttons Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* RX */}
            <Button
              onClick={() => handleJog(3, 1)}
              disabled={isMoving}
              variant="outline"
              className="h-12 rounded-xl hover:bg-emerald-500/5 hover:border-emerald-500/20"
            >
              <RotateCw className="h-4 w-4 mr-2 text-emerald-600" /> +RX
            </Button>
            <Button
              onClick={() => handleJog(3, -1)}
              disabled={isMoving}
              variant="outline"
              className="h-12 rounded-xl hover:bg-emerald-500/5 hover:border-emerald-500/20"
            >
              <RotateCcw className="h-4 w-4 mr-2 text-emerald-600" /> -RX
            </Button>

            {/* RY */}
            <Button
              onClick={() => handleJog(4, 1)}
              disabled={isMoving}
              variant="outline"
              className="h-12 rounded-xl hover:bg-emerald-500/5 hover:border-emerald-500/20"
            >
              <RotateCw className="h-4 w-4 mr-2 text-emerald-600" /> +RY
            </Button>
            <Button
              onClick={() => handleJog(4, -1)}
              disabled={isMoving}
              variant="outline"
              className="h-12 rounded-xl hover:bg-emerald-500/5 hover:border-emerald-500/20"
            >
              <RotateCcw className="h-4 w-4 mr-2 text-emerald-600" /> -RY
            </Button>

            {/* RZ */}
            <Button
              onClick={() => handleJog(5, 1)}
              disabled={isMoving}
              variant="outline"
              className="h-12 rounded-xl hover:bg-emerald-500/5 hover:border-emerald-500/20"
            >
              <RotateCw className="h-4 w-4 mr-2 text-emerald-600" /> +RZ
            </Button>
            <Button
              onClick={() => handleJog(5, -1)}
              disabled={isMoving}
              variant="outline"
              className="h-12 rounded-xl hover:bg-emerald-500/5 hover:border-emerald-500/20"
            >
              <RotateCcw className="h-4 w-4 mr-2 text-emerald-600" /> -RZ
            </Button>
          </div>

          {/* Step Size (Aligned to bottom) */}
          <div className="mt-auto flex items-center justify-center gap-3 w-full bg-secondary/30 p-3 rounded-2xl border border-border/50">
            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-50 tracking-tighter">Rotation Step</span>
            <div className="flex items-center gap-1 bg-background border rounded-lg px-2 py-1">
              <Input
                type="number"
                value={rotationStep}
                onChange={(e) => setRotationStep(parseFloat(e.target.value) || 0)}
                className="w-12 border-0 p-0 h-6 text-xs text-center focus-visible:ring-0 font-mono"
              />
              <span className="text-[10px] text-muted-foreground mr-1 italic">°</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ControlPanel;