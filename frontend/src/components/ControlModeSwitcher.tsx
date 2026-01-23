import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sliders, Move3d, Wifi, Terminal, Play } from 'lucide-react';
import { ControlMode, useRobotStore } from '@/stores/robotStore';
import { cn } from '@/lib/utils';

interface ControlModeSwitcherProps {
    activeMode: ControlMode;
    onModeChange: (mode: ControlMode) => void;
}

const MODES: { value: ControlMode; label: string; icon: React.ElementType }[] = [
    { value: 'joint', label: 'Joint', icon: Sliders },
    { value: 'tcp', label: 'TCP', icon: Move3d },
    { value: 'connection', label: 'Connection', icon: Wifi },
    { value: 'commands', label: 'Commands', icon: Terminal },
    { value: 'programs', label: 'Programs', icon: Play },
];

export const ControlModeSwitcher = ({ activeMode, onModeChange }: ControlModeSwitcherProps) => {
    const { isConnected } = useRobotStore();

    return (
        <Tabs value={activeMode} onValueChange={(v) => onModeChange(v as ControlMode)} className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-auto p-1">
                {MODES.map((mode) => {
                    const Icon = mode.icon;
                    return (
                        <TabsTrigger
                            key={mode.value}
                            value={mode.value}
                            className="flex flex-col md:flex-row items-center justify-center gap-2 py-2 md:py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                        >
                            <div className="relative">
                                <Icon className="h-4 w-4 md:h-4 md:w-4" />

                                {/* Visual Indicators */}
                                {mode.value === 'connection' && (
                                    <span className={cn(
                                        "absolute -top-1 -right-1 h-2 w-2 rounded-full border border-background",
                                        isConnected ? "bg-green-500" : "bg-red-500"
                                    )} />
                                )}
                            </div>

                            <span className="text-[10px] md:text-sm font-medium hidden sm:inline-block">
                                {mode.label}
                            </span>
                        </TabsTrigger>
                    );
                })}
            </TabsList>
        </Tabs>
    );
};

export default ControlModeSwitcher;