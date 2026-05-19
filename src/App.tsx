import { useEffect, useMemo, useState } from "react";
import Lenis from "lenis";
import Scene from "./components/Scene";
import Navigation from "./components/Navigation";
import HeroVideo from "./components/HeroVideo";
import { PROJECTS } from "./data/projects";
import { clamp01 } from "./utils/math";

export default function App() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.55,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.78,
      touchMultiplier: 1.05,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScrollProgress(clamp01(window.scrollY / max));
    };

    lenis.on("scroll", update);
    update();
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-work", scrollProgress > 0.34 && scrollProgress < 0.9);
    document.body.classList.toggle("is-outro", scrollProgress >= 0.88);
    document.body.style.setProperty("--page-progress", String(scrollProgress));
  }, [scrollProgress]);

  const activeIndex = useMemo(() => {
    const projectStart = 0.38;
    const projectEnd = 0.86;
    const local = clamp01((scrollProgress - projectStart) / (projectEnd - projectStart));
    return Math.min(PROJECTS.length - 1, Math.floor(local * PROJECTS.length));
  }, [scrollProgress]);

  const introOpacity = Math.max(0, 1 - scrollProgress * 5.1);
  const bridgeOpacity = Math.max(0, Math.min(1, (scrollProgress - 0.18) / 0.14)) * Math.max(0, 1 - Math.max(0, scrollProgress - 0.42) * 4);
  const outroOpacity = clamp01((scrollProgress - 0.86) / 0.12);

  return (
    <>
      <HeroVideo progress={scrollProgress} />
      <Scene progress={scrollProgress} activeIndex={activeIndex} />
      <Navigation progress={scrollProgress} activeIndex={activeIndex} />

      <main className="content-shell" aria-label="Dream field scroll narrative">
        <section className="snap-section intro-section">
          <div className="intro-copy dream-title" style={{ opacity: introOpacity }}>
            <p>Fluid Interactive Experience</p>
            <h1>DREAM FIELD</h1>
          </div>
          <div className="scroll-hint" style={{ opacity: Math.max(0, 1 - scrollProgress * 4.4) }}>
            <span>SCROLL TO UNFOLD</span>
            <i />
          </div>
        </section>

        <section className="snap-section bridge-section">
          <div className="bridge-copy" style={{ opacity: bridgeOpacity }}>
            <p>the light opens</p>
            <h2>Golden current</h2>
          </div>
        </section>

        <section className="snap-section project-section" id="work">
          <aside className="work-filter" aria-label="Project filters">
            <b>FIELD INDEX</b>
            <a href="#echo">-&gt; E.C.H.O.</a>
            <a href="#frontier">-&gt; FRONTIER WITHIN</a>
            <a href="#horizons">-&gt; SUSTAINABLE HORIZONS</a>
            <a href="#patronus">-&gt; DISCOVER YOUR PATRONUS</a>
            <a href="#lab">-&gt; THE LAB</a>
            <button type="button">水流路径 / 06</button>
          </aside>
        </section>

        <section className="snap-section outro-section" id="contact">
          <div className="outro-copy" style={{ opacity: outroOpacity }}>
            <p>current returns</p>
            <h2>THE LAB -&gt;</h2>
          </div>
        </section>
      </main>
    </>
  );
}
