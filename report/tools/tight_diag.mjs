// Diagnostic only: count options built and time spent choosing layers, by patching a COPY of the lean code in memory (the pages stay unchanged).
import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8").split("\r\n").join("\n");
let js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
js = js.replace("S.T[d] = out.subarray(0, n * W); S.cnt[d] = n;", "S.T[d] = out.subarray(0, n * W); S.cnt[d] = n; DIAG.options += n; DIAG.layers++;")
       .replace("  function nextLayers(S, k) {\n", "  function nextLayers(S, k) { const __t = performance.now(); try { return nextLayers0(S, k); } finally { DIAG.chooseMs += performance.now() - __t; } }\n  function nextLayers0(S, k) {\n");
globalThis.DIAG = { options: 0, layers: 0, chooseMs: 0 };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
let s = 31; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const A = new Function(js + "; return { setSize, randomSolution, carve, leanLayers, median };")();
for (const [n, cnt] of [[9, 40], [16, 6], [30, 3]]) {
  A.setSize(n); const P = []; for (let k = 0; k < cnt; k++) P.push(A.carve(A.randomSolution(), "hard"));
  for (const rule of ["cells", "tight"]) {
    DIAG.options = DIAG.layers = DIAG.chooseMs = 0; const t0 = performance.now();
    for (const p of P) A.leanLayers(p, { start: 2, order: rule });
    const tot = performance.now() - t0;
    console.log(`${n}x${n} ${rule.padEnd(5)}: per puzzle ${(tot / cnt).toFixed(2)} ms, options built ${Math.round(DIAG.options / cnt).toLocaleString()}, layers built ${(DIAG.layers / cnt).toFixed(1)}, time choosing layers ${(DIAG.chooseMs / cnt).toFixed(2)} ms`);
  }
}
