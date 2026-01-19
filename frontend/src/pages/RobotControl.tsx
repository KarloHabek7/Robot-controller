import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import ConnectionStatus from "@/components/ConnectionStatus";
import ControlPanel from "@/components/ControlPanel";
import PositionDisplay from "@/components/PositionDisplay";
import Robot3DViewer from "@/components/Robot3DViewer";
import JointControlTable from "@/components/JointControlTable";
import CommandPanel from "@/components/CommandPanel";
import RobotConfiguration from "@/components/RobotConfiguration";
import ProgramControl from "@/components/ProgramControl";
import { Header } from "@/components/Header";
import { api } from "@/services/api";

export default function RobotControl() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [robotConfig, setRobotConfig] = useState({ host: "192.168.15.130", port: 30002 });
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const status = await api.getRobotStatus();
      setIsConnected(status.connected);
      if (status.host) {
        setRobotConfig({ host: status.host, port: status.port });
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  };

  const handleToggleConnection = async () => {
    if (isConnected) {
      try {
        await api.disconnectRobot();
        setIsConnected(false);
        toast.success(t('robot.disconnected'));
      } catch (error) {
        toast.error(t('errors.commandFailed'));
      }
    } else {
      try {
        setLoading(true);
        const result = await api.connectRobot(robotConfig.host, robotConfig.port);
        if (result.success) {
          setIsConnected(true);
          toast.success(t('robot.connected'));
        }
      } catch (error) {
        toast.error(t('errors.connectionFailed'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMove = async (direction: string, value?: number) => {
    if (!isConnected) {
      toast.error(t('errors.notConnected'));
      return;
    }

    if (direction === 'stop') {
      try {
        await api.emergencyStop();
        toast.success(t('robot.emergencyStop'));
      } catch (error) {
        toast.error(t('errors.commandFailed'));
      }
      return;
    }

    const axisMap: { [key: string]: 'x' | 'y' | 'z' } = {
      'up': 'y',
      'down': 'y',
      'left': 'x',
      'right': 'x',
      'z-up': 'z',
      'z-down': 'z',
    };

    const directionMap: { [key: string]: '+' | '-' } = {
      'up': '+',
      'down': '-',
      'left': '-',
      'right': '+',
      'z-up': '+',
      'z-down': '-',
    };

    const axis = axisMap[direction];
    const dir = directionMap[direction];

    if (axis && dir && value !== undefined) {
      try {
        await api.tcpTranslate(axis, value, dir);
        toast.success(`${t('controls.translate')} ${axis.toUpperCase()} ${dir}${value}`);
      } catch (error) {
        toast.error(t('errors.commandFailed'));
      }
    }
  };

  if (loading && !isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background industrial-grid selection:bg-primary/20">
      <Header />
      <main className="container mx-auto p-4 md:p-8 space-y-8">
        {/* Top Section - 3D Viewer and Joint Controls */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
          <div className="xl:col-span-7 h-[500px] md:h-[650px] rounded-[2rem] overflow-hidden border bg-card shadow-2xl relative group">
            <Robot3DViewer />
            {/* Overlay Gradient for depth */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/20 to-transparent" />
          </div>
          <div className="xl:col-span-5 flex flex-col">
            <JointControlTable />
          </div>
        </div>

        {/* Bottom Section - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="xl:col-span-3 space-y-8 flex flex-col">
            <RobotConfiguration
              host={robotConfig.host}
              port={robotConfig.port}
              onChange={(host, port) => setRobotConfig({ host, port })}
            />
            <div className="mt-auto">
              <ConnectionStatus
                connected={isConnected}
                onToggleConnection={handleToggleConnection}
              />
            </div>
          </div>

          {/* Middle Column */}
          <div className="xl:col-span-5 space-y-8">
            <PositionDisplay position={position} />
            <ControlPanel
              onMove={handleMove}
              onGoToPosition={(x, y, z) => console.log('Go to:', x, y, z)}
            />
          </div>

          {/* Right Column */}
          <div className="xl:col-span-4 space-y-8">
            <ProgramControl />
            <CommandPanel />
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="border-t bg-card/50 backdrop-blur p-4 text-center mt-12">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground/40">
          UR5 Robot Control System • Advanced Agentic Interface
        </p>
      </footer>
    </div>
  );
}
