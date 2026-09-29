
/* ---------- shared number patterns, cut incrementally ---------- */
// A number layer's template is a pattern: one cell per row, column and box. The pattern does not depend on the number,
// so all number layers are built in ONE walk over the patterns; each pattern is kept once with a number mask
// (the numbers every one of its cells still allows).
// Support counts replace re-cutting: sup[cell·N + number] = live patterns that use that point for that number,
// live[number] = patterns still valid for it. Removing a point only touches the patterns through that cell:
//   support 0 → the point is removed (OR); support = live → the point is placed (AND); live 0 → dead end.
// After a failed guess the changes are undone from a trail, so the big list is never scanned again.
function sharedOL(p, opt = {}) {
  if (!TG || TG.N !== N) tensorSetup();
  const { NN, R, C, B, P: PB, UC, peers, LG } = TG;
  const cap = opt.cap || 300000, RETRY = Math.log(8), top = Math.max(1, opt.top || 2);
  let guesses = 0, builds = 0;
  const pend = [], chZ = new Uint8Array(N); let anyZ = false;
  const blank = () => ({ g: new Int8Array(NN), cv: new Uint32Array(NN), rv: new Uint32Array(N * N), kv: new Uint32Array(N * N), bv: new Uint32Array(N * N), pn: new Int16Array(N), left: NN, ver: 0, P: null, lf: Infinity });
  const clone = S => ({ g: S.g.slice(), cv: S.cv.slice(), rv: S.rv.slice(), kv: S.kv.slice(), bv: S.bv.slice(), pn: S.pn.slice(), left: S.left, ver: S.ver, P: S.P, lf: S.lf });
  const reset = () => { pend.length = 0; chZ.fill(0); anyZ = false; };
  // a pattern stops being valid for number z: clear its bit and lower the supports of its cells
  function unlink(P, t, z) {
    P.mask[t] &= ~(1 << z); P.trail.push(t * 32 + z); P.live[z]--; chZ[z] = 1; anyZ = true;
    const o = t * N; for (let s = 0; s < N; s++) { const q = P.cells[o + s] * N + z; if (--P.sup[q] === 0) pend.push(q); }
  }
  function undo(P, mark) {
    const tr = P.trail;
    while (tr.length > mark) { const v = tr.pop(), t = v >>> 5, z = v & 31; P.mask[t] |= 1 << z; P.live[z]++; const o = t * N; for (let s = 0; s < N; s++) P.sup[P.cells[o + s] * N + z]++; }
  }
  function remove(S, i, z) {
    const b = 1 << z; if (!(S.cv[i] & b)) return;
    S.cv[i] &= ~b; S.rv[R[i] * N + z] &= ~(1 << C[i]); S.kv[C[i] * N + z] &= ~(1 << R[i]); S.bv[B[i] * N + z] &= ~(1 << PB[i]);
    S.ver++; if (TR) TR.rm.push(i * N + z);
    const P = S.P; if (P) for (let k = P.off[i], e = P.off[i + 1]; k < e; k++) { const t = P.idx[k]; if (P.mask[t] & b) unlink(P, t, z); }
  }
  function place(S, i, z) {
    if (S.g[i]) return S.g[i] === z + 1;
    if (!((S.cv[i] >>> z) & 1)) return false;
    S.g[i] = z + 1; S.left--; S.pn[z]++; S.ver++; if (TR) TR.pl.push(i * N + z);
    for (let e = 0; e < N; e++) if (e !== z) remove(S, i, e);
    const pe = peers[i]; for (let k = 0; k < pe.length; k++) remove(S, pe[k], z);
    return true;
  }
  function singles(S) {
    for (let i = 0; i < NN; i++) if (!S.g[i]) { const x = S.cv[i]; if (!x) { if (TR) TR.why = [0, i]; return false; } if (!(x & (x - 1)) && !place(S, i, ctz(x))) return false; }
    const V = [null, S.rv, S.kv, S.bv];
    for (let k = 1; k <= 3; k++) { const v = V[k], U = UC[k];
      for (let u = 0; u < N; u++) for (let z = 0; z < N; z++) { const x = v[u * N + z]; if (!x) { if (TR) TR.why = [k, u, z]; return false; } if (!(x & (x - 1))) { const i = U[u][ctz(x)]; if (!S.g[i] && !place(S, i, z)) return false; } } }
    return true;
  }
  // size bound of all number layers together (log of the sum of each number's bound)
  function estZ(S, z) { let a = 0, b = 0, c = 0;
    for (let x = 0; x < N; x++) { const p1 = popc(S.rv[x * N + z]), p2 = popc(S.kv[x * N + z]), p3 = popc(S.bv[x * N + z]); if (!p1 || !p2 || !p3) return -1; a += LG[p1]; b += LG[p2]; c += LG[p3]; }
    return Math.min(a, b, c); }
  // the numbers to share: the current set plus the thinnest open numbers, up to k of them
  function pickSet(S, base, k) {
    const c = []; for (let z = 0; z < N; z++) if (S.pn[z] < N && !((base >>> z) & 1)) { const e = estZ(S, z); if (e < 0) return -1; c.push([e, z]); }
    c.sort((a, b) => a[0] - b[0]); let m = base, have = popc(base) ; for (const [, z] of c) { if (have >= k) break; m |= 1 << z; have++; } return m >>> 0; }
  function bound(S, set) {
    let mx = -Infinity; const es = [];
    for (let z = 0; z < N; z++) { if (S.pn[z] === N || !((set >>> z) & 1)) continue; let a = 0, b = 0, c = 0;
      for (let x = 0; x < N; x++) { const p1 = popc(S.rv[x * N + z]), p2 = popc(S.kv[x * N + z]), p3 = popc(S.bv[x * N + z]); if (!p1 || !p2 || !p3) return -1; a += LG[p1]; b += LG[p2]; c += LG[p3]; }
      const e = Math.min(a, b, c); es.push(e); if (e > mx) mx = e; }
    if (!es.length) return 0; let s = 0; for (const e of es) s += Math.exp(e - mx); return mx + Math.log(s);
  }
  // one walk over the patterns for all numbers at once; a branch stops when no number fits all its cells
  function buildShared(S, set) {
    const order = [...Array(N).keys()].map(b => [b, UC[3][b].reduce((a, i) => a + popc(S.cv[i]), 0)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    const slots = order.map(b => Array.from(UC[3][b]));
    let cells = new Int16Array(Math.max(1024, N * 256)), mask = new Uint32Array(Math.max(64, 256)), n = 0, over = false; const cur = new Int16Array(N), cv = S.cv;
    (function rec(s, uR, uC, m) {
      if (over) return;
      if (s === N) { if (n >= cap) { over = true; return; }
        if ((n + 1) * N > cells.length) { const c2 = new Int16Array(cells.length * 2); c2.set(cells); cells = c2; }
        if (n + 1 > mask.length) { const m2 = new Uint32Array(mask.length * 2); m2.set(mask); mask = m2; }
        cells.set(cur, n * N); mask[n] = m; n++; return; }
      for (const i of slots[s]) { const rb = 1 << R[i], cb = 1 << C[i]; if ((uR & rb) || (uC & cb)) continue; const m2 = m & cv[i]; if (!m2) continue; cur[s] = i; rec(s + 1, uR | rb, uC | cb, m2); }
    })(0, 0, 0, set);
    if (TR) TR.ev(S, { kind: "sbuild", n: over ? cap : n, big: over, set: [...Array(N).keys()].filter(z => (set >>> z) & 1) });
    if (over) return 0;
    builds++;
    const P = { set, n, cells: cells.subarray(0, n * N), mask: mask.slice(0, n), off: new Int32Array(NN + 1), idx: new Int32Array(n * N), sup: new Int32Array(NN * N), live: new Int32Array(N), trail: [] };
    for (let k = 0; k < n * N; k++) P.off[P.cells[k] + 1]++;
    for (let i = 0; i < NN; i++) P.off[i + 1] += P.off[i];
    const fill = P.off.slice(0, NN);
    for (let t = 0; t < n; t++) { const o = t * N; for (let s = 0; s < N; s++) { const i = P.cells[o + s]; P.idx[fill[i]++] = t; } for (let m = P.mask[t]; m; m &= m - 1) { const z = ctz(m); P.live[z]++; for (let s = 0; s < N; s++) P.sup[P.cells[o + s] * N + z]++; } }
    S.P = P;
    for (let q = 0; q < NN * N; q++) if (((set >>> (q % N)) & 1) && !P.sup[q] && ((cv[(q / N) | 0] >>> (q % N)) & 1)) pend.push(q);
    for (let z = 0; z < N; z++) if ((set >>> z) & 1) chZ[z] = 1; anyZ = true;
    return 1;
  }
  const doneSet = S => { let m = 0; for (let z = 0; z < N; z++) if (S.pn[z] === N) m |= 1 << z; return m >>> 0; };
  function propagate(S) {
    for (;;) {
      const v0 = S.ver;
      // OR: points no live pattern uses
      while (pend.length) { const q = pend.pop(), i = (q / N) | 0, z = q % N; if ((S.cv[i] >>> z) & 1) { if (S.g[i]) { if (TR) TR.why = [0, i]; return false; } remove(S, i, z); } }
      // AND: a number with no pattern is a dead end; a point every live pattern of its number uses is placed
      if (anyZ) { anyZ = false; const P = S.P;
        for (let z = 0; z < N; z++) if (chZ[z]) { chZ[z] = 0; if (S.pn[z] === N) continue; const L = P.live[z]; if (!L) { if (TR) TR.why = [5, z]; return false; }
          for (let j = 0; j < NN; j++) if (!S.g[j] && ((S.cv[j] >>> z) & 1) && P.sup[j * N + z] === L && !place(S, j, z)) return false; } }
      if (pend.length || anyZ) continue;
      if (TR) TR.flush(S, { kind: "shared" });
      if (!singles(S)) return false;
      if (TR) TR.flush(S, { kind: "singles" });
      if (!S.left) return true;
      if (S.ver !== v0 || pend.length || anyZ) continue;
      // stuck: share the patterns of one more number (or of the top numbers, if nothing is built yet)
      { const base = S.P ? S.P.set : 0, set = pickSet(S, base, S.P ? popc(base & ~doneSet(S)) + 1 : top); if (set < 0) return false;
        if ((set & ~base) >>> 0) { const e = bound(S, set); if (e < 0) return false; if (e <= S.lf - RETRY) { if (buildShared(S, set)) { S.lf = Infinity; continue; } S.lf = e; } } }
      return true;
    }
  }
  function solve(S) {
    if (!propagate(S)) { reset(); if (TR) TR.ev(S, { kind: "dead", why: TR.why }); return null; }
    if (!S.left) return S;
    // guess last, on the smallest choice: the number with the fewest live patterns, or the tensor line with the fewest points
    const P = S.P; let bz = -1, bn = 1e9;
    if (P) for (let z = 0; z < N; z++) if (S.pn[z] < N && P.live[z] > 1 && P.live[z] < bn) { bn = P.live[z]; bz = z; }
    let fk = -1, fu = -1, fz = -1, fb = 99; const V = [null, S.rv, S.kv, S.bv];
    for (let i = 0; i < NN; i++) if (!S.g[i]) { const c = popc(S.cv[i]); if (c < fb) { fb = c; fk = 0; fu = i; } }
    for (let k = 1; k <= 3; k++) for (let u = 0; u < N; u++) for (let z = 0; z < N; z++) { const x = V[k][u * N + z]; if (x & (x - 1)) { const c = popc(x); if (c < fb) { fb = c; fk = k; fu = u; fz = z; } } }
    const tries = [];                                 // each try = the points to place
    let info;
    if (bz >= 0 && bn <= fb) { const b = 1 << bz; for (let t = 0; t < P.n; t++) if (P.mask[t] & b) tries.push(Array.from(P.cells.subarray(t * N, t * N + N), i => i * N + bz)); info = { key: bz }; }
    else { if (fk === 0) for (let m = S.cv[fu]; m; m &= m - 1) tries.push([fu * N + ctz(m)]); else for (let m = V[fk][fu * N + fz]; m; m &= m - 1) tries.push([UC[fk][fu][ctz(m)] * N + fz]); info = { line: [fk, fu, fz] }; }
    for (let t = 0; t < tries.length; t++) {
      guesses++; const U = clone(S), mark = P ? P.trail.length : 0;
      if (TR) TR.ev(U, { kind: "guess", ...info, t, of: tries.length, pts: tries[t], depth: ++TR.depth });
      let ok = true; for (const q of tries[t]) if (!place(U, (q / N) | 0, q % N)) { ok = false; break; }
      const r = ok ? solve(U) : null; if (r) return r;
      if (P) undo(P, mark); reset();
      if (TR) TR.ev(S, { kind: "back", ...info, t, of: tries.length, depth: --TR.depth });
    }
    return null;
  }
  const fail = () => ({ ok: false, grid: null, guesses, built: [builds, 0, 0, 0] });
  const S0 = blank(), all = N === 32 ? 0xFFFFFFFF : (1 << N) - 1;
  S0.cv.fill(all); S0.rv.fill(all); S0.kv.fill(all); S0.bv.fill(all);
  for (let i = 0; i < NN; i++) if (p[i] && !place(S0, i, p[i] - 1)) return fail();
  if (TR) TR.ev(S0, { kind: "start" });
  if (!singles(S0)) return fail();
  if (TR) TR.flush(S0, { kind: "singles" });
  if (S0.left) { const set = pickSet(S0, 0, top); if (set < 0) return fail(); if (set) { const e = bound(S0, set); if (e < 0) return fail(); if (!buildShared(S0, set)) S0.lf = e; } }
  const r = solve(S0);
  return { ok: !!r, grid: r ? Array.from(r.g) : null, guesses, built: [builds, 0, 0, 0] };
}
function sharedTrace(p, opt, maxEv = 20000) {
  TR = makeRecorder(maxEv);
  let r; try { r = sharedOL(p, opt); } finally { var rec = TR; TR = null; }
  const last = rec.list[rec.list.length - 1];
  rec.ev({ g: r.grid ? Int8Array.from(r.grid) : last.g, cv: last.cv, left: r.grid ? 0 : -1 }, { kind: r.ok ? "done" : "fail" });
  return { ev: rec.list, ok: r.ok, full: rec.full, guesses: r.guesses, built: r.built };
}
