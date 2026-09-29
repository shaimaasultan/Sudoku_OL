import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8").split("\r\n").join("\n");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "" }) };
const api = new Function(js + "; return { setSize, randomSolution, boxOf };")();
for (const n of [4, 6, 9, 12, 16]) {
  api.setSize(n); const ms = []; let bad = 0;
  for (let k = 0; k < (n === 16 ? 1000 : 300); k++) { const t0 = performance.now(); const g = api.randomSolution(); ms.push(performance.now() - t0);
    // check it is a valid full grid
    for (let i = 0; i < n * n; i++) for (let j = i + 1; j < n * n; j++) { const ri = (i / n) | 0, rj = (j / n) | 0, ci = i % n, cj = j % n; if (g[i] === g[j] && (ri === rj || ci === cj || api.boxOf(ri, ci) === api.boxOf(rj, cj))) { bad++; i = n * n; break; } }
    if (g.some(v => !v)) bad++; }
  ms.sort((a, b) => a - b);
  console.log(`${n}x${n}: ${ms.length} grids, invalid ${bad}, median ${ms[ms.length >> 1].toFixed(2)} ms, slowest ${ms.at(-1).toFixed(1)} ms`);
}
