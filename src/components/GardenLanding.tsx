import type { CSSProperties } from "react";

type GardenLandingProps = {
  progress: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const range = (value: number, start: number, end: number) => clamp01((value - start) / (end - start));
const gardenVideoSrc = `${import.meta.env.BASE_URL}media/f4111b036102b180084745abb4f196af_raw.mp4`;

export default function GardenLanding({ progress }: GardenLandingProps) {
  const enter = range(progress, 0.75, 0.91);
  const settle = range(progress, 0.86, 0.99);
  const growth = range(progress, 0.78, 0.96);

  return (
    <section
      className="garden-landing garden-video-page"
      style={
        {
          "--garden-opacity": enter,
          "--garden-settle": settle,
          "--garden-growth": growth,
        } as CSSProperties
      }
      aria-label="Light Unfolds in Silence"
    >
      <div className="garden-video-backdrop" aria-hidden="true">
        <video
          src={gardenVideoSrc}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
        />
      </div>

      <div className="garden-video-wrap" aria-hidden="true">
        <video
          src={gardenVideoSrc}
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
        <p lang="zh-CN">静谧之中，光自舒展</p>
      </div>
    </section>
  );
}
