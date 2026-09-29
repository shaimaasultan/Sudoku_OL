// Baseline (existing) algorithms, injected into the pages for fair comparison on the same puzzles.
(() => {
  const popc = m => { let k = 0; while (m) { m &= m - 1; k++; } return k; };
  // --- Sudoku / Latin: backtracking with the most-constrained cell first (MRV), bitmask candidates ---
  window.BL_mrv = (p, N, BR, BC, noBoxes, nodeCap = 5e6) => {
    const NC = N * N, g = Int8Array.from(p), rm = new Int32Array(N), cm = new Int32Array(N), bm = new Int32Array(N), full = (1 << (N + 1)) - 2;
    const box = i => noBoxes ? 0 : Math.floor(((i / N) | 0) / BR) * (N / BC) + Math.floor((i % N) / BC);
    const bmask = i => noBoxes ? 0 : bm[box(i)];
    for (let i = 0; i < NC; i++) if (g[i]) { const b = 1 << g[i]; rm[(i / N) | 0] |= b; cm[i % N] |= b; if (!noBoxes) bm[box(i)] |= b; }
    let nodes = 0, aborted = false;
    const rec = () => {
      if (++nodes > nodeCap) { aborted = true; return false; }
      let best = -1, bc = 99, mask = 0;
      for (let i = 0; i < NC; i++) if (!g[i]) { const m = full & ~(rm[(i / N) | 0] | cm[i % N] | bmask(i)), k = popc(m); if (k < bc) { bc = k; best = i; mask = m; if (k < 2) break; } }
      if (best < 0) return true; if (!bc) return false;
      const r = (best / N) | 0, c = best % N, bx = box(best);
      for (let v = 1; v <= N; v++) if (mask & (1 << v)) { const b = 1 << v; g[best] = v; rm[r] |= b; cm[c] |= b; if (!noBoxes) bm[bx] |= b; if (rec()) return true; g[best] = 0; rm[r] &= ~b; cm[c] &= ~b; if (!noBoxes) bm[bx] &= ~b; if (aborted) return false; }
      return false;
    };
    const t0 = performance.now(), ok = rec();
    return { ok, grid: ok ? Array.from(g) : null, nodes, ms: performance.now() - t0, aborted };
  };
  // --- Sudoku / Latin: Knuth's Algorithm X with dancing links (exact cover) ---
  window.BL_dlx = (p, N, BR, BC, noBoxes, nodeCap = 5e6) => {
    const NC = N * N, box = (r, c) => Math.floor(r / BR) * (N / BC) + Math.floor(c / BC);
    const ncols = noBoxes ? 3 * NC : 4 * NC;
    // nodes: arrays L R U D C, row id
    const L = [], R = [], U = [], D = [], C = [], RowId = [], S = new Int32Array(ncols + 1);
    for (let j = 0; j <= ncols; j++) { L.push(j - 1); R.push(j + 1); U.push(j); D.push(j); C.push(j); RowId.push(-1); }
    L[0] = ncols; R[ncols] = 0;
    const rows = [];
    const addRow = (cols, info) => { let first = -1; for (const col of cols) { const x = L.length; C.push(col + 1); RowId.push(rows.length); U.push(U[col + 1]); D.push(col + 1); D[U[col + 1]] = x; U[col + 1] = x; S[col + 1]++; if (first < 0) { first = x; L.push(x); R.push(x); } else { L.push(L[first]); R.push(first); R[L[first]] = x; L[first] = x; } } rows.push(info); };
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c, given = p[i];
      for (let v = 1; v <= N; v++) { if (given && given !== v) continue; const cols = [i, NC + r * N + v - 1, 2 * NC + c * N + v - 1]; if (!noBoxes) cols.push(3 * NC + box(r, c) * N + v - 1); addRow(cols, [i, v]); }
    }
    const cover = c => { R[L[c]] = R[c]; L[R[c]] = L[c]; for (let i = D[c]; i !== c; i = D[i]) for (let j = R[i]; j !== i; j = R[j]) { D[U[j]] = D[j]; U[D[j]] = U[j]; S[C[j]]--; } };
    const uncover = c => { for (let i = U[c]; i !== c; i = U[i]) for (let j = L[i]; j !== i; j = L[j]) { S[C[j]]++; D[U[j]] = j; U[D[j]] = j; } R[L[c]] = c; L[R[c]] = c; };
    const sol = []; let nodes = 0, aborted = false, found = null;
    const search = () => {
      if (++nodes > nodeCap) { aborted = true; return true; }
      if (R[0] === 0) { found = sol.slice(); return true; }
      let c = R[0], best = c; for (let j = R[0]; j !== 0; j = R[j]) if (S[j] < S[best]) best = j; c = best;
      if (!S[c]) return false;
      cover(c);
      for (let r = D[c]; r !== c; r = D[r]) { sol.push(RowId[r]); for (let j = R[r]; j !== r; j = R[j]) cover(C[j]); if (search()) return true; for (let j = L[r]; j !== r; j = L[j]) uncover(C[j]); sol.pop(); }
      uncover(c); return false;
    };
    const t0 = performance.now(); search();
    const grid = found ? (() => { const g = new Array(NC).fill(0); for (const k of found) { const [i, v] = rows[k]; g[i] = v; } return g; })() : null;
    return { ok: !!found && !aborted, grid, nodes, ms: performance.now() - t0, aborted };
  };
  // --- Star Battle: plain backtracking row by row (columns, regions, no touching) ---
  window.BL_starBT = (N, K, reg, nodeCap = 5e6) => {
    const colCnt = new Int8Array(N), regCnt = new Int8Array(N), stars = []; let nodes = 0, aborted = false, found = null;
    const choices = []; const pick = []; (function rc(a) { if (pick.length === K) { choices.push(pick.slice()); return; } for (let c = a; c < N; c++) { pick.push(c); rc(c + 2); pick.pop(); } })(0);
    const touch = (a, b) => Math.abs(((a / N) | 0) - ((b / N) | 0)) <= 1 && Math.abs(a % N - b % N) <= 1;
    const rec = r => {
      if (++nodes > nodeCap) { aborted = true; return true; }
      if (r === N) { if (colCnt.every(x => x === K) && regCnt.every(x => x === K)) { found = stars.slice(); return true; } return false; }
      for (const o of choices) {
        const cells = o.map(c => r * N + c);
        if (cells.some(i => colCnt[i % N] >= K || regCnt[reg[i]] >= K || stars.some(j => touch(i, j)))) continue;
        cells.forEach(i => { colCnt[i % N]++; regCnt[reg[i]]++; stars.push(i); });
        if (rec(r + 1)) return true;
        cells.forEach(i => { colCnt[i % N]--; regCnt[reg[i]]--; stars.pop(); });
      }
      return false;
    };
    const t0 = performance.now(); rec(0);
    return { ok: !!found && !aborted, stars: found, nodes, ms: performance.now() - t0, aborted };
  };
  // --- Nonograms: the classic line solver (left-most / right-most overlap by dynamic programming) + backtracking ---
  window.BL_nonoDP = (rows, cols, nodeCap = 2e5) => {
    const R = rows.length, Cn = cols.length; let nodes = 0, aborted = false;
    // settle one line: for each cell, can it be filled / empty in some arrangement? (DP over positions and blocks)
    const settle = (clue, line) => {
      const n = line.length, k = clue.length;
      const canF = new Uint8Array(n), canE = new Uint8Array(n);
      const memo = new Map();
      const fits = (b, pos) => { // can blocks b.. be placed from pos to the end?
        const key = b * 64 + pos; if (memo.has(key)) return memo.get(key);
        let ok = false;
        if (b === k) { ok = true; for (let i = pos; i < n; i++) if (line[i] === 1) { ok = false; break; } }
        else for (let s = pos; s + clue[b] <= n; s++) {
          if (s > pos && line[s - 1] === 1) break;
          let good = true; for (let i = s; i < s + clue[b]; i++) if (line[i] === 0) { good = false; break; }
          if (!good) continue; if (s + clue[b] < n && line[s + clue[b]] === 1) continue;
          if (fits(b + 1, Math.min(n, s + clue[b] + 1))) { ok = true; break; }
        }
        memo.set(key, ok); return ok;
      };
      if (!fits(0, 0)) return null;
      // mark: walk every placement that fits (second pass collecting cells)
      const seen = new Set();
      const mark = (b, pos) => {
        const key = b * 64 + pos; if (seen.has(key)) return; seen.add(key);
        if (b === k) { for (let i = pos; i < n; i++) canE[i] = 1; return; }
        for (let s = pos; s + clue[b] <= n; s++) {
          if (s > pos && line[s - 1] === 1) break;
          let good = true; for (let i = s; i < s + clue[b]; i++) if (line[i] === 0) { good = false; break; }
          if (!good) continue; if (s + clue[b] < n && line[s + clue[b]] === 1) continue;
          if (!fits(b + 1, Math.min(n, s + clue[b] + 1))) continue;
          for (let i = pos; i < s; i++) canE[i] = 1; for (let i = s; i < s + clue[b]; i++) canF[i] = 1; if (s + clue[b] < n) canE[s + clue[b]] = 1;
          mark(b + 1, Math.min(n, s + clue[b] + 1));
        }
      };
      mark(0, 0);
      return line.map((v, i) => v >= 0 ? v : canF[i] && !canE[i] ? 1 : canE[i] && !canF[i] ? 0 : -1);
    };
    const grid = new Int8Array(R * Cn).fill(-1);
    const propagate = g => {
      for (let changed = true; changed;) {
        changed = false;
        for (let r = 0; r < R; r++) { const line = Array.from({ length: Cn }, (_, c) => g[r * Cn + c]); const out = settle(rows[r], line); if (!out) return false; out.forEach((v, c) => { if (v !== g[r * Cn + c]) { g[r * Cn + c] = v; changed = true; } }); }
        for (let c = 0; c < Cn; c++) { const line = Array.from({ length: R }, (_, r) => g[r * Cn + c]); const out = settle(cols[c], line); if (!out) return false; out.forEach((v, r) => { if (v !== g[r * Cn + c]) { g[r * Cn + c] = v; changed = true; } }); }
      }
      return true;
    };
    let guesses = 0, found = null;
    const rec = g => {
      if (++nodes > nodeCap) { aborted = true; return true; }
      if (!propagate(g)) return false;
      const i = g.indexOf(-1); if (i < 0) { found = g; return true; }
      for (const v of [1, 0]) { guesses++; const h = Int8Array.from(g); h[i] = v; if (rec(h)) return true; }
      return false;
    };
    const t0 = performance.now(); rec(grid);
    return { ok: !!found && !aborted, grid: found, nodes, guesses, ms: performance.now() - t0, aborted };
  };
  // --- Map colouring: DSATUR greedy (Brélaz 1979) and plain backtracking for the fewest colours ---
  window.BL_mapBT = (G, k, nodeCap = 5e6) => {
    const col = new Int8Array(G.R).fill(-1), order = [...Array(G.R).keys()].sort((a, b) => G.adj[b].length - G.adj[a].length); let nodes = 0, aborted = false;
    const rec = i => { if (++nodes > nodeCap) { aborted = true; return true; } if (i === order.length) return true; const r = order[i]; for (let c = 0; c < k; c++) { if (G.adj[r].some(j => col[j] === c)) continue; col[r] = c; if (rec(i + 1)) return true; col[r] = -1; } return false; };
    const t0 = performance.now(), ok = rec(0);
    return { ok: ok && !aborted, nodes, ms: performance.now() - t0, aborted };
  };
})();
