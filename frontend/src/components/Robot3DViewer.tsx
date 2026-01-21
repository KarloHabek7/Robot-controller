import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useRobotStore } from '@/stores/robotStore';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
// Helper to map URSim coordinates [x, y, z] to Three.js space [y_ur, z_ur, x_ur]
// Mapping: X_ur -> Z_three, Y_ur -> X_three, Z_ur -> Y_three (UP)
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
  pose
}: {
  endEffectorNode: THREE.Object3D,
  pose: number[]
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && endEffectorNode) {
      // Calculate world position with offset
      // Note: Model is in centimeters, but URSim coordinates are in meters
      // This offset is in the model's local space (cm)
      const offset = new THREE.Vector3(0, 0, -5); // Offset to end effector (5cm)
      const worldPos = offset.applyMatrix4(endEffectorNode.matrixWorld);

      groupRef.current.position.copy(worldPos);

      // Rotation from Pose (same as standard CoordinateFrame)
      const rx = pose[3];
      const ry = pose[4];
      const rz = pose[5];
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
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.2, 0xff0000, 0.05, 0.03]} />
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.2, 0x00ff00, 0.05, 0.03]} />
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.2, 0x0000ff, 0.05, 0.03]} />
      <mesh>
        <sphereGeometry args={[0.005]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
};

const TCPCoordinateSystem = ({ endEffectorNode }: { endEffectorNode: THREE.Object3D | null }) => {
  const { tcpPose, isConnected, tcpVisualizationMode } = useRobotStore();

  if (!isConnected) return null;

  return (
    <>
      {(tcpVisualizationMode === 'real' || tcpVisualizationMode === 'both') && (
        <CoordinateFrame
          pose={tcpPose}
          label="TCP Real"
          opacity={tcpVisualizationMode === 'both' ? 0.5 : 1}
        />
      )}
      {(tcpVisualizationMode === 'linked' || tcpVisualizationMode === 'both') && endEffectorNode && (
        <LinkedCoordinateFrame
          endEffectorNode={endEffectorNode}
          pose={tcpPose}
        />
      )}
    </>
  );
};

const GlobalCoordinateSystem = () => {
  return <CoordinateFrame pose={[0, 0, 0, 0, 0, 0]} label="Base" />;
};

// High-Fidelity UR5 Model Component
const HighFidelityUR5 = ({
  jointAngles,
  opacity = 1,
  isGhost = false,
  onEndEffectorFound
}: {
  jointAngles: number[],
  opacity?: number,
  isGhost?: boolean,
  onEndEffectorFound?: (node: THREE.Object3D) => void
}) => {
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
            // Ghost color: desaturated blueish gray, lerp towards it to keep some original color
            m.color.lerp(new THREE.Color('#94a3b8'), 0.8);
          }
          return m;
        });

        mesh.material = Array.isArray(mesh.material) ? newMaterials : newMaterials[0];
      }
    });
    return clone;
  }, [gltfScene, opacity, isGhost]);

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

    // We apply rotations AS DELTAS to the initial quaternions
    // to preserve whatever '0' rotation was in the GLB.

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

    // Negating the angles to match URSim's positive rotation direction relative to this model's local axes
    applyRotation('Link1', -q[0], 'x');
    applyRotation('Link2', -q[1], 'x');
    applyRotation('Link3', q[2], 'z');
    applyRotation('Link4', -q[3], 'x');
    applyRotation('Link5', -q[4], 'x');
    applyRotation('Link6', -q[5], 'z');
  });

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <primitive object={scene} />
    </group>
  );
};



const RobotScene = () => {
  const { joints, targetJoints, isConnected } = useRobotStore();
  const currentJointAngles = useRef<number[]>(joints.map(j => j.angle));
  const [displayJoints, setDisplayJoints] = useState<number[]>(joints.map(j => j.angle));
  const [endEffectorNode, setEndEffectorNode] = useState<THREE.Object3D | null>(null);

  useFrame((state, delta) => {
    // Smoothly interpolate current position towards target from store
    const target = joints.map(j => j.angle);
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
  });

  return (
    <group>
      <Suspense fallback={
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="gray" wireframe />
        </mesh>
      }>
        <HighFidelityUR5
          jointAngles={displayJoints}
          isGhost={!isConnected}
          opacity={isConnected ? 1 : 0.8}
          onEndEffectorFound={setEndEffectorNode}
        />
        {isConnected && <HighFidelityUR5 jointAngles={targetJoints} opacity={0.3} isGhost={true} />}
        <TCPCoordinateSystem endEffectorNode={endEffectorNode} />
        <GlobalCoordinateSystem />
      </Suspense>
    </group>
  );
};

const Robot3DViewer = () => {
  const { isConnected } = useRobotStore();

  return (
    <div className="w-full h-full min-h-[400px] relative group bg-gradient-to-b from-background to-secondary/5">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[4, 3, 4]} fov={45} />
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

      {/* Decorative corners */}
      <div className="absolute top-4 left-4 border-l-2 border-t-2 border-primary/30 w-8 h-8 pointer-events-none" />
      <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-primary/30 w-8 h-8 pointer-events-none" />

      {/* Viewer Label */}
      <div className="absolute top-4 right-4 bg-background/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50 shadow-xl pointer-events-none flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">
          {isConnected ? 'Live 3D View' : 'Disconnected'}
        </span>
      </div>

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

export default Robot3DViewer;
