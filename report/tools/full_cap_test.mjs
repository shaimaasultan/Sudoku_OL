import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8").split("\r\n").join("\n");
let js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
const CAP = process.argv[2] || "400000";
js = js.replace("if (list.length >= 400000)", `if (list.length >= ${CAP})`);
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "" }) };
let s = 99; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const api = new Function(js + "; return { setSize, randomSolution, carve, optionLayers };")();
for (const [n, count] of [[6, 100], [9, 100], [12, 20], [16, 20]]) {
  api.setSize(n); let ok = 0, guessed = 0; const ms = [];
  for (let k = 0; k < count; k++) { const sol = api.randomSolution(), p = api.carve(sol, "hard"); const t0 = performance.now(); const r = api.optionLayers(p); ms.push(performance.now() - t0); if (r.grid && r.grid.every((v, i) => v === sol[i])) ok++; if (r.guesses) guessed++; }
  ms.sort((a, b) => a - b);
  console.log(`cap ${CAP}  ${n}x${n}: ${ok}/${count} correct, guessed ${guessed}, median ${ms[count >> 1].toFixed(1)} ms, slowest ${ms.at(-1).toFixed(0)} ms`);
}
