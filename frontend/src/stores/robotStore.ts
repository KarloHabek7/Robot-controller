import { create } from 'zustand';
import * as THREE from 'three';

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
 * Checks if two robot poses [x, y, z, rx, ry, rz] are equivalent.
 * Handles axis-angle normalization issues using Quaternions.
 * Position tolerance: 1mm, Rotation tolerance: 0.2°
 */
export function arePosesEqual(a: number[], b: number[]): boolean {
  if (a.length !== 6 || b.length !== 6) return false;

  const positionTolerance = 0.002;  // 2mm in meters
  const rotationTolerance = 0.007; // ~0.4° in radians

  // 1. Check position (x, y, z)
  for (let i = 0; i < 3; i++) {
    if (Math.abs(a[i] - b[i]) > positionTolerance) return false;
  }

  // 2. Check rotation (rx, ry, rz)
  // Convert rotation vectors to quaternions to handle equivalent representations
  const qA = rotationVectorToQuaternion(a[3], a[4], a[5]);
  const qB = rotationVectorToQuaternion(b[3], b[4], b[5]);

  // Dot product gives the cosine of half the angle between rotations
  const dot = Math.abs(qA.dot(qB));
  const angleDiff = 2 * Math.acos(Math.min(dot, 1.0)); // Total angular difference in radians

  return angleDiff < rotationTolerance;
}

function rotationVectorToQuaternion(rx: number, ry: number, rz: number): THREE.Quaternion {
  const axis = new THREE.Vector3(rx, ry, rz);
  const angle = axis.length();
  if (angle < 0.000001) return new THREE.Quaternion(0, 0, 0, 1);

  // Normalize axis and set rotation
  return new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), angle);
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
  actualTcpOffset: number[];   // [6] array: tool offset [x, y, z, rx, ry, rz]

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
  coordinateMode: 'base' | 'tool';
  robotSpeed: number; // 0-100%
  speedControlSupported: boolean; // True if robot supports RTDE speed control
  isEStopActive: boolean;
  directControlEnabled: boolean;

  // === ACTIONS ===
  setActiveControlMode: (mode: ControlMode) => void;

  // Target manipulation
  updateTargetJoint: (id: number, angle: number) => void;
  updateTargetTcp: (pose: number[]) => void;

  // Commit actions (send to backend)
  setMovementState: (isMoving: boolean, progress?: number) => void;

  // Joint metadata
  updateJointIncrement: (id: number, increment: number) => void;

  // Connection
  setConnectionStatus: (connected: boolean, host?: string, port?: number, speedControlSupported?: boolean) => void;

  // TCP visualization
  setTCPVisualizationMode: (mode: 'real' | 'linked' | 'both') => void;

  // Coordinate Mode
  setCoordinateMode: (mode: 'base' | 'tool') => void;

  // Speed control
  setRobotSpeed: (speed: number) => void;
  setSpeedControlSupported: (supported: boolean) => void;

  // E-Stop
  setEStopActive: (active: boolean) => void;

  // Direct Control
  setDirectControlEnabled: (enabled: boolean) => void;

  // Sync state
  syncActualState: (joints: number[], tcpPose: number[], tcpOffset?: number[], speed?: number) => void;

  resetTargetToActual: () => void;
  commitTargetJoints: () => void;
  commitTargetTcp: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useRobotStore = create<RobotState>((set, get) => ({
  // === INITIAL STATE ===
  // Actual state (UR5 home position)
  actualJoints: [0, -90, 0, -90, 0, 0],
  actualTcpPose: [0, 0, 0, 0, 0, 0],
  actualTcpOffset: [0, 0, 0, 0, 0, 0],

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
  coordinateMode: 'base',
  robotSpeed: 50,
  speedControlSupported: true, // Assume true until we check
  isEStopActive: false,
  directControlEnabled: false,

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
  commitTargetJoints: async () => {
    const state = get();
    if (!state.isTargetDirty || state.isEStopActive) return;

    set({ isMoving: true, movementProgress: 0 });

    try {
      await import('@/services/api').then(m => m.api.moveToTargetJoints(state.targetJoints));
      // User will see "Target reached" when WebSocket updates actual position to match target
    } catch (error) {
      console.error("Failed to commit joints", error);
      set({ isMoving: false }); // Reset on error
      // Ideally show toast here or let component handle it
    }
  },

  /**
   * Commit target TCP pose to backend
   * This will be implemented in Task 7 to call api.moveToTargetTcp()
   */
  commitTargetTcp: async () => {
    const state = get();
    if (!state.isTargetDirty || state.isEStopActive) return;

    set({ isMoving: true, movementProgress: 0 });

    try {
      await import('@/services/api').then(m => m.api.moveToTargetTcp(state.targetTcpPose));
    } catch (error) {
      console.error("Failed to commit TCP", error);
      set({ isMoving: false });
    }
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
  syncActualState: (joints: number[], tcpPose: number[], tcpOffset: number[] = [0, 0, 0, 0, 0, 0], speed?: number) => {
    set((state) => {
      // Convert speed from 0.0-1.0 (robot) to 0-100 (UI)
      const robotSpeedValue = speed !== undefined ? Math.round(speed * 100) : state.robotSpeed;

      // 1. Ghost Sync on Connect/Idle: If strictly clean and not moving, follow the robot.
      if (!state.isTargetDirty && !state.isMoving) {
        return {
          actualJoints: joints,
          actualTcpPose: tcpPose,
          actualTcpOffset: tcpOffset,
          targetJoints: joints,
          targetTcpPose: tcpPose,
          robotSpeed: robotSpeedValue,
          isTargetDirty: false,
          isMoving: false
        };
      }

      // 2. Check for Move Completion
      const jointsMatch = areJointsEqual(state.targetJoints, joints);
      const tcpMatch = arePosesEqual(state.targetTcpPose, tcpPose);

      if (state.isMoving) {
        let moveComplete = false;
        let syncJoints = false;
        let syncTcp = false;

        if (state.activeControlMode === 'joint' && jointsMatch) {
          moveComplete = true;
          syncTcp = true;
        } else if (state.activeControlMode === 'tcp' && tcpMatch) {
          moveComplete = true;
          syncJoints = true;
        } else if (jointsMatch && tcpMatch) {
          moveComplete = true;
        }

        if (moveComplete) {
          return {
            actualJoints: joints,
            actualTcpPose: tcpPose,
            actualTcpOffset: tcpOffset,
            targetJoints: syncJoints ? joints : state.targetJoints,
            targetTcpPose: syncTcp ? tcpPose : state.targetTcpPose,
            robotSpeed: robotSpeedValue,
            isTargetDirty: false,
            isMoving: false,
            movementProgress: 100
          };
        }
      }

      // 3. Normal Update
      const isDirty = !jointsMatch || !tcpMatch;

      return {
        actualJoints: joints,
        actualTcpPose: tcpPose,
        actualTcpOffset: tcpOffset,
        robotSpeed: robotSpeedValue,
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
  setConnectionStatus: (isConnected: boolean, host: string = null, port: number = null, speedControlSupported: boolean = false) => {
    set({
      isConnected,
      host,
      port,
      speedControlSupported: isConnected ? speedControlSupported : false
    });
  },

  /**
   * Set TCP visualization mode
   */
  setTCPVisualizationMode: (tcpVisualizationMode: 'real' | 'linked' | 'both') => {
    set({ tcpVisualizationMode });
  },

  /**
   * Set Coordinate mode
   */
  setCoordinateMode: (coordinateMode: 'base' | 'tool') => {
    set({ coordinateMode });
  },

  /**
   * Set robot speed
   */
  setRobotSpeed: (robotSpeed: number) => {
    set({ robotSpeed });
  },

  /**
   * Set speed control supported flag
   */
  setSpeedControlSupported: (speedControlSupported: boolean) => {
    set({ speedControlSupported });
  },

  /**
   * Set E-Stop active state
   */
  setEStopActive: (isEStopActive: boolean) => {
    set({ isEStopActive });
  },

  /**
   * Set Direct Control enabled state
   */
  setDirectControlEnabled: (directControlEnabled: boolean) => {
    set({ directControlEnabled });
  },
}));