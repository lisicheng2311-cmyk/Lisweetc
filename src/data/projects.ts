import { projectPalette } from "../utils/palette";

export type Project = {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  color: string;
  secondary: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

const names = [
  ["echo", "01", "E.C.H.O.", "A luminous sound-current installation"],
  ["frontier", "02", "FRONTIER WITHIN", "Biometric dream field and inner cartography"],
  ["horizons", "03", "SUSTAINABLE HORIZONS", "A living atlas of water, light, and climate"],
  ["patronus", "04", "DISCOVER YOUR PATRONUS", "A ritual of character, particles, and glow"],
  ["chile", "05", "CHILE 20", "Orange-gold launch chamber in motion"],
  ["lab", "06", "THE LAB", "Prototype pool for fluid interactive systems"],
] as const;

export const PROJECTS: Project[] = names.map(([id, index, title, subtitle], i) => ({
  id,
  index,
  title,
  subtitle,
  color: projectPalette[i].color,
  secondary: projectPalette[i].secondary,
  position: [
    i % 2 === 0 ? -2.7 + i * 0.12 : 2.45 - i * 0.1,
    Math.sin(i * 1.28) * 0.62,
    -10 - i * 8.8,
  ],
  rotation: [
    Math.sin(i) * 0.08,
    (i % 2 === 0 ? 0.34 : -0.34) + Math.sin(i * 1.7) * 0.05,
    Math.cos(i * 0.9) * 0.05,
  ],
}));
