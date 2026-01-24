import { useState, useEffect, useRef } from 'react';
import { Gauge } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useRobotStore } from '@/stores/robotStore';
import { api } from '@/services/api';
import { toast } from 'sonner';

export const SpeedControl = () => {
    const { robotSpeed, setRobotSpeed, isConnected } = useRobotStore();
    const [localValue, setLocalValue] = useState(robotSpeed);
    const [isDragging, setIsDragging] = useState(false);
    const lastCommitTime = useRef<number>(0);

    // Sync local value with store when not dragging and after a grace period from last commit
    useEffect(() => {
        if (!isDragging && Date.now() - lastCommitTime.current > 1000) {
            setLocalValue(robotSpeed);
        }
    }, [robotSpeed, isDragging]);

    const handleSpeedChange = (vals: number[]) => {
        setLocalValue(vals[0]);
        setIsDragging(true);
    };

    const handleSpeedCommit = async (vals: number[]) => {
        setIsDragging(false);
        lastCommitTime.current = Date.now();

        if (!isConnected) return;

        // Update store immediately for UI responsiveness
        setRobotSpeed(vals[0]);

        try {
            await api.setRobotSpeed(vals[0] / 100);
        } catch (error) {
            console.error("Failed to set speed:", error);
            toast.error("Failed to set robot speed");
        }
    };

    return (
        <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Speed</span>
            </div>

            <Slider
                value={[localValue]}
                max={100}
                step={1}
                onValueChange={handleSpeedChange}
                onValueCommit={handleSpeedCommit}
                disabled={!isConnected}
                className="w-64"
            />

            <div className="text-[11px] font-mono font-bold w-10 text-right text-primary">
                {localValue}%
            </div>
        </div>
    );
};

export default SpeedControl;
