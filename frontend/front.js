document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const revealTargets = document.querySelectorAll(
    ".hero-copy, .hero-visual, .trusted-wrap, .section-head, .feature-card"
  );

  revealTargets.forEach((el) => el.classList.add("reveal"));

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 8);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealTargets.forEach((el) => observer.observe(el));
});
