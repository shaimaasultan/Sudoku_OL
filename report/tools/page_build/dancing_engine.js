
/* ---------- Dancing Layers: Dancing Links whose rows are whole templates ---------- */
// Exact cover with two kinds of rows:
//   a templated number d (its layer fits the cap): one row per template = its N cells + the column "number d";
//   any other number: one row per possible cell = that cell + "d in its row" + "d in its column" + "d in its box".
// Columns: every cell, "number d" for templated numbers, and row / column / box columns for the others.
// Choosing a row unlinks every row that clashes with it (a toggle, not a rebuild); going back links them again.
// Every choice is made on the column with the fewest live rows — a cell, a whole number layer, or a number in a row / column / box.
function dancingLayers(p, opt = {}) {
  if (!TG || TG.N !== N) tensorSetup();
  const { NN, R, C, B, UC } = TG;
  const cap = opt.cap || 2000, top = opt.top == null ? 2 : opt.top, nodeCap = opt.nodeCap || 5e6;
  const all = N === 32 ? 0xFFFFFFFF : (1 << N) - 1;
  const fail = () => ({ ok: false, grid: null, guesses: 0, built: [0, 0, 0, 0] });
  // the points the givens leave open
  const rm = new Uint32Array(N), cm = new Uint32Array(N), bm = new Uint32Array(N), cnt = new Int16Array(N), allow = new Uint32Array(NN);
  for (let i = 0; i < NN; i++) if (p[i]) { const b = 1 << (p[i] - 1); if ((rm[R[i]] | cm[C[i]] | bm[B[i]]) & b) return fail(); rm[R[i]] |= b; cm[C[i]] |= b; bm[B[i]] |= b; cnt[p[i] - 1]++; }
  for (let i = 0; i < NN; i++) allow[i] = p[i] ? 1 << (p[i] - 1) : all & ~(rm[R[i]] | cm[C[i]] | bm[B[i]]);
  // template lists for the thinnest numbers (complete numbers always, they have one template)
  const est = z => { let s = 0; for (let b = 0; b < N; b++) { let k = 0; for (const i of UC[3][b]) k += (allow[i] >>> z) & 1; if (!k) return -1; s += Math.log(k); } return s; };
  const order = []; for (let z = 0; z < N; z++) { const e = est(z); if (e < 0) return fail(); order.push([cnt[z] === N ? -1 : e, z]); }
  order.sort((a, b) => a[0] - b[0]);
  const tpl = new Array(N).fill(null); let tried = 0;
  for (const [e, z] of order) {
    if (e >= 0 && tried >= top) break; if (e >= 0) tried++;
    const slots = []; for (let b = 0; b < N; b++) slots.push(UC[3][b].filter(i => (allow[i] >>> z) & 1)); slots.sort((a, b) => a.length - b.length);
    const out = []; const cur = new Int16Array(N); let over = false;
    (function rec(s, uR, uC) { if (over) return; if (s === N) { if (out.length >= cap) { over = true; return; } out.push(Array.from(cur)); return; }
      for (const i of slots[s]) { const rb = 1 << R[i], cb = 1 << C[i]; if ((uR & rb) || (uC & cb)) continue; cur[s] = i; rec(s + 1, uR | rb, uC | cb); } })(0, 0, 0);
    if (!over) { if (!out.length) return fail(); tpl[z] = out; }
  }
  // columns: cells, then per number either "number d" or its row / column / box columns
  let nc = NN; const numCol = new Int32Array(N).fill(-1), rcol = new Int32Array(N * N), kcol = new Int32Array(N * N), bcol = new Int32Array(N * N), ctype = [];
  for (let i = 0; i < NN; i++) ctype.push([0, i, -1]);
  for (let z = 0; z < N; z++) {
    if (tpl[z]) { numCol[z] = nc++; ctype.push([4, z]); continue; }
    for (let u = 0; u < N; u++) { rcol[z * N + u] = nc++; ctype.push([1, u, z]); }
    for (let u = 0; u < N; u++) { kcol[z * N + u] = nc++; ctype.push([2, u, z]); }
    for (let u = 0; u < N; u++) { bcol[z * N + u] = nc++; ctype.push([3, u, z]); }
  }
  // Dancing Links arrays (as dlxSolve on the Speed page)
  const L = [], Rt = [], U = [], D = [], Cl = [], RowId = [], S = new Int32Array(nc + 1);
  for (let j = 0; j <= nc; j++) { L.push(j - 1); Rt.push(j + 1); U.push(j); D.push(j); Cl.push(j); RowId.push(-1); }
  L[0] = nc; Rt[nc] = 0;
  const rows = [];                                   // each row: [number index, cells...]
  const addRow = (cols, info) => { let first = -1; for (const col of cols) { const x = L.length; Cl.push(col + 1); RowId.push(rows.length); U.push(U[col + 1]); D.push(col + 1); D[U[col + 1]] = x; U[col + 1] = x; S[col + 1]++; if (first < 0) { first = x; L.push(x); Rt.push(x); } else { L.push(L[first]); Rt.push(first); Rt[L[first]] = x; L[first] = x; } } rows.push(info); };
  for (let z = 0; z < N; z++) {
    if (tpl[z]) { for (const t of tpl[z]) addRow([...t, numCol[z]], [z, ...t]); continue; }
    for (let i = 0; i < NN; i++) if ((allow[i] >>> z) & 1) addRow([i, rcol[z * N + R[i]], kcol[z * N + C[i]], bcol[z * N + B[i]]], [z, i]);
  }
  const cover = c => { Rt[L[c]] = Rt[c]; L[Rt[c]] = L[c]; for (let i = D[c]; i !== c; i = D[i]) for (let j = Rt[i]; j !== i; j = Rt[j]) { D[U[j]] = D[j]; U[D[j]] = U[j]; S[Cl[j]]--; } };
  const uncover = c => { for (let i = U[c]; i !== c; i = U[i]) for (let j = L[i]; j !== i; j = L[j]) { S[Cl[j]]++; D[U[j]] = j; U[D[j]] = j; } Rt[L[c]] = c; L[Rt[c]] = c; };
  const built = [tpl.filter(Boolean).length, 0, 0, 0];
  // the replay: the grid from the chosen rows, and the tensor from the rows still linked
  const g = new Int8Array(NN), pts = r => rows[r].slice(1).map(i => i * N + rows[r][0]);
  const view = () => { const cv = new Uint32Array(NN); let left = 0;
    for (let i = 0; i < NN; i++) { if (g[i]) { cv[i] = 1 << (g[i] - 1); continue; } left++; for (let x = D[i + 1]; x !== i + 1; x = D[x]) cv[i] |= 1 << rows[RowId[x]][0]; }
    return { g, cv, left }; };
  const region = c => { const t = ctype[c - 1]; return t[0] === 4 ? { key: t[1] } : { line: t[0] === 0 ? [0, t[1], -1] : [t[0], t[1], t[2]] }; };
  const set = (r, v) => { const z = rows[r][0]; for (let k = 1; k < rows[r].length; k++) g[rows[r][k]] = v ? z + 1 : 0; };
  let nodes = 0, aborted = false;
  if (TR) { TR.ev(view(), { kind: "start" }); TR.ev(view(), { kind: "dlbuild", tz: tpl.map((t, z) => t ? [z, t.length] : null).filter(Boolean), rows: rows.length, cols: nc }); }
  const search = () => {
    if (++nodes > nodeCap) { aborted = true; return true; }
    if (Rt[0] === 0) return true;
    let c = Rt[0]; for (let j = Rt[0]; j !== 0; j = Rt[j]) if (S[j] < S[c]) c = j;
    if (!S[c]) { if (TR) TR.ev(view(), { kind: "dlpick", ...region(c), size: 0 }); return false; }
    if (TR && S[c] > 1) TR.ev(view(), { kind: "dlpick", ...region(c), size: S[c] });
    const n = S[c]; cover(c); let t = 0;
    for (let r = D[c]; r !== c; r = D[r], t++) {
      for (let j = Rt[r]; j !== r; j = Rt[j]) cover(Cl[j]);
      set(RowId[r], 1);
      if (TR) { TR.pl.push(...pts(RowId[r])); TR.ev(view(), { kind: "dlsel", ...region(c), t, of: n, pts: pts(RowId[r]), tpl: !!tpl[rows[RowId[r]][0]], depth: n > 1 ? ++TR.depth : TR.depth }); }
      if (search()) return true;
      set(RowId[r], 0);
      for (let j = L[r]; j !== r; j = L[j]) uncover(Cl[j]);
      if (TR) { if (n > 1) TR.depth--; TR.ev(view(), { kind: "back", ...region(c), t, of: n }); }
    }
    uncover(c); return false;
  };
  const ok = search() && !aborted;
  return { ok, grid: ok ? Array.from(g) : null, guesses: nodes - 1, built };
}
function dancingTrace(p, opt, maxEv = 20000) {
  TR = makeRecorder(maxEv);
  let r; try { r = dancingLayers(p, opt); } finally { var rec = TR; TR = null; }
  const last = rec.list[rec.list.length - 1];
  rec.ev({ g: r.grid ? Int8Array.from(r.grid) : last.g, cv: last.cv, left: r.grid ? 0 : -1 }, { kind: r.ok ? "done" : "fail" });
  return { ev: rec.list, ok: r.ok, full: rec.full, guesses: r.guesses, built: r.built };
}
