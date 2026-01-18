import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConnectionStatus from "@/components/ConnectionStatus";
import ControlPanel from "@/components/ControlPanel";
import PositionDisplay from "@/components/PositionDisplay";
import Robot3DViewer from "@/components/Robot3DViewer";
import JointControlTable from "@/components/JointControlTable";
import CommandPanel from "@/components/CommandPanel";
import RobotConfiguration from "@/components/RobotConfiguration";
import ProgramControl from "@/components/ProgramControl";
import { useRobotStore } from "@/stores/robotStore";
import { urRobotService } from "@/services/urRobotService";

export default function RobotControl() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [robotName, setRobotName] = useState("");
  const { position, isConnected, setConnectionStatus, robotIP, robotPort } = useRobotStore();

  useEffect(() => {
    if (id) {
      fetchRobotDetails(id);
    }
  }, [id]);

  const fetchRobotDetails = async (robotId: string) => {
    try {
      const { data, error } = await supabase
        .from("robots")
        .select("*")
        .eq("id", robotId)
        .single();

      if (error) throw error;
      
      if (data) {
        setRobotName(data.name);
        // Update robot store position with database values
        useRobotStore.getState().setPosition({
          x: Number(data.x_coordinate),
          y: Number(data.y_coordinate),
          z: Number(data.z_coordinate),
        });
      }
    } catch (error) {
      console.error("Error fetching robot:", error);
      toast.error("Failed to load robot details");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnection = async () => {
    if (isConnected) {
      setConnectionStatus(false);
      toast.success('Disconnected from robot');
    } else {
      try {
        await urRobotService.connect(robotIP, robotPort);
        setConnectionStatus(true);
        toast.success('Connected to robot');
      } catch (error) {
        toast.error('Failed to connect to robot');
      }
    }
  };

  const handleMove = async (direction: string, value?: number) => {
    if (direction === 'stop') {
      try {
        await urRobotService.emergencyStop();
        toast.success('Emergency stop activated');
      } catch (error) {
        toast.error('Failed to stop robot');
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

    if (axis && dir && value) {
      try {
        await urRobotService.translateTCP({ axis, value, direction: dir });
        toast.success(`Moved ${direction}`);
      } catch (error) {
        toast.error('Failed to move robot');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {robotName} - Control Interface
          </h1>
        </div>

        {/* Top Section - 3D Viewer and Joint Controls with equal heights */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* 3D Visualization */}
          <div className="h-[600px]">
            <Robot3DViewer />
          </div>

          {/* Joint Control Table */}
          <div className="h-[600px]">
            <JointControlTable />
          </div>
        </div>

        {/* Bottom Section - Flexible Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Robot Configuration + Connection Status */}
          <div className="xl:col-span-3 space-y-4">
            <RobotConfiguration />
            <ConnectionStatus
              connected={isConnected}
              onToggleConnection={handleToggleConnection}
            />
          </div>

          {/* Middle Section: Position Display + TCP Controls */}
          <div className="xl:col-span-5 space-y-4">
            <PositionDisplay position={position} />
            <ControlPanel
              onMove={handleMove}
              onGoToPosition={(x, y, z) => console.log('Go to:', x, y, z)}
            />
          </div>

          {/* Right Column: Program Control + Command Interface */}
          <div className="xl:col-span-4 space-y-4">
            <ProgramControl />
            <CommandPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
