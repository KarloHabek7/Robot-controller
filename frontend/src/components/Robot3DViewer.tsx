import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment } from '@react-three/drei';
import { useRobotStore } from '@/stores/robotStore';
import * as THREE from 'three';

// Industrial robot arm visualization with detailed geometry
const RobotArm = () => {
  const { currentConfig } = useRobotStore();

  if (!currentConfig) return null;

  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const joints = currentConfig.joints;

  // Material definitions
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1e293b'),
    metalness: 0.9,
    roughness: 0.2,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#a855f7'),
    metalness: 0.8,
    roughness: 0.3,
    emissive: new THREE.Color('#a855f7'),
    emissiveIntensity: 0.1,
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
        {/* Base joint housing */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.28, 0.3, 32]} />
          <primitive object={jointMaterial} attach="material" />
        </mesh>
        
        {/* Joint accent ring */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.03, 32]} />
          <primitive object={accentMaterial} attach="material" />
        </mesh>

        {/* Joint 2 - Shoulder */}
        <group rotation={[0, 0, toRad(joints[1]?.angle || 0)]} position={[0, 0.35, 0]}>
          {/* Shoulder joint mount */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.25, 32]} />
            <primitive object={jointMaterial} attach="material" />
          </mesh>

          {/* Upper arm link */}
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.9, 0.18]} />
            <primitive object={baseMaterial} attach="material" />
          </mesh>
          
          {/* Upper arm accent strips */}
          <mesh position={[0.095, 0.5, 0]} castShadow>
            <boxGeometry args={[0.01, 0.92, 0.19]} />
            <primitive object={accentMaterial} attach="material" />
          </mesh>
          <mesh position={[-0.095, 0.5, 0]} castShadow>
            <boxGeometry args={[0.01, 0.92, 0.19]} />
            <primitive object={accentMaterial} attach="material" />
          </mesh>

          {/* Joint 3 - Elbow */}
          <group rotation={[0, 0, toRad(joints[2]?.angle || 0)]} position={[0, 0.95, 0]}>
            {/* Elbow joint housing */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.22, 32]} />
              <primitive object={jointMaterial} attach="material" />
            </mesh>

            {/* Forearm link */}
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.14, 0.65, 0.14]} />
              <primitive object={baseMaterial} attach="material" />
            </mesh>
            
            {/* Forearm accent */}
            <mesh position={[0, 0.35, 0.075]} castShadow>
              <boxGeometry args={[0.15, 0.67, 0.01]} />
              <primitive object={accentMaterial} attach="material" />
            </mesh>

            {/* Joint 4 - Wrist 1 */}
            <group rotation={[0, toRad(joints[3]?.angle || 0), 0]} position={[0, 0.68, 0]}>
              {/* Wrist joint 1 */}
              <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.1, 0.12, 0.16, 24]} />
                <primitive object={jointMaterial} attach="material" />
              </mesh>

              {/* Joint 5 - Wrist 2 */}
              <group rotation={[0, 0, toRad(joints[4]?.angle || 0)]} position={[0, 0.16, 0]}>
                {/* Wrist joint 2 housing */}
                <mesh position={[0, 0, 0]} castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.09, 0.09, 0.14, 24]} />
                  <primitive object={jointMaterial} attach="material" />
                </mesh>
                
                {/* Wrist extension */}
                <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.07, 0.08, 0.12, 24]} />
                  <primitive object={baseMaterial} attach="material" />
                </mesh>

                {/* Joint 6 - Wrist 3 / End Effector */}
                <group rotation={[0, toRad(joints[5]?.angle || 0), 0]} position={[0, 0.18, 0]}>
                  {/* Tool flange */}
                  <mesh position={[0, 0, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.1, 0.08, 0.04, 24]} />
                    <primitive object={accentMaterial} attach="material" />
                  </mesh>
                  
                  {/* End effector sphere */}
                  <mesh position={[0, 0.06, 0]} castShadow>
                    <sphereGeometry args={[0.09, 24, 24]} />
                    <meshStandardMaterial 
                      color="#06b6d4" 
                      metalness={0.9} 
                      roughness={0.1}
                      emissive="#06b6d4"
                      emissiveIntensity={0.4}
                    />
                  </mesh>
                  
                  {/* Tool center point indicator */}
                  <mesh position={[0, 0.15, 0]}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial 
                      color="#22d3ee" 
                      emissive="#22d3ee"
                      emissiveIntensity={1}
                    />
                  </mesh>
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
    <div className="card-premium rounded-xl overflow-hidden h-[600px]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
        <OrbitControls 
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={10}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#a855f7" />
        <pointLight position={[5, 2, 5]} intensity={0.5} color="#06b6d4" />

        {/* Environment */}
        <Environment preset="city" />
        
        {/* Grid */}
        <Grid
          infiniteGrid
          cellSize={0.5}
          cellThickness={0.5}
          sectionSize={2}
          sectionThickness={1}
          fadeDistance={20}
          fadeStrength={1}
          cellColor="#4a5568"
          sectionColor="#a855f7"
        />

        {/* Robot */}
        <RobotArm />

        {/* Ground plane for shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <shadowMaterial opacity={0.3} />
        </mesh>
      </Canvas>
    </div>
  );
};

export default Robot3DViewer;
