import { Canvas } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

const PageMesh = ({ texture }: { texture: THREE.CanvasTexture | null }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Create a curved geometry for the book page
    const geometry = useMemo(() => {
        // 7.5 x 10 corresponds to a 3:4 aspect ratio (75% x 100%)
        const width = 6.0;
        const height = 8.5; // 元の7.5から8.5へ縦に拡大し、より下まで描画できるようにする
        const geo = new THREE.PlaneGeometry(width, height, 64, 64);
        const pos = geo.attributes.position;

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            // Normalize x from 0 to 1 (left to right)
            const nx = (x + width / 2) / width;

            let z = 0;

            // General page wave (slight upward bulge in the middle left)
            z += Math.sin(nx * Math.PI) * 0.25;

            // Deep dive into the spine on the right side
            if (nx > 0.4) {
                const gutterProgress = (nx - 0.4) / 0.6;
                // Cubic falloff for realistic book spine curve
                z -= Math.pow(gutterProgress, 2.8) * 2.0;
            }

            pos.setZ(i, z);
        }
        geo.computeVertexNormals();
        return geo;
    }, []);

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            // Match the book's photographic perspective (the red lines):
            // rotateX: slight tilt forward/backward
            // rotateY: tilt right side deeper into screen
            // Match the show-through text from the background image (slightly tilted to the right, negative Z rotation)
            rotation={[0.05, -0.24, -0.08]} // Negative Z tilts clockwise perfectly matching the paper's printed perspective
            // Y軸を0.6から0.1へ下げ、heightの拡大分を下方向へ伸ばす（上端の位置は維持）
            position={[0.5, 0.1, 0]}
        >
            {texture ? (
                <meshBasicMaterial
                    map={texture}
                    transparent={true}
                    opacity={0.88}
                    blending={THREE.MultiplyBlending} // Essential for real ink feel
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            ) : (
                <meshBasicMaterial transparent={true} opacity={0} />
            )}
        </mesh>
    );
};

export const ThreeBookPage = ({ texture }: { texture: THREE.CanvasTexture | null }) => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 10, pointerEvents: 'none' }}>
            <Canvas
                camera={{ position: [0, 0, 11], fov: 45 }}
                gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
            >
                <ambientLight intensity={1} />
                <PageMesh texture={texture} />
            </Canvas>
        </div>
    );
};
