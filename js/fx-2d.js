/* Canvas 2D fallback for the launch-pad effects, loaded by js/fx.js only when three.js cannot be
   fetched (e.g. jsDelivr is blocked). Flame, sparks and black grit use two canvases inside .fig;
   fx.js moves them 360 units up the figure before calling startFx2d (see HANDOFF.md).
   Cryogenic vapour and ground smoke share the full-viewport overlay canvas. */
function startFx2d(FX, fadeOverlay, smokeReach, smokeCloud) {
  const fire = document.querySelector('[data-fx="fire"]');
  const top = document.querySelector('[data-fx="smoke"]');
  if (!fire || !top || !fire.getContext) return function () {};
  // canvases extend EXT units above the generated rect so grit can come off the lower body (see fx.js fallback)
  const EXT = 360;
  const X0 = FX.rect[0], Y0 = FX.rect[1] - EXT, UW = FX.rect[2], UH = FX.rect[3] + EXT;
  const fc = fire.getContext('2d'), tc = top.getContext('2d');
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let k = 1, frame = 0, last = 0, visible = true, dead = false;
  const rnd = Math.random;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---- pre-rendered sprites ----
  const sprite = (rgb, mid, midA) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(mid, 'rgba(' + rgb + ',' + midA + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
  };
  const HEAT = [[150, 40, 12], [214, 70, 20], [245, 105, 30], [255, 145, 50], [255, 185, 80], [255, 215, 130], [255, 238, 190], [255, 250, 232]];
  const heat = HEAT.map((c) => sprite(c.join(','), 0.38, 0.55));
  // Smoke: irregular "cauliflower" puffs built from many sub-blobs, lit from above and shaded below.
  // TONES: 0 = flame-lit, 1..4 = fresh white steam -> older, greyer exhaust.
  const TONES = [[255, 176, 110], [250, 248, 245], [238, 235, 231], [222, 218, 213], [205, 200, 194]];
  const puffShape = () => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    for (let i = 0; i < 22; i++) {
      const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.7) * 34, r = 14 + rnd() * 22;
      const bx = 64 + Math.cos(a) * d, by = 66 + Math.sin(a) * d * 0.8;
      const g = x.createRadialGradient(bx, by, 0, bx, by, r);
      g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.55, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(bx - r, by - r, r * 2, r * 2);
    }
    return c;
  };
  const tinted = (shape, rgb, lit) => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.drawImage(shape, 0, 0);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgb(' + rgb + ')'; x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = 'source-atop';
    const g = x.createLinearGradient(0, 20, 0, 118);
    if (lit) { g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,120,40,.35)'); }
    else { g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(70,62,56,.32)'); }
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return c;
  };
  const SHAPES = Array.from({ length: 10 }, puffShape);
  const smoke = SHAPES.map((sh) => TONES.map((c, i) => tinted(sh, c.join(','), i === 0)));
  const diamond = sprite('235,245,255', 0.3, 0.7);
  // Desktop (three-column) layout: the plume hits the pad and billows out to both sides.
  const mq = window.matchMedia ? matchMedia('(min-width: 1181px)') : null;
  let wide = mq ? mq.matches : false;
  const jet = (() => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 128;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,246,214,.95)'); g.addColorStop(0.55, 'rgba(255,196,100,.65)'); g.addColorStop(1, 'rgba(255,120,50,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 128);
    x.globalCompositeOperation = 'destination-in';
    const m = x.createRadialGradient(16, 0, 0, 16, 0, 128); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
    x.setTransform(0.125, 0, 0, 1, 14, 0); x.fillStyle = m; x.fillRect(-128, 0, 256, 128);
    return c;
  })();
  // the visible exhaust column: hot white core, yellow / orange sheath, transparent edges
  const plume = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const x = c.getContext('2d');
    let g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(0.2, 'rgba(255,150,60,.55)'); g.addColorStop(0.38, 'rgba(255,214,130,.95)');
    g.addColorStop(0.5, 'rgba(255,252,236,1)'); g.addColorStop(0.62, 'rgba(255,214,130,.95)'); g.addColorStop(0.8, 'rgba(255,150,60,.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    x.globalCompositeOperation = 'destination-in';
    g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(0.8, '#000'); g.addColorStop(1, 'rgba(0,0,0,.35)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    return c;
  })();

  const ground = FX.ground, tdir = FX.trenchDir, tend = FX.trenchEnd;
  const flames = [], puffs = [], sparks = [], debris = [];
  const ex = FX.engines.reduce((a, e) => a + e[0], 0) / FX.engines.length;
  const ey = FX.engines.reduce((a, e) => a + e[1], 0) / FX.engines.length;
  // body half-width on screen: engine ring (r = 44) spans 223.5..333.1, body r = 68 -> ~84.7 units
  const BODY = 84.7;
  const ringTop = FX.ringTop;

  function emitFlame(e) {
    const j = (rnd() - 0.5) * FX.exitR * 1.3;
    const glint = rnd() < 0.22;
    flames.push({
      x: e[0] + j, y: e[1] + rnd() * 3, vx: j * 1.6 + (e[0] - ground[0]) * 0.9 + (rnd() - 0.5) * (glint ? 60 : 26),
      vy: (glint ? 470 : 360) + rnd() * 110, age: 0, life: (glint ? 0.35 : 0.5) + rnd() * 0.28,
      s0: glint ? 1.1 + rnd() * 0.8 : 5.2 + rnd() * 3.8, hit: false, glint
    });
  }
  function emitPuff(x, y, vx, vy, s, life, warm) {
    if (puffs.length > (wide ? 700 : 300)) return;
    puffs.push({ x, y, vx, vy, s0: s, age: 0, life, warm, v: (rnd() * SHAPES.length) | 0, g: 1.6 + rnd() * 2.2 });
  }
  // Cryogenic vapour venting on the side away from the tower, as in fx.js: a dense column clings to the body
  // from a vent just below the interstage and cascades down to the pad, widening as it falls; tendrils curl
  // off its outer edge and what reaches the pad spreads out. Cold vapour sinks.
  // kind 0 = column, 1 = tendril, 2 = pooling on the pad
  const vapor = [];
  const V_Y = ground[1] - 1790 * (ground[1] - 346.3) / 2794;   // vent height in viewBox y (nose tip 346.3, see fx.js)
  const V_EDGE = ex + BODY;
  const vSpread = (y) => 10 + Math.max(0, y - V_Y) * 0.1;
  function emitColumn() {
    if (vapor.length > 1300) return;
    const y = V_Y + (rnd() - 0.5) * 16;
    vapor.push({
      kind: 0, x: V_EDGE + rnd() * 10 - 4, y, vx: 30 + rnd() * 50, vy: 40 + rnd() * 50, off: rnd(),
      age: 0, life: 24 + rnd() * 4, s0: 20 + rnd() * 16, g: 1.6 + rnd() * 1.6, v: (rnd() * SHAPES.length) | 0
    });
  }
  function emitTendril() {
    if (vapor.length > 1300) return;
    const y = lerp(V_Y + 30, ground[1] - 60, Math.pow(rnd(), 0.8));
    vapor.push({
      kind: 1, x: V_EDGE + vSpread(y) * (0.6 + rnd() * 0.6), y, vx: 25 + rnd() * 60, vy: (rnd() - 0.6) * 30, curl: (rnd() - 0.5) * 1.6,
      age: 0, life: 4 + rnd() * 4, s0: 10 + rnd() * 10, g: 2 + rnd() * 1.5, v: (rnd() * SHAPES.length) | 0
    });
  }
  // black grit thrown off the pad (falls back down) and fine soot that drifts up with the smoke
  function emitDebris() {
    if (debris.length > 320) return;
    const side = rnd() < 0.5 ? -1 : 1;
    const vx = wide ? side * (80 + rnd() * 280) : (rnd() - 0.5) * 220 + tdir[0] * 90;
    debris.push({ x: ground[0] + (rnd() - 0.5) * 70, y: ground[1] - rnd() * 8, vx, vy: -(50 + rnd() * 230), age: 0, life: 0.8 + rnd() * 1.3, s: 0.6 + rnd() * 1.5, soot: false, floor: ground[1] + 30 });
  }
  function emitGrit(x, y, vx, vy, life, s, floor) {
    if (debris.length > 360) return;
    debris.push({ x, y, vx, vy, age: 0, life, s, soot: false, floor });
  }
  function emitSoot() {
    if (debris.length > 320) return;
    const side = rnd() < 0.5 ? -1 : 1;
    const x = wide ? ground[0] + side * (60 + rnd() * 220) : lerp(ground[0], tend[0], rnd()) + (rnd() - 0.5) * 120;
    debris.push({ x, y: ground[1] - rnd() * 60, vx: (wide ? side * 20 : tdir[0] * 10) + (rnd() - 0.5) * 24, vy: -10 - rnd() * 26, age: 0, life: 2.4 + rnd() * 2.4, s: 0.5 + rnd() * 1.1, soot: true });
  }
  function emitSpark(x, y) {
    const a = -Math.PI * (0.15 + rnd() * 0.7), v = 160 + rnd() * 260;
    sparks.push({ x, y, vx: Math.cos(a) * v * 0.6 + tdir[0] * 40 * rnd(), vy: Math.sin(a) * v, age: 0, life: 0.5 + rnd() * 0.7 });
  }

  function step(dt) {
    wide = mq ? mq.matches : false;
    // flames from every engine
    for (const e of FX.engines) { let n = 165 * dt; while (n > 0) { if (n >= 1 || rnd() < n) emitFlame(e); n -= 1; } }
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
    // smoke sources: wide = clouds rolling out to both sides of the pad; otherwise trench exit. Plus the base of the mount.
    const sx = lerp(ground[0], tend[0], 0.45), sy = lerp(ground[1], tend[1], 0.45);
    let n = (wide ? 70 : 38) * dt;
    while (n > 0) {
      if (wide) {
        if (n >= 1 || rnd() < n) {
          const side = rnd() < 0.5 ? -1 : 1, low = rnd() < 0.7;
          emitPuff(ground[0] + side * (50 + rnd() * 50), ground[1] + (rnd() - 0.4) * 30,
            side * (low ? 110 + rnd() * 170 : 30 + rnd() * 60), low ? -6 - rnd() * 16 : -30 - rnd() * 40,
            (low ? 14 : 24) + rnd() * 26, 3.5 + rnd() * 4.5, 1);
        }
        n -= 1; continue;
      }
      if (n >= 1 || rnd() < n) emitPuff(sx + (rnd() - 0.5) * 40, sy + (rnd() - 0.5) * 16, tdir[0] * (12 + rnd() * 18), tdir[1] * 12 - 18 - rnd() * 22, 26 + rnd() * 20, 3.5 + rnd() * 2.5, 1);
      n -= 1;
    }
    n = 42 * dt;
    while (n > 0) { if (n >= 1 || rnd() < n) emitColumn(); n -= 1; }
    n = 20 * dt;
    while (n > 0) { if (n >= 1 || rnd() < n) emitTendril(); n -= 1; }
    for (let i = vapor.length - 1; i >= 0; i--) {
      const p = vapor[i];
      p.age += dt;
      if (p.kind === 0) {
        // steer toward a line just outside the body edge that widens as the column falls
        const target = V_EDGE + vSpread(p.y) * (0.3 + p.off * 1.1);
        p.vx += ((target - p.x) * 1.0 - p.vx) * 1.1 * dt + (rnd() - 0.5) * 30 * dt;
        p.vy = p.vy * (1 - 0.25 * dt) + 30 * dt + (rnd() - 0.5) * 20 * dt;
        if (p.y > ground[1] - 60) {   // reached the pad: spread out along it
          p.kind = 2; p.age = 0; p.life = 3 + rnd() * 3; p.s0 *= 1 + p.g; p.g = 1 + rnd();
          p.vx = (rnd() < 0.75 ? 1 : -1) * (30 + rnd() * 70); p.vy *= 0.15;
        }
      } else if (p.kind === 1) {
        // tendrils drift outward, slow down and curl
        const w = p.curl * dt, c = Math.cos(w), sn = Math.sin(w), vx = p.vx;
        p.vx = vx * c - p.vy * sn; p.vy = vx * sn + p.vy * c;
        p.vx *= 1 - 0.5 * dt; p.vy = p.vy * (1 - 0.5 * dt) + 6 * dt;
      } else {
        p.vx *= 1 - 0.7 * dt; p.vy = p.vy * (1 - 0.8 * dt) + 2 * dt;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age >= p.life || p.y > ground[1] + 20) vapor.splice(i, 1);
    }
    n = 11 * dt;
    while (n > 0) {
      if (n >= 1 || rnd() < n) {
        const b = FX.base[(rnd() * FX.base.length) | 0];
        const dx = b[0] - ground[0], dy = b[1] - ground[1], l = Math.hypot(dx, dy) || 1;
        emitPuff(b[0], b[1] - 4, (dx / l) * (24 + rnd() * 26), (dy / l) * 10 - 8 - rnd() * 12, 20 + rnd() * 18, 3.6 + rnd() * 2.6, 0.7);
      }
      n -= 1;
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.age += dt; p.vx = p.vx * (1 - 0.7 * dt) + (rnd() - 0.5) * 30 * dt; p.vy = p.vy * (1 - 0.45 * dt) - 7 * dt + (rnd() - 0.5) * 20 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age >= p.life) puffs.splice(i, 1);
    }
    n = 9 * dt;
    while (n > 0) { if (n >= 1 || rnd() < n) emitSpark(wide ? ground[0] + (rnd() - 0.5) * 140 : ground[0] + tdir[0] * rnd() * 60, wide ? ground[1] - rnd() * 10 : ground[1] + tdir[1] * rnd() * 60); n -= 1; }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.age += dt; p.vy += 520 * dt; p.vx *= 1 - 0.4 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age >= p.life) sparks.splice(i, 1);
    }
    n = 30 * dt;
    while (n > 0) { if (n >= 1 || rnd() < n) emitDebris(); n -= 1; }
    n = (wide ? 18 : 10) * dt;
    while (n > 0) { if (n >= 1 || rnd() < n) emitSoot(); n -= 1; }
    // a few flakes shaken off the sides of the body
    n = 13 * dt;
    while (n > 0) {
      if (n >= 1 || rnd() < n) {
        const side = rnd() < 0.5 ? -1 : 1;
        emitGrit(ex + side * BODY * (0.88 + rnd() * 0.12), lerp(Y0 + 180, 3070, rnd()), side * (25 + rnd() * 70), -10 + rnd() * 40, 1 + rnd() * 1.2, 0.7 + rnd() * 1, ground[1] + 30);
      }
      n -= 1;
    }
    // grit kicked off the pad's outer edge and the mount ring
    n = 9 * dt;
    while (n > 0) {
      if (n >= 1 || rnd() < n) {
        const b = FX.base[(rnd() * FX.base.length) | 0];
        const dx = b[0] - ground[0], dy = b[1] - ground[1], l = Math.hypot(dx, dy) || 1;
        emitGrit(b[0], b[1] - 3, (dx / l) * (40 + rnd() * 90), -(60 + rnd() * 140), 0.7 + rnd() * 0.8, 0.5 + rnd() * 1.1, b[1] + 30);
      }
      n -= 1;
    }
    n = 5 * dt;
    while (n > 0) {
      if (n >= 1 || rnd() < n) {
        const q = ringTop[(rnd() * ringTop.length) | 0], dx = q[0] - ex, l = Math.abs(dx) || 1;
        emitGrit(q[0], q[1], (dx / l) * (30 + rnd() * 80), -(40 + rnd() * 110), 0.8 + rnd() * 0.8, 0.5 + rnd() * 0.9, ground[1] + 30);
      }
      n -= 1;
    }
    for (let i = debris.length - 1; i >= 0; i--) {
      const p = debris[i];
      p.age += dt;
      if (p.soot) { p.vx = p.vx * (1 - 0.3 * dt) + (rnd() - 0.5) * 40 * dt; p.vy = p.vy * (1 - 0.2 * dt) - 4 * dt; }
      else { p.vx *= 1 - 0.8 * dt; p.vy = p.vy * (1 - 0.5 * dt) + 380 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.soot && p.y > p.floor) p.age = p.life;
      if (p.age >= p.life) debris.splice(i, 1);
    }
  }

  const X = (x) => (x - X0) * k, Y = (y) => (y - Y0) * k;
  function glow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r * k);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(0.45, 'rgba(' + rgb + ',' + a * 0.35 + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(x), Y(y), r * k, 0, Math.PI * 2); ctx.fill();
  }

  function draw(t) {
    const W = fire.width, H = fire.height;
    const flick = 0.85 + 0.15 * Math.sin(t * 31) * Math.sin(t * 17.3);
    // ---- fire layer (between back and front art) ----
    fc.globalCompositeOperation = 'source-over'; fc.clearRect(0, 0, W, H);
    fc.globalCompositeOperation = 'lighter';
    glow(fc, ground[0], ground[1] - 30, 190, '255,130,50', 0.26 * flick);
    if (wide) {
      // flat glow spread along the pad
      fc.save(); fc.translate(X(ground[0]), Y(ground[1] - 20)); fc.scale(2.6, 0.6);
      const g = fc.createRadialGradient(0, 0, 0, 0, 0, 200 * k);
      g.addColorStop(0, 'rgba(255,150,60,' + 0.34 * flick + ')'); g.addColorStop(0.5, 'rgba(255,150,60,' + 0.1 * flick + ')'); g.addColorStop(1, 'rgba(255,150,60,0)');
      fc.fillStyle = g; fc.beginPath(); fc.arc(0, 0, 200 * k, 0, Math.PI * 2); fc.fill(); fc.restore();
    } else glow(fc, tend[0], tend[1], 130, '255,140,60', 0.22 * flick);
    glow(fc, FX.engines[0][0], FX.engines[0][1] + 14, 70, '255,200,120', 0.45 * flick);
    fc.globalCompositeOperation = 'source-over';
    {
      const pw = (wide ? 150 : 120) * (0.94 + 0.08 * rnd()) * k, ph = (ground[1] - ey + 12) * k;
      fc.globalAlpha = 0.92 * flick;
      fc.drawImage(plume, X(ex) - pw / 2, Y(ey) - 4 * k, pw, ph);
      fc.globalAlpha = 1;
    }
    for (const p of flames) {
      const a = p.age / p.life;
      const T = p.glint ? 0.9 - a * 0.5 : p.hit ? Math.max(0, 0.6 - a * 0.75) : Math.max(0, 0.84 - a * 1.0);
      const idx = Math.min(HEAT.length - 1, Math.max(0, Math.round(T * (HEAT.length - 1))));
      const s = (p.s0 * (1 + a * (p.hit ? 3.4 : 1.6))) * k;
      fc.globalCompositeOperation = p.glint ? 'lighter' : 'source-over';
      fc.globalAlpha = (p.glint ? 0.95 : 0.6) * smooth(0, 0.04, p.age) * (p.hit ? 1 - smooth(0.55, 1, a) : 1 - smooth(0.8, 1, a));
      fc.drawImage(heat[idx], X(p.x) - s, Y(p.y) - s, s * 2, s * 2);
    }
    // white-hot core of the column over the orange particles
    fc.globalCompositeOperation = 'source-over';
    fc.globalAlpha = 0.8 * flick;
    fc.drawImage(plume, X(ex) - (wide ? 40 : 32) * k, Y(ey) - 4 * k, (wide ? 80 : 64) * k, (ground[1] - ey) * 0.9 * k);
    fc.globalCompositeOperation = 'lighter';
    // a bright core jet out of every bell, then its shock diamonds
    for (const e of FX.engines) {
      const len = (wide ? 120 + 24 * rnd() : 46 + 10 * rnd()) * k, w = FX.exitR * (wide ? 1.5 : 1.25) * k;
      fc.globalAlpha = 0.9 * flick;
      fc.drawImage(jet, X(e[0]) - w / 2, Y(e[1]) - 1, w, len);
    }
    for (const e of FX.engines) {
      for (let d = 0; d < 3; d++) {
        const s = (4.6 - d * 1.1) * k * (0.9 + 0.2 * rnd());
        fc.globalAlpha = (0.85 - d * 0.22) * flick;
        fc.drawImage(diamond, X(e[0]) - s, Y(e[1] + 9 + d * 11) - s * 1.4, s * 2, s * 2.8);
      }
    }
    fc.globalAlpha = 1;
    fc.globalCompositeOperation = 'source-over';

    // ---- grit and sparks above the figure ----
    tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H);
    tc.globalAlpha = 1;
    // keep the exhaust column clear: smoke never sits on top of the flame
    tc.globalCompositeOperation = 'destination-out';
    {
      const hx = (wide ? 70 : 58) * k, hy = (ground[1] - ey) * 0.62 * k, cy = Y((ey + ground[1]) / 2 + 10);
      tc.save(); tc.translate(X(ex), cy); tc.scale(1, hy / hx);
      const g = tc.createRadialGradient(0, 0, 0, 0, 0, hx);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.65, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      tc.fillStyle = g; tc.beginPath(); tc.arc(0, 0, hx, 0, Math.PI * 2); tc.fill(); tc.restore();
    }
    tc.globalCompositeOperation = 'source-over';
    tc.lineCap = 'round';
    tc.strokeStyle = tc.fillStyle = '#1E1F22';
    for (const p of debris) {
      const a = p.age / p.life;
      tc.globalAlpha = (p.soot ? 0.5 : 0.85) * smooth(0, 0.05, a) * (1 - smooth(0.6, 1, a));
      if (p.soot) { tc.beginPath(); tc.arc(X(p.x), Y(p.y), p.s * k, 0, Math.PI * 2); tc.fill(); }
      else {
        tc.lineWidth = Math.max(0.8, p.s * k);
        tc.beginPath(); tc.moveTo(X(p.x), Y(p.y)); tc.lineTo(X(p.x - p.vx * 0.022), Y(p.y - p.vy * 0.022)); tc.stroke();
      }
    }
    tc.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      const a = p.age / p.life;
      tc.globalAlpha = 1 - smooth(0.5, 1, a);
      tc.strokeStyle = a < 0.3 ? '#FFD98A' : a < 0.65 ? '#FFA24A' : '#F2622A';
      tc.lineWidth = Math.max(0.7, 1 * k);
      tc.beginPath(); tc.moveTo(X(p.x), Y(p.y)); tc.lineTo(X(p.x - p.vx * 0.016), Y(p.y - p.vy * 0.016)); tc.stroke();
    }
    tc.globalAlpha = 1;
    // soften the canvas edges so clouds never end in a hard line
    tc.globalCompositeOperation = 'destination-in';
    let g = tc.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.14, '#000'); g.addColorStop(0.86, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    tc.fillStyle = g; tc.fillRect(0, 0, W, H);
    g = tc.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.18, '#000'); g.addColorStop(0.88, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    tc.fillStyle = g; tc.fillRect(0, 0, W, H);
    tc.globalCompositeOperation = 'source-over';
  }

  // ---- cryogenic vapour on the full-viewport overlay, mapped from where the figure is right now ----
  const over = document.querySelector('[data-fx="overlay"]');
  const oc = over && over.getContext ? over.getContext('2d') : null;
  const figEl = document.querySelector('[data-fig]');
  function drawOver() {
    if (!oc || !figEl) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.round(over.clientWidth * dpr), h = Math.round(over.clientHeight * dpr);
    if (!w || !h) return;
    if (over.width !== w || over.height !== h) { over.width = w; over.height = h; } else oc.clearRect(0, 0, w, h);
    const r = figEl.getBoundingClientRect(), sc = (r.width / 470) * dpr, ox = r.left * dpr, oy = r.top * dpr;
    fadeOverlay(over, r);
    // dense column, faint tendrils, fading pool
    for (const p of vapor) {
      const a = p.age / p.life, s = p.s0 * (1 + a * p.g) * sc, px = ox + p.x * sc, py = oy + p.y * sc;
      if (py + s < 0 || py - s > h) continue;
      oc.globalAlpha = p.kind === 0 ? 0.55 * smooth(0, 0.04, a) * (1 - smooth(0.8, 1, a))
        : p.kind === 1 ? 0.38 * smooth(0, 0.15, a) * (1 - smooth(0.4, 1, a))
        : 0.32 * (1 - smooth(0.2, 1, a));
      oc.drawImage(smoke[p.v][1], px - s, py - s, s * 2, s * 2);
    }
    // Ground clouds use the full viewport as they spread beyond the launch pad.
    const reach = smokeReach(r,ground);
    for (const p of puffs) {
      const cloud = smokeCloud(p,ground,reach);
      const a = p.age / p.life, s = p.s0 * (1 + a * p.g) * cloud.growth * sc;
      const px = ox + cloud.x * sc, py = oy + p.y * sc;
      const near = Math.max(0,1-Math.hypot(cloud.x-ground[0],(p.y-ground[1])*1.5)/(wide ? 260 : 170));
      const warmth = Math.min(1,near*p.warm*(1.1-a));
      const alpha = (wide ? .62 : .5)*smooth(0,.06,a)*(1-smooth(.35,1,a));
      const tone = 1 + Math.min(3,Math.floor(a*3.4)), set = smoke[p.v];
      oc.globalAlpha = alpha;
      oc.drawImage(set[tone],px-s,py-s,s*2,s*2);
      if (warmth > .05) {
        oc.globalAlpha = alpha*warmth;
        oc.drawImage(set[0],px-s,py-s,s*2,s*2);
      }
    }
    oc.globalAlpha = 1;
    // keep the exhaust column clear, as on the smoke canvas
    const hx = (wide ? 70 : 58) * sc, hy = (ground[1] - ey) * 0.62 * sc;
    oc.globalCompositeOperation = 'destination-out';
    oc.save(); oc.translate(ox + ex * sc, oy + ((ey + ground[1]) / 2 + 10) * sc); oc.scale(1, hy / hx);
    const g = oc.createRadialGradient(0, 0, 0, 0, 0, hx);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.65, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    oc.fillStyle = g; oc.beginPath(); oc.arc(0, 0, hx, 0, Math.PI * 2); oc.fill(); oc.restore();
    oc.globalCompositeOperation = 'source-over';
  }

  function size() {
    const w = fire.clientWidth; if (!w) return false;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    k = (w / UW) * dpr;
    for (const c of [fire, top]) { c.width = Math.max(1, Math.round(UW * k)); c.height = Math.max(1, Math.round(UH * k)); }
    return true;
  }
  function tick(now) {
    frame = 0;
    if (dead) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    step(dt);
    const fr = fire.getBoundingClientRect();
    if (fr.bottom > -200 && fr.top < innerHeight + 200) draw(now / 1000);
    drawOver();
    if (visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  const run = () => { if (!frame && !dead && !still && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  function warm() { for (let i = 0; i < 660; i++) step(1 / 30); }   // long enough for the vapour column to reach the pad

  size(); warm(); draw(0); drawOver();
  // reduced motion: one still frame, with the overlay kept in place while the page scrolls
  const redraw = () => { if (still) drawOver(); };
  addEventListener('scroll', redraw, { passive: true });
  addEventListener('resize', redraw);
  const ro = window.ResizeObserver ? new ResizeObserver(() => { if (size()) draw(last / 1000); }) : null;
  if (ro) ro.observe(fire);
  const io = window.IntersectionObserver ? new IntersectionObserver((list) => { visible = list[list.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: '200px 0px' }) : null;
  if (io) io.observe(document.querySelector('[data-rail]') || fire);
  const onVis = () => { if (!document.hidden) run(); };
  document.addEventListener('visibilitychange', onVis);
  run();
  return function stop() {
    dead = true; if (frame) cancelAnimationFrame(frame);
    if (ro) ro.disconnect(); if (io) io.disconnect();
    removeEventListener('scroll', redraw); removeEventListener('resize', redraw);
    document.removeEventListener('visibilitychange', onVis);
  };
}
