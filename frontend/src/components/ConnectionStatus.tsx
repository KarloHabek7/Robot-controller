import { Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from "react-i18next";

interface ConnectionStatusProps {
  connected: boolean;
  onToggleConnection: () => void;
}

const ConnectionStatus = ({ connected, onToggleConnection }: ConnectionStatusProps) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${connected ? 'bg-primary/20' : 'bg-muted/50'} transition-colors`}>
            {connected ? (
              <Wifi className="h-5 w-5 text-primary" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              {connected ? t('robot.connected') : t('robot.disconnected')}
              {connected && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {connected ? 'Robot is online and ready' : 'Not connected'}
            </div>
          </div>
        </div>

        <Button
          onClick={onToggleConnection}
          variant={connected ? "destructive" : "default"}
          className={connected ? "" : "bg-primary text-primary-foreground hover:bg-primary/90"}
          size="sm"
        >
          {connected ? t('robot.disconnect') : t('robot.connect')}
        </Button>
      </div>
    </div>
  );
};

export default ConnectionStatus;
