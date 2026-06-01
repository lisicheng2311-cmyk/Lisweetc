import { useEffect, useMemo, useRef, useState } from "react";
import "./InteractiveShowcase.css";

type ShowcaseCard = {
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
};

const showcaseCards: ShowcaseCard[] = [
  {
    eyebrow: "soft signal",
    title: "把光留在中途",
    body: "一组轻盈的玻璃卡片跟随视线漂移，像梦境里被慢慢点亮的坐标。",
    accent: "#ffe59a",
  },
  {
    eyebrow: "quiet orbit",
    title: "让情绪有轨迹",
    body: "粒子从卡片边缘滑过，保留原页面的宇宙感，但所有形状和路径都是重新生成。",
    accent: "#9fe7ff",
  },
  {
    eyebrow: "gentle current",
    title: "在滑动里切换",
    body: "横向切换保持克制，鼠标只带来轻微深度，不抢走原网站的叙事。",
    accent: "#ff9fca",
  },
];

function useMouseParallax() {
  const ref = useRef<HTMLElement | null>(null);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const nextX = Math.max(0, Math.min(1, x));
      const nextY = Math.max(0, Math.min(1, y));
      element.style.setProperty("--mx", String(nextX));
      element.style.setProperty("--my", String(nextY));
      setPointer({ x: nextX, y: nextY });
    };

    const handlePointerLeave = () => {
      element.style.setProperty("--mx", "0.5");
      element.style.setProperty("--my", "0.5");
      setPointer({ x: 0.5, y: 0.5 });
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return { ref, pointer };
}

function ParticleBackground({ pointer, activeIndex }: { pointer: { x: number; y: number }; activeIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: 96 }, (_, index) => ({
        x: (index * 37) % 100,
        y: (index * 61) % 100,
        depth: 0.35 + ((index * 17) % 100) / 130,
        phase: index * 0.73,
        speed: 0.18 + ((index * 19) % 100) / 420,
      })),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      frame += 0.016;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      particles.forEach((particle, index) => {
        const drift = frame * particle.speed + activeIndex * 0.72;
        const pullX = (pointer.x - 0.5) * 80 * particle.depth;
        const pullY = (pointer.y - 0.5) * 52 * particle.depth;
        const x = ((particle.x + Math.sin(drift + particle.phase) * 7 + activeIndex * 8) / 100) * width + pullX;
        const y = ((particle.y + Math.cos(drift * 0.82 + particle.phase) * 9) / 100) * height + pullY;
        const size = 0.9 + particle.depth * 2.2;
        const opacity = 0.14 + particle.depth * 0.2;
        const hue = index % 3 === 0 ? "255, 229, 154" : index % 3 === 1 ? "159, 231, 255" : "255, 159, 202";

        const gradient = context.createRadialGradient(x, y, 0, x, y, size * 8);
        gradient.addColorStop(0, `rgba(${hue}, ${opacity})`);
        gradient.addColorStop(1, `rgba(${hue}, 0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, size * 8, 0, Math.PI * 2);
        context.fill();

        if (index % 7 === activeIndex) {
          context.strokeStyle = `rgba(${hue}, 0.12)`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(x, y);
          context.quadraticCurveTo(x + pullX * 0.22, y - 28, x + Math.sin(drift) * 58, y + Math.cos(drift) * 38);
          context.stroke();
        }
      });

      context.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [activeIndex, particles, pointer.x, pointer.y]);

  return <canvas className="interactive-particles" ref={canvasRef} aria-hidden="true" />;
}

function GlassCards({ cards, activeIndex, setActiveIndex }: { cards: ShowcaseCard[]; activeIndex: number; setActiveIndex: (index: number) => void }) {
  return (
    <div className="interactive-card-track" style={{ "--active-card": activeIndex } as React.CSSProperties}>
      {cards.map((card, index) => {
        const offset = index - activeIndex;
        return (
          <article
            className="interactive-glass-card"
            key={card.title}
            style={{ "--card-accent": card.accent, "--card-offset": offset, "--card-distance": Math.abs(offset) } as React.CSSProperties}
            aria-current={activeIndex === index}
            onMouseEnter={() => setActiveIndex(index)}
          >
            <span>{card.eyebrow}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        );
      })}
    </div>
  );
}

function ScrollTransition({ activeIndex, setActiveIndex }: { activeIndex: number; setActiveIndex: (index: number) => void }) {
  return (
    <div className="interactive-controls" aria-label="Interactive showcase slides">
      {showcaseCards.map((card, index) => (
        <button
          key={card.title}
          type="button"
          className={activeIndex === index ? "is-active" : ""}
          onClick={() => setActiveIndex(index)}
          aria-label={`Show ${card.title}`}
        >
          <span />
        </button>
      ))}
    </div>
  );
}

export default function InteractiveShowcase() {
  const { ref, pointer } = useMouseParallax();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % showcaseCards.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="interactive-showcase" ref={ref} aria-label="Interactive dream showcase">
      <ParticleBackground pointer={pointer} activeIndex={activeIndex} />
      <div className="interactive-depth-layer depth-a" aria-hidden="true" />
      <div className="interactive-depth-layer depth-b" aria-hidden="true" />
      <div className="interactive-showcase-copy">
        <p>interactive middle field</p>
        <h2>温柔的光，在这里慢慢转身</h2>
      </div>
      <GlassCards cards={showcaseCards} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      <ScrollTransition activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
    </section>
  );
}
