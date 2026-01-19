import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useRobotStore } from '@/stores/robotStore';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { ROBOT_SPECS } from '@/constants/robotSpecs';

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

    // Mapping based on your specific Blender observations:
    // J1: X, J2: X, J3: Z (Y in Blender), J4: X (Blender X), J5: X, J6: Z (Y in Blender)
    applyRotation('Link1', q[0], 'x');
    applyRotation('Link2', q[1], 'x');
    applyRotation('Link3', q[2], 'z');
    applyRotation('Link4', q[3], 'x');
    applyRotation('Link5', q[4], 'x');
    applyRotation('Link6', q[5], 'z');
  });

  return (
    <group>
      {!isGhost && <Axes size={1} label="World" />}
      <primitive object={scene} />
    </group>
  );
};

// Interpolated robot arm (Primitive Fallback)
const RobotArm = ({
  jointAngles,
  model = 'UR5',
  opacity = 1,
  isGhost = false
}: {
  jointAngles: number[],
  model?: string,
  opacity?: number,
  isGhost?: boolean
}) => {
  const specs = ROBOT_SPECS[model] || ROBOT_SPECS['UR5'];
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({
      color: new THREE.Color(isGhost ? '#94a3b8' : '#cbd5e1'),
      metalness: isGhost ? 0.4 : 0.8,
      roughness: 0.2,
      transparent: opacity < 1,
      opacity: opacity,
    }),
    joints: new THREE.MeshStandardMaterial({
      color: new THREE.Color(isGhost ? '#475569' : '#334155'),
      metalness: isGhost ? 0.5 : 0.9,
      roughness: 0.1,
      transparent: opacity < 1,
      opacity: opacity,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: new THREE.Color(isGhost ? '#60a5fa' : '#3b82f6'),
      emissive: new THREE.Color(isGhost ? '#000000' : '#3b82f6'),
      emissiveIntensity: isGhost ? 0 : 0.2,
      metalness: 0.5,
      roughness: 0.2,
      transparent: opacity < 1,
      opacity: opacity,
    }),
    base: new THREE.MeshStandardMaterial({
      color: new THREE.Color(isGhost ? '#334155' : '#1e293b'),
      metalness: 0.7,
      roughness: 0.3,
      transparent: opacity < 1,
      opacity: opacity,
    })
  }), [isGhost, opacity]);

  const { d, a } = specs;
  const q = jointAngles.map(toRad);

  const URJointVisual = ({ radius = 0.08, height = 0.2, axis = 'z' }: { radius?: number, height?: number, axis?: 'x' | 'y' | 'z' }) => {
    const rotation: [number, number, number] = axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0];
    return (
      <group rotation={rotation}>
        <mesh material={materials.joints} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, height, 32]} />
        </mesh>
        <mesh position={[0, height / 2, 0]} material={materials.accent} castShadow receiveShadow>
          <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0, -height / 2, 0]} rotation={[Math.PI, 0, 0]} material={materials.joints} castShadow receiveShadow>
          <circleGeometry args={[radius, 32]} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {!isGhost && <Axes size={1} label="World" />}
      <mesh position={[0, 0.025, 0]} material={materials.base} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.05, 40]} />
      </mesh>
      <group position={[0, 0.05, 0]} rotation={[0, q[0], 0]}>
        <mesh material={materials.joints} castShadow receiveShadow position={[0, d[0] / 2, 0]}>
          <cylinderGeometry args={[0.09, 0.09, d[0], 32]} />
        </mesh>
        <group position={[0, d[0], 0]} rotation={[0, 0, q[1]]}>
          <URJointVisual radius={0.085} height={0.18} axis="z" />
          <group position={[Math.abs(a[1]), 0, 0.12]}>
            <mesh position={[-Math.abs(a[1]) / 2, 0, -0.12]} rotation={[0, 0, Math.PI / 2]} material={materials.body} castShadow receiveShadow>
              <cylinderGeometry args={[0.07, 0.06, Math.abs(a[1]), 32]} />
            </mesh>
            <group rotation={[0, 0, q[2]]}>
              <URJointVisual radius={0.075} height={0.16} axis="z" />
              <group position={[Math.abs(a[2]), 0, -0.12]}>
                <mesh position={[-Math.abs(a[2]) / 2, 0, 0.12]} rotation={[0, 0, Math.PI / 2]} material={materials.body} castShadow receiveShadow>
                  <cylinderGeometry args={[0.06, 0.05, Math.abs(a[2]), 32]} />
                </mesh>
                <group rotation={[0, 0, q[3]]}>
                  <URJointVisual radius={0.055} height={0.14} axis="z" />
                  <group position={[0, d[4], 0]} rotation={[0, q[4], 0]}>
                    <URJointVisual radius={0.055} height={0.14} axis="y" />
                    <group position={[0, 0, d[5]]} rotation={[0, 0, q[5]]}>
                      <group rotation={[Math.PI / 2, 0, 0]}>
                        <mesh material={materials.accent} castShadow receiveShadow>
                          <cylinderGeometry args={[0.05, 0.05, 0.02, 32]} />
                        </mesh>
                      </group>
                      {!isGhost && <Axes size={0.3} label="TCP" />}
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

const RobotScene = () => {
  const { joints, targetJoints, robotModel } = useRobotStore();
  const currentJointAngles = useRef<number[]>(joints.map(j => j.angle));
  const [displayJoints, setDisplayJoints] = useState<number[]>(joints.map(j => j.angle));
  const [useHighFidelity, setUseHighFidelity] = useState(false);

  useEffect(() => {
    fetch('/models/UR5.glb', { method: 'HEAD' })
      .then(res => {
        if (res.ok) setUseHighFidelity(true);
      })
      .catch(() => setUseHighFidelity(false));
  }, []);

  useFrame((state, delta) => {
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
      <Suspense fallback={<RobotArm jointAngles={displayJoints} model={robotModel} />}>
        {useHighFidelity ? (
          <>
            <HighFidelityUR5 jointAngles={displayJoints} />
            <HighFidelityUR5 jointAngles={targetJoints} opacity={0.3} isGhost={true} />
          </>
        ) : (
          <>
            <RobotArm jointAngles={displayJoints} model={robotModel} />
            <RobotArm jointAngles={targetJoints} model={robotModel} opacity={0.3} isGhost={true} />
          </>
        )}
      </Suspense>
    </group>
  );
};

const Robot3DViewer = () => {
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

      <div className="absolute top-4 left-4 border-l-2 border-t-2 border-primary/30 w-8 h-8 pointer-events-none" />
      <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-primary/30 w-8 h-8 pointer-events-none" />

      <div className="absolute top-4 right-4 bg-background/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50 shadow-xl pointer-events-none flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Live 3D View</span>
      </div>
    </div>
  );
};

export default Robot3DViewer;
