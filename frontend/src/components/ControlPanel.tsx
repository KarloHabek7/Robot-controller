import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MoveUp, MoveDown, RotateCw, StopCircle, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { api } from '@/services/api';
import { toast } from 'sonner';

interface ControlPanelProps {
  onMove: (direction: string, value?: number) => void;
  onGoToPosition: (x: number, y: number, z: number) => void;
}

const ControlPanel = ({ onMove, onGoToPosition }: ControlPanelProps) => {
  const { t } = useTranslation();
  const [stepSize, setStepSize] = useState('10');
  const [rotationStep, setRotationStep] = useState('5');

  const handleRotation = async (axis: 'rx' | 'ry' | 'rz', direction: '+' | '-') => {
    try {
      await api.tcpRotate(axis, parseFloat(rotationStep), direction);
      toast.success(`${t('controls.rotate')} ${axis.toUpperCase()} ${direction}${rotationStep}`);
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Directional Controls */}
      <div className="relative group bg-card border rounded-3xl p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent opacity-50" />

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
            {t('robot.tcpControl')}
          </h3>
          <Settings2 className="w-4 h-4 text-muted-foreground/30" />
        </div>

        <div className="flex flex-col items-center">
          <div className="grid grid-cols-3 gap-3 mb-6 relative">
            {/* Visual Guide Lines */}
            <div className="absolute inset-0 border border-dashed border-primary/10 rounded-full scale-150 pointer-events-none" />

            <div />
            <Button
              onClick={() => onMove('up', parseFloat(stepSize))}
              className="h-14 w-14 rounded-2xl shadow-lg border-2 border-primary/5 hover:border-primary/20 bg-background hover:bg-primary/5 text-primary transition-all active:scale-95"
              variant="outline"
            >
              <ArrowUp className="h-6 w-6" />
            </Button>
            <div />

            <Button
              onClick={() => onMove('left', parseFloat(stepSize))}
              className="h-14 w-14 rounded-2xl shadow-lg border-2 border-primary/5 hover:border-primary/20 bg-background hover:bg-primary/5 text-primary transition-all active:scale-95"
              variant="outline"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>

            <Button
              onClick={() => onMove('stop')}
              className="h-14 w-14 rounded-2xl shadow-xl bg-destructive hover:bg-destructive/90 text-white transition-all active:scale-90 ring-4 ring-destructive/10"
              variant="destructive"
            >
              <StopCircle className="h-8 w-8" />
            </Button>

            <Button
              onClick={() => onMove('right', parseFloat(stepSize))}
              className="h-14 w-14 rounded-2xl shadow-lg border-2 border-primary/5 hover:border-primary/20 bg-background hover:bg-primary/5 text-primary transition-all active:scale-95"
              variant="outline"
            >
              <ArrowRight className="h-6 w-6" />
            </Button>

            <div />
            <Button
              onClick={() => onMove('down', parseFloat(stepSize))}
              className="h-14 w-14 rounded-2xl shadow-lg border-2 border-primary/5 hover:border-primary/20 bg-background hover:bg-primary/5 text-primary transition-all active:scale-95"
              variant="outline"
            >
              <ArrowDown className="h-6 w-6" />
            </Button>
            <div />
          </div>

          <div className="flex gap-4 w-full">
            <Button
              onClick={() => onMove('z-up', parseFloat(stepSize))}
              variant="secondary"
              className="flex-1 h-12 rounded-xl gap-2 font-bold"
            >
              <MoveUp className="h-4 w-4" /> Z+
            </Button>
            <Button
              onClick={() => onMove('z-down', parseFloat(stepSize))}
              variant="secondary"
              className="flex-1 h-12 rounded-xl gap-2 font-bold"
            >
              <MoveDown className="h-4 w-4" /> Z-
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 w-full bg-secondary/30 p-3 rounded-2xl border border-border/50">
            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-50 tracking-tighter">Step Size</span>
            <div className="flex items-center gap-1 bg-background border rounded-lg px-2 py-1">
              <Input
                type="number"
                value={stepSize}
                onChange={(e) => setStepSize(e.target.value)}
                className="w-12 border-0 p-0 h-6 text-xs text-center focus-visible:ring-0 font-mono"
              />
              <span className="text-[10px] text-muted-foreground mr-1 italic">mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* TCP Rotation Controls */}
      <div className="bg-card border rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-50" />

        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">
          {t('controls.rotate')}
        </h3>

        <div className="grid grid-cols-2 gap-4 h-full">
          {[
            { axis: 'rx', label: 'Roll' },
            { axis: 'ry', label: 'Pitch' },
            { axis: 'rz', label: 'Yaw' }
          ].map((item) => (
            <div key={item.axis} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRotation(item.axis as any, '+')}
                  variant="outline"
                  className="flex-1 h-10 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-50/5 group/btn"
                >
                  <RotateCw className="h-3 w-3 mr-2 group-hover/btn:rotate-45 transition-transform" />
                  <span className="text-xs font-mono">+{item.axis.toUpperCase()}</span>
                </Button>
                <Button
                  onClick={() => handleRotation(item.axis as any, '-')}
                  variant="outline"
                  className="flex-1 h-10 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-50/5 group/btn"
                >
                  <RotateCw className="h-3 w-3 mr-2 scale-x-[-1] group-hover/btn:-rotate-45 transition-transform" />
                  <span className="text-xs font-mono">-{item.axis.toUpperCase()}</span>
                </Button>
              </div>
            </div>
          ))}

          <div className="col-span-2 mt-auto pt-4 border-t border-border/50">
            <div className="flex items-center justify-between bg-secondary/30 p-2.5 rounded-xl border border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">Rotation Step</span>
              <div className="flex items-center gap-1 bg-background border rounded-lg px-2 py-0.5">
                <Input
                  type="number"
                  value={rotationStep}
                  onChange={(e) => setRotationStep(e.target.value)}
                  className="w-12 border-0 p-0 h-6 text-xs text-center focus-visible:ring-0 font-mono"
                />
                <span className="text-[10px] text-muted-foreground mr-1 italic">°</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
