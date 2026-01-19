import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useRobotStore } from '@/stores/robotStore';
import { useMemo, useRef } from 'react';

// Industrial robot arm visualization with detailed geometry
const RobotArm = () => {
  const { joints } = useRobotStore();

  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Optimized Materials
  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#cbd5e1'), // Silver/Grey
      metalness: 0.8,
      roughness: 0.2,
    }),
    joints: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#334155'), // Dark Slate
      metalness: 0.9,
      roughness: 0.1,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3b82f6'), // UR Blue
      emissive: new THREE.Color('#3b82f6'),
      emissiveIntensity: 0.2,
      metalness: 0.5,
      roughness: 0.2,
    }),
    base: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      metalness: 0.7,
      roughness: 0.3,
    })
  }), []);

  return (
    <group position={[0, 0, 0]}>
      {/* Base Platform */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow material={materials.base}>
        <cylinderGeometry args={[0.35, 0.4, 0.1, 40]} />
      </mesh>

      {/* Joint 1 - Base rotation */}
      <group rotation={[0, toRad(joints[0]?.angle || 0), 0]} position={[0, 0.1, 0]}>
        {/* Base Cylinder */}
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow material={materials.joints}>
          <cylinderGeometry args={[0.2, 0.2, 0.2, 32]} />
        </mesh>

        {/* Joint 2 - Shoulder */}
        <group rotation={[Math.PI / 2, 0, toRad(joints[1]?.angle || 0)]} position={[0, 0.2, 0]}>
          <mesh castShadow receiveShadow material={materials.accent}>
            <cylinderGeometry args={[0.18, 0.18, 0.25, 32]} />
          </mesh>

          {/* Upper arm link */}
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <mesh position={[0, 0.3, 0]} castShadow receiveShadow material={materials.body}>
              <boxGeometry args={[0.2, 0.6, 0.15]} />
            </mesh>

            {/* Joint 3 - Elbow */}
            <group rotation={[Math.PI / 2, 0, toRad(joints[2]?.angle || 0)]} position={[0, 0.6, 0]}>
              <mesh castShadow receiveShadow material={materials.accent}>
                <cylinderGeometry args={[0.15, 0.15, 0.22, 32]} />
              </mesh>

              {/* Forearm link */}
              <group rotation={[-Math.PI / 2, 0, 0]}>
                <mesh position={[0, 0.25, 0]} castShadow receiveShadow material={materials.body}>
                  <boxGeometry args={[0.14, 0.5, 0.12]} />
                </mesh>

                {/* Joint 4 - Wrist 1 */}
                <group rotation={[Math.PI / 2, 0, toRad(joints[3]?.angle || 0)]} position={[0, 0.5, 0]}>
                  <mesh castShadow receiveShadow material={materials.joints}>
                    <cylinderGeometry args={[0.1, 0.1, 0.15, 32]} />
                  </mesh>

                  {/* Wrist 2 link */}
                  <group rotation={[-Math.PI / 2, 0, 0]}>
                    {/* Joint 5 - Wrist 2 */}
                    <group rotation={[0, 0, toRad(joints[4]?.angle || 0)]} position={[0, 0.1, 0]}>
                      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow material={materials.joints}>
                        <cylinderGeometry args={[0.08, 0.08, 0.15, 32]} />
                      </mesh>

                      {/* Joint 6 - Wrist 3 */}
                      <group rotation={[0, toRad(joints[5]?.angle || 0) + Math.PI / 2, 0]} position={[0, 0.1, 0]}>
                        <mesh castShadow receiveShadow material={materials.accent}>
                          <cylinderGeometry args={[0.07, 0.07, 0.05, 32]} />
                        </mesh>

                        {/* Tool flange/tip */}
                        <mesh position={[0, 0.05, 0]} material={materials.base}>
                          <cylinderGeometry args={[0.04, 0.05, 0.05, 16]} />
                        </mesh>
                      </group>
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

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <RobotArm />
        </Float>

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
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Live 3D View</span>
      </div>
    </div>
  );
};

export default Robot3DViewer;
