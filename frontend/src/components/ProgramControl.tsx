import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { api } from '@/services/api';
import { toast } from 'sonner';

const ProgramControl = () => {
  const { t } = useTranslation();
  const [programName, setProgramName] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    if (!programName.trim()) {
      toast.error(t('errors.invalidInput'));
      return;
    }

    setIsLoading(true);
    try {
      await api.startProgram(programName);
      setIsRunning(true);
      toast.success(`${t('programs.running')}: ${programName}`);
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await api.stopProgram();
      setIsRunning(false);
      toast.success(t('programs.stopped'));
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {t('robot.programControl')}
      </h3>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">{t('programs.programName')}</Label>
          <Input
            type="text"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder={t('programs.programName')}
            className="mt-1 bg-background border-border h-9 text-sm"
            disabled={isRunning || isLoading}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground mb-1">{t('logs.status')}</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
              <span className="text-xs font-semibold">
                {isRunning ? t('programs.running') : t('programs.stopped')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleStart}
            disabled={isRunning || isLoading}
            size="sm"
            className="h-9 font-bold"
          >
            <Play className="h-4 w-4 mr-1" />
            {t('programs.start')}
          </Button>
          <Button
            onClick={handleStop}
            disabled={!isRunning || isLoading}
            size="sm"
            variant="destructive"
            className="h-9 font-bold"
          >
            <Square className="h-4 w-4 mr-1" />
            {t('programs.stop')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProgramControl;
