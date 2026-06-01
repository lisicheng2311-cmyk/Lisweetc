export const EMOTION_TYPES = [
  "calm",
  "lonely",
  "soft",
  "quiet",
  "happy",
  "hopeful",
  "anxious",
] as const;

export type EmotionType = (typeof EMOTION_TYPES)[number];

export type EmotionFragment = {
  id: string;
  text: string;
  emotion: EmotionType;
  author?: string;
  createdAt: string;
  glowColor: string;
  title: string;
  index: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

const fragmentSeeds = [
  {
    id: "light-crack",
    text: "光会穿过裂缝。",
    emotion: "hopeful",
    title: "MEMORY FRAGMENT",
    glowColor: "#ffe59a",
  },
  {
    id: "far-walk",
    text: "你已经走了很远。",
    emotion: "calm",
    title: "EMOTION TRACE",
    glowColor: "#78c7ff",
  },
  {
    id: "near-light",
    text: "总有一束光，正在靠近你。",
    emotion: "hopeful",
    title: "DREAM SIGNAL",
    glowColor: "#ffd36a",
  },
  {
    id: "slow-day",
    text: "今天慢一点，也没关系。",
    emotion: "soft",
    title: "SOFT CURRENT",
    glowColor: "#ff9fca",
  },
  {
    id: "quiet-self",
    text: "愿你在安静里重新找到自己。",
    emotion: "soft",
    title: "INNER ORBIT",
    glowColor: "#b998ff",
  },
  {
    id: "unsaid-space",
    text: "把没说出口的话，交给宇宙。",
    emotion: "lonely",
    title: "STARRY LETTER",
    glowColor: "#7f8dff",
  },
] as const;

export const createFragmentPlacement = (index: number) => ({
  index: String(index + 1).padStart(2, "0"),
  position: [
    [-4.25, 3.95, -1.55, 2.15, -3.1, 4.85][index % 6] + Math.sin(index * 1.37) * 0.42,
    [1.62, -1.24, 0.42, 1.05, -1.72, -0.18][index % 6] + Math.sin(index * 1.18) * 0.36,
    -8.8 - index * 7.15,
  ] as [number, number, number],
  rotation: [
    Math.sin(index * 0.9) * 0.08,
    (index % 2 === 0 ? 0.34 : -0.36) + Math.sin(index * 1.7) * 0.05,
    Math.cos(index * 0.82) * 0.05,
  ] as [number, number, number],
});

export const withFragmentPlacement = (fragment: Omit<EmotionFragment, "index" | "position" | "rotation">, index: number): EmotionFragment => ({
  ...fragment,
  ...createFragmentPlacement(index),
});

export const MOCK_EMOTION_FRAGMENTS: EmotionFragment[] = fragmentSeeds.map((fragment, index) =>
  withFragmentPlacement(
    {
      ...fragment,
      createdAt: new Date().toISOString(),
    },
    index,
  ),
);

export const PROJECTS = MOCK_EMOTION_FRAGMENTS;
export type Project = EmotionFragment;
