import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
const el = () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "" });
globalThis.document = { getElementById: el };
let s = 12345; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const api = new Function(js + "; return { setSize, randomSolution, carve, leanLayers, optionLayers };")();
const n = +process.argv[2]; api.setSize(n);
for (let k = 0; k < 40; k++) { const sol = api.randomSolution(), p = api.carve(sol, "hard");
  console.log(k, "givens", p.filter(Boolean).length, JSON.stringify(p));
  let t0 = performance.now(); const r = api.leanLayers(p, { start: 2, order: "repeat" }); const tl = performance.now() - t0;
  t0 = performance.now(); const f = api.optionLayers(p); const tf = performance.now() - t0;
  console.log("   lean", tl.toFixed(2), "ms guesses", r.guesses, "built", r.built, "layers", r.layers, "ok", !!r.grid, "| full", tf.toFixed(2), "ms guesses", f.guesses, "built", f.built); }
