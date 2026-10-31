# Handoff — "Launch Tower" personal site

A one-page personal / job-search site. You scroll from the nose cone of a rocket
down its launch tower to the launch pad; each part of the rocket carries one
section of the CV. **The design is finished. Your job is to fill in the real
content and ship it to GitHub Pages.**

Plain HTML + CSS + JS. No framework, no build step for the page, no npm install.
The only dependency is three.js for the launch effects, loaded by `js/fx.js` with a
dynamic `import()` from jsDelivr (pinned `three@0.160.0`, added at the owner's request).
If that download fails (e.g. jsDelivr is blocked), `fx.js` loads the Canvas 2D version
`js/fx-2d.js` instead; open the page with `?fx=2d` to preview that fallback.
Keep it that way unless the owner asks otherwise.

---

## 1. Files

| Path | What it is | Edit? |
|---|---|---|
| `index.html` | All page content. Every placeholder is in `[square brackets]`. | **Yes — main work** |
| `css/site.css` | All page styles. Colours and layout at the top, breakpoints at the bottom. | Small tweaks only |
| `js/main.js` | Footer year; JS fallback for the scroll pan in Firefox. | Rarely |
| `js/fx.js` | ES module, three.js: flame, smoke, black grit and sparks on two WebGL `<canvas>` layers; starts itself, falls back to `fx-2d.js`. | Only to tune the effect |
| `js/fx-2d.js` | Canvas 2D fallback (no dependencies). On fallback `fx.js` stretches the fire canvas to `top: 73.778%; height: 27.273%` (360 units above `FX.rect`), adds a `canvas[data-fx="smoke"]` at the end of `.fig`, and keeps the overlay, where the 2D version draws the cryogenic vapour column (vent to pad). | Only to tune the effect |
| `js/figure-data.js` | **Generated.** Figure size + anchor points for the particles. | No — regenerate |
| `assets/figure-back.svg` | **Generated.** Pad, tower, rear arms and rear piers. | No — regenerate |
| `assets/figure-mount.svg` | **Generated.** Stationary front piers, launch deck and rear clamps above the flame. | No — regenerate |
| `assets/figure-front.svg` | **Generated.** Engines, rocket, front clamps, near catch-arm. | No — regenerate |
| `assets/` | Also where `resume.pdf` and project screenshots go. | Add files |
| `figure-src/` | Source that draws the SVG layers (Node, no dependencies). | Only to change the drawing |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. | Keep |

## 2. Your tasks (in order)

1. **Replace every `[placeholder]` in `index.html`** with the owner's real info.
   Find them with `grep -n "\[" index.html`. They are in: `<title>` and `<meta>`
   tags, the header logo (`[YOUR-NAME]-1`), the hero, the side annotations
   (e.g. `[Trait that keeps you going]`), About, Skills, Experience, Projects,
   Contact links (`mailto:`, GitHub, LinkedIn) and the footer.
2. **The name printed on the rocket** is HTML, not part of the SVG:
   `<span class="fig-name">[YOUR NAME]<b>.</b></span>` inside `.fig`.
   Replace the text, keep `<b>.</b>` (the orange full stop). If the name is
   longer than ~12 characters, reduce `.fig-name { font-size }` in `site.css`.
3. **Never invent facts.** If a number, date, metric or result is unknown,
   ask the owner. If a stat has no real value, delete that element rather than
   making one up. The playful annotations ("LOX tank → [trait]") are optional —
   delete an annotation block if the owner has nothing for it.
4. **Projects:** each project is one `<article class="card rv">` in `#work`.
   Copy/delete to have 2–4. Put a screenshot in `assets/` (≤ 300 KB, ~1200 px
   wide) and replace the placeholder `<div>…[Project screenshot 01]</div>` with
   `<img src="assets/project-1.jpg" alt="short description" style="width:100%;height:150px;object-fit:cover;border-radius:10px">`.
   Point "Read case study" to a real URL or remove it.
5. **Résumé:** add `assets/resume.pdf` and point both "Résumé PDF" links to it
   (`href="assets/resume.pdf" download`). They currently point to `#contact`.
6. **Contact buttons** currently use `href="#contact"` — change to
   `mailto:…`, the GitHub profile and the LinkedIn URL (add
   `target="_blank" rel="noopener"` for external links).
7. Optional: an `og:image` (1200×630) in `assets/` + `<meta property="og:image">`.

## 3. How the page works (don't break these)

- **The figure rail.** `.rail` is absolutely positioned over the whole `.stage`;
  inside it `.stick` is `position: sticky; height: 100vh`, and `.fig` is
  translated by `--p` (0 → 1) as you scroll, so the camera "descends" the rocket
  from nose to pad while the text scrolls past. In Chrome/Edge/Safari `--p` is
  driven by CSS (`view-timeline: --rail`, `animation-timeline`); in browsers
  without that, `js/main.js` sets `--p` from `scroll`. Keep the
  `data-rail` / `data-fig` attributes.
- **Layer order matters:** inside `.fig`:
  `figure-back.svg` (includes the tower's red lens and mount) → `.mast-light` →
  `canvas[data-fx="fire"]` → `figure-mount.svg` → `figure-front.svg` → `.fig-name`
  text. The front piers and deck occlude the flame in both renderers.
  After `.stick`, still inside `.rail`, comes
  `canvas.fxo[data-fx="overlay"]`: a `position: fixed` full-viewport layer for
  smoke, black grit, soot and sparks. It paints over the figure but under the
  page content (the rail's `z-index: 1`), so grit can fall from the nose all the
  way to the pad while the page scrolls.
- **Effects** (`js/fx.js`, three.js): everything is simulated in figure (viewBox)
  units. Anchors come from `window.FIGURE.fx` (engine exits, ground point,
  trench direction and debris sources around the ring); rocket radius and
  nose height are constants at the top of `fx.js` (from `figure-src/build.mjs`).
  The fire layer uses a fixed camera over `FX.rect`; the overlay camera is
  re-fitted every frame from `.fig`'s bounding box. ≥ 1181 px the plume splits
  to both sides of the pad; below that it runs down the trench. The loop runs
  only while the rail is on screen, pauses in a hidden tab, and draws one still
  frame under `prefers-reduced-motion`. The rocket's rumble is CSS
  (`@keyframes rumble` on `.fig-front` and the printed name).
- **Ground smoke:** both renderers draw the rolling clouds on the full-viewport
  overlay. Older puffs spread towards the window margins and expand as they
  drift. Horizontal and ground-level masks fade them before the page edges.
- **Layout:** desktop is three columns (`content | figure | content`);
  ≤ 1180 px the figure moves to a narrow left column and side annotations hide;
  ≤ 600 px the figure is 118 px wide. Check 390, 768, 1024, 1440 px.
- **Reduced motion** is respected everywhere (CSS media query + JS). Keep it.

## 4. Design rules

- Palette: paper `#ECEBE8` / `#F4F3F0`, charcoal `#1E1F22`, secondary text
  `#4A4C52`, one accent orange `#F26A21` (fills, buttons with dark text).
  Small orange **text** uses `--ink` (the accent mixed 28% toward black) so it
  passes contrast on the paper background — don't use the bright orange for
  small text.
- Type: **Inter Tight** (headings 800, tight letter-spacing), **JetBrains Mono**
  for labels/specs. Annotations are small uppercase Inter Tight with wide tracking.
- Cards are frosted white (`.card`). One accent colour only.
- Look reference: a retro product render — frosted white plastic, matte
  charcoal, one orange part, soft studio light.

## 5. Changing the drawing (only if asked)

The rocket/tower is drawn by `figure-src/build.mjs` with the bundled
isometric kit (`figure-src/kit/`, from the "anatomy" skill, MIT licence).
Node 20+; no npm packages.

```bash
cd figure-src
node build.mjs          # writes the SVG layers and fig.json here
node make-assets.mjs    # writes the SVG assets and ../js/figure-data.js
```

Within the job_apply workspace, `node build.mjs --audit` checks the tower-top
hardware, nozzle cluster, hold-down clamps and mount against their rendered order
using the project-local Anatomy skill.

Useful knobs at the top of `build.mjs`: `R` / `RF` (body / fairing radius),
`Z` (heights of each stage), `ENGINES`, `MOUNT`, `TW` (tower), `DECKS`
(platform levels), `ARM` (arm heights). Colours are in `figure-src/palette.css`
(materials) and the `GRADS` table in `build.mjs` (lit round parts).
If the figure's width/height changes, also update `aspect-ratio` on `.fig` in
`css/site.css` to `W / H` from `fig.json`, and the two canvas `style`
rectangles and `.fig-name` positions in `index.html` (values are printed in
`js/figure-data.js`: `rect`, `name.at`, `name.sub`). In `build.mjs`, `mastBeacon()`
draws the fixture and `mastBeaconLight()` draws the illuminated glass, halo
and reflected light. The `.mast-light` animation varies their brightness together
and holds it steady under reduced motion.

## 6. Before shipping — checklist

- [ ] `grep -n "\[" index.html` shows no placeholders left (other than ones the owner chose to keep)
- [ ] Looks right at 390, 768, 1024 and 1440 px wide; no horizontal scroll
- [ ] Scroll the whole page in Chrome **and** Firefox: the rocket pans to the pad, grit falls from the nose, flames/smoke run at the bottom
- [ ] All links work (mailto, GitHub, LinkedIn, résumé PDF, case studies)
- [ ] Images have `alt` text and are compressed
- [ ] Lighthouse: Accessibility ≥ 90, Performance ≥ 85
- [ ] Deploy steps in `README.md`
