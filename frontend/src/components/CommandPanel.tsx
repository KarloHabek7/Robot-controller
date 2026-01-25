import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Send, Terminal, Trash2, Home, Power, Play, Square, Pause, MessageSquare } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { toast } from 'sonner';
import { api } from '@/services/api';

interface CommandEntry {
  id: number;
  command: string;
  timestamp: string;
  response?: string;
  status: 'sent' | 'success' | 'error';
}

const CommandPanel = () => {
  const { t } = useTranslation();
  const [command, setCommand] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [commandHistory, setCommandHistory] = useState<CommandEntry[]>([]);

  const handleSendCommand = async (cmdToOverride?: string) => {
    const cmdToSend = cmdToOverride || command;
    if (!cmdToSend.trim()) {
      toast.error(t('errors.invalidInput'));
      return;
    }

    setIsSending(true);
    const entryId = Date.now();
    const newEntry: CommandEntry = {
      id: entryId,
      command: cmdToSend.trim(),
      timestamp: new Date().toLocaleTimeString(),
      status: 'sent',
    };

    setCommandHistory(prev => [newEntry, ...prev]);

    try {
      const response = await api.sendRawCommand(cmdToSend.trim());
      setCommandHistory(prev => prev.map(entry =>
        entry.id === entryId
          ? { ...entry, status: 'success', response: (response as any).command || t('commands.success') }
          : entry
      ));
      if (!cmdToOverride) setCommand('');
      toast.success(t('common.success'));
    } catch (error: any) {
      setCommandHistory(prev => prev.map(entry =>
        entry.id === entryId
          ? { ...entry, status: 'error', response: error.message || t('commands.failed') }
          : entry
      ));
      toast.error(error.message || t('commands.failed'));
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    setCommandHistory([]);
    toast.success(t('logs.clear'));
  };

  const quickCommands = [
    { label: 'Home', icon: <Home className="w-3 h-3" />, command: 'movej([0, -1.57, 0, -1.57, 0, 0], a=1.2, v=0.25)' },
    { label: 'Zero', icon: <Square className="w-3 h-3" />, command: 'movej([0, 0, 0, 0, 0, 0], a=1.2, v=0.25)' },
    { label: 'Freedrive On', icon: <Power className="w-3 h-3" />, command: 'freedrive_mode()' },
    { label: 'Freedrive Off', icon: <Power className="w-3 h-3" />, command: 'end_freedrive_mode()' },
    { label: 'Sleep 1s', icon: <Pause className="w-3 h-3" />, command: 'sleep(1.0)' },
    { label: 'Popup', icon: <MessageSquare className="w-3 h-3" />, command: 'popup("Hello from Remote Controller", title="Remote Control", warning=False, error=False)' },
    { label: 'Stop', icon: <Square className="w-3 h-3" />, command: 'stopj(1.0)' },
  ];

  return (
    <div className="bg-card border rounded-xl p-3 sm:p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h3 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
            {t('logs.commandLog')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="gap-2 h-8 text-[10px] sm:text-xs"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {t('logs.clear')}
        </Button>
      </div>

      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        {/* Quick Commands */}
        <div className="shrink-0">
          <Label className="text-[10px] text-muted-foreground mb-2 block uppercase tracking-tight font-bold">{t('commands.quickCommands')}</Label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 no-scrollbar">
            {quickCommands.map((cmd) => (
              <Button
                key={cmd.label}
                variant="outline"
                size="sm"
                className="h-7 sm:h-8 text-[10px] sm:text-xs font-mono gap-1 sm:gap-1.5 px-2 sm:px-3"
                onClick={() => {
                  setCommand(cmd.command);
                }}
              >
                <span className="shrink-0 scale-90 sm:scale-100">{cmd.icon}</span>
                {cmd.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Command Input */}
        <div className="space-y-2 shrink-0">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">{t('commands.urScript')}</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. movej([0, 0, 0, 0, 0, 0])"
              className="flex-1 min-h-[80px] sm:min-h-[100px] font-mono text-xs bg-background resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSendCommand();
                }
              }}
            />
            <Button
              onClick={() => handleSendCommand()}
              className="h-10 sm:h-auto sm:aspect-square flex flex-row sm:flex-col p-2 gap-2 w-full sm:w-16 shrink-0"
              disabled={!command.trim() || isSending}
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              <span className="text-[10px] font-bold">{t('commands.send')}</span>
            </Button>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground italic">
            {t('commands.tip')}
          </p>
        </div>

        {/* Command History */}
        <div className="flex-1 min-h-0 flex flex-col">
          <Label className="text-[10px] text-muted-foreground mb-2 block uppercase tracking-tight font-bold">{t('commands.history')}</Label>
          <ScrollArea className="flex-1 rounded-lg border bg-secondary/10 min-h-[150px]">
            <div className="p-2 sm:p-3 space-y-2">
              {commandHistory.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-12 italic">
                  {t('commands.noCommands')}
                </div>
              ) : (
                commandHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-2 sm:p-3 rounded-lg bg-background border shadow-sm transition-colors ${entry.status === 'error' ? 'border-destructive/50' :
                      entry.status === 'success' ? 'border-primary/30' : 'border-border/50'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-1.5 gap-2">
                      <code className="text-[10px] sm:text-[11px] font-mono text-primary font-semibold break-all">
                        {entry.command}
                      </code>
                      <span className="text-[8px] sm:text-[9px] text-muted-foreground whitespace-nowrap shrink-0">
                        {entry.timestamp}
                      </span>
                    </div>
                    {entry.response && (
                      <div className={`text-[9px] sm:text-[10px] mt-1.5 pt-1.5 border-t font-mono italic flex gap-1.5 ${entry.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                        <span className="shrink-0">↳</span>
                        <span className="break-all">{entry.response}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default CommandPanel;
