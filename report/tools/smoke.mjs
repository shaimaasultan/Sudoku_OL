import { launch } from "./cdp.mjs";
const b = await launch();
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Givens.html", "typeof optionLayers === 'function'");
const r = await b.eval(`(() => { __seed(7); N = 9; [BR, BC] = boxShape(9); const s = variedSolution(); __seed(7); const s2 = variedSolution(); return { same: s.join('') === s2.join(''), first: s.slice(0, 9).join('') }; })()`);
console.log(JSON.stringify(r));
await b.viewport(390, 844);
await b.shot("C:/Sudoku_shaimaa/report/shots/_smoke.png");
b.close();
