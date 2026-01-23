import { toast } from 'sonner';
import ConnectionStatus from '@/components/ConnectionStatus';
import PositionDisplay from '@/components/PositionDisplay';
import Robot3DViewer from '@/components/Robot3DViewer';
import JointControlTable from '@/components/JointControlTable';
import RobotConfiguration from '@/components/RobotConfiguration';
import CommandPanel from '@/components/CommandPanel';
import { useRobotStore } from '@/stores/robotStore';

const Index = () => {
  const { actualTcpPose, isConnected, setConnectionStatus, host, port } = useRobotStore();

  const handleConfigChange = (newHost: string, newPort: number) => {
    setConnectionStatus(isConnected, newHost, newPort);
  };

  const handleToggleConnection = () => {
    const newStatus = !isConnected;
    setConnectionStatus(newStatus);

    if (newStatus) {
      toast.success("Connected to robot (demo mode)!");
    } else {
      toast.info("Disconnected from robot");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background relative overflow-hidden">
      {/* Diagonal gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />

      <div className="container mx-auto p-6 relative z-10 max-w-[1800px]">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
              Robot Control Interface
            </h1>
            <p className="text-muted-foreground text-sm">
              Professional robot control and monitoring system
            </p>
          </div>
          <ConnectionStatus
            isConnected={isConnected}
            onToggleConnection={handleToggleConnection}
          />
        </div>

        {/* Top Section - 3D Viewer and Joint Controls */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* 3D Visualization */}
          <div>
            <Robot3DViewer />
          </div>

          {/* Joint Control Table */}
          <div>
            <JointControlTable />
          </div>
        </div>

        {/* Bottom Section - Configuration, Position, and Commands */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Position Display */}
          <div>
            <PositionDisplay pose={actualTcpPose} />
          </div>

          {/* Robot Configuration */}
          <div>
            <RobotConfiguration
              host={host || "192.168.15.130"}
              port={port || 30002}
              onChange={handleConfigChange}
            />
          </div>

          {/* Command Panel */}
          <div>
            <CommandPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
