import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sliders, Move3d, Wifi, Terminal, Play } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { ControlMode, useRobotStore } from '@/stores/robotStore';
import { cn } from '@/lib/utils';

interface ControlModeSwitcherProps {
    activeMode: ControlMode;
    onModeChange: (mode: ControlMode) => void;
}

const MODES: { value: ControlMode; labelKey: string; icon: React.ElementType }[] = [
    { value: 'connection', labelKey: 'navigation.connectionSettings', icon: Wifi },
    { value: 'joint', labelKey: 'navigation.jointControl', icon: Sliders },
    { value: 'tcp', labelKey: 'navigation.tcpControl', icon: Move3d },
    { value: 'commands', labelKey: 'navigation.commands', icon: Terminal },
    { value: 'programs', labelKey: 'navigation.programs', icon: Play },
];

export const ControlModeSwitcher = ({ activeMode, onModeChange }: ControlModeSwitcherProps) => {
    const { t } = useTranslation();
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
                            className="flex items-center justify-center gap-2 px-3 py-2 data-[state=active]:bg-secondary/20 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all hover:bg-secondary/10 rounded-md h-12"
                        >
                            <div className="relative shrink-0">
                                <Icon className="h-4 w-4" />

                                {/* Visual Indicators */}
                                {mode.value === 'connection' && (
                                    <span className={cn(
                                        "absolute -top-1 -right-1 h-2 w-2 rounded-full border border-background",
                                        isConnected ? "bg-green-500" : "bg-red-500"
                                    )} />
                                )}
                            </div>

                            <span className="text-[10px] font-bold uppercase tracking-tight hidden sm:inline-block leading-[1.1] text-left whitespace-pre-line">
                                {t(mode.labelKey)}
                            </span>
                        </TabsTrigger>
                    );
                })}
            </TabsList>
        </Tabs>
    );
};

export default ControlModeSwitcher;
