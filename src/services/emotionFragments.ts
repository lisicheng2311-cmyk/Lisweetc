import { supabase } from "../lib/supabase";
import { getTodaySeed } from "../lib/dailyFragments";
import { EMOTION_TYPES, type EmotionFragment, type EmotionType } from "../data/projects";

export type CreateEmotionFragmentInput = {
  text: string;
  emotion: EmotionType;
  author?: string;
};

type EmotionFragmentRow = {
  id: string;
  text: string;
  emotion: string;
  glow_color: string | null;
  author: string | null;
  created_at: string;
  is_public: boolean;
  date_seed: string | null;
};

const LOCAL_STORAGE_KEY = "lisweetc.emotionFragments.v1";
const EMOTION_FRAGMENTS_TABLE = "emotion_fragments";
const validEmotions = new Set<EmotionType>(EMOTION_TYPES);

export const getStoredEmotionFragments = (): EmotionFragment[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredEmotionFragments = (fragments: EmotionFragment[]) => {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fragments));
};

export const emotionGlowColor = (emotion: EmotionType) => {
  const colors: Record<EmotionType, string> = {
    calm: "#78c7ff",
    lonely: "#7f8dff",
    soft: "#f0d8ff",
    quiet: "#d8c7ff",
    happy: "#ffd7a8",
    hopeful: "#ffd36a",
    anxious: "#ff9fca",
  };

  return colors[emotion];
};

const normalizeEmotion = (emotion: string): EmotionType => (validEmotions.has(emotion as EmotionType) ? (emotion as EmotionType) : "calm");

const rowToFragment = (row: EmotionFragmentRow): Omit<EmotionFragment, "index" | "position" | "rotation"> => {
  const emotion = normalizeEmotion(row.emotion);

  return {
    id: row.id,
    text: row.text,
    emotion,
    author: row.author ?? undefined,
    createdAt: row.created_at,
    glowColor: row.glow_color ?? emotionGlowColor(emotion),
    title: row.author ? "VISITOR SIGNAL" : "DREAM SIGNAL",
  };
};

export const createLocalEmotionFragment = (
  input: CreateEmotionFragmentInput,
  index: number,
  place: (fragment: Omit<EmotionFragment, "index" | "position" | "rotation">, index: number) => EmotionFragment,
): EmotionFragment =>
  place(
    {
      id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text: input.text,
      emotion: input.emotion,
      author: input.author,
      createdAt: new Date().toISOString(),
      glowColor: emotionGlowColor(input.emotion),
      title: "YOUR SIGNAL",
    },
    index,
  );

export const listEmotionFragmentsFromSupabase = async (): Promise<Omit<EmotionFragment, "index" | "position" | "rotation">[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(EMOTION_FRAGMENTS_TABLE)
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  console.log(`[Supabase] emotion_fragments rows loaded: ${data?.length ?? 0}`);

  return (data ?? []).map((row) => rowToFragment(row as EmotionFragmentRow));
};

export const createEmotionFragmentInSupabase = async (
  input: CreateEmotionFragmentInput,
): Promise<Omit<EmotionFragment, "index" | "position" | "rotation">> => {
  if (!supabase) {
    throw new Error("Supabase environment variables are missing.");
  }

  const createdAt = new Date().toISOString();
  const glowColor = emotionGlowColor(input.emotion);
  const { data, error } = await supabase
    .from(EMOTION_FRAGMENTS_TABLE)
    .insert({
      text: input.text,
      emotion: input.emotion,
      glow_color: glowColor,
      author: input.author ?? null,
      created_at: createdAt,
      is_public: true,
      date_seed: getTodaySeed(),
    })
    .select("id,text,emotion,glow_color,author,created_at,is_public,date_seed")
    .single();

  if (error) {
    throw error;
  }

  return rowToFragment(data as EmotionFragmentRow);
};
