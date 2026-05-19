import { useMemo, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Project } from "../data/projects";
import { smoothstep } from "../utils/math";

type ProjectCardProps = {
  project: Project;
  progress: number;
  index: number;
  activeIndex: number;
};

function makeNoiseTexture(primary: string, secondary: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "rgba(248,251,255,0.04)");
  bg.addColorStop(0.25, primary);
  bg.addColorStop(0.58, "rgba(255,122,223,0.25)");
  bg.addColorStop(1, secondary);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 5600; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const a = Math.random() * 0.16;
    ctx.fillStyle = `rgba(248,251,255,${a})`;
    ctx.fillRect(x, y, Math.random() * 2.2 + 0.4, Math.random() * 2.2 + 0.4);
  }

  for (let i = 0; i < 28; i += 1) {
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = i % 2 ? "#ff9f1c" : "#ff7adf";
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.beginPath();
    const y = Math.random() * canvas.height;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(canvas.width * 0.32, y + Math.random() * 80 - 40, canvas.width * 0.68, y + Math.random() * 80 - 40, canvas.width, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeTextTexture(project: Project) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "rgba(255,229,154,0.52)";
  ctx.font = "24px Arial, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText(project.subtitle.toUpperCase(), canvas.width / 2, 118);

  ctx.shadowColor = project.secondary;
  ctx.shadowBlur = 24;
  ctx.font = project.title.length > 17 ? "58px Arial, sans-serif" : "76px Arial, sans-serif";
  ctx.letterSpacing = "4px";

  const words = project.title.split(" ");
  const lines =
    project.title.length > 16 && words.length > 1
      ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
      : [project.title];

  lines.forEach((line, i) => {
    const y = 238 + (i - (lines.length - 1) / 2) * 76;
    ctx.fillStyle = "rgba(255,122,223,0.36)";
    ctx.fillText(line, canvas.width / 2 - 2, y);
    ctx.fillStyle = "rgba(60,109,255,0.34)";
    ctx.fillText(line, canvas.width / 2 + 2, y);
    ctx.fillStyle = "rgba(248,251,255,0.9)";
    ctx.fillText(line, canvas.width / 2, y);
  });

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,229,154,0.54)";
  ctx.font = "20px 'Courier New', monospace";
  ctx.letterSpacing = "3px";
  ctx.fillText(`CURRENT ${project.index} / DRIFT ${Math.abs(project.position[2]).toFixed(1)}`, canvas.width / 2, 404);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default function ProjectCard({ project, progress, index, activeIndex }: ProjectCardProps) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const border = useRef<THREE.LineSegments>(null);
  const textMat = useRef<THREE.MeshBasicMaterial>(null);
  const ripple = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => makeNoiseTexture(project.color, project.secondary), [project.color, project.secondary]);
  const textTexture = useMemo(() => makeTextTexture(project), [project]);
  const basePosition = useMemo(() => new THREE.Vector3(...project.position), [project.position]);

  useFrame(({ clock }) => {
    if (!group.current || !material.current || !border.current || !textMat.current || !ripple.current) return;

    const t = clock.elapsedTime;
    const travel = progress * 66;
    const cameraZ = 6.4 - travel;
    const relativeZ = basePosition.z - cameraZ;
    const workFade = smoothstep(0.3, 0.43, progress);
    const depthFade = smoothstep(13, -2.5, Math.abs(relativeZ));
    const isActive = activeIndex === index ? 1 : 0;
    const currentBoost = smoothstep(6.2, 0.8, Math.abs(relativeZ)) * 0.65 + isActive * 0.35;
    const appear = depthFade * workFade;
    const burst = smoothstep(0.28, 0.45, progress);

    group.current.visible = progress > 0.28;
    group.current.position.set(
      basePosition.x * burst + Math.sin(t * 0.36 + index) * 0.24,
      basePosition.y * burst + Math.cos(t * 0.31 + index * 2.1) * 0.18,
      basePosition.z,
    );
    group.current.rotation.set(
      project.rotation[0] + Math.sin(t * 0.25 + index) * 0.05,
      project.rotation[1] + currentBoost * Math.sin(t * 0.48) * 0.1,
      project.rotation[2] + Math.cos(t * 0.19 + index) * 0.035,
    );
    group.current.scale.setScalar(0.72 + currentBoost * 0.34 + appear * 0.16);

    texture.offset.x = t * 0.018 + index * 0.05;
    texture.offset.y = Math.sin(t * 0.08 + index) * 0.025;

    material.current.opacity = appear * (0.22 + currentBoost * 0.32);
    material.current.emissiveIntensity = 0.26 + currentBoost * 1.35;
    (border.current.material as THREE.LineBasicMaterial).opacity = appear * (0.18 + currentBoost * 0.64);
    textMat.current.opacity = appear * (0.44 + currentBoost * 0.56);
    ripple.current.opacity = appear * (0.08 + currentBoost * 0.2);
  });

  const stopPointer = (event: ThreeEvent<PointerEvent>) => event.stopPropagation();

  return (
    <group ref={group} onPointerMove={stopPointer} visible={false}>
      <mesh>
        <boxGeometry args={[4.7, 2.46, 0.08, 40, 20, 2]} />
        <meshPhysicalMaterial
          ref={material}
          map={texture}
          color="#d9dcff"
          roughness={0.1}
          metalness={0.04}
          transmission={0.68}
          thickness={0.8}
          transparent
          opacity={0}
          clearcoat={1}
          clearcoatRoughness={0.16}
          emissive={project.color}
          emissiveIntensity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <lineSegments ref={border}>
        <edgesGeometry args={[new THREE.BoxGeometry(4.78, 2.54, 0.12)]} />
        <lineBasicMaterial color={project.secondary} transparent opacity={0} blending={THREE.AdditiveBlending} />
      </lineSegments>

      <mesh position={[0, 0, 0.14]}>
        <planeGeometry args={[4.36, 2.08, 1, 1]} />
        <meshBasicMaterial ref={textMat} map={textTexture} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, -1.43, 0.18]} rotation={[0, 0, Math.sin(index) * 0.1]}>
        <planeGeometry args={[4.2, 0.24, 1, 1]} />
        <meshBasicMaterial ref={ripple} color={project.secondary} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
