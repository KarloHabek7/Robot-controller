import { useTranslation } from "react-i18next";

interface PositionDisplayProps {
  position: { x: number; y: number; z: number };
}

const PositionDisplay = ({ position }: PositionDisplayProps) => {
  const { t } = useTranslation();
  const formatCoord = (value: number) => value.toFixed(2);

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
        {t('robot.position')}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-lg p-4 hover:shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">X</div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">{formatCoord(position.x)}</div>
          <div className="text-[10px] text-muted-foreground">meters</div>
        </div>
        <div className="bg-card border rounded-lg p-4 hover:shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Y</div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">{formatCoord(position.y)}</div>
          <div className="text-[10px] text-muted-foreground">meters</div>
        </div>
        <div className="bg-card border rounded-lg p-4 hover:shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Z</div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">{formatCoord(position.z)}</div>
          <div className="text-[10px] text-muted-foreground">meters</div>
        </div>
      </div>
    </div>
  );
};

export default PositionDisplay;
