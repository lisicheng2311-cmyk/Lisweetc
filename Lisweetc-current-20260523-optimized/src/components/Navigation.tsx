import type { EmotionFragment } from "../data/projects";

type NavigationProps = {
  progress: number;
  activeIndex: number;
  fragments: EmotionFragment[];
};

export default function Navigation({ progress, activeIndex, fragments }: NavigationProps) {
  const project = fragments[activeIndex] ?? fragments[0];
  const phase = progress < 0.2 ? "DREAM" : progress < 0.34 ? "OPEN" : progress < 0.62 ? "EMOTION" : progress < 0.84 ? "TRACE" : "GARDEN";
  const opacity = Math.max(0, 1 - Math.max(0, progress - 0.82) / 0.12);
  const title = progress < 0.28 ? "DREAM" : project.emotion.toUpperCase();

  return (
    <>
      <header className="top-nav" aria-label="Primary navigation" style={{ opacity }}>
        <a href="#work">WORK</a>
        <span className="nav-glyph" aria-hidden="true">
          <i />
        </span>
        <a href="#contact">CONTACT</a>
      </header>

      <section className="project-switcher" aria-label="Current project" style={{ opacity }}>
        <button type="button">&lt;&lt;</button>
        <p>
          <span>{project.index}.</span> <strong>{title}</strong> <small>TRACE</small>
        </p>
        <button type="button">&gt;&gt;</button>
      </section>

      <aside className="progress-readout" aria-hidden="true" style={{ opacity }}>
        <span>{phase}</span>
        <i style={{ transform: `scaleY(${Math.max(0.04, progress)})` }} />
        <b>{String(Math.round(progress * 100)).padStart(2, "0")}</b>
      </aside>
    </>
  );
}
