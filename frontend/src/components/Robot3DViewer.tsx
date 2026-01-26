import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useRobotStore } from '@/stores/robotStore';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { toast } from 'sonner';
import { Shield, ShieldAlert, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';

// Helper to map URSim coordinates [x, y, z] to Three.js space [y_ur, z_ur, x_ur]
const mapURToThree = (x: number, y: number, z: number): [number, number, number] => {
  return [y, z, x];
};

// Generic Coordinate Frame Component
const CoordinateFrame = ({
  pose,
  label,
  opacity = 1,
  positionOverride
}: {
  pose: number[],
  label: string,
  opacity?: number,
  positionOverride?: THREE.Vector3
}) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (groupRef.current) {
      if (positionOverride) {
        groupRef.current.position.copy(positionOverride);
      } else {
        // Position from pose
        const [tx, ty, tz] = mapURToThree(pose[0], pose[1], pose[2]);
        groupRef.current.position.set(tx, ty, tz);
      }
      // Rotation Vector [rx, ry, rz]
      const rx = pose[3];
      const ry = pose[4];
      const rz = pose[5];
      // Map rotation axis using the same logic
      const [ax, ay, az] = mapURToThree(rx, ry, rz);
      const axis = new THREE.Vector3(ax, ay, az);
      const angle = axis.length();
      if (angle > 0.00001) {
        axis.normalize();
        groupRef.current.quaternion.setFromAxisAngle(axis, angle);
      } else {
        groupRef.current.quaternion.set(0, 0, 0, 1);
      }
    }
  });
  return (
    <group ref={groupRef}>
      {/* X Axis - Red */}
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.2, 0xff0000, 0.05, 0.03]} />
      {/* Y Axis - Green */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.2, 0x00ff00, 0.05, 0.03]} />
      {/* Z Axis - Blue */}
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.2, 0x0000ff, 0.05, 0.03]} />
      <mesh>
        <sphereGeometry args={[0.005]} />
        <meshBasicMaterial color="white" transparent={opacity < 1} opacity={opacity} />
      </mesh>
    </group>
  );
};

const LinkedCoordinateFrame = ({
  endEffectorNode,
  pose,
  targetPose,
  isTarget = false,
  referencePose,
  referenceMatrix
}: {
  endEffectorNode: THREE.Object3D,
  pose: number[],
  targetPose?: number[],
  isTarget?: boolean,
  referencePose?: number[],
  referenceMatrix?: THREE.Matrix4
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && endEffectorNode) {
      if (isTarget && targetPose && referencePose && referenceMatrix) {
        // --- STABLE TARGET CALCULATION ---
        // Use the snapshot from the START of the movement/edit
        const offset = new THREE.Vector3(0, 0, -5);
        const worldPos = offset.clone().applyMatrix4(referenceMatrix);

        // Apply Delta: (Target UR Pose) - (Reference UR Pose)
        const dx_ur = targetPose[0] - referencePose[0];
        const dy_ur = targetPose[1] - referencePose[1];
        const dz_ur = targetPose[2] - referencePose[2];
        const [dx, dy, dz] = mapURToThree(dx_ur, dy_ur, dz_ur);

        worldPos.x += dx;
        worldPos.y += dy;
        worldPos.z += dz;

        groupRef.current.position.copy(worldPos);

        // Rotation from targetPose
        const [ax, ay, az] = mapURToThree(targetPose[3], targetPose[4], targetPose[5]);
        const axis = new THREE.Vector3(ax, ay, az);
        const angle = axis.length();
        if (angle > 0.00001) {
          axis.normalize();
          groupRef.current.quaternion.setFromAxisAngle(axis, angle);
        } else {
          groupRef.current.quaternion.set(0, 0, 0, 1);
        }
      } else {
        // --- ACTUAL LINKED TRACKING ---
        const offset = new THREE.Vector3(0, 0, -5);
        const worldPos = offset.clone().applyMatrix4(endEffectorNode.matrixWorld);
        groupRef.current.position.copy(worldPos);

        // Rotation from current Pose
        const [ax, ay, az] = mapURToThree(pose[3], pose[4], pose[5]);
        const axis = new THREE.Vector3(ax, ay, az);
        const angle = axis.length();
        if (angle > 0.00001) {
          axis.normalize();
          groupRef.current.quaternion.setFromAxisAngle(axis, angle);
        } else {
          groupRef.current.quaternion.set(0, 0, 0, 1);
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* X Axis - Red */}
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.2, 0xff0000, 0.05, 0.03]} />
      {/* Y Axis - Green */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.2, 0x00ff00, 0.05, 0.03]} />
      {/* Z Axis - Blue */}
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.2, 0x0000ff, 0.05, 0.03]} />
      <mesh>
        <sphereGeometry args={[0.005]} />
        <meshBasicMaterial color="white" transparent={isTarget} opacity={isTarget ? 0.5 : 1} />
      </mesh>
    </group>
  );
};

const TCPCoordinateSystem = ({ endEffectorNode }: { endEffectorNode: THREE.Object3D | null }) => {
  const { actualTcpPose, isConnected, tcpVisualizationMode, activeControlMode, isMoving } = useRobotStore();
  if (!isConnected) return null;
  return (
    <>
      {(tcpVisualizationMode === 'real' || tcpVisualizationMode === 'both') &&
        !(activeControlMode === 'joint' && isMoving) && (
          <CoordinateFrame
            pose={actualTcpPose}
            label="TCP Real"
            opacity={tcpVisualizationMode === 'both' ? 0.5 : 1}
          />
        )}
      {((tcpVisualizationMode === 'linked' || tcpVisualizationMode === 'both') || (activeControlMode === 'joint' && isMoving)) && endEffectorNode && (
        <LinkedCoordinateFrame
          endEffectorNode={endEffectorNode}
          pose={actualTcpPose}
        />
      )}
    </>
  );
};

const GlobalCoordinateSystem = () => {
  return <CoordinateFrame pose={[0, 0, 0, 0, 0, 0]} label="Base" />;
};

// High-Fidelity UR5 Model Component
interface HighFidelityUR5Props {
  jointAngles: number[];
  opacity?: number;
  isGhost?: boolean;
  ghostMode?: 'setting' | 'moving' | 'reached';
  onEndEffectorFound?: (node: THREE.Object3D) => void;
  groupRef?: React.MutableRefObject<THREE.Group | null>;
}

const HighFidelityUR5 = ({
  jointAngles,
  opacity = 1,
  isGhost = false,
  ghostMode = 'setting',
  onEndEffectorFound,
  groupRef
}: HighFidelityUR5Props) => {
  const { scene: gltfScene } = useGLTF('/models/UR5.glb');

  // Clone the scene and materials so real and ghost don't share state
  const scene = useMemo(() => {
    const clone = gltfScene.clone();
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        // Handle single or multi-material meshes
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const newMaterials = materials.map(mat => {
          const m = mat.clone() as THREE.MeshStandardMaterial;
          m.transparent = opacity < 1;
          m.opacity = opacity;
          if (!isGhost && opacity === 1) {
            m.depthWrite = true;
            m.depthTest = true;
            m.transparent = false;
          } else if (isGhost) {
            m.depthWrite = true;
            m.depthTest = true;
            // Determine ghost color based on mode
            let targetColor = new THREE.Color('#94a3b8'); // Default gray
            if (ghostMode === 'setting') {
              // Cyan/Blue for setting target
              targetColor = new THREE.Color(0.3, 0.7, 1.0);
            } else if (ghostMode === 'moving') {
              // Green for moving
              targetColor = new THREE.Color(0.3, 1.0, 0.5);
            }
            // Lerp towards the target color to keep some original shading
            m.color.lerp(targetColor, 0.6);
            m.emissive = targetColor;
            m.emissiveIntensity = 0.2;
          }
          return m;
        });
        mesh.material = Array.isArray(mesh.material) ? newMaterials : newMaterials[0];
      }
    });
    return clone;
  }, [gltfScene, opacity, isGhost, ghostMode]);

  // Find nodes and store their INITIAL orientations
  const { nodes, initialQuats } = useMemo(() => {
    const n: Record<string, THREE.Object3D> = {};
    const iq: Record<string, THREE.Quaternion> = {};
    scene.traverse((child) => {
      if (child.name && child.name.startsWith('Link')) {
        n[child.name] = child;
        iq[child.name] = child.quaternion.clone();
      } else if (child.name === 'Base') {
        n[child.name] = child;
      }
    });
    return { nodes: n, initialQuats: iq };
  }, [scene]);

  useEffect(() => {
    if (onEndEffectorFound && nodes['Link6']) {
      onEndEffectorFound(nodes['Link6']);
    }
  }, [nodes, onEndEffectorFound]);

  useFrame(() => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const q = jointAngles.map(toRad);

    const applyRotation = (name: string, angle: number, axisName: 'x' | 'y' | 'z') => {
      const node = nodes[name];
      const initial = initialQuats[name];
      if (node && initial) {
        const axis = new THREE.Vector3();
        axis[axisName] = 1;
        const delta = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        node.quaternion.copy(initial).multiply(delta);
      }
    };

    applyRotation('Link1', -q[0], 'x');
    applyRotation('Link2', -q[1], 'x');
    applyRotation('Link3', q[2], 'z');
    applyRotation('Link4', -q[3], 'x');
    applyRotation('Link5', -q[4], 'x');
    applyRotation('Link6', -q[5], 'z');
  });

  return (
    <group ref={groupRef} rotation={[0, Math.PI / 2, 0]}>
      <primitive object={scene} />
    </group>
  );
};

const RobotScene = () => {
  const {
    actualJoints,
    targetJoints,
    isConnected,
    isTargetDirty,
    isMoving,
    targetTcpPose,
    actualTcpPose,
    tcpVisualizationMode,
    activeControlMode
  } = useRobotStore();

  const currentJointAngles = useRef<number[]>(actualJoints);
  const [displayJoints, setDisplayJoints] = useState<number[]>(actualJoints);
  const [endEffectorNode, setEndEffectorNode] = useState<THREE.Object3D | null>(null);

  // Snapshot state to "freeze" the target preview origin
  const [referencePose, setReferencePose] = useState<number[] | null>(null);
  const [referenceMatrix, setReferenceMatrix] = useState<THREE.Matrix4 | null>(null);

  useEffect(() => {
    if (isTargetDirty) {
      if (!referencePose && endEffectorNode) {
        // Capture initial state when edit starts
        setReferencePose([...actualTcpPose]);
        setReferenceMatrix(endEffectorNode.matrixWorld.clone());
      }
    } else {
      // Clear snapshot when target is synchronized or reset
      setReferencePose(null);
      setReferenceMatrix(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTargetDirty, endEffectorNode]);

  // Animation state for ghost robot
  const ghostRef = useRef<THREE.Group>(null);
  const [reachAnimation, setReachAnimation] = useState(0);
  const prevMoving = useRef(isMoving);

  // Detect when robot reaches target
  useEffect(() => {
    if (prevMoving.current && !isMoving && !isTargetDirty) {
      setReachAnimation(1.0);
      toast.success('Target position reached!');
    }
    prevMoving.current = isMoving;
  }, [isMoving, isTargetDirty]);

  useFrame((state, delta) => {
    // 1. Smoothly interpolate actual robot position
    const target = actualJoints;
    let changed = false;
    const newAngles = currentJointAngles.current.map((angle, i) => {
      const step = (target[i] - angle) * Math.min(delta * 10, 1.0);
      if (Math.abs(step) > 0.001) {
        changed = true;
        return angle + step;
      }
      return target[i];
    });

    if (changed) {
      currentJointAngles.current = newAngles;
      setDisplayJoints([...newAngles]);
    }

    // 2. Handle Reach Animation (Pulse effect)
    if (reachAnimation > 0 && ghostRef.current) {
      const progress = 1.0 - reachAnimation;
      const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.05;
      ghostRef.current.scale.setScalar(scale);
      setReachAnimation(prev => Math.max(0, prev - delta * 2));
    } else if (ghostRef.current && reachAnimation === 0) {
      ghostRef.current.scale.setScalar(1);
    }
  });

  // Calculate ghost opacity
  const getGhostOpacity = () => {
    if (reachAnimation > 0) return 0.4 * (reachAnimation);
    return isMoving ? 0.5 : 0.4;
  };

  const showGhost = isTargetDirty || reachAnimation > 0;

  return (
    <group>
      <Suspense fallback={
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="gray" wireframe />
        </mesh>
      }>
        {/* ACTUAL Robot - Always visible, opaque */}
        <HighFidelityUR5
          jointAngles={displayJoints}
          isGhost={!isConnected}
          opacity={isConnected ? 1 : 0.8}
          onEndEffectorFound={setEndEffectorNode}
        />

        {/* TARGET/Shadow Robot - Only when dirty or animating */}
        {isConnected && showGhost && (
          <HighFidelityUR5
            groupRef={ghostRef}
            jointAngles={targetJoints}
            opacity={getGhostOpacity()}
            isGhost={true}
            ghostMode={isMoving ? 'moving' : 'setting'}
          />
        )}

        {/* Target TCP Frame - Only when dirty, and NOT if we are in joint mode while moving (it would be the old/start position) */}
        {isConnected && isTargetDirty && !(activeControlMode === 'joint' && isMoving) && (
          (tcpVisualizationMode === 'linked' || tcpVisualizationMode === 'both') && endEffectorNode ? (
            <LinkedCoordinateFrame
              endEffectorNode={endEffectorNode}
              pose={actualTcpPose}
              targetPose={targetTcpPose}
              isTarget={true}
              referencePose={referencePose || actualTcpPose}
              referenceMatrix={referenceMatrix || endEffectorNode.matrixWorld}
            />
          ) : (
            <CoordinateFrame
              pose={targetTcpPose}
              label="Target TCP"
              opacity={0.5}
            />
          )
        )}

        <TCPCoordinateSystem endEffectorNode={endEffectorNode} />
        <GlobalCoordinateSystem />
      </Suspense>
    </group>
  );
};


const Robot3DViewer = () => {
  const {
    isConnected,
    safetyMode,
    robotMode,
    clearSafetyStatus,
    isMoving
  } = useRobotStore();
  const { t } = useTranslation();

  const getSafetyStatusInfo = () => {
    switch (safetyMode) {
      case 1: return { label: t('safety.normal'), color: 'text-emerald-500', icon: Shield, bg: 'bg-emerald-500/10' };
      case 2: return { label: t('safety.reduced'), color: 'text-amber-500', icon: Shield, bg: 'bg-amber-500/10' };
      case 3: return { label: t('safety.protectiveStop'), color: 'text-red-500', icon: ShieldAlert, bg: 'bg-red-500/20' };
      case 4: return { label: t('safety.recovery'), color: 'text-purple-500', icon: RefreshCcw, bg: 'bg-purple-500/10' };
      case 5: return { label: t('safety.safeguardStop'), color: 'text-blue-500', icon: Shield, bg: 'bg-blue-500/10' };
      case 6: return { label: t('safety.systemStop'), color: 'text-red-600', icon: ShieldAlert, bg: 'bg-red-600/20' };
      case 7: return { label: t('safety.robotStop'), color: 'text-red-600', icon: ShieldAlert, bg: 'bg-red-600/20' };
      default: return isConnected ? { label: t('safety.unknown'), color: 'text-muted-foreground', icon: Shield, bg: 'bg-muted/10' } : null;
    }
  };

  const safetyInfo = getSafetyStatusInfo();

  return (
    // Changed: Removed min-h-[400px], added h-full w-full to fill parent
    <div className="w-full h-full relative group bg-gradient-to-b from-background to-secondary/5 overflow-hidden">
      <Canvas shadows dpr={[1, 2]} className="w-full h-full">
        <PerspectiveCamera makeDefault position={[2, 1.5, 2]} fov={45} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={12}
          makeDefault
        />
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
        <Environment preset="city" />
        <Grid
          infiniteGrid
          cellSize={0.5}
          cellThickness={0.5}
          sectionSize={2.5}
          sectionThickness={1}
          fadeDistance={30}
          fadeStrength={1}
          cellColor="#64748b"
          sectionColor="#3b82f6"
        />
        <RobotScene />
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.4}
          scale={10}
          blur={2.5}
          far={4}
        />
      </Canvas>

      {/* Top Left Status & Reset Actions */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        {isConnected && safetyInfo && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md shadow-lg transition-all border-border/40",
            safetyInfo.bg
          )}>
            <safetyInfo.icon className={cn("w-3.5 h-3.5", safetyInfo.color)} />
            <span className={cn("text-[10px] font-black uppercase tracking-wider", safetyInfo.color)}>
              {safetyInfo.label}
            </span>
          </div>
        )}

        {(safetyMode === 3 || isMoving) && isConnected && (
          <Button
            onClick={() => {
              clearSafetyStatus();
              toast.info('Movement state cleared');
            }}
            variant="outline"
            size="sm"
            className="h-8 bg-background/60 backdrop-blur-md border-border/40 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-primary/20 hover:text-primary hover:border-primary/50"
          >
            <RefreshCcw className="w-3 h-3" />
            {t('safety.resetUI')}
          </Button>
        )}
      </div>

      {/* Protective Stop Overlay Warning */}
      {isConnected && safetyMode === 3 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center animate-pulse pointer-events-none">
          <div className="border-4 border-red-500/50 rounded-[40px] absolute inset-8" />
          <div className="bg-red-500/90 text-white px-8 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 backdrop-blur-xl border border-white/20">
            <AlertTriangle className="w-12 h-12" />
            <h2 className="text-xl font-black uppercase tracking-[0.2em]">{t('safety.protectiveStop')}</h2>
            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">{t('safety.acknowledgeOnController')}</p>
          </div>
        </div>
      )}

      {/* Decorative corners */}
      <div className="absolute top-4 left-4 border-l-2 border-t-2 border-primary/30 w-8 h-8 pointer-events-none" />
      <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-primary/30 w-8 h-8 pointer-events-none" />

      {/* Center Disconnected Message */}
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-destructive/50 shadow-lg text-destructive font-mono text-sm">
            ROBOT OFFLINE
          </div>
        </div>
      )}
    </div>
  );
};

// Add cn import if missing (it's in ControlPanel but check here)
import { cn } from '@/lib/utils';

export default Robot3DViewer;