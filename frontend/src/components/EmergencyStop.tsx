import { useState, useRef, useEffect, useCallback } from 'react';
import { Power, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useRobotStore } from '@/stores/robotStore';
import { cn } from '@/lib/utils';

const HOLD_DURATION = 2000; // ms

export const EmergencyStop = () => {
    const { isEStopActive, setEStopActive } = useRobotStore();
    const [holdProgress, setHoldProgress] = useState(0);
    const holdTimerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);

    const handleActivate = useCallback(() => {
        setEStopActive(true);
        toast.error("EMERGENCY STOP ACTIVATED", {
            duration: null,
            id: 'e-stop-toast',
            style: {
                background: '#991b1b',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                border: '2px solid #ef4444'
            }
        });
    }, [setEStopActive]);

    const handleReset = useCallback(() => {
        setEStopActive(false);
        setHoldProgress(0);
        toast.dismiss('e-stop-toast');
        toast.success("SYSTEM RESET", {
            duration: 2000,
            icon: <RotateCcw className="h-4 w-4" />
        });
    }, [setEStopActive]);

    const startHolding = () => {
        if (!isEStopActive) {
            handleActivate();
            return;
        }

        startTimeRef.current = Date.now();
        const updateProgress = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
            setHoldProgress(progress);

            if (progress < 100) {
                holdTimerRef.current = requestAnimationFrame(updateProgress);
            } else {
                handleReset();
            }
        };
        holdTimerRef.current = requestAnimationFrame(updateProgress);
    };

    const stopHolding = () => {
        if (holdTimerRef.current) {
            cancelAnimationFrame(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setHoldProgress(0);
    };

    useEffect(() => {
        return () => {
            if (holdTimerRef.current) cancelAnimationFrame(holdTimerRef.current);
        };
    }, []);

    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (holdProgress / 100) * circumference;

    return (
        <div className="relative group/estop pointer-events-auto select-none mr-4 mb-2">
            {/* Industrial Yellow Housing - Thinner border to show more yellow */}
            <div className="w-32 h-32 rounded-full bg-[#fbbf24] border-[3px] border-[#b45309] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.6),inset_0_2px_8px_rgba(255,255,255,0.5)] flex items-center justify-center relative overflow-hidden">

                {/* Housing labels - Moved for better visibility and reduced clutter */}
                <div className="absolute top-1.5 text-[8px] font-black text-[#78350f] uppercase tracking-[0.2em] opacity-80 drop-shadow-sm">Emergency</div>
                <div className="absolute bottom-1.5 text-[8px] font-black text-[#78350f] uppercase tracking-[0.2em] opacity-80 drop-shadow-sm">Stop</div>

                {/* Progress Ring for Reset - Reversed direction (scale-x-[-1]) */}
                {isEStopActive && holdProgress > 0 && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 scale-x-[-1] pointer-events-none z-10">
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            stroke="white"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-75 ease-linear opacity-60"
                        />
                    </svg>
                )}

                {/* The Red Mushroom Button - Resized to w-16 h-16 to show more background */}
                <button
                    onMouseDown={startHolding}
                    onMouseUp={stopHolding}
                    onMouseLeave={stopHolding}
                    onTouchStart={startHolding}
                    onTouchEnd={stopHolding}
                    className={cn(
                        "relative w-16 h-16 rounded-full transition-all duration-300 ring-4 ring-black/20 z-20",
                        "flex flex-col items-center justify-center text-white",
                        isEStopActive
                            ? "bg-gradient-to-b from-[#7f1d1d] to-[#450a0a] shadow-inner translate-y-2 ring-[#ef4444]/40"
                            : "bg-gradient-to-b from-[#ef4444] to-[#991b1b] shadow-[0_10px_0_0_#7f1d1d,0_15px_30px_-5px_rgba(127,29,29,0.7)] active:translate-y-2 active:shadow-[0_4px_0_0_#7f1d1d] hover:brightness-110"
                    )}
                >
                    {/* Glossy Highlight Overlay */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />

                    {isEStopActive ? (
                        <div className="flex flex-col items-center">
                            <RotateCcw className={cn(
                                "h-6 w-6 mb-0.5 transition-transform",
                                // Reversed spin animation using style
                                holdProgress > 0 ? "animate-[spin_1s_linear_infinite_reverse]" : "opacity-80"
                            )} />
                            <span className="text-[7px] font-black tracking-tighter">HOLD TO RESET</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <Power className="h-6 w-6 mb-1 drop-shadow-lg" />
                            <span className="text-[9px] font-black tracking-[0.2em] leading-none">STOP</span>
                        </div>
                    )}

                    {/* Button Texture */}
                    <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
                </button>
            </div>

            {/* Reflection / Glow when active */}
            {isEStopActive && (
                <div className="absolute -inset-4 bg-red-600/30 blur-3xl rounded-full animate-pulse -z-10" />
            )}
        </div>
    );
};

export default EmergencyStop;
