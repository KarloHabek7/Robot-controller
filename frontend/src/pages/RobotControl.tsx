import { useEffect } from "react";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";
import Robot3DViewer from '@/components/Robot3DViewer';
import JointControlTable from '@/components/JointControlTable';
import RobotConfiguration from '@/components/RobotConfiguration';
import CommandPanel from '@/components/CommandPanel';
import ControlPanel from '@/components/ControlPanel';
import ProgramControl from '@/components/ProgramControl';
import PositionDisplayCompact from '@/components/PositionDisplayCompact';
import ConnectionStatus from '@/components/ConnectionStatus';
import { useRobotStore } from '@/stores/robotStore';
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, Settings2, Target } from "lucide-react";
import { ControlModeSwitcher } from "@/components/ControlModeSwitcher";
import EmergencyStop from "@/components/EmergencyStop";
import SpeedControl from "@/components/SpeedControl";
import { Navbar } from "@/components/Navbar";
import { cn } from "@/lib/utils";

const RobotControl = () => {
  const {
    actualTcpPose,
    isConnected,
    setConnectionStatus,
    host,
    port,
    activeControlMode,
    setActiveControlMode,
    syncActualState,
    tcpVisualizationMode,
    setTCPVisualizationMode
  } = useRobotStore();
  const { t } = useTranslation();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await api.getRobotStatus();
        setConnectionStatus(status.connected, status.host, status.port, status.speed_control_supported);
      } catch (error) {
        console.error('Failed to get robot status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    // Subscribe to real-time state
    api.subscribeToRobotState((state) => {
      syncActualState(
        state.joints,
        state.tcp_pose,
        state.tcp_offset,
        state.speed_slider,
        state.safety_mode,
        state.robot_mode,
        state.program_state,
        state.loaded_program
      );
    });

    return () => {
      clearInterval(interval);
      api.unsubscribeFromRobotState();
    };
  }, [setConnectionStatus, syncActualState]);

  const handleConfigChange = (newHost: string, newPort: number) => {
    setConnectionStatus(isConnected, newHost, newPort);
  };

  const handleToggleConnection = async () => {
    const newStatus = !isConnected;

    if (newStatus) {
      try {
        const result = await api.connectRobot(host || "192.168.15.130", port || 30002);
        if (result.success) {
          setConnectionStatus(true, host, port, result.speed_control_supported);
          toast.success(t('auth.loginSuccess'));
        }

      } catch (error: any) {
        toast.error(error.message || t('errors.connectionFailed'));
      }
    } else {
      try {
        await api.disconnectRobot();
        setConnectionStatus(false);
        toast.info(t('robot.disconnected'));
      } catch (error: any) {
        toast.error(error.message || t('errors.commandFailed'));
      }
    }
  };

  return (
    <div className="flex flex-col h-[100svh] overflow-hidden bg-background">
      <Navbar />
      <div className="flex-1 overflow-hidden p-2 sm:p-4 flex flex-col gap-2 sm:gap-4">

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-4 overflow-hidden">

          {/* Left Side: Robot Workspace Card */}
          <Card className="flex-[1.2] lg:flex-1 flex flex-col overflow-hidden border-border/40 shadow-2xl bg-card relative min-h-[350px] lg:min-h-0">
            <CardHeader className="py-2 px-4 sm:px-6 border-b bg-muted/20 flex flex-row items-center justify-between h-12 sm:h-14 shrink-0">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-primary" />
                <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-foreground/80">
                  {t('robot.workspace')}
                </CardTitle>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 bg-secondary/10 rounded-lg pr-1 sm:pr-2 border border-border/20 scale-90 sm:scale-100 origin-right">
                <SpeedControl />
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 relative group min-h-0">
              <Robot3DViewer />

              {/* Top-Right Status Badge Overlay */}
              <div className="absolute top-3 right-3 sm:top-6 sm:right-6 pointer-events-none">
                <div className="bg-background/60 backdrop-blur-md border border-border/50 rounded-full px-2 py-0.5 sm:px-3 sm:py-1 flex items-center gap-1.5 sm:gap-2 shadow-lg">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-foreground/70 whitespace-nowrap">
                    {isConnected ? t('robot.realTimeStream') : t('robot.offline')}
                  </span>
                </div>
              </div>

              {/* Bottom Overlay: TCP Info & Switcher */}
              <div className="absolute bottom-3 left-2 sm:left-8 pointer-events-none z-20">
                <div className="flex items-end gap-3 sm:gap-4 scale-[0.75] sm:scale-100 origin-bottom-left pointer-events-auto">
                  {/* Coordinates on the left */}
                  <PositionDisplayCompact pose={actualTcpPose} />

                  {/* Switcher on the right of coordinates */}
                  <div className="bg-background/80 backdrop-blur-md border border-border/50 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 shadow-2xl h-[65px] sm:h-[80px] flex flex-col justify-between min-w-[130px] sm:min-w-[190px]">
                    <div className="flex items-center justify-center gap-1 sm:gap-2 mt-0 sm:mt-0.5">
                      <Target className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-primary" />
                      <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] text-primary truncate">
                        {t('robot.tcpPreview')}
                      </span>
                    </div>

                    <div className="flex gap-0.5 sm:gap-1 bg-secondary/15 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-border/10">
                      {(['real', 'linked', 'both'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setTCPVisualizationMode(mode)}
                          className={cn(
                            "flex-1 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[7px] sm:text-[9px] font-black uppercase tracking-wider transition-all",
                            tcpVisualizationMode === mode
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Right: Emergency Stop - Separated to ensure visibility */}
              <div className="absolute bottom-3 right-3 sm:bottom-8 sm:right-8 pointer-events-auto scale-[0.65] sm:scale-100 origin-bottom-right z-30">
                <EmergencyStop />
              </div>
            </CardContent>
          </Card>

          {/* Right Side: Control Panels Card */}
          <Card className="flex-1 flex flex-col overflow-hidden border-border/40 shadow-2xl bg-card">
            <CardHeader className="py-2 px-4 sm:px-6 border-b bg-muted/20 flex flex-row items-center justify-between h-12 sm:h-14 shrink-0">
              <div className="flex items-center gap-2 shrink-0">
                <Settings2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-foreground/80">
                  {t('navigation.controlInterface')}
                </CardTitle>
              </div>

              <div className="flex-1 flex justify-end">
                <div className="w-auto scale-90 sm:scale-100 origin-right">
                  <ControlModeSwitcher
                    activeMode={activeControlMode}
                    onModeChange={setActiveControlMode}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-0 control-panel-scroll min-h-0">
              <div className="p-3 sm:p-6">
                {activeControlMode === 'connection' && (
                  <div className="space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">
                    <ConnectionStatus
                      isConnected={isConnected}
                      onToggleConnection={handleToggleConnection}
                    />
                    <RobotConfiguration
                      host={host || "192.168.15.130"}
                      port={port || 30002}
                      onChange={handleConfigChange}
                    />
                  </div>
                )}
                {activeControlMode === 'joint' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <JointControlTable />
                  </div>
                )}
                {activeControlMode === 'tcp' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <ControlPanel />
                  </div>
                )}
                {activeControlMode === 'commands' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <CommandPanel />
                  </div>
                )}
                {activeControlMode === 'programs' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <ProgramControl />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default RobotControl;
