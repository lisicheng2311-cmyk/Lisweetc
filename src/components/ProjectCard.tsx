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

const readableFragmentIds = new Set(["light-crack", "far-walk"]);
const disableRaycast = () => null;
const glassCardClasses = {
  root: "glass-card",
  inner: "glass-card-inner",
  glow: "glass-card-glow",
};
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

function getTodayCardDate() {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
}

function makeNoiseTexture(primary: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "rgba(233,249,255,0.055)");
  bg.addColorStop(0.22, "rgba(8,12,22,0.42)");
  bg.addColorStop(0.62, "rgba(0,0,0,0.76)");
  bg.addColorStop(1, "rgba(0,0,0,0.94)");
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const reflection = ctx.createLinearGradient(0, canvas.height * 0.08, canvas.width, canvas.height * 0.72);
  reflection.addColorStop(0, "rgba(233,249,255,0)");
  reflection.addColorStop(0.44, "rgba(233,249,255,0.055)");
  reflection.addColorStop(0.5, "rgba(233,249,255,0.13)");
  reflection.addColorStop(0.56, "rgba(233,249,255,0.035)");
  reflection.addColorStop(1, "rgba(233,249,255,0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = reflection;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 4400; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const a = Math.random() * 0.05;
    ctx.fillStyle = `rgba(233,249,255,${a})`;
    ctx.fillRect(x, y, Math.random() * 1.4 + 0.25, Math.random() * 1.4 + 0.25);
  }

  for (let i = 0; i < 22; i += 1) {
    ctx.globalAlpha = 0.038;
    ctx.strokeStyle = i % 2 ? "#e9f9ff" : primary;
    ctx.lineWidth = Math.random() * 1.2 + 0.3;
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

function makeSheenTexture(primary: string, secondary: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sweep = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  sweep.addColorStop(0, "rgba(255,255,255,0)");
  sweep.addColorStop(0.38, "rgba(233,249,255,0.015)");
  sweep.addColorStop(0.48, "rgba(233,249,255,0.16)");
  sweep.addColorStop(0.54, "rgba(233,249,255,0.28)");
  sweep.addColorStop(0.6, "rgba(233,249,255,0.035)");
  sweep.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glint = ctx.createRadialGradient(canvas.width * 0.2, canvas.height * 0.18, 0, canvas.width * 0.2, canvas.height * 0.18, canvas.width * 0.36);
  glint.addColorStop(0, "rgba(233,249,255,0.22)");
  glint.addColorStop(0.32, "rgba(233,249,255,0.075)");
  glint.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = glint;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeEdgeRefractionTexture(primary: string, secondary: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const edge = ctx.createLinearGradient(0, 0, canvas.width, 0);
  edge.addColorStop(0, "rgba(255,255,255,0)");
  edge.addColorStop(0.06, "rgba(233,249,255,0.48)");
  edge.addColorStop(0.12, "rgba(233,249,255,0.12)");
  edge.addColorStop(0.5, "rgba(233,249,255,0.02)");
  edge.addColorStop(0.88, "rgba(233,249,255,0.14)");
  edge.addColorStop(0.94, "rgba(233,249,255,0.5)");
  edge.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const top = ctx.createLinearGradient(0, 0, 0, canvas.height);
  top.addColorStop(0, "rgba(233,249,255,0.42)");
  top.addColorStop(0.08, "rgba(233,249,255,0.08)");
  top.addColorStop(0.52, "rgba(233,249,255,0)");
  top.addColorStop(0.91, "rgba(233,249,255,0.1)");
  top.addColorStop(1, "rgba(233,249,255,0.36)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 34; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() < 0.5 ? Math.random() * 36 : canvas.height - Math.random() * 36;
    ctx.fillStyle = `rgba(248,251,255,${0.08 + Math.random() * 0.18})`;
    ctx.fillRect(x, y, 1 + Math.random() * 9, 0.6 + Math.random() * 1.8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
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

  const readability = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.52, 0, canvas.width * 0.5, canvas.height * 0.52, canvas.width * 0.42);
  readability.addColorStop(0, "rgba(3,6,18,0.58)");
  readability.addColorStop(0.42, "rgba(3,6,18,0.36)");
  readability.addColorStop(1, "rgba(3,6,18,0)");
  ctx.fillStyle = readability;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,229,154,0.58)";
  ctx.font = "24px Arial, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText(project.title.toUpperCase(), canvas.width / 2, 102);

  ctx.shadowColor = "rgba(0,0,0,0.72)";
  ctx.shadowBlur = 18;
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
    ctx.strokeStyle = "rgba(2,4,14,0.82)";
    ctx.lineWidth = 12;
    ctx.strokeText(line, canvas.width / 2, y);
    ctx.strokeStyle = "rgba(255,229,154,0.24)";
    ctx.lineWidth = 3;
    ctx.strokeText(line, canvas.width / 2, y);
    ctx.fillStyle = "rgba(255,122,223,0.12)";
    ctx.fillText(line, canvas.width / 2 - 1.1, y);
    ctx.fillStyle = "rgba(60,109,255,0.14)";
    ctx.fillText(line, canvas.width / 2 + 1.1, y);
    ctx.fillStyle = "rgba(248,251,255,0.96)";
    ctx.fillText(line, canvas.width / 2, y);
  });

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,229,154,0.58)";
  ctx.font = "20px 'Courier New', monospace";
  ctx.letterSpacing = "3px";
  ctx.fillText(`${project.emotion.toUpperCase()} / ${getTodayCardDate()}`, canvas.width / 2, 404);

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
  const innerRim = useRef<THREE.LineSegments>(null);
  const textMat = useRef<THREE.MeshBasicMaterial>(null);
  const ripple = useRef<THREE.MeshBasicMaterial>(null);
  const sheen = useRef<THREE.MeshBasicMaterial>(null);
  const edgeRefraction = useRef<THREE.MeshBasicMaterial>(null);
  const hitArea = useRef<THREE.Mesh>(null);
  const hovered = useRef(false);
  const hoverAmount = useRef(0);
  const clickable = useRef(false);
  const accentColor = cardAccentPalette[index % cardAccentPalette.length];
  const secondaryAccent = cardAccentPalette[(index + 4) % cardAccentPalette.length];
  const visualProject = useMemo(() => ({ ...project, glowColor: accentColor }), [project, accentColor]);
  const texture = useMemo(() => makeNoiseTexture(accentColor), [accentColor]);
  const sheenTexture = useMemo(() => makeSheenTexture(accentColor, secondaryAccent), [accentColor, secondaryAccent]);
  const edgeRefractionTexture = useMemo(() => makeEdgeRefractionTexture(accentColor, secondaryAccent), [accentColor, secondaryAccent]);
  const textTexture = useMemo(() => makeTextTexture(visualProject), [visualProject]);
  const basePosition = useMemo(() => new THREE.Vector3(...project.position), [project.position]);
  const pointerOffset = useRef(new THREE.Vector2());
  const targetPointerOffset = useRef(new THREE.Vector2());
  const textLayer = useRef<THREE.Mesh>(null);
  const rippleLayer = useRef<THREE.Mesh>(null);

  useEffect(() => {
    hovered.current = false;
    hoverAmount.current = 0;
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (document.body.style.cursor === "pointer") {
        document.body.style.cursor = "";
      }
    };
  }, []);

  useFrame(({ clock }) => {
    if (
      !group.current ||
      !backing.current ||
      !material.current ||
      !border.current ||
      !glowBorder.current ||
      !innerRim.current ||
      !textMat.current ||
      !ripple.current ||
      !sheen.current ||
      !edgeRefraction.current
    ) return;

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
    if (!clickable.current) {
      hovered.current = false;
      targetPointerOffset.current.set(0, 0);
    }
    hoverAmount.current = THREE.MathUtils.lerp(hoverAmount.current, clickable.current && hovered.current ? 1 : 0, 0.14);
    const hoverBoost = hoverAmount.current * 0.34;
    pointerOffset.current.lerp(targetPointerOffset.current, hovered.current ? 0.18 : 0.1);
    const parallaxX = pointerOffset.current.x * (0.07 + hoverBoost * 0.18);
    const parallaxY = pointerOffset.current.y * (0.055 + hoverBoost * 0.14);

    group.current.visible = progress > 0.16;
    group.current.position.set(
      basePosition.x * burst + Math.sin(t * 0.36 + index) * 0.24,
      basePosition.y * burst + Math.cos(t * 0.31 + index * 2.1) * 0.18,
      basePosition.z + hoverAmount.current * 0.42,
    );
    group.current.rotation.set(
      project.rotation[0] + Math.sin(t * 0.25 + index) * 0.05 - parallaxY,
      project.rotation[1] + currentBoost * Math.sin(t * 0.48) * 0.1 + parallaxX,
      project.rotation[2] + Math.cos(t * 0.19 + index) * 0.035,
    );
    group.current.scale.setScalar(1.02 + currentBoost * 0.48 + appear * 0.22 + hoverBoost * appear);

    texture.offset.x = index * 0.05 + pointerOffset.current.x * 0.006;
    texture.offset.y = Math.sin(t * 0.05 + index) * 0.006 + pointerOffset.current.y * 0.004;
    sheenTexture.offset.x = -0.42 + (t * 0.028 + index * 0.09 + pointerOffset.current.x * 0.1) % 1.42;
    sheenTexture.offset.y = pointerOffset.current.y * 0.025;
    edgeRefractionTexture.offset.x = (t * 0.018 + index * 0.07 + pointerOffset.current.x * 0.05) % 1;

    if (textLayer.current) {
      textLayer.current.position.x = pointerOffset.current.x * -0.038;
      textLayer.current.position.y = pointerOffset.current.y * -0.028;
    }
    if (rippleLayer.current) {
      rippleLayer.current.position.x = pointerOffset.current.x * 0.06;
    }

    backing.current.opacity = appear * (0.18 + readabilityBoost * 0.24 + hoverBoost * 0.04 + currentBoost * 0.06);
    material.current.opacity = appear * (0.44 + readabilityBoost * 0.14 + hoverBoost * 0.08 + currentBoost * 0.1);
    material.current.emissiveIntensity = 0.03 + readabilityBoost * 0.12 + hoverBoost * 0.12 + currentBoost * 0.08;
    material.current.thickness = 0.92 + readabilityBoost * 0.08 + currentBoost * 0.08 + hoverBoost * 0.16;
    material.current.iridescence = 0.04 + currentBoost * 0.04 + hoverBoost * 0.16;
    (border.current.material as THREE.LineBasicMaterial).opacity = appear * (0.62 + readabilityBoost * 0.18 + hoverBoost * 1.15 + currentBoost * 0.18);
    (glowBorder.current.material as THREE.LineBasicMaterial).opacity = appear * (0.24 + readabilityBoost * 0.12 + hoverBoost * 1.25 + currentBoost * 0.12);
    (innerRim.current.material as THREE.LineBasicMaterial).opacity = appear * (0.28 + readabilityBoost * 0.14 + hoverBoost * 0.88 + currentBoost * 0.12);
    textMat.current.opacity = appear * (0.78 + readabilityBoost * 0.82 + hoverBoost * 0.42 + currentBoost * 0.28);
    ripple.current.opacity = appear * (0.12 + readabilityBoost * 0.62 + hoverBoost * 0.68 + currentBoost * 0.2);
    sheen.current.opacity = appear * (0.08 + readabilityBoost * 0.04 + hoverBoost * 0.24 + currentBoost * 0.04);
    edgeRefraction.current.opacity = appear * (0.22 + readabilityBoost * 0.04 + currentBoost * 0.06 + hoverBoost * 0.36);
  });

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (!clickable.current) return;
    hovered.current = true;
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    hovered.current = false;
    targetPointerOffset.current.set(0, 0);
    if (document.body.style.cursor === "pointer") {
      document.body.style.cursor = "";
    }
  };
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (!clickable.current || !group.current) return;
    const localPoint = group.current.worldToLocal(event.point.clone());
    targetPointerOffset.current.set(
      THREE.MathUtils.clamp(localPoint.x / 2.6, -1, 1),
      THREE.MathUtils.clamp(localPoint.y / 1.46, -1, 1),
    );
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
    <group ref={group} visible={false} userData={{ className: glassCardClasses.root }}>
      <mesh
        ref={hitArea}
        position={[0, 0, 0.24]}
        userData={{ type: "interactive-fragment", fragmentId: project.id, className: glassCardClasses.root }}
        raycast={raycastHitArea}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[5.2, 2.92, 1, 1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, -0.045]} raycast={disableRaycast} userData={{ className: glassCardClasses.glow }}>
        <planeGeometry args={[5.62, 3.28, 1, 1]} />
        <meshBasicMaterial ref={backing} color="#000000" transparent opacity={0} depthWrite={false} blending={THREE.NormalBlending} />
      </mesh>

      <mesh position={[0, 0, 0.04]} raycast={disableRaycast} userData={{ className: glassCardClasses.inner }}>
        <boxGeometry args={[5.2, 2.92, 0.08, 40, 20, 2]} />
        <meshPhysicalMaterial
          ref={material}
          map={texture}
          color="#050607"
          roughness={0.08}
          metalness={0}
          transmission={0.92}
          thickness={0.92}
          ior={1.34}
          reflectivity={0.95}
          attenuationColor="#000000"
          attenuationDistance={0.01}
          iridescence={0.04}
          iridescenceIOR={1.08}
          transparent
          opacity={0}
          clearcoat={1}
          clearcoatRoughness={0.02}
          emissive="#000000"
          emissiveIntensity={0.05}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>

      <lineSegments ref={border} raycast={disableRaycast} userData={{ className: glassCardClasses.glow }}>
        <edgesGeometry args={[new THREE.BoxGeometry(4.92, 2.64, 0.12)]} />
        <lineBasicMaterial color="#e9f9ff" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </lineSegments>

      <lineSegments ref={glowBorder} scale={[1.08, 1.1, 1]} raycast={disableRaycast} userData={{ className: glassCardClasses.glow }}>
        <edgesGeometry args={[new THREE.BoxGeometry(4.92, 2.64, 0.12)]} />
        <lineBasicMaterial color="#e9f9ff" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </lineSegments>

      <lineSegments ref={innerRim} scale={[0.94, 0.9, 1]} raycast={disableRaycast} userData={{ className: glassCardClasses.glow }}>
        <edgesGeometry args={[new THREE.BoxGeometry(4.92, 2.64, 0.16)]} />
        <lineBasicMaterial color="#000000" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </lineSegments>

      <mesh position={[0, 0, 0.128]} raycast={disableRaycast} userData={{ className: glassCardClasses.glow }}>
        <planeGeometry args={[5.0, 2.72, 1, 1]} />
        <meshBasicMaterial ref={sheen} map={sheenTexture} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, 0, 0.135]} raycast={disableRaycast} userData={{ className: glassCardClasses.glow }}>
        <planeGeometry args={[5.16, 2.88, 1, 1]} />
        <meshBasicMaterial ref={edgeRefraction} map={edgeRefractionTexture} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={textLayer} position={[0, 0, 0.14]} raycast={disableRaycast} userData={{ className: glassCardClasses.inner }}>
        <planeGeometry args={[4.36, 2.08, 1, 1]} />
        <meshBasicMaterial ref={textMat} map={textTexture} transparent opacity={0} depthWrite={false} blending={THREE.NormalBlending} />
      </mesh>

      <mesh ref={rippleLayer} position={[0, -1.38, 0.16]} rotation={[0, 0, Math.sin(index) * 0.08]} raycast={disableRaycast} userData={{ className: glassCardClasses.glow }}>
        <planeGeometry args={[4.28, 0.12, 1, 1]} />
        <meshBasicMaterial ref={ripple} color={accentColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
