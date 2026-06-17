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
  {
    id: "dream-signal",
    text: "沉默很长，但它不会真的吞没你啊。",
    emotion: "quiet",
    title: "DREAM SIGNAL",
    glowColor: "#caa8ff",
  },
  {
    id: "calm-window",
    text: "别追着光跑，先在原地安静坐下来。",
    emotion: "calm",
    title: "CALM WINDOW",
    glowColor: "#b7d7ff",
  },
  {
    id: "soft-return",
    text: "漂着也没关系，岸会在某个地方出现。",
    emotion: "soft",
    title: "SOFT RETURN",
    glowColor: "#ffb6df",
  },
  {
    id: "star-note",
    text: "把很小的愿望，也认真放进星云里。",
    emotion: "hopeful",
    title: "STAR NOTE",
    glowColor: "#fff0a8",
  },
  {
    id: "quiet-door",
    text: "火光低低地替你守着一小圈旧梦。",
    emotion: "quiet",
    title: "QUIET DOOR",
    glowColor: "#ffb86b",
  },
  {
    id: "moon-echo",
    text: "你不用立刻回答，月亮会等一会儿。",
    emotion: "lonely",
    title: "MOON ECHO",
    glowColor: "#aeb4ff",
  },
  {
    id: "small-orbit",
    text: "那些偏离轨道的心事，也有自己的方向。",
    emotion: "anxious",
    title: "SMALL ORBIT",
    glowColor: "#9fe7ff",
  },
  {
    id: "late-spark",
    text: "今天晚一点亮起来，也完全来得及。",
    emotion: "happy",
    title: "LATE SPARK",
    glowColor: "#ffd7a8",
  },
  {
    id: "hidden-tide",
    text: "有些潮汐不说话，只慢慢把你送远。",
    emotion: "calm",
    title: "HIDDEN TIDE",
    glowColor: "#78c7ff",
  },
  {
    id: "gentle-static",
    text: "噪声里也藏着柔软的回信。",
    emotion: "soft",
    title: "GENTLE STATIC",
    glowColor: "#f2c6ff",
  },
  {
    id: "far-lantern",
    text: "远处那盏灯，不催你，只提醒你还在路上。",
    emotion: "hopeful",
    title: "FAR LANTERN",
    glowColor: "#ffe59a",
  },
  {
    id: "blue-pocket",
    text: "把疲惫折小一点，放进口袋。",
    emotion: "quiet",
    title: "BLUE POCKET",
    glowColor: "#c8fff4",
  },
  {
    id: "soft-collision",
    text: "愿你和明天相撞时，是轻轻的。",
    emotion: "hopeful",
    title: "SOFT COLLISION",
    glowColor: "#ff9fca",
  },
  {
    id: "night-rail",
    text: "别怕走得慢，星轨本来就很长。",
    emotion: "calm",
    title: "NIGHT RAIL",
    glowColor: "#b998ff",
  },
  {
    id: "quiet-comet",
    text: "小小的勇气，也可以拖出一条尾焰。",
    emotion: "happy",
    title: "QUIET COMET",
    glowColor: "#ffcf7a",
  },
  {
    id: "deep-breath",
    text: "深呼吸，宇宙没有要求你完美。",
    emotion: "soft",
    title: "DEEP BREATH",
    glowColor: "#bfffdc",
  },
] as const;

const fragmentLayout: Array<[number, number, number, number, number, number]> = [
  [-6.65, 2.78, -8.4, 0.1, 0.42, -0.12],
  [-1.42, 1.28, -12.8, -0.06, -0.28, 0.04],
  [3.72, -1.38, -15.6, 0.08, 0.24, -0.03],
  [6.95, -1.58, -19.4, -0.03, -0.4, 0.08],
  [-7.25, -2.72, -22.6, 0.12, 0.48, -0.16],
  [0.34, 2.88, -26.2, -0.1, -0.34, 0.11],
  [7.9, 2.76, -30.4, 0.08, -0.5, 0.15],
  [-4.68, -1.58, -34.6, -0.08, 0.36, -0.07],
  [3.18, -3.05, -38.8, 0.13, -0.2, 0.18],
  [-8.55, 1.72, -43.2, 0.04, 0.56, -0.2],
  [5.32, 2.18, -47.4, -0.11, -0.46, 0.12],
  [-2.42, -3.22, -52.2, 0.1, 0.22, -0.11],
  [8.28, -2.82, -56.8, -0.04, -0.58, 0.19],
  [-6.12, 3.18, -61.4, 0.12, 0.44, -0.18],
  [1.52, -2.12, -66.0, -0.08, -0.32, 0.05],
  [6.48, 1.06, -70.8, 0.06, 0.3, -0.13],
  [-8.0, -1.82, -75.6, -0.12, 0.54, 0.16],
  [3.92, 3.1, -80.4, 0.11, -0.42, -0.15],
];

export const createFragmentPlacement = (index: number) => ({
  index: String(index + 1).padStart(2, "0"),
  position: [
    fragmentLayout[index % fragmentLayout.length][0] + Math.sin(index * 1.37) * 0.28,
    fragmentLayout[index % fragmentLayout.length][1] + Math.sin(index * 1.18) * 0.22,
    fragmentLayout[index % fragmentLayout.length][2] - Math.floor(index / fragmentLayout.length) * 5.6,
  ] as [number, number, number],
  rotation: [
    fragmentLayout[index % fragmentLayout.length][3] + Math.sin(index * 0.9) * 0.04,
    fragmentLayout[index % fragmentLayout.length][4] + Math.sin(index * 1.7) * 0.04,
    fragmentLayout[index % fragmentLayout.length][5] + Math.cos(index * 0.82) * 0.035,
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
