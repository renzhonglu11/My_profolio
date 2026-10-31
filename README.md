# Launch Tower — personal site

One-page personal site: scroll from the nose of a rocket down to its launch pad.
Plain HTML/CSS/JS, no build step.

> Working on this as an agent? Read **HANDOFF.md** first.

## Preview locally

Open `index.html` directly, or (better, so fonts and SVGs load like on the web):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

**User site — `https://<username>.github.io`**

1. Create a public repo named exactly `<username>.github.io` (no README).
2. Push these files to the root of `main`:
   ```bash
   git init
   git add .
   git commit -m "Launch Tower site"
   git branch -M main
   git remote add origin https://github.com/<username>/<username>.github.io.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
4. Live in a minute or two.

A project repo (`https://<username>.github.io/<repo>`) works too: all paths are relative.

## Structure

```
index.html            content
css/site.css          styles
js/main.js            startup + scroll fallback
js/fx.js              three.js effects: flame, smoke, black grit, sparks (ES module)
js/figure-data.js     generated anchors for the particles
assets/               figure SVGs (generated), résumé, screenshots
figure-src/           source of the rocket drawing (node build.mjs && node make-assets.mjs)
.nojekyll             serve files as-is
```

Credits: the isometric drawing kit in `figure-src/kit/` comes from the
*anatomy* skill (MIT, see `figure-src/kit/LICENSE`).
