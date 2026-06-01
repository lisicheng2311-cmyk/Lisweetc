import type { CSSProperties } from "react";

type GardenLandingProps = {
  progress: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const range = (value: number, start: number, end: number) => clamp01((value - start) / (end - start));
const smoothProgress = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const particleSeed = (index: number, salt = 0) => {
  const value = Math.sin(index * 37.719 + salt * 19.371) * 10000;
  return value - Math.floor(value);
};

const finalParticles = Array.from({ length: 92 }, (_, index) => ({
  id: index,
  x: particleSeed(index, 1) * 100,
  y: particleSeed(index, 2) * 100,
  size: 1.2 + particleSeed(index, 3) * 3.8,
  opacity: 0.28 + particleSeed(index, 4) * 0.58,
  duration: 9 + particleSeed(index, 5) * 18,
  delay: -particleSeed(index, 6) * 18,
  dx1: -34 + particleSeed(index, 7) * 68,
  dy1: -28 + particleSeed(index, 8) * 56,
  dx2: -48 + particleSeed(index, 9) * 96,
  dy2: -42 + particleSeed(index, 10) * 84,
  hue: particleSeed(index, 11),
}));

export default function GardenLanding({ progress }: GardenLandingProps) {
  const reveal = smoothProgress(range(progress, 0.82, 0.97));
  const settle = range(progress, 0.84, 0.99);
  const backdrop = range(progress, 0.9, 0.99);
  const camera = smoothProgress(range(progress, 0.82, 0.97));
  const enter = reveal;

  return (
    <section
      className="garden-landing garden-video-page"
      style={
        {
          "--garden-opacity": enter,
          "--garden-settle": settle,
          "--garden-growth": reveal,
          "--garden-backdrop": backdrop,
          "--garden-camera": camera,
        } as CSSProperties
      }
      aria-label="Light Unfolds in Silence"
    >
      <div className="garden-final-decor" aria-hidden="true">
        <div className="garden-final-stars garden-final-stars-a" />
        <div className="garden-final-stars garden-final-stars-b" />
        <div className="garden-final-particles">
          {finalParticles.map((particle) => (
            <span
              className="garden-final-particle"
              key={particle.id}
              style={
                {
                  "--particle-x": `${particle.x}%`,
                  "--particle-y": `${particle.y}%`,
                  "--particle-size": `${particle.size}px`,
                  "--particle-opacity": particle.opacity,
                  "--particle-duration": `${particle.duration}s`,
                  "--particle-delay": `${particle.delay}s`,
                  "--particle-dx-1": `${particle.dx1}px`,
                  "--particle-dy-1": `${particle.dy1}px`,
                  "--particle-dx-2": `${particle.dx2}px`,
                  "--particle-dy-2": `${particle.dy2}px`,
                  "--particle-hue": particle.hue,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <div className="garden-final-comet garden-final-comet-a" />
        <div className="garden-final-comet garden-final-comet-b" />
        <div className="garden-final-veil" />
      </div>

      <div className="garden-video-backdrop" aria-hidden="true">
        <video
          src={`${import.meta.env.BASE_URL}media/新尾页.mp4`}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
        />
      </div>

      <div className="garden-video-wrap" aria-hidden="true">
        <video
          src={`${import.meta.env.BASE_URL}media/新尾页.mp4`}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
        />
        <div className="garden-video-grade" />
      </div>

    </section>
  );
}
