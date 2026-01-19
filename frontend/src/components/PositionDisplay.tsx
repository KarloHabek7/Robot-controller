import { useTranslation } from "react-i18next";
import { Activity, Target } from "lucide-react";

interface PositionDisplayProps {
  pose: number[];
}

const PositionDisplay = ({ pose }: PositionDisplayProps) => {
  const { t } = useTranslation();
  const formatCoord = (value: number) => value.toFixed(2);

  const coords = [
    { label: 'X', value: pose[0] || 0, unit: 'mm', color: 'text-blue-500' },
    { label: 'Y', value: pose[1] || 0, unit: 'mm', color: 'text-emerald-500' },
    { label: 'Z', value: pose[2] || 0, unit: 'mm', color: 'text-amber-500' },
    { label: 'RX', value: pose[3] || 0, unit: '°', color: 'text-purple-500' },
    { label: 'RY', value: pose[4] || 0, unit: '°', color: 'text-pink-500' },
    { label: 'RZ', value: pose[5] || 0, unit: '°', color: 'text-rose-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
            {t('robot.position')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold text-primary uppercase">Active Tracking</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {coords.map((item) => (
          <div
            key={item.label}
            className="group relative bg-card border rounded-2xl p-4 overflow-hidden transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -translate-y-8 translate-x-8 blur-2xl group-hover:bg-primary/10 transition-colors" />

            <div className="relative flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black ${item.color} px-1.5 py-0.5 rounded bg-foreground/5 dark:bg-white/5`}>
                  {item.label}
                </span>
                <Activity className="w-3 h-3 text-muted-foreground/20" />
              </div>

              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-black tracking-tighter tabular-nums text-foreground leading-none">
                  {formatCoord(item.value)}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">{item.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PositionDisplay;
