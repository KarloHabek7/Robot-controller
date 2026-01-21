import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useRobotStore } from '@/stores/robotStore';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
// Coordinate Axes Helper Component
const Axes = ({ size = 0.5, label }: { size?: number, label?: string }) => {
  return (
    <group>
      <primitive object={new THREE.AxesHelper(size)} />
      {label && (
        <mesh position={[size, 0, 0]}>
          <boxGeometry args={[0.01, 0.01, 0.01]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
};

// High-Fidelity UR5 Model Component
const HighFidelityUR5 = ({
  jointAngles,
  opacity = 1,
  isGhost = false
}: {
  jointAngles: number[],
  opacity?: number,
  isGhost?: boolean
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
    applyRotation('Link3', -q[2], 'z');
    applyRotation('Link4', -q[3], 'x');
    applyRotation('Link5', -q[4], 'x');
    applyRotation('Link6', -q[5], 'z');
  });

  return (
    <group>
      {!isGhost && <Axes size={1} label="World" />}
      <primitive object={scene} />
    </group>
  );
};



const RobotScene = () => {
  const { joints, targetJoints, isConnected } = useRobotStore();
  const currentJointAngles = useRef<number[]>(joints.map(j => j.angle));
  const [displayJoints, setDisplayJoints] = useState<number[]>(joints.map(j => j.angle));

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
        <HighFidelityUR5 jointAngles={displayJoints} isGhost={!isConnected} opacity={isConnected ? 1 : 0.8} />
        {isConnected && <HighFidelityUR5 jointAngles={targetJoints} opacity={0.3} isGhost={true} />}
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
