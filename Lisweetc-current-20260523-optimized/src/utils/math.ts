import * as THREE from "three";

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const tempVector = new THREE.Vector3();
