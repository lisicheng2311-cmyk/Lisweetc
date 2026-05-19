import { PROJECTS } from "../data/projects";

type NavigationProps = {
  progress: number;
  activeIndex: number;
};

export default function Navigation({ progress, activeIndex }: NavigationProps) {
  const project = PROJECTS[activeIndex] ?? PROJECTS[0];
  const phase = progress < 0.24 ? "DREAM" : progress < 0.38 ? "OPEN" : progress < 0.88 ? "WORK" : "LAB";

  return (
    <>
      <header className="top-nav" aria-label="Primary navigation">
        <a href="#work">WORK</a>
        <span className="nav-glyph" aria-hidden="true">
          <i />
        </span>
        <a href="#contact">CONTACT</a>
      </header>

      <section className="project-switcher" aria-label="Current project">
        <button type="button">&lt;&lt;</button>
        <p>
          <span>{project.index}.</span> <strong>{progress < 0.34 ? "DREAM" : project.title.split(" ")[0]}</strong>{" "}
          <small>流动</small>
        </p>
        <button type="button">&gt;&gt;</button>
      </section>

      <aside className="progress-readout" aria-hidden="true">
        <span>{phase}</span>
        <i style={{ transform: `scaleY(${Math.max(0.04, progress)})` }} />
        <b>{String(Math.round(progress * 100)).padStart(2, "0")}</b>
      </aside>
    </>
  );
}
