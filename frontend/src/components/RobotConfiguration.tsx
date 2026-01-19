import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Wifi } from 'lucide-react';

interface RobotConfigurationProps {
  host: string;
  port: number;
  onChange: (host: string, port: number) => void;
}

const RobotConfiguration = ({ host, port, onChange }: RobotConfigurationProps) => {
  const { t } = useTranslation();
  const [localIP, setLocalIP] = useState(host);
  const [localPort, setLocalPort] = useState(port.toString());

  const handleUpdate = () => {
    onChange(localIP, parseInt(localPort));
  };

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {t('robot.control')}
          </h3>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Robot Network Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-4 h-4 text-primary" />
            <Label className="text-xs text-muted-foreground font-semibold">
              {t('robot.connectionStatus')}
            </Label>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                {t('robot.host')}
              </Label>
              <Input
                type="text"
                value={localIP}
                onChange={(e) => setLocalIP(e.target.value)}
                onBlur={handleUpdate}
                placeholder="192.168.1.100"
                className="mt-1 bg-background border-border h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                {t('robot.port')}
              </Label>
              <Input
                type="number"
                value={localPort}
                onChange={(e) => setLocalPort(e.target.value)}
                onBlur={handleUpdate}
                placeholder="30002"
                className="mt-1 bg-background border-border h-9 text-sm"
              />
            </div>

            <Button
              onClick={handleUpdate}
              size="sm"
              variant="outline"
              className="w-full h-9"
            >
              {t('common.save')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/20 rounded-lg mt-2">
          <div>
            <div className="text-xs text-muted-foreground">Manufacturer</div>
            <div className="text-sm font-semibold text-foreground italic">Universal Robots</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Model</div>
            <div className="text-sm font-semibold text-foreground italic">UR5</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">DOF</div>
            <div className="text-sm font-semibold text-foreground italic">6</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Type</div>
            <div className="text-sm font-semibold text-foreground italic">Cobot</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotConfiguration;
