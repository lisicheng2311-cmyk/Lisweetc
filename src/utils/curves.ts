import * as THREE from "three";

export function createHourglassPoints(count: number, height = 6.2, radius = 1.18) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    const a = t * Math.PI * 2;
    const y = (t - 0.5) * height;
    const waist = Math.abs(t - 0.5) * 2;
    const r = radius * (0.18 + waist * 0.85);
    const x = Math.sin(a) * r;
    const z = Math.sin(a * 2) * 0.52;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

export function createInfinityPoints(count: number, scale = 1.55) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i / Math.max(1, count - 1)) * Math.PI * 2;
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const x = (scale * Math.cos(t)) / denom;
    const y = (scale * Math.sin(t) * Math.cos(t)) / denom;
    const z = Math.sin(t * 2) * 0.42;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}
