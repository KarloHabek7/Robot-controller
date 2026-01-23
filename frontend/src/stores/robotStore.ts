import { create } from 'zustand';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compare two joint arrays with tolerance
 * @param a First joint array
 * @param b Second joint array
 * @param tolerance Tolerance in degrees (default: 0.1)
 * @returns true if all joints are within tolerance
 */
export function areJointsEqual(a: number[], b: number[], tolerance: number = 0.1): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => Math.abs(val - b[idx]) <= tolerance);
}

/**
 * Compare two TCP poses with tolerance
 * Position tolerance: 0.5mm, Rotation tolerance: 0.1°
 * @param a First pose [x, y, z, rx, ry, rz]
 * @param b Second pose [x, y, z, rx, ry, rz]
 * @returns true if position and rotation are within tolerance
 */
export function arePosesEqual(a: number[], b: number[]): boolean {
  if (a.length !== 6 || b.length !== 6) return false;

  const positionTolerance = 0.5; // mm
  const rotationTolerance = 0.1; // degrees

  // Check position (x, y, z)
  for (let i = 0; i < 3; i++) {
    if (Math.abs(a[i] - b[i]) > positionTolerance) return false;
  }

  // Check rotation (rx, ry, rz)
  for (let i = 3; i < 6; i++) {
    if (Math.abs(a[i] - b[i]) > rotationTolerance) return false;
  }

  return true;
}

// ============================================================================
// TYPES
// ============================================================================

export type ControlMode = 'joint' | 'tcp' | 'connection' | 'commands' | 'programs';

interface JointMetadata {
  id: number;
  name: string;
  min: number;
  max: number;
  defaultIncrement: number;
}

interface RobotState {
  // === ACTUAL ROBOT STATE (from WebSocket) ===
  actualJoints: number[];      // [6] array of actual joint angles in degrees
  actualTcpPose: number[];     // [6] array: [x, y, z, rx, ry, rz] in mm and degrees

  // === TARGET STATE (user-controlled) ===
  targetJoints: number[];      // [6] array of target joint angles
  targetTcpPose: number[];     // [6] array: target TCP pose

  // === UI STATE ===
  activeControlMode: ControlMode; // Current active tab
  isTargetDirty: boolean;      // true if target differs from actual
  isMoving: boolean;           // true when robot is executing movement
  movementProgress: number;    // 0-100, movement completion percentage

  // === JOINT METADATA (for UI) ===
  jointMetadata: JointMetadata[];

  // === CONNECTION STATE ===
  isConnected: boolean;
  host: string | null;
  port: number | null;
  robotModel: string;
  tcpVisualizationMode: 'real' | 'linked' | 'both';

  // === ACTIONS ===
  setActiveControlMode: (mode: ControlMode) => void;

  // Target manipulation
  updateTargetJoint: (id: number, angle: number) => void;
  updateTargetTcp: (pose: number[]) => void;

  // Commit actions (send to backend)
  commitTargetJoints: () => void;
  commitTargetTcp: () => void;

  // Reset and sync
  resetTargetToActual: () => void;
  syncActualState: (joints: number[], tcpPose: number[]) => void;

  // Movement state
  setMovementState: (isMoving: boolean, progress?: number) => void;

  // Joint metadata
  updateJointIncrement: (id: number, increment: number) => void;

  // Connection
  setConnectionStatus: (connected: boolean, host?: string, port?: number) => void;

  // TCP visualization
  setTCPVisualizationMode: (mode: 'real' | 'linked' | 'both') => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useRobotStore = create<RobotState>((set, get) => ({
  // === INITIAL STATE ===
  // Actual state (UR5 home position)
  actualJoints: [0, -90, 0, -90, 0, 0],
  actualTcpPose: [0, 0, 0, 0, 0, 0],

  // Target state (initially same as actual)
  targetJoints: [0, -90, 0, -90, 0, 0],
  targetTcpPose: [0, 0, 0, 0, 0, 0],

  // UI state
  activeControlMode: 'joint',
  isTargetDirty: false,
  isMoving: false,
  movementProgress: 0,

  // Joint metadata
  jointMetadata: [
    { id: 1, name: 'Base', min: -360, max: 360, defaultIncrement: 5 },
    { id: 2, name: 'Shoulder', min: -360, max: 360, defaultIncrement: 5 },
    { id: 3, name: 'Elbow', min: -360, max: 360, defaultIncrement: 5 },
    { id: 4, name: 'Wrist 1', min: -360, max: 360, defaultIncrement: 5 },
    { id: 5, name: 'Wrist 2', min: -360, max: 360, defaultIncrement: 10 },
    { id: 6, name: 'Wrist 3', min: -360, max: 360, defaultIncrement: 10 },
  ],

  // Connection state
  isConnected: false,
  host: null,
  port: null,
  robotModel: 'UR5',
  tcpVisualizationMode: 'linked',

  // === ACTIONS ===

  setActiveControlMode: (mode: ControlMode) => {
    set({ activeControlMode: mode });
  },

  /**
   * Update a single target joint angle
   * Automatically sets isTargetDirty if the new target differs from actual
   */
  updateTargetJoint: (id: number, angle: number) => {
    set((state) => {
      const newTargetJoints = [...state.targetJoints];
      newTargetJoints[id - 1] = angle; // id is 1-indexed

      const isDirty = !areJointsEqual(newTargetJoints, state.actualJoints);

      return {
        targetJoints: newTargetJoints,
        isTargetDirty: isDirty,
      };
    });
  },

  /**
   * Update the target TCP pose
   * Automatically sets isTargetDirty if the new target differs from actual
   */
  updateTargetTcp: (pose: number[]) => {
    set((state) => {
      const isDirty = !arePosesEqual(pose, state.actualTcpPose);

      return {
        targetTcpPose: pose,
        isTargetDirty: isDirty,
      };
    });
  },

  /**
   * Commit target joints to backend
   * This will be implemented in Task 7 to call api.moveToTargetJoints()
   */
  commitTargetJoints: () => {
    const state = get();
    console.log('Committing target joints:', state.targetJoints);
    // TODO: Task 7 - Call api.moveToTargetJoints(state.targetJoints)
    // For now, just log the action
  },

  /**
   * Commit target TCP pose to backend
   * This will be implemented in Task 7 to call api.moveToTargetTcp()
   */
  commitTargetTcp: () => {
    const state = get();
    console.log('Committing target TCP:', state.targetTcpPose);
    // TODO: Task 7 - Call api.moveToTargetTcp(state.targetTcpPose)
    // For now, just log the action
  },

  /**
   * Reset target state to match actual state
   * Clears isTargetDirty flag
   */
  resetTargetToActual: () => {
    set((state) => ({
      targetJoints: [...state.actualJoints],
      targetTcpPose: [...state.actualTcpPose],
      isTargetDirty: false,
    }));
  },

  /**
   * Update actual state from WebSocket
   * Does not affect target state
   * Updates isTargetDirty based on comparison with current target
   */
  syncActualState: (joints: number[], tcpPose: number[]) => {
    set((state) => {
      const isDirty = !areJointsEqual(state.targetJoints, joints);

      return {
        actualJoints: joints,
        actualTcpPose: tcpPose,
        isTargetDirty: isDirty,
      };
    });
  },

  /**
   * Update movement state
   * Used to track when robot is moving and progress
   */
  setMovementState: (isMoving: boolean, progress?: number) => {
    set({
      isMoving,
      movementProgress: progress ?? (isMoving ? 0 : 100),
    });
  },

  /**
   * Update the default increment for a specific joint
   */
  updateJointIncrement: (id: number, increment: number) => {
    set((state) => ({
      jointMetadata: state.jointMetadata.map((joint) =>
        joint.id === id ? { ...joint, defaultIncrement: increment } : joint
      ),
    }));
  },

  /**
   * Update connection status
   */
  setConnectionStatus: (connected: boolean, host?: string, port?: number) => {
    set((state) => ({
      isConnected: connected,
      host: host ?? state.host,
      port: port ?? state.port,
    }));
  },

  /**
   * Set TCP visualization mode
   */
  setTCPVisualizationMode: (tcpVisualizationMode: 'real' | 'linked' | 'both') => {
    set({ tcpVisualizationMode });
  },
}));