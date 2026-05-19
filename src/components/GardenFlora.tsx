import type { CSSProperties } from "react";

type FloraTone = "moon" | "gold" | "violet" | "amber" | "blue" | "rose";
type FloraType = "daisy" | "star" | "puff" | "bell" | "lantern" | "cluster" | "iris";

type FloraSpec = {
  left: number;
  bottom: number;
  height: number;
  tone: FloraTone;
  type: FloraType;
  petals: number;
  delay: number;
  lean: number;
  scale: number;
  depth: number;
};

const toneCycle: FloraTone[] = ["moon", "gold", "violet", "moon", "amber", "blue", "rose", "gold"];
const typeCycle: FloraType[] = ["daisy", "puff", "star", "bell", "cluster", "lantern", "iris", "daisy", "cluster"];

const featuredFlowers: FloraSpec[] = [
  { left: 2, bottom: 13, height: 128, tone: "amber", type: "cluster", petals: 9, delay: -1.2, lean: -8, scale: 0.92, depth: 0.8 },
  { left: 8, bottom: 9, height: 228, tone: "moon", type: "puff", petals: 18, delay: -0.4, lean: 5, scale: 1.16, depth: 1 },
  { left: 13, bottom: 15, height: 150, tone: "gold", type: "daisy", petals: 14, delay: -2.2, lean: -4, scale: 1.06, depth: 0.92 },
  { left: 19, bottom: 5, height: 82, tone: "violet", type: "star", petals: 8, delay: -2.7, lean: 11, scale: 0.82, depth: 0.72 },
  { left: 25, bottom: 7, height: 116, tone: "blue", type: "cluster", petals: 7, delay: -1.9, lean: -9, scale: 0.78, depth: 0.76 },
  { left: 33, bottom: 10, height: 146, tone: "moon", type: "daisy", petals: 16, delay: -1.1, lean: 7, scale: 1.03, depth: 0.95 },
  { left: 42, bottom: 17, height: 118, tone: "violet", type: "bell", petals: 9, delay: -1.6, lean: 4, scale: 0.95, depth: 0.86 },
  { left: 48, bottom: 12, height: 184, tone: "gold", type: "lantern", petals: 10, delay: -0.8, lean: -5, scale: 0.86, depth: 0.82 },
  { left: 56, bottom: 9, height: 138, tone: "rose", type: "iris", petals: 12, delay: -2.4, lean: 8, scale: 0.9, depth: 0.83 },
  { left: 65, bottom: 16, height: 164, tone: "moon", type: "puff", petals: 20, delay: -1.7, lean: -6, scale: 1.08, depth: 0.98 },
  { left: 72, bottom: 8, height: 112, tone: "amber", type: "star", petals: 10, delay: -0.6, lean: 9, scale: 0.98, depth: 0.88 },
  { left: 83, bottom: 12, height: 182, tone: "gold", type: "cluster", petals: 8, delay: -2.1, lean: -8, scale: 0.95, depth: 0.9 },
  { left: 91, bottom: 14, height: 168, tone: "blue", type: "bell", petals: 9, delay: -1.4, lean: 7, scale: 0.92, depth: 0.82 },
  { left: 96, bottom: 15, height: 160, tone: "violet", type: "daisy", petals: 13, delay: -0.9, lean: -12, scale: 0.9, depth: 0.78 },
];

const fieldFlowers: FloraSpec[] = Array.from({ length: 34 }).map((_, i) => {
  const lane = i % 2;
  return {
    left: 3 + ((i * 11.7) % 94),
    bottom: 2 + ((i * 19) % 15) + lane * 3,
    height: 42 + ((i * 31) % 126),
    tone: toneCycle[i % toneCycle.length],
    type: typeCycle[i % typeCycle.length],
    petals: 7 + (i % 9),
    delay: (i % 17) * -0.23,
    lean: ((i % 11) - 5) * 2.4,
    scale: 0.48 + (i % 6) * 0.08,
    depth: 0.38 + (i % 7) * 0.07,
  };
});

const flowers = [...fieldFlowers, ...featuredFlowers].sort((a, b) => a.height - b.height);

const grasses = Array.from({ length: 168 }).map((_, i) => ({
  left: (i * 4.23) % 100,
  height: 24 + ((i * 29) % 132),
  delay: (i % 19) * -0.21,
  lean: ((i % 13) - 6) * 2.8,
  opacity: 0.14 + (i % 8) * 0.035,
}));

const moss = Array.from({ length: 28 }).map((_, i) => ({
  left: 2 + ((i * 17.3) % 96),
  bottom: 2 + (i % 8) * 1.8,
  width: 34 + (i % 6) * 18,
  hue: i % 3,
  delay: (i % 9) * -0.4,
}));

export default function GardenFlora() {
  return (
    <div className="garden-flora" aria-hidden="true">
      <div className="moss-glow-bank">
        {moss.map((patch, index) => (
          <span
            key={index}
            className={`moss-glow moss-glow-${patch.hue}`}
            style={
              {
                "--left": `${patch.left}%`,
                "--bottom": `${patch.bottom}%`,
                "--moss-width": `${patch.width}px`,
                "--delay": `${patch.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="grass-bank">
        {grasses.map((grass, index) => (
          <i
            key={index}
            className="grass-blade"
            style={
              {
                "--left": `${grass.left}%`,
                "--blade-height": `${grass.height}px`,
                "--lean": `${grass.lean}deg`,
                "--delay": `${grass.delay}s`,
                "--blade-opacity": grass.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {flowers.map((flower, index) => (
        <div
          key={index}
          className={`flora flora-${flower.tone} flora-${flower.type}`}
          style={
            {
              "--left": `${flower.left}%`,
              "--bottom": `${flower.bottom}%`,
              "--stem-height": `${flower.height}px`,
              "--delay": `${flower.delay}s`,
              "--lean": `${flower.lean}deg`,
              "--flora-scale": flower.scale,
              "--depth-opacity": flower.depth,
            } as CSSProperties
          }
        >
          <i className="flora-stem" />
          <span className="flora-bloom">
            {Array.from({ length: flower.petals }).map((_, petal) => (
              <b key={petal} style={{ "--petal": petal, "--petals": flower.petals } as CSSProperties} />
            ))}
            <i className="flora-core" />
            <i className="flora-spark flora-spark-a" />
            <i className="flora-spark flora-spark-b" />
            <i className="flora-spark flora-spark-c" />
          </span>
        </div>
      ))}
    </div>
  );
}
