import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";

interface PositionDisplayCompactProps {
    pose: number[];
}

const PositionDisplayCompact = ({ pose }: PositionDisplayCompactProps) => {
    const { t } = useTranslation();

    const formatCoord = (value: number) => value.toFixed(2);
    const toDegrees = (rad: number) => rad * (180 / Math.PI);

    const coords = [
        { label: 'X', value: (pose[0] || 0) * 1000, unit: 'mm', color: 'text-blue-500' },
        { label: 'Y', value: (pose[1] || 0) * 1000, unit: 'mm', color: 'text-emerald-500' },
        { label: 'Z', value: (pose[2] || 0) * 1000, unit: 'mm', color: 'text-amber-500' },
        { label: 'RX', value: toDegrees(pose[3] || 0), unit: '°', color: 'text-purple-500' },
        { label: 'RY', value: toDegrees(pose[4] || 0), unit: '°', color: 'text-pink-500' },
        { label: 'RZ', value: toDegrees(pose[5] || 0), unit: '°', color: 'text-rose-500' },
    ];

    return (
        <div className="flex items-center gap-4 w-full overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase text-muted-foreground hidden sm:inline">
                    TCP
                </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 flex-nowrap">
                {coords.map((item) => (
                    <div key={item.label} className="flex items-baseline gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-black ${item.color} uppercase`}>
                            {item.label}
                        </span>
                        <span className="text-sm font-mono font-medium text-foreground tabular-nums">
                            {formatCoord(item.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PositionDisplayCompact;