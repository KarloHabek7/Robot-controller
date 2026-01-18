import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MoveUp, MoveDown, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { urRobotService } from '@/services/urRobotService';
import { toast } from 'sonner';

interface ControlPanelProps {
  onMove: (direction: string, value?: number) => void;
  onGoToPosition: (x: number, y: number, z: number) => void;
}

const ControlPanel = ({ onMove, onGoToPosition }: ControlPanelProps) => {
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
      await urRobotService.rotateTCP({
        axis,
        value: parseFloat(rotationStep),
        direction,
      });
      toast.success(`TCP rotated ${direction}${axis.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to rotate TCP');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Directional Controls */}
      <div className="card-premium rounded-xl p-4 shadow-lg">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Directional Control</h3>
        
        <div className="flex items-center justify-center mb-3">
          <Input
            type="number"
            value={stepSize}
            onChange={(e) => setStepSize(e.target.value)}
            className="w-16 text-center bg-background border-border text-sm h-8"
            placeholder="0.01"
          />
          <span className="text-xs text-muted-foreground ml-2">meters per step</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div />
          <Button
            onClick={() => onMove('up', parseFloat(stepSize))}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <div />
          
          <Button
            onClick={() => onMove('left', parseFloat(stepSize))}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onMove('stop')}
            size="sm"
            variant="destructive"
            className="font-semibold"
          >
            STOP
          </Button>
          <Button
            onClick={() => onMove('right', parseFloat(stepSize))}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          <div />
          <Button
            onClick={() => onMove('down', parseFloat(stepSize))}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onMove('z-up', parseFloat(stepSize))}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <MoveUp className="h-4 w-4 mr-2" />
            Z+
          </Button>
          <Button
            onClick={() => onMove('z-down', parseFloat(stepSize))}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <MoveDown className="h-4 w-4 mr-2" />
            Z-
          </Button>
        </div>
      </div>

      {/* TCP Rotation Controls */}
      <div className="card-premium rounded-xl p-4 shadow-lg">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">TCP Rotation</h3>
        
        <div className="flex items-center justify-center mb-3">
          <Input
            type="number"
            value={rotationStep}
            onChange={(e) => setRotationStep(e.target.value)}
            className="w-16 text-center bg-background border-border text-sm h-8"
            placeholder="0.05"
          />
          <span className="text-xs text-muted-foreground ml-2">radians per step</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleRotation('rx', '+')}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            +RX
          </Button>
          <Button
            onClick={() => handleRotation('rx', '-')}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <RotateCw className="h-4 w-4 mr-2 scale-x-[-1]" />
            -RX
          </Button>
          <Button
            onClick={() => handleRotation('ry', '+')}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            +RY
          </Button>
          <Button
            onClick={() => handleRotation('ry', '-')}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <RotateCw className="h-4 w-4 mr-2 scale-x-[-1]" />
            -RY
          </Button>
          <Button
            onClick={() => handleRotation('rz', '+')}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            +RZ
          </Button>
          <Button
            onClick={() => handleRotation('rz', '-')}
            size="sm"
            className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-all"
          >
            <RotateCw className="h-4 w-4 mr-2 scale-x-[-1]" />
            -RZ
          </Button>
        </div>
      </div>

      {/* Coordinate Input */}
      <div className="card-premium rounded-xl p-4 shadow-lg">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Go to Position</h3>
        
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground font-medium">X Coordinate</label>
            <Input
              type="number"
              value={targetX}
              onChange={(e) => setTargetX(e.target.value)}
              placeholder="0.00"
              className="mt-1 bg-background border-border h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Y Coordinate</label>
            <Input
              type="number"
              value={targetY}
              onChange={(e) => setTargetY(e.target.value)}
              placeholder="0.00"
              className="mt-1 bg-background border-border h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Z Coordinate</label>
            <Input
              type="number"
              value={targetZ}
              onChange={(e) => setTargetZ(e.target.value)}
              placeholder="0.00"
              className="mt-1 bg-background border-border h-8 text-sm"
            />
          </div>
          
          <Button
            onClick={handleGoTo}
            size="sm"
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-glow font-semibold mt-1"
          >
            GO TO POSITION
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
