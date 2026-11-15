import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Lightformer, RoundedBox } from '@react-three/drei';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Group } from 'three';

/* Floating metal and glass objects either side of the hero headline.
   Reflections come from studio light panels baked once (no HDR download). */

const pointer = { x: 0, y: 0 };
const chrome = { color: '#eef0f4', metalness: 1, roughness: 0.16 } as const;

/** Leans the whole group gently toward the pointer and rises into place on load. */
function Rig({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null!);
  useFrame((_, dt) => {
    const g = group.current;
    const k = 1 - Math.exp(-dt * 2.5); // frame-rate independent easing
    g.rotation.y += (pointer.x * 0.22 - g.rotation.y) * k;
    g.rotation.x += (pointer.y * 0.12 - g.rotation.x) * k;
    g.position.y += (0 - g.position.y) * (1 - Math.exp(-dt * 1.8));
  });
  return (
    <group ref={group} position={[0, -0.8, 0]}>
      {children}
    </group>
  );
}

export default function HeroScene3D() {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    // Stop rendering once the hero has scrolled away.
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (wrap.current) io.observe(wrap.current);
    return () => {
      window.removeEventListener('pointermove', onMove);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className="hero-3d-canvas">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        {/* Bright studio panels so the metal reads silver, not black */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={6} position={[0, 6, -4]} scale={[14, 4, 1]} />
          <Lightformer intensity={3} position={[0, -6, 0]} rotation-x={Math.PI / 2} scale={[14, 6, 1]} />
          <Lightformer intensity={2.5} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer intensity={2.5} color="#2997ff" position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[8, 1.5, 1]} />
          <Lightformer form="ring" intensity={3} position={[0, 0, 6]} scale={3} />
        </Environment>
        {/* Objects frame the headline (it spans about x = -2.1..2.1), set back so they never cover text */}
        <Rig>
          <Float speed={1.2} rotationIntensity={0.6} floatIntensity={0.8}>
            <mesh position={[-3.4, 1.2, -1.6]} rotation={[0.6, 0.3, 0]}>
              <torusGeometry args={[0.66, 0.23, 48, 128]} />
              <meshStandardMaterial {...chrome} />
            </mesh>
          </Float>
          <Float speed={1} rotationIntensity={0.4} floatIntensity={1}>
            <mesh position={[3.5, 1.2, -1.3]}>
              <sphereGeometry args={[0.62, 64, 64]} />
              <meshPhysicalMaterial transmission={1} thickness={1.2} roughness={0.06} ior={1.45} color="#eaf2ff" />
            </mesh>
          </Float>
          <Float speed={1.4} rotationIntensity={0.8} floatIntensity={0.6}>
            <RoundedBox args={[0.78, 0.78, 0.78]} radius={0.18} smoothness={6} position={[3.4, -1.75, -1.4]} rotation={[0.5, 0.6, 0.2]}>
              <meshStandardMaterial {...chrome} roughness={0.22} />
            </RoundedBox>
          </Float>
          <Float speed={1.6} floatIntensity={1.2}>
            <mesh position={[-3.2, -1.6, -0.6]}>
              <sphereGeometry args={[0.24, 48, 48]} />
              <meshStandardMaterial color="#2997ff" metalness={0.9} roughness={0.2} />
            </mesh>
          </Float>
          <Float speed={0.9} rotationIntensity={1}>
            <mesh position={[-2.2, 2.3, -3]} rotation={[1, 0.4, 0]}>
              <capsuleGeometry args={[0.13, 0.7, 12, 32]} />
              <meshStandardMaterial {...chrome} />
            </mesh>
          </Float>
        </Rig>
      </Canvas>
    </div>
  );
}
