// nav, theme, rotator, scroll-reveal, year stamp

(() => {
  const root = document.documentElement;

  // theme: localStorage > system preference > dark default
  const stored = localStorage.getItem("theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const initial = stored || (prefersLight ? "light" : "dark");
  root.setAttribute("data-theme", initial);

  const toggle = document.querySelector(".theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  // mobile nav burger
  const burger = document.querySelector(".nav-burger");
  const links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => links.classList.toggle("open"));
    links.addEventListener("click", (e) => {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }

  // hero rotator
  const rotator = document.querySelector(".rotator");
  if (rotator) {
    const words = JSON.parse(rotator.dataset.words || "[]");
    if (words.length) {
      let i = 0, j = 0, deleting = false;
      const tick = () => {
        const word = words[i];
        rotator.textContent = word.slice(0, j);
        if (!deleting && j < word.length) { j++; setTimeout(tick, 90); }
        else if (deleting && j > 0)       { j--; setTimeout(tick, 40); }
        else if (!deleting && j === word.length) { deleting = true; setTimeout(tick, 1600); }
        else { deleting = false; i = (i + 1) % words.length; setTimeout(tick, 300); }
      };
      tick();
    }
  }

  // scroll-reveal
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -60px 0px" });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  }

  // footer year
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
