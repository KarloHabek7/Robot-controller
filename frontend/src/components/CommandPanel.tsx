import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Send, Terminal, Trash2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { toast } from 'sonner';

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
  const [commandHistory, setCommandHistory] = useState<CommandEntry[]>([]);

  const handleSendCommand = () => {
    if (!command.trim()) {
      toast.error(t('errors.invalidInput'));
      return;
    }

    const newEntry: CommandEntry = {
      id: Date.now(),
      command: command.trim(),
      timestamp: new Date().toLocaleTimeString(),
      status: 'sent',
      response: 'Command sent to robot',
    };

    setCommandHistory(prev => [newEntry, ...prev]);
    setCommand('');
    toast.success(t('common.success'));
  };

  const handleClearHistory = () => {
    setCommandHistory([]);
    toast.success(t('logs.clear'));
  };

  const quickCommands = [
    { label: 'Home', command: 'MOVEJ [0, -1.57, 0, -1.57, 0, 0]' },
    { label: 'Status', command: 'GET_STATUS' },
    { label: 'Unlock', command: 'UNLOCK_PROTECTIVE_STOP' },
  ];

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {t('logs.commandLog')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="gap-2 h-8"
        >
          <Trash2 className="w-4 h-4" />
          {t('logs.clear')}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Quick Commands */}
        <div>
          <Label className="text-[10px] text-muted-foreground mb-2 block uppercase tracking-tight">Quick Commands</Label>
          <div className="flex flex-wrap gap-2">
            {quickCommands.map((cmd) => (
              <Button
                key={cmd.command}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-mono"
                onClick={() => {
                  setCommand(cmd.command);
                }}
              >
                {cmd.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Command Input */}
        <div className="space-y-2">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-tight">URScript / Command</Label>
          <div className="flex gap-2">
            <Textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. movej([0, 0, 0, 0, 0, 0])"
              className="flex-1 min-h-[80px] font-mono text-xs bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSendCommand();
                }
              }}
            />
            <Button
              onClick={handleSendCommand}
              className="h-auto aspect-square flex flex-col p-2 gap-1"
              disabled={!command.trim()}
            >
              <Send className="w-4 h-4" />
              <span className="text-[10px]">SEND</span>
            </Button>
          </div>
        </div>

        {/* Command History */}
        <div>
          <Label className="text-[10px] text-muted-foreground mb-2 block uppercase tracking-tight">History</Label>
          <ScrollArea className="h-[180px] rounded-lg border bg-secondary/10">
            <div className="p-3 space-y-2">
              {commandHistory.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-8 italic">
                  No commands sent yet
                </div>
              ) : (
                commandHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-background border border-border/50 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <code className="text-xs font-mono text-primary font-bold">{entry.command}</code>
                      <span className="text-[9px] text-muted-foreground">{entry.timestamp}</span>
                    </div>
                    {entry.response && (
                      <div className="text-[10px] text-muted-foreground mt-1 border-t pt-1 font-mono italic">
                        ↳ {entry.response}
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
