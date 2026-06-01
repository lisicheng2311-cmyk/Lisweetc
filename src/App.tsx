import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Lenis from "lenis";
import Scene from "./components/Scene";
import Navigation from "./components/Navigation";
import HeroVideo from "./components/HeroVideo";
import GardenLanding from "./components/GardenLanding";
import MusicToggle from "./components/MusicToggle";
import CosmicToast from "./components/CosmicToast";
import SubmittedFragmentEffect from "./components/SubmittedFragmentEffect";
import { EMOTION_TYPES, MOCK_EMOTION_FRAGMENTS, createFragmentPlacement, type EmotionFragment, type EmotionType } from "./data/projects";
import { getDailyFragments } from "./lib/dailyFragments";
import {
  createEmotionFragmentInSupabase,
  createLocalEmotionFragment,
  getStoredEmotionFragments,
  listEmotionFragmentsFromSupabase,
  saveStoredEmotionFragments,
} from "./services/emotionFragments";
import { clamp01 } from "./utils/math";

const emotionOptions: EmotionType[] = [...EMOTION_TYPES];
const MAX_EMOTION_TEXT_LENGTH = 80;

const handleGlassPointerMove = (event: PointerEvent<HTMLElement>) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const mx = (event.clientX - rect.left) / rect.width;
  const my = (event.clientY - rect.top) / rect.height;
  event.currentTarget.style.setProperty("--glass-mx", mx.toFixed(3));
  event.currentTarget.style.setProperty("--glass-my", my.toFixed(3));
  event.currentTarget.style.setProperty("--glass-rx", `${((0.5 - my) * 5.2).toFixed(2)}deg`);
  event.currentTarget.style.setProperty("--glass-ry", `${((mx - 0.5) * 6.4).toFixed(2)}deg`);
};

const handleGlassPointerLeave = (event: PointerEvent<HTMLElement>) => {
  event.currentTarget.style.setProperty("--glass-mx", "0.5");
  event.currentTarget.style.setProperty("--glass-my", "0.5");
  event.currentTarget.style.setProperty("--glass-rx", "0deg");
  event.currentTarget.style.setProperty("--glass-ry", "0deg");
};

const uniqueFragmentsByText = <T extends { text: string }>(fragments: T[]) => {
  const seen = new Set<string>();
  return fragments.filter((fragment) => {
    const key = fragment.text.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getTodayDisplayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
};

const detailPalettes = [
  { primary: "#ff9fca", secondary: "#ffd7a8", text: "#ffe6f1" },
  { primary: "#9fe7ff", secondary: "#b7d7ff", text: "#e4f7ff" },
  { primary: "#caa8ff", secondary: "#d8c7ff", text: "#efe7ff" },
  { primary: "#c8fff4", secondary: "#78c7ff", text: "#e5fff9" },
  { primary: "#ffe59a", secondary: "#ffb86b", text: "#fff3cf" },
  { primary: "#f2c6ff", secondary: "#ff9fca", text: "#fae7ff" },
  { primary: "#bfffdc", secondary: "#c8fff4", text: "#ebfff4" },
  { primary: "#b7b0ff", secondary: "#9fe7ff", text: "#ecebff" },
  { primary: "#aeb4c4", secondary: "#d5d8e2", text: "#eef0f6" },
];

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const smoothProgress = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const getDetailPaletteStyle = (fragment: EmotionFragment): CSSProperties => {
  const palette = detailPalettes[hashString(`${fragment.emotion}-${fragment.id}-${fragment.text}`) % detailPalettes.length];

  return {
    "--fragment-glow": fragment.glowColor,
    "--detail-primary": palette.primary,
    "--detail-secondary": palette.secondary,
    "--detail-text": palette.text,
  } as CSSProperties;
};

type SubmissionEffect = {
  id: number;
  glowColor: string;
  isLocal: boolean;
  message: string;
  text: string;
};

export default function App() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [dailyFragments, setDailyFragments] = useState<EmotionFragment[]>(() => getDailyFragments(MOCK_EMOTION_FRAGMENTS));
  const [ambientFragments, setAmbientFragments] = useState<EmotionFragment[]>(() =>
    MOCK_EMOTION_FRAGMENTS.map((fragment, index) => ({ ...fragment, ...createFragmentPlacement(index) })),
  );
  const [userFragments, setUserFragments] = useState<EmotionFragment[]>([]);
  const [selectedFragment, setSelectedFragment] = useState<EmotionFragment | null>(null);
  const [isLeavingEmotion, setIsLeavingEmotion] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftEmotion, setDraftEmotion] = useState<EmotionType>("calm");
  const [emotionFeedback, setEmotionFeedback] = useState("");
  const [isSubmittingEmotion, setIsSubmittingEmotion] = useState(false);
  const [submissionEffect, setSubmissionEffect] = useState<SubmissionEffect | null>(null);
  const [isGardenVideoReady, setIsGardenVideoReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFragments = async () => {
      let nextDailyFragments = getDailyFragments(MOCK_EMOTION_FRAGMENTS);
      let nextAmbientFragments = MOCK_EMOTION_FRAGMENTS.map((fragment, index) => ({ ...fragment, ...createFragmentPlacement(index) }));

      try {
        const remoteFragments = await listEmotionFragmentsFromSupabase();
        const uniqueRemoteFragments = uniqueFragmentsByText(remoteFragments);
        nextDailyFragments = getDailyFragments(uniqueRemoteFragments);
        nextAmbientFragments = uniqueRemoteFragments.map((fragment, index) => ({ ...fragment, ...createFragmentPlacement(index) }));
      } catch (error) {
        console.warn("Falling back to local emotion fragments.", error);
      }

      const storedFragments = uniqueFragmentsByText(getStoredEmotionFragments()).map((fragment, index) => ({
        ...fragment,
        ...createFragmentPlacement(nextDailyFragments.length + index),
      }));

      if (!isMounted) return;
      setDailyFragments(nextDailyFragments);
      setAmbientFragments(nextAmbientFragments);
      setUserFragments(storedFragments);
    };

    loadFragments();

    return () => {
      isMounted = false;
    };
  }, []);

  const fragments = useMemo(() => uniqueFragmentsByText([...dailyFragments, ...userFragments]), [dailyFragments, userFragments]);
  const ambientSceneFragments = useMemo(
    () => uniqueFragmentsByText([...ambientFragments, ...userFragments]),
    [ambientFragments, userFragments],
  );
  const lastProgressRef = useRef(0);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.35,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      wheelMultiplier: 0.68,
      touchMultiplier: 1.05,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const nextProgress = clamp01(window.scrollY / max);
      if (Math.abs(nextProgress - lastProgressRef.current) < 0.00035 && nextProgress > 0 && nextProgress < 1) return;
      lastProgressRef.current = nextProgress;
      setScrollProgress(nextProgress);
    };

    lenis.on("scroll", update);
    update();
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const thirdPageOpacity = smoothProgress((scrollProgress - 0.76) / 0.18);
    const secondPageOpacity = 1 - thirdPageOpacity;
    const transitionBackdropOpacity =
      smoothProgress((scrollProgress - 0.7) / 0.08) * (1 - smoothProgress((scrollProgress - 0.95) / 0.05));

    document.body.classList.toggle("is-work", scrollProgress > 0.28 && scrollProgress < 0.72);
    document.body.classList.toggle("is-outro", scrollProgress >= 0.62 && scrollProgress < 0.86);
    document.body.classList.toggle("is-garden", scrollProgress >= 0.78);
    document.body.style.setProperty("--page-progress", String(scrollProgress));
    document.body.style.setProperty("--garden-ready", isGardenVideoReady ? "1" : "0");
    document.body.style.setProperty("--second-page-opacity", String(isGardenVideoReady ? secondPageOpacity : 1));
    document.body.style.setProperty("--third-page-opacity", String(thirdPageOpacity));
    document.body.style.setProperty("--transition-backdrop-opacity", String(transitionBackdropOpacity));
  }, [isGardenVideoReady, scrollProgress]);

  const activeIndex = useMemo(() => {
    const projectStart = 0.3;
    const projectEnd = 0.7;
    const local = clamp01((scrollProgress - projectStart) / (projectEnd - projectStart));
    return Math.min(fragments.length - 1, Math.floor(local * fragments.length));
  }, [fragments.length, scrollProgress]);
  const activeFragment = fragments[activeIndex] ?? null;

  const handleSelectFragment = (fragment: EmotionFragment) => {
    if (import.meta.env.DEV) {
      console.log("clicked fragment:", fragment.text, fragment.id);
      console.log("active fragment:", activeFragment?.text, activeFragment?.id);
    }

    setEmotionFeedback("");
    setSelectedFragment(fragment);
  };

  const handleLeaveEmotion = (fragment: EmotionFragment | null) => {
    setEmotionFeedback("");
    setSelectedFragment(fragment ?? fragments[0] ?? MOCK_EMOTION_FRAGMENTS[0]);
    setIsLeavingEmotion(true);
  };

  const handleSubmitEmotion = async () => {
    if (isSubmittingEmotion) return;

    const text = draftText.trim();
    if (!text) {
      setEmotionFeedback("请先留下一句轻轻的话。");
      return;
    }

    if (text.length > MAX_EMOTION_TEXT_LENGTH) {
      setEmotionFeedback("这片宇宙更适合轻声短句。");
      return;
    }

    const input = { text, emotion: draftEmotion, author: "visitor" };
    let next: EmotionFragment;
    let isLocal = false;
    let message = "你的情绪已进入宇宙";

    setIsSubmittingEmotion(true);

    try {
      const inserted = await createEmotionFragmentInSupabase(input);
      next = { ...inserted, ...createFragmentPlacement(fragments.length), title: "YOUR SIGNAL" };
      setEmotionFeedback(message);
    } catch (error) {
      console.warn("Saving emotion fragment locally.", error);
      next = createLocalEmotionFragment(input, fragments.length, (fragment, index) => ({ ...fragment, ...createFragmentPlacement(index) }));
      saveStoredEmotionFragments([...getStoredEmotionFragments(), next]);
      isLocal = true;
      message = "你的情绪已暂存在本地宇宙";
      setEmotionFeedback(message);
    } finally {
      setIsSubmittingEmotion(false);
    }

    setUserFragments((current) => (current.some((fragment) => fragment.id === next.id) ? current : [...current, next]));
    setSubmissionEffect({
      id: Date.now(),
      glowColor: next.glowColor,
      isLocal,
      message,
      text: next.text,
    });
    setSelectedFragment(null);
    setDraftText("");
    setIsLeavingEmotion(false);
  };

  const introOpacity = Math.max(0, 1 - scrollProgress * 5.1);
  const bridgeOpacity = clamp01((scrollProgress - 0.17) / 0.12) * (1 - clamp01((scrollProgress - 0.48) / 0.1));
  const outroOpacity = clamp01((scrollProgress - 0.6) / 0.1) * (1 - clamp01((scrollProgress - 0.82) / 0.09));
  const finalCamera = smoothProgress((scrollProgress - 0.78) / 0.18);
  const outroCameraStyle: CSSProperties = {
    opacity: outroOpacity * (1 - finalCamera * 0.74),
    transform: `translate3d(-50%, ${(-28 * finalCamera).toFixed(2)}px, 0) scale(${(1 - finalCamera * 0.055).toFixed(4)}) rotateX(${(finalCamera * 5).toFixed(2)}deg)`,
    filter: `brightness(${(1 - finalCamera * 0.34).toFixed(3)}) blur(${(finalCamera * 7).toFixed(2)}px)`,
  };

  return (
    <>
      <HeroVideo progress={scrollProgress} />
      <Scene
        progress={scrollProgress}
        activeIndex={activeIndex}
        fragments={fragments}
        ambientFragments={ambientSceneFragments}
        onSelectFragment={handleSelectFragment}
      />
      <Navigation progress={scrollProgress} activeIndex={activeIndex} fragments={fragments} />
      <MusicToggle />
      <GardenLanding progress={scrollProgress} onVideoReadyChange={setIsGardenVideoReady} />
      <div className="page-transition-backdrop" aria-hidden="true" />
      {submissionEffect && (
        <>
          <CosmicToast
            id={submissionEffect.id}
            glowColor={submissionEffect.glowColor}
            message={submissionEffect.message}
            onDone={() => undefined}
          />
          <SubmittedFragmentEffect
            id={submissionEffect.id}
            glowColor={submissionEffect.glowColor}
            isLocal={submissionEffect.isLocal}
            text={submissionEffect.text}
            onDone={() => setSubmissionEffect((current) => (current?.id === submissionEffect.id ? null : current))}
          />
        </>
      )}
      {selectedFragment && (
        <section
          className="emotion-detail-layer"
          aria-label="Emotion fragment detail"
          style={getDetailPaletteStyle(selectedFragment)}
        >
          <button className="emotion-detail-backdrop" type="button" aria-label="Close emotion detail" onClick={() => setSelectedFragment(null)} />
          <div className="emotion-detail-panel glass-depth-card" onPointerMove={handleGlassPointerMove} onPointerLeave={handleGlassPointerLeave}>
            <button className="emotion-detail-close" type="button" aria-label="Close emotion detail" onClick={() => setSelectedFragment(null)}>
              ×
            </button>
            <p>{selectedFragment.title}</p>
            <h2>{selectedFragment.text}</h2>
            <span>{selectedFragment.emotion.toUpperCase()} / {getTodayDisplayDate()}</span>
            {emotionFeedback && <strong className="emotion-feedback">{emotionFeedback}</strong>}
            {!isLeavingEmotion ? (
              <button
                className="emotion-primary-action"
                type="button"
                onClick={() => {
                  setEmotionFeedback("");
                  setIsLeavingEmotion(true);
                }}
              >
                留下我的情绪
              </button>
            ) : (
              <div className="emotion-form">
                <textarea
                  value={draftText}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraftText(value);
                    if (value.trim().length > MAX_EMOTION_TEXT_LENGTH) {
                      setEmotionFeedback("这片宇宙更适合轻声短句。");
                    } else if (emotionFeedback) {
                      setEmotionFeedback("");
                    }
                  }}
                  maxLength={96}
                  placeholder="把一句话交给这片宇宙..."
                />
                <div className="emotion-form-row">
                  <select value={draftEmotion} onChange={(event) => setDraftEmotion(event.target.value as EmotionType)} aria-label="Emotion type">
                    {emotionOptions.map((emotion) => (
                      <option key={emotion} value={emotion}>
                        {emotion}
                      </option>
                    ))}
                  </select>
                  <button
                    className="emotion-primary-action"
                    type="button"
                    onClick={handleSubmitEmotion}
                    disabled={isSubmittingEmotion}
                    aria-busy={isSubmittingEmotion}
                  >
                    {isSubmittingEmotion ? "正在送入..." : "送入宇宙"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <main className="content-shell" aria-label="Dream field scroll narrative">
        <section className="snap-section intro-section">
          <div className="intro-copy dream-title" style={{ opacity: introOpacity }}>
            <p>Welcome Home</p>
            <h1>DREAM FIELD</h1>
          </div>
          <div className="scroll-hint" style={{ opacity: Math.max(0, 1 - scrollProgress * 4.4) }}>
            <span>SCROLL TO UNFOLD</span>
            <i />
          </div>
        </section>

        <section className="snap-section bridge-section" id="work">
          <div className="bridge-copy" style={{ opacity: bridgeOpacity }}>
            <p>emotion galaxy</p>
            <h2>INNER SPACE</h2>
          </div>
        </section>

        <section className="snap-section project-section" aria-label="Flow transition field">
          <div className="transition-field" aria-hidden="true" />
        </section>

        <section className="snap-section outro-section" id="contact">
          <div className="outro-copy" style={outroCameraStyle}>
            <p>current returns</p>
          </div>
        </section>

        <section className="snap-section garden-scroll-section" aria-label="Dream garden landing" />
      </main>
    </>
  );
}
