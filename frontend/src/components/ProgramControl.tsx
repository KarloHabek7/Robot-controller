import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Square, RefreshCw, Pause, FileCode, CheckCircle2, Search, X, PlayCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from "react-i18next";
import { api } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useRobotStore } from '@/stores/robotStore';

const ProgramControl = () => {
  const { t } = useTranslation();
  const loadedProgram = useRobotStore(state => state.loadedProgram);
  const [programName, setProgramName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [programs, setPrograms] = useState<string[]>([]);
  const [status, setStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const fetchPrograms = async () => {
    setIsFetching(true);
    try {
      const list = await api.getPrograms();
      setPrograms(list);
      if (list.length === 0) {
        console.warn("No programs found on robot");
      }
    } catch (error) {
      toast.error(t('errors.fetchFailed'));
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return programs;
    return programs.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [programs, searchQuery]);

  const handleStart = async (nameOverride?: string) => {
    const targetName = nameOverride || programName;
    if (!targetName.trim()) {
      toast.error(t('errors.invalidInput'));
      return;
    }

    setIsLoading(true);
    try {
      await api.startProgram(targetName);
      setStatus('running');
      if (nameOverride) setProgramName(nameOverride);
      toast.success(`${t('programs.running')}: ${targetName}`);
    } catch (error) {
      toast.error(t('errors.commandFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseResume = async () => {
    setIsLoading(true);
    try {
      if (status === 'paused') {
        // Resume - call play without loading
        await api.resumeProgram();
        setStatus('running');
        toast.success(t('programs.resume') + 'd');
      } else {
        // Pause
        await api.pauseProgram();
        setStatus('paused');
        toast.info(t('programs.paused'));
      }
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
    <div className="bg-card border rounded-xl shadow-lg flex flex-col h-full overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <FileCode className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            {t('robot.programControl')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-background border rounded-full shadow-sm">
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === 'running' ? 'bg-green-500 animate-pulse' :
                status === 'paused' ? 'bg-amber-500' : 'bg-muted-foreground'
            )} />
            <span className="text-[10px] font-black uppercase tracking-tight">
              {status === 'running' ? t('programs.running') :
                status === 'paused' ? t('programs.paused') :
                  t('programs.stopped')}
            </span>
          </div>
          {loadedProgram && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full shadow-sm">
              <FileCode className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-tight max-w-[150px] truncate">
                {loadedProgram.split('/').pop()?.replace('.urp', '') || loadedProgram}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={fetchPrograms}
            disabled={isFetching}
            title={t('programs.refreshPrograms')}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
        {/* Manual Input Area */}
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            {t('programs.manuallyEnterName')}
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="e.g. protocol_1.urp"
                className="h-10 bg-muted/20 pr-8 focus:bg-background transition-colors"
                disabled={status !== 'stopped' || isLoading}
              />
              {programName && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setProgramName("")}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              className="shrink-0 h-10 px-4 shadow-md bg-primary hover:bg-primary/90 transition-transform active:scale-95"
              onClick={() => handleStart()}
              disabled={!programName || status === 'running' || isLoading}
              title={t('programs.startByName')}
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator className="opacity-40" />

        {/* Programs List Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('programs.availablePrograms')}
            </Label>

            <div className="relative group w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('programs.searchPrograms')}
                className="h-8 pl-8 text-xs bg-muted/20 border-none group-focus-within:ring-1 group-focus-within:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 bg-muted/5 border rounded-lg overflow-hidden flex flex-col shadow-inner">
            <ScrollArea className="flex-1">
              <div className="p-1 space-y-1">
                {isFetching && programs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center opacity-50">
                    <RefreshCw className="h-8 w-8 animate-spin mb-4" />
                    <p className="text-sm font-medium">{t('common.loading')}</p>
                  </div>
                ) : filteredPrograms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="p-4 bg-muted/10 rounded-full mb-4">
                      <FileCode className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {searchQuery ? t('common.noResults') : t('programs.noProgramsFound')}
                    </p>
                  </div>
                ) : (
                  filteredPrograms.map((prog) => (
                    <div
                      key={prog}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded-md transition-all cursor-pointer border",
                        programName === prog
                          ? "bg-primary/10 border-primary/30 shadow-sm"
                          : "hover:bg-muted/50 border-transparent active:scale-[0.99]"
                      )}
                      onClick={() => setProgramName(prog)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border shadow-sm transition-all duration-300",
                          programName === prog ? "border-primary/50 text-primary scale-110" : "text-muted-foreground opacity-70 group-hover:opacity-100"
                        )}>
                          {programName === prog ? <CheckCircle2 className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
                        </div>
                        <span className={cn(
                          "text-sm font-medium truncate pr-2 transition-colors",
                          programName === prog ? "text-primary" : "text-foreground/80"
                        )}>
                          {prog}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant={programName === prog ? "default" : "secondary"}
                        className={cn(
                          "h-8 w-8 rounded-full transition-all duration-300 transform",
                          programName === prog ? "opacity-100 scale-100 shadow-md" : "opacity-0 group-hover:opacity-100 scale-90 sm:group-hover:translate-x-0 sm:translate-x-2"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStart(prog);
                        }}
                        disabled={status === 'running' || isLoading}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="p-2 border-t bg-muted/10 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>STATUS: {status.toUpperCase()}</span>
              <span>{filteredPrograms.length} ITEMS</span>
            </div>
          </div>
        </div>

        {/* Global Control Buttons */}
        <div className="pt-2 grid grid-cols-2 gap-3">
          <Button
            onClick={handlePauseResume}
            disabled={status === 'stopped' || isLoading}
            variant="outline"
            className={cn(
              "h-12 font-bold shadow-sm transition-all active:scale-95",
              status === 'paused'
                ? "border-green-500/30 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
                : "border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
            )}
          >
            {status === 'paused' ? (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                {t('programs.resume')}
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                {t('programs.pause')}
              </>
            )}
          </Button>

          <Button
            onClick={handleStop}
            disabled={status === 'stopped' || isLoading}
            variant="destructive"
            className="h-12 font-bold shadow-md shadow-destructive/10 transition-all active:scale-95"
          >
            <Square className="h-4 w-4 mr-2" />
            {t('programs.stop')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProgramControl;

