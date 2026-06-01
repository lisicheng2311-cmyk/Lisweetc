import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { smoothstep } from "../utils/math";

type OrbitalFrameProps = {
  activeColor?: string;
  progress: number;
};

type RingConfig = {
  radiusX: number;
  radiusY: number;
  rotation: [number, number, number];
  opacity: number;
  dashCount: number;
  phase: number;
  z: number;
};

const disableRaycast = () => null;

const ringConfigs: RingConfig[] = [
  { radiusX: 8.8, radiusY: 2.18, rotation: [0.22, 0.1, -0.06], opacity: 0.18, dashCount: 96, phase: 0, z: -18 },
  { radiusX: 7.4, radiusY: 2.9, rotation: [0.5, -0.28, 0.42], opacity: 0.13, dashCount: 82, phase: 0.21, z: -20.5 },
  { radiusX: 10.4, radiusY: 3.45, rotation: [0.36, 0.22, -0.34], opacity: 0.09, dashCount: 116, phase: 0.44, z: -24 },
  { radiusX: 6.2, radiusY: 1.78, rotation: [0.7, 0.42, 0.78], opacity: 0.11, dashCount: 74, phase: 0.68, z: -16.2 },
];

function makeDashedEllipseGeometry(radiusX: number, radiusY: number, dashCount: number, phase: number) {
  const positions: number[] = [];
  const dashPortion = 0.48;

  for (let i = 0; i < dashCount; i += 1) {
    if ((i + Math.floor(phase * dashCount)) % 7 === 0) continue;
    const start = ((i + phase) / dashCount) * Math.PI * 2;
    const end = start + (Math.PI * 2 * dashPortion) / dashCount;
    const mid = (start + end) * 0.5;
    const farFade = 0.72 + Math.sin(mid) * 0.18;

    positions.push(Math.cos(start) * radiusX, Math.sin(start) * radiusY * farFade, 0);
    positions.push(Math.cos(end) * radiusX, Math.sin(end) * radiusY * farFade, 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function makeSoftDotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.28, "rgba(255,229,154,0.72)");
  gradient.addColorStop(0.62, "rgba(216,199,255,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function OrbitalFrame({ activeColor = "#ffe59a", progress }: OrbitalFrameProps) {
  const group = useRef<THREE.Group>(null);
  const lineMaterials = useRef<THREE.LineBasicMaterial[]>([]);
  const dustMaterials = useRef<THREE.MeshBasicMaterial[]>([]);
  const dotTexture = useMemo(() => makeSoftDotTexture(), []);
  const ringGeometries = useMemo(
    () => ringConfigs.map((ring) => makeDashedEllipseGeometry(ring.radiusX, ring.radiusY, ring.dashCount, ring.phase)),
    [],
  );
  const dust = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, index) => {
        const ring = ringConfigs[index % ringConfigs.length];
        return {
          ringIndex: index % ringConfigs.length,
          phase: index * 0.37,
          speed: 0.045 + (index % 5) * 0.012,
          size: 0.036 + (index % 4) * 0.012,
          tone: ["#ffe59a", "#f8fbff", "#d8c7ff"][index % 3],
          radiusX: ring.radiusX,
          radiusY: ring.radiusY,
        };
      }),
    [],
  );

  useFrame(({ clock, pointer }) => {
    const frame = group.current;
    if (!frame) return;
    const work = smoothstep(0.2, 0.36, progress) * (1 - smoothstep(0.74, 0.88, progress));
    const orbitTurn = smoothstep(0.28, 0.72, progress);
    const targetColor = new THREE.Color(activeColor).lerp(new THREE.Color("#e9f9ff"), 0.68);

    frame.visible = work > 0.01;
    frame.position.set(pointer.x * 0.28, pointer.y * 0.16, -progress * 18);
    frame.rotation.set(pointer.y * 0.025, pointer.x * 0.035, orbitTurn * 0.12);

    lineMaterials.current.forEach((material, index) => {
      material.color.lerp(targetColor, 0.035);
      material.opacity = ringConfigs[index].opacity * work * (1 + Math.sin(clock.elapsedTime * 0.35 + index) * 0.14);
    });

    dust.forEach((dot, index) => {
      const mesh = frame.children[ringConfigs.length + index] as THREE.Mesh | undefined;
      const material = dustMaterials.current[index];
      const ring = ringConfigs[dot.ringIndex];
      if (!mesh || !material) return;

      const angle = dot.phase + clock.elapsedTime * dot.speed + orbitTurn * 0.8;
      const farFade = 0.72 + Math.sin(angle) * 0.18;
      mesh.position.set(Math.cos(angle) * dot.radiusX, Math.sin(angle) * dot.radiusY * farFade, ring.z + Math.sin(angle * 1.7) * 0.18);
      mesh.rotation.z = -frame.rotation.z;
      mesh.scale.setScalar(dot.size * (0.72 + Math.sin(angle * 2) * 0.18));
      material.opacity = work * (0.2 + (index % 3) * 0.055) * (0.72 + Math.sin(angle * 1.3) * 0.22);
    });
  });

  return (
    <group ref={group} raycast={disableRaycast}>
      {ringConfigs.map((ring, index) => (
        <lineSegments key={index} geometry={ringGeometries[index]} position={[0, 0, ring.z]} rotation={ring.rotation} raycast={disableRaycast}>
          <lineBasicMaterial
            ref={(material) => {
              if (material) lineMaterials.current[index] = material;
            }}
            color="#e9f9ff"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      ))}
      {dust.map((dot, index) => (
        <mesh key={index} raycast={disableRaycast}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={(material) => {
              if (material) dustMaterials.current[index] = material;
            }}
            map={dotTexture}
            color={dot.tone}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
