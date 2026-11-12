# orcalinux.github.io

Personal site for **orcalinux**: embedded Linux and systems engineer in Cairo, Egypt.

Live at [orcalinux.github.io](https://orcalinux.github.io). The GitHub profile README lives in [orcalinux/orcalinux](https://github.com/orcalinux/orcalinux).

Plain HTML, CSS and a little JavaScript, no build step:

- `index.html`: the page. Every project it links to is a public repository.
- `style.css`: design tokens at the top (colour, type, spacing), light and dark themes, then components.
- `site.js`: theme toggle and live GitHub numbers. The page works without it; the numbers in the HTML are the fallback.
- `assets/`: images.

Preview locally with `python3 -m http.server` and open http://localhost:8000.
