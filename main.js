/* orcalinux(1) — behaviour + motion */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const G = window.gsap;

  if (G) {
    const plugins = [window.ScrollTrigger, window.ScrollToPlugin, window.ScrambleTextPlugin, window.Flip].filter(Boolean);
    G.registerPlugin(...plugins);
  }
  const ST = window.ScrollTrigger;
  const Flip = window.Flip;
  const canScramble = !!(G && window.ScrambleTextPlugin) && !reduce;

  const headH = () => $(".manhead").offsetHeight;
  const scrollToY = (y) => {
    if (G && window.ScrollToPlugin && !reduce) {
      G.to(window, { scrollTo: { y, offsetY: typeof y === "number" ? 0 : headH() + 12, autoKill: true }, duration: 0.7, ease: "power3.inOut" });
    } else {
      const top = typeof y === "number" ? y : $(y).getBoundingClientRect().top + scrollY - headH() - 12;
      scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    }
  };

  /* ───────── status-line messages ───────── */
  const msgEl = $("#less-msg");
  let msgTimer;
  const say = (text, ms = 2600) => {
    msgEl.textContent = text;
    clearTimeout(msgTimer);
    if (ms) msgTimer = setTimeout(() => (msgEl.textContent = ""), ms);
  };

  /* ───────── 1. boot: `man orcalinux` types, then the page prints ───────── */
  const boot = () => {
    if (!root.classList.contains("booting") || !G) {
      root.classList.remove("booting");
      return null;
    }
    const cmd = $("#cmd");
    const full = cmd.textContent;
    cmd.textContent = "";
    const printed = $$("[data-print]");
    const asciiLines = $$(".ascii span");
    const rest = printed.filter((el) => !asciiLines.includes(el) && !el.matches(".prompt, .avatar, .manhead"));
    const typer = { n: 0 };

    G.set(printed, { opacity: 0 });
    root.classList.remove("booting");

    const tl = G.timeline({
      defaults: { ease: "none" },
      onComplete: () => {
        try { sessionStorage.setItem("orca-booted", "1"); } catch (e) {}
        G.set(printed, { clearProps: "opacity,clipPath,filter,transform" });
        removeSkip();
      },
    });
    tl.to(".manhead", { opacity: 1, duration: 0.01 })
      .to(".prompt", { opacity: 1, duration: 0.01 }, "+=0.15")
      .to(typer, {
        n: full.length,
        duration: full.length * 0.065,
        ease: `steps(${full.length})`,
        onUpdate: () => (cmd.textContent = full.slice(0, Math.round(typer.n))),
      }, "+=0.35")
      .addLabel("enter", "+=0.3")
      // ASCII wordmark prints line by line, each line wiping in like a slow tty
      .fromTo(asciiLines, { opacity: 1, clipPath: "inset(0 100% 0 0)" }, {
        clipPath: "inset(0 0% 0 0)", duration: 0.16, stagger: 0.07, ease: "steps(12)",
      }, "enter")
      .fromTo(".avatar", { opacity: 1, clipPath: "inset(0 0 100% 0)", filter: "brightness(2.2) saturate(0)" }, {
        clipPath: "inset(0 0 0% 0)", filter: "brightness(1) saturate(1)", duration: 0.9, ease: "steps(16)",
      }, "enter+=0.1")
      .to(rest, { opacity: 1, duration: 0.01, stagger: 0.06 }, "enter+=0.45");

    const skip = (e) => {
      if (e.type === "keydown" && (e.metaKey || e.ctrlKey || e.altKey)) return;
      tl.progress(1);
    };
    const removeSkip = () => ["keydown", "pointerdown", "wheel", "touchstart"].forEach((t) => removeEventListener(t, skip));
    ["keydown", "pointerdown", "wheel", "touchstart"].forEach((t) => addEventListener(t, skip, { passive: true }));
    return tl;
  };
  boot();

  /* ───────── 2. section index: active section, gliding marker, scramble ───────── */
  const links = $$(".index a");
  const marker = $(".index-marker");
  const sections = links.map((a) => $(a.getAttribute("href")));
  const moveMarker = G && !reduce
    ? { y: G.quickTo(marker, "y", { duration: 0.45, ease: "power3.out" }), h: G.quickTo(marker, "height", { duration: 0.45, ease: "power3.out" }) }
    : null;
  let activeId = "";
  const setActive = (id) => {
    if (id === activeId) return;
    activeId = id;
    links.forEach((a) => {
      const on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("active", on);
      if (on) {
        a.setAttribute("aria-current", "location");
        if (marker.offsetParent) {
          if (moveMarker) { moveMarker.y(a.offsetTop); moveMarker.h(a.offsetHeight); }
          else { marker.style.transform = `translateY(${a.offsetTop}px)`; marker.style.height = a.offsetHeight + "px"; }
        }
        if (!marker.offsetParent) a.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" });
      } else a.removeAttribute("aria-current");
    });
  };
  if (ST) {
    sections.forEach((sec) => ST.create({
      trigger: sec,
      start: "top 45%",
      end: "bottom 45%",
      onToggle: (self) => self.isActive && setActive(sec.id),
    }));
  } else {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-45% 0px -54% 0px" });
    sections.forEach((s) => io.observe(s));
  }
  setActive("name");

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = a.getAttribute("href");
      history.replaceState(null, "", id);
      scrollToY(id);
    });
    if (canScramble && fine) {
      const label = a.textContent;
      a.addEventListener("mouseenter", () => G.to(a, { duration: 0.35, scrambleText: { text: label, chars: "01_/<>{}#", speed: 0.6 }, overwrite: true }));
    }
  });
  $$('a[href^="#"]:not(.index a)').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (!$(id)) return;
    e.preventDefault();
    history.replaceState(null, "", id);
    scrollToY(id);
  }));

  /* ───────── 3. less status line: line N/total (pct) ───────── */
  const lineEl = $("#less-line"), totalEl = $("#less-total"), pctEl = $("#less-pct");
  const lineH = () => parseFloat(getComputedStyle(document.body).lineHeight) || 26;
  let ticking = false;
  const updateStatus = () => {
    ticking = false;
    const lh = lineH();
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const total = Math.ceil(document.documentElement.scrollHeight / lh);
    lineEl.textContent = Math.min(total, Math.floor(scrollY / lh) + 1);
    totalEl.textContent = total;
    const pct = Math.round((scrollY / max) * 100);
    pctEl.textContent = pct >= 100 ? "(END)" : `(${pct}%)`;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(updateStatus); } }, { passive: true });
  addEventListener("resize", updateStatus);
  updateStatus();

  /* ───────── 4. flags filter EXAMPLES (Flip reorder) ───────── */
  const list = $("#examples-list");
  const items = $$(".ex", list);
  const order = new Map(items.map((el, i) => [el, i]));
  const flagBtns = $$("[data-flag]");
  const FLAGS = ["kernel", "bootloader", "mcu", "sysprog", "emu", "tools", "protocols", "devops"];
  let activeFlag = null;
  const applyFlag = (flag, { announce = true } = {}) => {
    activeFlag = activeFlag === flag ? null : flag;
    flagBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.flag === activeFlag)));
    const match = (el) => !activeFlag || el.dataset.flags.split(" ").includes(activeFlag);
    const sorted = [...items].sort((a, b) => (match(b) - match(a)) || (order.get(a) - order.get(b)));
    if (G) G.set(items, { clearProps: "opacity,y" }); // reveal anything still waiting for its entrance
    const state = Flip && !reduce ? Flip.getState(items) : null;
    sorted.forEach((el) => {
      list.appendChild(el);
      el.classList.toggle("dim", !match(el));
    });
    if (state) Flip.from(state, { duration: 0.6, ease: "power3.inOut", stagger: 0.025, absolute: false, onComplete: () => ST && ST.refresh() });
    else if (ST) ST.refresh();
    const n = items.filter(match).length;
    $("#filter-cmd").textContent = activeFlag ? `orcalinux --${activeFlag}` : "orcalinux --all";
    $("#filter-count").textContent = `# ${n} of ${items.length} examples`;
    $("#filter-clear").hidden = !activeFlag;
    if (canScramble) G.fromTo("#filter-cmd", { scrambleText: { text: "" } }, { duration: 0.4, scrambleText: { text: $("#filter-cmd").textContent, chars: "-_abcdefghijklmnopqrstuvwxyz" } });
    if (announce) say(activeFlag ? `--${activeFlag}: ${n} example${n === 1 ? "" : "s"} match (see EXAMPLES)` : "flags cleared");
  };
  flagBtns.forEach((b) => b.addEventListener("click", () => applyFlag(b.dataset.flag)));
  $("#filter-clear").addEventListener("click", () => activeFlag && applyFlag(activeFlag));

  /* ───────── 5. copy clone commands ───────── */
  $$(".copy").forEach((btn) => {
    let t;
    btn.addEventListener("click", async () => {
      const text = btn.parentElement.querySelector("code").textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add("copied");
        btn.setAttribute("aria-label", "Copied");
        say(`copied: ${text}`);
        clearTimeout(t);
        t = setTimeout(() => { btn.classList.remove("copied"); btn.setAttribute("aria-label", "Copy clone command"); }, 1600);
      } catch (e) {
        say("copy failed: select the command and copy it manually");
      }
    });
  });

  /* ───────── 6. cards: cursor spotlight + slight tilt ───────── */
  if (fine) {
    items.forEach((card) => {
      const rx = G && !reduce ? G.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" }) : null;
      const ry = G && !reduce ? G.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" }) : null;
      if (G) G.set(card, { transformPerspective: 900 });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
        if (rx) { rx((0.5 - py) * 5); ry((px - 0.5) * 6); }
      });
      card.addEventListener("pointerleave", () => { if (rx) { rx(0); ry(0); } });
    });
  }

  /* ───────── 7. scroll choreography ───────── */
  if (G && ST && !reduce) {
    // section heads decode once, like the pager rendering them
    if (canScramble) {
      $$(".sec h2").forEach((h) => {
        if (h.closest("#name, #synopsis")) return;
        const txt = h.textContent;
        ST.create({ trigger: h, start: "top 88%", once: true, onEnter: () => G.to(h, { duration: 0.6, scrambleText: { text: txt, chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ_", revealDelay: 0.1, speed: 0.5 } }) });
      });
    }

    // examples enter as a list
    G.set(items, { opacity: 0, y: 26 });
    ST.batch(items, {
      start: "top 92%",
      once: true,
      onEnter: (batch) => G.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.08, clearProps: "opacity,y" }),
    });
    // safety: anything still hidden after a refresh past it becomes visible
    ST.create({ trigger: "#examples", start: "bottom top", once: true, onEnter: () => G.set(items, { clearProps: "opacity,y" }) });

    // definition lists slide their terms in
    $$(".options, .files").forEach((dl) => {
      G.from($$("dt, dd", dl), { scrollTrigger: { trigger: dl, start: "top 85%", once: true }, opacity: 0, x: -14, duration: 0.5, ease: "power3.out", stagger: 0.04 });
    });

    // the avatar drifts and the wordmark lines shear as the page scrolls away
    G.to(".avatar img", { scrollTrigger: { trigger: ".sec-name", start: "top top+=60", end: "bottom top", scrub: 0.6 }, yPercent: 14, rotation: -3, scale: 0.94 });
    $$(".ascii span").forEach((line, i) => {
      G.to(line, { scrollTrigger: { trigger: ".sec-name", start: "top top+=60", end: "bottom top", scrub: 0.4 }, x: (i % 2 ? 1 : -1) * (10 + i * 6), opacity: 0.35, ease: "none" });
    });

    // the closing banner opens like a shutter
    G.fromTo(".banner", { clipPath: "inset(12% 8% 12% 8% round 14px)", scale: 1.06 }, {
      clipPath: "inset(0% 0% 0% 0% round 14px)", scale: 1, ease: "none",
      scrollTrigger: { trigger: ".banner-link", start: "top 95%", end: "top 45%", scrub: 0.5 },
    });

    // SEE ALSO links tick in
    G.from(".seealso a", { scrollTrigger: { trigger: ".seealso", start: "top 88%", once: true }, opacity: 0, y: 8, duration: 0.4, stagger: 0.05, ease: "power2.out" });

    addEventListener("load", () => ST.refresh());
    document.fonts && document.fonts.ready.then(() => ST.refresh());
  }

  /* ───────── 8. search (/ n N) via the CSS Custom Highlight API ───────── */
  const form = $("#less-search"), input = $("#less-q"), status = $("#less-status");
  const hasHL = !!(window.Highlight && CSS.highlights);
  let ranges = [], cur = -1;
  const clearHits = () => { ranges = []; cur = -1; if (hasHL) { CSS.highlights.delete("hits"); CSS.highlights.delete("hit-cur"); } };
  const openSearch = () => { form.hidden = false; status.hidden = true; input.value = ""; input.focus(); };
  const closeSearch = () => { form.hidden = true; status.hidden = false; };
  const go = (i) => {
    if (!ranges.length) return;
    cur = (i + ranges.length) % ranges.length;
    const r = ranges[cur];
    if (hasHL) CSS.highlights.set("hit-cur", new Highlight(r));
    const rect = r.getBoundingClientRect();
    scrollToY(Math.max(0, scrollY + rect.top - innerHeight / 3));
    say(`match ${cur + 1} of ${ranges.length}`, 0);
  };
  const search = (q) => {
    clearHits();
    q = q.trim();
    if (!q) return;
    const needle = q.toLowerCase();
    const walker = document.createTreeWalker($("#page"), NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => n.parentElement.closest(".ascii, [aria-hidden='true'], script") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    let n;
    while ((n = walker.nextNode())) {
      const t = n.data.toLowerCase();
      let i = 0;
      while ((i = t.indexOf(needle, i)) > -1) {
        const r = new Range();
        r.setStart(n, i);
        r.setEnd(n, i + needle.length);
        ranges.push(r);
        i += needle.length;
      }
    }
    if (!ranges.length) { say("Pattern not found"); return; }
    if (hasHL) CSS.highlights.set("hits", new Highlight(...ranges));
    const firstBelow = ranges.findIndex((r) => r.getBoundingClientRect().top > headH() + 10);
    go(firstBelow === -1 ? 0 : firstBelow);
  };
  form.addEventListener("submit", (e) => { e.preventDefault(); search(input.value); closeSearch(); });
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); closeSearch(); } });
  input.addEventListener("blur", () => setTimeout(closeSearch, 120));

  /* ───────── 9. less keys ───────── */
  const help = $("#help");
  const page = () => innerHeight - headH() - 60;
  const keys = {
    j: () => scrollBy(0, lineH() * 3),
    ArrowDown: null,
    k: () => scrollBy(0, -lineH() * 3),
    d: () => scrollBy({ top: page() / 2, behavior: reduce ? "auto" : "smooth" }),
    u: () => scrollBy({ top: -page() / 2, behavior: reduce ? "auto" : "smooth" }),
    g: () => scrollToY(0),
    G: () => scrollToY(document.documentElement.scrollHeight - innerHeight),
    "/": openSearch,
    n: () => (ranges.length ? go(cur + 1) : say("No previous search pattern")),
    N: () => (ranges.length ? go(cur - 1) : say("No previous search pattern")),
    h: () => (help.open ? help.close() : help.showModal()),
    q: () => (help.open ? help.close() : say("q? This pager never quits. Try h for help, or g to go back to the top.")),
    Escape: () => { clearHits(); say("", 1); },
  };
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t.closest && t.closest("input, textarea, select, [contenteditable]")) return;
    if (help.open && e.key !== "q" && e.key !== "h") return;
    if (/^[1-8]$/.test(e.key)) { applyFlag(FLAGS[+e.key - 1]); return; }
    const fn = keys[e.key];
    if (fn) { e.preventDefault(); fn(); }
  });
  $$(".less-btns button").forEach((b) => b.addEventListener("click", () => keys[b.dataset.key]()));
  help.addEventListener("click", (e) => { if (e.target === help) help.close(); });
})();
