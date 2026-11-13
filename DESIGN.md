# Design — orcalinux.github.io

The site is the manual page `orcalinux(1)`, rendered in a terminal pager. Built from the user's ORCA LINUX banner and avatar.

## Tokens (`site.css :root`)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#050b12` | terminal ground |
| `--bg-2` / `--bg-3` | `#08131d` / `#0c1c29` | example rows / kbd, buttons |
| `--fg` / `--fg-hi` | `#d6eef5` / `#ffffff` | body / bold literals, headings |
| `--muted` | `#86a3ae` | secondary text (7:1 on bg) |
| `--cyan` | `#00e5ff` | arguments, links, active state, focus |
| `--green` | `#3ddc5a` | shell prompt `orca@linux` |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | arrivals |
| `--ease-ui` | `cubic-bezier(.2,0,0,1)` | state changes |

Type: JetBrains Mono everywhere (400/600/800). The wordmark is ANSI-Shadow ASCII art with a cyan glow.

## Grammar

- Section heads: bold uppercase at column 0; bodies indented `7ch` (`2ch` under 820px).
- Bold = literal you type, underlined cyan = argument (`<u>`).
- Header/footer lines `ORCALINUX(1) · User Commands · ORCALINUX(1)`.
- `less` status line fixed at the bottom: line N/total, %, messages, `/ h g` buttons.
- Neon glow is a brand commitment (banner/avatar), used on the wordmark, active flag, index marker and CTA only.

## Components

- **Flag** `[--kernel]`: toggle button, `aria-pressed`, filled cyan when on. Same `data-flag` in SYNOPSIS and OPTIONS stays in sync and filters EXAMPLES.
- **Example row**: 14px radius on `--bg-2`, shadow ring; `git clone` bar with copy button (icon crossfade, scale .25→1, blur 4→0); hover = cursor spotlight + border light + 4px lift + ±5° tilt.
- **CTA**: cyan fill, `$ open …`, press scale .96.

## Motion (GSAP 3.13: ScrollTrigger, ScrollTo, ScrambleText, Flip)

- Focal: boot — `man orcalinux` types, wordmark wipes in line by line, avatar scans in (steps). Once per session; any key/click skips.
- Scroll: index marker glides to the active section; headings scramble-decode once; examples enter as a staggered list; avatar/wordmark scrub away; banner opens like a shutter.
- Filter: Flip reorders matches first, non-matches dim to .28.
- `prefers-reduced-motion`: no boot, no scroll motion, no lift/tilt; colour/opacity feedback stays.

## Keys

`j k d u g G / n N h q`, `1`–`8` toggle flags.
