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
        <div className="bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-2xl opacity-98 pointer-events-auto h-[80px] flex items-center gap-4">
            <div className="flex flex-col justify-center items-center gap-1.5 px-2 h-full">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase text-primary leading-none">
                    TCP
                </span>
            </div>

            <div className="flex flex-col gap-1 justify-center flex-1">
                {/* Row 1: Position */}
                <div className="flex items-center gap-3">
                    {posCoords.map((item) => (
                        <div key={item.label} className="flex items-baseline gap-1.5 min-w-[70px]">
                            <span className={`text-[10px] font-black ${item.color} uppercase w-4`}>
                                {item.label}
                            </span>
                            <span className="text-sm font-mono font-bold text-foreground tabular-nums">
                                {formatCoord(item.value)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Row 2: Rotation */}
                <div className="flex items-center gap-3">
                    {rotCoords.map((item) => (
                        <div key={item.label} className="flex items-baseline gap-1.5 min-w-[70px]">
                            <span className={`text-[10px] font-black ${item.color} uppercase w-4`}>
                                {item.label}
                            </span>
                            <span className="text-sm font-mono font-bold text-foreground tabular-nums">
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