// Small progressive enhancements. The page is complete without this file.

// Theme toggle: follows the system until the visitor picks one, then remembers it.
(() => {
  const root = document.documentElement;
  const button = document.getElementById("theme-toggle");
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches;
  const label = () => button.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
  label();
  systemDark.addEventListener("change", label);
  button.addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    label();
  });
})();

// Header border once the page has scrolled.
(() => {
  const header = document.querySelector(".site-header");
  const update = () => header.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", update, { passive: true });
  update();
})();

// Live public numbers from GitHub. Static values in the HTML stay if this fails.
(async () => {
  try {
    const res = await fetch("https://api.github.com/users/orcalinux/repos?per_page=100&type=owner", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return;
    const repos = (await res.json()).filter((r) => !r.fork && !r.private);
    const byName = new Map(repos.map((r) => [r.name, r]));
    const set = (key, value) => {
      const el = document.querySelector(`[data-stat="${key}"]`);
      if (el && Number.isFinite(value)) el.textContent = value.toLocaleString("en");
    };
    set("repos", repos.length);
    set("stars", repos.reduce((sum, r) => sum + r.stargazers_count, 0));
    set("forks", repos.reduce((sum, r) => sum + r.forks_count, 0));
    document.querySelectorAll("[data-repo]").forEach((link) => {
      const repo = byName.get(link.dataset.repo);
      const stars = link.querySelector("[data-stars]");
      if (repo && stars) stars.textContent = repo.stargazers_count;
    });
  } catch (e) {
    /* offline or rate-limited: keep the static numbers */
  }
})();
