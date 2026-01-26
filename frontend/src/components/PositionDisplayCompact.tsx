import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";

interface PositionDisplayCompactProps {
    pose: number[];
}

const PositionDisplayCompact = ({ pose }: PositionDisplayCompactProps) => {
    const { t } = useTranslation();

    const formatCoord = (value: number) => value.toFixed(2);
    const toDegrees = (rad: number) => rad * (180 / Math.PI);

    const posCoords = [
        { label: 'X', value: (pose[0] || 0) * 1000, unit: 'mm', color: 'text-blue-500' },
        { label: 'Y', value: (pose[1] || 0) * 1000, unit: 'mm', color: 'text-emerald-500' },
        { label: 'Z', value: (pose[2] || 0) * 1000, unit: 'mm', color: 'text-amber-500' },
    ];

    const rotCoords = [
        { label: 'RX', value: toDegrees(pose[3] || 0), unit: '°', color: 'text-purple-500' },
        { label: 'RY', value: toDegrees(pose[4] || 0), unit: '°', color: 'text-pink-500' },
        { label: 'RZ', value: toDegrees(pose[5] || 0), unit: '°', color: 'text-rose-500' },
    ];

    return (
        <div className="bg-background/80 backdrop-blur-md border border-border/50 rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-2xl opacity-98 pointer-events-auto h-auto sm:h-[80px] flex items-center gap-2 sm:gap-4 w-auto">
            <div className="flex flex-col justify-center items-center gap-1 sm:gap-1.5 px-1 sm:px-2 h-full shrink-0">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                <span className="text-[8px] sm:text-[10px] font-black uppercase text-primary leading-none">
                    TCP
                </span>
            </div>

            <div className="flex flex-col gap-0.5 sm:gap-1 justify-center flex-1 min-w-0">
                {/* Row 1: Position */}
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                    {posCoords.map((item) => (
                        <div key={item.label} className="flex items-baseline gap-1 sm:gap-1.5 min-w-[55px] sm:min-w-[70px] shrink-0">
                            <span className={`text-[8px] sm:text-[10px] font-black ${item.color} uppercase w-3 sm:w-4`}>
                                {item.label}
                            </span>
                            <span className="text-xs sm:text-sm font-mono font-bold text-foreground tabular-nums truncate">
                                {formatCoord(item.value)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Row 2: Rotation */}
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                    {rotCoords.map((item) => (
                        <div key={item.label} className="flex items-baseline gap-1 sm:gap-1.5 min-w-[55px] sm:min-w-[70px] shrink-0">
                            <span className={`text-[8px] sm:text-[10px] font-black ${item.color} uppercase w-3 sm:w-4`}>
                                {item.label}
                            </span>
                            <span className="text-xs sm:text-sm font-mono font-bold text-foreground tabular-nums truncate">
                                {formatCoord(item.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PositionDisplayCompact;