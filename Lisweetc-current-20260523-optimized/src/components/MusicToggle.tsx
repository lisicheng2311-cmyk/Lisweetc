import { useEffect, useRef, useState } from "react";

const musicSrc = `${import.meta.env.BASE_URL}media/bg-music.mp3`;

export default function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.35;
    }
  }, []);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.35;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <>
      <audio ref={audioRef} src={musicSrc} loop preload="auto" />
      <button
        className={`music-toggle ${isPlaying ? "is-playing" : ""}`}
        type="button"
        onClick={toggleMusic}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? "Pause background music" : "Play background music"}
      >
        <span className="music-wave" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>
    </>
  );
}
