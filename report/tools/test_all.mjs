import { launch } from "./cdp.mjs";
const b = await launch(9343);
await b.viewport(860, 1000, 2, false);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "typeof drawLines === 'function'");
await b.eval(`__seed(3); $("level").value = "hard"; $("count").value = "30"; $("runAll").click(); true`);
for (let t = 0; t < 400; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("runAll").disabled`)) break; }
console.log(await b.eval(`$("status").textContent`));
console.log(await b.eval(`[...document.querySelectorAll("#tblAll tr")].map(r => [...r.children].map(c => c.textContent).join(" | ")).join(" ## ")`));
const clip = await b.eval(`(() => { const a = $("outAll").getBoundingClientRect(); return { x: a.left - 6, y: a.top + scrollY - 6, width: a.width + 12, height: a.height + 12 }; })()`);
await b.shot("C:/Sudoku_shaimaa/report/shots/speed_lines.png", clip);
await b.viewport(390, 844, 2, true); await new Promise(r => setTimeout(r, 500));
const clip2 = await b.eval(`(() => { const a = $("outAll").getBoundingClientRect(); return { x: 0, y: a.top + scrollY - 6, width: 390, height: a.height + 12 }; })()`);
await b.shot("C:/Sudoku_shaimaa/report/shots/speed_lines_phone.png", clip2);
console.log(await b.eval(`document.documentElement.scrollWidth <= 390 ? "no sideways scroll" : "SIDEWAYS SCROLL " + document.documentElement.scrollWidth`));
b.close();
