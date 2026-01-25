import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Play, Square, RefreshCw, Pause } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { api } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ProgramControl = () => {
  const { t } = useTranslation();
  const [programName, setProgramName] = useState("");
  const [programs, setPrograms] = useState<string[]>([]);
  const [status, setStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const fetchPrograms = async () => {
    setIsFetching(true);
    try {
      const list = await api.getPrograms();
      setPrograms(list);
      // Optional: if list is empty, show a specific warning
      if (list.length === 0) {
        console.warn("No programs found on robot");
      }
    } catch (error) {
      toast.error(t('errors.fetchFailed') || "Failed to fetch programs via FTP. Check connection.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleStart = async () => {
    if (!programName.trim()) {
      toast.error(t('errors.invalidInput'));
      return;
    }

    setIsLoading(true);
    try {
      await api.startProgram(programName);
      setStatus('running');
      toast.success(`${t('programs.running')}: ${programName}`);
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      await api.pauseProgram();
      setStatus('paused');
      toast.info(t('programs.paused') || "Program paused");
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
      setStatus('stopped');
      toast.success(t('programs.stopped'));
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('robot.programControl')}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={fetchPrograms}
          disabled={isFetching}
          title="Refresh Programs"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">{t('programs.programName')}</Label>
          <Select
            value={programName}
            onValueChange={setProgramName}
            disabled={status !== 'stopped' || isLoading}
          >
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue placeholder={t('programs.selectProgram') || "Select a program"} />
            </SelectTrigger>
            <SelectContent>
              {programs.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground text-center">
                  {isFetching ? "Loading..." : "No programs found (check FTP)"}
                </div>
              ) : (
                programs.map((prog) => (
                  <SelectItem key={prog} value={prog} className="text-sm">
                    {prog}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">{t('logs.status')}</div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                status === 'running' ? 'bg-primary animate-pulse' :
                  status === 'paused' ? 'bg-amber-500' : 'bg-muted-foreground'
              )} />
              <span className="text-xs font-semibold capitalize">
                {status === 'running' ? t('programs.running') :
                  status === 'paused' ? (t('programs.paused') || 'Paused') :
                    t('programs.stopped')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleStart}
            disabled={!programName || status === 'running' || isLoading}
            size="sm"
            className="h-9 font-bold col-span-1"
          >
            <Play className="h-4 w-4 mr-1" />
            {status === 'paused' ? (t('programs.resume') || 'Resume') : t('programs.start')}
          </Button>

          <Button
            onClick={handlePause}
            disabled={status !== 'running' || isLoading}
            size="sm"
            variant="outline"
            className="h-9 font-bold col-span-1"
          >
            <Pause className="h-4 w-4 mr-1" />
            {t('programs.pause') || 'Pause'}
          </Button>

          <Button
            onClick={handleStop}
            disabled={status === 'stopped' || isLoading}
            size="sm"
            variant="destructive"
            className="h-9 font-bold col-span-1"
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
