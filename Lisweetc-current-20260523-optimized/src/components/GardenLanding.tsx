import type { CSSProperties } from "react";

type GardenLandingProps = {
  progress: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const range = (value: number, start: number, end: number) => clamp01((value - start) / (end - start));

export default function GardenLanding({ progress }: GardenLandingProps) {
  const enter = range(progress, 0.78, 0.94);
  const settle = range(progress, 0.86, 0.99);
  const growth = range(progress, 0.78, 0.96);
  const backdrop = range(progress, 0.9, 0.99);

  return (
    <section
      className="garden-landing garden-video-page"
      style={
        {
          "--garden-opacity": enter,
          "--garden-settle": settle,
          "--garden-growth": growth,
          "--garden-backdrop": backdrop,
        } as CSSProperties
      }
      aria-label="Light Unfolds in Silence"
    >
      <div className="garden-final-decor" aria-hidden="true">
        <div className="garden-final-stars garden-final-stars-a" />
        <div className="garden-final-stars garden-final-stars-b" />
        <div className="garden-final-comet garden-final-comet-a" />
        <div className="garden-final-comet garden-final-comet-b" />
        <div className="garden-final-veil" />
      </div>

      <div className="garden-video-backdrop" aria-hidden="true">
        <video
          src={`${import.meta.env.BASE_URL}media/48317178c5e13f2fc72a660d95145e90.mp4`}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
        />
      </div>

      <div className="garden-video-wrap" aria-hidden="true">
        <video
          src={`${import.meta.env.BASE_URL}media/48317178c5e13f2fc72a660d95145e90.mp4`}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
        />
        <div className="garden-video-grade" />
      </div>

      <div className="garden-copy garden-title-only garden-video-title">
        <h2>
          <span>Light Unfolds</span>
          <span>in Silence</span>
        </h2>
        <p lang="zh-CN">Light unfolds in the quiet.</p>
      </div>
    </section>
  );
}
