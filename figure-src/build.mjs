// Launch-tower figure for the personal site, built with the anatomy kit.
// Writes fig-back.svg (pad, tower, rear piers), fig-mount.svg (deck and near piers), fig-front.svg (engines,
// rocket, front clamps, near catch arm), fig-beacon-light.svg and fig.json (viewBox + overlay anchors).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const AZ = 35, EL = 30;
const RAD = Math.PI / 180;
const VIEW = [Math.cos(AZ * RAD), Math.sin(AZ * RAD)];

// ---------- world plan (z up, 1 unit ≈ 1 px) ----------
const PAD = { cx: -60, cy: 0, r: 172, z0: -16 };
const TW = { cx: -160, cy: 0, half: 32, col: 7 };          // lattice tower
const TW_X0 = TW.cx - TW.half, TW_X1 = TW.cx + TW.half;
const TW_Y0 = TW.cy - TW.half, TW_Y1 = TW.cy + TW.half;
const PLINTH_TOP = 10;
const DECKS = [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700];
const TOP_DECK = 2900, ROD_TIP = 3010;
const BAY = 75;

const MOUNT = { legR: 101, legTop: 200, ringTop: 230, rIn: 72, rOut: 122 };
const SKIRT_BOT = 280, BELL_LEN = 44;
const R = 68, RF = 75;                                      // body and fairing radius
const Z = { skirt: 320, finTop: 1838, inter: 1848, upper: 1990, boat: 2379, fair: 2425, ogive: 2587, tip: 2794 };

const ARM = { qd: 400, chop: 1700, crew: 2290 };

// ---------- camera ----------
const extremes = [];
for (let a = 0; a < 360; a += 10) {
  extremes.push([PAD.cx + PAD.r * Math.cos(a * RAD), PAD.cy + PAD.r * Math.sin(a * RAD), PAD.z0]);
  extremes.push([RF * Math.cos(a * RAD), RF * Math.sin(a * RAD), Z.ogive]);
}
extremes.push([TW.cx, TW.cy, ROD_TIP + 8], [TW_X0 - 10, TW_Y1 + 10, TOP_DECK], [40, 72, ARM.chop]);
const unit = { origin: [0, 0], scale: 1, azimuth: AZ, elevation: EL };
const flat = extremes.map((p) => k.iso(p, unit));
const M = 18;
const minX = Math.min(...flat.map((p) => p[0])) - M, maxX = Math.max(...flat.map((p) => p[0])) + M;
const minY = Math.min(...flat.map((p) => p[1])) - M, maxY = Math.max(...flat.map((p) => p[1])) + M;
const W = Math.ceil(maxX - minX), H = Math.ceil(maxY - minY);
const P = { origin: [-minX, -minY], scale: 1, azimuth: AZ, elevation: EL };

const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const seg = (a, b) => k.segment(a, b, P);
const depth = (p) => k.depthOf(p, P);
const facing = (deg) => Math.cos(deg * RAD) * VIEW[0] + Math.sin(deg * RAD) * VIEW[1];
const grp = (cls, body) => `<g class="${cls}">${Array.isArray(body) ? body.join("") : body}</g>`;
const UP = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
// Optional development check for the modelled hardware; the distributable build uses only the local kit.
const audit = process.argv.includes("--audit") ? await import("../../../.agents/skills/anatomy/kit/audit.mjs") : null;
const hardware = audit?.recorder(P);
function part(svg, shape) {
  if (shape) {
    shape.name = hardware.nameFor(shape.name);
    hardware.put({name:shape.name, shapes:[hardware.solid(shape)], svg});
  }
  return svg;
}

// radial frame at angle (deg) around the rocket axis, origin on the axis at height z
const radial = (deg, z) => {
  const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD);
  return G.frameOf([0, 0, z], [c, s, 0], [-s, c, 0], [0, 0, 1]);
};
const onBody = (deg, r, u, z) => {
  const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD);
  return [c * r - s * u, s * r + c * u, z];
};

// ---------- launch pad (ground) ----------
function pad() {
  const out = [];
  const plan = { x: PAD.cx - PAD.r, y: PAD.cy - PAD.r, w: PAD.r * 2, d: PAD.r * 2, r: PAD.r };
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, PAD.z0, 2, P)}"/>`);
  out.push(S(k.cylinder(PAD.cx, PAD.cy, PAD.r, PAD.z0, -PAD.z0, P, 120, 1.2), { tone: "mid" }));
  // painted rings and a ruler of ticks round the rim
  out.push(L(k.ring(PAD.cx, PAD.cy, PAD.r - 6, 0, P, 120), { tone: "lo" }));
  const ticks = k.radialTicks(PAD.cx, PAD.cy, PAD.r - 6, 120, 5, 0, [3, 8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // expansion joints: a grid clipped to the disc
  const r2 = PAD.r - 14;
  for (let x = PAD.cx - r2 + 24; x < PAD.cx + r2; x += 32) {
    const h = Math.sqrt(Math.max(0, r2 * r2 - (x - PAD.cx) ** 2));
    out.push(L(k.lineOnTop([x, PAD.cy - h], [x, PAD.cy + h], 0, P), { tone: "faint" }));
  }
  for (let y = PAD.cy - r2 + 24; y < PAD.cy + r2; y += 32) {
    const h = Math.sqrt(Math.max(0, r2 * r2 - (y - PAD.cy) ** 2));
    out.push(L(k.lineOnTop([PAD.cx - h, y], [PAD.cx + h, y], 0, P), { tone: "faint" }));
  }
  out.push(L(k.ring(PAD.cx, PAD.cy, r2, 0, P, 120), { tone: "faint" }));
  // soft cast shadows, light from the upper left
  out.push(`<defs><filter id="fPadSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs><g filter="url(#fPadSoft)" fill="rgba(46,42,38,0.2)"><path d="${k.slabOf({ x: -10, y: -64, w: 150, d: 128, r: 60 }, 0, 0.01, P).fill}"/><path d="${k.slabOf({ x: TW_X0, y: TW_Y0 - 8, w: 150, d: 80, r: 30 }, 0, 0.01, P).fill}"/></g>`);
  // flame trench: a dark recess running away from the tower
  const trench = { x: -36, y: -28, w: 132, d: 56, r: 4 };
  out.push(grp("fig-pit", [S(k.slabOf(trench, -0.6, 0.6, P, 3), { tone: "lo", flat: true }), L(k.planOutline(trench, 0, P, 3), { tone: "mid" })]));
  // Refractory lining slopes down from the coping; clip the channel floor to the opening.
  out.push(`<defs><clipPath id="trench-mouth"><path d="${k.planOutline(trench, 0, P, 5)}"/></clipPath></defs>`);
  const lining = [];
  for (const side of [-1, 1]) {
    for (let x = trench.x; x < trench.x + trench.w; x += 12) {
      const end = Math.min(x + 12, trench.x + trench.w);
      const tile = [[x, side * 28, 0], [end - .45, side * 28, 0], [end - .45, side * 16, -8], [x, side * 16, -8]];
      lining.push(`<path d="${k.pathOf(tile.map(at), true)}" fill="${side < 0 ? "#646264" : "#47474a"}"/>`);
    }
    const curb = { x: trench.x, y: side < 0 ? -31 : 28, w: trench.w, d: 3, r: .5 };
    out.push(S(k.slabOf(curb, 0, 1.4, P, 3, .35), { tone: "lo" }));
  }
  out.push(`<g clip-path="url(#trench-mouth)">${lining.join("")}</g>`);
  // Engraved plate beside the access ladder.
  const label = { x: -20, y: 119, w: 44, d: 22, r: 2 };
  out.push(S(k.slabOf(label, 0, 1.2, P, 3, 0.4), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x+22,label.y+13],1.2,P),"PAD 01",{size:5.2,anchor:"middle",tone:"mid"}));
  out.push(D([at([label.x + 2.5, label.y + 2.5, 1.2]), at([label.x + label.w - 2.5, label.y + 2.5, 1.2]), at([label.x + 2.5, label.y + label.d - 2.5, 1.2]), at([label.x + label.w - 2.5, label.y + label.d - 2.5, 1.2])], { size: 0.5 }));
  return grp("fig-concrete", out);
}

// ---------- lattice tower ----------
const CORNERS = [[TW_X0, TW_Y0], [TW_X0, TW_Y1], [TW_X1, TW_Y0], [TW_X1, TW_Y1]]
  .map(([x, y]) => [x, y]).sort((a, b) => depth([...a, 0]) - depth([...b, 0]));
const inset = 3.6;

function column([x, y], z0, z1) {
  const c = TW.col;
  return S(k.slabOf({ x: x - c / 2, y: y - c / 2, w: c, d: c, r: 0.6 }, z0, z1 - z0, P, 2, 0.3), { tone: "mid", crease: "lo" });
}

// one face between two corners: girders at each bay top and X-bracing
function faceBraces(a, b, z0, z1, tone) {
  const out = [];
  const dir = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(...dir);
  const u = [dir[0] / len, dir[1] / len];
  const A0 = [a[0] + u[0] * inset, a[1] + u[1] * inset], B0 = [b[0] - u[0] * inset, b[1] - u[1] * inset];
  for (let z = z0; z < z1 - 1; z += BAY) {
    const top = Math.min(z + BAY, z1);
    out.push(seg([...A0, z + 2], [...B0, top - 2]), seg([...B0, z + 2], [...A0, top - 2]));
    if (top < z1) out.push(seg([...A0, top], [...B0, top]));
  }
  return L(out.join(""), { tone });
}

function platform(z, big = false) {
  const g = big ? 14 : 8;
  const plan = { x: TW_X0 - g, y: TW_Y0 - g, w: TW.half * 2 + g * 2, d: TW.half * 2 + g * 2, r: 1.2 };
  const out = [S(k.slabOf(plan, z, 5, P, 3, 0.6), { tone: "mid", crease: "lo" })];
  out.push(L(k.sideSeam(plan, z + 2.5, P, 3), { tone: "faint" }));
  // grating on the visible top
  for (let x = plan.x + 6; x < plan.x + plan.w - 2; x += 6) out.push(L(k.lineOnTop([x, plan.y + 1], [x, TW_Y0 - 0.5], z + 5, P), { tone: "faint" }));
  // handrail: posts on the near edges joined by two rails
  const zt = z + 5;
  const nearX = plan.x + plan.w - 1.5, nearY = plan.y + plan.d - 1.5, farX = plan.x + 1.5, farY = plan.y + 1.5;
  const posts = [];
  for (let y = farY; y <= nearY + 0.1; y += (nearY - farY) / 4) posts.push([nearX, y]);
  for (let x = farX; x < nearX - 0.1; x += (nearX - farX) / 4) posts.push([x, nearY]);
  const rails = [
    seg([nearX, farY, zt + 9], [nearX, nearY, zt + 9]), seg([farX, nearY, zt + 9], [nearX, nearY, zt + 9]),
    seg([nearX, farY, zt + 5], [nearX, nearY, zt + 5]), seg([farX, nearY, zt + 5], [nearX, nearY, zt + 5]),
  ];
  out.push(L(posts.map(([x, y]) => k.rise([x, y], zt, zt + 9, P)).join(""), { tone: "hi" }));
  out.push(L(rails.join(""), { tone: "hi" }));
  return out.join("");
}

const beaconLens = "M-5.6 -2.5V-9.8C-5.6 -12.4 -3.4 -14 0 -14S5.6 -12.4 5.6 -9.8V-2.5C5.6 .9 -5.6 .9 -5.6 -2.5Z";
const beaconBand = "M-5.5 -8.3C-3.5 -5.8 3.5 -5.8 5.5 -8.3V-6.2C3.4 -3.2 -3.4 -3.2 -5.5 -6.2Z";
const beaconSeat = [TW.cx - 3, TW.cy - 3, ROD_TIP];

function mastBeacon() {
  const [x, y] = beaconSeat;
  const [cx, cy] = at(beaconSeat).map(r1);
  const mount = [
    S(k.cylinder(x, y, 3.6, ROD_TIP - 4, 3, P, 24), { tone: "mid", crease: "none" }),
    S(k.cylinder(x, y, 6.2, ROD_TIP - 1, 3, P, 32, 0.6), { tone: "mid", crease: "none" }),
  ].join("");
  // The lens is seated on the flange. Its curved bands follow the camera's 30° elevation.
  return `<g id="mast-beacon">
    <defs>
      <linearGradient id="beacon-glass">
        <stop stop-color="#77212A"/><stop offset=".17" stop-color="#BF3B40"/>
        <stop offset=".33" stop-color="#F16A60"/><stop offset=".55" stop-color="#D63739"/>
        <stop offset=".86" stop-color="#9C202B"/><stop offset="1" stop-color="#641C27"/>
      </linearGradient>
      <linearGradient id="beacon-emitter">
        <stop stop-color="#AC2331"/><stop offset=".2" stop-color="#FF6459"/>
        <stop offset=".43" stop-color="#FFDDC0"/><stop offset=".59" stop-color="#FFA082"/>
        <stop offset=".83" stop-color="#F44845"/><stop offset="1" stop-color="#9E2330"/>
      </linearGradient>
      <radialGradient id="beacon-bloom">
        <stop stop-color="#F64B40" stop-opacity=".32"/><stop offset=".55" stop-color="#F64B40" stop-opacity=".1"/>
        <stop offset="1" stop-color="#F64B40" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="${cx}" cy="${cy - 7}" rx="13" ry="10" fill="url(#beacon-bloom)"/>
    ${mount}
    <g transform="translate(${cx} ${cy})">
      <path d="${beaconLens}" fill="url(#beacon-glass)"/>
      <path d="M-5.3 -11C-3.7 -8.2 3 -8 5.2 -10.9C4 -7.1 -3.8 -6.9 -5.3 -11Z" fill="#FFAA93" opacity=".65"/>
      <path d="M-5.5 -9.5C-3.6 -6.7 3.6 -6.7 5.5 -9.5C3.5 -5.5 -3.7 -5.5 -5.5 -9.5Z" fill="#82232B"/>
      <path d="${beaconBand}" fill="url(#beacon-emitter)" opacity=".58"/>
      <path d="M-5.5 -4.9C-3.5 -2.2 3.5 -2.2 5.5 -4.9C3.5 -1 -3.5 -1 -5.5 -4.9Z" fill="#FF8B77" opacity=".7"/>
      <path d="M-4.5 -10.2Q-4.2 -13 -1.1 -13.2Q-3.2 -12.3 -3.4 -10Z" fill="#FFD2B8" opacity=".78"/>
    </g>
  </g>`;
}

// Only this shallow strip changes opacity. The tower and the lens stay on the static back layer.
function mastBeaconLight() {
  const [cx, cy] = at(beaconSeat).map(r1);
  const height = Math.ceil(cy + 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
    <defs>
      <radialGradient id="spill">
        <stop stop-color="#FF7457" stop-opacity=".78"/><stop offset=".32" stop-color="#FF5542" stop-opacity=".5"/>
        <stop offset=".67" stop-color="#FF5143" stop-opacity=".13"/><stop offset="1" stop-color="#FF5143" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="filament" cx=".43" cy=".63" r=".67">
        <stop stop-color="#FFF2C8"/><stop offset=".38" stop-color="#FFBB83"/>
        <stop offset=".78" stop-color="#FF694F" stop-opacity=".72"/><stop offset="1" stop-color="#FF5847" stop-opacity=".12"/>
      </radialGradient>
      <linearGradient id="reflected" x2="0" y2="1">
        <stop stop-color="#FF9879" stop-opacity=".8"/><stop offset="1" stop-color="#F25A46" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <g transform="translate(${cx} ${cy})">
      <ellipse cy="-7" rx="21" ry="16" fill="url(#spill)"/>
      <path d="${beaconLens}" fill="url(#filament)"/>
      <path d="${beaconBand}" fill="#FFF0C9" opacity=".87"/>
      <path d="M-6.8 -2.7C-6.2 1.4 4.9 2.8 6.8 -2C5.9 3.3 -6.6 3.4 -6.8 -2.7Z
               M-2.4 5L-.5 5.7L-1.6 15Z" fill="url(#reflected)"/>
    </g>
  </svg>`;
}

function towerCrown() {
  const floor = 5;
  const world = ([x,y,z]) => [TW.cx+x,TW.cy+y,TOP_DECK+z];
  const face = (points, fill) => `<path d="${k.pathOf(points.map(p => at(world(p))),true)}" fill="${fill}"/>`;
  const slab = (name,x,y,w,d,z,h,material,bevel=.3) => {
    const plan = {x:TW.cx+x,y:TW.cy+y,w,d,r:bevel};
    return part(grp(material,S(k.slabOf(plan,TOP_DECK+z,h,P,3,bevel),{tone:"mid",crease:"lo"})),
      audit?.slab(plan,TOP_DECK+z,h,{name:"crown."+name,ground:name==="deck"},3));
  };
  const topRect = (x,y,w,d,z,color) => face([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],color);
  const out = [slab("deck",-46,-46,92,92,0,floor,"fig-tower",.75)];

  // Removable grating panels and a flush ladder hatch, all on the deck plane.
  for (const [x,y,w,d] of [[-39,20,34,17],[-3,20,35,17],[20,-36,17,25],[20,-9,17,26]]) {
    out.push(topRect(x,y,w,d,floor,"#74777a"),topRect(x+1,y+1,w-2,d-2,floor,"#585d62"));
    for (let slot=x+2; slot<x+w-2; slot+=3.2) out.push(topRect(slot,y+2,1.6,d-4,floor,"#30343a"));
  }
  out.push(topRect(-40,-15,17,25,floor,"#25292d"),topRect(-39,-14,15,23,floor,"#696d70"),
    topRect(-38,-6,2,7,floor,"#333639"));
  for (const y of [-11,3]) out.push(topRect(-25,y,3.5,3,floor,"#9a9c99"));

  // Rails terminate at the faces of the square posts. Sort on the floor plane,
  // so the railing behind the cabinet reads through the open parts of the platform.
  const rails = [];
  const rail = (x,y,w,d,z,h,material) => rails.push({key:depth(world([x,y,0])),
    svg:slab("rail",x-w/2,y-d/2,w,d,z,h,material,.12)});
  const grid = [-44,-22,0,22,44], post = 1.6;
  for (const x of grid) for (const y of grid) {
    if (Math.max(Math.abs(x),Math.abs(y)) !== 44) continue;
    rail(x,y,post,post,floor,11,"fig-steel");
  }
  for (const side of [-44,44]) for (let i=0; i<grid.length-1; i++) {
    const mid = (grid[i]+grid[i+1])/2, span = grid[i+1]-grid[i]-post;
    for (const [z,h] of [[floor+4.4,.85],[floor+9.5,1.5]]) {
      rail(mid,side,span,1.25,z,h,"fig-steel");
      rail(side,mid,1.25,span,z,h,"fig-steel");
    }
  }
  rails.sort((a,b)=>a.key-b.key);
  const centre = depth(world([0,0,0]));
  out.push(...rails.filter(r=>r.key<centre).map(r=>r.svg));
  out.push(slab("plinth",-19,-19,32,32,5,2,"fig-steel"),
    slab("cabinet",-18,-18,30,30,7,24,"fig-tower",.65));
  // Cabinet door on +Y, louvres on +X. Hinge leaves and the latch sit on the door skin.
  const door = (x,z,w,h,color) => face([[x,12,z],[x+w,12,z],[x+w,12,z+h],[x,12,z+h]],color);
  out.push(door(-15.5,9,24.5,19.5,"#25282c"),door(-14.7,9.8,22.9,17.9,"#60646a"),
    door(-12,22,7.5,3.1,"#b0afa8"),door(-11.2,23.1,5.7,.6,"#606367"),
    door(-9.6,11.7,1.2,8.4,"#52575c"),door(-8.4,12.2,.5,7.4,"#777b7e"),
    door(3.8,15.4,2.8,6.1,"#282c31"),door(4.4,17,1.45,4,"#b1afa7"));
  for (const z of [12,23]) out.push(door(-15.6,z,3.8,2.3,"#9d9d99"));
  const vent = (y,z,w,h,color) => face([[12,y,z],[12,y+w,z],[12,y+w,z+h],[12,y,z+h]],color);
  out.push(vent(-2,10,11,15,"#23262a"));
  for (let z=11.2; z<24; z+=2.8) out.push(vent(-1.2,z,9.4,1.25,"#8a8d8c"));
  out.push(slab("drip-cap",-19.5,-19.5,33,33,31,2,"fig-steel"));
  out.push(bolts([-17,11].flatMap(x => [-17,11].map(y => at(world([x,y,33])))), .72));
  const mast = G.frameOf(world([-3,-3,33]),[0,0,1],[1,0,0],[0,1,0]);
  const stem = [[0,6.4],[1.8,6.4],[2.3,4.4],[7,4.4],[8.2,2.7],[35,2.7],
    [35,3.5],[38,3.5],[38,2.2],[ROD_TIP-TOP_DECK-37,2.2]];
  out.push(part(grp("fig-dark",S(G.solidOf(stem,mast,P,{fill:"faces",steps:40}),{tone:"mid",crease:"lo"})),
    audit?.solid(mast,stem,{name:"crown.mast"})),bolts(G.dotsOf(mast,1.8,5.45,6,P,{all:true}),.48),mastBeacon());

  // Side-mounted antenna. The dish returns to the feed stalk inside its rim.
  const dish = G.frameOf(world([12,-10,20]),[1,0,0],[0,1,0],[0,0,1]);
  const section = [[0,0],[0,3.4],[1.5,3.4],[1.5,1.9],[4,1.9],[4.8,3.8],[7.7,7],
    [8.5,7],[8.5,6.4],[6.4,4.3],[5.7,2],[5.7,.65],[9.7,.65],[9.7,1.2],[11,1.2],[11,0]];
  out.push(part(grp("fig-steel",S(G.lathe(section,dish,P,{fill:"faces",steps:36}),{tone:"mid",crease:"lo"})),
    audit?.lathe(dish,section,{name:"crown.antenna"})));
  out.push(...rails.filter(r=>r.key>=centre).map(r=>r.svg));
  return grp("tower-crown",out);
}

function tower() {
  const out = [];
  out.push(grp("fig-concrete", S(k.slabOf({ x: TW_X0 - 16, y: TW_Y0 - 16, w: TW.half * 2 + 32, d: TW.half * 2 + 32, r: 3 }, 0, PLINTH_TOP, P, 4, 0.8), { tone: "mid" })));
  const levels = [PLINTH_TOP, ...DECKS, TOP_DECK];
  const [c0, c1, c2, c3] = CORNERS; // far → near
  // faces named by their corners; front faces are x = TW_X1 and y = TW_Y1
  const backFaces = [[[TW_X0, TW_Y0], [TW_X0, TW_Y1]], [[TW_X0, TW_Y0], [TW_X1, TW_Y0]]];
  const frontFaces = [[[TW_X1, TW_Y0], [TW_X1, TW_Y1]], [[TW_X0, TW_Y1], [TW_X1, TW_Y1]]];
  for (let i = 0; i < levels.length - 1; i++) {
    const z0 = levels[i] + (i ? 5 : 0), z1 = levels[i + 1];
    if (i) out.push(platform(levels[i], i % 3 === 0));
    backFaces.forEach(([a, b]) => out.push(faceBraces(a, b, z0, z1, "lo")));
    [c0, c1, c2].forEach((c) => out.push(column(c, z0, z1)));
    frontFaces.forEach(([a, b]) => out.push(faceBraces(a, b, z0, z1, "mid")));
    out.push(column(c3, z0, z1));
  }
  // elevator: guide rails on the near y-face, a car part way up
  const ey = TW_Y1 + 3;
  out.push(L(seg([TW.cx - 12, ey, PLINTH_TOP], [TW.cx - 12, ey, TOP_DECK]) + seg([TW.cx + 6, ey, PLINTH_TOP], [TW.cx + 6, ey, TOP_DECK]), { tone: "mid" }));
  const car = { x: TW.cx - 14, y: TW_Y1 + 1, w: 22, d: 9, r: 1 };
  out.push(`<g class="fig-orange">${S(k.slabOf(car, 1420, 34, P, 2, 0.5), { tone: "hi", crease: "lo" })}${L(k.sideSeam(car, 1440, P, 2), { tone: "lo" })}</g>`);
  out.push(towerCrown());
  return grp("fig-tower", out);
}

// ---------- pipes and cable trays down the tower face ----------
function pipes() {
  const out = [];
  const routes = [
    { r: 3.2, pts: [[TW_X1 + 5, -10, PLINTH_TOP], [TW_X1 + 5, -10, ARM.qd + 30], [-R - 6, -10, ARM.qd + 30]] },
    { r: 2.6, pts: [[TW_X1 + 5, 0, PLINTH_TOP], [TW_X1 + 5, 0, ARM.qd + 31], [-R - 6, 0, ARM.qd + 31]] },
    { r: 2.2, pts: [[TW_X1 + 5, 12, PLINTH_TOP], [TW_X1 + 5, 12, ARM.crew - 4], [TW_X1 + 2, 12, ARM.crew - 4]] },
  ];
  for (const { r, pts } of routes) {
    const route = G.fillet(pts, Math.max(3, 2.6 * r), 7, { P, tube: r });
    const pieces = tubePieces(route, r, P, { maxLength: 60 });
    out.push(pieces.map((p) => tubeSvg(p, { tone: "hi" })).join(""));
    // clamps every few bays on the vertical leg
    const clamps = [];
    for (let z = 120; z < pts[1][2] - 20; z += 150) clamps.push(S(k.slabOf({ x: TW_X1 + 1, y: pts[0][1] - r - 1.5, w: 8, d: r * 2 + 3, r: 0.6 }, z, 3, P, 2), { tone: "mid", crease: "none" }));
    out.push(clamps.join(""));
  }
  return grp("fig-tower", out);
}

// ---------- arms ----------
function truss(plan, z, h, tone = "mid") {
  const out = [S(k.slabOf(plan, z, 3, P, 2, 0.4), { tone, crease: "lo" }), S(k.slabOf(plan, z + h - 3, 3, P, 2, 0.4), { tone, crease: "lo" })];
  const yNear = plan.y + plan.d, lines = [];
  for (let x = plan.x; x < plan.x + plan.w - 1; x += 12) {
    const x1 = Math.min(x + 12, plan.x + plan.w);
    lines.push(seg([x, yNear, z + 3], [x1, yNear, z + h - 3]), seg([x1, yNear, z + 3], [x1, yNear, z + h - 3]));
  }
  out.splice(1, 0, L(lines.join(""), { tone: "lo" }));
  return out.join("");
}

function qdArm() {
  const plan = { x: TW_X1, y: -14, w: -R - 4 - TW_X1, d: 28, r: 1 };
  const out = [truss(plan, ARM.qd, 26)];
  out.push(S(k.slabOf({ x: -R - 8, y: -18, w: 6, d: 36, r: 1 }, ARM.qd - 4, 40, P, 2, 0.5), { tone: "mid" }));
  return grp("fig-tower", out);
}

// ---------- crew access arm and crew (own layer: fig-crew.svg) ----------
// A landing cantilevered off the tower's near face, a walkway truss and a white room docked against the
// fairing. It sits on the near side of the tower (y 36–72) so the walkway reads in the gap between tower and
// rocket; the white room runs into the fairing and the rocket layer paints over the part behind its skin.
// Two astronauts walk from the landing into the white room while a pad technician waves them on. Their
// motion is CSS inside this layer's own small SVG, so only that image repaints.
const CZ = ARM.crew;
const LANDING = { x: -152, y: 37, w: 30, d: 34, r: 1.2 };
const WALK = { x: -122, y: 48, w: 44, d: 20, r: 1 };
const ROOM = { x: -80, y: 44, w: 44, d: 28, r: 1.5 };
const LANE = 61.5, WALK_FROM = -144, WALK_TO = -71, TECH = [-136, 44];
const STEP = 1.5;                                             // half a stride, along the walkway

// handrail along a straight edge: posts every ~8 units, mid and top rail
function handrail([x0, y0], [x1, y1], z) {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 8)), posts = [];
  for (let i = 0; i <= n; i++) posts.push(k.rise([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n], z, z + 13, P));
  return L(posts.join("") + seg([x0, y0, z + 13], [x1, y1, z + 13]) + seg([x0, y0, z + 7], [x1, y1, z + 7]), { tone: "hi" });
}
// a flat patch on the plane y = const (window, stripe, sign plate)
const onFaceY = (y, x0, x1, z0, z1, fill) => `<path d="${k.pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true)}" fill="${fill}"/>`;
// a cap on a ball: the points of the sphere within `cone` degrees of direction `dir` (unit, in the xy plane)
function capOf(c, r, [dx, dy], cone, fill) {
  const a = cone * RAD, pts = [];
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2, u = Math.sin(a) * Math.cos(t), w = Math.sin(a) * Math.sin(t);
    pts.push(at([c[0] + r * (Math.cos(a) * dx - u * dy), c[1] + r * (Math.cos(a) * dy + u * dx), c[2] + r * w]));
  }
  return `<path d="${k.pathOf(pts, true)}" fill="${fill}"/>`;
}

// One person facing +x (along the walkway), standing on the floor at (x0, y0). Parts are painted far to
// near: far arm, far leg, near leg, pack, torso, near arm, head. `suit` is the material group class.
function person(x0, y0, { suit, astronaut }) {
  const z = CZ;
  const box = (plan, z0, h, tone = "hi") => S(k.slabOf(plan, z + z0, h, P, 2, 0.3), { tone, crease: "none" });
  const leg = (dy) => grp(suit, box({ x: x0 - 1.4, y: y0 + dy, w: 2.8, d: 2.2, r: 0.6 }, 2.2, 8.4)) +
    grp("fig-dark", box({ x: x0 - 1.6, y: y0 + dy - 0.1, w: 3.8, d: 2.4, r: 0.6 }, 0, 2.4));
  const arm = (dy) => grp(suit, box({ x: x0 - 1.1, y: y0 + dy, w: 2.2, d: 1.6, r: 0.6 }, 10.6, 7.8)) +
    grp("fig-dark", box({ x: x0 - 1, y: y0 + dy, w: 2, d: 1.6, r: 0.5 }, 9.2, 1.6));
  const torso = { x: x0 - 2.6, y: y0 - 3.2, w: 5.2, d: 6.4, r: 1.2 };
  const head = [x0 + 0.2, y0, z + 22];
  const parts = {
    farArm: arm(-4.8), farLeg: leg(-2.5), nearLeg: leg(0.3), nearArm: arm(3.2),
    body: [
      astronaut ? grp("fig-white", box({ x: x0 - 5, y: y0 - 2.6, w: 2.6, d: 5.2, r: 0.6 }, 11.2, 7.6)) : "",
      grp(suit, box(torso, 10.2, 8.6)),
      // a band across the chest: the mission stripe on a suit, a reflective strip on coveralls
      onFaceY(y0 + 3.2, x0 - 2.5, x0 + 2.6, z + 15.2, z + 16.4, astronaut ? "#F26A21" : "#F4F1E8"),
      grp("fig-dark", S(k.cylinder(x0 + 0.1, y0, 1.6, z + 18.6, 1.3, P, 16), { tone: "hi", crease: "none" })),
    ].join(""),
    head: astronaut
      ? grp("fig-white", S(G.sphereOf(head, 3.2, P), { tone: "hi" })) + capOf(head, 3.2, [1, 0], 52, "#2C2A27") + capOf([head[0], head[1] + 0.5, head[2] + 0.7], 3.2, [0.95, 0.3], 24, "rgba(214,176,108,.55)")
      : `<path d="${G.sphereOf([head[0], head[1], head[2] - 0.6], 2.5, P).fill}" fill="#D7A57E"/>` +
        grp("fig-white", S(k.cylinder(head[0], head[1], 3.2, z + 22.2, 0.5, P, 20), { tone: "hi", crease: "none" }) + S(G.sphereOf([head[0] - 0.1, head[1], z + 22.7], 2.6, P), { tone: "hi" })),
  };
  return parts;
}

// a walker: legs and arms swing on alternate phases, the body bobs; the whole group walks the lane
function walker(id, offset) {
  const p = person(WALK_FROM, LANE, { suit: "fig-white", astronaut: true });
  return `<g class="walker" style="animation-delay:${offset}s;transform:translate(var(--rest-${id}))"><g class="sb" style="animation-delay:${offset}s">${p.farArm}</g><g class="sa" style="animation-delay:${offset}s">${p.farLeg}</g><g class="sb" style="animation-delay:${offset}s">${p.nearLeg}</g><g class="bob" style="animation-delay:${offset}s">${p.body}${p.head}</g><g class="sa" style="animation-delay:${offset}s">${p.nearArm}</g></g>`;
}

function crewLayer() {
  const far = [], near = [];
  // landing: beam on the tower face, knee braces, grated deck
  far.push(grp("fig-tower", [
    S(k.slabOf({ x: -151, y: 35.6, w: 28, d: 1.4, r: 0.3 }, CZ - 14, 14, P, 2), { tone: "mid", crease: "lo" }),
    ...[-148, -126].map((x) => S(k.slabOf({ x: x - 2, y: 35.6, w: 4, d: 1.4, r: 0.3 }, CZ - 54, 7, P, 2), { tone: "mid", crease: "lo" })),
    L([-148, -126].map((x) => seg([x, 36.6, CZ - 50], [x, LANDING.y + LANDING.d - 4, CZ - 5])).join(""), { tone: "hi" }),
    S(k.slabOf(LANDING, CZ - 5, 5, P, 3, 0.5), { tone: "mid", crease: "lo" }),
    L(k.sideSeam(LANDING, CZ - 2.5, P, 3), { tone: "faint" }),
    ...Array.from({ length: 5 }, (_, i) => L(k.lineOnTop([LANDING.x + 5 + i * 5, LANDING.y + 1], [LANDING.x + 5 + i * 5, LANDING.y + LANDING.d - 1], CZ, P), { tone: "faint" })),
  ]));
  // flood lamp on the landing's far corner, aimed down the walkway
  far.push(grp("fig-tower", L(k.rise([-150, 39], CZ, CZ + 24, P), { tone: "hi" })));
  far.push(grp("fig-steel", S(k.slabOf({ x: -152, y: 37.2, w: 4.4, d: 3.6, r: 0.6 }, CZ + 23, 4, P, 2, 0.3), { tone: "hi", crease: "none" })));
  far.push(`<path d="${k.pathOf([at([-147.6, 37.6, CZ + 23.6]), at([-147.6, 40.4, CZ + 23.6]), at([-147.6, 40.4, CZ + 26.4]), at([-147.6, 37.6, CZ + 26.4])], true)}" fill="#FFF3D2"/>`);
  // arm hinge: a post on the landing's corner with two collars
  far.push(grp("fig-tower", [
    S(k.cylinder(-122.5, 46, 2.4, CZ - 28, 44, P, 20), { tone: "hi", crease: "none" }),
    ...[CZ - 10, CZ + 9].map((z) => S(k.cylinder(-122.5, 46, 3.3, z, 1.8, P, 20), { tone: "hi", crease: "none" })),
  ]));
  // walkway: a box truss of two edge girders (bottom chords, posts and diagonals), then the deck and grating
  const chord = (y) => S(k.slabOf({ x: WALK.x, y, w: WALK.w, d: 2, r: 0.4 }, CZ - 22, 3, P, 2, 0.3), { tone: "mid", crease: "lo" });
  const yNear = WALK.y + WALK.d - 1, webs = [];
  for (let x = WALK.x; x < WALK.x + WALK.w - 1; x += 11) {
    const x1 = Math.min(x + 11, WALK.x + WALK.w);
    webs.push(seg([x, yNear, CZ - 19], [x1, yNear, CZ - 3]), k.rise([x1, yNear], CZ - 19, CZ - 3, P));
  }
  far.push(grp("fig-tower", [chord(WALK.y), chord(WALK.y + WALK.d - 2), L(webs.join(""), { tone: "hi" }), S(k.slabOf(WALK, CZ - 3, 3, P, 2, 0.4), { tone: "mid", crease: "lo" }),
    L(Array.from({ length: 8 }, (_, i) => k.lineOnTop([WALK.x + 4 + i * 5, WALK.y + 1], [WALK.x + 4 + i * 5, WALK.y + WALK.d - 1], CZ, P)).join(""), { tone: "faint" })]));
  // rails behind the lane: the landing's back and side, the walkway's far side
  far.push(grp("fig-tower", [
    handrail([-151, 38], [-151, 70], CZ), handrail([-151, 38], [-123, 38], CZ), handrail([-123, 38], [-123, 47], CZ),
    handrail([-121, 49], [-80, 49], CZ),
  ]));
  // the pad technician at the back of the landing, waving the crew on
  {
    const t = person(...TECH, { suit: "fig-orange", astronaut: false });
    const shoulder = at([TECH[0], TECH[1] + 4, CZ + 18]).map(r1);
    far.push(`<g class="tech">${t.farArm}${t.farLeg}${t.nearLeg}${t.body}${t.head}<g class="wave" style="--sx:${shoulder[0]}px;--sy:${shoulder[1]}px">${t.nearArm}</g></g>`);
  }
  // rails and toe boards in front of the lane
  near.push(grp("fig-tower", [
    handrail([-121, 67], [-80, 67], CZ), handrail([-151, 70], [-122, 70], CZ), handrail([-122, 70], [-122, 67], CZ),
    S(k.slabOf({ x: -121, y: 67, w: 41, d: 0.8, r: 0.2 }, CZ, 2.2, P, 1), { tone: "mid", crease: "none" }),
    S(k.slabOf({ x: -151, y: 70, w: 29, d: 0.8, r: 0.2 }, CZ, 2.2, P, 1), { tone: "mid", crease: "none" }),
  ]));
  // white room: dark underframe, white cabin, roof with an air handler, a window and the orange band
  const yN = ROOM.y + ROOM.d;
  near.push(grp("fig-tower", S(k.slabOf(k.insetPlan(ROOM, 1.5), CZ - 11, 8, P, 3, 0.5), { tone: "mid", crease: "lo" })));
  near.push(grp("fig-white", [
    S(k.slabOf(ROOM, CZ - 3, 43, P, 3, 0.6), { tone: "hi", crease: "lo" }),
    L(k.sideSeam(ROOM, CZ + 2, P, 3) + k.sideSeam(ROOM, CZ + 37, P, 3), { tone: "faint" }),
    onFaceY(yN, ROOM.x + 1.5, ROOM.x + ROOM.w, CZ + 31, CZ + 34, "#F26A21"),
    onFaceY(yN, -73, -59, CZ + 12, CZ + 28, "#8F9296"), onFaceY(yN, -72.2, -59.8, CZ + 12.8, CZ + 27.2, "#2B2E33"),
    `<path d="${k.pathOf([at([-71, yN, CZ + 13]), at([-67, yN, CZ + 13]), at([-62, yN, CZ + 27]), at([-66, yN, CZ + 27])], true)}" fill="rgba(255,255,255,.14)"/>`,
    onFaceY(yN, -55, -49, CZ + 17, CZ + 24, "#F26A21"), onFaceY(yN, -54, -50, CZ + 20, CZ + 20.6, "#FBE3D2"),
    S(k.slabOf({ x: ROOM.x - 2, y: ROOM.y - 2, w: ROOM.w + 4, d: ROOM.d + 4, r: 2 }, CZ + 40, 2.5, P, 3, 0.4), { tone: "hi", crease: "lo" }),
  ]));
  near.push(grp("fig-steel", [
    S(k.slabOf({ x: -74, y: 50, w: 13, d: 12, r: 1 }, CZ + 42.5, 6, P, 2, 0.4), { tone: "hi", crease: "lo" }),
    L(k.ring(-67.5, 56, 4, CZ + 48.5, P, 24), { tone: "mid" }),
    D([at([-67.5, 56, CZ + 48.5])], { size: 0.7, tone: "mid" }),
  ]));

  // crop: everything above sits inside these corners
  const box = [];
  for (const [p, z0, z1] of [[LANDING, CZ - 56, CZ + 30], [WALK, CZ - 23, CZ + 30], [{ x: ROOM.x - 2, y: ROOM.y - 2, w: ROOM.w + 4, d: ROOM.d + 4 }, CZ - 12, CZ + 50]])
    for (const x of [p.x, p.x + p.w]) for (const y of [p.y, p.y + p.d]) for (const z of [z0, z1]) box.push(at([x, y, z]));
  const pad = 4;
  const x0 = Math.floor(Math.min(...box.map((q) => q[0])) - pad), y0 = Math.floor(Math.min(...box.map((q) => q[1])) - pad);
  const crop = [x0, y0, Math.ceil(Math.max(...box.map((q) => q[0])) + pad) - x0, Math.ceil(Math.max(...box.map((q) => q[1])) + pad) - y0];

  // motion: the walk vector and stride in screen units, from the camera
  const o = at([0, 0, 0]), ax = at([1, 0, 0]);
  const v = [ax[0] - o[0], ax[1] - o[1]], len = WALK_TO - WALK_FROM;
  const tr = (s) => `${r1(v[0] * s)}px,${r1(v[1] * s)}px`;
  const css = `.fig-crew{--rest-1:${tr(len * 0.3)};--rest-2:${tr(len * 0.62)}}
.walker{animation:walk 28s linear infinite}
.sa,.sb{animation:step 1.1s ease-in-out infinite}.sb{animation-name:step-b}
.bob{animation:bob .55s ease-in-out infinite alternate}
.wave{animation:wave 9s ease-in-out infinite}
@keyframes walk{0%{transform:translate(0,0);opacity:0}4%{opacity:1}82%,100%{transform:translate(${tr(len)});opacity:1}}
@keyframes step{0%,100%{transform:translate(${tr(-STEP)})}50%{transform:translate(${tr(STEP)})}}
@keyframes step-b{0%,100%{transform:translate(${tr(STEP)})}50%{transform:translate(${tr(-STEP)})}}
@keyframes bob{from{transform:translate(0,0)}to{transform:translate(0,-.6px)}}
@keyframes wave{0%,52%,94%,100%{transform:none}60%,86%{transform:translate(var(--sx),var(--sy)) rotate(150deg) translate(calc(-1 * var(--sx)),calc(-1 * var(--sy)))}66%,78%{transform:translate(var(--sx),var(--sy)) rotate(132deg) translate(calc(-1 * var(--sx)),calc(-1 * var(--sy)))}72%{transform:translate(var(--sx),var(--sy)) rotate(162deg) translate(calc(-1 * var(--sx)),calc(-1 * var(--sy)))}}
@media (prefers-reduced-motion:reduce){.walker,.sa,.sb,.bob,.wave{animation:none}}`;
  const body = `<style>${css}</style><g class="fig-crew">${far.join("")}${walker(1, 0)}${walker(2, -14)}${near.join("")}</g>`;
  return { body, crop };
}

function chopstick(side) {
  const y0 = side < 0 ? -(R + 22) : R + 10;
  const plan = { x: TW_X1 + 4, y: y0, w: 40 - TW_X1, d: 12, r: 1.5 };
  const out = [];
  out.push(S(k.slabOf(plan, ARM.chop, 22, P, 3, 0.6), { tone: "mid", crease: "lo" }));
  out.push(L(k.sideSeam(plan, ARM.chop + 11, P, 3), { tone: "faint" }));
  // catch rails on top, bolt dots, and the actuator under the arm
  out.push(L(k.lineOnTop([plan.x + 10, y0 + 3], [plan.x + plan.w - 6, y0 + 3], ARM.chop + 22, P) + k.lineOnTop([plan.x + 10, y0 + 9], [plan.x + plan.w - 6, y0 + 9], ARM.chop + 22, P), { tone: "lo" }));
  const dots = [];
  for (let x = plan.x + 14; x < plan.x + plan.w - 8; x += 18) dots.push(at([x, y0 + 6, ARM.chop + 22]));
  out.push(D(dots, { size: 0.6, tone: "mid" }));
  out.push(S(k.slabOf({ x: plan.x + plan.w - 16, y: y0 - 2, w: 12, d: 16, r: 1 }, ARM.chop + 22, 6, P, 2, 0.5), { tone: "hi", crease: "lo" }));
  return grp("fig-tower", out);
}

function carriage() {
  const plan = { x: TW_X1, y: -(R + 34), w: 8, d: 2 * (R + 34), r: 1.5 };
  return grp("fig-tower", [S(k.slabOf(plan, ARM.chop - 30, 84, P, 3, 0.6), { tone: "mid", crease: "lo" }), L(k.sideSeam(plan, ARM.chop + 40, P, 3), { tone: "lo" })]);
}

// ---------- launch mount ----------
const legsAt = [30, 90, 150, 210, 270, 330].map((a) => ({ a, x: MOUNT.legR * Math.cos(a * RAD), y: MOUNT.legR * Math.sin(a * RAD) }))
  .sort((p, q) => depth([p.x, p.y, 0]) - depth([q.x, q.y, 0]));

function mountPier({ x, y, a }) {
  const out = [];
  function block(dx, dy, w, d, z, h, material = "fig-steel", bevel = .45) {
    const plan = { x: x + dx - w / 2, y: y + dy - d / 2, w, d, r: bevel };
    out.push(part(grp(material, S(k.slabOf(plan, z, h, P, 3, bevel), { tone: "mid", crease: "lo" })),
      audit?.slab(plan,z,h,{name:"pier"+a+".block",ground:z===0},3)));
  }
  block(0, 0, 21, 21, 0, 3, "fig-concrete", 1);
  block(0, 0, 19.5, 19.5, 3, 2.5, "fig-dark");
  out.push(bolts([-7.9,7.9].flatMap(dx => [-7.9,7.9].map(dy => at([x+dx,y+dy,5.5]))), 1.05));
  // Build the splice into the column, with inspection bolts on its two exposed faces.
  block(0, 0, 12, 12, 5.5, 82.5);
  block(0, 0, 14.2, 14.2, 88, 9, "fig-dark");
  out.push(bolts([90.2,94.8].flatMap(z => [-4,4].flatMap(v => [at([x+7.1,y+v,z]), at([x+v,y+7.1,z])])), .62));
  // The two haunches seat under a spreader beam.
  const bracket = G.frameOf([x,y,0],[0,-1,0],[1,0,0],[0,0,1]);
  function haunch(sign) {
    const section = [[6,160],[6,194],[18.5,194],[18.5,191]]
      .map(([u,z])=>[sign*u,z]);
    const steel = S(G.prismOf(bracket,section,-1.5,1.5,P),{tone:"mid",crease:"lo"});
    out.push(part(grp("fig-dark",steel),audit?.prism(bracket,section,-1.5,1.5,{name:"pier"+a+".haunch"})));
  }
  haunch(-1);
  block(0, 0, 12, 12, 97, MOUNT.legTop - 103);
  haunch(1);
  block(0, 0, 38, 16, MOUNT.legTop-6, 4);
  block(0, 0, 39, 17, MOUNT.legTop-2, 2, "fig-dark");
  if (a === 90) {
    for (const z of [12, 75, 145, 189]) block(0, 8, 11, 4, z, 1.8);
    block(-4.8, 10.8, 1.5, 1.6, 8, 187, "fig-dark", .2);
    for (let z = 15; z < 194; z += 12) block(0, 10.8, 8.1, 1.2, z, 1.2, "fig-steel", .15);
    block(4.8, 10.8, 1.5, 1.6, 8, 187, "fig-dark", .2);
  }
  return out.join("");
}

// Paint the far bore wall, the near outside wall, then the annular top. The exhaust
// opening stays transparent through all three courses of the circular girder.
function girderCourse(bottom, top, inner, outer, face, wall) {
  const arc = (r,z,start,end) => G.arcPoints(UP,z,r,start*RAD,end*RAD,80).map(at);
  const side = (r,start,end) => k.pathOf([...arc(r,top,start,end), ...arc(r,bottom,end,start)], true);
  const topFace = k.ring(0,0,outer,top,P,144) + k.ring(0,0,inner,top,P,144);
  return part(`<path d="${side(inner,AZ+90,AZ+270)}" fill="#4d5156"/>
    <path d="${side(outer,AZ-90,AZ+90)}" fill="${wall}"/>
    <path d="${topFace}" fill="${face}" fill-rule="evenodd"/>`, audit?.ring(UP,bottom,top,inner,outer,{name:"girder.course"}));
}

function mountDeck() {
  const out = [];
  const ringF = UP;
  const {legTop, ringTop, rIn, rOut} = MOUNT;
  out.push(`<defs><linearGradient id="girder-web"><stop stop-color="#494d52"/><stop offset=".32" stop-color="#777b7d"/><stop offset=".72" stop-color="#55595c"/><stop offset="1" stop-color="#383c40"/></linearGradient></defs>`);
  out.push(girderCourse(legTop,legTop+3,rIn,rOut,"#b4b3af","#74777a"),
    girderCourse(legTop+3,ringTop-4,rIn+3,rOut-4,"#a8a7a3","url(#girder-web)"));
  for (let deg = 0; deg < 360; deg += 15) {
    if (facing(deg) <= 0) continue;
    const rib = [[-1,legTop+3],[1,legTop+3],[1,ringTop-4],[-1,ringTop-4]];
    const frame = radial(deg,0);
    out.push(part(S(G.prismOf(frame,rib,rOut-4,rOut-.5,P),{tone:"lo",crease:"none"}),
      audit?.prism(frame,rib,rOut-4,rOut-.5,{name:"girder.stiffener"})));
  }
  out.push(girderCourse(ringTop-4,ringTop,rIn,rOut,"#cbc9c2","#77797a"));
  // Removable tread plates between the deluge main and the outer rim.
  for (let deg = 0; deg < 360; deg += 15) {
    const panel = [...G.arcPoints(UP,ringTop,121,(deg+.3)*RAD,(deg+14.7)*RAD,6),
      ...G.arcPoints(UP,ringTop,101,(deg+14.7)*RAD,(deg+.3)*RAD,6)];
    out.push(`<path d="${k.pathOf(panel.map(at),true)}" fill="${deg % 30 ? "#dedbd5" : "#d7d5ce"}"/>`);
    for (const angle of [deg+2,deg+13]) out.push(bolts([104,118].map(r=>at(onBody(angle,r,0,ringTop))), .67));
    const slot = [[-3,-.7],[3,-.7],[3,.7],[-3,.7]].map(([u,v])=>at(onBody(deg+7.5,111+v,u,ringTop)));
    out.push(`<path d="${k.pathOf(slot,true)}" fill="#636568"/>`);
  }
  out.push(D(G.dotsOf(ringF, MOUNT.ringTop, MOUNT.rIn + 7, 36, P, { all: true }), { size: 0.55, tone: "mid" }));
  // deluge ring with nozzles
  const loop = G.arcPoints(ringF, MOUNT.ringTop + 3, 96, 0, Math.PI * 2, 72);
  const pieces = tubePieces(loop, 2.6, P, { maxLength: 400, closed: true });
  out.push(pieces.map((p) => tubeSvg(p, { tone: "hi" })).join(""));
  out.push(D(G.dotsOf(ringF, MOUNT.ringTop + 5.6, 96, 24, P, { all: true }), { size: 0.7, tone: "hi" }));
  return grp("fig-steel", out);
}

const CLAMPS = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
function clamp(deg) {
  const z = MOUNT.ringTop, h = SKIRT_BOT-z;
  function plate(frame, section, start, end, name) {
    return part(S(G.prismOf(frame,section,start,end,P),{tone:"mid"}),
      audit?.prism(frame,section,start,end,{name:"clamp"+deg+"."+name}));
  }
  const foot = plate(radial(deg,z), [[-6.5,0],[6.5,0],[6.5,4],[-6.5,4]], RF-2, RF+13,"foot");
  const out = [foot, bolts([-4.9,4.9].map(u=>at(onBody(deg,RF+10.8,u,z+4))), .8)];
  const radialAxis = onBody(deg,1,0,0), pinAxis = onBody(deg,0,-1,0);
  const jaw = G.frameOf(onBody(deg,RF,0,z),pinAxis,radialAxis,[0,0,1]);
  const pivot = G.frameOf(onBody(deg,RF+6,0,z+16),pinAxis,radialAxis,[0,0,1]);
  const cheek = [[0,4],[11,4],[10,17],[8,21],[4,21],[1,18]];
  // Two cheeks share a cross-pin. The lever fits between them and its toe meets the skirt.
  const side = G.dot3(pinAxis, [VIEW[0],VIEW[1],0]) >= 0 ? 1 : -1;
  for (const sign of [-side,side]) {
    if (sign === side) {
      const lever = [[3,12],[9,12],[10,18],[7,h-5],[4,h],[0,h],[0,h-3],[3,h-6]];
      out.push(grp("fig-dark",plate(jaw,lever,-2,2,"lever")));
    }
    out.push(plate(jaw,cheek,Math.min(sign*2,sign*4),Math.max(sign*2,sign*4),"cheek"));
  }
  const cap = side*4.55;
  out.push(part(grp("fig-dark",S(G.disc(cap-.55,cap+.55,2.4,pivot,P,{steps:20}),{tone:"lo"})),
    audit?.disc(pivot,cap-.55,cap+.55,2.4,{name:"clamp"+deg+".pin-cap"})));
  return grp("fig-steel",out);
}

// ---------- engines ----------
const throat = 12;
const bellR = s => {
  const t = (s-throat)/(BELL_LEN-throat);
  return 5.1 + 10.4*t*(1.72-.72*t);
};
const bellSlope = s => 10.4*(1.72-1.44*(s-throat)/(BELL_LEN-throat))/(BELL_LEN-throat);
const ENGINES = [[0, 0], ...[0, 45, 90, 135, 180, 225, 270, 315].map((a) => [44 * Math.cos(a * RAD), 44 * Math.sin(a * RAD)])];
// ---------- rendered look: studio-lit materials for the round parts ----------
const GRADS = {
  gCover: [[0,"#b9bdbe"],[.23,"#e1e2dd"],[.53,"#d4d5d0"],[1,"#b4b8b7"]],
  gGraphite: [[0,"#44494f"],[.33,"#595d62"],[1,"#3b3f44"]],
  gNozzle: [[0,"#48454a"],[.18,"#959198"],[.32,"#c3bfba"],[.54,"#818086"],[.79,"#55545b"],[1,"#33363c"]],
  gLip: [[0,"#473d3c"],[.2,"#998678"],[.37,"#b1a49a"],[.67,"#6c5d5c"],[1,"#413c42"]],
  gWhite: [[0, "#CFCDC9"], [0.07, "#E6E5E2"], [0.24, "#FFFFFF"], [0.3, "#FCFCFB"], [0.52, "#ECEBE8"], [0.74, "#D3D1CD"], [0.88, "#C2BFBA"], [1, "#CDCAC5"]],
  gDark: [[0, "#2A2C30"], [0.1, "#3E4147"], [0.25, "#6C7078"], [0.31, "#575B62"], [0.52, "#36393E"], [0.76, "#222428"], [0.9, "#1A1B1E"], [1, "#26282C"]],
  gOrange: [[0, "#C9541A"], [0.1, "#EA6A26"], [0.25, "#FFA46C"], [0.32, "#FB8645"], [0.52, "#F06A22"], [0.76, "#C9531A"], [0.9, "#AE4510"], [1, "#BF4D14"]],
  gSteel: [[0, "#B3B0AB"], [0.1, "#CFCCC8"], [0.26, "#F4F3F1"], [0.5, "#CFCCC7"], [0.78, "#9C9994"], [0.92, "#8D8A85"], [1, "#A3A09B"]],
};
const defsSvg = (extra = "") => `<defs>${Object.entries(GRADS).map(([id, stops]) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`).join("")}
<filter id="fAO" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter>
<filter id="fBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
<filter id="fSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
<radialGradient id="gGlow"><stop offset="0" stop-color="#FFD2A8"/><stop offset="0.35" stop-color="#FF8A3C" stop-opacity="0.85"/><stop offset="1" stop-color="#F26A21" stop-opacity="0"/></radialGradient>${extra}</defs>`;
// a turned part drawn as one lit surface: gradient body, inner seams, soft silhouette
const R3 = (paths, grad, { inner = "", opacity = 1, edge = 0.26 } = {}) =>
  `<g class="rnd"><path d="${paths.fill}" style="fill:url(#${grad})${opacity < 1 ? `;fill-opacity:${opacity}` : ""}"/>${inner}<path class="iso-line" d="${paths.outline}" style="stroke:rgba(30,31,34,${edge})"/></g>`;
// dark bolt heads with a pin of light, like the screws on a moulded case
const bolts = (pts, r = 1.25) => pts.map(([x, y, a = 1]) => a < 0.15 ? "" : `<g opacity="${Math.min(1, a * 1.4).toFixed(2)}"><circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="#1F2023"/><circle cx="${r1(x - r * 0.3)}" cy="${r1(y - r * 0.32)}" r="${r * 0.36}" fill="#8C8F95"/></g>`).join("");
const r1 = (v) => Math.round(v * 10) / 10;

function bell([x, y]) {
  const F = G.frameOf([x, y, SKIRT_BOT], [0, 0, -1], [1, 0, 0], [0, -1, 0]);
  const lip = BELL_LEN-3, joint = 28, shoulder = 30;
  function jacket(start,end) {
    const radii = Array.from({length:9}, (_,i) => {
      const s = start+(end-start)*i/8;
      return [s,bellR(s)];
    });
    const channels = [];
    for (let i=0; i<28; i++) {
      const angle = 2*Math.PI*i/28;
      const face = facing(-360*i/28);
      if (face <= .12) continue;
      channels.push({d:k.pathOf(radii.map(([s,r])=>at(G.pointOf(F,s,r,angle)))), alpha: .52*face});
    }
    const seams = [start,end].map(s=>G.arcOf(F,s,bellR(s),P,{slope:bellSlope(s)})).join("");
    const inner = k.fadedSvg(channels,{tone:"mid"}) + L(seams,{tone:"mid"});
    return part(R3(G.solidOf(radii,F,P,{smooth:{radius:bellR,slope:bellSlope}}),"gNozzle",{inner}),
      audit?.solid(F,radii,{radius:bellR,name:"engine.jacket"}));
  }
  const turned = (profile,material,frame=F) => part(R3(G.solidOf(profile,frame,P),material),
    audit?.solid(frame,profile,{name:"engine.turned"}));
  // An axial coolant feed ends at a machined lug on the jacket band.
  const feedAngle = (AZ+40)*RAD, feedR = 14.9;
  const feed = G.frameOf([x+feedR*Math.cos(feedAngle),y+feedR*Math.sin(feedAngle),SKIRT_BOT],F.a,F.u,F.v);
  const port = G.frameOf([x,y,SKIRT_BOT-joint],[Math.cos(feedAngle),Math.sin(feedAngle),0],
    [-Math.sin(feedAngle),Math.cos(feedAngle),0],[0,0,1]);
  const lug = [[-1.6,0],[1.6,0],[1.6,-2],[-1.6,-2]];
  const lugStart = bellR(shoulder)+.6;
  return grp("fig-steel",[
    turned([[lip,bellR(lip)],[lip+.5,15.9],[BELL_LEN-.6,15.9],[BELL_LEN,15.5]],"gLip"),
    jacket(shoulder,lip),
    turned([[joint,bellR(joint)],[joint+.4,bellR(joint)+.8],[shoulder-.4,bellR(shoulder)+.8],[shoulder,bellR(shoulder)]],"gSteel"),
    jacket(throat,joint),
    turned([[3,7.2],[6,7.2],[9,5.7],[10,5.7],[10.4,6.6],[11.5,6.6],[throat,5.1]],"gLip"),
    turned([[0,8.8],[2.5,8.8],[3,7.2]],"gDark"),
    part(S(G.prismOf(port,lug,lugStart,16,P),{tone:"mid"}),audit?.prism(port,lug,lugStart,16,{name:"engine.feed-lug"})),
    turned([[0,1.4],[3,1.4],[3.5,.85],[23.5,.85],[24,1.2],[27.5,1.2],[joint,1.4]],"gLip",feed)
  ]);
}

// ---------- rocket ----------
function bodySeams(s0, s1, r, step) {
  const arcs = [];
  for (let s = s0 + step; s < s1 - 4; s += step) arcs.push(G.arcOf(UP, s, r, P));
  return arcs.join("");
}

// Unroll a small patch of skin in circumferential and axial units. Sampling its
// edges on the local radius makes wide covers and long nose seams follow the shell.
function shellSkin(deg, centreZ, radiusAt) {
  function path(points, fill) {
    const contour = [];
    points.forEach(([u,v], i) => {
      const [nextU,nextV] = points[(i+1)%points.length];
      const steps = Math.max(1,Math.ceil(Math.abs(nextU-u)/4),Math.ceil(Math.abs(nextV-v)/8));
      for (let j=0; j<steps; j++) {
        const t = j/steps, z = centreZ + v + (nextV-v)*t, r = radiusAt(z);
        const angle = deg*RAD + (u+(nextU-u)*t)/r;
        contour.push(at([r*Math.cos(angle),r*Math.sin(angle),z]));
      }
    });
    return `<path d="${k.pathOf(contour,true)}" fill="${fill}"/>`;
  }
  const panel = (x,y,w,h,r,fill) => path(k.roundedPlan({x,y,w,d:h,r},4),fill);
  const disc = (u,v,r,fill) => path(k.circleRing(u,v,r,24),fill);
  return {path,panel,disc};
}

function serviceCover(deg, z, ports = false) {
  const { panel, disc } = shellSkin(deg,z,()=>R);
  const out = [
    panel(-17,-21,34,42,4.3,"#939597"),
    panel(-16.4,-20.4,32.8,40.8,3.8,"#e8e8e3"),
    panel(-15.7,-19.7,31.4,39.4,3.5,"url(#gCover)"),
  ];
  for (const u of [-12.9,12.9]) for (const v of [-16.6,16.6]) {
    out.push(disc(u,v,1,"#777a7b"),panel(u-.58,v-.14,1.16,.28,.12,"#d4d5d1"));
  }
  if (ports) {
    for (const [v,r] of [[5.8,7],[-9.2,4.2]]) {
      out.push(disc(0,v,r+1.1,"#85898a"),disc(0,v,r,"url(#gSteel)"),disc(0,v,r-1.25,"#414448"));
      const pins = v > 0 ? [[-2.1,-1.4],[2.1,-1.4],[0,2]] : [[0,0]];
      for (const [u,dv] of pins) out.push(disc(u,v+dv,.95,"#b9aa87"),disc(u-.2,v+dv+.2,.36,"#e2d3b2"));
    }
  } else {
    for (const v of [-8,8]) out.push(panel(-9,v,14,1.8,.9,"#b5b9b8"),panel(-8.6,v+.85,13.2,.65,.32,"#e4e4de"));
    for (const v of [-10,8]) out.push(panel(-17.2,v,4.1,6,1,"#929698"),panel(-16.6,v+.6,2,4.8,.6,"#d2d4d1"));
    out.push(panel(7.5,-3.5,4.4,8,1.4,"#676b6e"),panel(8.3,-2.7,2.8,3.8,.6,"#c2c4c2"));
  }
  return grp("service-cover",out);
}

function fairingHardware(radiusAt) {
  const split = AZ+22, skin = shellSkin(split,Z.fair,radiusAt);
  const end = Z.tip-Z.fair-15;
  const out = [skin.path([[-.65,12],[.5,12],[.5,end-23],[0,end],[-.65,end-23]],"#a2a49f"),
    skin.path([[.5,12],[1,12],[1,end-23],[0,end],[.5,end-23]],"#eeefeb")];
  // Flush keeper plates bridge the split, with captive screws in each fairing half.
  for (const z of [Z.fair+34,Z.ogive-38,Z.ogive+37,Z.ogive+105]) {
    const {panel,disc} = shellSkin(split,z,radiusAt);
    out.push(panel(-6,-3.4,12,6.8,1.65,"#9a9d98"),panel(-5.5,-2.9,11,5.8,1.2,"url(#gCover)"),
      panel(-2.7,-1.3,5.4,2.6,.6,"#737777"),panel(-2,-.65,3.5,1.5,.3,"#d6d5ce"),
      disc(-4.35,0,.61,"#747676"),disc(4.35,0,.61,"#747676"));
  }
  // Two banks of recessed pressure-equalisation slots near the fairing shoulder.
  for (const deg of [AZ-25,AZ+56]) {
    const {panel} = shellSkin(deg,Z.ogive-26,radiusAt);
    out.push(panel(-10,-6.4,20,12.8,2,"#bcbeb9"),panel(-9.4,-5.8,18.8,11.6,1.5,"#d4d5d1"));
    for (const v of [-3,0,3]) out.push(panel(-7,v-.6,14,1.25,.6,"#767a7b"),
      panel(-7,v+.52,14,.45,.22,"#ededdf"));
  }
  return grp("fairing-hardware",out);
}

function rocket() {
  const out = [];
  const ao = [], aoUpper = [];
  const fillOf = (svgPaths) => svgPaths.fill;

  // aft skirt (sooty) with heat-shield lip and bolt row
  const skirt = G.solidOf([[SKIRT_BOT, RF], [Z.skirt, R]], UP, P);
  const skirtSlope = -(RF - R) / (Z.skirt - SKIRT_BOT);
  const skirtR = z => RF + skirtSlope*(z-SKIRT_BOT);
  const belt = SKIRT_BOT+5;
  const panels = k.fadedSvg(G.ribsOf(UP,belt,Z.skirt,skirtR(belt),20,P,{r1:R,fade:[.08,.8],seams:true}),{tone:"lo"});
  const fasteners = bolts(G.dotsOf(UP,belt-2,skirtR(belt-2),60,P,{fade:[.2,.7]}),.65);
  out.push(part(grp("fig-dark", R3(skirt, "gDark", { inner: panels+fasteners, edge: 0.5 })),
    audit?.solid(UP,[[SKIRT_BOT,RF],[Z.skirt,R]],{name:"rocket.skirt",ground:true})));

  // booster barrel, its contact shadows, the printed name
  const barrel = G.disc(Z.skirt, Z.inter, R, UP, P);
  const ribs = G.ribsOf(UP, Z.skirt, Z.inter, R, 48, P, { fade: [0.25, 0.8], phase: 0.02 });
  out.push(defsSvg(`<clipPath id="cBooster"><path d="${barrel.fill}"/></clipPath>`));
  out.push(grp("fig-white", R3(barrel, "gWhite", { inner: k.fadedSvg(ribs, { tone: "faint" }) + L(bodySeams(Z.skirt, Z.inter, R, 140), { tone: "lo" }) })));
  const aoSlot = out.length; out.push("");
  out.push(serviceCover(AZ+4,902),serviceCover(AZ+8,1600,true));
  const nameAt = at([0, 0, 1240]);
  out.push(`<text class="fig-name" transform="translate(${r1(nameAt[0])} ${r1(nameAt[1])}) rotate(-90) scale(0.866 1)" text-anchor="middle" dominant-baseline="central" font-family="Inter Tight, Helvetica Neue, Arial, sans-serif" font-weight="800" font-size="56" letter-spacing="-2" fill="#1E1F22">[YOUR NAME]<tspan fill="#F26A21">.</tspan></text>`);
  out.push(`<text transform="translate(${r1(nameAt[0] + 33)} ${r1(nameAt[1] + 30)}) rotate(-90) scale(0.866 1)" text-anchor="middle" dominant-baseline="central" font-family="JetBrains Mono, ui-monospace, monospace" font-size="5.2" letter-spacing="0.6" fill="#55575C">STAGE 1 · PORTFOLIO VEHICLE · HANDLE WITH CURIOSITY</text>`);

  // pressurisation line with brackets
  const lineDeg = AZ - 34;
  const lineRoute = [onBody(lineDeg, R + 4.2, 0, 560), onBody(lineDeg, R + 4.2, 0, 1760)];
  const linePieces = tubePieces(lineRoute, 1.8, P, { maxLength: 400 });
  linePieces.forEach((p) => ao.push(p.body));
  out.push(grp("fig-white", linePieces.map((p) => tubeSvg(p, { tone: "hi" })).join("")));
  for (let z = 600; z < 1760; z += 160) {
    const b = G.prismOf(radial(lineDeg, z), [[-4, -2], [4, -2], [4, 2], [-4, 2]], R, R + 6.5, P);
    ao.push(b.fill); out.push(grp("fig-white", S(b, { tone: "hi", crease: "lo" })));
  }

  // raceway with clamp bands
  const rwDeg = AZ + 44;
  const rw = G.prismOf(radial(rwDeg, 1080), [[-5, -730], [5, -730], [5, 730], [-5, 730]], R - 0.5, R + 5, P);
  ao.push(rw.fill); out.push(grp("fig-white", S(rw, { tone: "hi", crease: "lo" })));
  for (let z = 420; z < 1800; z += 120) {
    const b = G.prismOf(radial(rwDeg, z), [[-6.5, -2], [6.5, -2], [6.5, 2], [-6.5, 2]], R - 0.5, R + 6.2, P);
    ao.push(b.fill); out.push(grp("fig-white", S(b, { tone: "hi", crease: "lo" })));
  }

  // landing legs, stowed (only those facing the viewer)
  for (const deg of [45, 135, 225, 315]) {
    if (facing(deg) < 0.12) continue;
    const zc = 560, half = 230;
    const legF = radial(deg, zc);
    const legP = G.prismOf(legF, [[-10, -half], [10, -half], [6.5, half], [-6.5, half]], R - 0.5, R + 7, P);
    const hingeP = G.prismOf(radial(deg, zc - half - 6), [[-12, -8], [12, -8], [12, 8], [-12, 8]], R - 0.5, R + 9, P);
    const tipP = G.prismOf(radial(deg, zc + half + 8), [[-7, -8], [7, -8], [7, 8], [-7, 8]], R - 0.5, R + 8, P);
    ao.push(legP.fill, hingeP.fill, tipP.fill);
    const spine = L(seg(onBody(deg, R + 7, 0, zc - half + 10), onBody(deg, R + 7, 0, zc + half - 10)), { tone: "lo" });
    const ribs2 = [];
    for (let z = zc - half + 40; z < zc + half - 20; z += 46) {
      const w = 10 - (3.5 * (z - (zc - half))) / (2 * half);
      ribs2.push(seg(onBody(deg, R + 7, -w + 1, z), onBody(deg, R + 7, w - 1, z)));
    }
    const pin = S(G.sphereOf(onBody(deg, R + 9, 0, zc - half - 6), 2.6, P), { tone: "hi" });
    out.push(grp("fig-dark", [S(hingeP, { tone: "hi", crease: "lo" }), pin, S(legP, { tone: "hi", crease: "lo" }), L(ribs2.join(""), { tone: "faint" }), spine, S(tipP, { tone: "hi", crease: "lo" })]));
  }

  // grid fins, stowed, just under the interstage
  for (const deg of [0, 90, 180, 270]) {
    if (facing(deg) < 0.12) continue;
    const zc = Z.finTop - 30, hw = 21, hh = 28, t0 = R - 0.5, t1 = R + 5;
    const F = radial(deg, zc);
    const frameP = G.prismOf(F, [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]], t0, t1, P);
    const actP = G.prismOf(radial(deg, zc + hh + 7), [[-5, -6], [5, -6], [5, 6], [-5, 6]], R - 0.5, R + 7, P);
    ao.push(frameP.fill, actP.fill);
    const cells = [];
    for (let u = -hw + 5.66; u < hw - 1; u += 5.66) cells.push(seg(onBody(deg, t1, u, zc - hh + 1.5), onBody(deg, t1, u, zc + hh - 1.5)));
    for (let v = -hh + 6; v < hh - 1; v += 6) cells.push(seg(onBody(deg, t1, -hw + 1.5, zc + v), onBody(deg, t1, hw - 1.5, zc + v)));
    out.push(grp("fig-dark", [S(frameP, { tone: "hi", crease: "lo" }), L(cells.join(""), { tone: "mid" }), S(actP, { tone: "hi", crease: "lo" })]));
  }
  // soft contact shadows on the booster: under every attachment and under the interstage lip
  out[aoSlot] = `<g clip-path="url(#cBooster)"><g filter="url(#fAO)" fill="rgba(28,26,24,0.30)" transform="translate(2.8 1.4)">${ao.map((d) => `<path d="${d}"/>`).join("")}</g><path d="${G.arcOf(UP, Z.inter - 4, R, P, { least: -1 })}" fill="none" stroke="rgba(28,26,24,0.32)" stroke-width="9" filter="url(#fAO)"/></g>`;
  out.push(bolts(G.dotsOf(UP, Z.inter - 10, R, 40, P, { fade: [0.04, 0.42] })));
  out.push(bolts(G.dotsOf(UP, Z.skirt + 12, R, 40, P, { fade: [0.04, 0.42] })));

  // interstage (dark) with bolt rows, then the separation ring
  out.push(grp("fig-dark interstage-shell", R3(G.disc(Z.inter, Z.upper - 4, R, UP, P), "gDark", {
    inner: L(G.arcOf(UP, Z.inter + 40, R, P) + G.arcOf(UP, Z.inter + 96, R, P), { tone: "lo" }), edge: 0.5,
  }) + D(G.dotsOf(UP, Z.inter + 8, R, 64, P, { fade: [0.04, 0.42] }), { size: 0.45, tone: "mid" }) + D(G.dotsOf(UP, Z.upper - 12, R, 64, P, { fade: [0.04, 0.42] }), { size: 0.45, tone: "mid" })));
  const interfacePanels = [];
  for (const deg of [AZ-33,AZ+24]) {
    const {panel,disc} = shellSkin(deg,Z.inter+68,()=>R);
    interfacePanels.push(panel(-13,-19,26,38,3,"#26292d"),panel(-12.3,-18.3,24.6,36.6,2.5,"url(#gGraphite)"));
    for (const u of [-9.5,9.5]) for (const v of [-15.2,15.2]) interfacePanels.push(disc(u,v,.8,"#a5a7a5"));
    interfacePanels.push(disc(0,2,6.4,"#303338"),disc(0,2,5.5,"url(#gNozzle)"),disc(0,2,3.9,"#34373b"),
      panel(-2.1,1.5,4.2,1,.4,"#aaa99f"));
  }
  out.push(grp("interface-panels",interfacePanels));
  out.push(grp("fig-orange", R3(G.disc(Z.upper - 4, Z.upper, R + 1.4, UP, P), "gOrange", { edge: 0.4 })));

  // upper stage: tank domes shown as weld rings, a short raceway
  const upper = G.disc(Z.upper, Z.boat, R, UP, P);
  out.push(`<defs><clipPath id="cUpper"><path d="${upper.fill}"/></clipPath></defs>`);
  out.push(grp("fig-white", R3(upper, "gWhite", { inner: L([Z.upper + 22, Z.upper + 150, Z.upper + 162, Z.boat - 14].map((s) => G.arcOf(UP, s, R, P)).join(""), { tone: "lo" }) })));
  const urw = G.prismOf(radial(rwDeg, (Z.upper + Z.boat) / 2), [[-4.5, -170], [4.5, -170], [4.5, 170], [-4.5, 170]], R - 0.5, R + 4.5, P);
  aoUpper.push(urw.fill);
  out.push(`<g clip-path="url(#cUpper)"><g filter="url(#fAO)" fill="rgba(28,26,24,0.30)" transform="translate(2.8 1.4)">${aoUpper.map((d) => `<path d="${d}"/>`).join("")}</g><path d="${G.arcOf(UP, Z.boat - 3, R, P, { least: -1 })}" fill="none" stroke="rgba(28,26,24,0.34)" stroke-width="9" filter="url(#fAO)"/><path d="${G.arcOf(UP, Z.upper + 3, R, P, { least: -1 })}" fill="none" stroke="rgba(28,26,24,0.22)" stroke-width="6" filter="url(#fAO)"/></g>`);
  out.push(grp("fig-white", S(urw, { tone: "hi", crease: "lo" })));
  out.push(serviceCover(AZ-5,Z.upper+222,true));
  const upperStraps = [];
  for (const offset of [-125,-42,42,125]) {
    const z = (Z.upper+Z.boat)/2+offset;
    const corners = [[-4.5,-1.6],[4.5,-1.6],[4.5,1.6],[-4.5,1.6]];
    const face = corners.map(([u,v])=>at(onBody(rwDeg,R+4.5,u,z+v)));
    upperStraps.push(`<path d="${k.pathOf(face,true)}" fill="#a4a5a2"/>`,
      bolts([-3,3].map(u=>at(onBody(rwDeg,R+4.5,u,z))),.5));
  }
  out.push(grp("raceway-straps",upperStraps));
  out.push(bolts(G.dotsOf(UP, Z.upper + 156, R, 40, P, { fade: [0.04, 0.42] }), 1.05));
  out.push(bolts(G.dotsOf(UP, Z.boat - 10, R, 40, P, { fade: [0.04, 0.42] })));

  // boat-tail
  const boatSlope = (RF - R) / (Z.fair - Z.boat);
  out.push(grp("fig-white", R3(G.solidOf([[Z.boat, R], [Z.fair, RF]], UP, P), "gWhite", { inner: L(G.arcOf(UP, Z.fair - 3, RF - 0.4, P, { slope: boatSlope }), { tone: "faint" }) })));

  // fairing: frosted shell with the payload glowing through it
  const LN = Z.tip - Z.ogive, rho = (RF * RF + LN * LN) / (2 * RF);
  const ogR = (s) => Math.max(0, Math.sqrt(Math.max(0, rho * rho - (LN - s) ** 2)) + RF - rho);
  const ogSlope = (s) => (LN - s) / Math.sqrt(Math.max(1e-6, rho * rho - (LN - s) ** 2));
  const NF = G.frameOf([0, 0, Z.tip], [0, 0, -1], [1, 0, 0], [0, -1, 0]);
  const knots = [];
  for (let i = 0; i <= 28; i++) { const s = (LN * i) / 28; knots.push(i > 0 && i < 28 ? [s, ogR(s), 1] : [s, ogR(s)]); }
  const cyl = G.disc(Z.fair, Z.ogive, RF, UP, P, { rims: "first" });
  const nose = G.solidOf(knots, NF, P, { smooth: { slope: ogSlope, radius: ogR }, rims: "first" });
  out.push(`<path d="${cyl.fill}" fill="#D9D7D2"/><path d="${nose.fill}" fill="#D9D7D2"/>`);
  const pay = [];
  pay.push(S(G.solidOf([[Z.fair + 2, 40], [Z.fair + 22, 24]], UP, P), { tone: "hi" }));
  const bus = { x: -25, y: -25, w: 50, d: 50, r: 2 };
  pay.push(S(k.slabOf(bus, Z.fair + 22, 120, P, 3, 0.6), { tone: "hi" }));
  pay.push(S(k.slabOf({ x: -28, y: -10, w: 3, d: 20, r: 0.5 }, Z.fair + 30, 104, P, 2), { tone: "hi" }));
  pay.push(S(k.slabOf({ x: 25, y: -10, w: 3, d: 20, r: 0.5 }, Z.fair + 30, 104, P, 2), { tone: "hi" }));
  pay.push(S(k.cylinder(0, 0, 12, Z.fair + 142, 26, P, 24), { tone: "hi" }));
  const core = at([0, 0, Z.fair + 150]);
  out.push(`<g filter="url(#fBlur)">${grp("fig-dark", pay)}<ellipse cx="${r1(core[0])}" cy="${r1(core[1])}" rx="30" ry="40" fill="url(#gGlow)"/><ellipse cx="${r1(core[0])}" cy="${r1(core[1] + 4)}" rx="8" ry="11" fill="#FFF1E2"/></g>`);
  const shell = [];
  shell.push(grp("fig-white", R3(cyl, "gWhite", {
    inner: L(G.arcOf(UP, Z.fair + 12, RF, P), { tone: "lo" }),
  })));
  shell.push(grp("fig-white", R3(nose, "gWhite", {
    inner: L([.19,.55].map(t=>G.arcOf(NF,LN*t,ogR(LN*t),P,{slope:ogSlope(LN*t)})).join(""),{tone:"faint"}),
  })));
  out.push(`<g class="fairing-shell" opacity="0.72">${shell.join("")}</g>`);
  out.push(`<ellipse cx="${r1(core[0])}" cy="${r1(core[1])}" rx="46" ry="64" fill="url(#gGlow)" opacity="0.32" filter="url(#fSoft)"/>`);
  out.push(fairingHardware(z => z <= Z.ogive ? RF : ogR(Z.tip-z)));
  out.push(bolts(G.dotsOf(UP, Z.fair + 6, RF, 36, P, { fade: [0.04, 0.42] }), 1.3));
  return out.join("");
}

// ---------- assemble ----------
const sortBy = (list) => [...list].sort((a, b) => a.key - b.key).map((x) => x.svg);
const clampItems = CLAMPS.map((d) => ({ d, key: depth(onBody(d, RF + 4, 0, 250)) }));
const rearClamps = clampItems.filter((c) => facing(c.d) <= 0.1);
const frontClamps = clampItems.filter((c) => facing(c.d) > 0.1);
const bells = ENGINES.map((p) => ({ key: depth([p[0], p[1], 250]), svg: bell(p) }));

const back = [
  pad(),
  tower(),
  pipes(),
  qdArm(),
  carriage(),
  chopstick(-1),
  ...legsAt.filter(({ a }) => facing(a) <= 0).map(mountPier),
];
// This stationary layer sits above the fire canvas, so the artwork itself occludes the plume.
const mount = [
  ...legsAt.filter(({ a }) => facing(a) > 0).map(mountPier),
  mountDeck(),
  ...sortBy(rearClamps.map((c) => ({ key: c.key, svg: clamp(c.d) }))),
];
const front = [
  ...sortBy(bells),
  rocket(),
  ...sortBy(frontClamps.map((c) => ({ key: c.key, svg: clamp(c.d) }))),
  chopstick(1),
];

if (audit) {
  console.log("Static tower crown, nozzle cluster, hold-downs and launch mount");
  audit.settle(hardware,P);
  const painted = [...back,...mount,...front].join("");
  for (const item of hardware.items) {
    item.key = painted.indexOf(item.svg);
    if (item.key < 0) throw new Error(`Missing SVG for ${item.name}`);
  }
  audit.auditOrExit(hardware,P);
}

const svg = (body, label) => k.figureSvg({ width: W, height: H, label, body });
writeFileSync(join(HERE, "fig-back.svg"), svg(back, "Launch pad, tower and rear supports."));
writeFileSync(join(HERE, "fig-mount.svg"), svg(mount, "Front piers, launch table and rear hold-down clamps."));
writeFileSync(join(HERE, "fig-beacon-light.svg"), mastBeaconLight());
const crew = crewLayer();
writeFileSync(join(HERE, "fig-crew.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crew.crop.join(" ")}">${crew.body}</svg>`);
writeFileSync(join(HERE, "fig-front.svg"), svg(front, "A two-stage rocket standing on the mount, nine engines under its skirt."));

const pct = ([x, y]) => [+(x / W * 100).toFixed(3), +(y / H * 100).toFixed(3)];
const meta = {
  W, H,
  bellExit: pct(at([0, 0, SKIRT_BOT - BELL_LEN])),
  ringBottom: pct(at([0, 0, MOUNT.legTop])),
  ground: pct(at([0, 0, 0])),
  trenchEnd: pct(at([96, 0, 0])),
  beacon: pct(at(beaconSeat)),
  noseTip: pct(at([0, 0, Z.tip])),
  crew: { crop: crew.crop, at: pct(crew.crop), width: +(crew.crop[2] / W * 100).toFixed(3) },
  rocketR: +(R / W * 100).toFixed(3),
  engines: ENGINES.map(([x, y]) => pct(at([x, y, SKIRT_BOT - BELL_LEN]))),
};
// ---------- particle-layer geometry (viewBox units) ----------
const scr = (p) => at(p).map(r1);
const circle = (r, z, n = 48) => Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * Math.PI * 2), r * Math.sin((i / n) * Math.PI * 2), z]);
const fx = {
  engines: ENGINES.map(([x, y]) => scr([x, y, SKIRT_BOT - BELL_LEN])),
  exitR: r1(bellR(BELL_LEN)),
  ground: scr([0, 0, 0]),
  trenchEnd: scr([96, 0, 0]),
  trenchDir: (() => { const a = at([0, 0, 0]), b = at([1, 0, 0]); const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [+((b[0] - a[0]) / l).toFixed(4), +((b[1] - a[1]) / l).toFixed(4)]; })(),
  ringTop: circle(MOUNT.rOut, MOUNT.ringTop).map(scr).filter(([,y]) => y < at([0,0,MOUNT.ringTop])[1]),
  base: circle(118, 0, 24).map(scr),
};
meta.fx = fx;
{ const n = at([0, 0, 1240]); meta.name = { at: pct(n), sub: pct([n[0] + 33, n[1] + 30]), size: 56, subSize: 5.2 }; }
writeFileSync(join(HERE, "fig.json"), JSON.stringify(meta, null, 1));
console.log("wrote", W, "x", H, "back", (back.join("").length / 1024).toFixed(0) + "KB", "front", (front.join("").length / 1024).toFixed(0) + "KB");
