// Carved stone for Marea Dvīpa's candi bentar, baked off the main thread (see carving.worker.ts): each surface is
// drawn as a height field, then turned into a colour map and a normal map. Nothing here touches the DOM or three.js,
// so it runs the same in a worker.
type Ctx = OffscreenCanvasRenderingContext2D;
type Draw = (g: Ctx, w: number, h: number) => void;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export type Baked = { W: number; H: number; col: Uint8Array; nor: Uint8Array };
export type GateStone = Record<"wall" | "plain" | "frieze" | "panel" | "frame", Baked>;

// ---- carved stone: drawn as a height field, then turned into a colour map and a normal map ----
/** a soft random field, tiling, for where moss and weathering gather */
function softNoise(W: number, H: number, cells: number) {
  const cx = cells, cy = Math.max(1, Math.round((cells * H) / W)), grid = Array.from({ length: cx * cy }, () => rnd());
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = (x / W) * cx, v = (y / H) * cy, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
      const at = (a: number, b: number) => grid[((b + cy) % cy) * cx + ((a + cx) % cx)];
      const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
      out[y * W + x] = (at(i, j) * (1 - su) + at(i + 1, j) * su) * (1 - sv) + (at(i, j + 1) * (1 - su) + at(i + 1, j + 1) * su) * sv;
    }
  return out;
}
/** a box blur that wraps at the edges, so a tiling texture stays seamless */
function blurWrap(src: Float32Array, W: number, H: number, r: number): Float32Array {
  if (r < 1) return src;
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H), n = r * 2 + 1;
  for (let y = 0; y < H; y++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[y * W + ((i + W) % W)];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = sum / n;
      sum += src[y * W + ((x + r + 1) % W)] - src[y * W + ((x - r + W) % W)];
    }
  }
  for (let x = 0; x < W; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += tmp[((i + H) % H) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = sum / n;
      sum += tmp[((y + r + 1) % H) * W + x] - tmp[((y - r + H) % H) * W + x];
    }
  }
  return out;
}
/**
 * Stone carved in relief. draw() paints heights in grey (white stands proud, black is cut deep); from that come a
 * normal map, so every curl catches the sun, and a colour map in which the hollows hold dirt and moss and the raised
 * edges are worn pale, the way old carving looks in a Balinese temple court.
 */
function carving(W: number, H: number, draw: Draw, o: { base: [number, number, number]; moss?: number; depth?: number; stain?: number }) {
  const g = new OffscreenCanvas(W, H).getContext("2d")!;
  g.lineCap = g.lineJoin = "round";
  draw(g, W, H);
  const px = g.getImageData(0, 0, W, H).data;
  let h: Float32Array = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) h[k] = px[k * 4] / 255;
  const soft = Math.max(1, Math.round(W / 512));
  h = blurWrap(blurWrap(h, W, H, soft), W, H, soft); // round off the chisel edges
  const wr = Math.round(W / 70), wide = blurWrap(blurWrap(h, W, H, wr), W, H, wr);
  const moss = softNoise(W, H, 6), grime = softNoise(W, H, 22), patch = softNoise(W, H, 4);
  // rain runs off every ledge and leaves black mould in vertical streaks, as on Lempuyang's pale paras
  const runs = new Float32Array(W);
  for (let x = 0; x < W; x++) runs[x] = rnd();
  const sr = Math.max(2, Math.round(W / 160)), streak = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let a = 0;
    for (let i = -sr; i <= sr; i++) a += runs[(x + i + W) % W];
    streak[x] = a / (sr * 2 + 1);
  }
  const st = o.stain ?? 0;
  const col = new Uint8Array(W * H * 4), nor = new Uint8Array(W * H * 4);
  const s = 9 * (W / 1024) * (o.depth ?? 1), [br, bg, bb] = o.base, mo = o.moss ?? 0.6;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = y * W + x, o4 = ((H - 1 - y) * W + x) * 4, l = y * W + ((x - 1 + W) % W), r = y * W + ((x + 1) % W), u = ((y - 1 + H) % H) * W + x, d = ((y + 1) % H) * W + x;
      // canvas rows run down the texture, so the up slope is the downward difference
      let nx = -(h[r] - h[l]) * 0.5 * s, ny = (h[d] - h[u]) * 0.5 * s;
      const nl = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      nx *= nl;
      ny *= nl;
      nor[o4] = (nx * 0.5 + 0.5) * 255;
      nor[o4 + 1] = (ny * 0.5 + 0.5) * 255;
      nor[o4 + 2] = (nl * 0.5 + 0.5) * 255;
      nor[o4 + 3] = 255;
      const cav = Math.min(1, Math.max(0, (wide[k] - h[k]) * 5)), ridge = Math.min(1, Math.max(0, (h[k] - wide[k]) * 5));
      const shade = (0.66 + 0.4 * h[k]) * (1 - 0.45 * cav) * (1 + 0.3 * ridge) * (0.9 + 0.2 * rnd()) * (0.86 + 0.28 * grime[k]);
      let R = br * shade, G = bg * shade, B = bb * shade;
      const m = Math.min(1, cav * 1.6 + (1 - h[k]) * 0.35) * Math.max(0, moss[k] * 1.6 - 0.45) * mo;
      R += (62 - R) * m;
      G += (78 - G) * m;
      B += (44 - B) * m;
      if (st) {
        // black mould: deep in every cut, in streaks below the ledges, and in broad patches where the stone stays damp
        const run = Math.max(0, (streak[x] - 0.47) * 9) * (0.45 + 0.55 * grime[k]);
        const blk = Math.min(1, st * (cav * 1.15 + run * 0.55 + Math.max(0, patch[k] - 0.45) * 0.9 + (1 - h[k]) * 0.25));
        R += (58 - R) * blk;
        G += (56 - G) * blk;
        B += (52 - B) * blk;
      }
      col[o4] = Math.min(255, R);
      col[o4 + 1] = Math.min(255, G);
      col[o4 + 2] = Math.min(255, B);
      col[o4 + 3] = 255;
    }
  return { W, H, col, nor };
}
const grey = (v: number) => `rgb(${(v * 255) | 0},${(v * 255) | 0},${(v * 255) | 0})`;
/** a tendril curling in on itself, from (sx, sy) round the centre (cx, cy), thinning as it goes */
function curl(g: Ctx, sx: number, sy: number, cx: number, cy: number, dir: number, lw: number, v = 0.86) {
  const r0 = Math.hypot(sx - cx, sy - cy), a0 = Math.atan2(sy - cy, sx - cx);
  g.strokeStyle = grey(v);
  let px = sx, py = sy;
  for (let i = 1; i <= 48; i++) {
    const t = i / 48, rr = r0 * (1 - 0.8 * t), a = a0 + dir * t * Math.PI * 2.1, qx = cx + Math.cos(a) * rr, qy = cy + Math.sin(a) * rr;
    g.lineWidth = lw * (1 - 0.55 * t);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(qx, qy);
    g.stroke();
    px = qx;
    py = qy;
  }
  g.fillStyle = grey(v + 0.06);
  g.beginPath();
  g.arc(px, py, lw * 0.4, 0, Math.PI * 2);
  g.fill();
}
/** a leaf blade with a raised midrib: base at (x, y), pointing along angle a */
function blade(g: Ctx, x: number, y: number, len: number, wid: number, a: number, v = 0.8) {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.fillStyle = grey(v);
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(len * 0.3, -wid, len * 0.75, -wid * 0.7, len, 0);
  g.bezierCurveTo(len * 0.75, wid * 0.5, len * 0.3, wid * 0.8, 0, 0);
  g.fill();
  g.strokeStyle = grey(v + 0.1);
  g.lineWidth = wid * 0.22;
  g.beginPath();
  g.moveTo(len * 0.08, 0);
  g.quadraticCurveTo(len * 0.5, -wid * 0.15, len * 0.9, 0);
  g.stroke();
  g.restore();
}
/** a rosette: petals round a domed heart */
function rosette(g: Ctx, x: number, y: number, r: number, n = 8, v = 0.8) {
  for (let i = 0; i < n; i++) blade(g, x, y, r, r * 0.42, (i / n) * Math.PI * 2, v);
  const grd = g.createRadialGradient(x - r * 0.1, y - r * 0.1, 0, x, y, r * 0.38);
  grd.addColorStop(0, grey(1));
  grd.addColorStop(1, grey(0.7));
  g.fillStyle = grd;
  g.beginPath();
  g.arc(x, y, r * 0.38, 0, Math.PI * 2);
  g.fill();
}
/** patra: the leaf-and-tendril scroll that covers Balinese stonework, drawn in a box from -1 to 1 each way */
function patra(g: Ctx, kind: number) {
  g.strokeStyle = grey(0.84);
  g.lineWidth = 0.13;
  g.beginPath();
  g.moveTo(-0.62, 0.5);
  g.bezierCurveTo(-0.15, 0.62, 0.15, -0.62, 0.62, -0.5);
  g.stroke();
  curl(g, -0.62, 0.5, -0.42, 0.18, -1, 0.13);
  curl(g, 0.62, -0.5, 0.42, -0.18, -1, 0.13);
  blade(g, -0.14, 0.16, 0.62, 0.2, -2.3);
  blade(g, 0.14, -0.16, 0.62, 0.2, 0.84);
  blade(g, -0.3, 0.42, 0.45, 0.15, 1.9);
  blade(g, 0.3, -0.42, 0.45, 0.15, -1.25);
  curl(g, -0.05, -0.38, -0.3, -0.5, 1, 0.08, 0.8);
  curl(g, 0.05, 0.38, 0.3, 0.5, 1, 0.08, 0.8);
  if (kind % 2) rosette(g, 0, 0, 0.24, 7, 0.82);
  else {
    blade(g, 0, 0, 0.3, 0.12, -0.6, 0.78);
    blade(g, 0, 0, 0.3, 0.12, 2.5, 0.78);
  }
}
/** the body's stone: blocks laid in running bond, a metre a tile, every face carved with a framed patra panel. With
 *  carved false the same blocks lie plain, for the sheer faces of the cut. */
const wallDraw = (carved: boolean): Draw => (g, W, H) => {
  g.fillStyle = grey(0.12);
  g.fillRect(0, 0, W, H);
  const bw = W / 2, bh = H / 2, j = W * 0.007;
  let n = 0;
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 3; col++) {
      const x0 = col * bw - (row ? bw / 2 : 0), y0 = row * bh, v = 0.64 + rnd() * 0.08, mx = rnd() > 0.5 ? 1 : -1, my = rnd() > 0.5 ? 1 : -1, kind = n++;
      for (const ox of [0, W]) {
        const x = x0 + ox;
        if (x > W || x + bw < 0) continue;
        g.fillStyle = grey(v);
        g.fillRect(x + j, y0 + j, bw - 2 * j, bh - 2 * j);
        // chipped arrises
        for (let i = 0; i < 5; i++) {
          g.fillStyle = grey(0.3);
          g.beginPath();
          g.ellipse(x + j + (rnd() > 0.5 ? 0 : bw - 2 * j) , y0 + j + rnd() * bh, 3 + rnd() * 8, 2 + rnd() * 6, rnd() * 3, 0, Math.PI * 2);
          g.fill();
        }
        // every block is dressed with a drafted margin round its face; only every other course is carved through
        g.fillStyle = grey(v - 0.06);
        g.fillRect(x + j * 4, y0 + j * 4, bw - 8 * j, bh - 8 * j);
        g.fillStyle = grey(v + 0.02);
        g.fillRect(x + j * 6, y0 + j * 6, bw - 12 * j, bh - 12 * j);
        if (!carved || row === 1) continue;
        g.save();
        g.translate(x + bw / 2, y0 + bh / 2);
        g.scale((bw / 2) * 0.96 * mx, (bh / 2) * 0.96 * my);
        g.fillStyle = grey(0.5); // a sunk margin, then the field cut back deep
        g.fillRect(-0.88, -0.88, 1.76, 1.76);
        g.fillStyle = grey(0.24);
        g.fillRect(-0.8, -0.8, 1.6, 1.6);
        if (kind % 3 === 2) g.rotate(Math.PI / 2);
        patra(g, kind);
        g.restore();
      }
    }
};
/** a cornice band, 0.4 m of it to a tile, the band's full height: a lip, a string of beads, a running wave of scrolls
 *  and a fringe of lotus petals hanging below */
const friezeDraw: Draw = (g, W, H) => {
  g.fillStyle = grey(0.26);
  g.fillRect(0, 0, W, H);
  g.fillStyle = grey(0.78);
  g.fillRect(0, 0, W, H * 0.11);
  g.fillStyle = grey(0.18);
  g.fillRect(0, H * 0.11, W, H * 0.02);
  for (let i = 0; i < 12; i++) {
    const x = (i + 0.5) * (W / 12), y = H * 0.2, r = H * 0.055, grd = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    grd.addColorStop(0, grey(0.95));
    grd.addColorStop(1, grey(0.55));
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2);
    g.fill();
  }
  // the wave: each scroll rolls into the next
  const cy = H * 0.47, R = H * 0.13;
  for (let i = -1; i < 5; i++) {
    const cx = (i + 0.5) * (W / 4);
    g.strokeStyle = grey(0.84);
    g.lineWidth = H * 0.05;
    g.beginPath();
    g.moveTo(cx - W / 8, cy + R);
    g.bezierCurveTo(cx - W / 16, cy + R * 1.1, cx + W / 16, cy - R * 1.3, cx + W / 8, cy - R * 0.2);
    g.stroke();
    curl(g, cx + W / 8, cy - R * 0.2, cx + W / 8 - R * 0.15, cy + R * 0.35, 1, H * 0.05);
    blade(g, cx, cy, R * 1.3, R * 0.4, -2.4, 0.78);
    blade(g, cx, cy + R * 0.2, R * 1.1, R * 0.35, 0.6, 0.74);
  }
  g.fillStyle = grey(0.7);
  g.fillRect(0, H * 0.66, W, H * 0.04);
  // lotus petals, point down, each with a raised rim and a hollowed heart
  for (let i = 0; i < 9; i++) {
    const x = (i + 0.5) * (W / 9) - W / 18, pw = W / 18;
    for (const ox of [0, W]) {
      [[1, 0.8], [0.72, 0.48], [0.42, 0.74]].forEach(([k, v]) => {
        g.fillStyle = grey(v);
        g.beginPath();
        g.moveTo(x + ox - pw * k, H * 0.7);
        g.bezierCurveTo(x + ox - pw * k, H * (0.7 + 0.2 * k), x + ox - pw * 0.2 * k, H * (0.78 + 0.2 * k), x + ox, H * (0.74 + 0.25 * k));
        g.bezierCurveTo(x + ox + pw * 0.2 * k, H * (0.78 + 0.2 * k), x + ox + pw * k, H * (0.7 + 0.2 * k), x + ox + pw * k, H * 0.7);
        g.fill();
      });
    }
  }
};
/** a pale paras panel set into the dark stone: a moulded frame, and in the field a lotus medallion in a ring of
 *  petals with patra spreading to the four corners */
const panelDraw: Draw = (g, W, H) => {
  g.fillStyle = grey(0.72);
  g.fillRect(0, 0, W, H);
  g.fillStyle = grey(0.55);
  g.fillRect(W * 0.05, H * 0.035, W * 0.9, H * 0.93);
  g.fillStyle = grey(0.82);
  g.fillRect(W * 0.08, H * 0.055, W * 0.84, H * 0.89);
  g.fillStyle = grey(0.26);
  g.fillRect(W * 0.13, H * 0.09, W * 0.74, H * 0.82);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    g.save();
    g.translate(W / 2 + sx * W * 0.2, H / 2 + sy * H * 0.25);
    g.scale(sx * W * 0.17, sy * H * 0.16);
    patra(g, 0);
    g.restore();
  });
  g.save();
  g.translate(W / 2, H / 2);
  g.scale(1, 1.35);
  g.fillStyle = grey(0.62);
  g.beginPath();
  g.arc(0, 0, W * 0.25, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = grey(0.3);
  g.beginPath();
  g.arc(0, 0, W * 0.21, 0, Math.PI * 2);
  g.fill();
  rosette(g, 0, 0, W * 0.19, 12, 0.82);
  rosette(g, 0, 0, W * 0.09, 8, 0.9);
  g.restore();
};

/** the body's great panel, after Tampak A: a stepped moulded frame round a deep field, and in it one tendril that
 *  rises from a big C-spiral at the foot and opens into leaves at the head */
const frameDraw: Draw = (g, W, H) => {
  g.fillStyle = grey(0.62);
  g.fillRect(0, 0, W, H);
  const frame = (inset: number, v: number, notch: number) => {
    const x0 = W * inset, x1 = W - W * inset, y0 = H * inset * 0.75, y1 = H - H * inset * 0.75, n = W * notch;
    g.fillStyle = grey(v);
    g.beginPath();
    g.moveTo(x0, y1);
    g.lineTo(x0, y0 + n);
    g.lineTo(x0 + n, y0 + n);
    g.lineTo(x0 + n, y0);
    g.lineTo(x1 - n, y0);
    g.lineTo(x1 - n, y0 + n);
    g.lineTo(x1, y0 + n);
    g.lineTo(x1, y1);
    g.closePath();
    g.fill();
  };
  frame(0.04, 0.86, 0.1);
  frame(0.09, 0.5, 0.1);
  frame(0.12, 0.78, 0.09);
  frame(0.16, 0.24, 0.08);
  g.strokeStyle = grey(0.86);
  g.lineWidth = W * 0.055;
  g.beginPath();
  g.moveTo(W * 0.62, H * 0.78);
  g.bezierCurveTo(W * 0.66, H * 0.55, W * 0.4, H * 0.42, W * 0.52, H * 0.22);
  g.stroke();
  curl(g, W * 0.62, H * 0.78, W * 0.44, H * 0.72, 1, W * 0.055);
  blade(g, W * 0.56, H * 0.5, W * 0.26, W * 0.08, -2.6, 0.82);
  blade(g, W * 0.55, H * 0.4, W * 0.24, W * 0.07, -0.5, 0.8);
  blade(g, W * 0.52, H * 0.27, W * 0.2, W * 0.06, -2.2, 0.82);
  curl(g, W * 0.52, H * 0.22, W * 0.6, H * 0.2, -1, W * 0.04);
  rosette(g, W * 0.5, H * 0.16, W * 0.06, 8, 0.85);
};

/** everything the gate is dressed in. N: the size of the main textures (1024, or 512 on a phone) */
export function bakeGateStone(N: number): GateStone {
  seed = 7;
  // pale paras gone grey-black with mould, after the Lempuyang gate: cream where the sun dries it, black in the cuts
  const paras: [number, number, number] = [172, 166, 152];
  return {
    wall: carving(N, N, wallDraw(true), { base: paras, moss: 0.45, stain: 0.85 }),
    plain: carving(N, N, wallDraw(false), { base: [178, 172, 158], moss: 0.45, depth: 0.7, stain: 0.9 }),
    frieze: carving(N, N / 2, friezeDraw, { base: [124, 120, 111], moss: 0.35, stain: 1 }), // the crowns and bands go darkest
    panel: carving(N / 2, (N / 2) * 1.5, panelDraw, { base: [184, 178, 164], moss: 0.25, stain: 0.55 }),
    frame: carving(N / 2, (N / 2) * 1.5, frameDraw, { base: paras, moss: 0.35, stain: 0.8 }),
  };
}
