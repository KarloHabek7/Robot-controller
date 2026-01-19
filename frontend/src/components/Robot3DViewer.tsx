import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Industrial robot arm visualization with detailed geometry
const RobotArm = () => {
  // Default joints for UR5
  const joints = [
    { id: 1, angle: 0 },
    { id: 2, angle: 0 },
    { id: 3, angle: 0 },
    { id: 4, angle: 0 },
    { id: 5, angle: 0 },
    { id: 6, angle: 0 },
  ];

  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Material definitions
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1e293b'),
    metalness: 0.9,
    roughness: 0.2,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#3b82f6'),
    metalness: 0.8,
    roughness: 0.3,
  });

  const jointMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#334155'),
    metalness: 0.95,
    roughness: 0.15,
  });

  return (
    <group>
      {/* Base Platform */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.5, 0.1, 32]} />
        <primitive object={baseMaterial} attach="material" />
      </mesh>

      {/* Base mounting flange */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.04, 32]} />
        <primitive object={accentMaterial} attach="material" />
      </mesh>

      {/* Joint 1 - Base rotation */}
      <group rotation={[0, toRad(joints[0]?.angle || 0), 0]} position={[0, 0.14, 0]}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.28, 0.3, 32]} />
          <primitive object={jointMaterial} attach="material" />
        </mesh>

        {/* Joint 2 - Shoulder */}
        <group rotation={[0, 0, toRad(joints[1]?.angle || 0)]} position={[0, 0.35, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.25, 32]} />
            <primitive object={jointMaterial} attach="material" />
          </mesh>

          {/* Upper arm link */}
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.9, 0.18]} />
            <primitive object={baseMaterial} attach="material" />
          </mesh>

          {/* Joint 3 - Elbow */}
          <group rotation={[0, 0, toRad(joints[2]?.angle || 0)]} position={[0, 0.95, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.22, 32]} />
              <primitive object={jointMaterial} attach="material" />
            </mesh>

            {/* Forearm link */}
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.14, 0.65, 0.14]} />
              <primitive object={baseMaterial} attach="material" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

const Robot3DViewer = () => {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={50} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={15}
        />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#3b82f6" />

        <Environment preset="city" />

        <Grid
          infiniteGrid
          cellSize={0.5}
          cellThickness={0.5}
          sectionSize={2.5}
          sectionThickness={1}
          fadeDistance={30}
          fadeStrength={1}
          cellColor="#94a3b8"
          sectionColor="#3b82f6"
        />

        <RobotArm />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <shadowMaterial opacity={0.2} />
        </mesh>
      </Canvas>
    </div>
  );
};

export default Robot3DViewer;
