# orcalinux.github.io

Personal site for **orcalinux**: embedded Linux and systems engineer in Cairo, Egypt.

Live at [orcalinux.github.io](https://orcalinux.github.io). The GitHub profile README lives in [orcalinux/orcalinux](https://github.com/orcalinux/orcalinux).

Plain HTML, CSS and a little JavaScript, no build step:

- `index.html`: the page. Every project it links to is a public repository.
- `style.css`: design tokens at the top (colour, type, spacing), light and dark themes, then components.
- `site.js`: theme toggle and live GitHub numbers. The page works without it; the numbers in the HTML are the fallback.
- `assets/`: images.

When you change `style.css` or `site.js`, change the `?v=` value on its link in `index.html` (for example to the new commit's short hash). GitHub Pages lets browsers cache files for 10 minutes, and without a new `?v=` a visitor can get the new page with an old stylesheet.

Preview locally with `python3 -m http.server` and open http://localhost:8000.
