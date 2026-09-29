/* ---------- the tensor option-layer method ---------- */
// The whole puzzle is one N×N×N true/false tensor X[row][column][number] (true = still possible).
// It is kept in four views at once, each a line of the cube packed into one 32-bit word:
//   cell view   cv[i]          — the numbers still possible in cell i        (a pillar)
//   row view    rv[r·N + d]    — the columns where number d can go in row r
//   column view kv[c·N + d]    — the rows where number d can go in column c
//   box view    bv[b·N + d]    — the places in box b where number d can go
// Every rule of Sudoku says "exactly one true on each of these lines".
// Layers can be cut from the cube in four directions: a number (all its places), a row, a column or a box
// (all orders of its missing numbers). The thinnest layer in any allowed direction is built next.
let TG = null, TR = null;                            // TR: the step recorder (null when timing)
const DIRS = ["number", "row", "column", "box"];
function tensorSetup() {
  const NN = N * N, R = new Int16Array(NN), C = new Int16Array(NN), B = new Int16Array(NN), P = new Int16Array(NN);
  const unit = [[], [], [], []];                     // unit[1][r], unit[2][c], unit[3][b]: the cells of that row / column / box
  for (let k = 1; k <= 3; k++) for (let u = 0; u < N; u++) unit[k].push([]);
  for (let i = 0; i < NN; i++) { R[i] = (i / N) | 0; C[i] = i % N; B[i] = boxOf(R[i], C[i]); P[i] = unit[3][B[i]].length; unit[1][R[i]].push(i); unit[2][C[i]].push(i); unit[3][B[i]].push(i); }
  const peers = []; for (let i = 0; i < NN; i++) { const s = []; for (let j = 0; j < NN; j++) if (j !== i && (R[j] === R[i] || C[j] === C[i] || B[j] === B[i])) s.push(j); peers.push(Int16Array.from(s)); }
  const LG = new Float64Array(33); LG[0] = -1; for (let k = 1; k <= 32; k++) LG[k] = Math.log(k);
  TG = { N, NN, R, C, B, P, unit, peers, LG, cnt: new Int32Array(NN * N), UC: [null, unit[1].map(a => Int16Array.from(a)), unit[2].map(a => Int16Array.from(a)), unit[3].map(a => Int16Array.from(a))] };
}
const ctz = x => 31 - Math.clz32(x & -x);

function tensorOL(p, opt = {}) {
  if (!TG || TG.N !== N) tensorSetup();
  const { NN, R, C, B, P, UC, peers, LG, cnt } = TG;
  const cap = opt.cap || 2000, startK = opt.start == null ? 2 : opt.start, dirs = opt.dirs || [1, 1, 1, 1], RETRY = Math.log(8);
  const K = 4 * N;                                   // layer key = direction·N + index
  let guesses = 0; const built = [0, 0, 0, 0];
  const blank = () => ({ g: new Int8Array(NN), cv: new Uint32Array(NN), rv: new Uint32Array(N * N), kv: new Uint32Array(N * N), bv: new Uint32Array(N * N),
    pn: new Int16Array(N), pu: new Int16Array(3 * N), left: NN, ver: 0, ch: 0, L: new Array(K).fill(null), lv: new Int32Array(K).fill(-1), st: new Uint8Array(K), bigE: new Float64Array(K) });
  const clone = S => ({ g: S.g.slice(), cv: S.cv.slice(), rv: S.rv.slice(), kv: S.kv.slice(), bv: S.bv.slice(), pn: S.pn.slice(), pu: S.pu.slice(), left: S.left, ver: S.ver, ch: 0,
    L: S.L.slice(), lv: S.lv.slice(), st: S.st.slice(), bigE: S.bigE.slice() });
  // take one point (cell i, number index z) out of the tensor: all four views change together
  function remove(S, i, z) {
    const b = 1 << z; if (!(S.cv[i] & b)) return;
    S.cv[i] &= ~b; S.rv[R[i] * N + z] &= ~(1 << C[i]); S.kv[C[i] * N + z] &= ~(1 << R[i]); S.bv[B[i] * N + z] &= ~(1 << P[i]);
    S.ver++; S.ch = 1; if (TR) TR.rm.push(i * N + z);
  }
  function place(S, i, z) {
    if (S.g[i]) return S.g[i] === z + 1;
    if (!((S.cv[i] >>> z) & 1)) return false;
    S.g[i] = z + 1; S.left--; S.pn[z]++; S.pu[R[i]]--; S.pu[N + C[i]]--; S.pu[2 * N + B[i]]--; S.ch = 1; if (TR) TR.pl.push(i * N + z);
    for (let e = 0; e < N; e++) if (e !== z) remove(S, i, e);
    const pe = peers[i]; for (let k = 0; k < pe.length; k++) remove(S, pe[k], z);
    return true;
  }
  // lines with one point left are placed, in all four directions (a cell single is a pillar; the others are hidden singles)
  function singles(S) {
    for (let i = 0; i < NN; i++) if (!S.g[i]) { const x = S.cv[i]; if (!x) { if (TR) TR.why = [0, i]; return false; } if (!(x & (x - 1)) && !place(S, i, ctz(x))) return false; }
    const V = [null, S.rv, S.kv, S.bv];
    for (let k = 1; k <= 3; k++) { const v = V[k], U = UC[k];
      for (let u = 0; u < N; u++) for (let z = 0; z < N; z++) { const x = v[u * N + z]; if (!x) { if (TR) TR.why = [k, u, z]; return false; } if (!(x & (x - 1))) { const i = U[u][ctz(x)]; if (!S.g[i] && !place(S, i, z)) return false; } } }
    return true;
  }
  const done = (S, key) => { const k = (key / N) | 0, u = key % N; return k === 0 ? S.pn[u] === N : S.pu[(k - 1) * N + u] === 0; };
  // the size bound of a layer: the product of the open places along its lines (log), the smaller of two ways to count
  function estimate(S, key) {
    const k = (key / N) | 0, u = key % N; let a = 0, b = 0, c = 0;
    if (k === 0) { for (let x = 0; x < N; x++) { const p1 = popc(S.rv[x * N + u]), p2 = popc(S.kv[x * N + u]), p3 = popc(S.bv[x * N + u]); if (!p1 || !p2 || !p3) return -1; a += LG[p1]; b += LG[p2]; c += LG[p3]; } return Math.min(a, b, c); }
    const cells = UC[k][u], v = k === 1 ? S.rv : k === 2 ? S.kv : S.bv;
    for (let x = 0; x < N; x++) { const p1 = popc(S.cv[cells[x]]), p2 = popc(v[u * N + x]); if (!p1 || !p2) return -1; a += LG[p1]; b += LG[p2]; }
    return Math.min(a, b);
  }
  // the thinnest layer not yet built, in any allowed direction
  function nextLayer(S) {
    let best = -1, be = Infinity;
    for (let key = 0; key < K; key++) {
      if (!dirs[(key / N) | 0] || S.st[key] === 1 || S.st[key] === 2) continue;
      if (done(S, key)) { S.st[key] = 2; continue; }
      const e = estimate(S, key); if (e < 0) return -2;
      if (S.st[key] === 3 && e > S.bigE[key] - RETRY) continue;      // was too big: wait until it has shrunk a lot
      if (e < be) { be = e; best = key; }
    }
    S.lastE = be; return best;
  }
  // list every option of a layer: a number layer = one place per box (rows and columns all different);
  // a row / column / box layer = one number per cell (all different)
  function build(S, key) {
    const k = (key / N) | 0, u = key % N;
    let out = new Int32Array(Math.max(256, N * 64)), n = 0, over = false; const cur = new Int32Array(N), scope = [];
    const push = () => { if (n >= cap) { over = true; return; } if ((n + 1) * N > out.length) { const o2 = new Int32Array(out.length * 2); o2.set(out); out = o2; } out.set(cur, n * N); n++; };
    if (k === 0) {
      const slots = []; for (let b = 0; b < N; b++) { const x = S.bv[b * N + u], cells = []; for (let m = x; m; m &= m - 1) cells.push(UC[3][b][ctz(m)]); slots.push(cells); for (const i of cells) scope.push(i * N + u); }
      slots.sort((a, b) => a.length - b.length);
      (function rec(s, uR, uC) {
        if (over) return; if (s === N) { push(); return; }
        for (const i of slots[s]) { const rb = 1 << R[i], cb = 1 << C[i]; if ((uR & rb) || (uC & cb)) continue; cur[s] = i * N + u; rec(s + 1, uR | rb, uC | cb); }
      })(0, 0, 0);
    } else {
      const cells = Array.from(UC[k][u]).sort((a, b) => popc(S.cv[a]) - popc(S.cv[b]));
      for (const i of cells) for (let m = S.cv[i]; m; m &= m - 1) scope.push(i * N + ctz(m));
      (function rec(s, used) {
        if (over) return; if (s === N) { push(); return; }
        const i = cells[s]; for (let m = S.cv[i] & ~used; m; m &= m - 1) { const z = ctz(m); cur[s] = i * N + z; rec(s + 1, used | (1 << z)); }
      })(0, 0);
    }
    if (TR) TR.ev(S, { kind: "build", key, n: over ? cap : n, big: over });
    if (over) { S.st[key] = 3; S.bigE[key] = S.lastE; return true; }        // too many options: leave it unbuilt for now
    built[k]++; S.st[key] = 1; S.L[key] = { n, opts: out.subarray(0, n * N), scope: Int32Array.from(scope) }; S.lv[key] = -1;
    return n > 0;
  }
  // cut a built layer (drop options that use a point no longer possible), then AND / OR over its options:
  // a point no option uses is removed from the tensor, a point every option uses is placed
  function useLayer(S, key) {
    const L = S.L[key], cv = S.cv; let { n, opts, scope } = L;
    let first = -1;
    for (let t = 0; t < n && first < 0; t++) for (let j = 0; j < N; j++) { const q = opts[t * N + j], i = (q / N) | 0; if (!((cv[i] >>> (q - i * N)) & 1)) { first = t; break; } }
    const n0 = n;
    if (first >= 0) {
      const o2 = new Int32Array(n * N); let m = 0;
      for (let t = 0; t < n; t++) { let ok = true; if (t >= first) for (let j = 0; j < N; j++) { const q = opts[t * N + j], i = (q / N) | 0; if (!((cv[i] >>> (q - i * N)) & 1)) { ok = false; break; } } if (ok) { o2.set(opts.subarray(t * N, t * N + N), m * N); m++; } }
      n = m; opts = o2.subarray(0, n * N); S.ch = 1;
      if (!n) { if (TR) TR.why = [4, key]; return false; }
    }
    for (let t = 0, e = n * N; t < e; t++) cnt[opts[t]]++;
    const keep = [];
    if (TR) TR.cut = [n0, n];
    for (let s = 0; s < scope.length; s++) {
      const q = scope[s], i = (q / N) | 0, z = q - i * N, c = cnt[q]; cnt[q] = 0;
      if (!((cv[i] >>> z) & 1)) continue;
      if (!c) { remove(S, i, z); continue; }
      keep.push(q);
      if (c === n && !S.g[i] && !place(S, i, z)) { for (let s2 = s + 1; s2 < scope.length; s2++) cnt[scope[s2]] = 0; return false; }
    }
    if (n === 1) { S.st[key] = 2; S.L[key] = null; return true; }
    S.L[key] = keep.length === scope.length && n === n0 ? L : { n, opts, scope: Int32Array.from(keep) };
    return true;
  }
  function propagate(S) {
    for (;;) {
      S.ch = 0;
      if (!singles(S)) return false;
      if (TR) TR.flush(S, { kind: "singles" });
      for (let key = 0; key < K; key++) {
        if (S.st[key] !== 1 || S.lv[key] === S.ver) continue;
        if (!useLayer(S, key)) return false;
        if (S.st[key] === 1) S.lv[key] = S.ver;
        if (TR) TR.flush(S, { kind: "cut", key });
      }
      if (!S.left) return true;
      if (S.ch) continue;
      const nx = nextLayer(S);
      if (nx === -2) return false;
      if (nx < 0) return true;                       // stuck, nothing more to build: guess
      if (!build(S, nx)) return false;
    }
  }
  function solve(S) {
    if (!propagate(S)) { if (TR) TR.ev(S, { kind: "dead", why: TR.why }); return null; }
    if (!S.left) return S;
    // guess last, on the smallest choice: a built layer's options, or a line of the tensor with the fewest points
    let lk = -1; for (let key = 0; key < K; key++) if (S.st[key] === 1 && (lk < 0 || S.L[key].n < S.L[lk].n)) lk = key;
    let fk = -1, fu = -1, fz = -1, fb = 99; const V = [null, S.rv, S.kv, S.bv];
    for (let i = 0; i < NN; i++) if (!S.g[i]) { const c = popc(S.cv[i]); if (c < fb) { fb = c; fk = 0; fu = i; } }
    for (let k = 1; k <= 3; k++) for (let u = 0; u < N; u++) for (let z = 0; z < N; z++) { const x = V[k][u * N + z]; if (x & (x - 1)) { const c = popc(x); if (c < fb) { fb = c; fk = k; fu = u; fz = z; } } }
    if (lk >= 0 && S.L[lk].n <= fb) {
      const L = S.L[lk];
      for (let t = 0; t < L.n; t++) {
        guesses++; const U = clone(S); U.L[lk] = { n: 1, opts: L.opts.subarray(t * N, t * N + N), scope: L.scope }; U.lv[lk] = -1;
        if (TR) TR.ev(U, { kind: "guess", key: lk, t, of: L.n, pts: Array.from(L.opts.subarray(t * N, t * N + N)), depth: ++TR.depth });
        const r = solve(U); if (r) return r;
        if (TR) TR.ev(S, { kind: "back", key: lk, t, of: L.n, depth: --TR.depth });
      }
      return null;
    }
    const pts = [];
    if (fk === 0) for (let m = S.cv[fu]; m; m &= m - 1) pts.push(fu * N + ctz(m));
    else for (let m = V[fk][fu * N + fz]; m; m &= m - 1) pts.push(UC[fk][fu][ctz(m)] * N + fz);
    for (let t = 0; t < pts.length; t++) {
      const i = (pts[t] / N) | 0, z = pts[t] % N;
      guesses++; const U = clone(S);
      if (TR) TR.ev(U, { kind: "guess", line: [fk, fu, fz], t, of: pts.length, pts: [pts[t]], depth: ++TR.depth });
      if (!place(U, i, z)) { if (TR) TR.depth--; continue; }
      const r = solve(U); if (r) return r;
      if (TR) TR.ev(S, { kind: "back", line: [fk, fu, fz], t, of: pts.length, depth: --TR.depth });
    }
    return null;
  }
  const S0 = blank();
  const all = N === 32 ? 0xFFFFFFFF : (1 << N) - 1;
  S0.cv.fill(all); S0.rv.fill(all); S0.kv.fill(all); S0.bv.fill(all); S0.pn.fill(0); S0.pu.fill(N);
  for (let i = 0; i < NN; i++) if (p[i] && !place(S0, i, p[i] - 1)) return { ok: false, grid: null, guesses, built };
  if (TR) TR.ev(S0, { kind: "start" });
  if (!singles(S0)) return { ok: false, grid: null, guesses, built };
  if (TR) TR.flush(S0, { kind: "singles" });
  for (let s = 0; s < startK; s++) { const nx = nextLayer(S0); if (nx === -2) return { ok: false, grid: null, guesses, built }; if (nx < 0) break; if (!build(S0, nx)) return { ok: false, grid: null, guesses, built }; }
  const r = solve(S0);
  return { ok: !!r, grid: r ? Array.from(r.g) : null, guesses, built };
}

// the step recorder for the replay: every event keeps the tensor (cell view) and the grid, and the points removed / placed since the last event
function makeRecorder(maxEv) {
  const T = { rm: [], pl: [], list: [], full: false, why: null, cut: null, depth: 0,
    ev(S, e) {
      if (T.list.length >= maxEv) { T.full = true; T.rm.length = 0; T.pl.length = 0; return; }
      T.list.push({ ...e, g: S.g.slice(), cv: S.cv.slice(), left: S.left, rm: T.rm.splice(0), pl: T.pl.splice(0), cut: e.kind === "cut" ? T.cut : null, depth: e.depth != null ? e.depth : T.depth });
    },
    flush(S, e) { if (T.rm.length || T.pl.length || (e.kind === "cut" && T.cut && T.cut[0] !== T.cut[1])) T.ev(S, e); T.cut = null; } };
  return T;
}
function tensorTrace(p, opt, maxEv = 20000) {
  TR = makeRecorder(maxEv);
  let r; try { r = tensorOL(p, opt); } finally { var rec = TR; TR = null; }
  rec.ev({ g: r.grid ? Int8Array.from(r.grid) : rec.list[rec.list.length - 1].g, cv: rec.list[rec.list.length - 1].cv, left: r.grid ? 0 : -1 }, { kind: r.ok ? "done" : "fail" });
  return { ev: rec.list, ok: r.ok, full: rec.full, guesses: r.guesses, built: r.built };
}
