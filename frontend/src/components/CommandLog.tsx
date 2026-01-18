import { ScrollArea } from '@/components/ui/scroll-area';

interface Command {
  id: number;
  timestamp: string;
  command: string;
  status: 'success' | 'pending' | 'error';
}

interface CommandLogProps {
  commands: Command[];
}

const CommandLog = ({ commands }: CommandLogProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-success';
      case 'pending':
        return 'text-warning';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'pending':
        return '⟳';
      case 'error':
        return '✗';
      default:
        return '•';
    }
  };

  return (
    <div className="card-premium rounded-xl p-5 shadow-lg">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Command Log</h3>
      
      <ScrollArea className="h-[300px]">
        <div className="space-y-1">
          {commands.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              No commands yet
            </div>
          ) : (
            commands.map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-start gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-secondary/30 transition-all duration-200 border border-transparent hover:border-border/50"
              >
                <span className={`${getStatusColor(cmd.status)} font-bold text-base`}>
                  {getStatusIcon(cmd.status)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground text-sm">{cmd.command}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{cmd.timestamp}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CommandLog;
