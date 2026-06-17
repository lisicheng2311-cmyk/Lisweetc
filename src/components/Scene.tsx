import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import OrbitalFrame from "./OrbitalFrame";
import ProjectCard from "./ProjectCard";
import type { EmotionFragment } from "../data/projects";
import { clamp01, mix, smoothstep } from "../utils/math";
import { glslNoise } from "../utils/noise";

type SceneProps = {
  progress: number;
  activeIndex: number;
  fragments: EmotionFragment[];
  ambientFragments?: EmotionFragment[];
  onSelectFragment?: (fragment: EmotionFragment) => void;
};

type UniformSet = {
  uTime: { value: number };
  uProgress: { value: number };
  uPixelRatio: { value: number };
  uMouse: { value: THREE.Vector2 };
  uMouseWorld: { value: THREE.Vector2 };
};

const disableRaycast = () => null;

const particleVertex = `
  attribute vec3 aHome;
  attribute vec3 aFlow;
  attribute vec3 aDrift;
  attribute float aSize;
  attribute float aPhase;
  attribute float aKind;

  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  uniform vec2 uMouseWorld;

  varying float vAlpha;
  varying float vKind;
  varying float vGlow;

  ${glslNoise}

  void main() {
    float open = smoothstep(0.14, 0.32, uProgress);
    float work = smoothstep(0.18, 0.78, uProgress);
    float returnMix = smoothstep(0.88, 1.0, uProgress);
    float burst = smoothstep(0.14, 0.28, uProgress) * (1.0 - smoothstep(0.42, 0.62, uProgress));

    vec3 pos = mix(aHome, aFlow, open);
    vec3 core = vec3(0.0, -0.08, -3.2 - uProgress * 38.0);
    vec3 dir = normalize(aFlow - core + vec3(0.001));
    pos += dir * burst * (2.2 + aKind * 1.4);

    float t = uTime * (0.13 + aKind * 0.16) + aPhase;
    float wave = fbm(pos.xy * 0.36 + aDrift.xy * 0.4 + vec2(uTime * 0.026, -uTime * 0.019));
    float wander = fbm(vec2(aPhase, pos.z * 0.08) + vec2(uTime * 0.041, uTime * 0.027));
    pos += aDrift * (0.16 + work * 0.52) * (0.58 + wave * 0.72);
    pos.x += sin(t + pos.z * 0.11 + wander * 4.0) * (0.1 + work * 0.38);
    pos.y += cos(t * 1.37 + pos.x * 0.13 + wave * 3.2) * (0.08 + work * 0.3);
    pos.z += sin(t * 1.63 + wave * 5.0) * (0.16 + work * 0.48);

    pos.x += (uMouse.x - 0.5) * (0.38 + work * 0.72);
    pos.y += (uMouse.y - 0.5) * (0.24 + work * 0.5);

    vec2 toMouse = pos.xy - uMouseWorld;
    float mouseDistance = length(toMouse);
    float ripple = smoothstep(2.2, 0.0, mouseDistance) * work;
    vec2 mouseDir = normalize(toMouse + vec2(0.001));
    float pulse = 0.55 + 0.45 * sin(uTime * 8.0 - mouseDistance * 5.2);
    pos.xy += mouseDir * ripple * (0.09 + 0.06 * pulse);
    pos.z += ripple * sin(uTime * 3.4 + aPhase) * 0.16;

    pos = mix(pos, aHome * 0.72 + vec3(0.0, 0.0, -44.0), returnMix * 0.36);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float distanceFade = clamp(1.0 + mvPosition.z * 0.026, 0.1, 1.0);
    float twinkle = 0.64 + 0.36 * sin(uTime * (1.35 + aKind * 2.2) + aPhase * 8.0 + wave * 4.0);
    gl_PointSize = aSize * uPixelRatio * distanceFade * twinkle;
    gl_Position = projectionMatrix * mvPosition;

    vAlpha = distanceFade * (0.36 + open * 0.46 + burst * 0.34 + work * 0.3 + returnMix * 0.2);
    vKind = aKind;
    vGlow = burst + smoothstep(0.32, 0.9, uProgress) * 0.55 + ripple * 0.42;
  }
`;

const particleFragment = `
  precision highp float;

  varying float vAlpha;
  varying float vKind;
  varying float vGlow;

  vec3 ramp(float k) {
    vec3 blue = vec3(0.36, 0.47, 1.0);
    vec3 indigo = vec3(0.50, 0.36, 1.0);
    vec3 pink = vec3(1.0, 0.478, 0.875);
    vec3 orange = vec3(1.0, 0.478, 0.094);
    vec3 gold = vec3(1.0, 0.827, 0.416);
    vec3 c = mix(blue, indigo, smoothstep(0.0, 0.35, k));
    c = mix(c, pink, smoothstep(0.28, 0.62, k));
    c = mix(c, orange, smoothstep(0.56, 0.82, k));
    c = mix(c, gold, smoothstep(0.76, 1.0, k));
    return c;
  }

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float core = smoothstep(0.42, 0.02, d);
    float halo = smoothstep(0.5, 0.0, d) * 0.45;
    vec3 color = ramp(fract(vKind + vGlow * 0.28));
    color = mix(color, vec3(1.0, 0.88, 0.48), 0.18 + vGlow * 0.28);
    gl_FragColor = vec4(color * (core * 1.1 + halo * 2.1), (core + halo * 1.12) * vAlpha);
  }
`;

const ribbonVertex = `
  uniform float uTime;
  uniform float uProgress;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying float vWave;
  ${glslNoise}

  void main() {
    vUv = uv;
    vec3 p = position;
    float flow = uTime * 0.22 + uProgress * 3.4;
    float n = fbm(vec2(uv.x * 3.4 + flow, uv.y * 5.0));
    p.y += sin(uv.x * 9.0 + flow * 2.0) * 0.12 + (n - 0.5) * 0.24;
    p.z += cos(uv.x * 7.0 - flow) * 0.22;
    p.x += (uMouse.x - 0.5) * 0.25 * uv.x;
    vWave = n;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const ribbonFragment = `
  precision highp float;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    float edge = smoothstep(0.0, 0.24, vUv.y) * smoothstep(1.0, 0.68, vUv.y);
    float head = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
    vec3 color = mix(uA, uB, vWave);
    float streak = pow(abs(sin(vUv.x * 18.0 + vWave * 3.0)), 6.0);
    gl_FragColor = vec4(color * (0.55 + streak * 1.2), edge * head * uOpacity);
  }
`;

function PostEffects() {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef<EffectComposer | null>(null);

  useEffect(() => {
    gl.setClearColor(0x000000, 0);
    const effectComposer = new EffectComposer(gl);
    effectComposer.addPass(new RenderPass(scene, camera));
    effectComposer.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.68, 0.46, 0.32));
    composer.current = effectComposer;

    return () => {
      effectComposer.dispose();
      composer.current = null;
    };
  }, [camera, gl, scene, size.height, size.width]);

  useEffect(() => {
    composer.current?.setSize(size.width, size.height);
  }, [size]);

  useFrame(() => {
    composer.current?.render();
  }, 1);

  return null;
}

function CameraRig({ progress }: { progress: number }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ pointer }) => {
    const work = smoothstep(0.34, 0.88, progress);
    const travel = Math.max(0, progress - 0.34) * 70;
    const x = Math.sin(progress * Math.PI * 2.5) * 1.05 + pointer.x * 0.32;
    const y = mix(0.28, -0.16, work) + Math.sin(progress * Math.PI * 4) * 0.24 + pointer.y * 0.18;
    const z = 7.5 - travel;
    camera.position.lerp(new THREE.Vector3(x, y, z), 0.085);
    target.set(Math.sin(progress * 6.0) * 0.35, 0.02, z - 8.4);
    camera.lookAt(target);
  });

  return null;
}

function BackgroundWater({ progress }: { progress: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const tone = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 18 && hour < 23) return { violet: 0.72, blue: 0.44, quiet: 0.08 };
    if (hour >= 23 || hour < 6) return { violet: 0.92, blue: 0.32, quiet: 0.24 };
    return { violet: 0.46, blue: 0.68, quiet: 0.02 };
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!mesh.current || !mat.current) return;
    mesh.current.position.z = -18 - progress * 44;
    mesh.current.position.x = pointer.x * 0.35;
    mesh.current.position.y = pointer.y * 0.18;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uProgress.value = progress;
  });

  return (
    <mesh ref={mesh} position={[0, 0, -18]} scale={[36, 20, 1]} raycast={disableRaycast}>
      <planeGeometry args={[1, 1, 120, 72]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ uTime: { value: 0 }, uProgress: { value: 0 } }}
        vertexShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform float uProgress;
          ${glslNoise}
          void main() {
            vUv = uv;
            vec3 p = position;
            float n = fbm(uv * 4.0 + vec2(uTime * 0.035, -uTime * 0.02));
            p.z += (n - 0.5) * 0.28;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          precision highp float;
          varying vec2 vUv;
          uniform float uTime;
          uniform float uProgress;
          ${glslNoise}
          void main() {
            vec2 p = vUv - 0.5;
            float n = fbm(vUv * 5.0 + vec2(uTime * 0.025, -uTime * 0.018));
            float core = smoothstep(0.55, 0.02, length(p));
            vec3 deep = vec3(0.02, 0.035, 0.11);
            vec3 blue = vec3(0.05, 0.16, 0.46);
            vec3 violet = vec3(0.26, 0.13, 0.58);
            vec3 pink = vec3(0.62, 0.2, 0.72);
            vec3 color = mix(deep, blue, n * ${tone.blue.toFixed(2)});
            color = mix(color, violet, smoothstep(0.32, 0.9, n) * ${tone.violet.toFixed(2)});
            color = mix(color, pink, smoothstep(0.74, 1.0, n) * 0.36);
            color = mix(color, deep, ${tone.quiet.toFixed(2)});
            float alpha = (0.12 + n * 0.18 + uProgress * 0.05) * core;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

function ParticleField({ progress }: { progress: number }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial & { uniforms: UniformSet }>(null);
  const particleCount = useMemo(() => (window.innerWidth < 700 ? 2200 : 6800), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const home = new Float32Array(particleCount * 3);
    const flow = new Float32Array(particleCount * 3);
    const drift = new Float32Array(particleCount * 3);
    const size = new Float32Array(particleCount);
    const phase = new Float32Array(particleCount);
    const kind = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i += 1) {
      const t = i / particleCount;
      const side = Math.random() < 0.5 ? -1 : 1;
      const arc = t * Math.PI * 2.0 + Math.random() * 0.8;
      const river = Math.random() < 0.72;
      const hair = Math.random() < 0.3;

      home[i * 3] = Math.cos(arc) * (river ? 4.2 : 7.6) + side * (hair ? 2.8 : 0.6) + (Math.random() - 0.5) * 0.8;
      home[i * 3 + 1] = Math.sin(arc * 1.4) * (river ? 1.45 : 3.4) + (hair ? 2.1 + Math.random() * 1.7 : -0.2);
      home[i * 3 + 2] = -3.2 + Math.sin(arc) * 1.4 + (Math.random() - 0.5) * 2.4;

      flow[i * 3] = (Math.random() - 0.5) * 11 + Math.sin(t * Math.PI * 10) * 1.2;
      flow[i * 3 + 1] = (Math.random() - 0.5) * 6 + Math.cos(t * Math.PI * 7) * 0.9;
      flow[i * 3 + 2] = -Math.random() * 62 - 4;

      drift[i * 3] = (Math.random() - 0.5) * 1.8 + Math.sin(arc * 1.7) * 0.28;
      drift[i * 3 + 1] = (Math.random() - 0.5) * 1.35 + Math.cos(arc * 1.1) * 0.22;
      drift[i * 3 + 2] = (Math.random() - 0.5) * 1.2;

      size[i] = hair ? 3.5 + Math.random() * 8.5 : 1.6 + Math.random() * 7.2;
      phase[i] = Math.random() * Math.PI * 2;
      kind[i] = hair ? 0.78 + Math.random() * 0.22 : Math.random() * 0.72;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(home, 3));
    geo.setAttribute("aHome", new THREE.BufferAttribute(home, 3));
    geo.setAttribute("aFlow", new THREE.BufferAttribute(flow, 3));
    geo.setAttribute("aDrift", new THREE.BufferAttribute(drift, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
    return geo;
  }, [particleCount]);

  useFrame(({ clock, gl, pointer }) => {
    if (!points.current || !material.current) return;
    material.current.uniforms.uTime.value = clock.elapsedTime;
    material.current.uniforms.uProgress.value = progress;
    material.current.uniforms.uPixelRatio.value = gl.getPixelRatio();
    material.current.uniforms.uMouse.value.set(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5);
    material.current.uniforms.uMouseWorld.value.set(pointer.x * 5.6, pointer.y * 3.1);
    points.current.rotation.y = pointer.x * 0.06 + progress * 0.16;
    points.current.rotation.x = pointer.y * 0.045;
  });

  return (
    <points ref={points} geometry={geometry} raycast={disableRaycast}>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={{
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uPixelRatio: { value: 1 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uMouseWorld: { value: new THREE.Vector2(0, 0) },
        }}
      />
    </points>
  );
}

function makeSoftGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,215,168,0.32)");
  gradient.addColorStop(0.28, "rgba(216,199,255,0.16)");
  gradient.addColorStop(0.62, "rgba(91,126,255,0.06)");
  gradient.addColorStop(1, "rgba(91,126,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function SoftCursorTrace({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null);
  const glowTexture = useMemo(() => makeSoftGlowTexture(), []);
  const traces = useRef(
    Array.from({ length: 5 }).map(() => ({
      age: 1,
      position: new THREE.Vector3(),
    })),
  );
  const materials = useRef<THREE.MeshBasicMaterial[]>([]);
  const traceIndex = useRef(0);
  const lastTraceTime = useRef(0);

  useFrame(({ clock, camera, pointer }) => {
    if (!group.current) return;
    const work = smoothstep(0.18, 0.82, progress);
    const target = new THREE.Vector3(camera.position.x + pointer.x * 4.6, camera.position.y + pointer.y * 2.5, camera.position.z - 7.6);

    if (clock.elapsedTime - lastTraceTime.current > 0.12) {
      traces.current[traceIndex.current] = { age: 0, position: target.clone() };
      traceIndex.current = (traceIndex.current + 1) % traces.current.length;
      lastTraceTime.current = clock.elapsedTime;
    }

    traces.current.forEach((trace, index) => {
      trace.age = Math.min(1, trace.age + 0.025);
      const mesh = group.current?.children[index] as THREE.Mesh | undefined;
      const material = materials.current[index];
      if (!mesh || !material) return;
      mesh.position.copy(trace.position);
      mesh.lookAt(camera.position);
      const fade = (1 - trace.age) * work;
      mesh.scale.setScalar(0.7 + trace.age * 1.4);
      material.opacity = fade * 0.13;
    });
  });

  return (
    <group ref={group} raycast={disableRaycast}>
      {traces.current.map((_, index) => (
        <mesh key={index} raycast={disableRaycast}>
          <planeGeometry args={[1.7, 1.7]} />
          <meshBasicMaterial
            ref={(material) => {
              if (material) materials.current[index] = material;
            }}
            map={glowTexture}
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

function DreamOrbitField({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const particleCount = useMemo(() => (window.innerWidth < 700 ? 58 : 126), []);

  const trails = useMemo(() => {
    const colors = ["#d8c7ff", "#ffd7a8", "#b7d7ff", "#f2c6ff"];
    return Array.from({ length: window.innerWidth < 700 ? 8 : 12 }).map((_, index) => ({
      color: colors[index % colors.length],
      position: new THREE.Vector3((index - 5.5) * 0.86, Math.sin(index * 1.13) * 1.35, -7.5 - index * 4.4),
      rotation: new THREE.Euler(0.22 + index * 0.035, index % 2 ? -0.48 : 0.48, Math.sin(index) * 0.24),
      scale: new THREE.Vector3(2.9 + index * 0.23, 0.74 + (index % 4) * 0.13, 1),
    }));
  }, []);

  const pointGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const palette = [new THREE.Color("#d8c7ff"), new THREE.Color("#ffd7a8"), new THREE.Color("#b7d7ff")];

    for (let i = 0; i < particleCount; i += 1) {
      const band = i % 7;
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.2 + Math.random() * 4.8;
      positions[i * 3] = Math.cos(angle) * radius + (band - 3) * 0.8;
      positions[i * 3 + 1] = Math.sin(angle * 1.8) * 1.9 + (Math.random() - 0.5) * 1.4;
      positions[i * 3 + 2] = -6 - Math.random() * 66;
      const color = palette[i % palette.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [particleCount]);

  useFrame(({ clock, pointer }) => {
    if (!group.current || !points.current) return;
    const work = smoothstep(0.16, 0.82, progress);
    group.current.position.z = -progress * 22;
    group.current.rotation.y = pointer.x * 0.08 + Math.sin(clock.elapsedTime * 0.08) * 0.04;
    group.current.rotation.x = pointer.y * 0.035;
    group.current.visible = work > 0.02;
    group.current.children.forEach((child, index) => {
      const object = child as THREE.Object3D;
      object.position.y += Math.sin(clock.elapsedTime * 0.2 + index) * 0.0008;
    });
    (points.current.material as THREE.PointsMaterial).opacity = 0.12 + work * 0.13;
  });

  return (
    <group ref={group} raycast={disableRaycast}>
      {trails.map((trail, index) => (
        <mesh key={index} position={trail.position} rotation={trail.rotation} scale={trail.scale} raycast={disableRaycast}>
          <torusGeometry args={[1, 0.0035, 6, 96]} />
          <meshBasicMaterial color={trail.color} transparent opacity={0.11} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      <points ref={points} geometry={pointGeometry} raycast={disableRaycast}>
        <pointsMaterial size={0.045} transparent opacity={0.12} vertexColors depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function TransitionSparkles({ progress }: { progress: number }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const particleCount = useMemo(() => (window.innerWidth < 700 ? 180 : 520), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    const drift = new Float32Array(particleCount * 3);
    const phase = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const palette = [new THREE.Color("#ffe59a"), new THREE.Color("#ffd7a8"), new THREE.Color("#f2c6ff"), new THREE.Color("#b7d7ff")];

    for (let i = 0; i < particleCount; i += 1) {
      const spread = i / particleCount;
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.2 + Math.random() * 8.6;
      positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 5.2;
      positions[i * 3 + 1] = Math.sin(angle * 1.25) * (1.8 + Math.random() * 2.8) + (Math.random() - 0.5) * 2.6;
      positions[i * 3 + 2] = -18 - spread * 40 - Math.random() * 18;
      basePositions.set(positions.subarray(i * 3, i * 3 + 3), i * 3);
      drift[i * 3] = (Math.random() - 0.5) * 0.42;
      drift[i * 3 + 1] = (Math.random() - 0.5) * 0.34;
      drift[i * 3 + 2] = (Math.random() - 0.5) * 0.46;
      phase[i] = Math.random() * Math.PI * 2;
      const color = palette[i % palette.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = 0.015 + Math.random() * 0.035;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geo.userData.basePositions = basePositions;
    geo.userData.drift = drift;
    geo.userData.phase = phase;
    return geo;
  }, [particleCount]);

  useFrame(({ clock, pointer }) => {
    if (!points.current || !material.current) return;
    const inOut = smoothstep(0.48, 0.62, progress) * (1 - smoothstep(0.86, 0.94, progress));
    points.current.visible = inOut > 0.01;
    points.current.position.z = -progress * 18;
    points.current.rotation.y = pointer.x * 0.05 + Math.sin(clock.elapsedTime * 0.08) * 0.04;
    points.current.rotation.x = pointer.y * 0.04;
    const position = points.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = position.array as Float32Array;
    const basePositions = points.current.geometry.userData.basePositions as Float32Array;
    const drift = points.current.geometry.userData.drift as Float32Array;
    const phase = points.current.geometry.userData.phase as Float32Array;
    for (let i = 0; i < particleCount; i += 1) {
      const offset = i * 3;
      const t = clock.elapsedTime * (0.16 + (i % 7) * 0.015) + phase[i];
      array[offset] = basePositions[offset] + Math.sin(t * 1.7) * drift[offset] + Math.cos(t * 0.9) * 0.12;
      array[offset + 1] = basePositions[offset + 1] + Math.cos(t * 1.23) * drift[offset + 1] + Math.sin(t * 0.63) * 0.1;
      array[offset + 2] = basePositions[offset + 2] + Math.sin(t * 1.09) * drift[offset + 2];
    }
    position.needsUpdate = true;
    material.current.opacity = 0.08 + inOut * 0.54;
    material.current.size = 0.034 + Math.sin(clock.elapsedTime * 1.8) * 0.004;
  });

  return (
    <points ref={points} geometry={geometry} raycast={disableRaycast}>
      <pointsMaterial
        ref={material}
        size={0.034}
        transparent
        opacity={0}
        vertexColors
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const ghostAccentPalette = [
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

function makeGhostTextTexture(fragment: EmotionFragment, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "rgba(255,229,154,0.42)";
  ctx.font = "22px Arial, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText(fragment.title.toUpperCase(), canvas.width / 2, 126);

  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(248,251,255,0.78)";
  ctx.font = fragment.text.length > 14 ? "48px 'Microsoft YaHei', Arial, sans-serif" : "58px 'Microsoft YaHei', Arial, sans-serif";
  const chars = fragment.text.split("");
  const lines =
    fragment.text.length > 12
      ? [chars.slice(0, Math.ceil(chars.length / 2)).join(""), chars.slice(Math.ceil(chars.length / 2)).join("")]
      : [fragment.text];

  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, 254 + (index - (lines.length - 1) / 2) * 64);
  });

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,229,154,0.36)";
  ctx.font = "18px 'Courier New', monospace";
  ctx.letterSpacing = "3px";
  ctx.fillText(`${fragment.emotion.toUpperCase()} / ${getTodayCardDate()}`, canvas.width / 2, 402);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function GhostFragments({
  progress,
  fragments,
  excludeTexts,
  onSelectFragment,
}: {
  progress: number;
  fragments: EmotionFragment[];
  excludeTexts?: Set<string>;
  onSelectFragment?: (fragment: EmotionFragment) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const hoveredGhost = useRef<number | null>(null);
  const ghostInteraction = useRef<
    Array<{
      hover: number;
      pointer: THREE.Vector2;
      targetPointer: THREE.Vector2;
    }>
  >([]);
  const ghostFillOpacity = 0.1;
  const ghostFillVariance = 0.012;
  const ghostBorderOpacity = 0.18;
  const ghostBorderVariance = 0.035;
  const ghostTextOpacity = 0.28;
  const ghosts = useMemo(
    () => {
      const count = window.innerWidth < 700 ? 12 : 24;
      const source = fragments.filter((fragment, index, all) => {
        const text = fragment.text.trim();
        return text && !excludeTexts?.has(text) && all.findIndex((candidate) => candidate.text.trim() === text) === index;
      });
      if (source.length === 0) return [];

      const start = 4 % source.length;
      const visibleCount = Math.min(count, source.length + 5);
      const orderedFragments = [...source.slice(start), ...source.slice(0, start)];
      const layout = [
        [-9.35, 2.7, -8.8, 1.06],
        [-6.45, 2.48, -12.6, 0.72],
        [-2.35, 2.12, -10.8, 0.86],
        [1.55, -0.98, -13.2, 1.0],
        [4.32, 0.92, -16.4, 0.84],
        [7.65, 2.05, -18.2, 0.62],
        [9.15, -2.02, -20.8, 0.74],
        [5.78, -2.72, -23.6, 0.94],
        [-0.28, -2.46, -25.0, 0.66],
        [-4.72, -2.94, -27.8, 0.58],
        [1.05, 3.58, -30.2, 0.54],
        [9.45, 0.82, -33.6, 0.48],
        [-7.85, -4.02, -36.0, 0.7],
        [0.82, -4.08, -39.4, 0.52],
        [7.75, -4.05, -42.6, 0.6],
        [5.85, 3.08, -46.4, 0.5],
        [8.85, 0.42, -50.2, 0.56],
        [8.02, -3.36, -53.8, 0.52],
        [3.55, -3.62, -57.4, 0.64],
        [-1.92, -3.55, -61.2, 0.5],
        [-7.05, -3.38, -65.0, 0.46],
        [-10.0, 2.0, -69.2, 0.44],
        [-4.1, 2.05, -73.6, 0.56],
        [4.45, 2.05, -78.0, 0.48],
      ];
      const extraLayout = [
        [0.15, 4.35, -18.8, 0.46],
        [9.4, 1.72, -24.8, 0.44],
        [-7.7, -4.42, -32.8, 0.5],
        [0.9, -4.48, -41.8, 0.42],
        [7.75, -4.34, -55.8, 0.46],
      ];

      const baseGhosts = Array.from({ length: visibleCount }).map((_, index) => ({
        fragment: orderedFragments[index % orderedFragments.length],
        accent: ghostAccentPalette[index % ghostAccentPalette.length],
        position: new THREE.Vector3(
          layout[index % layout.length][0] + Math.sin(index * 1.9) * 0.45,
          layout[index % layout.length][1] + Math.cos(index * 1.7) * 0.32,
          layout[index % layout.length][2],
        ),
        rotation: new THREE.Euler(
          Math.sin(index * 0.9) * 0.16,
          (index % 2 ? -0.5 : 0.48) + Math.sin(index * 1.4) * 0.14,
          Math.cos(index * 1.3) * 0.2,
        ),
        scale: layout[index % layout.length][3],
      }));

      const extraGhosts = extraLayout.map((slot, extraIndex) => {
        const index = visibleCount + extraIndex;
        return {
          fragment: orderedFragments[index % orderedFragments.length],
          accent: ghostAccentPalette[index % ghostAccentPalette.length],
          position: new THREE.Vector3(
            slot[0] + Math.sin(index * 1.9) * 0.45,
            slot[1] + Math.cos(index * 1.7) * 0.32,
            slot[2],
          ),
          rotation: new THREE.Euler(
            Math.sin(index * 0.9) * 0.16,
            (index % 2 ? -0.5 : 0.48) + Math.sin(index * 1.4) * 0.14,
            Math.cos(index * 1.3) * 0.2,
          ),
          scale: slot[3],
        };
      });

      return [...baseGhosts, ...extraGhosts];
    },
    [excludeTexts, fragments],
  );
  const textTextures = useMemo(() => ghosts.map((ghost) => makeGhostTextTexture(ghost.fragment, ghost.accent)), [ghosts]);

  useEffect(() => {
    ghostInteraction.current = ghosts.map(() => ({
      hover: 0,
      pointer: new THREE.Vector2(),
      targetPointer: new THREE.Vector2(),
    }));
    hoveredGhost.current = null;
  }, [ghosts]);

  const handleGhostClick = (fragment: EmotionFragment) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelectFragment?.(fragment);
  };
  const handleGhostOver = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    hoveredGhost.current = index;
    document.body.style.cursor = "pointer";
  };
  const handleGhostOut = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (hoveredGhost.current === index) hoveredGhost.current = null;
    const state = ghostInteraction.current[index];
    state?.targetPointer.set(0, 0);
    if (document.body.style.cursor === "pointer") {
      document.body.style.cursor = "";
    }
  };
  const handleGhostMove = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const state = ghostInteraction.current[index];
    const parent = event.object.parent;
    if (!state || !parent) return;
    const localPoint = parent.worldToLocal(event.point.clone());
    state.targetPointer.set(
      THREE.MathUtils.clamp(localPoint.x / 2.4, -1, 1),
      THREE.MathUtils.clamp(localPoint.y / 1.36, -1, 1),
    );
  };

  useEffect(() => {
    return () => {
      if (document.body.style.cursor === "pointer") {
        document.body.style.cursor = "";
      }
    };
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    const work = smoothstep(0.15, 0.34, progress);
    group.current.position.z = -progress * 10;
    group.current.position.x = pointer.x * 0.18;
    group.current.position.y = pointer.y * 0.1;
    group.current.visible = work > 0.02;
    group.current.children.forEach((child, index) => {
      const object = child as THREE.Group;
      const ghost = ghosts[index];
      const state = ghostInteraction.current[index];
      if (!ghost || !state) return;
      const targetHover = hoveredGhost.current === index ? 1 : 0;
      state.hover = THREE.MathUtils.lerp(state.hover, targetHover, 0.14);
      state.pointer.lerp(state.targetPointer, targetHover ? 0.18 : 0.1);

      object.position.set(
        ghost.position.x + state.pointer.x * state.hover * 0.16,
        ghost.position.y + Math.sin(clock.elapsedTime * 0.24 + index) * 0.06 + state.pointer.y * state.hover * 0.12,
        ghost.position.z + state.hover * 0.42,
      );
      object.rotation.set(
        ghost.rotation.x - state.pointer.y * state.hover * 0.12,
        ghost.rotation.y + state.pointer.x * state.hover * 0.16,
        ghost.rotation.z + Math.sin(clock.elapsedTime * 0.18 + index) * 0.035,
      );
      const liftScale = ghost.scale * (1 + state.hover * 0.16);
      object.scale.setScalar(liftScale);

      const fill = object.children[1] as THREE.Mesh | undefined;
      const border = object.children[2] as THREE.LineSegments | undefined;
      const text = object.children[3] as THREE.Mesh | undefined;
      const fillMaterial = fill?.material as THREE.MeshBasicMaterial | undefined;
      const borderMaterial = border?.material as THREE.LineBasicMaterial | undefined;
      const textMaterial = text?.material as THREE.MeshBasicMaterial | undefined;
      if (fillMaterial) fillMaterial.opacity = ghostFillOpacity + (index % 3) * ghostFillVariance + state.hover * 0.08;
      if (borderMaterial) borderMaterial.opacity = ghostBorderOpacity + (index % 2) * ghostBorderVariance + state.hover * 0.68;
      if (textMaterial) textMaterial.opacity = ghostTextOpacity + state.hover * 0.42;
    });
  });

  return (
    <group ref={group} raycast={disableRaycast}>
      {ghosts.map((ghost, index) => (
        <group key={`${ghost.fragment.id}-${index}`} position={ghost.position} rotation={ghost.rotation} scale={ghost.scale} raycast={disableRaycast}>
          <mesh
            position={[0, 0, 0.18]}
            userData={{ type: "ghost-fragment", fragmentId: ghost.fragment.id }}
            onClick={handleGhostClick(ghost.fragment)}
            onPointerOver={handleGhostOver(index)}
            onPointerMove={handleGhostMove(index)}
            onPointerOut={handleGhostOut(index)}
          >
            <planeGeometry args={[4.8, 2.72]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh raycast={disableRaycast}>
            <planeGeometry args={[4.2, 2.28]} />
            <meshBasicMaterial
              color="#020407"
              transparent
              opacity={ghostFillOpacity + (index % 3) * ghostFillVariance}
              depthWrite={false}
              blending={THREE.NormalBlending}
            />
          </mesh>
          <lineSegments scale={[1.03, 1.04, 1]} raycast={disableRaycast}>
            <edgesGeometry args={[new THREE.BoxGeometry(4.25, 2.32, 0.04)]} />
            <lineBasicMaterial color="#e9f9ff" transparent opacity={ghostBorderOpacity + (index % 2) * ghostBorderVariance} blending={THREE.AdditiveBlending} />
          </lineSegments>
          <mesh position={[0, 0, 0.1]} raycast={disableRaycast}>
            <planeGeometry args={[3.7, 1.9]} />
            <meshBasicMaterial map={textTextures[index]} transparent opacity={ghostTextOpacity} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FluidRibbons({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null);
  const ribbons = useMemo(() => {
    const colors = [
      ["#3c6dff", "#ff7adf"],
      ["#6e4dff", "#ff9f1c"],
      ["#8c5cff", "#ffe59a"],
      ["#3c6dff", "#f8fbff"],
    ];
    return Array.from({ length: 12 }).map((_, i) => {
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uOpacity: { value: 0.24 },
          uA: { value: new THREE.Color(colors[i % colors.length][0]) },
          uB: { value: new THREE.Color(colors[i % colors.length][1]) },
        },
        vertexShader: ribbonVertex,
        fragmentShader: ribbonFragment,
      });
      return {
        material,
        position: new THREE.Vector3((i - 5.5) * 0.82, Math.sin(i * 1.2) * 1.2, -4 - i * 4.4),
        rotation: new THREE.Euler(0.05 * Math.sin(i), 0.14 * Math.cos(i), -0.28 + i * 0.052),
        scale: new THREE.Vector3(6.4 + i * 0.18, 0.42 + (i % 3) * 0.08, 1),
      };
    });
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    group.current.position.z = -progress * 46;
    group.current.rotation.y = pointer.x * 0.08;
    ribbons.forEach((ribbon, i) => {
      ribbon.material.uniforms.uTime.value = clock.elapsedTime + i * 0.4;
      ribbon.material.uniforms.uProgress.value = progress;
      ribbon.material.uniforms.uMouse.value.set(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5);
      ribbon.material.uniforms.uOpacity.value = 0.12 + smoothstep(0.16, 0.5, progress) * 0.22 + smoothstep(0.88, 1, progress) * 0.1;
    });
  });

  return (
    <group ref={group} raycast={disableRaycast}>
      {ribbons.map((ribbon, index) => (
        <mesh key={index} position={ribbon.position} rotation={ribbon.rotation} scale={ribbon.scale} raycast={disableRaycast}>
          <planeGeometry args={[1, 1, 96, 8]} />
          <primitive object={ribbon.material} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function ForegroundLightSheets({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null);
  const sheets = useMemo(
    () => {
      const sheetIndexes = window.innerWidth < 700 ? [0, 2, 3] : [0, 2, 3, 4];

      return sheetIndexes.map((index) => ({
        color: ["#d8c7ff", "#ffd7a8", "#b7d7ff", "#f2c6ff", "#c8fff4"][index],
        position: new THREE.Vector3((index - 2) * 2.4, Math.sin(index * 1.4) * 2.1, -4.5 - index * 9.4),
        rotation: new THREE.Euler(0.08 * Math.sin(index), index % 2 ? -0.32 : 0.32, -0.34 + index * 0.18),
        scale: new THREE.Vector3(4.2 + index * 0.34, 0.42 + (index % 2) * 0.18, 1),
      }));
    },
    [],
  );

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    const work = smoothstep(0.18, 0.85, progress);
    group.current.position.z = -progress * 34;
    group.current.rotation.y = pointer.x * 0.035;
    group.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh;
      mesh.position.y += Math.sin(clock.elapsedTime * 0.18 + index) * 0.001;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = (0.035 + (index % 2) * 0.018) * work;
    });
  });

  return (
    <group ref={group} raycast={disableRaycast}>
      {sheets.map((sheet, index) => (
        <mesh key={index} position={sheet.position} rotation={sheet.rotation} scale={sheet.scale} raycast={disableRaycast}>
          <planeGeometry args={[1, 1, 12, 2]} />
          <meshBasicMaterial color={sheet.color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function GoldenCore({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock, pointer }) => {
    if (!group.current || !sphere.current || !light.current) return;
    const open = smoothstep(0.16, 0.38, progress);
    const work = smoothstep(0.4, 0.82, progress);
    const outro = smoothstep(0.88, 1, progress);
    const pulse = 0.92 + Math.sin(clock.elapsedTime * 1.6) * 0.08;
    group.current.position.set(pointer.x * 0.22, -0.42 + pointer.y * 0.12, -3.4 - progress * 42);
    group.current.scale.setScalar((0.24 + open * 0.78 + outro * 0.48) * pulse);
    sphere.current.opacity = 0.08 + open * 0.28 + outro * 0.16;
    light.current.intensity = 0.5 + open * 2.4 + work * 0.7 + outro * 1.4;
  });

  return (
    <group ref={group} position={[0, -0.42, -3.4]}>
      <pointLight ref={light} color="#ffd36a" intensity={0.9} distance={13} decay={1.8} />
      <mesh raycast={disableRaycast}>
        <sphereGeometry args={[0.52, 48, 32]} />
        <meshBasicMaterial ref={sphere} color="#ffe59a" transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.08, 0.18 * Math.sin(i), (i * Math.PI) / 4]} scale={[1.55 + i * 0.16, 0.62 + i * 0.08, 1]} raycast={disableRaycast}>
          <torusGeometry args={[0.92 + i * 0.34, 0.012, 8, 96]} />
          <meshBasicMaterial color={i % 2 ? "#b7d7ff" : "#ffd7a8"} transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent({ progress, activeIndex, fragments, ambientFragments = fragments, onSelectFragment }: SceneProps) {
  const showLegacyEmotionCards = progress < 0.985;
  const primaryTexts = useMemo(() => new Set(fragments.map((fragment) => fragment.text.trim())), [fragments]);
  const activeGlowColor = fragments[activeIndex]?.glowColor ?? "#ffe59a";

  return (
    <>
      <fog attach="fog" args={["#050817", 10, 78]} />
      <ambientLight intensity={0.16} />
      <pointLight position={[0, 2.2, 3]} intensity={2.4} color="#ff9f1c" />
      <pointLight position={[-4, 2, -14]} intensity={3.8} color="#6e4dff" />
      <pointLight position={[4.5, -1.5, -30]} intensity={3.2} color="#ff7adf" />
      <CameraRig progress={progress} />
      <BackgroundWater progress={progress} />
      <DreamOrbitField progress={progress} />
      <TransitionSparkles progress={progress} />
      {showLegacyEmotionCards && (
        <GhostFragments
          progress={progress}
          fragments={ambientFragments}
          excludeTexts={primaryTexts}
          onSelectFragment={onSelectFragment}
        />
      )}
      <FluidRibbons progress={progress} />
      <ForegroundLightSheets progress={progress} />
      <ParticleField progress={progress} />
      <OrbitalFrame progress={progress} activeColor={activeGlowColor} />
      <SoftCursorTrace progress={progress} />
      <GoldenCore progress={progress} />
      {showLegacyEmotionCards && (
        <group>
          {fragments.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              progress={progress}
              index={index}
              activeIndex={activeIndex}
              onSelect={onSelectFragment}
            />
          ))}
        </group>
      )}
      <PostEffects />
    </>
  );
}

export default function Scene(props: SceneProps) {
  return (
    <Canvas
      className="webgl-canvas"
      camera={{ fov: 45, position: [0, 0.35, 7.5], near: 0.1, far: 130 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      dpr={[1, 2]}
      frameloop="always"
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
