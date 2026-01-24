import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  MoveUp, MoveDown, RotateCw, RotateCcw,
  Check, RotateCcw as ResetIcon, Settings2,
  Plus, Minus, Globe, Anchor
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { toast } from 'sonner';
import { useRobotStore } from '@/stores/robotStore';
import { cn } from '@/lib/utils';
import * as THREE from 'three';

// --- Math Helpers ---

/**
 * Perform pose transformation (p1 transformed by p2)
 * Units: mm and degrees
 */
function poseTrans(p1: number[], p2: number[]): number[] {
  // Poses are [x, y, z, rx, ry, rz]
  const pos1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
  const rot1 = new THREE.Vector3(p1[3] * Math.PI / 180, p1[4] * Math.PI / 180, p1[5] * Math.PI / 180);
  const quat1 = new THREE.Quaternion();
  const angle1 = rot1.length();
  if (angle1 > 1e-6) quat1.setFromAxisAngle(rot1.clone().normalize(), angle1);

  const pos2 = new THREE.Vector3(p2[0], p2[1], p2[2]);
  const rot2 = new THREE.Vector3(p2[3] * Math.PI / 180, p2[4] * Math.PI / 180, p2[5] * Math.PI / 180);
  const quat2 = new THREE.Quaternion();
  const angle2 = rot2.length();
  if (angle2 > 1e-6) quat2.setFromAxisAngle(rot2.clone().normalize(), angle2);

  // Result: outPos = pos1 + rot1 * pos2, outQuat = quat1 * quat2
  const outPos = pos2.clone().applyQuaternion(quat1).add(pos1);
  const outQuat = quat1.clone().multiply(quat2);

  // Convert back to Axis-Angle rotation vector
  const outAngle = 2 * Math.acos(Math.min(1, Math.max(-1, outQuat.w)));
  const outAxis = new THREE.Vector3(0, 0, 0);
  const s = Math.sqrt(1 - outQuat.w * outQuat.w);
  if (s > 0.001) {
    outAxis.set(outQuat.x / s, outQuat.y / s, outQuat.z / s);
  } else if (outAngle > 0.001) {
    outAxis.set(outQuat.x, outQuat.y, outQuat.z).normalize();
  }

  const outRotVec = outAxis.multiplyScalar(outAngle * 180 / Math.PI);

  return [
    Number(outPos.x.toFixed(4)),
    Number(outPos.y.toFixed(4)),
    Number(outPos.z.toFixed(4)),
    Number(outRotVec.x.toFixed(4)),
    Number(outRotVec.y.toFixed(4)),
    Number(outRotVec.z.toFixed(4))
  ];
}

/**
 * Inverse of a pose [x, y, z, rx, ry, rz]
 * Units: mm and degrees
 */
function poseInv(p: number[]): number[] {
  const pos = new THREE.Vector3(p[0], p[1], p[2]);
  const rot = new THREE.Vector3(p[3] * Math.PI / 180, p[4] * Math.PI / 180, p[5] * Math.PI / 180);
  const quat = new THREE.Quaternion();
  const angle = rot.length();
  if (angle > 1e-6) quat.setFromAxisAngle(rot.clone().normalize(), angle);

  const invQuat = quat.clone().invert();
  const invPos = pos.clone().negate().applyQuaternion(invQuat);

  const invAngle = 2 * Math.acos(Math.min(1, Math.max(-1, invQuat.w)));
  const invAxis = new THREE.Vector3(0, 0, 0);
  const s = Math.sqrt(1 - invQuat.w * invQuat.w);
  if (s > 0.001) {
    invAxis.set(invQuat.x / s, invQuat.y / s, invQuat.z / s);
  } else if (invAngle > 0.001) {
    invAxis.set(invQuat.x, invQuat.y, invQuat.z).normalize();
  }

  const invRotVec = invAxis.multiplyScalar(invAngle * 180 / Math.PI);

  return [
    Number(invPos.x.toFixed(4)),
    Number(invPos.y.toFixed(4)),
    Number(invPos.z.toFixed(4)),
    Number(invRotVec.x.toFixed(4)),
    Number(invRotVec.y.toFixed(4)),
    Number(invRotVec.z.toFixed(4))
  ];
}

// Props made optional since the component uses the store internally
interface ControlPanelProps {
  onMove?: (direction: string, value?: number) => void;
  onGoToPosition?: (x: number, y: number, z: number) => void;
}

const ControlPanel = ({ onMove: _onMove, onGoToPosition: _onGoToPosition }: ControlPanelProps = {}) => {
  const { t } = useTranslation();

  // Store state
  const {
    actualTcpPose: actualRobotPose,
    targetTcpPose: targetRobotPose,
    isTargetDirty,
    isMoving,
    isEStopActive,
    coordinateMode,
    updateTargetTcp,
    commitTargetTcp,
    resetTargetToActual,
    setCoordinateMode
  } = useRobotStore();

  // --- UI Converters ---
  const toUI = (pose: number[]) => [
    pose[0] * 1000,
    pose[1] * 1000,
    pose[2] * 1000,
    pose[3] * (180 / Math.PI),
    pose[4] * (180 / Math.PI),
    pose[5] * (180 / Math.PI),
  ];

  const toRobot = (pose: number[]) => [
    pose[0] / 1000,
    pose[1] / 1000,
    pose[2] / 1000,
    pose[3] * (Math.PI / 180),
    pose[4] * (Math.PI / 180),
    pose[5] * (Math.PI / 180),
  ];

  const actualTcpPose = toUI(actualRobotPose);
  const targetTcpPose = toUI(targetRobotPose);

  // Derived display poses based on coordinate mode
  const displayTargetPose = coordinateMode === 'base'
    ? targetTcpPose
    : poseTrans(poseInv(actualTcpPose), targetTcpPose);

  const displayActualPose = coordinateMode === 'base'
    ? actualTcpPose
    : [0, 0, 0, 0, 0, 0];

  // Helper to format numbers for display
  const fmt = (num: number) => num.toFixed(2);

  // Local state for step sizes
  const [positionStep, setPositionStep] = useState(10); // mm
  const [rotationStep, setRotationStep] = useState(5);  // degrees

  // --- Handlers ---

  // Update a specific index of the target pose directly (Input fields)
  const handleInputChange = (index: number, value: string) => {
    let numVal = parseFloat(value);
    if (isNaN(numVal)) return;

    if (coordinateMode === 'base') {
      const newUiPose = [...targetTcpPose];
      newUiPose[index] = numVal;
      updateTargetTcp(toRobot(newUiPose));
    } else {
      // Relative edit in tool frame
      const currentRelative = poseTrans(poseInv(actualTcpPose), targetTcpPose);
      currentRelative[index] = numVal;
      // Convert back to base frame: Target = Actual * Relative
      const newBasePose = poseTrans(actualTcpPose, currentRelative);
      updateTargetTcp(toRobot(newBasePose));
    }
  };

  // Jog handler (Buttons)
  // Axis mapping: 0:X, 1:Y, 2:Z, 3:RX, 4:RY, 5:RZ
  const handleJog = (axisIndex: number, direction: 1 | -1) => {
    if (isMoving) return;

    const isRotation = axisIndex >= 3;
    const step = isRotation ? rotationStep : positionStep;

    if (coordinateMode === 'base') {
      // Base frame: simple addition in UI units
      const newUiPose = [...targetTcpPose];
      newUiPose[axisIndex] = Number((newUiPose[axisIndex] + step * direction).toFixed(2));
      updateTargetTcp(toRobot(newUiPose));
    } else {
      // Tool frame: Jogging is ALWAYS relative to the CURRENT TARGET in its own frame
      const relativeMove = [0, 0, 0, 0, 0, 0];
      relativeMove[axisIndex] = step * direction;
      const newUiPose = poseTrans(targetTcpPose, relativeMove);
      updateTargetTcp(toRobot(newUiPose));
    }
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

  const renderInputRow = (label: string, index: number, unit: string) => {
    const target = displayTargetPose[index];
    const actual = displayActualPose[index];
    const diff = target - actual;
    const isDirty = Math.abs(diff) > 0.005;

    return (
      <div className="flex items-center gap-1.5 mb-1 last:mb-0">
        <span className="w-4 text-[9px] font-black text-muted-foreground/50 uppercase">{label}</span>

        <div className="relative flex-1">
          <Input
            type="number"
            value={Number(target.toFixed(2))}
            onChange={(e) => handleInputChange(index, e.target.value)}
            disabled={isMoving || isEStopActive}
            className={cn(
              "h-7 text-[10px] font-mono text-right pr-6 transition-all bg-background/30 border-border/20",
              isDirty ? "border-amber-500/40 bg-amber-500/10 text-amber-500 font-bold" : "text-foreground"
            )}
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground/30 pointer-events-none">
            {unit}
          </span>
        </div>

        <div className="w-16 flex flex-col items-end leading-[1.1]">
          <div className="flex items-center gap-1 text-[8px]">
            <span className="text-muted-foreground/30 font-medium whitespace-nowrap">Act:</span>
            <span className="font-mono font-bold text-muted-foreground/60">{fmt(actual)}</span>
          </div>
          {isDirty && (
            <div className="flex items-center gap-0.5 text-[8px]">
              <span className="text-amber-500/40 font-medium">Δ:</span>
              <span className="text-amber-500 font-mono font-bold">
                {diff > 0 ? '+' : ''}{fmt(diff)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const StepPicker = ({ value, onChange, unit }: { value: number, onChange: (v: number) => void, unit: string }) => (
    <div className="flex items-center bg-secondary/10 p-0.5 rounded-lg border border-border/10">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-background/80"
        onClick={() => onChange(Math.max(0.1, value - 1))}
      >
        <Minus className="h-2.5 w-2.5" />
      </Button>
      <div className="flex-1 flex items-center justify-center gap-0.5 px-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-8 bg-transparent border-0 p-0 text-[10px] text-center focus:outline-none font-mono font-bold text-foreground"
        />
        <span className="text-[8px] text-muted-foreground opacity-30 font-bold uppercase">{unit}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-background/80"
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-2.5 w-2.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-3 max-w-6xl mx-auto flex flex-col h-full overflow-hidden">

      {/* Header / Global Actions - Ultra Compact */}
      <div className="flex items-center justify-between bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl px-4 py-2 shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-primary" />
            <h2 className="font-black text-[10px] uppercase tracking-wider text-foreground">
              {t('robot.tcpControl') || 'TCP Control'}
            </h2>
          </div>

          <div className="h-4 w-px bg-border/40" />

          {/* Coordinate System Selector */}
          <div className="flex items-center bg-secondary/50 p-0.5 rounded-lg border border-border/20">
            <button
              onClick={() => setCoordinateMode('base')}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold transition-all",
                coordinateMode === 'base'
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Globe className="w-3 h-3" />
              {t('robot.base').toUpperCase()}
            </button>
            <button
              onClick={() => setCoordinateMode('tool')}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold transition-all",
                coordinateMode === 'tool'
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Anchor className="w-3 h-3" />
              {t('robot.tool').toUpperCase()}
            </button>
          </div>
        </div>

        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isMoving || isEStopActive}
            className="h-8 px-3 rounded-lg text-[10px] text-muted-foreground hover:text-foreground font-bold"
          >
            <ResetIcon className="w-3 h-3 mr-1.5" />
            {t('common.reset') || 'Reset'}
          </Button>

          <Button
            size="sm"
            onClick={handleApply}
            disabled={!isTargetDirty || isMoving || isEStopActive}
            className={cn(
              "h-8 px-5 rounded-lg text-[10px] font-black tracking-widest transition-all shadow-md",
              isTargetDirty
                ? "bg-primary hover:bg-primary/80 text-primary-foreground shadow-primary/20"
                : "bg-muted text-muted-foreground opacity-50"
            )}
          >
            <Check className="w-3 h-3 mr-1.5" />
            {t('common.apply') || 'Apply'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* --- POSITION CARD --- */}
        <div className={cn(
          "relative group bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl",
          isEStopActive && "opacity-60 grayscale-[0.5] pointer-events-none"
        )}>
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500/40 via-blue-500 to-transparent" />

          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
              {t('robot.position') || 'Position'}
            </h3>
            {coordinateMode === 'tool' && (
              <span className="text-[8px] font-bold text-primary border border-primary/30 px-1.5 py-0.5 rounded uppercase">Tool Frame</span>
            )}
          </div>

          <div className="mb-4 space-y-1 bg-secondary/15 p-3 rounded-xl border border-border/10 backdrop-blur-md">
            {renderInputRow("X", 0, "mm")}
            {renderInputRow("Y", 1, "mm")}
            {renderInputRow("Z", 2, "mm")}
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* D-Pad - Scaled Down */}
            <div className="grid grid-cols-3 gap-1.5">
              <div />
              <Button
                onClick={() => handleJog(0, 1)}
                disabled={isMoving}
                size="icon"
                className="h-10 w-10 lg:h-11 lg:w-11 rounded-xl shadow-md border-primary/10 bg-background hover:bg-primary/5 text-primary active:scale-95"
                variant="outline"
              >
                <ArrowUp className="h-4.5 w-4.5" />
              </Button>
              <div />

              <Button
                onClick={() => handleJog(1, 1)}
                disabled={isMoving}
                size="icon"
                className="h-10 w-10 lg:h-11 lg:w-11 rounded-xl shadow-md border-primary/10 bg-background hover:bg-primary/5 text-primary active:scale-95"
                variant="outline"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </Button>

              <div className="flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" />
              </div>

              <Button
                onClick={() => handleJog(1, -1)}
                disabled={isMoving}
                size="icon"
                className="h-10 w-10 lg:h-11 lg:w-11 rounded-xl shadow-md border-primary/10 bg-background hover:bg-primary/5 text-primary active:scale-95"
                variant="outline"
              >
                <ArrowRight className="h-4.5 w-4.5" />
              </Button>

              <div />
              <Button
                onClick={() => handleJog(0, -1)}
                disabled={isMoving}
                size="icon"
                className="h-10 w-10 lg:h-11 lg:w-11 rounded-xl shadow-md border-primary/10 bg-background hover:bg-primary/5 text-primary active:scale-95"
                variant="outline"
              >
                <ArrowDown className="h-4.5 w-4.5" />
              </Button>
              <div />
            </div>

            {/* Z Controls Row */}
            <div className="grid grid-cols-2 gap-2 w-full px-2">
              <Button
                onClick={() => handleJog(2, 1)}
                disabled={isMoving}
                variant="secondary"
                className="h-10 rounded-xl gap-2 text-[9px] font-black tracking-widest border border-border/40 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
              >
                <MoveUp className="h-3.5 w-3.5" /> Z+
              </Button>
              <Button
                onClick={() => handleJog(2, -1)}
                disabled={isMoving}
                variant="secondary"
                className="h-10 rounded-xl gap-2 text-[9px] font-black tracking-widest border border-border/40 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
              >
                <MoveDown className="h-3.5 w-3.5" /> Z-
              </Button>
            </div>

            {/* Step Selection */}
            <div className="w-full space-y-1 pt-2 border-t border-border/15">
              <div className="flex justify-between items-center px-1">
                <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">Pos Step</span>
                <span className="text-[8px] font-mono text-primary font-bold opacity-70">MM</span>
              </div>
              <StepPicker value={positionStep} onChange={setPositionStep} unit="" />
            </div>
          </div>
        </div>

        {/* --- ROTATION CARD --- */}
        <div className={cn(
          "bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-4 relative overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col",
          isEStopActive && "opacity-60 grayscale-[0.5] pointer-events-none"
        )}>
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/40 via-emerald-500 to-transparent" />

          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
              {t('robot.orientation') || 'Rotation'}
            </h3>
            {coordinateMode === 'tool' && (
              <span className="text-[8px] font-bold text-emerald-500 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase">Tool Frame</span>
            )}
          </div>

          <div className="mb-4 space-y-1 bg-secondary/15 p-3 rounded-xl border border-border/10 backdrop-blur-md">
            {renderInputRow("RX", 3, "°")}
            {renderInputRow("RY", 4, "°")}
            {renderInputRow("RZ", 5, "°")}
          </div>

          {/* Rotation Buttons - Balanced Height */}
          <div className="grid grid-cols-2 gap-1.5 mb-2 flex-1">
            {[3, 4, 5].map((axis) => (
              <div key={axis} className="contents">
                <Button
                  onClick={() => handleJog(axis, 1)}
                  disabled={isMoving}
                  variant="outline"
                  className="h-9 rounded-xl text-[9px] font-black tracking-widest bg-background/50 border-border/10 text-muted-foreground hover:bg-emerald-500/5 hover:border-emerald-500/30 hover:text-emerald-500 shadow-sm transition-all"
                >
                  <RotateCw className="h-3 w-3 mr-1.5 text-emerald-500/60" />
                  +R{["X", "Y", "Z"][axis - 3]}
                </Button>
                <Button
                  onClick={() => handleJog(axis, -1)}
                  disabled={isMoving}
                  variant="outline"
                  className="h-9 rounded-xl text-[9px] font-black tracking-widest bg-background/50 border-border/10 text-muted-foreground hover:bg-emerald-500/5 hover:border-emerald-500/30 hover:text-emerald-500 shadow-sm transition-all"
                >
                  <RotateCcw className="h-3 w-3 mr-1.5 text-emerald-500/60" />
                  -R{["X", "Y", "Z"][axis - 3]}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-1 pt-2 border-t border-border/15">
            <div className="flex justify-between items-center px-1">
              <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">Rot Step</span>
              <span className="text-[8px] font-mono text-emerald-500 font-bold opacity-70">DEG</span>
            </div>
            <StepPicker value={rotationStep} onChange={setRotationStep} unit="" />
          </div>

        </div>
      </div>
    </div>
  );
};

export default ControlPanel;