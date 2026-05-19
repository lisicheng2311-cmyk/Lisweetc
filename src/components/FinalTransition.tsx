import type { CSSProperties } from "react";

type FinalTransitionProps = {
  progress: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const range = (value: number, start: number, end: number) => clamp01((value - start) / (end - start));

export default function FinalTransition({ progress }: FinalTransitionProps) {
  const dusk = range(progress, 0.68, 0.86);
  const ember = range(progress, 0.72, 0.92) * (1 - range(progress, 0.94, 1));
  const sink = range(progress, 0.78, 0.96);

  return (
    <div
      className="final-transition"
      aria-hidden="true"
      style={
        {
          "--dusk": dusk,
          "--ember": ember,
          "--sink": sink,
        } as CSSProperties
      }
    >
      <span className="transition-orb" />
      <span className="transition-ripple transition-ripple-a" />
      <span className="transition-ripple transition-ripple-b" />
      <span className="transition-thread transition-thread-a" />
      <span className="transition-thread transition-thread-b" />
      <span className="transition-thread transition-thread-c" />
    </div>
  );
}
