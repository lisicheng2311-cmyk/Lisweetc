import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Lenis from "lenis";
import Scene from "./components/Scene";
import Navigation from "./components/Navigation";
import HeroVideo from "./components/HeroVideo";
import GardenLanding from "./components/GardenLanding";
import InteractiveShowcase from "./components/InteractiveShowcase";
import MusicToggle from "./components/MusicToggle";
import CosmicToast from "./components/CosmicToast";
import SubmittedFragmentEffect from "./components/SubmittedFragmentEffect";
import { MOCK_EMOTION_FRAGMENTS, createFragmentPlacement, type EmotionFragment, type EmotionType } from "./data/projects";
import { getDailyFragments } from "./lib/dailyFragments";
import {
  createEmotionFragmentInSupabase,
  createLocalEmotionFragment,
  getStoredEmotionFragments,
  listEmotionFragmentsFromSupabase,
  saveStoredEmotionFragments,
} from "./services/emotionFragments";
import { clamp01 } from "./utils/math";

const emotionOptions: EmotionType[] = ["moonlight", "starlight", "silence", "dream", "echo", "drift", "aurora"];
const MAX_EMOTION_TEXT_LENGTH = 80;

const uniqueFragmentsByText = <T extends { text: string }>(fragments: T[]) => {
  const seen = new Set<string>();
  return fragments.filter((fragment) => {
    const key = fragment.text.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const [draftEmotion, setDraftEmotion] = useState<EmotionType>("moonlight");
  const [emotionFeedback, setEmotionFeedback] = useState("");
  const [isSubmittingEmotion, setIsSubmittingEmotion] = useState(false);
  const [submissionEffect, setSubmissionEffect] = useState<SubmissionEffect | null>(null);

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
    document.body.classList.toggle("is-work", scrollProgress > 0.28 && scrollProgress < 0.72);
    document.body.classList.toggle("is-outro", scrollProgress >= 0.62 && scrollProgress < 0.86);
    document.body.classList.toggle("is-garden", scrollProgress >= 0.9);
    document.body.style.setProperty("--page-progress", String(scrollProgress));
  }, [scrollProgress]);

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
      <GardenLanding progress={scrollProgress} />
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
          style={{ "--fragment-glow": selectedFragment.glowColor } as CSSProperties}
        >
          <button className="emotion-detail-backdrop" type="button" aria-label="Close emotion detail" onClick={() => setSelectedFragment(null)} />
          <div className="emotion-detail-panel">
            <button className="emotion-detail-close" type="button" aria-label="Close emotion detail" onClick={() => setSelectedFragment(null)}>
              ×
            </button>
            <p>{selectedFragment.title}</p>
            <h2>{selectedFragment.text}</h2>
            <span>{selectedFragment.emotion.toUpperCase()} / {new Date(selectedFragment.createdAt).toLocaleDateString("zh-CN")}</span>
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
            <p>Fluid Interactive Experience</p>
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
          <InteractiveShowcase />
          <div className="transition-field" aria-hidden="true" />
        </section>

        <section className="snap-section outro-section" id="contact">
          <div className="outro-copy" style={{ opacity: outroOpacity }}>
            <p>current returns</p>
          </div>
        </section>

        <section className="snap-section garden-scroll-section" aria-label="Dream garden landing" />
      </main>
    </>
  );
}
