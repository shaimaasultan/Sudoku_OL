// Compare lean as it is vs lean that retries "too big" layers after each guess (patched COPY in memory; pages unchanged).
import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8").split("\r\n").join("\n"); const js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
const patched = js.replace("{ const U = clone(S); U.T[d] = T.subarray(t * W, t * W + W); U.cnt[d] = 1;", "{ const U = clone(S); U.big.fill(0); U.T[d] = T.subarray(t * W, t * W + W); U.cnt[d] = 1;")
                  .replace("{ const U = clone(S); if (!place(U, bi, e)) continue;", "{ const U = clone(S); U.big.fill(0); if (!place(U, bi, e)) continue;");
if (patched === js || patched.split("U.big.fill(0)").length !== 3) throw new Error("patch did not apply");
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
let s = 9; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const OLD = new Function(js + "; return { setSize, randomSolution, leanLayers, median, get G() { return G; } };")();
const NEW = new Function(patched + "; return { setSize, leanLayers };")();
const deadline = 20000;
for (const [n, fills, count] of [[9, ["one", "20", "34"], 30], [12, ["one", "20", "34"], 10], [16, ["one", "20", "34"], 6]]) {
  OLD.setSize(n); NEW.setSize(n); const NN = n * n;
  for (const f of fills) {
    const P = []; for (let k = 0; k < count; k++) { const sol = OLD.randomSolution(), p = new Array(NN).fill(0);
      if (f === "one") for (let d = 1; d <= n; d++) { const c = []; for (let i = 0; i < NN; i++) if (sol[i] === d) c.push(i); p[c[Math.floor(Math.random() * c.length)]] = d; }
      else [...Array(NN).keys()].sort(() => Math.random() - 0.5).slice(0, Math.round(NN * +f / 100)).forEach(i => p[i] = sol[i]); P.push(p); }
    const line = [];
    for (const [name, A] of [["as is", OLD], ["retry", NEW]]) for (const cap of [200, 1000]) {
      const ms = []; let ok = 0;
      for (const p of P) { const t0 = performance.now(); const r = A.leanLayers(p, { start: 2, order: "cells", cap }); ms.push(performance.now() - t0); if (r.grid) ok++; }
      line.push(`${name} cap ${cap}: med ${OLD.median(ms).toFixed(2)} max ${Math.max(...ms).toFixed(0)} ms`);
    }
    console.log(`${n}x${n} ${f === "one" ? "1/n" : f + "%"} (${count}): ${line.join(" | ")}`);
  }
}
