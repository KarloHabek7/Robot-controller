import { useState, useRef, useEffect, useCallback } from 'react';
import { Power, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";
import { useRobotStore } from '@/stores/robotStore';
import { cn } from '@/lib/utils';

const HOLD_DURATION = 2000; // ms

export const EmergencyStop = () => {
    const { t } = useTranslation();
    const { isEStopActive, setEStopActive } = useRobotStore();
    const [holdProgress, setHoldProgress] = useState(0);
    const holdTimerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);

    const handleActivate = useCallback(async () => {
        setEStopActive(true);
        try {
            await import('@/services/api').then(m => m.api.emergencyStop());
        } catch (error) {
            console.error("Failed to send emergency stop:", error);
        }

        toast.error(t('estop.activated'), {
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
        toast.success(t('estop.reset'), {
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
        <div className="relative group/estop pointer-events-auto select-none">
            {/* Industrial Yellow Housing - Thinner border to show more yellow */}
            <div className="w-32 h-32 rounded-full bg-[#fbbf24] border-[3px] border-[#b45309] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.6),inset_0_2px_8px_rgba(255,255,255,0.5)] flex items-center justify-center relative overflow-hidden">

                {/* Housing labels - Both stacked at the bottom */}
                <div className="absolute bottom-1.5 flex flex-col items-center leading-tight pointer-events-none z-0">
                    <span className="text-[8px] font-black text-[#78350f] uppercase tracking-[0.2em] opacity-80">{t('estop.emergency')}</span>
                    <span className="text-[8px] font-black text-[#78350f] uppercase tracking-[0.2em] opacity-80">{t('estop.stopLabel')}</span>
                </div>

                {/* Progress Ring for Reset - Starting from top (12 o'clock) and traveling CCW */}
                {isEStopActive && holdProgress > 0 && (
                    <svg
                        viewBox="0 0 128 128"
                        className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
                        style={{
                            transform: 'rotate(-90deg) scaleY(-1)',
                            transformOrigin: 'center'
                        }}
                    >
                        {/* Background track (subtle helper) */}
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="5"
                            fill="transparent"
                        />
                        {/* Active Progress */}
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            stroke="white"
                            strokeWidth="5"
                            fill="transparent"
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-75 ease-linear opacity-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                        />
                    </svg>
                )}

                {/* The Red Mushroom Button - Reverted to "Centered when Pressed" geometry */}
                <button
                    onMouseDown={startHolding}
                    onMouseUp={stopHolding}
                    onMouseLeave={stopHolding}
                    onTouchStart={startHolding}
                    onTouchEnd={stopHolding}
                    className={cn(
                        "relative w-16 h-16 rounded-full transition-all duration-300 ring-4 ring-black/10 z-20",
                        "flex flex-col items-center justify-center text-white",
                        isEStopActive
                            ? "bg-gradient-to-b from-[#7f1d1d] to-[#450a0a] shadow-inner translate-y-0 ring-[#ef4444]/20"
                            : "bg-gradient-to-b from-[#ef4444] to-[#991b1b] -translate-y-2.5 shadow-[0_10px_0_0_#7f1d1d,0_20px_25px_-10px_rgba(0,0,0,0.5)] active:translate-y-[-4px] active:shadow-[0_4px_0_0_#7f1d1d] hover:brightness-110"
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
                            <span className="text-[7px] font-black tracking-tighter">{t('estop.holdToReset')}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <Power className="h-6 w-6 mb-1 drop-shadow-lg" />
                            <span className="text-[9px] font-black tracking-[0.2em] leading-none">{t('estop.stop')}</span>
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
