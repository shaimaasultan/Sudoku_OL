
/* ---------- the matrix (matmul) option-layer method ---------- */
// The tensor is one flat 0/1 vector x over all N·N·N points (point p = cell·N + number).
// A = the fixed line matrix: 4·N² lines (cells, and each number in each row, column, box), N points each.
//   line sums s = A·x : a line with sum 0 is a dead end, a line with sum 1 places its point.
// For each direction, all its layers are stacked into one option × point matrix M (each option = N points):
//   alive  = (M · (1 − x) == 0)       an option that uses a removed point is cut
//   count  = aliveᵀ · M               how many live options use each point
//   count 0 → the point is removed (OR); count = live options of its layer → the point is placed (AND).
// Row, column and box (vertical) layers are all built in full at the start; only the top 2 or 3 number layers are built.
function matrixSetup() {
  if (!TG || TG.N !== N) tensorSetup();
  if (TG.LP) return;
  const { NN, R, C, B, UC } = TG, NL = 4 * NN;
  const LP = new Int32Array(NL * N), PL = new Int32Array(NN * N * 4);
  for (let i = 0; i < NN; i++) for (let z = 0; z < N; z++) LP[i * N + z] = i * N + z;
  for (let k = 1; k <= 3; k++) for (let u = 0; u < N; u++) for (let z = 0; z < N; z++) for (let j = 0; j < N; j++) LP[(k * NN + u * N + z) * N + j] = UC[k][u][j] * N + z;
  for (let i = 0; i < NN; i++) for (let z = 0; z < N; z++) { const p = i * N + z; PL[p * 4] = i; PL[p * 4 + 1] = NN + R[i] * N + z; PL[p * 4 + 2] = 2 * NN + C[i] * N + z; PL[p * 4 + 3] = 3 * NN + B[i] * N + z; }
  // the layer that owns a point, in each direction: its number, its row, its column, its box
  const OW = [new Int16Array(NN * N), new Int16Array(NN * N), new Int16Array(NN * N), new Int16Array(NN * N)];
  for (let i = 0; i < NN; i++) for (let z = 0; z < N; z++) { const p = i * N + z; OW[0][p] = z; OW[1][p] = R[i]; OW[2][p] = C[i]; OW[3][p] = B[i]; }
  Object.assign(TG, { LP, PL, OW, NL, ls: new Int32Array(NL), mcnt: new Int32Array(NN * N) });
}

function matrixOL(p, opt = {}) {
  matrixSetup();
  const { NN, R, C, UC, LG, LP, PL, OW, NL, mcnt } = TG, NP = NN * N;
  const top = opt.top == null ? 2 : opt.top, capN = opt.cap || 300000, capV = opt.capV || 300000, RETRY = Math.log(8);
  let guesses = 0; const built = [0, 0, 0, 0];
  const EMPTY = { pts: new Int32Array(0), lay: new Int16Array(0), n: 0 };
  const blank = () => ({ x: new Uint8Array(NP).fill(1), g: new Int8Array(NN), left: NN, ver: 0, ls: new Int32Array(NL),
    M: [EMPTY, EMPTY, EMPTY, EMPTY], al: [new Uint8Array(0), new Uint8Array(0), new Uint8Array(0), new Uint8Array(0)], m: [new Int32Array(N), new Int32Array(N), new Int32Array(N), new Int32Array(N)],
    st: new Uint8Array(4 * N), bigE: new Float64Array(4 * N), dv: new Int32Array(4).fill(-1) });
  const clone = S => ({ x: S.x.slice(), g: S.g.slice(), left: S.left, ver: S.ver, ls: S.ls.slice(), M: S.M.slice(), al: S.al.map(a => a.slice()), m: S.m.map(a => a.slice()),
    st: S.st.slice(), bigE: S.bigE.slice(), dv: new Int32Array(4).fill(-1) });
  const view = S => { const cv = new Uint32Array(NN); for (let q = 0; q < NP; q++) if (S.x[q]) cv[(q / N) | 0] |= 1 << (q % N); return { g: S.g, cv, left: S.left }; };
  function remove(S, q) { if (S.x[q]) { S.x[q] = 0; S.ver++; if (TR) TR.rm.push(q); } }
  // place point q: every other point on its 4 lines goes (a row of Aᵀ·A)
  function place(S, q) {
    const i = (q / N) | 0; if (S.g[i]) return S.g[i] === q % N + 1;
    if (!S.x[q]) return false;
    S.g[i] = q % N + 1; S.left--; S.ver++; if (TR) TR.pl.push(q);
    for (let a = 0; a < 4; a++) { const l = PL[q * 4 + a]; for (let j = 0; j < N; j++) { const r = LP[l * N + j]; if (r !== q) remove(S, r); } }
    return true;
  }
  // s = A·x, then lines with one point place it
  function singles(S) {
    const s = S.ls, x = S.x;
    for (let l = 0; l < NL; l++) { let t = 0; const o = l * N; for (let j = 0; j < N; j++) t += x[LP[o + j]]; s[l] = t; if (!t) { if (TR) TR.why = l < NN ? [0, l] : [(l / NN) | 0, (((l % NN) / N) | 0), l % N]; return false; } }
    for (let l = 0; l < NL; l++) if (s[l] === 1) { const o = l * N; for (let j = 0; j < N; j++) { const q = LP[o + j]; if (x[q]) { if (!S.g[(q / N) | 0] && !place(S, q)) return false; break; } } }
    return true;
  }
  const lsum = (S, l) => { let t = 0; for (let j = 0; j < N; j++) t += S.x[LP[l * N + j]]; return t; };
  const unitOpen = (S, k, u) => { for (const i of UC[k][u]) if (!S.g[i]) return true; return false; };
  // size bound of a layer from the line sums (log): the smaller of two ways to count
  function estimate(S, key) {
    const k = (key / N) | 0, u = key % N; let a = 0, b = 0, c = 0;
    if (k === 0) { for (let v = 0; v < N; v++) { const p1 = lsum(S, NN + v * N + u), p2 = lsum(S, 2 * NN + v * N + u), p3 = lsum(S, 3 * NN + v * N + u); if (!p1 || !p2 || !p3) return -1; a += LG[p1]; b += LG[p2]; c += LG[p3]; } return Math.min(a, b, c); }
    for (let v = 0; v < N; v++) { const p1 = lsum(S, UC[k][u][v]), p2 = lsum(S, k * NN + u * N + v); if (!p1 || !p2) return -1; a += LG[p1]; b += LG[p2]; }
    return Math.min(a, b);
  }
  // list a layer's options and add them as new rows of its direction's matrix
  function build(S, key, cap) {
    const k = (key / N) | 0, u = key % N, x = S.x;
    let out = new Int32Array(Math.max(256, N * 64)), n = 0, over = false; const cur = new Int32Array(N);
    const push = () => { if (n >= cap) { over = true; return; } if ((n + 1) * N > out.length) { const o2 = new Int32Array(out.length * 2); o2.set(out); out = o2; } out.set(cur, n * N); n++; };
    if (k === 0) {
      const slots = []; for (let b = 0; b < N; b++) { const cells = []; for (const i of UC[3][b]) if (x[i * N + u]) cells.push(i); slots.push(cells); }
      slots.sort((a, b) => a.length - b.length);
      (function rec(s, uR, uC) { if (over) return; if (s === N) { push(); return; }
        for (const i of slots[s]) { const rb = 1 << R[i], cb = 1 << C[i]; if ((uR & rb) || (uC & cb)) continue; cur[s] = i * N + u; rec(s + 1, uR | rb, uC | cb); } })(0, 0, 0);
    } else {
      const cand = i => { let m = 0; for (let z = 0; z < N; z++) if (x[i * N + z]) m |= 1 << z; return m; };
      const cells = Array.from(UC[k][u]).map(i => [i, cand(i)]).sort((a, b) => popc(a[1]) - popc(b[1]));
      (function rec(s, used) { if (over) return; if (s === N) { push(); return; }
        const [i, cm] = cells[s]; for (let m = cm & ~used; m; m &= m - 1) { const z = ctz(m); cur[s] = i * N + z; rec(s + 1, used | (1 << z)); } })(0, 0);
    }
    if (TR && (k === 0 || over)) TR.ev(view(S), { kind: "build", key, n: over ? cap : n, big: over });
    if (over) { S.st[key] = 3; return true; }
    if (!n) return false;
    built[k]++; S.st[key] = 1;
    const M = S.M[k], pts = new Int32Array((M.n + n) * N), lay = new Int16Array(M.n + n), al = new Uint8Array(M.n + n);
    pts.set(M.pts); pts.set(out.subarray(0, n * N), M.n * N); lay.set(M.lay); lay.fill(u, M.n); al.set(S.al[k]); al.fill(1, M.n);
    S.M[k] = { pts, lay, n: M.n + n }; S.al[k] = al; S.dv[k] = -1;
    return true;
  }
  // one direction: alive = (M·(1−x) == 0), count = aliveᵀ·M, then OR / AND on the points its layers own
  function useDir(S, k) {
    const M = S.M[k]; if (!M.n) return true;
    const { pts, lay, n } = M, al = S.al[k], x = S.x, m = S.m[k], ow = OW[k]; m.fill(0);
    let live = 0;
    for (let r = 0; r < n; r++) {
      if (!al[r]) continue;
      const o = r * N; let ok = 1; for (let j = 0; j < N; j++) if (!x[pts[o + j]]) { ok = 0; break; }
      if (!ok) { al[r] = 0; continue; }
      live++; m[lay[r]]++; for (let j = 0; j < N; j++) mcnt[pts[o + j]]++;
    }
    let dead = -1; for (let u = 0; u < N; u++) if (S.st[k * N + u] === 1 && !m[u]) { dead = u; break; }
    if (dead >= 0) { mcnt.fill(0); if (TR) TR.why = [4, k * N + dead]; return false; }
    for (let q = 0; q < NP; q++) {
      const c = mcnt[q]; mcnt[q] = 0;
      const u = ow[q]; if (S.st[k * N + u] !== 1 || !x[q]) continue;
      if (!c) remove(S, q);
      else if (c === m[u] && !S.g[(q / N) | 0] && !place(S, q)) { mcnt.fill(0); return false; }
    }
    // drop cut rows from this branch's copy when most are gone (the matrix is shared between branches until then)
    if (n > 64 && live * 2 < n) {
      const p2 = new Int32Array(live * N), l2 = new Int16Array(live); let w = 0;
      for (let r = 0; r < n; r++) if (al[r]) { p2.set(pts.subarray(r * N, r * N + N), w * N); l2[w] = lay[r]; w++; }
      S.M[k] = { pts: p2, lay: l2, n: live }; S.al[k] = new Uint8Array(live).fill(1);
    }
    return true;
  }
  function propagate(S) {
    for (;;) {
      const v0 = S.ver;
      if (!singles(S)) return false;
      if (TR) TR.flush(view(S), { kind: "singles" });
      for (let k = 0; k < 4; k++) {
        if (!S.M[k].n || S.dv[k] === S.ver) continue;
        const dv = S.ver;
        if (!useDir(S, k)) return false;
        S.dv[k] = dv;
        if (TR) TR.flush(view(S), { kind: "matmul", dir: k });
      }
      if (!S.left) return true;
      if (S.ver !== v0) continue;
      // stuck: a vertical layer that was too big is tried again once it has shrunk a lot
      let again = false;
      for (let key = N; key < 4 * N; key++) if (S.st[key] === 3 && unitOpen(S, (key / N) | 0, key % N)) { const e = estimate(S, key); if (e < 0) return false; if (e <= S.bigE[key] - RETRY) { S.bigE[key] = e; if (!build(S, key, capV)) return false; if (S.st[key] === 1) again = true; } }
      if (!again) return true;
    }
  }
  function solve(S) {
    if (!propagate(S)) { if (TR) TR.ev(view(S), { kind: "dead", why: TR.why }); return null; }
    if (!S.left) return S;
    // guess last, on the smallest choice: a layer with the fewest live options, or a line with the fewest points
    let bk = -1, bu = -1, bn = 1e9;
    for (let k = 0; k < 4; k++) for (let u = 0; u < N; u++) if (S.st[k * N + u] === 1 && S.m[k][u] > 1 && S.m[k][u] < bn) { bn = S.m[k][u]; bk = k; bu = u; }
    let bl = -1, bs = 1e9; for (let l = 0; l < NL; l++) { const t = S.ls[l]; if (t > 1 && t < bs) { bs = t; bl = l; } }
    if (bk >= 0 && bn <= bs) {
      const M = S.M[bk], al = S.al[bk], rows = []; for (let r = 0; r < M.n; r++) if (al[r] && M.lay[r] === bu) rows.push(r);
      for (let t = 0; t < rows.length; t++) {
        guesses++; const U = clone(S); for (const r of rows) if (r !== rows[t]) U.al[bk][r] = 0;
        if (TR) TR.ev(view(U), { kind: "guess", key: bk * N + bu, t, of: rows.length, pts: Array.from(M.pts.subarray(rows[t] * N, rows[t] * N + N)), depth: ++TR.depth });
        const r = solve(U); if (r) return r;
        if (TR) TR.ev(view(S), { kind: "back", key: bk * N + bu, t, of: rows.length, depth: --TR.depth });
      }
      return null;
    }
    const pts = []; for (let j = 0; j < N; j++) { const q = LP[bl * N + j]; if (S.x[q]) pts.push(q); }
    const line = bl < NN ? [0, bl, -1] : [(bl / NN) | 0, (((bl % NN) / N) | 0), bl % N];
    for (let t = 0; t < pts.length; t++) {
      guesses++; const U = clone(S);
      if (TR) TR.ev(view(U), { kind: "guess", line, t, of: pts.length, pts: [pts[t]], depth: ++TR.depth });
      if (!place(U, pts[t])) { if (TR) TR.depth--; continue; }
      const r = solve(U); if (r) return r;
      if (TR) TR.ev(view(S), { kind: "back", line, t, of: pts.length, depth: --TR.depth });
    }
    return null;
  }
  const fail = () => ({ ok: false, grid: null, guesses, built });
  const S0 = blank();
  for (let i = 0; i < NN; i++) if (p[i] && !place(S0, i * N + p[i] - 1)) return fail();
  if (TR) TR.ev(view(S0), { kind: "start" });
  if (!singles(S0)) return fail();
  if (TR) TR.flush(view(S0), { kind: "singles" });
  // every row, column and box layer, in full
  for (let k = 1; k <= 3; k++) for (let u = 0; u < N; u++) if (unitOpen(S0, k, u)) { S0.bigE[k * N + u] = estimate(S0, k * N + u); if (!build(S0, k * N + u, capV)) return fail(); }
  if (TR) TR.ev(view(S0), { kind: "vertical", n: [1, 2, 3].map(k => S0.M[k].n), layers: [1, 2, 3].map(k => { let b = 0; for (let u = 0; u < N; u++) if (S0.st[k * N + u] === 1) b++; return b; }), big: [1, 2, 3].map(k => { let b = 0; for (let u = 0; u < N; u++) if (S0.st[k * N + u] === 3) b++; return b; }) });
  // only the top 2 (or 3) thinnest number layers
  const cand = []; for (let z = 0; z < N; z++) { let k = 0; for (let i = 0; i < NN; i++) if (S0.g[i] === z + 1) k++; if (k < N) { const e = estimate(S0, z); if (e < 0) return fail(); cand.push([e, z]); } }
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, z] of cand.slice(0, top)) if (!build(S0, z, capN)) return fail();
  const r = solve(S0);
  return { ok: !!r, grid: r ? Array.from(r.g) : null, guesses, built };
}
function matrixTrace(p, opt, maxEv = 20000) {
  TR = makeRecorder(maxEv);
  let r; try { r = matrixOL(p, opt); } finally { var rec = TR; TR = null; }
  const last = rec.list[rec.list.length - 1];
  rec.ev({ g: r.grid ? Int8Array.from(r.grid) : last.g, cv: last.cv, left: r.grid ? 0 : -1 }, { kind: r.ok ? "done" : "fail" });
  return { ev: rec.list, ok: r.ok, full: rec.full, guesses: r.guesses, built: r.built };
}
