import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  MoveUp, MoveDown, RotateCw, RotateCcw,
  Check, RotateCcw as ResetIcon, Settings2,
  Plus, Minus, Globe, Anchor, Zap, Loader2
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { toast } from 'sonner';
import { useRobotStore } from '@/stores/robotStore';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import * as THREE from 'three';
import ThreeIsometricAxes from './ThreeIsometricAxes';

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
    setCoordinateMode,
    directControlEnabled,
    setDirectControlEnabled,
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

  const displayActualPose = (coordinateMode === 'tool' || coordinateMode === 'relative')
    ? [0, 0, 0, 0, 0, 0]
    : actualTcpPose;

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

    if (directControlEnabled) {
      setTimeout(() => commitTargetTcp(), 0);
    }
  };

  // Jog handler (Buttons)
  // Axis mapping: 0:X, 1:Y, 2:Z, 3:RX, 4:RY, 5:RZ
  const handleJog = (axisIndex: number, direction: 1 | -1) => {
    if (isMoving) return;

    const isRotation = axisIndex >= 3;
    const step = isRotation ? rotationStep : positionStep;

    if (coordinateMode === 'base') {
      // Base frame: simple addition in UI units (cumulative on target)
      const newUiPose = [...targetTcpPose];
      newUiPose[axisIndex] = Number((newUiPose[axisIndex] + step * direction).toFixed(2));
      updateTargetTcp(toRobot(newUiPose));
    } else if (coordinateMode === 'tool') {
      // Tool frame: Jogging is relative to the ACTUAL position, but preserves other adjustments
      const currentRelative = poseTrans(poseInv(actualTcpPose), targetTcpPose);
      currentRelative[axisIndex] = Number((currentRelative[axisIndex] + step * direction).toFixed(2));
      const newUiPose = poseTrans(actualTcpPose, currentRelative);
      updateTargetTcp(toRobot(newUiPose));
    } else {
      // Relative frame: Jogging is ALWAYS relative to the CURRENT TARGET in its own frame (cumulative)
      const relativeMove = [0, 0, 0, 0, 0, 0];
      relativeMove[axisIndex] = step * direction;
      const newUiPose = poseTrans(targetTcpPose, relativeMove);
      updateTargetTcp(toRobot(newUiPose));
    }

    if (directControlEnabled) {
      setTimeout(() => commitTargetTcp(), 0);
    }
  };

  // Apply Changes
  const handleApply = async () => {
    if (!isTargetDirty || isMoving) return;
    try {
      await commitTargetTcp();
      toast.success(t('robot.movingToTargetTcp'));
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    }
  };

  // Reset Changes
  const handleReset = () => {
    resetTargetToActual();
    toast.info(t('robot.targetReset'));
  };

  // --- Render Helpers ---

  // Row for a single coordinate matching JointControlTable style
  const renderCoordinateRow = (label: string, index: number, unit: string) => {
    const target = displayTargetPose[index];
    const actual = displayActualPose[index];
    const diff = target - actual;
    const isDirty = Math.abs(diff) > 0.005;

    return (
      <div
        key={index}
        className={cn(
          "flex items-center justify-between p-1.5 sm:p-2 rounded-lg border transition-all",
          isDirty
            ? "bg-primary/5 border-primary/50 shadow-sm"
            : "bg-secondary/10 border-border/50",
          (isMoving || isEStopActive) && "opacity-50 pointer-events-none"
        )}
      >
        {/* Left: Label and Buttons Group */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-5 sm:w-6 flex items-center justify-center">
            <span className="font-black text-[10px] sm:text-xs text-muted-foreground uppercase">{label}</span>
          </div>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
              onClick={() => handleJog(index, -1)}
              disabled={isMoving}
            >
              <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
              onClick={() => handleJog(index, 1)}
              disabled={isMoving}
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
          </div>
        </div>

        {/* Right: Input and Actuals Group */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="relative w-[70px] sm:w-[85px]">
            <div className="flex items-center bg-background border rounded h-7 sm:h-8 px-1 focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
              <Input
                type="number"
                value={Number(target.toFixed(2))}
                onChange={(e) => handleInputChange(index, e.target.value)}
                className="border-0 p-0 h-5 sm:h-6 text-xs sm:text-sm text-center focus-visible:ring-0 font-mono w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[8px] sm:text-[10px] text-muted-foreground ml-0.5">{unit}</span>
            </div>
          </div>

          {/* Status Display - Adjusted width for longer values */}
          <div className="w-[55px] sm:w-[66px] flex flex-col gap-0 justify-center text-right overflow-hidden shrink-0 pr-1">
            <div className="text-[8px] sm:text-[9px] text-muted-foreground/60 font-mono leading-tight truncate">
              {t('robot.act')} <span className="text-foreground/80">{fmt(actual)}</span>
            </div>
            {isDirty && (
              <div className="text-[8px] sm:text-[9px] font-bold font-mono text-primary leading-tight truncate">
                {t('robot.delta')} {diff > 0 ? '+' : ''}{fmt(diff)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="h-full flex flex-col space-y-2 sm:space-y-3 max-w-7xl mx-auto p-0 sm:p-1 no-scrollbar">

      {/* Header / Global Actions */}
      <div className="flex items-center justify-between bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl px-2 sm:px-4 py-2 sm:py-3 shadow-lg shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">

          {/* Coordinate System Selector */}
          <div className="flex items-center bg-secondary/50 p-0.5 sm:p-1 rounded-lg border border-border/20">
            <button
              onClick={() => setCoordinateMode('base')}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide transition-all",
                coordinateMode === 'base'
                  ? "bg-background shadow-sm text-primary border border-border/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xl:inline">{t('robot.base')}</span>
              <span className="xl:hidden">BASE</span>
            </button>
            <button
              onClick={() => setCoordinateMode('tool')}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide transition-all",
                coordinateMode === 'tool'
                  ? "bg-background shadow-sm text-primary border border-border/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Anchor className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xl:inline">{t('robot.tool')}</span>
              <span className="xl:hidden">TOOL</span>
            </button>
            <button
              onClick={() => setCoordinateMode('relative')}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide transition-all",
                coordinateMode === 'relative'
                  ? "bg-background shadow-sm text-primary border border-border/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xl:inline">{t('robot.relative')}</span>
              <span className="xl:hidden">REL</span>
            </button>
          </div>

          <div className="hidden sm:block h-5 w-px bg-border/40" />

          <div className="flex items-center gap-1.5 sm:gap-2 max-w-none">
            <Zap className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${directControlEnabled ? 'text-amber-500 fill-amber-500/20' : 'text-muted-foreground'}`} />
            <Label htmlFor="direct-control-tcp" className="text-[9px] sm:text-[10px] uppercase font-bold tracking-tight text-muted-foreground cursor-pointer leading-[1.1] whitespace-nowrap">
              <span className="hidden sm:inline">{t('robot.directControl')}</span>
              <span className="sm:hidden">{t('robot.direct')}</span>
            </Label>
            <Switch
              id="direct-control-tcp"
              checked={directControlEnabled}
              onCheckedChange={setDirectControlEnabled}
              className="scale-[0.6] sm:scale-75 shrink-0"
            />
          </div>
        </div>

        <div className="flex gap-1.5 sm:gap-2 ml-auto sm:ml-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isMoving || isEStopActive}
            className="h-7 px-1.5 sm:px-2 rounded-lg text-[10px] sm:text-xs text-muted-foreground hover:text-foreground font-bold shrink-0"
          >
            <ResetIcon className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", "sm:mr-1")} />
            <span className="hidden sm:inline">{t('common.reset')}</span>
          </Button>

          {!directControlEnabled && isTargetDirty && (
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={isMoving || isEStopActive}
              className="gap-1.5 sm:gap-2 h-7 px-2 sm:px-3 text-[10px] sm:text-xs bg-primary hover:bg-primary/90"
            >
              {isMoving ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                  {t('robot.moving')}
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {t('robot.apply')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 flex-1 min-h-0 overflow-y-auto sm:overflow-visible no-scrollbar">

        {/* --- POSITION CARD --- */}
        <div className={cn(
          "relative flex flex-col bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:shadow-xl hover:bg-card/50",
          isEStopActive && "opacity-60 grayscale-[0.5] pointer-events-none"
        )}>
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500/40 via-blue-500 to-transparent rounded-t-2xl opacity-50" />

          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <MoveUp className="w-3 h-3" /> {t('robot.position')}
            </h3>
            {/* Step Control */}
            <div className="flex items-center bg-secondary/20 rounded-full border border-border/40 pl-3 pr-1 py-0.5 gap-2 scale-90 sm:scale-100 origin-right">
              <span className="text-[9px] text-muted-foreground font-black tracking-tighter uppercase whitespace-nowrap">
                {t('robot.step', { unit: 'mm' })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full hover:bg-white/10"
                  onClick={() => setPositionStep(Math.max(0.1, positionStep - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-8">
                  <Input
                    type="number"
                    value={positionStep}
                    onChange={(e) => setPositionStep(parseFloat(e.target.value) || 0)}
                    className="h-5 border-0 bg-transparent p-0 text-[11px] font-black text-center focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full hover:bg-white/10"
                  onClick={() => setPositionStep(positionStep + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:gap-6 h-full">
            {/* Top Row: Inputs */}
            <div className="space-y-1.5 sm:space-y-2">
              {renderCoordinateRow("X", 0, "mm")}
              {renderCoordinateRow("Y", 1, "mm")}
              {renderCoordinateRow("Z", 2, "mm")}
            </div>

            {/* Bottom Row: Controls (Refined Isometric Layout) */}
            <div className="flex-1 min-h-[220px] sm:min-h-[260px] relative bg-secondary/5 rounded-2xl border border-white/5 overflow-hidden flex flex-col items-center justify-center">

              {/* Central Visualization */}
              <ThreeIsometricAxes mode="translation" />

              {/* Hexagonal Button Layout */}
              <div className="relative w-full h-full pointer-events-none">
                {(() => {
                  // Adjust radius for mobile
                  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                  const radius = isMobile ? 65 : 85;
                  const centerX = '50%';
                  const centerY = '50%';

                  const controls: { label: string; axis: number; dir: 1 | -1; angle: number; colorClass: string }[] = [
                    {
                      label: '+Z', axis: 2, dir: 1, angle: 60,
                      colorClass: 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-blue-500/10 hover:bg-blue-500/20'
                    },
                    {
                      label: '-Z', axis: 2, dir: -1, angle: 120,
                      colorClass: 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-blue-500/10 hover:bg-blue-500/20'
                    },
                    {
                      label: '-X', axis: 0, dir: -1, angle: 180,
                      colorClass: 'bg-red-500/10 border-red-500/40 text-red-400 shadow-red-500/10 hover:bg-red-500/20'
                    },
                    {
                      label: '+X', axis: 0, dir: 1, angle: 240,
                      colorClass: 'bg-red-500/10 border-red-500/40 text-red-400 shadow-red-500/10 hover:bg-red-500/20'
                    },
                    {
                      label: '+Y', axis: 1, dir: 1, angle: 300,
                      colorClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10 hover:bg-emerald-500/20'
                    },
                    {
                      label: '-Y', axis: 1, dir: -1, angle: 0,
                      colorClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10 hover:bg-emerald-500/20'
                    },
                  ];

                  return controls.map((btn) => {
                    const rad = (btn.angle * Math.PI) / 180;
                    const x = Math.cos(rad) * radius;
                    const y = -Math.sin(rad) * radius;

                    return (
                      <div
                        key={btn.label}
                        className="absolute z-10 pointer-events-auto"
                        style={{
                          top: `calc(${centerY} + ${y}px)`,
                          left: `calc(${centerX} + ${x}px)`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <Button
                          onClick={() => handleJog(btn.axis, btn.dir)}
                          disabled={isMoving}
                          size="icon"
                          className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full font-black text-[8px] sm:text-[10px] active:scale-90 transition-all shadow-lg backdrop-blur-md border ${btn.colorClass}`}
                        >
                          {btn.label}
                        </Button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* --- ROTATION CARD --- */}
        <div className={cn(
          "relative flex flex-col bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:shadow-xl hover:bg-card/50",
          isEStopActive && "opacity-60 grayscale-[0.5] pointer-events-none"
        )}>
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500/40 via-emerald-500 to-transparent rounded-t-2xl opacity-50" />

          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <RotateCw className="w-3 h-3" /> {t('robot.orientation')}
            </h3>
            {/* Step Control */}
            <div className="flex items-center bg-secondary/20 rounded-full border border-border/40 pl-3 pr-1 py-0.5 gap-2 scale-90 sm:scale-100 origin-right">
              <span className="text-[9px] text-muted-foreground font-black tracking-tighter uppercase whitespace-nowrap">
                {t('robot.step', { unit: '°' })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full hover:bg-white/10"
                  onClick={() => setRotationStep(Math.max(0.1, rotationStep - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-8">
                  <Input
                    type="number"
                    value={rotationStep}
                    onChange={(e) => setRotationStep(parseFloat(e.target.value) || 0)}
                    className="h-5 border-0 bg-transparent p-0 text-[11px] font-black text-center focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full hover:bg-white/10"
                  onClick={() => setRotationStep(rotationStep + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:gap-6 h-full">
            {/* Top Row: Inputs */}
            <div className="space-y-1.5 sm:space-y-2">
              {renderCoordinateRow("RX", 3, "°")}
              {renderCoordinateRow("RY", 4, "°")}
              {renderCoordinateRow("RZ", 5, "°")}
            </div>

            {/* Bottom Row: Rotation (Refined Isometric Layout) */}
            <div className="flex-1 min-h-[220px] sm:min-h-[260px] relative bg-secondary/5 rounded-2xl border border-white/5 overflow-hidden flex flex-col items-center justify-center">

              {/* Central Visualization */}
              <ThreeIsometricAxes mode="rotation" />

              {/* Hexagonal Button Layout */}
              <div className="relative w-full h-full pointer-events-none">
                {(() => {
                  // Adjust radius for mobile
                  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                  const radius = isMobile ? 65 : 85;
                  const centerX = '50%';
                  const centerY = '50%';

                  const controls: { label: string; axis: number; dir: 1 | -1; angle: number; colorClass: string }[] = [
                    {
                      label: '+RZ', axis: 5, dir: 1, angle: 60,
                      colorClass: 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-blue-500/10 hover:bg-blue-500/20'
                    },
                    {
                      label: '-RZ', axis: 5, dir: -1, angle: 120,
                      colorClass: 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-blue-500/10 hover:bg-blue-500/20'
                    },
                    {
                      label: '-RX', axis: 3, dir: -1, angle: 180,
                      colorClass: 'bg-red-500/10 border-red-500/40 text-red-400 shadow-red-500/10 hover:bg-red-500/20'
                    },
                    {
                      label: '+RX', axis: 3, dir: 1, angle: 240,
                      colorClass: 'bg-red-500/10 border-red-500/40 text-red-400 shadow-red-500/10 hover:bg-red-500/20'
                    },
                    {
                      label: '+RY', axis: 4, dir: 1, angle: 300,
                      colorClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10 hover:bg-emerald-500/20'
                    },
                    {
                      label: '-RY', axis: 4, dir: -1, angle: 0,
                      colorClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10 hover:bg-emerald-500/20'
                    },
                  ];

                  return controls.map((btn) => {
                    const rad = (btn.angle * Math.PI) / 180;
                    const x = Math.cos(rad) * radius;
                    const y = -Math.sin(rad) * radius;

                    return (
                      <div
                        key={btn.label}
                        className="absolute z-10 pointer-events-auto"
                        style={{
                          top: `calc(${centerY} + ${y}px)`,
                          left: `calc(${centerX} + ${x}px)`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <Button
                          onClick={() => handleJog(btn.axis, btn.dir)}
                          disabled={isMoving}
                          size="icon"
                          className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full font-black text-[8px] sm:text-[10px] active:scale-90 transition-all shadow-lg backdrop-blur-md border ${btn.colorClass}`}
                        >
                          {btn.label}
                        </Button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ControlPanel;