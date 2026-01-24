import { useEffect } from "react";
import { toast } from 'sonner';
import ConnectionStatus from '@/components/ConnectionStatus';
import PositionDisplayCompact from '@/components/PositionDisplayCompact';
import Robot3DViewer from '@/components/Robot3DViewer';
import JointControlTable from '@/components/JointControlTable';
import RobotConfiguration from '@/components/RobotConfiguration';
import CommandPanel from '@/components/CommandPanel';
import { ControlModeSwitcher } from '@/components/ControlModeSwitcher';
import ControlPanel from '@/components/ControlPanel';
import ProgramControl from '@/components/ProgramControl';
import { useRobotStore } from '@/stores/robotStore';
import { api } from "@/services/api";

const RobotControl = () => {
  const {
    actualTcpPose,
    isConnected,
    setConnectionStatus,
    host,
    port,
    activeControlMode,
    setActiveControlMode,
    syncActualState
  } = useRobotStore();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await api.getRobotStatus();
        setConnectionStatus(status.connected, status.host, status.port);
      } catch (error) {
        console.error("Error checking status:", error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    // Subscribe to real-time state
    api.subscribeToRobotState((state) => {
      syncActualState(state.joints, state.tcp_pose);
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
    <div className="h-screen w-screen bg-background overflow-hidden flex flex-col">
      {/* Header - Fixed Height */}
      <div className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
            UR
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">UR5 Controller</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Professional Interface</p>
          </div>
        </div>
        <ConnectionStatus
          isConnected={isConnected}
          onToggleConnection={handleToggleConnection}
        />
      </div>

      {/* Main Content - Split Pane Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* Left Pane: 3D Viewer */}
        <div className="w-full lg:w-[40%] h-[50vh] lg:h-full flex-shrink-0 bg-secondary/10 relative border-b lg:border-b-0 lg:border-r border-border">
          <div className="robot-viewer-container w-full h-full">
            <Robot3DViewer />
          </div>
        </div>

        {/* Right Pane: Controls */}
        <div className="w-full lg:w-[60%] flex flex-col h-full bg-card/30">

          {/* 1. Mode Switcher */}
          <div className="p-2 border-b bg-card/50 backdrop-blur-sm z-10">
            <ControlModeSwitcher
              activeMode={activeControlMode}
              onModeChange={setActiveControlMode}
            />
          </div>

          {/* 2. Active Control Panel */}
          <div className="flex-1 overflow-y-auto control-panel-scroll p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              {activeControlMode === 'joint' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <JointControlTable />
                </div>
              )}
              {activeControlMode === 'tcp' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <ControlPanel />
                </div>
              )}
              {activeControlMode === 'connection' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h3 className="font-medium mb-2">Connection Status</h3>
                    <ConnectionStatus
                      isConnected={isConnected}
                      onToggleConnection={handleToggleConnection}
                    />
                  </div>
                  <RobotConfiguration
                    host={host || "192.168.15.130"}
                    port={port || 30002}
                    onChange={handleConfigChange}
                  />
                </div>
              )}
              {activeControlMode === 'commands' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <CommandPanel />
                </div>
              )}
              {activeControlMode === 'programs' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <ProgramControl />
                </div>
              )}
            </div>
          </div>

          {/* 3. Compact Position Display */}
          <div className="p-2 border-t bg-card z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <PositionDisplayCompact pose={actualTcpPose} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotControl;
