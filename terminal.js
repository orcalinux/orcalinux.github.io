/* orcash — a small shell visitors can use. Everything runs in the browser. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const G = window.gsap;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HOME = "/home/orca";

  /* ───────── virtual filesystem, built from the page's own content ───────── */
  const dir = (children = {}) => ({ type: "dir", children });
  const file = (text, url) => ({ type: "file", text, url });

  const projects = $$(".ex").map((el) => ({
    name: $("h3", el).textContent.trim(),
    url: $(".ex-link", el).href,
    desc: $("p:not(.meta)", el).textContent.trim(),
    lang: $(".lang", el)?.textContent.trim() || "",
    stars: parseInt(($(".stars", el)?.textContent || "").replace(/\D/g, "")) || 0,
    topics: $(".topics", el)?.textContent.trim() || "",
    flags: el.dataset.flags.split(" "),
  }));
  const courses = $$(".files dt").map((dt) => {
    const a = $("a", dt);
    return {
      name: a.textContent.replace(/^~\//, "").replace(/\/$/, ""),
      url: a.href,
      desc: dt.nextElementSibling.textContent.trim(),
      stars: parseInt(($(".stars", dt)?.textContent || "").replace(/\D/g, "")) || 0,
    };
  });
  const options = $$(".options dt").map((dt) => ({ flag: dt.textContent.trim(), text: dt.nextElementSibling.textContent.trim() }));
  const about = $$("#description .body p").map((p) => p.textContent.trim()).join("\n\n");

  const readme = (p) => [
    `# ${p.name}`, "", p.desc, "",
    `language: ${p.lang}${p.stars ? `   stars: ${p.stars}` : ""}`,
    p.topics ? `topics:   ${p.topics}` : "",
    p.flags ? `flags:    ${p.flags.map((f) => "--" + f).join(" ")}` : "",
    `source:   ${p.url}`,
  ].filter((l) => l !== "").join("\n");

  const fsRoot = dir({
    home: dir({
      orca: dir({
        "README.md": file(`# orcalinux\n\n${about}\n\nsource: https://github.com/orcalinux`),
        "skills.txt": file(options.map((o) => `${o.flag}\n    ${o.text}`).join("\n\n")),
        "contact.txt": file("GitHub: https://github.com/orcalinux\nIssues: open one on the repository it is about."),
        projects: dir(Object.fromEntries([
          ...projects.map((p) => [p.name, dir({ "README.md": file(readme(p), p.url) })]),
          ...courses.filter((c) => c.name.startsWith("projects/")).map((c) => [c.name.slice(9), dir({ "README.md": file(readme(c), c.url) })]),
        ])),
        courses: dir(Object.fromEntries(courses.filter((c) => c.name.startsWith("courses/")).map((c) => [c.name.slice(8), dir({ "README.md": file(readme(c), c.url) })]))),
      }),
    }),
  });

  let cwd = HOME;
  const pretty = (p) => (p === HOME ? "~" : p.startsWith(HOME + "/") ? "~" + p.slice(HOME.length) : p);
  const resolve = (p = "") => {
    if (p === "~") return HOME;
    if (!p) return cwd;
    let parts = (p.startsWith("/") ? p : p.startsWith("~") ? HOME + p.slice(1) : cwd + "/" + p).split("/");
    const out = [];
    for (const s of parts) {
      if (!s || s === ".") continue;
      if (s === "..") out.pop();
      else out.push(s);
    }
    return "/" + out.join("/");
  };
  const node = (abs) => {
    let n = fsRoot;
    for (const s of abs.split("/").filter(Boolean)) {
      if (n.type !== "dir" || !(s in n.children)) return null;
      n = n.children[s];
    }
    return n;
  };

  /* ───────── DOM ───────── */
  const drawer = $("#term");
  const out = $("#term-out");
  const form = $("#term-form");
  const input = $("#term-in");
  const promptEl = $("#term-prompt");
  const title = $("#term-title");

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const line = (...parts) => {
    const d = el("div", "t-line");
    for (const p of parts) d.append(typeof p === "string" ? document.createTextNode(p) : p);
    out.append(d);
    return d;
  };
  const span = (cls, text) => el("span", cls, text);
  const link = (href, text) => { const a = el("a", "t-link", text || href); a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; };
  const print = (text, cls) => text.split("\n").forEach((t) => line(cls ? span(cls, t) : t));
  const blank = () => line(" ");
  const scroller = $(".crt-inner");
  const scrollEnd = () => { scroller.scrollTop = scroller.scrollHeight; };
  const setPrompt = () => {
    promptEl.replaceChildren(span("t-user", "guest@orca"), ":", span("t-path", pretty(cwd)), "$ ");
    title.textContent = `guest@orca: ${pretty(cwd)}`;
  };

  /* ───────── commands ───────── */
  const history = (() => { try { return JSON.parse(sessionStorage.getItem("orcash-history") || "[]"); } catch (e) { return []; } })();
  const saveHistory = () => { try { sessionStorage.setItem("orcash-history", JSON.stringify(history.slice(-100))); } catch (e) {} };
  const findProject = (q) => {
    q = (q || "").replace(/\/$/, "").split("/").pop().toLowerCase();
    return projects.find((p) => p.name.toLowerCase() === q) || courses.find((c) => c.name.split("/").pop() === q) || null;
  };
  const page = () => window.orcaPage || {};

  const HELP = [
    ["help", "this list"],
    ["ls [-l] [dir]", "list a directory"],
    ["cd <dir>", "change directory (try: cd projects)"],
    ["cat <file>", "print a file"],
    ["tree [dir]", "show the filesystem"],
    ["grep <text>", "search every file"],
    ["projects", "list projects with their flags"],
    ["orcalinux --<flag>", "filter the page's EXAMPLES (kernel, mcu, devops…)"],
    ["open <project>", "open a repository on GitHub"],
    ["git clone <project>", "copy the real clone command"],
    ["man <section>", "jump to a section of the man page"],
    ["neofetch", "system information"],
    ["whoami · uname -a · date · pwd · echo", "the usual"],
    ["lsmod · dmesg · make", "you know what these do"],
    ["history · clear · exit", "Ctrl+L clears, Esc closes"],
  ];

  const cmds = {
    help() {
      line(span("t-dim", "orcash, the orcalinux shell. Commands:"));
      HELP.forEach(([c, d]) => line(span("t-cmd", c.padEnd(40)), span("t-dim", d)));
      line(span("t-dim", "Tab completes commands and paths; ↑/↓ walk history."));
    },
    ls(args) {
      const long = args.some((a) => /^-\w*l/.test(a));
      const target = args.find((a) => !a.startsWith("-"));
      const abs = resolve(target);
      const n = node(abs);
      if (!n) return print(`ls: cannot access '${target}': No such file or directory`, "t-err");
      if (n.type === "file") return line(target);
      const names = Object.keys(n.children).sort((a, b) => (n.children[b].type === "dir") - (n.children[a].type === "dir") || a.localeCompare(b));
      if (!names.length) return;
      if (long) {
        line(span("t-dim", `total ${names.length}`));
        names.forEach((k) => {
          const c = n.children[k];
          const d = c.type === "dir";
          const size = d ? 4096 : c.text.length;
          line(span("t-dim", `${d ? "d" : "-"}rw${d ? "x" : "-"}r-${d ? "x" : "-"}r-${d ? "x" : "-"}  orca orca ${String(size).padStart(6)} Nov 13  `), span(d ? "t-dir" : "", k + (d ? "/" : "")));
        });
      } else {
        const d = el("div", "t-line t-grid");
        names.forEach((k) => d.append(span(n.children[k].type === "dir" ? "t-dir" : "", k + (n.children[k].type === "dir" ? "/" : ""))));
        out.append(d);
      }
    },
    cd([p]) {
      const abs = resolve(p || "~");
      const n = node(abs);
      if (!n) return print(`cd: ${p}: No such file or directory`, "t-err");
      if (n.type !== "dir") return print(`cd: ${p}: Not a directory`, "t-err");
      cwd = abs;
      setPrompt();
    },
    pwd() { line(cwd); },
    cat(args) {
      if (!args.length) return print("cat: missing operand (try: cat README.md)", "t-err");
      args.forEach((a) => {
        const n = node(resolve(a));
        if (!n) return print(`cat: ${a}: No such file or directory`, "t-err");
        if (n.type === "dir") return print(`cat: ${a}: Is a directory`, "t-err");
        n.text.split("\n").forEach((t) => {
          const m = t.match(/^(.*?)(https:\/\/\S+)$/);
          if (m) line(m[1], link(m[2]));
          else line(t.startsWith("#") ? span("t-h", t) : t);
        });
      });
    },
    tree([p]) {
      const abs = resolve(p);
      const n = node(abs);
      if (!n || n.type !== "dir") return print(`tree: ${p || "."}: not a directory`, "t-err");
      line(span("t-dir", pretty(abs)));
      let dirs = 0, files = 0;
      const walk = (d, pre) => {
        const ks = Object.keys(d.children);
        ks.forEach((k, i) => {
          const c = d.children[k], last = i === ks.length - 1;
          c.type === "dir" ? dirs++ : files++;
          line(span("t-dim", pre + (last ? "└── " : "├── ")), span(c.type === "dir" ? "t-dir" : "", k));
          if (c.type === "dir") walk(c, pre + (last ? "    " : "│   "));
        });
      };
      walk(n, "");
      blank();
      line(`${dirs} directories, ${files} files`);
    },
    grep(args) {
      const q = args.filter((a) => !a.startsWith("-")).join(" ").replace(/^["']|["']$/g, "");
      if (!q) return print("usage: grep <text>", "t-err");
      const needle = q.toLowerCase();
      let hits = 0;
      const walk = (n, path) => {
        if (n.type === "dir") return Object.entries(n.children).forEach(([k, c]) => walk(c, path + "/" + k));
        n.text.split("\n").forEach((t) => {
          const i = t.toLowerCase().indexOf(needle);
          if (i < 0) return;
          hits++;
          line(span("t-path", pretty(path)), span("t-dim", ": "), t.slice(0, i), span("t-hit", t.slice(i, i + q.length)), t.slice(i + q.length));
        });
      };
      walk(node(HOME), HOME);
      if (!hits) print(`grep: no match for '${q}'`, "t-dim");
    },
    projects() {
      projects.forEach((p) => line(span("t-dir", p.name.padEnd(32)), span("t-dim", `${(p.lang || "").padEnd(8)}${p.stars ? ("★ " + p.stars).padEnd(6) : "      "}`), span("t-cmd", p.flags.map((f) => "--" + f).join(" "))));
      line(span("t-dim", "Try: orcalinux --kernel   or   cat projects/bootwire/README.md"));
    },
    orcalinux(args) {
      const flag = (args.find((a) => a.startsWith("--")) || "").slice(2);
      const known = [...new Set(projects.flatMap((p) => p.flags))];
      if (!flag || flag === "all") {
        page().setFlag && page().setFlag(null);
        return line("filter cleared: showing all ", span("t-cmd", String(projects.length)), " examples");
      }
      if (flag === "help" || !known.includes(flag)) {
        if (flag !== "help") print(`orcalinux: unrecognized option '--${flag}'`, "t-err");
        return line("flags: ", span("t-cmd", known.map((f) => "--" + f).join(" ")));
      }
      const match = projects.filter((p) => p.flags.includes(flag));
      page().setFlag && page().setFlag(flag);
      line("filtered the page to ", span("t-cmd", "--" + flag), `: ${match.length} example${match.length === 1 ? "" : "s"}`);
      match.forEach((p) => line("  ", link(p.url, p.name)));
      page().go && page().go("#examples");
    },
    open([q]) {
      if (!q || q === "github") { window.open("https://github.com/orcalinux", "_blank", "noopener"); return line("opening ", link("https://github.com/orcalinux")); }
      const p = findProject(q) || findProject(cwd);
      if (!p) return print(`open: ${q}: no such project (try: projects)`, "t-err");
      window.open(p.url, "_blank", "noopener");
      line("opening ", link(p.url));
    },
    git(args) {
      if (args[0] !== "clone") return print(args[0] ? `git: '${args[0]}' is not available in this shell. Try: git clone <project>` : "usage: git clone <project>", args[0] ? "t-err" : "t-dim");
      const p = findProject(args[1]);
      if (!p) return print(`fatal: repository '${args[1] || ""}' not found (try: projects)`, "t-err");
      const cmd = `git clone ${p.url}`;
      line(`Cloning into '${p.name.split("/").pop()}'...`);
      line(span("t-dim", "This shell has no network. The real command is on your clipboard:"));
      line(span("t-cmd", "  " + cmd));
      navigator.clipboard && navigator.clipboard.writeText(cmd).catch(() => line(span("t-err", "(clipboard blocked: copy it from above)")));
    },
    man([topic]) {
      if (!topic) return print("What manual page do you want?\nFor example, try 'man orcalinux' or 'man examples'.");
      const t = topic.toLowerCase().replace(/\s+/g, "-");
      const target = t === "orcalinux" ? "#name" : $("#" + t) ? "#" + t : t === "see" ? "#see-also" : null;
      if (target) { close(); page().go && page().go(target); return; }
      const h = HELP.find(([c]) => c.split(/[\s·]/)[0] === t);
      if (h) return line(span("t-h", `${t}(1)`), "  ", h[1]);
      print(`No manual entry for ${topic}`, "t-err");
    },
    whoami() { line("guest. You are reading orcalinux(1); its author is ", link("https://github.com/orcalinux", "orcalinux"), "."); },
    uname(args) { line(args.includes("-a") ? "Linux orca 6.12.0-orcalinux #1 SMP PREEMPT_DYNAMIC browser x86_64 GNU/Linux" : "Linux"); },
    date() { line(new Date().toString()); },
    echo(args) { line(args.join(" ")); },
    history() { history.forEach((h, i) => line(span("t-dim", String(i + 1).padStart(4) + "  "), h)); },
    clear() { out.replaceChildren(); },
    exit() { close(); },
    neofetch() {
      const stars = [...projects, ...courses].reduce((s, p) => s + p.stars, 0);
      const art = [
        "   ▄▄▄▄▄▄▄▄▄   ", "  █ ▀▀▀▀▀▀▀ █  ", "  █ ▓▓ ▓▓▓▓ █  ", "  █  ▄▄▄▄▄  █  ", "  ▀█▄▄▄▄▄▄▄█▀  ", "    ▄█████▄    ", "   █▀ ORCA ▀█  ", "   ▀▀▀▀▀▀▀▀▀   ",
      ];
      const info = [
        [null, "guest@orca"], [null, "──────────"],
        ["OS", "orcalinux(1) man page"], ["Host", location.host || "orcalinux.github.io"],
        ["Kernel", "6.12.0-orcalinux (browser)"], ["Shell", "orcash 1.0"],
        ["Projects", `${projects.length} here, ${courses.length} courses`], ["Stars", `${stars} on the repos listed`],
        ["Location", "Cairo, Egypt"], ["Stack", "C, C++, Python, Rust, TypeScript"],
      ];
      const wrap = el("div", "t-fetch");
      const left = el("pre", "t-art", art.join("\n"));
      const right = el("div", "t-fetch-info");
      info.forEach(([k, v]) => { const d = el("div", "t-line"); d.append(k ? span("t-key", k + ": ") : span("t-user", v), k ? v : ""); right.append(d); });
      const sw = el("div", "t-swatches");
      ["#050b12", "#ff5f57", "#3ddc5a", "#febc2e", "#00e5ff", "#f34b7d", "#86a3ae", "#ffffff"].forEach((c) => { const s = span("t-sw"); s.style.background = c; sw.append(s); });
      right.append(sw);
      wrap.append(left, right);
      out.append(wrap);
    },
    lsmod() {
      line(span("t-h", "Module                  Size  Used by"));
      options.forEach((o) => {
        const name = (o.flag.match(/--(\w+)/) || [])[1] || o.flag;
        const used = projects.filter((p) => p.flags.includes(name)).map((p) => p.name);
        line(span("t-dir", ("orca_" + name).padEnd(24)), String(o.text.length * 64).padStart(5) + "  ", span("t-dim", `${used.length} ${used.slice(0, 3).join(",")}`));
      });
    },
    dmesg() {
      const msgs = ["Booting orcalinux(1)", "ARM Cortex-M: bootloader handshake ok", "orca_kernel: drivers loaded", "orca_devops: CI pipeline green", "orca_protocols: CRC-16 ok, frames verified", ...projects.map((p) => `${p.name}: registered`), "Reached target orcalinux.site"];
      msgs.forEach((m, i) => line(span("t-dim", `[${(i * 0.137).toFixed(6).padStart(12)}] `), m));
    },
    make() {
      ["  CC      kernel/orca.o", "  CC      drivers/uart.o", "  LD      bootwire.elf", "  OBJCOPY bootwire.bin", "  GEN     orcalinux.github.io"].forEach((l) => line(span("t-dim", l)));
      line(span("t-ok", "[ OK ]"), " built without warnings. shipping.");
    },
    sudo() { print("guest is not in the sudoers file. This incident will be reported.", "t-err"); },
    rm(args) { print(args.join(" ").includes("/") ? "rm: it is a man page. There is nothing to break." : "rm: read-only file system", "t-err"); },
    vim() { print("No editors here, so you can't get stuck. (:q)"); },
  };
  cmds.ll = (a) => cmds.ls(["-l", ...a]);
  cmds.nano = cmds.emacs = cmds.vi = cmds.vim;
  cmds["./run"] = cmds.make;

  const tokenize = (s) => (s.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((t) => t.replace(/^["']|["']$/g, ""));

  const run = (raw) => {
    const echo = line(span("t-user", "guest@orca"), ":", span("t-path", pretty(cwd)), "$ ", span("t-typed", raw));
    echo.classList.add("t-echo");
    const s = raw.trim();
    if (!s) return;
    history.push(s);
    saveHistory();
    const [c, ...args] = tokenize(s);
    const before = out.children.length;
    const fn = cmds[c];
    if (fn) fn(args);
    else if (node(resolve(c)) && node(resolve(c)).type === "dir") cmds.cd([c]);
    else print(`orcash: command not found: ${c}. Try 'help'.`, "t-err");
    // output arrives line by line, like a slow serial link
    const fresh = [...out.children].slice(before);
    if (G && !reduce && fresh.length > 1) {
      const each = Math.min(0.03, 0.5 / fresh.length);
      G.from(fresh, { opacity: 0, duration: 0.01, stagger: { each, onStart: scrollEnd } });
    }
  };

  /* ───────── completion + history keys ───────── */
  let hIdx = -1;
  const complete = () => {
    const v = input.value;
    const parts = v.split(/\s+/);
    const cur = parts[parts.length - 1];
    let pool;
    if (parts.length === 1) pool = Object.keys(cmds);
    else if (["open", "clone"].includes(parts[parts.length - 2]) || parts[0] === "open") pool = projects.map((p) => p.name);
    else if (parts[0] === "orcalinux") pool = [...new Set(projects.flatMap((p) => p.flags))].map((f) => "--" + f);
    else {
      const slash = cur.lastIndexOf("/");
      const base = slash >= 0 ? cur.slice(0, slash + 1) : "";
      const n = node(resolve(base || "."));
      pool = n && n.type === "dir" ? Object.entries(n.children).map(([k, c]) => base + k + (c.type === "dir" ? "/" : "")) : [];
    }
    const hits = pool.filter((p) => p.startsWith(cur));
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0] + (hits[0].endsWith("/") ? "" : " ");
      input.value = parts.join(" ");
    } else if (hits.length > 1) {
      let pre = hits[0];
      hits.forEach((h) => { while (!h.startsWith(pre)) pre = pre.slice(0, -1); });
      if (pre.length > cur.length) { parts[parts.length - 1] = pre; input.value = parts.join(" "); }
      else { line(span("t-dim", v)); const d = el("div", "t-line t-grid"); hits.forEach((h) => d.append(span(h.endsWith("/") ? "t-dir" : "", h))); out.append(d); scrollEnd(); }
    }
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Tab") { e.preventDefault(); complete(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!history.length) return; hIdx = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1); input.value = history[hIdx]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (hIdx < 0) return; hIdx++; if (hIdx >= history.length) { hIdx = -1; input.value = ""; } else input.value = history[hIdx]; }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "l") { e.preventDefault(); cmds.clear(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "c") { e.preventDefault(); line(span("t-user", "guest@orca"), ":", span("t-path", pretty(cwd)), "$ ", input.value, span("t-dim", "^C")); input.value = ""; hIdx = -1; scrollEnd(); }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    hIdx = -1;
    run(v);
    scrollEnd();
  });
  scroller.addEventListener("click", (e) => { if (!e.target.closest("a") && !getSelection().toString()) input.focus({ preventScroll: true }); });

  /* ───────── open / close (quake-style drawer) ───────── */
  let opened = false, greeted = false, lastFocus = null;
  const motd = () => {
    const lines = [
      [span("t-ok", "orcash 1.0"), span("t-dim", "  ·  a real shell over a fake filesystem, built from this page")],
      ["Type ", span("t-cmd", "help"), " to start, or try ", span("t-cmd", "neofetch"), ", ", span("t-cmd", "ls projects"), ", ", span("t-cmd", "orcalinux --kernel"), "."],
      [" "],
    ];
    lines.forEach((parts) => {
      const d = line(...parts);
      if (G && !reduce) G.from(d, { opacity: 0, x: -8, duration: 0.35, ease: "power3.out", delay: 0.15 + lines.indexOf(parts) * 0.08 });
    });
  };
  const inner = $(".crt-inner"), crt = $(".crt"), backdrop = $(".term-backdrop");
  const open = () => {
    if (opened) return input.focus();
    opened = true;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.body.classList.add("term-open");
    $$("[data-term-toggle]").forEach((b) => b.setAttribute("aria-expanded", "true"));
    if (G && !reduce) {
      G.killTweensOf([crt, inner, backdrop]);
      // the tube warms up: a bright horizontal line that opens into the picture
      G.timeline()
        .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, 0)
        .fromTo(crt, { opacity: 0, scale: 0.94, y: 24 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "expo.out" }, 0)
        .fromTo(inner, { scaleY: 0.004, scaleX: 0.35, filter: "brightness(9) blur(1px)" }, { scaleX: 1, duration: 0.22, ease: "power2.out" }, 0.12)
        .to(inner, { scaleY: 1, filter: "brightness(1) blur(0px)", duration: 0.42, ease: "expo.out", clearProps: "transform,filter" }, 0.3);
    }
    if (!greeted) { greeted = true; setPrompt(); motd(); }
    requestAnimationFrame(() => { input.focus({ preventScroll: true }); scrollEnd(); });
  };
  const close = () => {
    if (!opened) return;
    opened = false;
    document.body.classList.remove("term-open");
    $$("[data-term-toggle]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    const done = () => {
      drawer.hidden = true;
      if (G) G.set([inner, crt, backdrop], { clearProps: "all" });
      if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    };
    if (G && !reduce) {
      G.killTweensOf([crt, inner, backdrop]);
      // power off: the picture collapses to a line, then a dot
      G.timeline({ onComplete: done })
        .to(inner, { scaleY: 0.004, filter: "brightness(6)", duration: 0.16, ease: "power2.in" })
        .to(inner, { scaleX: 0, duration: 0.14, ease: "power2.in" })
        .to(crt, { opacity: 0, scale: 0.97, duration: 0.18, ease: "power2.in" }, "-=0.04")
        .to(backdrop, { opacity: 0, duration: 0.2 }, "<");
    } else done();
  };
  const toggle = () => (opened ? close() : open());

  $$("[data-term-toggle]").forEach((b) => b.addEventListener("click", toggle));
  $("#term-close").addEventListener("click", close);
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t.closest && t.closest("input, textarea, select, [contenteditable], dialog[open]")) return;
    if (e.key === "`" || e.key === "t") { e.preventDefault(); toggle(); }
  });
  window.orcash = { open, close, run: (c) => { open(); run(c); scrollEnd(); } };
})();
