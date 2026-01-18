import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square } from 'lucide-react';
import { useState } from 'react';
import { useRobotStore } from '@/stores/robotStore';
import { urRobotService } from '@/services/urRobotService';
import { toast } from 'sonner';

const ProgramControl = () => {
  const { currentProgramName, isProgramRunning, setCurrentProgramName, setProgramRunning } = useRobotStore();
  const [localProgramName, setLocalProgramName] = useState(currentProgramName);
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    if (!localProgramName.trim()) {
      toast.error('Please enter a program name');
      return;
    }

    setIsLoading(true);
    try {
      await urRobotService.startProgram(localProgramName);
      setCurrentProgramName(localProgramName);
      setProgramRunning(true);
      toast.success(`Program "${localProgramName}" started`);
    } catch (error) {
      toast.error('Failed to start program');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await urRobotService.stopProgram();
      setProgramRunning(false);
      toast.success('Program stopped');
    } catch (error) {
      toast.error('Failed to stop program');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-premium rounded-xl p-4 shadow-lg">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Program Control
      </h3>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Program Name</Label>
          <Input
            type="text"
            value={localProgramName}
            onChange={(e) => setLocalProgramName(e.target.value)}
            placeholder="Enter program name"
            className="mt-1 bg-background border-border h-8 text-sm"
            disabled={isProgramRunning || isLoading}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isProgramRunning ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
              <span className="text-xs font-semibold">
                {isProgramRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleStart}
            disabled={isProgramRunning || isLoading}
            size="sm"
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-glow"
          >
            <Play className="h-4 w-4 mr-1" />
            START
          </Button>
          <Button
            onClick={handleStop}
            disabled={!isProgramRunning || isLoading}
            size="sm"
            variant="destructive"
          >
            <Square className="h-4 w-4 mr-1" />
            STOP
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProgramControl;
