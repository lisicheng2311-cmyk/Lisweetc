import { useEffect, useRef, useState, type CSSProperties } from "react";

type GardenLandingProps = {
  progress: number;
  onVideoReadyChange?: (ready: boolean) => void;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const range = (value: number, start: number, end: number) => clamp01((value - start) / (end - start));
const smoothProgress = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const gardenVideoSrc = `${import.meta.env.BASE_URL}media/新尾页.mp4`;

export default function GardenLanding({ progress, onVideoReadyChange }: GardenLandingProps) {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const reveal = smoothProgress(range(progress, 0.76, 0.94));
  const settle = range(progress, 0.78, 0.98);
  const backdrop = range(progress, 0.84, 0.98);
  const camera = smoothProgress(range(progress, 0.76, 0.94));
  const enter = reveal;

  useEffect(() => {
    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "video";
    preload.href = gardenVideoSrc;
    preload.type = "video/mp4";
    document.head.appendChild(preload);

    return () => {
      preload.remove();
    };
  }, []);

  useEffect(() => {
    onVideoReadyChange?.(isVideoReady);
  }, [isVideoReady, onVideoReadyChange]);

  useEffect(() => {
    const video = mainVideoRef.current;
    if (!video) return;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setIsVideoReady(true);
      return;
    }
    video.load();
  }, []);

  const handleVideoReady = () => {
    setIsVideoReady(true);
  };

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
          "--garden-video-ready": isVideoReady ? 1 : 0,
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
          onLoadedData={handleVideoReady}
          onCanPlay={handleVideoReady}
        />
      </div>

      <div className="garden-video-wrap" aria-hidden="true">
        <video
          ref={mainVideoRef}
          src={gardenVideoSrc}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          onLoadedData={handleVideoReady}
          onCanPlay={handleVideoReady}
        />
      </div>

    </section>
  );
}
