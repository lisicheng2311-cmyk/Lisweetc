import { MOCK_EMOTION_FRAGMENTS, withFragmentPlacement, type EmotionFragment } from "../data/projects";

type DailyFragmentSource = Omit<EmotionFragment, "index" | "position" | "rotation">;

export const getTodaySeed = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const makeRandom = (seed: string) => {
  let state = hashString(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

export const seededShuffle = <T>(items: T[], seed: string) => {
  const random = makeRandom(seed);
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

export const getDailyFragments = (fragments: DailyFragmentSource[], seed = getTodaySeed(), limit = 12) => {
  const source = fragments.length > 0 ? fragments : MOCK_EMOTION_FRAGMENTS;
  const uniqueSource = source.filter((fragment, index, all) => all.findIndex((candidate) => candidate.text === fragment.text) === index);

  return seededShuffle(uniqueSource, seed)
    .slice(0, limit)
    .map((fragment, index) =>
      withFragmentPlacement(
        {
          id: fragment.id,
          text: fragment.text,
          emotion: fragment.emotion,
          author: fragment.author,
          createdAt: fragment.createdAt,
          glowColor: fragment.glowColor,
          title: fragment.title,
        },
        index,
      ),
    );
};
