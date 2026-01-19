import { useTranslation } from "react-i18next";
import { Activity, Target } from "lucide-react";

interface PositionDisplayProps {
  position: { x: number; y: number; z: number };
}

const PositionDisplay = ({ position }: PositionDisplayProps) => {
  const { t } = useTranslation();
  const formatCoord = (value: number) => value.toFixed(4);

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'X', value: position.x, color: 'text-blue-500' },
          { label: 'Y', value: position.y, color: 'text-emerald-500' },
          { label: 'Z', value: position.z, color: 'text-amber-500' }
        ].map((item) => (
          <div
            key={item.label}
            className="group relative bg-card border rounded-2xl p-5 overflow-hidden transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-primary/10 transition-colors" />

            <div className="relative flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black ${item.color} px-2 py-0.5 rounded bg-foreground/5 dark:bg-white/5`}>
                  {item.label}-AXIS
                </span>
                <Activity className="w-3 h-3 text-muted-foreground/30" />
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tighter tabular-nums text-foreground leading-none">
                  {formatCoord(item.value)}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">m</span>
              </div>

              {/* Progress-like indicator */}
              <div className="mt-4 w-full h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full bg-primary transition-all duration-1000 ease-out`}
                  style={{ width: `${Math.min(100, Math.abs(item.value * 100))}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PositionDisplay;
