# Build the Tensor Layers page: MRV 3D page head/helpers + Speed page engines (as is) + the tensor engine + this page's UI.
D = "C:/Users/shaim/AppData/Local/Temp/claude/C--Sudoku-shaimaa/b09f6499-3f0c-4389-829c-22978eb18a0c/scratchpad/"
rd = lambda f: open(f, encoding="utf-8").read().replace("\r\n", "\n")
m3 = rd("C:/Sudoku_shaimaa/LayerSudoku-MRV3D.html")
sp = rd("C:/Sudoku_shaimaa/LayerSudoku-Speed.html")
head = m3[:m3.index("<body>")].replace("<title>MRV in 3D</title>", "<title>Tensor Layers</title>")
head = head.replace("</style>", """input{font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px 10px;flex:1;min-width:0}
button.mini{padding:6px 9px;font-size:12px}
.board div.reg{background:rgba(36,85,199,.10)}
.board div.regbad{background:rgba(196,38,38,.12)}
.board div.now{box-shadow:inset 0 0 0 3px var(--accent)}
.board div.pick{background:var(--hi);box-shadow:inset 0 0 0 3px var(--accent)}
.board div .cd span.hl{color:var(--accent);font-weight:800}
.board div .cd span.rm{color:var(--bad);text-decoration:line-through;font-weight:700}
.methods{display:flex;flex-direction:column;gap:5px;font-size:13.5px;margin:6px 0}
.methods label{display:flex;align-items:center;gap:7px}
.sw{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.bar{height:5px;background:var(--bg);border-radius:3px;overflow:hidden;margin:6px 0}
.bar div{height:100%;width:0;background:var(--accent);transition:width .2s}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:12.5px;font-variant-numeric:tabular-nums}
th,td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
th{font-size:11.5px;color:var(--muted);font-weight:600}
td.best{color:var(--ok);font-weight:700}
.stats span{font-size:10px}
.dim{opacity:.45}
</style>""")
js3 = m3[m3.index("<script>") + len("<script>"):m3.rindex("</script>")]
helpers = js3[:js3.index("/* ---------- MRV, recording every step")]
spjs = sp[sp.index("<script>") + len("<script>"):sp.rindex("</script>")]
a = spjs.index("/* ---------- the lean method"); b = spjs.index("/* ---------- the full option-layer method")
lean = spjs[a:b]
c = spjs.index("/* ---------- classic algorithms ---------- */"); d = spjs.index("/* ---------- puzzles ---------- */")
classic = spjs[c:d]
page = head + rd(D + "tensor_body.html") + "\n<script>" + helpers + "\n/* ---------- engines copied as is from the Speed page ---------- */\n" + lean + classic + rd(D + "tensor_engine.js") + rd(D + "matrix_engine.js") + rd(D + "shared_engine.js") + rd(D + "dancing_engine.js") + rd(D + "tensor_ui.js") + "</script>\n</body>\n</html>\n"
open("C:/Sudoku_shaimaa/LayerSudoku-Tensor.html", "w", encoding="utf-8").write(page)
print("written", len(page))
