// Find where the lean engine spins on one puzzle: add loop counters that throw.
import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8").split("\r\n").join("\n");
let js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
const inject = (a, b) => { if (!js.includes(a)) throw new Error("marker not found: " + a.slice(0, 50)); js = js.replace(a, b); };
inject("    for (;;) {\n      let changed = false;", "    let it = 0; for (;;) { if (++it > 5000) throw new Error('propagate spins: left ' + S.left + ' depth ' + S.depth + ' cnt ' + Array.from(S.cnt) + ' done ' + Array.from(S.done) + ' big ' + Array.from(S.big) + ' built ' + S.T.map(x => x ? 'Y' : '-').join(''));\n      let changed = false;");
inject("  function solve(S) {\n    if (!propagate(S)) return null;\n    if (!S.left) return S;", "  let calls = 0; function solve(S) {\n    if (++calls > 200000) throw new Error('solve calls ' + calls + ' guesses ' + st.guesses + ' depth ' + S.depth);\n    if (!propagate(S)) return null;\n    if (!S.left) return S;");
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "" }) };
const api = new Function(js + "; return { setSize, leanLayers };")();
api.setSize(6);
const p = [1,0,0,0,0,0,0,0,6,0,0,3,0,2,5,0,0,0,0,0,0,5,4,0,2,0,0,1,0,0,0,0,0,0,0,6];
try { const r = api.leanLayers(p, { start: 2, order: "repeat" }); console.log("ok", !!r.grid, "guesses", r.guesses, "built", r.built); } catch (e) { console.log(e.message); }
