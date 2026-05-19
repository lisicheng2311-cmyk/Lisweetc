import type { CSSProperties } from "react";

type HeroVideoProps = {
  progress: number;
};

export default function HeroVideo({ progress }: HeroVideoProps) {
  const fadeOut = Math.min(1, Math.max(0, (progress - 0.2) / 0.18));
  const goldBloom = Math.min(1, Math.max(0, (progress - 0.16) / 0.18));
  const scale = 1 + progress * 0.11;
  const opacity = Math.max(0, 0.92 - fadeOut * 0.78);
  const blur = fadeOut * 10;

  return (
    <section
      className="hero-video-stage"
      style={
        {
          "--video-opacity": opacity,
          "--video-scale": scale,
          "--video-blur": `${blur}px`,
          "--gold-bloom": goldBloom,
        } as CSSProperties
      }
      aria-label="Reference motion hero"
    >
      <div className="hero-video-window">
        <video src="/media/hero-reference.mp4" muted playsInline preload="auto" autoPlay loop />
        <div className="hero-video-grade" aria-hidden="true" />
      </div>
    </section>
  );
}
