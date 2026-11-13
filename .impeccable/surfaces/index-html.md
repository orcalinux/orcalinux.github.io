---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface: orcalinux.github.io (home)

Scope: the single-page personal site. Visitor mode: **Experience**. Audience: fellow embedded/Linux engineers; job: see what orcalinux builds and click through to code.

## Direction contract

THESIS: The site *is* the manual page `orcalinux(1)`. Refuses the portfolio default (hero headline + subtitle + button, row of equal project cards).

OWN-WORLD: near-black #050b12 terminal ground, man-page grammar: bold literals, underlined cyan arguments, UPPERCASE section heads at column 0 with 7ch-indented bodies, header/footer lines `ORCALINUX(1)  User Commands  ORCALINUX(1)`, a `less` status line pinned at the bottom. JetBrains Mono throughout; ANSI-Shadow ASCII "ORCA" wordmark with cyan glow; user's avatar as the figure. Green prompt, cyan for args/links.

STORY: visitor sees `man orcalinux` typed and the page render; learns areas of work in NAME/SYNOPSIS/OPTIONS; uses flags to filter EXAMPLES (projects as `git clone` commands); clicks through to GitHub.

FIRST VIEWPORT: man header line full width; left sticky section index; main column: prompt line `orca@linux:~$ man orcalinux`, ASCII ORCA wordmark, NAME, start of SYNOPSIS whose flags are clickable buttons; avatar (≈300px) right of NAME; less status line at bottom showing line/percent.

FORM: man page (my rank 7 of 7, dealt lead). Signature interaction: SYNOPSIS/OPTIONS flags filter EXAMPLES; `less` keys (j/k/d/u/g/G, / search, n/N, h help). Motion: one boot sequence (type command → page prints line by line), scroll-linked status line + index marker. seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
