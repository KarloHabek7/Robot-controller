import { create } from 'zustand';

interface Joint {
  id: number;
  name: string;
  angle: number;
  min: number;
  max: number;
}

interface RobotState {
  isConnected: boolean;
  host: string | null;
  port: number | null;
  joints: Joint[];
  tcpPose: number[];
  robotModel: string;
  targetJoints: number[];
  targetTcpPose: number[];
  setConnectionStatus: (connected: boolean, host?: string, port?: number) => void;
  updateJoint: (id: number, angle: number) => void;
  setRobotState: (joints: number[], tcpPose: number[], model?: string) => void;
  setTargetState: (joints: number[], tcpPose: number[]) => void;
  setJoints: (joints: Joint[]) => void;
}

export const useRobotStore = create<RobotState>((set) => ({
  isConnected: false,
  host: null,
  port: null,
  joints: [
    { id: 1, name: 'Base', angle: 0, min: -360, max: 360 },
    { id: 2, name: 'Shoulder', angle: -90, min: -360, max: 360 },
    { id: 3, name: 'Elbow', angle: 0, min: -360, max: 360 },
    { id: 4, name: 'Wrist 1', angle: -90, min: -360, max: 360 },
    { id: 5, name: 'Wrist 2', angle: 0, min: -360, max: 360 },
    { id: 6, name: 'Wrist 3', angle: 0, min: -360, max: 360 },
  ],
  tcpPose: [0, 0, 0, 0, 0, 0],
  robotModel: 'UR5',
  targetJoints: [0, -90, 0, -90, 0, 0],
  targetTcpPose: [0, 0, 0, 0, 0, 0],
  setConnectionStatus: (connected, host, port) =>
    set((state) => ({
      isConnected: connected,
      host: host ?? state.host,
      port: port ?? state.port
    })),
  updateJoint: (id, angle) =>
    set((state) => ({
      joints: state.joints.map((j) => (j.id === id ? { ...j, angle } : j)),
    })),
  setRobotState: (jointAngles, tcpPose, model) =>
    set((state) => ({
      joints: state.joints.map((j, index) => ({ ...j, angle: jointAngles[index] })),
      tcpPose,
      robotModel: model ?? state.robotModel
    })),
  setTargetState: (targetJoints, targetTcpPose) =>
    set({ targetJoints, targetTcpPose }),
  setJoints: (joints) => set({ joints }),
}));
