// Lean as it is vs "smart retry": a too-big layer is tried again only when its size bound has shrunk 4× since it was marked (patched COPY; pages unchanged).
import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8").split("\r\n").join("\n"); const js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
const rep = (t, a, b) => { if (t.split(a).length !== 2) throw new Error("patch failed: " + a.slice(0, 60)); return t.replace(a, b); };
let pj = js;
pj = rep(pj, "big: new Uint8Array(N + 1), left: NN });", "big: new Uint8Array(N + 1), bigAt: new Float64Array(N + 1), left: NN });");
pj = rep(pj, "big: S.big.slice(), left: S.left });", "big: S.big.slice(), bigAt: S.bigAt.slice(), left: S.left });");
pj = rep(pj, "      if (S.done[d] || S.T[d] || S.big[d]) continue;\n      let pl = 0, open = 0;", "      if (S.done[d] || S.T[d]) continue;\n      if (S.big[d]) { const e0 = estimate(S, d); if (e0 < 0) return null; if (e0 > S.bigAt[d] - Math.log(4)) continue; S.big[d] = 0; }\n      let pl = 0, open = 0;");
pj = rep(pj, "    if (over) { S.big[d] = 1; return true; }", "    if (over) { S.big[d] = 1; S.bigAt[d] = estimate(S, d); return true; }");
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
let s = 9; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const OLD = new Function(js + "; return { setSize, randomSolution, carve, leanLayers, median };")();
const NEW = new Function(pj + "; return { setSize, leanLayers };")();
const plan = [[9, ["one", "20", "34", "carved"], 30], [12, ["one", "20", "34", "carved"], 10], [16, ["one", "20", "34", "carved"], 6]];
for (const [n, fills, count] of plan) {
  OLD.setSize(n); NEW.setSize(n); const NN = n * n;
  for (const f of fills) {
    const P = []; for (let k = 0; k < count; k++) { const sol = OLD.randomSolution(); let p = new Array(NN).fill(0);
      if (f === "carved") p = OLD.carve(sol, "hard");
      else if (f === "one") for (let d = 1; d <= n; d++) { const c = []; for (let i = 0; i < NN; i++) if (sol[i] === d) c.push(i); p[c[Math.floor(Math.random() * c.length)]] = d; }
      else [...Array(NN).keys()].sort(() => Math.random() - 0.5).slice(0, Math.round(NN * +f / 100)).forEach(i => p[i] = sol[i]); P.push(p); }
    const line = [];
    for (const cap of f === "carved" ? [300000] : [200, 300000]) for (const [name, A] of [["as is", OLD], ["smart retry", NEW]]) {
      const ms = []; let ok = 0;
      for (const p of P) { const t0 = performance.now(); const r = A.leanLayers(p, { start: 2, order: "cells", cap }); ms.push(performance.now() - t0); if (r.grid) ok++; }
      line.push(`${name} cap ${cap}: med ${OLD.median(ms).toFixed(2)} max ${Math.max(...ms).toFixed(0)}${ok < P.length ? " FAIL" : ""}`);
    }
    console.log(`${n}x${n} ${f === "one" ? "1/n" : f === "carved" ? "carved hard" : f + "%"} (${count}): ${line.join(" | ")}`);
  }
}
