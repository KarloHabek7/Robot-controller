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
    { value: 'connection', label: 'Connection', icon: Wifi },
    { value: 'joint', label: 'Joint', icon: Sliders },
    { value: 'tcp', label: 'TCP', icon: Move3d },
    { value: 'commands', label: 'Commands', icon: Terminal },
    { value: 'programs', label: 'Programs', icon: Play },
];

export const ControlModeSwitcher = ({ activeMode, onModeChange }: ControlModeSwitcherProps) => {
    const { isConnected } = useRobotStore();

    return (
        <Tabs value={activeMode} onValueChange={(v) => onModeChange(v as ControlMode)} className="w-auto">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
                {MODES.map((mode) => {
                    const Icon = mode.icon;
                    return (
                        <TabsTrigger
                            key={mode.value}
                            value={mode.value}
                            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 data-[state=active]:bg-secondary/20 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all hover:bg-secondary/10 rounded-md"
                        >
                            <div className="relative">
                                <Icon className="h-3.5 w-3.5" />

                                {/* Visual Indicators */}
                                {mode.value === 'connection' && (
                                    <span className={cn(
                                        "absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full border border-background",
                                        isConnected ? "bg-green-500" : "bg-red-500"
                                    )} />
                                )}
                            </div>

                            <span className="text-[11px] font-bold uppercase tracking-tight hidden sm:inline-block">
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