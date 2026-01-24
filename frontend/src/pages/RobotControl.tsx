import { useEffect } from "react";
import { toast } from 'sonner';
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
      syncActualState(state.joints, state.tcp_pose, state.tcp_offset, state.speed_slider);
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
          setConnectionStatus(true, host, port);
          toast.success("Connected to robot!");
        }
      } catch (error) {
        toast.error("Connection failed");
      }
    } else {
      try {
        await api.disconnectRobot();
        setConnectionStatus(false);
        toast.info("Disconnected from robot");
      } catch (error) {
        toast.error("Disconnection failed");
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-background overflow-hidden p-4 flex flex-col gap-4">

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">

        {/* Left Side: Robot Workspace Card */}
        <Card className="flex-1 flex flex-col overflow-hidden border-border/40 shadow-2xl bg-card relative">
          <CardHeader className="py-2.5 px-6 border-b bg-muted/20 flex flex-row items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-primary" />
              <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/80">
                Robot Workspace
              </CardTitle>
            </div>

            <div className="flex items-center gap-2 bg-secondary/10 rounded-lg pr-2 border border-border/20">
              <SpeedControl />
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 relative group">
            <Robot3DViewer />

            {/* Top-Right Status Badge Overlay */}
            <div className="absolute top-6 right-6 pointer-events-none">
              <div className="bg-background/60 backdrop-blur-md border border-border/50 rounded-full px-3 py-1 flex items-center gap-2 shadow-lg">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
                <span className="text-[10px] font-black uppercase tracking-wider text-foreground/70">
                  {isConnected ? 'Real-time Stream' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Bottom Overlay: TCP Info & E-Stop */}
            <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between gap-4 pointer-events-none">
              <div className="flex items-end gap-3 pointer-events-auto">
                <PositionDisplayCompact pose={actualTcpPose} />

                {/* TCP Preview Switcher - Vertical layout restored */}
                <div className="bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl p-2.5 shadow-2xl h-[80px] flex flex-col justify-between min-w-[190px]">
                  <div className="flex items-center justify-center gap-2 mt-0.5">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">
                      TCP Preview
                    </span>
                  </div>

                  <div className="flex gap-1 bg-secondary/15 p-1 rounded-xl border border-border/10">
                    {(['real', 'linked', 'both'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTCPVisualizationMode(mode)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
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

              <div className="pointer-events-auto">
                <EmergencyStop />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Control Panels Card */}
        <Card className="flex-1 flex flex-col overflow-hidden border-border/40 shadow-2xl bg-card">
          <CardHeader className="py-2.5 px-6 border-b bg-muted/20 flex flex-row items-center justify-between h-14">
            <div className="flex items-center gap-2 shrink-0">
              <Settings2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/80">
                Control Interface
              </CardTitle>
            </div>

            <div className="flex-1 flex justify-end">
              <div className="w-auto">
                <ControlModeSwitcher
                  activeMode={activeControlMode}
                  onModeChange={setActiveControlMode}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-0 control-panel-scroll">
            <div className="p-6">
              {activeControlMode === 'connection' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">
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
  );
};

export default RobotControl;
