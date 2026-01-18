import { create } from 'zustand';

interface RobotState {
  connected: boolean;
  host: string | null;
  port: number | null;
  setConnectionStatus: (connected: boolean, host?: string, port?: number) => void;
}

export const useRobotStore = create<RobotState>((set) => ({
  connected: false,
  host: null,
  port: null,
  setConnectionStatus: (connected, host, port) =>
    set({ connected, host: host || null, port: port || null }),
}));
