
/* ---------- seed: the same seed makes the same puzzles again ---------- */
const RND = Math.random;
function seeded(seed) { let s = seed >>> 0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function withSeed(fn) { const v = $("seed").value.trim(); if (!/^\d+$/.test(v)) return fn(); Math.random = seeded(+v); try { return fn(); } finally { Math.random = RND; } }
function makePuzzle(level) {
  const sol = randomSolution(); let p;
  if (/^\d+$/.test(level)) { p = new Array(N * N).fill(0); shuffle([...Array(N * N).keys()]).slice(0, Math.round(N * N * +level / 100)).forEach(i => p[i] = sol[i]); }
  else p = carve(sol, level);
  return { p, sol };
}
const sOpt = () => ({ top: Math.max(1, +$("startK").value), cap: +$("cap").value });
const mOpt = eng => ({ top: eng === "m3" ? 3 : 2, cap: +$("cap").value });
const tOpt = () => ({ dirs: $("dirs").value.split("").map(Number), start: +$("startK").value, cap: +$("cap").value });

/* ---------- names ---------- */
const DN = ["number", "row", "column", "box"];
const layerName = key => { const k = (key / N) | 0, u = key % N; return k === 0 ? `number ${sym(u + 1)}` : `${DN[k]} ${u + 1}`; };
const lineName = ([k, u, z]) => k === 0 ? `cell ${rc(u)}` : `number ${sym(z + 1)} in ${DN[k]} ${u + 1}`;
const ptName = q => `${sym(q % N + 1)} in ${rc((q / N) | 0)}`;
const ptList = (a, max = 8) => a.slice(0, max).map(ptName).join(", ") + (a.length > max ? ` and ${a.length - max} more` : "");

/* ---------- watch: state ---------- */
let P = null, T = null, CUM = null;
const V = { k: 0, timer: null, running: false };
function newPuzzle() {
  stop(); $("busy").classList.remove("hidden");
  setTimeout(() => {
    const n = +$("size").value, level = $("level").value;
    setSize(n);
    const z = withSeed(() => makePuzzle(level));
    P = { p: z.p, n, level };
    const eng = $("engine").value, run = eng === "tensor" ? q => tensorOL(q, tOpt()) : eng === "shared" ? q => sharedOL(q, sOpt()) : q => matrixOL(q, mOpt(eng));
    const t0 = performance.now(); const r = run(P.p); const ms = performance.now() - t0;
    T = eng === "tensor" ? tensorTrace(P.p, tOpt()) : eng === "shared" ? sharedTrace(P.p, sOpt()) : matrixTrace(P.p, mOpt(eng)); V.k = 0;
    // running totals for the stats boxes
    CUM = []; const b = [0, 0, 0, 0]; let gu = 0;
    for (const e of T.ev) { if (e.kind === "build" && !e.big) b[(e.key / N) | 0]++; if (e.kind === "vertical") e.layers.forEach((v, k) => b[k + 1] += v); if (e.kind === "sbuild" && !e.big) b[0] = Math.max(b[0], e.set.length); if (e.kind === "guess") gu++; CUM.push({ b: b.slice(), gu }); }
    $("busy").classList.add("hidden");
    const giv = P.p.filter(Boolean).length;
    $("info").innerHTML = `${n}×${n}, ${giv} givens (${Math.round(100 * giv / (n * n))}%) — ${/^\d+$/.test(level) ? "random cells, usually many answers" : "exactly one answer"}. ` +
      `Solved in <b>${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms</b> (one run, not warmed up), ${r.guesses.toLocaleString()} guesses, layers built: numbers ${r.built[0]}, rows ${r.built[1]}, columns ${r.built[2]}, boxes ${r.built[3]}` +
      `${T.full ? ` (the replay keeps the first ${(T.ev.length - 1).toLocaleString()} steps; the last step shows the finished grid)` : ""}.`;
    $("log").innerHTML = ""; layout(); show();
  }, 30);
}

/* ---------- the layer or line an event is about ---------- */
function region(e) {
  if (e.key != null) return { key: e.key };
  if (e.line) return { line: e.line };
  if (e.kind === "dead" && e.why) return e.why[0] === 4 ? { key: e.why[1] } : { line: e.why[0] === 0 ? [0, e.why[1], -1] : e.why };
  return null;
}
function inRegion(rg, i, z) {
  if (!rg) return false;
  const r = (i / N) | 0, c = i % N;
  if (rg.key != null) { const k = (rg.key / N) | 0, u = rg.key % N; return k === 0 ? z === u : k === 1 ? r === u : k === 2 ? c === u : boxOf(r, c) === u; }
  const [k, u, zz] = rg.line; if (k === 0) return i === u;
  return z === zz && (k === 1 ? r === u : k === 2 ? c === u : boxOf(r, c) === u);
}
function cellInRegion(rg, i) { if (!rg) return false; for (let z = 0; z < N; z++) if (inRegion(rg, i, z)) return true; return false; }
// the region's box in cube coordinates: [c0, c1, r0, r1, z0, z1]
function bounds(rg) {
  const A = [0, N - 1, 0, N - 1, 0, N - 1];
  const unitB = (k, u) => k === 1 ? [0, N - 1, u, u] : k === 2 ? [u, u, 0, N - 1] : [(u % (N / BC)) * BC, (u % (N / BC)) * BC + BC - 1, Math.floor(u / (N / BC)) * BR, Math.floor(u / (N / BC)) * BR + BR - 1];
  if (rg.key != null) { const k = (rg.key / N) | 0, u = rg.key % N; return k === 0 ? [0, N - 1, 0, N - 1, u, u] : [...unitB(k, u), 0, N - 1]; }
  const [k, u, z] = rg.line; if (k === 0) { const r = (u / N) | 0, c = u % N; return [c, c, r, r, 0, N - 1]; }
  return [...unitB(k, u), z, z];
}

/* ---------- board ---------- */
function layout() {
  const n = P.n, el = $("board");
  el.style.gridTemplateColumns = `repeat(${n},1fr)`;
  el.style.fontSize = `min(${n > 9 ? 2.8 : 4.4}vw, ${n > 9 ? 15 : 24}px)`;
  el.style.setProperty("--cfs", `min(${n > 9 ? 1.6 : 2.2}vw, ${n > 9 ? 8 : 10}px)`);
  el.innerHTML = [...Array(n * n).keys()].map(i => { const r = (i / n) | 0, c = i % n; return `<div class="${(c + 1) % BC === 0 && c < n - 1 ? "br" : ""}${(r + 1) % BR === 0 && r < n - 1 ? " bb" : ""}"></div>`; }).join("");
}
function drawBoard(e) {
  const n = P.n, cells = $("board").children, side = Math.ceil(Math.sqrt(n)), rg = region(e);
  const rm = new Set(e.rm), pl = new Set(e.pl), pick = new Set(e.kind === "guess" ? e.pts : []), bad = e.kind === "dead" || e.kind === "back";
  for (let i = 0; i < n * n; i++) {
    const el = cells[i], v = e.g[i], given = !!P.p[i];
    let cls = el.className.replace(/\b(given|placed|reg|regbad|now|pick)\b/g, "").trim();
    if (v) cls += given ? " given" : " placed";
    if (rg && (rg.key != null && ((rg.key / N) | 0) === 0 ? (e.cv[i] >>> (rg.key % N)) & 1 : cellInRegion(rg, i))) cls += bad ? " regbad" : " reg";
    if (v && pl.has(i * n + v - 1)) cls += " now";
    for (let z = 0; z < n; z++) if (pick.has(i * n + z)) { cls += " pick"; break; }
    el.className = cls.trim();
    if (v) { el.textContent = sym(v); continue; }
    if (n <= 9) el.innerHTML = `<div class="cd" style="grid-template-columns:repeat(${side},1fr)">${[...Array(n)].map((_, z) => {
      const on = (e.cv[i] >>> z) & 1, gone = rm.has(i * n + z), hl = rg && rg.key != null ? inRegion(rg, i, z) && ((rg.key / N) | 0) === 0 : rg && rg.line && rg.line[0] > 0 && inRegion(rg, i, z);
      return `<span class="${gone ? "rm" : hl && on ? "hl" : ""}">${on || gone ? sym(z + 1) : ""}</span>`; }).join("")}</div>`;
    else { let k = 0; for (let z = 0; z < n; z++) k += (e.cv[i] >>> z) & 1; el.innerHTML = `<span class="cnt">${k || "✗"}</span>`; }
  }
}

/* ---------- cube (same projection and drawing style as the MRV in 3D page) ---------- */
const C3 = { yaw: -0.65, pitch: 0.5, spread: 0.6, auto: true, dots: true, drag: null, raf: 0, dirty: true };
function cubeDraw() {
  const cv = $("cube3"), w = cv.clientWidth; if (!w || !P || !T) return;
  const dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr); }
  const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement), col = s => css.getPropertyValue(s).trim();
  ctx.fillStyle = col("--bg"); ctx.fillRect(0, 0, w, w);
  const n = P.n, NN = n * n, e = T.ev[V.k], g = e.g, rg = region(e), bad = e.kind === "dead" || e.kind === "back";
  const rm = new Set(e.rm), pl = new Set(e.pl), pick = new Set(e.kind === "guess" ? e.pts : []);
  const u = w * 0.5 / n, gap = u * (1 + C3.spread), half = (n - 1) / 2;
  const cy = Math.cos(C3.yaw), sy = Math.sin(C3.yaw), cp = Math.cos(C3.pitch), sp = Math.sin(C3.pitch), F = w * 2.2;
  const proj = (x, y, z) => { const X = x * cy - z * sy, Z1 = x * sy + z * cy, Y = y * cp - Z1 * sp, Z = y * sp + Z1 * cp, s = F / (F + Z); return [w / 2 + X * s, w / 2 - Y * s, Z, s]; };
  const items = [];
  for (let i = 0; i < NN; i++) {
    const x = (i % n - half) * u, zz = (((i / n) | 0) - half) * u;
    for (let z = 0; z < n; z++) {
      const q = i * n + z, placed = g[i] === z + 1, removed = rm.has(q), possible = !g[i] && ((e.cv[i] >>> z) & 1), inside = inRegion(rg, i, z);
      if (!placed && !removed && !(possible && (C3.dots || inside))) continue;
      const [px, py, pz, s] = proj(x, (z - half) * gap, zz);
      items.push({ px, py, pz, s, z, placed, removed, possible, inside, given: placed && !!P.p[i], now: pl.has(q), pick: pick.has(q) });
    }
  }
  const box = (b, color, lw) => {
    const [c0, c1, r0, r1, z0, z1] = b, xs = [(c0 - half - 0.5) * u, (c1 - half + 0.5) * u], zs = [(r0 - half - 0.5) * u, (r1 - half + 0.5) * u], ys = [(z0 - half) * gap - u * 0.55, (z1 - half) * gap + u * 0.55], P8 = [];
    for (const a of [0, 1]) for (const bb of [0, 1]) for (const c of [0, 1]) P8.push(proj(xs[a], ys[bb], zs[c]));
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    for (let a = 0; a < 8; a++) for (let bb = a + 1; bb < 8; bb++) if ([1, 2, 4].includes(a ^ bb)) { ctx.beginPath(); ctx.moveTo(P8[a][0], P8[a][1]); ctx.lineTo(P8[bb][0], P8[bb][1]); ctx.stroke(); }
  };
  box([0, n - 1, 0, n - 1, 0, n - 1], col("--line"), 1);
  if (rg) box(bounds(rg), bad ? col("--bad") : col("--accent"), 2.5);
  items.sort((a, b) => b.pz - a.pz);
  for (const it of items) {
    const h = hue(it.z + 1), size = u * 0.72 * it.s;
    ctx.globalAlpha = rg && !it.inside && !it.placed && !it.removed ? 0.28 : 1;
    if (it.removed) {
      ctx.strokeStyle = col("--bad"); ctx.lineWidth = 1.8; const r = Math.max(2, u * 0.22 * it.s);
      ctx.beginPath(); ctx.moveTo(it.px - r, it.py - r); ctx.lineTo(it.px + r, it.py + r); ctx.moveTo(it.px + r, it.py - r); ctx.lineTo(it.px - r, it.py + r); ctx.stroke();
    } else if (it.placed) {
      ctx.fillStyle = `hsl(${h} 70% ${it.given ? 42 : 62}%)`; ctx.fillRect(it.px - size / 2, it.py - size / 2, size, size);
      if (it.given) { ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = 1; ctx.strokeRect(it.px - size / 2, it.py - size / 2, size, size); }
      if (it.now || it.pick) { ctx.strokeStyle = col("--accent"); ctx.lineWidth = 2.2; const g2 = size * 1.35; ctx.strokeRect(it.px - g2 / 2, it.py - g2 / 2, g2, g2); }
    } else {
      ctx.fillStyle = `hsl(${h} 70% 55%)`; ctx.globalAlpha *= it.inside ? 0.95 : 0.5;
      ctx.beginPath(); ctx.arc(it.px, it.py, Math.max(1.2, u * (it.inside || it.pick ? 0.24 : 0.1) * it.s), 0, 7); ctx.fill();
      if (it.pick) { ctx.globalAlpha = 1; ctx.strokeStyle = col("--accent"); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(it.px, it.py, u * 0.36 * it.s, 0, 7); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  ctx.font = `600 ${Math.max(9, u * 0.7)}px -apple-system,Segoe UI,Roboto,sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const ex = (half + 0.6) * u;
  for (let z = 0; z < n; z++) {
    const [px, py] = proj(ex + u * 0.9, (z - half) * gap, -ex); let k = 0; for (let i = 0; i < NN; i++) if (g[i] === z + 1) k++;
    ctx.fillStyle = `hsl(${hue(z + 1)} 70% 45%)`; ctx.fillText(`${sym(z + 1)} ${k === n ? "✓" : k + "/" + n}`, px - u * 0.35, py);
  }
}
function cubeLoop() {
  if ($("view").value === "board") { C3.raf = 0; return; }
  if (C3.auto && !C3.drag && !document.hidden) { C3.yaw += 0.0035; C3.dirty = true; }
  if (C3.dirty) { C3.dirty = false; cubeDraw(); }
  C3.raf = requestAnimationFrame(cubeLoop);
}
function setView() {
  const v = $("view").value;
  ["cube3", "cubeCtl", "cubeCtl2", "legCube"].forEach(id => $(id).classList.toggle("hidden", v === "board"));
  $("board").classList.toggle("hidden", v === "cube");
  if (v !== "board" && !C3.raf) C3.raf = requestAnimationFrame(cubeLoop);
  C3.dirty = true;
}
function look(yaw, pitch, auto) { C3.yaw = yaw; C3.pitch = pitch; C3.auto = auto; $("cubeAuto").checked = auto; C3.dirty = true; }

/* ---------- replay ---------- */
function explain(e) {
  const L = e.key != null ? `the <b>${layerName(e.key)}</b> layer` : "";
  switch (e.kind) {
    case "start": return ["Start", `The givens are placed in the tensor: each one removes the other numbers of its cell and its number from its row, column and box.`];
    case "singles": return ["Lines with one point", `${e.pl.length ? `Placed ${ptList(e.pl)} — a line of the cube (a cell, or a number in a row, column or box) had only that point left.` : ""} ${e.rm.length ? `${e.rm.length} point${e.rm.length > 1 ? "s" : ""} removed from the tensor.` : ""}`];
    case "sbuild": return e.big ? ["Shared walk too long", `Walking the patterns of numbers <b>${e.set.map(z => sym(z + 1)).join(", ")}</b> together passed the cap (${e.n.toLocaleString()} patterns). It waits until they shrink.`]
      : ["Build the shared patterns", `One walk over the patterns for numbers <b>${e.set.map(z => sym(z + 1)).join(", ")}</b> together: <b>${e.n.toLocaleString()}</b> patterns, each kept once with the set of these numbers it fits. Support counts are set up for every point.`];
    case "shared": return ["Support counts", `${e.pl.length ? `Every live pattern of its number uses ${ptList(e.pl)}: placed. ` : ""}${e.rm.length ? `${e.rm.length} point${e.rm.length > 1 ? "s" : ""} lost their last supporting pattern (or were taken by what was placed): removed.` : ""} Only the patterns through changed cells were touched.`];
    case "vertical": return ["All vertical layers, in full", `Every open row, column and box layer is listed in full and stacked into one matrix per direction: rows <b>${e.n[0].toLocaleString()}</b>, columns <b>${e.n[1].toLocaleString()}</b>, boxes <b>${e.n[2].toLocaleString()}</b> options${e.big.some(Boolean) ? ` (${e.big.reduce((a, b) => a + b, 0)} layer(s) over 300,000 options wait until they shrink)` : ""}. Next: the top number layers.`];
    case "matmul": return ["Matrix product", `The ${DN[e.dir]} matrix: alive = (M·(1−x) = 0), count = aliveᵀ·M. ${e.pl.length ? `Every live option of its layer uses ${ptList(e.pl)}: placed. ` : ""}${e.rm.length ? `${e.rm.length} point${e.rm.length > 1 ? "s" : ""} no live option uses (or taken by what was placed): removed.` : ""}`];
    case "build": return e.big ? ["Layer too big", `${L[0].toUpperCase() + L.slice(1)} was the thinnest left, but it has more than ${e.n.toLocaleString()} options (the cap). It stays unbuilt until it shrinks.`]
      : ["Build a layer", `${L[0].toUpperCase() + L.slice(1)} is the thinnest layer in any direction: <b>${e.n.toLocaleString()}</b> option${e.n > 1 ? "s" : ""} listed.`];
    case "cut": return ["Cut and AND / OR", `${L[0].toUpperCase() + L.slice(1)}: ${e.cut && e.cut[0] !== e.cut[1] ? `options ${e.cut[0].toLocaleString()} → <b>${e.cut[1].toLocaleString()}</b>. ` : ""}${e.pl.length ? `Every option uses ${ptList(e.pl)}: placed. ` : ""}${e.rm.length ? `${e.rm.length} point${e.rm.length > 1 ? "s" : ""} no option uses (or taken by what was placed): removed.` : ""}`];
    case "guess": return ["Guess", e.key != null ? `Nothing more follows. Guess option <b>${e.t + 1} of ${e.of}</b> of ${L}, the smallest choice.` : `Nothing more follows. Guess <b>${ptName(e.pts[0])}</b>, point ${e.t + 1} of ${e.of} on the line ${lineName(e.line)} (the smallest choice).`];
    case "dead": { const w = e.why; const tx = !w ? "a contradiction" : w[0] === 0 ? `cell ${rc(w[1])} has no number left` : w[0] === 4 ? `the ${layerName(w[1])} layer has no option left` : `number ${sym(w[2] + 1)} has no place left in ${DN[w[0]]} ${w[1] + 1}`;
      return ["Dead end", `After the last guess, ${tx}. The guess was wrong.`]; }
    case "back": return ["Go back", `Undo the guess and try the next choice${e.t + 1 < e.of ? ` (${e.t + 2} of ${e.of})` : " — none left here, so go back further"}.`];
    case "done": return ["Solved", `Every cell is filled. ${T.guesses.toLocaleString()} guesses in all.`];
    case "fail": return ["Stopped", "No answer exists for these givens."];
  }
  return ["", ""];
}
const chip = e => { switch (e.kind) {
  case "singles": return e.pl.length ? [`single ×${e.pl.length}`, ""] : null;
  case "build": return [`${e.big ? "✗ " : "▣ "}${layerName(e.key)}${e.big ? "" : " (" + e.n + ")"}`, e.big ? "back" : "pick"];
  case "sbuild": return [`${e.big ? "✗" : "▣"} shared ${e.set.map(z => sym(z + 1)).join("")}${e.big ? "" : " (" + e.n + ")"}`, e.big ? "back" : "pick"];
  case "shared": return [`support${e.pl.length ? " +" + e.pl.length : ""}${e.rm.length ? " −" + e.rm.length : ""}`, ""];
  case "vertical": return [`▦ vertical ${e.n.reduce((a, b) => a + b, 0).toLocaleString()}`, "pick"];
  case "matmul": return [`M·x ${DN[e.dir]}${e.pl.length ? " +" + e.pl.length : ""}`, ""];
  case "cut": return [`✂ ${layerName(e.key)}${e.cut && e.cut[0] !== e.cut[1] ? " " + e.cut[1] : ""}${e.pl.length ? " +" + e.pl.length : ""}`, ""];
  case "guess": return [`? ${e.key != null ? layerName(e.key) + " #" + (e.t + 1) : ptName(e.pts[0])}`, "pick"];
  case "dead": return ["✗ dead end", "back"];
  case "back": return ["↩ back", "back"];
  case "done": return ["✓ solved", ""];
  default: return null; } };
function show(addChip) {
  const e = T.ev[V.k], c = CUM[V.k];
  drawBoard(e); C3.dirty = true;
  let pts = 0; for (let i = 0; i < e.g.length; i++) if (!e.g[i]) pts += popc(e.cv[i]);
  $("sPts").textContent = pts.toLocaleString(); $("sLeft").textContent = e.g.filter(v => !v).length;
  $("sBuilt").textContent = c.b.join("·"); $("sGuess").textContent = `${c.gu.toLocaleString()} · ${e.depth}`;
  const [ph, tx] = explain(e); $("stepNo").textContent = `Step ${V.k} of ${T.ev.length - 1} · ${ph}`; $("stepText").innerHTML = tx;
  if (addChip) { const ch = chip(e); if (ch) { const s = document.createElement("span"); s.textContent = ch[0]; if (ch[1]) s.className = ch[1]; const l = $("log"); l.appendChild(s); while (l.children.length > 250) l.removeChild(l.firstChild); l.scrollTop = l.scrollHeight; } }
}
const SPEEDS = { slow: 1200, normal: 500, fast: 120, turbo: 0 };
function stop() { if (V.timer) clearTimeout(V.timer); V.timer = null; V.running = false; $("playBtn").textContent = "▶ Play"; }
function tick() {
  if (!V.running) return;
  const turbo = $("speed").value === "turbo", batch = turbo ? Math.max(1, Math.ceil(T.ev.length / 300)) : 1;
  for (let b = 0; b < batch && V.k < T.ev.length - 1; b++) { V.k++; if (batch === 1 || b >= batch - 3) show(true); }
  if (batch > 1) show(false);
  if (V.k >= T.ev.length - 1) { stop(); return; }
  V.timer = setTimeout(tick, turbo ? 16 : SPEEDS[$("speed").value]);
}
$("playBtn").onclick = () => { if (!T) return; if (V.running) { stop(); return; } if (V.k >= T.ev.length - 1) { V.k = 0; $("log").innerHTML = ""; } V.running = true; $("playBtn").textContent = "⏸ Pause"; tick(); };
$("stepBtn").onclick = () => { if (!T) return; stop(); if (V.k < T.ev.length - 1) { V.k++; show(true); } };
$("backBtn").onclick = () => { if (!T) return; stop(); if (V.k > 0) { V.k--; const l = $("log"); if (l.lastChild) l.removeChild(l.lastChild); show(false); } };
$("resetBtn").onclick = () => { if (!T) return; stop(); V.k = 0; $("log").innerHTML = ""; show(false); };
$("endBtn").onclick = () => { if (!T) return; stop(); V.k = T.ev.length - 1; show(true); };
$("newBtn").onclick = newPuzzle;
$("view").addEventListener("change", setView);
$("cubeSpread").addEventListener("input", e => { C3.spread = +e.target.value; C3.dirty = true; });
$("cubeAuto").addEventListener("change", e => { C3.auto = e.target.checked; });
$("cubeDots").addEventListener("change", e => { C3.dots = e.target.checked; C3.dirty = true; });
$("vTop").onclick = () => look(0, 1.5, false);
$("vFront").onclick = () => look(0, 0, false);
$("vSide").onclick = () => look(Math.PI / 2, 0, false);
$("vTurn").onclick = () => look(-0.65, 0.5, true);
{
  const cv = $("cube3");
  cv.addEventListener("pointerdown", e => { C3.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!C3.drag) return;
    C3.yaw += (e.clientX - C3.drag.x) * 0.01; C3.pitch = Math.max(-1.5, Math.min(1.5, C3.pitch + (e.clientY - C3.drag.y) * 0.01));
    C3.drag = { x: e.clientX, y: e.clientY }; C3.dirty = true;
  });
  ["pointerup", "pointercancel"].forEach(t => cv.addEventListener(t, () => { C3.drag = null; }));
  window.addEventListener("resize", () => { C3.dirty = true; });
}

/* ---------- race ---------- */
const METHODS = [
  { key: "tAll", name: "Tensor OL · all four directions", color: "#2455c7", run: p => tensorOL(p, { ...tOpt(), dirs: [1, 1, 1, 1] }) },
  { key: "tNum", name: "Tensor OL · number layers only", color: "#6f98ff", run: p => tensorOL(p, { ...tOpt(), dirs: [1, 0, 0, 0] }) },
  { key: "tUnit", name: "Tensor OL · row, column, box layers", color: "#8a4fd0", run: p => tensorOL(p, { ...tOpt(), dirs: [0, 1, 1, 1] }) },
  { key: "sh", name: "Shared number patterns · support counts", color: "#00897b", run: p => sharedOL(p, sOpt()) },
  { key: "x2", name: "Matrix OL · top 2 + full vertical (matmul)", color: "#c2185b", run: p => matrixOL(p, { top: 2, cap: +$("cap").value }) },
  { key: "x3", name: "Matrix OL · top 3 + full vertical (matmul)", color: "#f06292", run: p => matrixOL(p, { top: 3, cap: +$("cap").value }) },
  // exactly the Speed page's lean method, as is (top 2, fewest open cells first, cap 300,000)
  { key: "lean", name: "Lean OL · Speed page (as is)", color: "#e08a00", run: p => leanLayers(p, { start: 2, order: "cells", cap: 300000 }) },
  { key: "dlx", name: "Dancing Links (Algorithm X)", color: "#2e9e57", run: p => dlxSolve(p) },
  { key: "mrv", name: "MRV backtracking", color: "#6a6e77", run: p => mrvSolve(p) },
];
$("methods").innerHTML = METHODS.map(m => `<label><input type="checkbox" id="use_${m.key}" checked><span class="sw" style="background:${m.color}"></span>${m.name}</label>`).join("");
$("rLevel").innerHTML = $("level").innerHTML;
const sleep0 = () => new Promise(r => setTimeout(r, 0));
const median = a => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const fmt = ms => !isFinite(ms) ? "–" : ms >= 100 ? ms.toFixed(0) + " ms" : ms >= 10 ? ms.toFixed(1) + " ms" : ms >= 1 ? ms.toFixed(2) + " ms" : ms >= 0.1 ? ms.toFixed(3) + " ms" : (ms * 1000).toFixed(0) + " µs";
function timeIt(fn) {
  let t0 = performance.now(); const res = fn(); let ms = performance.now() - t0;
  if (ms < 4) { const reps = Math.min(400, Math.ceil(8 / Math.max(ms, 0.01))); t0 = performance.now(); for (let k = 0; k < reps; k++) fn(); ms = (performance.now() - t0) / reps; }
  return { res, ms };
}
function validGrid(g, p) {
  const NN = N * N, full = (1 << (N + 1)) - 2;
  if (!g || g.length !== NN) return false;
  for (let i = 0; i < NN; i++) { if (!(g[i] >= 1 && g[i] <= N)) return false; if (p[i] && g[i] !== p[i]) return false; }
  const r = new Int32Array(N), c = new Int32Array(N), b = new Int32Array(N);
  for (let i = 0; i < NN; i++) { const bit = 1 << g[i]; r[(i / N) | 0] |= bit; c[i % N] |= bit; b[boxOf((i / N) | 0, i % N)] |= bit; }
  for (let k = 0; k < N; k++) if (r[k] !== full || c[k] !== full || b[k] !== full) return false;
  return true;
}
let raceStop = false;
$("raceStop").onclick = () => { raceStop = true; };
$("raceBtn").onclick = async () => {
  const use = METHODS.filter(m => $("use_" + m.key).checked); if (!use.length) return;
  const n = +$("rSize").value, level = $("rLevel").value, count = +$("rCount").value;
  stop(); raceStop = false; $("raceBtn").disabled = true; $("raceStop").disabled = false; $("rTbl").innerHTML = ""; $("rNote").textContent = "";
  const prog = f => $("prog").style.width = (100 * f).toFixed(1) + "%";
  setSize(n);
  // all puzzles first (the seed, if given, makes the same set again), then every method on the same puzzles
  const puzzles = [];
  const v = $("seed").value.trim(); if (/^\d+$/.test(v)) Math.random = seeded(+v);
  try { for (let k = 0; k < count && !raceStop; k++) { $("rStatus").textContent = `Making puzzle ${k + 1} of ${count}…`; prog(0.3 * k / count); await sleep0(); puzzles.push(makePuzzle(level).p); } }
  finally { Math.random = RND; }
  const res = {}; use.forEach(m => res[m.key] = []);
  $("rStatus").textContent = "Warming up…"; await sleep0();
  for (const m of use) m.run(puzzles[0]);
  for (let k = 0; k < puzzles.length && !raceStop; k++) {
    for (const m of use) { $("rStatus").textContent = `Puzzle ${k + 1} of ${puzzles.length}: ${m.name}…`; await sleep0(); const t = timeIt(() => m.run(puzzles[k])); res[m.key].push({ ms: t.ms, ok: validGrid(t.res.grid, puzzles[k]), gu: t.res.guesses, b: t.res.built }); }
    prog(0.3 + 0.7 * (k + 1) / puzzles.length);
  }
  const done = Math.min(...use.map(m => res[m.key].length));
  const best = Math.min(...use.map(m => median(res[m.key].slice(0, done).map(x => x.ms))));
  const giv = mean(puzzles.slice(0, done).map(p => p.filter(Boolean).length));
  $("rTbl").innerHTML = `<tr><th>Method</th><th>Solved</th><th>Median</th><th>Mean</th><th>Slowest</th><th>Guesses (median)</th><th>Layers built N·R·C·B (median)</th></tr>` + use.map(m => {
    const R = res[m.key].slice(0, done), ms = R.map(x => x.ms), md = median(ms), t = m.key.startsWith("t") || m.key.startsWith("x") || m.key === "sh";
    return `<tr><td><span class="sw" style="background:${m.color}"></span>${m.name}</td><td>${R.filter(x => x.ok).length} of ${R.length}</td><td class="${md === best ? "best" : ""}">${fmt(md)}</td><td>${fmt(mean(ms))}</td><td>${fmt(Math.max(...ms))}</td>` +
      `<td>${t || m.key === "mrv" || m.key === "dlx" ? median(R.map(x => x.gu)).toLocaleString() : "–"}</td><td>${t ? [0, 1, 2, 3].map(d => median(R.map(x => x.b[d]))).join("·") : "–"}</td></tr>`; }).join("");
  $("rStatus").textContent = `${n}×${n}, ${$("rLevel").selectedOptions[0].textContent}: ${done} puzzle${done > 1 ? "s" : ""}, ${giv.toFixed(1)} givens on average (${(100 * giv / (n * n)).toFixed(0)}%).${raceStop ? " Stopped early." : ""}`;
  $("rNote").textContent = `Tensor settings: start top ${$("startK").value}, cap ${(+$("cap").value).toLocaleString()}. Matrix: top 2 or 3 number layers (same cap) + every row, column and box layer in full. Shared: starts with the top numbers from the Start menu (at least 1); its "layers built" = how many shared walks. MRV and Dancing Links stop at 5 million steps; a stopped run counts as not solved. For MRV and Dancing Links the "guesses" column is their search nodes.`;
  $("raceBtn").disabled = false; $("raceStop").disabled = true; prog(1);
  if (P) setSize(P.n);                               // the replay above keeps its own size
};
$("engine").onchange = () => $("dirs").classList.toggle("dim", $("engine").value !== "tensor");
setView(); newPuzzle();
