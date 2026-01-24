import { Gauge } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useRobotStore } from '@/stores/robotStore';

export const SpeedControl = () => {
    const { robotSpeed, setRobotSpeed } = useRobotStore();

    return (
        <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Speed</span>
            </div>

            <Slider
                value={[robotSpeed]}
                max={100}
                step={1}
                onValueChange={(vals) => setRobotSpeed(vals[0])}
                className="w-64"
            />

            <div className="text-[11px] font-mono font-bold w-10 text-right text-primary">
                {robotSpeed}%
            </div>
        </div>
    );
};

export default SpeedControl;
