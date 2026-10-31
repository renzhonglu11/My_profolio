/* Launch-pad effects in three.js (see HANDOFF.md).
   Two WebGL layers, both working in figure (SVG viewBox) units:
   - fire:    canvas inside .fig below the mount and rocket SVGs (flame, plume, glow)
   - overlay: full-viewport canvas over the figure (smoke, black grit and soot, sparks), so particles can fall
              from the nose all the way down while the page scrolls.
   three.js is loaded with a dynamic import; if that fails (e.g. jsDelivr is blocked) the Canvas 2D
   version in js/fx-2d.js runs instead. */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
let THREE;

const FIG_W = 470;
// Rocket geometry, from figure-src/build.mjs (R = 68, RF = 75, z.tip = 2794) and fig.json (noseTip).
const NOSE_Y = 346.3;                 // nose tip, viewBox y
const HW = 1.245;                     // on-screen half-width per unit of radius (engine ring r = 44 spans 223.5..333.1)
const R_BODY = 68, R_FAIR = 75;
const Z_BOAT = 2379, Z_FAIR = 2425, Z_OGIVE = 2587, Z_TIP = 2794;

// Fade exhaust over the ground before the following section covers the rail.
// Figure canvases use percentages; the fixed overlay uses the same stops in viewport pixels.
function fadeFigureCanvas(canvas, top, height) {
  const figure = window.FIGURE;
  const percent = y => (y - top) / height * 100;
  canvas.style.maskImage = `linear-gradient(#000 ${percent(figure.fx.ground[1])}%, transparent ${percent(figure.H)}%)`;
}

function fadeOverlay(canvas, rect) {
  const figure = window.FIGURE;
  const start = Math.round(rect.top + rect.height * figure.fx.ground[1] / figure.H);
  const end = Math.round(rect.bottom);
  canvas.style.maskImage = `linear-gradient(to right,transparent,#000 3%,#000 97%,transparent),linear-gradient(#000 ${start}px, transparent ${end}px)`;
  canvas.style.maskComposite = 'intersect';
}

// Keep ground clouds anchored at the pad, then let older puffs roll towards the
// viewport margins. Distances are converted back into the figure's coordinates.
function smokeReach(rect, ground) {
  const scale = rect.width / window.FIGURE.W;
  const padX = rect.left + ground[0] * scale;
  const margin = innerWidth * .035;
  return [
    Math.max(0,(padX-margin)/scale),
    Math.max(0,(innerWidth-margin-padX)/scale)
  ];
}

function smokeCloud(puff, ground, reach) {
  const side = puff.x < ground[0] ? -1 : 1;
  const age = puff.age / puff.life;
  const t = Math.min(1,Math.max(0,(age-.04)/.82));
  const drift = side * Math.max(0,reach[side < 0 ? 0 : 1]-280) * t*t*(3-2*t);
  return {
    x: puff.x + drift,
    growth: Math.min(2.4,Math.sqrt(1+Math.abs(drift)/280))
  };
}

function startFx(FX) {
  const fireCanvas = document.querySelector('[data-fx="fire"]');
  const overCanvas = document.querySelector('[data-fx="overlay"]');
  const figEl = document.querySelector('[data-fig]');
  const railEl = document.querySelector('[data-rail]');
  if (!fireCanvas || !overCanvas || !figEl) return () => {};

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Desktop (three-column) layout: the plume hits the pad and billows out to both sides.
  const mq = matchMedia('(min-width: 1181px)');
  let wide = mq.matches;
  const rnd = Math.random;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const [X0, Y0, UW, UH] = FX.rect;
  fadeFigureCanvas(fireCanvas, Y0, UH);
  const ground = FX.ground, tdir = FX.trenchDir, tend = FX.trenchEnd;
  const ex = FX.engines.reduce((a, e) => a + e[0], 0) / FX.engines.length;
  const ey = FX.engines.reduce((a, e) => a + e[1], 0) / FX.engines.length;
  const zy = (ground[1] - NOSE_Y) / Z_TIP;                 // viewBox units per unit of height
  const yAt = (z) => ground[1] - z * zy;
  const radiusAt = (z) => z < Z_BOAT ? R_BODY : z < Z_FAIR ? lerp(R_BODY, R_FAIR, (z - Z_BOAT) / (Z_FAIR - Z_BOAT))
    : z < Z_OGIVE ? R_FAIR : R_FAIR * Math.sqrt(Math.max(0, 1 - Math.pow((z - Z_OGIVE) / (Z_TIP - Z_OGIVE), 2)));
  const ringTop = FX.ringTop;

  // ---------- sprite atlas: 4 x 4 tiles of 128 px, white shapes in alpha ----------
  const TILE = 128, GRID = 4;
  const atlas = document.createElement('canvas'); atlas.width = atlas.height = TILE * GRID;
  const ac = atlas.getContext('2d');
  const tileAt = (i) => [(i % GRID) * TILE, Math.floor(i / GRID) * TILE];
  const PUFFS = 10, ROUND = 10, STREAK = 11, DOT = 12;
  // irregular "cauliflower" smoke puffs built from many sub-blobs
  for (let i = 0; i < PUFFS; i++) {
    const [ox, oy] = tileAt(i);
    for (let j = 0; j < 22; j++) {
      const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.7) * 30, r = 12 + rnd() * 20;
      const bx = ox + 64 + Math.cos(a) * d, by = oy + 66 + Math.sin(a) * d * 0.8;
      const g = ac.createRadialGradient(bx, by, 0, bx, by, r);
      g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.55, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ac.fillStyle = g; ac.fillRect(bx - r, by - r, r * 2, r * 2);
    }
  }
  {
    const [ox, oy] = tileAt(ROUND);
    const g = ac.createRadialGradient(ox + 64, oy + 64, 0, ox + 64, oy + 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.38, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ac.fillStyle = g; ac.fillRect(ox, oy, TILE, TILE);
  }
  {
    const [ox, oy] = tileAt(STREAK);
    const g = ac.createLinearGradient(0, oy + 40, 0, oy + 88);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ac.fillStyle = g; ac.beginPath(); ac.roundRect(ox + 6, oy + 40, 116, 48, 24); ac.fill();
  }
  {
    const [ox, oy] = tileAt(DOT);
    const g = ac.createRadialGradient(ox + 64, oy + 64, 0, ox + 64, oy + 64, 58);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ac.fillStyle = g; ac.fillRect(ox, oy, TILE, TILE);
  }
  const atlasTex = new THREE.CanvasTexture(atlas);
  atlasTex.flipY = false;

  // exhaust column: hot white core, yellow / orange sheath, transparent edges
  const plumeCanvas = document.createElement('canvas'); plumeCanvas.width = 64; plumeCanvas.height = 256;
  {
    const x = plumeCanvas.getContext('2d');
    let g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(0.2, 'rgba(255,150,60,.55)'); g.addColorStop(0.38, 'rgba(255,214,130,.95)');
    g.addColorStop(0.5, 'rgba(255,252,236,1)'); g.addColorStop(0.62, 'rgba(255,214,130,.95)'); g.addColorStop(0.8, 'rgba(255,150,60,.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    x.globalCompositeOperation = 'destination-in';
    g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(0.8, '#000'); g.addColorStop(1, 'rgba(0,0,0,.35)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  }
  const plumeTex = new THREE.CanvasTexture(plumeCanvas);
  plumeTex.flipY = false;
  // soft disc used to keep the smoke off the exhaust column
  const holeCanvas = document.createElement('canvas'); holeCanvas.width = holeCanvas.height = 128;
  {
    const x = holeCanvas.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.65, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }
  const holeTex = new THREE.CanvasTexture(holeCanvas);

  // ---------- instanced sprite batches ----------
  const VERT = `
    attribute vec2 iPos; attribute vec2 iSize; attribute float iRot; attribute vec4 iColor; attribute float iFrame;
    varying vec2 vUv; varying vec4 vColor; varying float vFrame; varying float vShadeY;
    void main() {
      vUv = uv; vColor = iColor; vFrame = iFrame;
      vec2 p = position.xy * iSize;
      float c = cos(iRot), s = sin(iRot);
      p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
      vShadeY = clamp(p.y / max(iSize.y, 0.001) + 0.5, 0.0, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(iPos + p, 0.0, 1.0);
    }`;
  const FRAG = `
    uniform sampler2D map; uniform float uShade;
    varying vec2 vUv; varying vec4 vColor; varying float vFrame; varying float vShadeY;
    void main() {
      vec2 t = vec2(mod(vFrame, ${GRID}.0), floor(vFrame / ${GRID}.0));
      float a = texture2D(map, (t + 0.01 + vUv * 0.98) / ${GRID}.0).a * vColor.a;
      if (a < 0.002) discard;
      // smoke is lit from above and shaded underneath
      vec3 col = vColor.rgb * mix(1.0, mix(1.12, 0.8, vShadeY), uShade);
      gl_FragColor = vec4(col * a, a);
    }`;
  class Batch {
    constructor(cap, blending, shade) {
      const plane = new THREE.PlaneGeometry(1, 1);
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = plane.index; geo.setAttribute('position', plane.getAttribute('position')); geo.setAttribute('uv', plane.getAttribute('uv'));
      this.cap = cap; this.n = 0;
      const attr = (name, size) => {
        const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * size), size);
        a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, a); return a;
      };
      this.pos = attr('iPos', 2); this.size = attr('iSize', 2); this.rot = attr('iRot', 1); this.color = attr('iColor', 4); this.frame = attr('iFrame', 1);
      this.mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: atlasTex }, uShade: { value: typeof shade === 'number' ? shade : shade ? 1 : 0 } }, vertexShader: VERT, fragmentShader: FRAG,
        transparent: true, depthTest: false, depthWrite: false, blending, premultipliedAlpha: true, side: THREE.DoubleSide
      });
      this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.geo = geo;
    }
    add(x, y, w, h, rot, r, g, b, a, frame) {
      if (this.n >= this.cap || a <= 0.002) return;
      const i = this.n++;
      this.pos.array[i * 2] = x; this.pos.array[i * 2 + 1] = y;
      this.size.array[i * 2] = w; this.size.array[i * 2 + 1] = h;
      this.rot.array[i] = rot; this.frame.array[i] = frame;
      this.color.array.set([r, g, b, a], i * 4);
    }
    flush() {
      this.geo.instanceCount = this.n;
      for (const a of [this.pos, this.size, this.rot, this.color, this.frame]) a.needsUpdate = true;
      this.n = 0;
    }
  }

  // ---------- renderers ----------
  const makeRenderer = (canvas) => {
    try {
      const r = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false });
      r.setClearColor(0x000000, 0); r.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      return r;
    } catch (e) { return null; }
  };
  const fireR = makeRenderer(fireCanvas), overR = makeRenderer(overCanvas);
  if (!fireR || !overR) return () => {};
  // y-down orthographic cameras in viewBox units
  const fireCam = new THREE.OrthographicCamera(X0, X0 + UW, Y0, Y0 + UH, -1, 1);
  const overCam = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);
  const fireScene = new THREE.Scene(), overScene = new THREE.Scene();

  const glowB = new Batch(8, THREE.AdditiveBlending, false);
  const flameB = new Batch(2400, THREE.NormalBlending, false);
  const flameAddB = new Batch(900, THREE.AdditiveBlending, false);
  const vaporB = new Batch(1400, THREE.NormalBlending, 2);
  const smokeB = new Batch(900, THREE.NormalBlending, true);
  const gritB = new Batch(1240, THREE.NormalBlending, false);
  const sparkB = new Batch(300, THREE.AdditiveBlending, false);

  const plumeMesh = (op) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: plumeTex, transparent: true, opacity: op, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    m.frustumCulled = false; return m;
  };
  const sheath = plumeMesh(0.92), core = plumeMesh(0.8);
  // keep the exhaust column clear: smoke never sits on top of the flame
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: holeTex, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
  }));
  hole.frustumCulled = false;

  [glowB.mesh, sheath, flameB.mesh, core, flameAddB.mesh].forEach((m, i) => { m.renderOrder = i; fireScene.add(m); });
  [vaporB.mesh, smokeB.mesh, hole, gritB.mesh, sparkB.mesh].forEach((m, i) => { m.renderOrder = i; overScene.add(m); });

  // ---------- simulation (viewBox units, seconds) ----------
  const HEAT = [[150, 40, 12], [214, 70, 20], [245, 105, 30], [255, 145, 50], [255, 185, 80], [255, 215, 130], [255, 238, 190], [255, 250, 232]].map((c) => c.map((v) => v / 255));
  // smoke tones: fresh white steam -> older, greyer exhaust; LIT = flame-lit underside
  const TONES = [[250, 248, 245], [238, 235, 231], [222, 218, 213], [205, 200, 194]].map((c) => c.map((v) => v / 255));
  const LIT = [255 / 255, 176 / 255, 110 / 255];
  const INK = [30 / 255, 31 / 255, 34 / 255];
  const flames = [], puffs = [], sparks = [], grit = [], vapor = [];

  function emitFlame(e) {
    const j = (rnd() - 0.5) * FX.exitR * 1.3, glint = rnd() < 0.22;
    flames.push({
      x: e[0] + j, y: e[1] + rnd() * 3, vx: j * 1.6 + (e[0] - ground[0]) * 0.9 + (rnd() - 0.5) * (glint ? 60 : 26),
      vy: (glint ? 470 : 360) + rnd() * 110, age: 0, life: (glint ? 0.35 : 0.5) + rnd() * 0.28,
      s0: glint ? 1.1 + rnd() * 0.8 : 5.2 + rnd() * 3.8, hit: false, glint
    });
  }
  function emitPuff(x, y, vx, vy, s, life, warm) {
    if (puffs.length > (wide ? 700 : 300)) return;
    puffs.push({ x, y, vx, vy, s0: s, age: 0, life, warm, v: (rnd() * PUFFS) | 0, g: 1.6 + rnd() * 2.2, rot: rnd() * 6.283 });
  }
  function emitSpark(x, y) {
    const a = -Math.PI * (0.15 + rnd() * 0.7), v = 160 + rnd() * 260;
    sparks.push({ x, y, vx: Math.cos(a) * v * 0.6 + tdir[0] * 40 * rnd(), vy: Math.sin(a) * v, age: 0, life: 0.5 + rnd() * 0.7 });
  }
  // black grit: kind 0 = thrown off the pad (falls fast), 1 = soot drifting up, 2 = flakes falling down the rocket
  function emitGrit(kind, x, y, vx, vy, life, s, floor) {
    if (grit.length > 1200) return;
    grit.push({ kind, x, y, vx, vy, age: 0, life, s, floor });
  }
  function emitFlake(zMin, zMax) {
    const z = lerp(zMin, zMax, rnd()), side = rnd() < 0.5 ? -1 : 1;
    const hw = radiusAt(z) * HW;
    emitGrit(2, ex + side * hw * (0.85 + rnd() * 0.15), yAt(z), side * (12 + rnd() * 45), -15 + rnd() * 25, 14 + rnd() * 6, 0.9 + rnd() * 1.2, ground[1] + 30);
  }
  // Cryogenic vapour venting on the side away from the tower, like a rocket being fuelled: a dense column
  // clings to the body from a vent just below the interstage and cascades down to the pad, widening as it
  // falls; thin tendrils curl off its outer edge, and what reaches the pad spreads out. Cold vapour sinks.
  // kind 0 = column, 1 = tendril, 2 = pooling on the pad
  const V_SIDE = 1, V_Z = 1790, V_Y = yAt(V_Z);
  const vEdge = (y) => ex + V_SIDE * radiusAt(Math.max(0, (ground[1] - y) / zy)) * HW;
  const vSpread = (y) => 10 + Math.max(0, y - V_Y) * 0.1;   // how far the column reaches past the body edge
  function emitColumn() {
    if (vapor.length > 1300) return;
    const y = V_Y + (rnd() - 0.5) * 16;
    vapor.push({
      kind: 0, x: vEdge(y) + V_SIDE * (rnd() * 10 - 4), y, vx: V_SIDE * (30 + rnd() * 50), vy: 40 + rnd() * 50, off: rnd(),
      age: 0, life: 24 + rnd() * 4, s0: 20 + rnd() * 16, g: 1.6 + rnd() * 1.6, v: (rnd() * PUFFS) | 0, rot: rnd() * 6.283, spin: (rnd() - 0.5) * 0.5
    });
  }
  function emitTendril() {
    if (vapor.length > 1300) return;
    const y = lerp(V_Y + 30, ground[1] - 60, Math.pow(rnd(), 0.8));
    vapor.push({
      kind: 1, x: vEdge(y) + V_SIDE * vSpread(y) * (0.6 + rnd() * 0.6), y, vx: V_SIDE * (25 + rnd() * 60), vy: (rnd() - 0.6) * 30,
      curl: (rnd() - 0.5) * 1.6, age: 0, life: 4 + rnd() * 4, s0: 10 + rnd() * 10, g: 2 + rnd() * 1.5, v: (rnd() * PUFFS) | 0, rot: rnd() * 6.283, spin: (rnd() - 0.5) * 0.8
    });
  }
  const each = (rate, dt, fn) => { let n = rate * dt; while (n > 0) { if (n >= 1 || rnd() < n) fn(); n -= 1; } };

  function step(dt) {
    wide = mq.matches;
    // flames from every engine
    for (const e of FX.engines) each(165, dt, () => emitFlame(e));
    for (let i = flames.length - 1; i >= 0; i--) {
      const p = flames[i];
      p.age += dt;
      if (!p.hit && p.y > ground[1] - 6 - rnd() * 10) {
        p.hit = true;
        if (wide) {
          // split left / right along the pad, hugging the ground
          const side = rnd() < 0.5 ? -1 : 1, sp = Math.hypot(p.vx, p.vy) * (0.6 + rnd() * 0.35), a = rnd() * 0.25;
          p.vx = side * Math.cos(a) * sp; p.vy = -Math.sin(a) * sp * 0.4 + (rnd() - 0.5) * 40;
          p.life = p.age + 0.45 + rnd() * 0.5;
          if (rnd() < 0.05) emitSpark(p.x, p.y);
        } else {
          const sp = Math.hypot(p.vx, p.vy) * (0.3 + rnd() * 0.2);
          if (rnd() < 0.72) { const a = (rnd() - 0.5) * 0.7; const c = Math.cos(a), s = Math.sin(a); p.vx = (tdir[0] * c - tdir[1] * s) * sp; p.vy = (tdir[0] * s + tdir[1] * c) * sp; }
          else { const a = rnd() * Math.PI * 2; p.vx = Math.cos(a) * sp * 0.8; p.vy = Math.sin(a) * sp * 0.38 - sp * 0.2; }
          p.life = p.age + 0.25 + rnd() * 0.3;
          if (rnd() < 0.035) emitSpark(p.x, p.y);
        }
      }
      if (p.hit) { p.vx *= 1 - (wide ? 1.3 : 2.6) * dt; p.vy = p.vy * (1 - 1.6 * dt) - 70 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age >= p.life) {
        if (p.hit && wide && rnd() < 0.18) emitPuff(p.x, p.y, p.vx * 0.4, -10 - rnd() * 14, 10 + rnd() * 12, 3 + rnd() * 3, 1);
        else if (p.hit && !wide && rnd() < 0.22) emitPuff(p.x, p.y, p.vx * 0.1, -12 - rnd() * 10, 18 + rnd() * 12, 3 + rnd() * 2.5, 1);
        flames.splice(i, 1);
      }
    }
    // smoke: wide = clouds rolling out to both sides of the pad; otherwise from the trench. Plus the base of the mount.
    if (wide) {
      each(70, dt, () => {
        const side = rnd() < 0.5 ? -1 : 1, low = rnd() < 0.7;
        emitPuff(ground[0] + side * (50 + rnd() * 50), ground[1] + (rnd() - 0.4) * 30,
          side * (low ? 110 + rnd() * 170 : 30 + rnd() * 60), low ? -6 - rnd() * 16 : -30 - rnd() * 40,
          (low ? 14 : 24) + rnd() * 26, 3.5 + rnd() * 4.5, 1);
      });
    } else {
      const sx = lerp(ground[0], tend[0], 0.45), sy = lerp(ground[1], tend[1], 0.45);
      each(38, dt, () => emitPuff(sx + (rnd() - 0.5) * 40, sy + (rnd() - 0.5) * 16, tdir[0] * (12 + rnd() * 18), tdir[1] * 12 - 18 - rnd() * 22, 26 + rnd() * 20, 3.5 + rnd() * 2.5, 1));
    }
    each(11, dt, () => {
      const b = FX.base[(rnd() * FX.base.length) | 0];
      const dx = b[0] - ground[0], dy = b[1] - ground[1], l = Math.hypot(dx, dy) || 1;
      emitPuff(b[0], b[1] - 4, (dx / l) * (24 + rnd() * 26), (dy / l) * 10 - 8 - rnd() * 12, 20 + rnd() * 18, 3.6 + rnd() * 2.6, 0.7);
    });
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.age += dt; p.vx = p.vx * (1 - 0.7 * dt) + (rnd() - 0.5) * 30 * dt; p.vy = p.vy * (1 - 0.45 * dt) - 7 * dt + (rnd() - 0.5) * 20 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age >= p.life) puffs.splice(i, 1);
    }
    each(9, dt, () => emitSpark(wide ? ground[0] + (rnd() - 0.5) * 140 : ground[0] + tdir[0] * rnd() * 60, wide ? ground[1] - rnd() * 10 : ground[1] + tdir[1] * rnd() * 60));
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.age += dt; p.vy += 520 * dt; p.vx *= 1 - 0.4 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age >= p.life) sparks.splice(i, 1);
    }

    // black grit
    each(30, dt, () => {   // thrown off the pad by the blast
      const side = rnd() < 0.5 ? -1 : 1;
      const vx = wide ? side * (80 + rnd() * 280) : (rnd() - 0.5) * 220 + tdir[0] * 90;
      emitGrit(0, ground[0] + (rnd() - 0.5) * 70, ground[1] - rnd() * 8, vx, -(50 + rnd() * 230), 0.8 + rnd() * 1.3, 0.6 + rnd() * 1.5, ground[1] + 30);
    });
    each(wide ? 18 : 10, dt, () => {   // fine soot rising with the smoke
      const side = rnd() < 0.5 ? -1 : 1;
      const x = wide ? ground[0] + side * (60 + rnd() * 220) : lerp(ground[0], tend[0], rnd()) + (rnd() - 0.5) * 120;
      emitGrit(1, x, ground[1] - rnd() * 60, (wide ? side * 20 : tdir[0] * 10) + (rnd() - 0.5) * 24, -10 - rnd() * 26, 2.4 + rnd() * 2.4, 0.5 + rnd() * 1.1, 0);
    });
    each(20, dt, () => emitFlake(Z_FAIR, Z_TIP - 30));   // shaken off the nose and fairing
    each(12, dt, () => emitFlake(340, Z_FAIR));          // and off the body on the way down
    each(9, dt, () => {   // kicked off the pad's outer edge
      const b = FX.base[(rnd() * FX.base.length) | 0];
      const dx = b[0] - ground[0], dy = b[1] - ground[1], l = Math.hypot(dx, dy) || 1;
      emitGrit(0, b[0], b[1] - 3, (dx / l) * (40 + rnd() * 90), -(60 + rnd() * 140), 0.7 + rnd() * 0.8, 0.5 + rnd() * 1.1, b[1] + 30);
    });
    each(5, dt, () => {   // and off the mount ring
      const q = ringTop[(rnd() * ringTop.length) | 0], dx = q[0] - ex, l = Math.abs(dx) || 1;
      emitGrit(0, q[0], q[1], (dx / l) * (30 + rnd() * 80), -(40 + rnd() * 110), 0.8 + rnd() * 0.8, 0.5 + rnd() * 0.9, ground[1] + 30);
    });
    for (let i = grit.length - 1; i >= 0; i--) {
      const p = grit[i];
      p.age += dt;
      if (p.kind === 1) { p.vx = p.vx * (1 - 0.3 * dt) + (rnd() - 0.5) * 40 * dt; p.vy = p.vy * (1 - 0.2 * dt) - 4 * dt; }
      else if (p.kind === 2) { p.vx = p.vx * (1 - 0.6 * dt) + (rnd() - 0.5) * 70 * dt; p.vy = p.vy * (1 - 1.4 * dt) + 260 * dt; }
      else { p.vx *= 1 - 0.8 * dt; p.vy = p.vy * (1 - 0.5 * dt) + 380 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind !== 1 && p.y > p.floor) p.age = p.life;
      if (p.age >= p.life) grit.splice(i, 1);
    }

    each(42, dt, emitColumn);
    each(20, dt, emitTendril);
    for (let i = vapor.length - 1; i >= 0; i--) {
      const p = vapor[i];
      p.age += dt;
      if (p.kind === 0) {
        // steer toward a line just outside the body edge that widens as the column falls
        const target = vEdge(p.y) + V_SIDE * vSpread(p.y) * (0.3 + p.off * 1.1);
        p.vx += ((target - p.x) * 1.0 - p.vx) * 1.1 * dt + (rnd() - 0.5) * 30 * dt;
        p.vy = p.vy * (1 - 0.25 * dt) + 30 * dt + (rnd() - 0.5) * 20 * dt;
        if (p.y > ground[1] - 60) {   // reached the pad: spread out along it
          p.kind = 2; p.age = 0; p.life = 3 + rnd() * 3; p.s0 *= 1 + p.g; p.g = 1 + rnd();
          p.vx = (rnd() < 0.75 ? V_SIDE : -V_SIDE) * (30 + rnd() * 70); p.vy *= 0.15;
        }
      } else if (p.kind === 1) {
        // tendrils drift outward, slow down and curl
        const w = p.curl * dt, c = Math.cos(w), sn = Math.sin(w), vx = p.vx;
        p.vx = vx * c - p.vy * sn; p.vy = vx * sn + p.vy * c;
        p.vx *= 1 - 0.5 * dt; p.vy = p.vy * (1 - 0.5 * dt) + 6 * dt;
      } else {
        p.vx *= 1 - 0.7 * dt; p.vy = p.vy * (1 - 0.8 * dt) + 2 * dt;
      }
      p.rot += p.spin * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age >= p.life || p.y > ground[1] + 20) vapor.splice(i, 1);
    }
  }

  // ---------- drawing ----------
  function buildFire(t) {
    const flick = 0.85 + 0.15 * Math.sin(t * 31) * Math.sin(t * 17.3);
    const glow = (x, y, rx, ry, c, a) => glowB.add(x, y, rx * 2, ry * 2, 0, c[0] / 255, c[1] / 255, c[2] / 255, a, ROUND);
    glow(ground[0], ground[1] - 30, 190, 190, [255, 130, 50], 0.26 * flick);
    if (wide) glow(ground[0], ground[1] - 20, 520, 120, [255, 150, 60], 0.34 * flick);   // flat glow spread along the pad
    else glow(tend[0], tend[1], 130, 130, [255, 140, 60], 0.22 * flick);
    glow(FX.engines[0][0], FX.engines[0][1] + 14, 70, 70, [255, 200, 120], 0.45 * flick);
    glowB.flush();

    const ph = ground[1] - ey + 12, pw = (wide ? 150 : 120) * (0.94 + 0.08 * rnd());
    sheath.position.set(ex, ey - 4 + ph / 2, 0); sheath.scale.set(pw, ph, 1); sheath.material.opacity = 0.92 * flick;
    const ch = (ground[1] - ey) * 0.9, cw = wide ? 80 : 64;
    core.position.set(ex, ey - 4 + ch / 2, 0); core.scale.set(cw, ch, 1); core.material.opacity = 0.8 * flick;

    for (const p of flames) {
      const a = p.age / p.life;
      const T = p.glint ? 0.9 - a * 0.5 : p.hit ? Math.max(0, 0.6 - a * 0.75) : Math.max(0, 0.84 - a * 1.0);
      const c = HEAT[Math.min(HEAT.length - 1, Math.max(0, Math.round(T * (HEAT.length - 1))))];
      const s = p.s0 * (1 + a * (p.hit ? 3.4 : 1.6));
      const alpha = (p.glint ? 0.95 : 0.6) * smooth(0, 0.04, p.age) * (p.hit ? 1 - smooth(0.55, 1, a) : 1 - smooth(0.8, 1, a));
      (p.glint ? flameAddB : flameB).add(p.x, p.y, s * 2, s * 2, 0, c[0], c[1], c[2], alpha, ROUND);
    }
    // shock diamonds under every bell
    for (const e of FX.engines) {
      for (let d = 0; d < 3; d++) {
        const s = (4.6 - d * 1.1) * (0.9 + 0.2 * rnd());
        flameAddB.add(e[0], e[1] + 9 + d * 11, s * 2, s * 2.8, 0, 235 / 255, 245 / 255, 1, (0.85 - d * 0.22) * flick, ROUND);
      }
    }
    flameB.flush(); flameAddB.flush();
  }

  function buildOverlay(reach) {
    // cryogenic vapour first, so the exhaust smoke rolls over it: dense column, faint tendrils, fading pool
    for (const p of vapor) {
      const a = p.age / p.life, s = p.s0 * (1 + a * p.g);
      const alpha = p.kind === 0 ? 0.55 * smooth(0, 0.04, a) * (1 - smooth(0.8, 1, a))
        : p.kind === 1 ? 0.38 * smooth(0, 0.15, a) * (1 - smooth(0.4, 1, a))
        : 0.42 * (1 - smooth(0.2, 1, a));
      vaporB.add(p.x, p.y, s * 2, s * 2, p.rot, 0.93, 0.945, 0.975, alpha, p.v);
    }
    vaporB.flush();
    for (const p of puffs) {
      const cloud = smokeCloud(p,ground,reach);
      const a = p.age / p.life;
      const near = Math.max(0, 1 - Math.hypot(cloud.x - ground[0], (p.y - ground[1]) * 1.5) / (wide ? 260 : 170));
      const warmth = Math.min(1, near * p.warm * (1.1 - a)) * 0.85;
      const tone = TONES[Math.min(3, Math.floor(a * 3.4))];
      const s = p.s0 * (1 + a * p.g) * cloud.growth;
      // dense when young, thinning as it expands
      const alpha = (wide ? 0.62 : 0.5) * smooth(0, 0.06, a) * (1 - smooth(0.35, 1, a));
      smokeB.add(cloud.x, p.y, s * 2, s * 2, p.rot, lerp(tone[0], LIT[0], warmth), lerp(tone[1], LIT[1], warmth), lerp(tone[2], LIT[2], warmth), alpha, p.v);
    }
    smokeB.flush();
    const hx = wide ? 70 : 58, hy = (ground[1] - ey) * 0.62;
    hole.position.set(ex, (ey + ground[1]) / 2 + 10, 0); hole.scale.set(hx * 2, hy * 2, 1);

    for (const p of grit) {
      const a = p.age / p.life;
      if (p.kind === 1) {
        gritB.add(p.x, p.y, p.s * 2, p.s * 2, 0, INK[0], INK[1], INK[2], 0.5 * smooth(0, 0.05, a) * (1 - smooth(0.6, 1, a)), DOT);
      } else {
        const sp = Math.hypot(p.vx, p.vy), len = sp * 0.022 + p.s * 2;
        const alpha = 0.85 * smooth(0, 0.05, a) * (1 - smooth(p.kind === 2 ? 0.85 : 0.6, 1, a));
        gritB.add(p.x - p.vx * 0.011, p.y - p.vy * 0.011, len, Math.max(1.2, p.s * 1.6), Math.atan2(p.vy, p.vx), INK[0], INK[1], INK[2], alpha, STREAK);
      }
    }
    gritB.flush();
    for (const p of sparks) {
      const a = p.age / p.life, sp = Math.hypot(p.vx, p.vy);
      const c = a < 0.3 ? [1, 0.85, 0.54] : a < 0.65 ? [1, 0.64, 0.29] : [0.95, 0.38, 0.16];
      sparkB.add(p.x - p.vx * 0.008, p.y - p.vy * 0.008, Math.max(1.5, sp * 0.016), 1.4, Math.atan2(p.vy, p.vx), c[0], c[1], c[2], 1 - smooth(0.5, 1, a), STREAK);
    }
    sparkB.flush();
  }

  // ---------- sizing, camera and loop ----------
  const fit = (r, canvas) => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    const s = r.getSize(new THREE.Vector2());
    if (s.x !== w || s.y !== h) r.setSize(w, h, false);
    return true;
  };
  function render(t) {
    const vw = innerWidth, vh = innerHeight;
    const fr = fireCanvas.getBoundingClientRect();
    if (fr.bottom > -200 && fr.top < vh + 200 && fit(fireR, fireCanvas)) { buildFire(t); fireR.render(fireScene, fireCam); }
    if (fit(overR, overCanvas)) {
      // the overlay covers the viewport; map it onto viewBox units from where the figure is right now
      const r = figEl.getBoundingClientRect(), s = r.width / FIG_W;
      if (s > 0) {
        fadeOverlay(overCanvas, r);
        overCam.left = -r.left / s; overCam.right = (vw - r.left) / s; overCam.top = -r.top / s; overCam.bottom = (vh - r.top) / s;
        overCam.updateProjectionMatrix();
        buildOverlay(smokeReach(r,ground)); overR.render(overScene, overCam);
      }
    }
  }

  let frame = 0, last = 0, visible = true, dead = false;
  function tick(now) {
    frame = 0;
    if (dead) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    step(dt); render(now / 1000);
    if (visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  const run = () => { if (!frame && !dead && !still && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  for (let i = 0; i < 660; i++) step(1 / 30);   // warm up so the flakes and the vapour column already reach the pad
  render(0);

  // reduced motion: one still frame, kept in place while the page scrolls
  const redraw = () => { if (still) render(0); };
  addEventListener('scroll', redraw, { passive: true });
  addEventListener('resize', redraw);
  const io = window.IntersectionObserver ? new IntersectionObserver((list) => { visible = list[list.length - 1].isIntersecting; if (visible) run(); }) : null;
  if (io) io.observe(railEl || figEl);
  const onVis = () => { if (!document.hidden) run(); };
  document.addEventListener('visibilitychange', onVis);
  run();
  return function stop() {
    dead = true; if (frame) cancelAnimationFrame(frame);
    if (io) io.disconnect();
    removeEventListener('scroll', redraw); removeEventListener('resize', redraw);
    document.removeEventListener('visibilitychange', onVis);
    fireR.dispose(); overR.dispose();
  };
}

// Canvas 2D fallback: it draws on two canvases inside .fig that reach 360 units above FX.rect,
// so stretch the fire canvas and add the smoke canvas after the printed name; the full-viewport
// overlay stays for the vapour column, which runs the whole height of the first stage.
function startFallback() {
  const fig = document.querySelector('[data-fig]'), fire = document.querySelector('[data-fx="fire"]');
  if (!fig || !fire || !window.FIGURE) return;
  const rect = 'left: -55.745%; top: 73.778%; width: 212.766%; height: 27.273%';
  fire.setAttribute('style', rect);
  const smoke = document.createElement('canvas');
  smoke.className = 'fxc'; smoke.dataset.fx = 'smoke'; smoke.setAttribute('style', rect);
  fig.appendChild(smoke);
  const [, y, , height] = window.FIGURE.fx.rect;
  for (const canvas of [fire, smoke]) fadeFigureCanvas(canvas, y - 360, height + 360);
  const script = document.createElement('script');
  script.src = 'js/fx-2d.js?v=viewport-smoke';
  script.onload = () => { if (typeof window.startFx2d === 'function') window.startFx2d(window.FIGURE.fx, fadeOverlay, smokeReach, smokeCloud); };
  document.head.appendChild(script);
}

// only a failed download falls back; the three.js path keeps its own WebGL checks.
// Add ?fx=2d to the page URL to preview the fallback without blocking anything.
if (new URLSearchParams(location.search).get('fx') === '2d') startFallback();
else import(THREE_URL).then((mod) => { THREE = mod; if (window.FIGURE) startFx(window.FIGURE.fx); }, startFallback);
