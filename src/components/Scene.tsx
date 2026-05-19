import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import ProjectCard from "./ProjectCard";
import { PROJECTS } from "../data/projects";
import { clamp01, mix, smoothstep } from "../utils/math";
import { glslNoise } from "../utils/noise";

type SceneProps = {
  progress: number;
  activeIndex: number;
};

type UniformSet = {
  uTime: { value: number };
  uProgress: { value: number };
  uPixelRatio: { value: number };
  uMouse: { value: THREE.Vector2 };
};

const particleVertex = `
  attribute vec3 aHome;
  attribute vec3 aFlow;
  attribute float aSize;
  attribute float aPhase;
  attribute float aKind;

  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform vec2 uMouse;

  varying float vAlpha;
  varying float vKind;
  varying float vGlow;

  ${glslNoise}

  void main() {
    float open = smoothstep(0.18, 0.38, uProgress);
    float work = smoothstep(0.34, 0.86, uProgress);
    float returnMix = smoothstep(0.88, 1.0, uProgress);
    float burst = smoothstep(0.18, 0.34, uProgress) * (1.0 - smoothstep(0.38, 0.55, uProgress));

    vec3 pos = mix(aHome, aFlow, open);
    vec3 core = vec3(0.0, -0.08, -3.2 - uProgress * 38.0);
    vec3 dir = normalize(aFlow - core + vec3(0.001));
    pos += dir * burst * (2.2 + aKind * 1.4);

    float t = uTime * (0.18 + aKind * 0.1) + aPhase;
    float wave = fbm(pos.xy * 0.45 + vec2(uTime * 0.035, -uTime * 0.026));
    pos.x += sin(t + pos.z * 0.08) * (0.08 + work * 0.28);
    pos.y += cos(t * 1.2 + pos.x * 0.16) * (0.06 + work * 0.2);
    pos.z += sin(t * 1.5 + wave * 3.0) * (0.12 + work * 0.34);

    pos.x += (uMouse.x - 0.5) * (0.38 + work * 0.72);
    pos.y += (uMouse.y - 0.5) * (0.24 + work * 0.5);

    pos = mix(pos, aHome * 0.72 + vec3(0.0, 0.0, -58.0), returnMix * 0.72);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float distanceFade = clamp(1.0 + mvPosition.z * 0.026, 0.1, 1.0);
    float twinkle = 0.72 + 0.28 * sin(uTime * 2.2 + aPhase * 8.0);
    gl_PointSize = aSize * uPixelRatio * distanceFade * twinkle;
    gl_Position = projectionMatrix * mvPosition;

    vAlpha = distanceFade * (0.28 + open * 0.42 + burst * 0.42 + work * 0.18);
    vKind = aKind;
    vGlow = burst + smoothstep(0.32, 0.9, uProgress) * 0.55;
  }
`;

const particleFragment = `
  precision highp float;

  varying float vAlpha;
  varying float vKind;
  varying float vGlow;

  vec3 ramp(float k) {
    vec3 blue = vec3(0.235, 0.427, 1.0);
    vec3 indigo = vec3(0.431, 0.302, 1.0);
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
    color = mix(color, vec3(1.0, 0.95, 0.76), vGlow * 0.22);
    gl_FragColor = vec4(color * (core + halo * 1.6), (core + halo) * vAlpha);
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
    effectComposer.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 1.22, 0.72, 0.18));
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

  useFrame(({ clock, pointer }) => {
    if (!mesh.current || !mat.current) return;
    mesh.current.position.z = -18 - progress * 44;
    mesh.current.position.x = pointer.x * 0.35;
    mesh.current.position.y = pointer.y * 0.18;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uProgress.value = progress;
  });

  return (
    <mesh ref={mesh} position={[0, 0, -18]} scale={[36, 20, 1]}>
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
            vec3 color = mix(deep, blue, n);
            color = mix(color, violet, smoothstep(0.32, 0.9, n));
            color = mix(color, pink, smoothstep(0.74, 1.0, n) * 0.36);
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

      size[i] = hair ? 3.5 + Math.random() * 8.5 : 1.6 + Math.random() * 7.2;
      phase[i] = Math.random() * Math.PI * 2;
      kind[i] = hair ? 0.78 + Math.random() * 0.22 : Math.random() * 0.72;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(home, 3));
    geo.setAttribute("aHome", new THREE.BufferAttribute(home, 3));
    geo.setAttribute("aFlow", new THREE.BufferAttribute(flow, 3));
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
    points.current.rotation.y = pointer.x * 0.06 + progress * 0.16;
    points.current.rotation.x = pointer.y * 0.045;
  });

  return (
    <points ref={points} geometry={geometry}>
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
        }}
      />
    </points>
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
    <group ref={group}>
      {ribbons.map((ribbon, index) => (
        <mesh key={index} position={ribbon.position} rotation={ribbon.rotation} scale={ribbon.scale}>
          <planeGeometry args={[1, 1, 96, 8]} />
          <primitive object={ribbon.material} attach="material" />
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
    const pulse = 0.78 + Math.sin(clock.elapsedTime * 2.4) * 0.22;
    group.current.position.set(pointer.x * 0.22, -0.42 + pointer.y * 0.12, -3.4 - progress * 42);
    group.current.scale.setScalar((0.34 + open * 1.25 + outro * 0.85) * pulse);
    sphere.current.opacity = 0.18 + open * 0.68 + outro * 0.34;
    light.current.intensity = 1.2 + open * 8 + work * 2 + outro * 5;
  });

  return (
    <group ref={group} position={[0, -0.42, -3.4]}>
      <pointLight ref={light} color="#ffd36a" intensity={2.2} distance={18} decay={1.6} />
      <mesh>
        <sphereGeometry args={[0.52, 48, 32]} />
        <meshBasicMaterial ref={sphere} color="#ffe59a" transparent opacity={0.38} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, (i * Math.PI) / 4]}>
          <torusGeometry args={[0.92 + i * 0.34, 0.012, 8, 96]} />
          <meshBasicMaterial color={i % 2 ? "#ff7adf" : "#ffd36a"} transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent({ progress, activeIndex }: SceneProps) {
  return (
    <>
      <fog attach="fog" args={["#050817", 10, 78]} />
      <ambientLight intensity={0.16} />
      <pointLight position={[0, 2.2, 3]} intensity={2.4} color="#ff9f1c" />
      <pointLight position={[-4, 2, -14]} intensity={3.8} color="#6e4dff" />
      <pointLight position={[4.5, -1.5, -30]} intensity={3.2} color="#ff7adf" />
      <CameraRig progress={progress} />
      <BackgroundWater progress={progress} />
      <FluidRibbons progress={progress} />
      <ParticleField progress={progress} />
      <GoldenCore progress={progress} />
      <group>
        {PROJECTS.map((project, index) => (
          <ProjectCard key={project.id} project={project} progress={progress} index={index} activeIndex={activeIndex} />
        ))}
      </group>
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
