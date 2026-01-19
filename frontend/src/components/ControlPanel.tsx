import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MoveUp, MoveDown, RotateCw } from 'lucide-react';
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
  const [targetX, setTargetX] = useState('0');
  const [targetY, setTargetY] = useState('0');
  const [targetZ, setTargetZ] = useState('0');
  const [stepSize, setStepSize] = useState('0.01');
  const [rotationStep, setRotationStep] = useState('0.05');

  const handleGoTo = () => {
    onGoToPosition(parseFloat(targetX), parseFloat(targetY), parseFloat(targetZ));
  };

  const handleRotation = async (axis: 'rx' | 'ry' | 'rz', direction: '+' | '-') => {
    try {
      await api.tcpRotate(axis, parseFloat(rotationStep), direction);
      toast.success(`${t('controls.rotate')} ${axis.toUpperCase()} ${direction}${rotationStep}`);
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Directional Controls */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('robot.tcpControl')}
        </h3>

        <div className="flex items-center justify-center mb-4">
          <Input
            type="number"
            value={stepSize}
            onChange={(e) => setStepSize(e.target.value)}
            className="w-16 text-center bg-background border-border text-sm h-8"
            placeholder="0.01"
          />
          <span className="text-[10px] text-muted-foreground ml-2">meters / step</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div />
          <Button
            onClick={() => onMove('up', parseFloat(stepSize))}
            size="sm"
            variant="outline"
            className="h-10"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <div />

          <Button
            onClick={() => onMove('left', parseFloat(stepSize))}
            size="sm"
            variant="outline"
            className="h-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onMove('stop')}
            size="sm"
            variant="destructive"
            className="font-bold h-10"
          >
            STOP
          </Button>
          <Button
            onClick={() => onMove('right', parseFloat(stepSize))}
            size="sm"
            variant="outline"
            className="h-10"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div />
          <Button
            onClick={() => onMove('down', parseFloat(stepSize))}
            size="sm"
            variant="outline"
            className="h-10"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onMove('z-up', parseFloat(stepSize))}
            size="sm"
            variant="outline"
            className="h-9"
          >
            <MoveUp className="h-4 w-4 mr-1" />
            Z+
          </Button>
          <Button
            onClick={() => onMove('z-down', parseFloat(stepSize))}
            size="sm"
            variant="outline"
            className="h-9"
          >
            <MoveDown className="h-4 w-4 mr-1" />
            Z-
          </Button>
        </div>
      </div>

      {/* TCP Rotation Controls */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('controls.rotate')}
        </h3>

        <div className="flex items-center justify-center mb-4">
          <Input
            type="number"
            value={rotationStep}
            onChange={(e) => setRotationStep(e.target.value)}
            className="w-16 text-center bg-background border-border text-sm h-8"
            placeholder="0.05"
          />
          <span className="text-[10px] text-muted-foreground ml-2">radians / step</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleRotation('rx', '+')}
            size="sm"
            variant="outline"
            className="h-9 justify-start"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            +RX
          </Button>
          <Button
            onClick={() => handleRotation('rx', '-')}
            size="sm"
            variant="outline"
            className="h-9 justify-start"
          >
            <RotateCw className="h-4 w-4 mr-2 scale-x-[-1]" />
            -RX
          </Button>
          <Button
            onClick={() => handleRotation('ry', '+')}
            size="sm"
            variant="outline"
            className="h-9 justify-start"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            +RY
          </Button>
          <Button
            onClick={() => handleRotation('ry', '-')}
            size="sm"
            variant="outline"
            className="h-9 justify-start"
          >
            <RotateCw className="h-4 w-4 mr-2 scale-x-[-1]" />
            -RY
          </Button>
          <Button
            onClick={() => handleRotation('rz', '+')}
            size="sm"
            variant="outline"
            className="h-9 justify-start"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            +RZ
          </Button>
          <Button
            onClick={() => handleRotation('rz', '-')}
            size="sm"
            variant="outline"
            className="h-9 justify-start"
          >
            <RotateCw className="h-4 w-4 mr-2 scale-x-[-1]" />
            -RZ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
