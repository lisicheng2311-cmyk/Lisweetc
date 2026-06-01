import { useEffect, type CSSProperties } from "react";

type CosmicToastProps = {
  id: number;
  glowColor: string;
  message: string;
  onDone: () => void;
};

export default function CosmicToast({ id, glowColor, message, onDone }: CosmicToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onDone, 2300);
    return () => window.clearTimeout(timeout);
  }, [id, onDone]);

  return (
    <div className="cosmic-toast-layer" aria-live="polite" aria-atomic="true" style={{ "--fragment-glow": glowColor } as CSSProperties}>
      <div className="cosmic-toast glass-depth-card">
        <span>{message}</span>
      </div>
    </div>
  );
}
