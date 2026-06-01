import { useEffect, useMemo, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EmotionFragment } from "../data/projects";
import { smoothstep } from "../utils/math";

type ProjectCardProps = {
  project: EmotionFragment;
  progress: number;
  index: number;
  activeIndex: number;
  onSelect?: (fragment: EmotionFragment) => void;
};

const emotionLabels: Record<EmotionFragment["emotion"], string> = {
  healing: "HEALING",
  lonely: "LONELY",
  hope: "HOPE",
  dream: "DREAM",
  calm: "CALM",
  moonlight: "MOONLIGHT",
  starlight: "STARLIGHT",
  silence: "SILENCE",
  echo: "ECHO",
  drift: "DRIFT",
  aurora: "AURORA",
  haze: "HAZE",
  tide: "TIDE",
  blur: "BLUR",
  soft: "SOFT",
  alone: "ALONE",
  rain: "RAIN",
  quiet: "QUIET",
  dawn: "DAWN",
  ember: "EMBER",
  bloom: "BLOOM",
  memory: "MEMORY",
  night: "NIGHT",
  floating: "FLOATING",
};

const readableFragmentIds = new Set(["light-crack", "far-walk"]);
const disableRaycast = () => null;
const cardAccentPalette = [
  "#ffe59a",
  "#ffd7a8",
  "#d8c7ff",
  "#f2c6ff",
  "#b7d7ff",
  "#ff9fca",
  "#c8fff4",
  "#ffb86b",
  "#caa8ff",
  "#9fe7ff",
];

function makeNoiseTexture(primary: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "rgba(248,251,255,0.04)");
  bg.addColorStop(0.25, primary);
  bg.addColorStop(0.58, "rgba(120,154,255,0.22)");
  bg.addColorStop(1, "rgba(8,12,38,0.42)");
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
    ctx.strokeStyle = i % 2 ? primary : "#ff7adf";
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

function makeTextTexture(project: EmotionFragment) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "rgba(255,229,154,0.58)";
  ctx.font = "24px Arial, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText(project.title.toUpperCase(), canvas.width / 2, 102);

  ctx.shadowColor = project.glowColor;
  ctx.shadowBlur = 10;
  ctx.font = project.text.length > 14 ? "56px 'Microsoft YaHei', Arial, sans-serif" : "70px 'Microsoft YaHei', Arial, sans-serif";
  ctx.letterSpacing = "0px";
  ctx.lineJoin = "round";

  const words = project.text.split("");
  const lines =
    project.text.length > 12
      ? [words.slice(0, Math.ceil(words.length / 2)).join(""), words.slice(Math.ceil(words.length / 2)).join("")]
      : [project.text];

  lines.forEach((line, i) => {
    const y = 238 + (i - (lines.length - 1) / 2) * 72;
    ctx.strokeStyle = "rgba(5,8,23,0.48)";
    ctx.lineWidth = 7;
    ctx.strokeText(line, canvas.width / 2, y);
    ctx.fillStyle = "rgba(255,122,223,0.12)";
    ctx.fillText(line, canvas.width / 2 - 1.1, y);
    ctx.fillStyle = "rgba(60,109,255,0.14)";
    ctx.fillText(line, canvas.width / 2 + 1.1, y);
    ctx.fillStyle = "rgba(248,251,255,0.82)";
    ctx.fillText(line, canvas.width / 2, y);
  });

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,229,154,0.58)";
  ctx.font = "20px 'Courier New', monospace";
  ctx.letterSpacing = "3px";
  ctx.fillText(`${emotionLabels[project.emotion]} / FRAGMENT ${project.index}`, canvas.width / 2, 404);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default function ProjectCard({ project, progress, index, activeIndex, onSelect }: ProjectCardProps) {
  const group = useRef<THREE.Group>(null);
  const backing = useRef<THREE.MeshBasicMaterial>(null);
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const border = useRef<THREE.LineSegments>(null);
  const glowBorder = useRef<THREE.LineSegments>(null);
  const textMat = useRef<THREE.MeshBasicMaterial>(null);
  const ripple = useRef<THREE.MeshBasicMaterial>(null);
  const hitArea = useRef<THREE.Mesh>(null);
  const hovered = useRef(false);
  const clickable = useRef(false);
  const accentColor = cardAccentPalette[index % cardAccentPalette.length];
  const secondaryAccent = cardAccentPalette[(index + 4) % cardAccentPalette.length];
  const visualProject = useMemo(() => ({ ...project, glowColor: accentColor }), [project, accentColor]);
  const texture = useMemo(() => makeNoiseTexture(accentColor), [accentColor]);
  const textTexture = useMemo(() => makeTextTexture(visualProject), [visualProject]);
  const basePosition = useMemo(() => new THREE.Vector3(...project.position), [project.position]);

  useEffect(() => {
    hovered.current = false;
  }, [activeIndex]);

  useFrame(({ clock }) => {
    if (!group.current || !backing.current || !material.current || !border.current || !glowBorder.current || !textMat.current || !ripple.current) return;

    const t = clock.elapsedTime;
    const travel = progress * 66;
    const cameraZ = 6.4 - travel;
    const relativeZ = basePosition.z - cameraZ;
    const workFade = smoothstep(0.18, 0.3, progress);
    const depthFade = smoothstep(18, -3.0, Math.abs(relativeZ));
    const isActive = activeIndex === index ? 1 : 0;
    const currentBoost = smoothstep(6.2, 0.8, Math.abs(relativeZ)) * 0.72 + isActive * 0.08;
    const appear = depthFade * workFade;
    const burst = smoothstep(0.18, 0.34, progress);
    const readabilityBoost = readableFragmentIds.has(project.id) ? 0.28 : 0;
    clickable.current = progress > 0.16 && appear > 0.015;
    if (!clickable.current) hovered.current = false;
    const hoverBoost = clickable.current && hovered.current ? 0.18 : 0;

    group.current.visible = progress > 0.16;
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
    group.current.scale.setScalar(1.02 + currentBoost * 0.48 + appear * 0.22 + hoverBoost * appear);

    texture.offset.x = t * 0.018 + index * 0.05;
    texture.offset.y = Math.sin(t * 0.08 + index) * 0.025;

    backing.current.opacity = appear * (0.16 + readabilityBoost + hoverBoost * 0.45 + currentBoost * 0.18);
    material.current.opacity = appear * (0.38 + readabilityBoost + hoverBoost * 0.38 + currentBoost * 0.5);
    material.current.emissiveIntensity = 0.34 + readabilityBoost * 2.2 + hoverBoost * 3.2 + currentBoost * 1.9;
    (border.current.material as THREE.LineBasicMaterial).opacity = appear * (0.34 + readabilityBoost + hoverBoost * 1.2 + currentBoost * 0.52);
    (glowBorder.current.material as THREE.LineBasicMaterial).opacity = appear * (0.14 + readabilityBoost * 0.8 + hoverBoost * 1.25 + currentBoost * 0.34);
    textMat.current.opacity = appear * (0.46 + readabilityBoost * 1.35 + hoverBoost * 1.1 + currentBoost * 0.72);
    ripple.current.opacity = appear * (0.08 + readabilityBoost * 0.7 + hoverBoost * 0.9 + currentBoost * 0.24);
  });

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (!clickable.current) return;
    hovered.current = true;
  };
  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    hovered.current = false;
  };
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!clickable.current || event.object.userData.type !== "interactive-fragment" || event.object.userData.fragmentId !== project.id) return;
    onSelect?.(project);
  };
  const raycastHitArea = (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => {
    if (!clickable.current || !hitArea.current) return;
    THREE.Mesh.prototype.raycast.call(hitArea.current, raycaster, intersects);
  };

  return (
    <group ref={group} visible={false}>
      <mesh
        ref={hitArea}
        position={[0, 0, 0.24]}
        userData={{ type: "interactive-fragment", fragmentId: project.id }}
        raycast={raycastHitArea}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[5.2, 2.92, 1, 1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, -0.025]} raycast={disableRaycast}>
        <planeGeometry args={[5.46, 3.12, 1, 1]} />
        <meshBasicMaterial ref={backing} color="#11164a" transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, 0.04]} raycast={disableRaycast}>
        <boxGeometry args={[5.2, 2.92, 0.08, 40, 20, 2]} />
        <meshPhysicalMaterial
          ref={material}
          map={texture}
          color="#d9dcff"
          roughness={0.1}
          metalness={0.04}
          transmission={0.54}
          thickness={0.8}
          transparent
          opacity={0}
          clearcoat={1}
          clearcoatRoughness={0.16}
          emissive={accentColor}
          emissiveIntensity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <lineSegments ref={border} raycast={disableRaycast}>
        <edgesGeometry args={[new THREE.BoxGeometry(4.92, 2.64, 0.12)]} />
        <lineBasicMaterial color={accentColor} transparent opacity={0} blending={THREE.AdditiveBlending} />
      </lineSegments>

      <lineSegments ref={glowBorder} scale={[1.06, 1.08, 1]} raycast={disableRaycast}>
        <edgesGeometry args={[new THREE.BoxGeometry(4.92, 2.64, 0.12)]} />
        <lineBasicMaterial color={secondaryAccent} transparent opacity={0} blending={THREE.AdditiveBlending} />
      </lineSegments>

      <mesh position={[0, 0, 0.14]} raycast={disableRaycast}>
        <planeGeometry args={[4.36, 2.08, 1, 1]} />
        <meshBasicMaterial ref={textMat} map={textTexture} transparent opacity={0} depthWrite={false} blending={THREE.NormalBlending} />
      </mesh>

      <mesh position={[0, -1.38, 0.16]} rotation={[0, 0, Math.sin(index) * 0.08]} raycast={disableRaycast}>
        <planeGeometry args={[4.28, 0.12, 1, 1]} />
        <meshBasicMaterial ref={ripple} color={accentColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
