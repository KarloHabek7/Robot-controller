import { create } from 'zustand';

interface Joint {
  id: number;
  name: string;
  angle: number;
  min: number;
  max: number;
}

interface RobotState {
  connected: boolean;
  host: string | null;
  port: number | null;
  joints: Joint[];
  setConnectionStatus: (connected: boolean, host?: string, port?: number) => void;
  updateJoint: (id: number, angle: number) => void;
  setJoints: (joints: Joint[]) => void;
}

export const useRobotStore = create<RobotState>((set) => ({
  connected: false,
  host: null,
  port: null,
  joints: [
    { id: 1, name: 'Base', angle: 0, min: -360, max: 360 },
    { id: 2, name: 'Shoulder', angle: 0, min: -360, max: 360 },
    { id: 3, name: 'Elbow', angle: 0, min: -360, max: 360 },
    { id: 4, name: 'Wrist 1', angle: 0, min: -360, max: 360 },
    { id: 5, name: 'Wrist 2', angle: 0, min: -360, max: 360 },
    { id: 6, name: 'Wrist 3', angle: 0, min: -360, max: 360 },
  ],
  setConnectionStatus: (connected, host, port) =>
    set({ connected, host: host || null, port: port || null }),
  updateJoint: (id, angle) =>
    set((state) => ({
      joints: state.joints.map((j) => (j.id === id ? { ...j, angle } : j)),
    })),
  setJoints: (joints) => set({ joints }),
}));
