import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo } from 'react';

// Helper component for a single rotation ring
const RotationGizmo = ({
    axisVector,
    color,
    radius = 0.25, // Significantly smaller
    opacity = 1
}: {
    axisVector: THREE.Vector3,
    color: number,
    radius?: number,
    opacity?: number
}) => {
    // Aligns the local Z axis with the target axisVector
    const quaternion = useMemo(() => {
        const dummy = new THREE.Object3D();
        dummy.lookAt(axisVector);
        return dummy.quaternion;
    }, [axisVector]);

    // Position it at the center of the straight arrow (1.6 * 0.5 = 0.8)
    const position = useMemo(() => axisVector.clone().multiplyScalar(0.8), [axisVector]);

    const arcLength = Math.PI * 1.5; // 270 degrees
    const tubeThickness = 0.03;

    return (
        <group quaternion={quaternion} position={position}>
            {/* The Ring (Torus Segment) */}
            <mesh>
                <torusGeometry args={[radius, tubeThickness, 16, 32, arcLength]} />
                <meshBasicMaterial color={color} transparent opacity={opacity} />
            </mesh>

            {/* The Arrow Head (Cone) */}
            {/* Positioned at the end of the arc and rotated to match tangent */}
            <mesh
                position={[
                    radius * Math.cos(arcLength),
                    radius * Math.sin(arcLength),
                    0
                ]}
                rotation={[0, 0, arcLength - Math.PI / 2]}
            >
                <coneGeometry args={[0.08, 0.18, 16]} />
                <meshBasicMaterial color={color} transparent opacity={opacity} />
            </mesh>
        </group>
    );
};

interface ThreeIsometricAxesProps {
    mode: 'translation' | 'rotation';
}

const ThreeIsometricAxes = ({ mode }: ThreeIsometricAxesProps) => {
    // Memoize vectors
    const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
    const xDir = useMemo(() => new THREE.Vector3(0, 0, 1), []); // Red (Z in Three)
    const yDir = useMemo(() => new THREE.Vector3(1, 0, 0), []); // Green (X in Three)
    const zDir = useMemo(() => new THREE.Vector3(0, 1, 0), []); // Blue (Y in Three)

    const arrowLength = 1.6;

    return (
        <Canvas
            flat
            dpr={[1, 2]}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none'
            }}
        >
            {/* Moved camera back slightly to [5,5,5] to accommodate longer arrows */}
            <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={35} />

            <OrbitControls
                target={[0, 0, 0]}
                enableZoom={false}
                enableRotate={false}
                enablePan={false}
            />

            <ambientLight intensity={3} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            {/* --- LINEAR AXES (Always shown) --- */}
            <group>
                <arrowHelper args={[xDir, origin, arrowLength, 0xef4444, 0.4, 0.2]} />
                <arrowHelper args={[yDir, origin, arrowLength, 0x10b981, 0.4, 0.2]} />
                <arrowHelper args={[zDir, origin, arrowLength, 0x3b82f6, 0.4, 0.2]} />
            </group>

            {/* --- ROTATION GIZMOS --- */}
            {mode === 'rotation' && (
                <group>
                    {/* Rotate around X (Red Axis) */}
                    <RotationGizmo axisVector={xDir} color={0xef4444} />

                    {/* Rotate around Y (Green Axis) */}
                    <RotationGizmo axisVector={yDir} color={0x10b981} />

                    {/* Rotate around Z (Blue Axis) */}
                    <RotationGizmo axisVector={zDir} color={0x3b82f6} />
                </group>
            )}

            {/* Origin Point */}
            <mesh>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#94a3b8" />
            </mesh>

            {/* Decorative ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.1, 0.12, 32]} />
                <meshBasicMaterial color="#94a3b8" transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>
        </Canvas>
    );
};

export default ThreeIsometricAxes;