import type { CSSProperties } from "react";

type FireflyFieldProps = {
  count?: number;
};

const fireflies = Array.from({ length: 54 }).map((_, i) => ({
  left: 5 + ((i * 37) % 90),
  top: 16 + ((i * 53) % 60),
  size: 2 + (i % 5) * 0.7,
  delay: (i % 11) * -0.58,
  duration: 5.4 + (i % 7) * 0.74,
  drift: (i % 2 ? 1 : -1) * (18 + (i % 6) * 8),
  warm: i % 4 === 0,
}));

export default function FireflyField({ count = 54 }: FireflyFieldProps) {
  return (
    <div className="firefly-field" aria-hidden="true">
      {fireflies.slice(0, count).map((fly, index) => (
        <span
          key={index}
          className={fly.warm ? "firefly firefly-warm" : "firefly"}
          style={
            {
              "--x": `${fly.left}%`,
              "--y": `${fly.top}%`,
              "--size": `${fly.size}px`,
              "--delay": `${fly.delay}s`,
              "--duration": `${fly.duration}s`,
              "--drift": `${fly.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
