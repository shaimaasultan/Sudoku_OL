"""Figure for the tensor chapter: median time per puzzle, same seeded puzzles for every method (reads ../data/tensor.json)."""
import json, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
D = os.path.join(os.path.dirname(__file__), "..")
plt.rcParams.update({"font.family": "Segoe UI", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.grid": True, "grid.alpha": .25, "figure.dpi": 150, "savefig.bbox": "tight", "axes.titleweight": "bold", "axes.titlesize": 11})
T = json.load(open(os.path.join(D, "data", "tensor.json")))
M = [("tNum", "Tensor · number layers", "#6f98ff"), ("tAll", "Tensor · all 4 directions", "#2455c7"), ("shared", "Shared patterns · support counts", "#00897b"),
     ("x3", "Matrix · top 3 + full vertical", "#f06292"), ("lean", "Lean OL (Speed page)", "#e08a00"), ("dlx", "Dancing Links", "#2e9e57"), ("mrv", "MRV backtracking", "#6a6e77")]
labels = {"hard": "hard (1 answer)", "20": "random 20%", "34": "random 34%", "40": "random 40%"}
cases = T["cases"]; x = np.arange(len(cases)); w = 0.8 / len(M)
fig, ax = plt.subplots(figsize=(10.4, 4.0))
for k, (key, name, col) in enumerate(M):
    ys = [c["methods"][key]["median"] if key in c["methods"] else np.nan for c in cases]
    ax.bar(x - 0.4 + w * (k + 0.5), ys, w, color=col, label=name)
    for i, c in enumerate(cases):
        if key not in c["methods"]: ax.text(x[i] - 0.4 + w * (k + 0.5), 0.035, "not run", rotation=90, fontsize=6.5, ha="center", va="bottom", color=col)
        elif c["methods"][key]["solved"] < T["K"]: ax.text(x[i] - 0.4 + w * (k + 0.5), c["methods"][key]["median"] * 1.15, f'{c["methods"][key]["solved"]}/{T["K"]}', fontsize=7, ha="center", color="#b3261e")
ax.set_yscale("log"); ax.set_ylim(0.03, 1000)
ax.set_xticks(x); ax.set_xticklabels([f'{c["n"]}×{c["n"]} {labels[c["level"]]}\n{c["givens"]:.0f} givens' for c in cases], fontsize=9)
ax.set_ylabel("median time per puzzle (ms, log)"); ax.set_title(f'Same {T["K"]} seeded puzzles for every method')
ax.legend(frameon=False, fontsize=8.2, ncol=4, loc="upper center", bbox_to_anchor=(0.5, -0.2))
fig.savefig(os.path.join(D, "fig", "f_tensor.png")); print("fig f_tensor")
