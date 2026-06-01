import { useEffect, type CSSProperties } from "react";

type SubmittedFragmentEffectProps = {
  id: number;
  glowColor: string;
  isLocal?: boolean;
  text: string;
  onDone: () => void;
};

export default function SubmittedFragmentEffect({ id, glowColor, isLocal = false, text, onDone }: SubmittedFragmentEffectProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onDone, 3900);
    return () => window.clearTimeout(timeout);
  }, [id, onDone]);

  return (
    <div
      className={`submitted-fragment-effect${isLocal ? " is-local" : ""}`}
      aria-hidden="true"
      style={{ "--fragment-glow": glowColor } as CSSProperties}
    >
      <div className="submitted-fragment-trail" />
      <div className="submitted-fragment-card">
        <i />
        <p>{text}</p>
      </div>
      <span className="submitted-fragment-particle particle-a" />
      <span className="submitted-fragment-particle particle-b" />
      <span className="submitted-fragment-particle particle-c" />
      <span className="submitted-fragment-particle particle-d" />
    </div>
  );
}
