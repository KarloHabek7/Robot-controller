import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRobotStore } from '@/stores/robotStore';
import { Send, Terminal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CommandEntry {
  id: number;
  command: string;
  timestamp: string;
  response?: string;
  status: 'sent' | 'success' | 'error';
}

const CommandPanel = () => {
  const { connectionUrl, isConnected } = useRobotStore();
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandEntry[]>([]);

  const handleSendCommand = () => {
    if (!command.trim()) {
      toast.error('Please enter a command');
      return;
    }

    if (!isConnected) {
      toast.error('Not connected to robot. This is a demo mode.');
    }

    const newEntry: CommandEntry = {
      id: Date.now(),
      command: command.trim(),
      timestamp: new Date().toLocaleTimeString(),
      status: 'sent',
      response: 'Command queued (demo mode)',
    };

    setCommandHistory(prev => [newEntry, ...prev]);
    setCommand('');
    
    toast.success('Command sent (demo mode)');
  };

  const handleClearHistory = () => {
    setCommandHistory([]);
    toast.success('Command history cleared');
  };

  const quickCommands = [
    { label: 'Home', command: 'HOME' },
    { label: 'Reset', command: 'RESET' },
    { label: 'Status', command: 'GET_STATUS' },
    { label: 'Stop', command: 'EMERGENCY_STOP', variant: 'destructive' as const },
  ];

  return (
    <div className="card-premium rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Command Interface
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
      </div>

      <div className="space-y-4">
        {/* Connection Info */}
        <div className="p-3 bg-secondary/20 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Endpoint</div>
            <div className="text-sm font-mono text-foreground">{connectionUrl}</div>
          </div>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-muted'} animate-pulse`} />
        </div>

        {/* Quick Commands */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Quick Commands</Label>
          <div className="flex flex-wrap gap-2">
            {quickCommands.map((cmd) => (
              <Button
                key={cmd.command}
                variant={cmd.variant || 'outline'}
                size="sm"
                onClick={() => {
                  setCommand(cmd.command);
                  handleSendCommand();
                }}
              >
                {cmd.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Command Input */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Custom Command</Label>
          <div className="flex gap-2">
            <Textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command... (e.g., MOVE_J 10 20 30 0 0 0)"
              className="flex-1 min-h-[80px] font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSendCommand();
                }
              }}
            />
            <Button
              onClick={handleSendCommand}
              className="gap-2"
              disabled={!command.trim()}
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Press Ctrl+Enter to send • Commands are currently in demo mode
          </p>
        </div>

        {/* Command History */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Command History</Label>
          <ScrollArea className="h-[200px] rounded-lg border border-border/50 bg-secondary/10">
            <div className="p-3 space-y-2">
              {commandHistory.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No commands sent yet
                </div>
              ) : (
                commandHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <code className="text-xs font-mono text-foreground">{entry.command}</code>
                      <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                    </div>
                    {entry.response && (
                      <div className="text-xs text-muted-foreground mt-2 font-mono">
                        → {entry.response}
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
