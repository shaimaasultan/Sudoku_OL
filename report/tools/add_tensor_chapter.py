"""Insert chapter 9 (tensor engines) into report.html from data/tensor.json; renumber Discussion and Appendix."""
import json
p = "C:/Sudoku_shaimaa/report/report.html"
t = open(p, encoding="utf-8", newline="").read(); nl = "\r\n" if "\r\n" in t else "\n"; t = t.replace("\r\n", "\n")
T = json.load(open("C:/Sudoku_shaimaa/report/data/tensor.json"))

def rep(a, b):
    global t
    assert t.count(a) == 1, a[:60]
    t = t.replace(a, b)

for a, b in [("<h2>10. Appendix", "<h2>11. Appendix"), ("<h3>10.1 ", "<h3>11.1 "), ("<h3>10.2 ", "<h3>11.2 "), ("<h3>10.3 ", "<h3>11.3 "),
             ("<h2>9. Discussion", "<h2>10. Discussion"), ("<h3>9.1 ", "<h3>10.1 "), ("<h3>9.2 ", "<h3>10.2 "), ("<h3>9.3 ", "<h3>10.3 "), ("<h3>9.4 ", "<h3>10.4 ")]:
    rep(a, b)
rep("    <li>Discussion, limits and related work</li>", "    <li>The cube as a tensor: three more engines</li>\n    <li>Discussion, limits and related work</li>")

cols = [("tNum", "Tensor · numbers"), ("tAll", "Tensor · all 4"), ("tUnit", "Tensor · R/C/B"), ("shared", "Shared patterns"), ("x2", "Matrix top 2"), ("x3", "Matrix top 3"),
        ("lean", "Lean OL"), ("dlx", "Dancing Links"), ("mrv", "MRV")]
OL = ["tNum", "tAll", "tUnit", "shared", "x2", "x3", "lean"]
lab = {"hard": "hard, 1 answer", "20": "random 20%", "34": "random 34%", "40": "random 40%"}
def f(ms): return f"{ms * 1000:.0f} µs" if ms < 0.1 else f"{ms:.2f}" if ms < 10 else f"{ms:.1f}" if ms < 100 else f"{ms:.0f}"
rows = []
for c in T["cases"]:
    M = c["methods"]; olbest = min(M[k]["median"] for k in OL if k in M); best = min(v["median"] for v in M.values())
    cells = []
    for k, _ in cols:
        if k not in M: cells.append('<td class="n">not run</td>'); continue
        v = M[k]; s = f(v["median"]) + (f' <span class="bad">({v["solved"]}/{T["K"]})</span>' if v["solved"] < T["K"] else "")
        if v["median"] == olbest and v["median"] != best: s = "<b>" + s + "</b>"
        cells.append(f'<td class="{"n good" if v["median"] == best else "n"}">{s}</td>')
    rows.append(f'  <tr><td>{c["n"]}×{c["n"]} {lab[c["level"]]}</td><td class="n">{c["givens"]:.0f}</td>' + "".join(cells) + "</tr>")
head = '  <tr><th>Puzzles</th><th class="n">Givens</th>' + "".join(f'<th class="n">{n}</th>' for _, n in cols) + "</tr>"
table = '<table style="font-size:8.2pt">\n' + head + "\n" + "\n".join(rows) + "\n</table>"
g = lambda c, k: f(T["cases"][c]["methods"][k]["median"])
K = T["K"]

chap = f"""<section class="chap">
<h2>9. The cube as a tensor: three more engines</h2>
<p>The option-layer cube (row × column × number) can be held as one N×N×N true/false <b>tensor</b>: a point is true while that number can still go in that cell. Every rule of Sudoku says "exactly one true point on each line of the cube" — each cell, and each number in each row, column and box. This chapter tests three engines built on that view, on the Tensor Layers page (<code>LayerSudoku-Tensor.html</code>), against the lean engine and the classic solvers.</p>
<h3>9.1 Three engines</h3>
<ul>
  <li><b>Tensor OL.</b> The tensor is kept in four views at once (cell, row, column, box), each line packed into one 32-bit word, so a line with no point (a dead end) or one point (a naked or hidden single) is found in one pass. Layers can be cut in four directions: a <b>number</b> layer (a horizontal slice: the templates of the lean method), or a <b>row</b>, <b>column</b> or <b>box</b> layer (vertical slices: every way to give its open cells different numbers). The thinnest layer in any allowed direction is built next — top 2 at the start, one more when stuck, never all; a layer over the cap (2,000 options) waits until its size bound shrinks 8 times. Cut and AND / OR are the same in every direction: row, column and box layers find naked and hidden sets, number layers find fish patterns.</li>
  <li><b>Matrix OL (matmul).</b> The tensor is one flat 0/1 vector <b>x</b>. The line sums are one product <b>A·x</b> with the fixed line matrix A. All layers of one direction are stacked into one option × point matrix <b>M</b>; one pass is <b>alive = (M·(1−x) = 0)</b> (cut) and <b>count = aliveᵀ·M</b> (count 0 → remove, OR; count = the live options of its layer → place, AND). Every row, column and box layer is built <b>in full</b> at the start; only the top 2 or 3 number layers are built.</li>
  <li><b>Shared number patterns.</b> A template is a pattern — one cell per row, column and box — that does not depend on the number. So the thinnest numbers are built in <b>one</b> walk over the patterns, each pattern kept once with a mask of the numbers it fits. Instead of cutting the lists again, each point keeps a <b>support count</b> (the live patterns that use it) and each number its live count; removing a point touches only the patterns through that cell. Support 0 removes a point; support equal to the live count places it. After a failed guess the changes are undone from a trail, so the list is never scanned or copied again. When stuck, one more number joins the shared set.</li>
</ul>
<h3>9.2 Results</h3>
<p>{K} seeded puzzles per case, the same puzzles for every method, after a warm-up; fast runs are repeated and averaged. Tensor and shared engines: start top 2, cap 2,000. Median time per puzzle in ms; <span class="good">green</span> = fastest overall, <b>bold</b> = fastest option-layer engine where a classic solver was faster; a red fraction = puzzles solved within the 5-million-step limit.</p>
{table}
<figure><img src="fig/f_tensor.png" style="width:100%"><figcaption><b>Figure 9.1.</b> The same medians on a log scale. The matrix engines were not run on 16×16 random 40%: building every row, column and box layer in full is too large on an open 16×16 board. MRV solved 8 of 10 there within its 5-million-step limit.</figcaption></figure>
<h3>9.3 What the results show</h3>
<ul>
  <li><b>16×16 hard (one answer): option-layer engines are fastest.</b> Shared patterns {g(3, "shared")} ms and tensor (all directions) {g(3, "tAll")} ms, against lean {g(3, "lean")}, Dancing Links {g(3, "dlx")} and MRV {g(3, "mrv")} ms.</li>
  <li><b>Shared patterns is the best option-layer engine on the most open boards.</b> 9×9 random 20%: {g(1, "shared")} ms against {g(1, "tNum")} ms for number layers built one at a time and {g(1, "lean")} for lean; 16×16 random 40%: {g(4, "shared")} ms against {g(4, "tNum")} (tensor) and {g(4, "lean")} (lean). Building several numbers in one walk, and using support counts instead of cutting the lists again, pay off where the lists are large and overlap. At 9×9 random 34% it does not: {g(2, "shared")} ms against {g(2, "lean")} for lean and {g(2, "tNum")} for tensor number layers — the lists there are small, and setting up the counts costs more than it saves.</li>
  <li><b>Classic search still wins on small or open boards.</b> On 9×9, MRV is fastest in every case ({g(0, "mrv")} on hard puzzles): with many answers almost any guess works, and MRV guesses cheaply. On 16×16 random 40%, Dancing Links ({g(4, "dlx")} ms) is about ten times faster than any option-layer engine — while MRV ({g(4, "mrv")} ms, 2 of 10 unsolved) is slower than all of them.</li>
  <li><b>More layers are not always better.</b> Tensor with all four directions is slower than number layers alone on 9×9 and on open 16×16: it builds more layers than it needs. Building the vertical layers in full (the matrix engines) is the slowest option everywhere — on 16×16 hard the full lists hold 6,000–21,000 options, and every pass multiplies all of them.</li>
  <li><b>The matmul form fits a GPU, not a CPU.</b> Its two products are what graphics hardware does well; on the CPU they cost more than they save. A GPU version would only pay on large boards, where the start-up cost is small next to the work.</li>
</ul>
<p class="small">Limits: {K} puzzles per case, one machine, Node (V8) rather than the browser; sizes above 16×16 and other fills were not measured. Script: <code>report/tools/exp_tensor.mjs</code>; data: <code>report/data/tensor.json</code>; chart: <code>report/tools/f_tensor.py</code>.</p>
</section>
<section class="chap">
<h2>10. Discussion"""
rep('<section class="chap">\n<h2>10. Discussion', chap)
open(p, "w", encoding="utf-8", newline="").write(t.replace("\n", nl))
print("ok")
