/* ---------- the race ---------- */
setSize(9);
let LEAN = { start: 2, order: "cells", cap: 200 };
const METHODS = [
  { key: "lean", name: "Lean OL · cap 200 (build · cut · AND)", color: "--m1", on: true, run: p => leanLayers(p, LEAN) },
  // exactly the Speed page's lean method, as is: same code, same settings (top 2 layers, fewest open cells first, cap 300,000); the menus here do not change it
  { key: "leanBig", name: "Lean OL · Speed page (as is)", color: "--m2", on: true, run: p => leanLayers(p, { start: 2, order: "cells", cap: 300000 }) },
  // lean with a dynamic cap: starts with the cap from the menu, builds a layer in full once its size bound shows it fits in 300,000
  { key: "leanDyn", name: "Lean OL · dynamic cap 200 → full", color: "--m3", on: true, run: p => leanLayersDyn(p, { ...LEAN, capHi: 300000 }) },
  { key: "dlx", name: "Dancing Links (Algorithm X)", color: "--m4", on: true, run: p => dlxSolve(p) },
  { key: "mrv", name: "MRV backtracking", color: "--m5", on: true, run: p => mrvSolve(p) },
];
$("methods").innerHTML = METHODS.map(m => `<label><input type="checkbox" id="use_${m.key}" ${m.on ? "checked" : ""}><span class="sw" style="background:var(${m.color})"></span><span id="lbl_${m.key}">${m.name.replace(/ \(.*/, "")}</span></label>`).join("");
// the chosen cap is part of the lean method's name, so charts and tables say which cap was used
function setLeanName() { const c = (+$("capSel").value).toLocaleString(); METHODS[0].name = `Lean OL · cap ${c} (build · cut · AND)`; $("lbl_lean").textContent = `Lean OL · cap ${c}`;
  const dm = METHODS.find(m => m.key === "leanDyn"); dm.name = `Lean OL · dynamic cap ${c} → full`; $("lbl_leanDyn").textContent = dm.name; }
$("capSel").onchange = setLeanName; setLeanName();
const sleep0 = () => new Promise(r => setTimeout(r, 0));
const median = a => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const fmt = ms => !isFinite(ms) ? "–" : ms >= 100 ? ms.toFixed(0) : ms >= 10 ? ms.toFixed(1) : ms >= 1 ? ms.toFixed(2) : ms >= 0.1 ? ms.toFixed(3) : (ms * 1000).toFixed(0) + " µs";
const fmtU = ms => !isFinite(ms) ? "–" : ms >= 1 ? fmt(ms) + " ms" : fmt(ms).includes("µs") ? fmt(ms) : fmt(ms) + " ms";
function timeIt(fn) {
  let t0 = performance.now(); const res = fn(); let ms = performance.now() - t0;
  if (ms < 4) { const reps = Math.min(400, Math.ceil(8 / Math.max(ms, 0.01))); t0 = performance.now(); for (let k = 0; k < reps; k++) fn(); ms = (performance.now() - t0) / reps; }
  return { res, ms };
}
// the Givens menu shows how many cells each choice keeps on the chosen board
function fillLabels() {
  const n = +$("size").value, NN = n * n;
  for (const o of $("fill").options) o.textContent = o.value === "one" ? `One cell for each number (${n} givens)` : `${o.value}% of cells (${Math.round(NN * +o.value / 100)})${o.value === "34" && n === 9 ? " — as many as Speed page Hard" : ""}`;
}
$("size").onchange = fillLabels; fillLabels();
const sameGrid = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
const FILLS = ["one", "5", "10", "15", "20", "25", "30", "34", "40", "50", "60", "70", "80"];
const fillName = f => f === "one" ? "1 per number" : f + "%";
// a puzzle: a random full grid with some cells kept
function makeGivens(fill) {
  const NN = N * N, sol = randomSolution(), p = new Array(NN).fill(0);
  if (fill === "one") { for (let d = 1; d <= N; d++) { const cells = []; for (let i = 0; i < NN; i++) if (sol[i] === d) cells.push(i); const i = cells[Math.floor(Math.random() * cells.length)]; p[i] = d; } }
  else shuffle([...Array(NN).keys()]).slice(0, Math.round(NN * +fill / 100)).forEach(i => p[i] = sol[i]);
  return { p, sol, givens: p.filter(Boolean).length };
}
// valid = 1…N once in every row, column and box, and every given kept
function validGrid(g, p) {
  const NN = N * N, full = (1 << (N + 1)) - 2;
  if (!g || g.length !== NN) return false;
  for (let i = 0; i < NN; i++) { if (!(g[i] >= 1 && g[i] <= N)) return false; if (p[i] && g[i] !== p[i]) return false; }
  const r = new Int32Array(N), c = new Int32Array(N), b = new Int32Array(N);
  for (let i = 0; i < NN; i++) { const bit = 1 << g[i]; r[(i / N) | 0] |= bit; c[i % N] |= bit; b[boxOf((i / N) | 0, i % N)] |= bit; }
  for (let k = 0; k < N; k++) if (r[k] !== full || c[k] !== full || b[k] !== full) return false;
  return true;
}
let stop = false, DATA = null, RECORD = [];
// keep every timed puzzle: size, fill, givens, each method's time, and whether lean and MRV found the same grid
function record(fill, use, done) {
  done.forEach((z, k) => RECORD.push({ n: N, fill, k: k + 1, givens: z.givens, ms: Object.fromEntries(use.map(m => [m.key, z.res[m.key].ms])), names: use.map(m => [m.key, m.name.replace(/ \(.*/, "")]),
    sameLM: z.res.lean && z.res.mrv ? sameGrid(z.res.lean.grid, z.res.mrv.grid) : null, sameAll: use.every(m => sameGrid(z.res[m.key].grid, z.res[use[0].key].grid)) }));
  $("csvBtn").disabled = !RECORD.length;
}
$("csvBtn").onclick = () => {
  if (!RECORD.length) return;
  const keys = [...new Set(RECORD.flatMap(r => r.names.map(x => x[0])))], names = Object.fromEntries(RECORD.flatMap(r => r.names));
  const lines = [["size", "givens setting", "puzzle", "givens", ...keys.map(k => names[k] + " (ms)"), "lean = MRV grid", "all methods same grid"].join(",")];
  for (const r of RECORD) lines.push([`${r.n}x${r.n}`, fillName(r.fill), r.k, r.givens, ...keys.map(k => r.ms[k] != null ? r.ms[k].toFixed(4) : ""), r.sameLM == null ? "" : r.sameLM ? "yes" : "no", r.sameAll ? "yes" : "no"].join(","));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = `few-givens-times-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
$("stopBtn").onclick = () => { stop = true; };
async function measure(fill, count, use, lo, hi, tag) {
  const puzzles = [];
  for (let k = 0; k < count && !stop; k++) {
    if (k % 5 === 0) { $("status").textContent = `${tag}Making puzzle ${k + 1} of ${count}…`; $("prog").style.width = (lo + (hi - lo) * 0.15 * k / count) + "%"; await sleep0(); }
    puzzles.push({ ...makeGivens(fill), res: {} });
  }
  if (puzzles.length) for (const m of use) m.run(puzzles[0].p);   // warm up
  const jobs = []; for (const m of use) for (const z of puzzles) jobs.push([m, z]);
  for (let j = 0; j < jobs.length && !stop; j++) {
    const [m, z] = jobs[j];
    if (j % 3 === 0) { $("status").textContent = `${tag}${m.name.replace(/ \(.*/, "")}: puzzle ${puzzles.indexOf(z) + 1} of ${puzzles.length}`; $("prog").style.width = (lo + (hi - lo) * (0.15 + 0.85 * j / jobs.length)) + "%"; await sleep0(); }
    const { res, ms } = timeIt(() => m.run(z.p));
    z.res[m.key] = { ms, ok: validGrid(res.grid, z.p), grid: res.grid, guesses: res.guesses ?? null, built: res.built ?? null, layers: res.layers ?? null };   // lean keeps no counts: null = not counted
  }
  return puzzles.filter(z => use.every(m => z.res[m.key]));
}
function startRun() {
  const use = METHODS.filter(m => $("use_" + m.key).checked);
  if (!use.length) { $("status").textContent = "Pick at least one method."; return null; }
  LEAN = { start: +$("startK").value, order: $("orderBy").value, cap: +$("capSel").value }; setLeanName();
  setSize(+$("size").value);
  stop = false; $("run").disabled = $("runAll").disabled = true; $("stopBtn").disabled = false;
  return use;
}
const endRun = () => { $("prog").style.width = "100%"; $("run").disabled = $("runAll").disabled = false; $("stopBtn").disabled = true; };
$("run").onclick = async () => {
  const fill = $("fill").value, count = +$("count").value, use = startRun(); if (!use) return;
  $("out").classList.add("hidden"); RECORD = []; $("csvBtn").disabled = true;
  const done = await measure(fill, count, use, 0, 100, "");
  endRun();
  $("status").textContent = stop ? `Stopped — ${done.length} puzzles measured.` : `Done — ${done.length} puzzles, ${N}×${N}, ${fillName(fill)}.`;
  DATA = { n: N, fill, use, puzzles: done }; record(fill, use, done);
  if (done.length) render();
};
$("runAll").onclick = async () => {
  const count = +$("count").value, use = startRun(); if (!use) return;
  const rows = []; $("outAll").classList.remove("hidden"); $("chart3").innerHTML = ""; $("tblAll").innerHTML = ""; RECORD = []; $("csvBtn").disabled = true;
  for (let k = 0; k < FILLS.length && !stop; k++) {
    const f = FILLS[k], done = await measure(f, count, use, 100 * k / FILLS.length, 100 * (k + 1) / FILLS.length, `${fillName(f)} — `);
    if (!done.length) break;
    const row = { f, k: done.length, givens: mean(done.map(z => z.givens)), ok: done.every(z => use.every(m => z.res[m.key].ok)), m: {} };
    for (const m of use) { const r = done.map(z => z.res[m.key]); row.m[m.key] = { med: median(r.map(x => x.ms)) }; }
    if (use.some(m => m.key === "lean") && use.some(m => m.key === "mrv")) { const S = done.filter(z => sameGrid(z.res.lean.grid, z.res.mrv.grid)); row.sameLM = S.length; row.sameLeanMs = median(S.map(z => z.res.lean.ms)); row.sameMrvMs = median(S.map(z => z.res.mrv.ms)); }
    record(f, use, done);
    rows.push(row); drawLines(rows, use);
  }
  endRun();
  $("status").textContent = stop ? `Stopped — ${rows.length} fills measured.` : `Done — all ${rows.length} fills, ${N}×${N}.`;
};
function drawLines(rows, use) {
  const mk = { lean: "circle", leanBig: "circle", leanDyn: "diamond", dlx: "square", mrv: "triangle" }, nX = FILLS.length;
  const panel = (keys, title) => {
    const W = 380, H = 260, l = 46, r = 16, t = 28, b = 44;
    const vals = rows.flatMap(row => keys.map(k => row.m[k].med)), top = Math.max(...vals) || 1;
    const step = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(x => top / x <= 5) || 5000, ymax = Math.ceil(top / step) * step;
    const X = k => l + k / (nX - 1) * (W - l - r), Y = v => H - b - v / ymax * (H - t - b);
    let s = `<svg viewBox="0 0 ${W} ${H}"><text class="t" x="${W / 2}" y="16" text-anchor="middle">${title}</text>`;
    for (let v = 0; v <= ymax + 1e-9; v += step) s += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${l - 5}" y="${Y(v) + 4}" text-anchor="end">${+v.toPrecision(3)}</text>`;
    FILLS.forEach((f, k) => { s += `<text x="${X(k)}" y="${H - b + 15}" text-anchor="middle" font-size="10">${f === "one" ? "1/n" : f}</text>`; });
    s += `<text x="${(l + W - r) / 2}" y="${H - 6}" text-anchor="middle">givens (1/n = one per number, then % of cells)</text><text transform="translate(11 ${(t + H - b) / 2}) rotate(-90)" text-anchor="middle">median ms per puzzle</text>`;
    for (const key of keys) {
      const m = METHODS.find(x => x.key === key), col = `var(${m.color})`, pts = rows.map(row => [X(FILLS.indexOf(row.f)), Y(row.m[key].med)]);
      s += `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="${col}" stroke-width="${key === "lean" ? 3 : 2}" ${key === "leanBig" ? 'stroke-dasharray="6 4"' : ""}/>`;
      for (const [x, y] of pts) s += mk[key] === "square" ? `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="${col}"/>` : mk[key] === "diamond" ? `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="${col}" transform="rotate(45 ${x} ${y})"/>` : mk[key] === "triangle" ? `<path d="M${x} ${y - 5}L${x + 5} ${y + 4}L${x - 5} ${y + 4}Z" fill="${col}"/>` : `<circle cx="${x}" cy="${y}" r="4.5" fill="${col}"/>`;
    }
    return s + `</svg>`;
  };
  const keys = use.map(m => m.key), noBig = keys.filter(k => k !== "leanBig");
  $("chart3").innerHTML = keys.includes("leanBig") && noBig.length
    ? panel(keys, `All methods ticked · ${N}×${N}`) + panel(noBig, "Without the Speed page lean (zoom)")
    : `<div style="max-width:600px;margin:0 auto">${panel(keys, `Median time by fill · ${N}×${N}`)}</div>`;
  $("legend3").innerHTML = use.map(m => `<span><i style="background:var(${m.color})"></i>${m.name.replace(/ \(.*/, "")}</span>`).join("");
  const best = row => Math.min(...keys.map(k => row.m[k].med));
  $("tblAll").innerHTML = `<tr><th>Givens</th><th>Puzzles</th><th>Avg givens</th>${use.map(m => `<th>${m.name.replace(/ \(.*/, "").replace("option layers", "OL")}</th>`).join("")}${rows[0] && rows[0].sameLM != null ? "<th>Lean = MRV answer</th><th>Same answer: lean / MRV (median)</th>" : ""}<th>Valid</th></tr>` +
    rows.map(row => `<tr><td>${fillName(row.f)}</td><td>${row.k}</td><td>${row.givens.toFixed(1)}</td>${keys.map(k => `<td class="${row.m[k].med === best(row) ? "best" : ""}">${fmtU(row.m[k].med)}</td>`).join("")}${row.sameLM != null ? `<td>${row.sameLM} of ${row.k}</td><td>${row.sameLM ? `<span class="${row.sameLeanMs < row.sameMrvMs ? "best" : ""}">${fmtU(row.sameLeanMs)}</span> / <span class="${row.sameMrvMs < row.sameLeanMs ? "best" : ""}">${fmtU(row.sameMrvMs)}</span>` : "–"}</td>` : ""}<td class="${row.ok ? "" : "warn"}">${row.ok ? "all" : "some not valid"}</td></tr>`).join("");
}
function render() {
  const { n, fill, use, puzzles } = DATA;
  $("out").classList.remove("hidden");
  const S = use.map(m => { const r = puzzles.map(z => z.res[m.key]), ms = r.map(x => x.ms);
    return { m, n: r.length, ok: r.filter(x => x.ok).length, med: median(ms), avg: mean(ms), max: Math.max(...ms), guessed: r.some(x => x.guesses == null) ? null : r.filter(x => x.guesses > 0).length, guesses: r.some(x => x.guesses == null) ? null : mean(r.map(x => x.guesses)), built: r[0].built == null ? null : median(r.map(x => x.built)), layers: r[0].layers == null ? null : mean(r.map(x => x.layers)) }; });
  const bestMed = Math.min(...S.map(s => s.med));
  $("tbl").innerHTML = `<tr><th>Method</th><th>Valid</th><th>Median</th><th>Average</th><th>Slowest</th><th>Guesses / nodes (avg)</th><th>Options built (median)</th></tr>` +
    S.map(s => `<tr><td><span class="sw" style="background:var(${s.m.color})"></span>${s.m.name}</td><td class="${s.ok < s.n ? "warn" : ""}">${s.ok}/${s.n}</td><td class="${s.med === bestMed ? "best" : ""}">${fmtU(s.med)}</td><td>${fmtU(s.avg)}</td><td>${fmtU(s.max)}</td><td>${s.guesses == null ? "–" : s.guesses.toFixed(1)}</td><td>${s.built == null ? "–" : Math.round(s.built).toLocaleString()}${s.layers == null ? "" : ` <span class="note">(${s.layers.toFixed(1)} layers)</span>`}</td></tr>`).join("");
  drawBars(S);
  const f = [], giv = mean(puzzles.map(z => z.givens)), fastest = S.find(s => s.med === bestMed);
  f.push(`${puzzles.length} puzzles ${n}×${n}, ${fillName(fill)} (${giv.toFixed(1)} givens on average). ${S.every(s => s.ok === s.n) ? "Every method found a valid grid for every puzzle." : "<b>Some answers were not valid — see the table.</b>"}`);
  f.push(`Fastest median: <b>${fastest.m.name.replace(/ \(.*/, "")}</b> (${fmtU(fastest.med)}).`);
  const L = S.find(s => s.m.key === "lean");
  if (L) for (const o of S) if (o !== L) { const r = o.med / L.med; f.push(`${L.m.name.replace(/ \(.*/, "")} vs ${o.m.name.replace(/ \(.*/, "")}: ${fmtU(L.med)} vs ${fmtU(o.med)} — it is ${r >= 1 ? `<b>${r.toFixed(1)}× faster</b>` : `${(1 / r).toFixed(1)}× slower`} at the median; slowest ${fmtU(L.max)} vs ${fmtU(o.max)}.`); }
  if (L) f.push(`The lean methods keep no counts at all — no guesses, options or layers are counted — so their count columns show –.`);
  $("find").innerHTML = f.map(x => `<li>${x}</li>`).join("");
  $("pick").innerHTML = puzzles.map((z, k) => `<option value="${k}">#${k + 1} · ${z.givens} givens</option>`).join("");
  $("whose").innerHTML = use.map(m => `<option value="${m.key}">${m.name.replace(/ \(.*/, "")}</option>`).join("");
  $("vs").innerHTML = `<option value="">— nothing —</option>` + use.map(m => `<option value="${m.key}">${m.name.replace(/ \(.*/, "")}</option>`).join("");
  if (use.length > 1) $("vs").value = (use.find(m => m.key === "mrv") && use[0].key !== "mrv" ? "mrv" : use[1].key);
  const short = m => m.name.replace(/ \(.*/, "");
  const pairs = []; for (let x = 0; x < use.length; x++) for (let y = x + 1; y < use.length; y++) pairs.push([use[x], use[y]]);
  const cellT = (a, b, set) => { if (!set.length) return "<td>–</td><td>–</td>"; const ma = median(set.map(z => z.res[a.key].ms)), mb = median(set.map(z => z.res[b.key].ms)); return `<td class="${ma < mb ? "best" : ""}">${fmtU(ma)}</td><td class="${mb < ma ? "best" : ""}">${fmtU(mb)}</td>`; };
  $("sameT").innerHTML = `<tr><th>Pair (A · B)</th><th>Same answer</th><th>A time</th><th>B time</th><th>Different answer</th><th>A time</th><th>B time</th></tr>` +
    pairs.map(([a, b]) => { const same = puzzles.filter(z => sameGrid(z.res[a.key].grid, z.res[b.key].grid)), diff = puzzles.filter(z => !sameGrid(z.res[a.key].grid, z.res[b.key].grid));
      return `<tr><td>${short(a)} · ${short(b)}</td><td>${same.length} of ${puzzles.length}</td>${cellT(a, b, same)}<td>${diff.length} of ${puzzles.length}</td>${cellT(a, b, diff)}</tr>`; }).join("");
  $("agree").innerHTML = `<tr><th></th>${use.map(m => `<th>${short(m)}</th>`).join("")}</tr>` +
    use.map(a => `<tr><td>${short(a)}</td>${use.map(b => a === b ? "<td>–</td>" : `<td>${puzzles.filter(z => sameGrid(z.res[a.key].grid, z.res[b.key].grid)).length} of ${puzzles.length}</td>`).join("")}</tr>`).join("");
  showPuzzle();
}
$("pick").onchange = showPuzzle; $("whose").onchange = showPuzzle; $("vs").onchange = showPuzzle;
function showPuzzle() {
  const { n, use, puzzles } = DATA, z = puzzles[+$("pick").value], who = $("whose").value; if (!z) return;
  const g = z.res[who].grid || z.p, el = $("board"), vs = $("vs").value, h = vs && vs !== who ? z.res[vs].grid : null;
  const [br, bc] = boxShape(n);
  el.style.gridTemplateColumns = `repeat(${n},1fr)`; el.style.fontSize = `min(${n > 9 ? 2.6 : 4}vw,${n > 9 ? 14 : 22}px)`;
  el.innerHTML = g.map((v, i) => { const r = (i / n) | 0, c = i % n; return `<div class="${z.p[i] ? "s0" : "s1"}${h && h[i] !== g[i] ? " sd" : ""}${(c + 1) % bc === 0 && c < n - 1 ? " br" : ""}${(r + 1) % br === 0 && r < n - 1 ? " bb" : ""}">${v || ""}</div>`; }).join("");
  const same = use.filter(m => z.res[m.key].grid && z.res[m.key].grid.every((v, i) => v === g[i])).map(m => m.name.replace(/ \(.*/, ""));
  $("pickNote").innerHTML = use.map(m => `${m.name.replace(/ \(.*/, "")}: <b>${fmtU(z.res[m.key].ms)}</b>${z.res[m.key].guesses ? ` (${z.res[m.key].guesses} ${m.key.startsWith("lean") ? "guesses" : "nodes"})` : ""}`).join(" · ") +
    `<br>This answer was found by: <b>${same.join(", ")}</b>.` +
    (h ? (() => { const d = g.filter((v, i) => v !== h[i]).length, wn = use.find(m => m.key === who).name.replace(/ \(.*/, ""), vn = use.find(m => m.key === vs).name.replace(/ \(.*/, "");
      return d ? ` ${wn} and ${vn} found <b>different answers</b>: ${d} of ${n * n} cells differ (shaded).` : ` ${wn} and ${vn} found <b>the same answer</b>.`; })() : "");
}
function drawBars(S) {
  const W = 640, row = 34, H = S.length * row + 34, x0 = 150, x1 = W - 20;
  const all = S.flatMap(s => [s.med, s.max]).filter(v => v > 0), lo = Math.pow(10, Math.floor(Math.log10(Math.min(...all)))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...all))));
  const X = v => x0 + (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo) || 1) * (x1 - x0);
  let s = `<svg viewBox="0 0 ${W} ${H}">`;
  for (let e = Math.log10(lo); e <= Math.log10(hi) + 1e-9; e++) { const v = Math.pow(10, e), x = X(v); s += `<line x1="${x}" x2="${x}" y1="4" y2="${H - 24}" stroke="var(--line)"/><text x="${x}" y="${H - 8}" text-anchor="middle">${fmtU(v)}</text>`; }
  S.forEach((r, k) => { const y = 8 + k * row;
    s += `<text x="${x0 - 8}" y="${y + 15}" text-anchor="end" style="fill:var(--ink)">${r.m.name.replace(/ \(.*/, "").replace("option layers", "OL")}</text>`;
    s += `<rect x="${x0}" y="${y + 2}" width="${Math.max(2, X(r.med) - x0)}" height="18" rx="4" fill="var(${r.m.color})"/>`;
    s += `<circle cx="${X(r.avg)}" cy="${y + 11}" r="4.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5"/>`;
    s += `<line x1="${X(r.max)}" x2="${X(r.max)}" y1="${y}" y2="${y + 22}" stroke="var(--ink)" stroke-width="2"/>`; });
  $("chart1").innerHTML = s + `</svg>`;
}
