import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Wifi, Monitor, Sun, Moon, Languages } from 'lucide-react';
import { useTheme } from "./theme-provider";

interface RobotConfigurationProps {
  host: string;
  port: number;
  onChange: (host: string, port: number) => void;
}

const RobotConfiguration = ({ host, port, onChange }: RobotConfigurationProps) => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [localIP, setLocalIP] = useState(host);
  const [localPort, setLocalPort] = useState(port.toString());

  const handleUpdate = () => {
    onChange(localIP, parseInt(localPort));
  };

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {t('robot.configTitle')}
          </h3>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Robot Network Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-4 h-4 text-primary" />
            <Label className="text-xs text-muted-foreground font-semibold">
              {t('robot.connectionStatus')}
            </Label>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground pl-1">
                  {t('robot.host')}
                </Label>
                <Input
                  type="text"
                  value={localIP}
                  onChange={(e) => setLocalIP(e.target.value)}
                  onBlur={handleUpdate}
                  placeholder="192.168.1.100"
                  className="bg-background border-border h-9 text-sm focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground pl-1">
                  {t('robot.port')}
                </Label>
                <Input
                  type="number"
                  value={localPort}
                  onChange={(e) => setLocalPort(e.target.value)}
                  onBlur={handleUpdate}
                  placeholder="30002"
                  className="bg-background border-border h-9 text-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <Button
              onClick={handleUpdate}
              size="sm"
              variant="outline"
              className="w-full h-9 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all font-bold text-[11px] uppercase tracking-wider"
            >
              {t('common.save')}
            </Button>
          </div>
        </div>

        {/* Application Settings Section */}
        <div className="pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-primary" />
            <Label className="text-xs text-muted-foreground font-semibold">
              {t('settings.title')}
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 pl-1">
                <Sun className="w-3 h-3 text-muted-foreground" />
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  {t('settings.theme')}
                </Label>
              </div>
              <div className="flex p-1 bg-secondary/20 rounded-lg gap-1">
                <Button
                  variant={theme === 'light' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`flex-1 h-7 text-[10px] uppercase font-bold transition-all ${theme === 'light' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                    }`}
                  onClick={() => setTheme('light')}
                >
                  {t('theme.light').split(' ')[0]}
                </Button>
                <Button
                  variant={theme === 'dark' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`flex-1 h-7 text-[10px] uppercase font-bold transition-all ${theme === 'dark' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                    }`}
                  onClick={() => setTheme('dark')}
                >
                  {t('theme.dark').split(' ')[0]}
                </Button>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 pl-1">
                <Languages className="w-3 h-3 text-muted-foreground" />
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  {t('settings.language')}
                </Label>
              </div>
              <div className="flex p-1 bg-secondary/20 rounded-lg gap-1">
                <Button
                  variant={i18n.language === 'en' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`flex-1 h-7 text-[10px] uppercase font-bold transition-all ${i18n.language === 'en' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                    }`}
                  onClick={() => i18n.changeLanguage('en')}
                >
                  EN
                </Button>
                <Button
                  variant={i18n.language === 'hr' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`flex-1 h-7 text-[10px] uppercase font-bold transition-all ${i18n.language === 'hr' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                    }`}
                  onClick={() => i18n.changeLanguage('hr')}
                >
                  HR
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Robot Info Section */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/10 rounded-xl border border-border/50">
          <div className="space-y-0.5">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Manufacturer</div>
            <div className="text-xs font-black text-foreground italic decoration-primary/30 underline decoration-2 underline-offset-4">Universal Robots</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Model</div>
            <div className="text-xs font-black text-foreground italic decoration-primary/30 underline decoration-2 underline-offset-4">UR5</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">DOF</div>
            <div className="text-xs font-black text-foreground italic decoration-primary/30 underline decoration-2 underline-offset-4">6</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Type</div>
            <div className="text-xs font-black text-foreground italic decoration-primary/30 underline decoration-2 underline-offset-4">Cobot</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotConfiguration;

