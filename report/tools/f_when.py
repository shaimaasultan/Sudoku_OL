"""Figure 8.1 for the report: when MRV wastes work (9x9), by fill % and by number of answers. Numbers from mrv_peak.mjs and by_answers.mjs."""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
F = os.path.join(os.path.dirname(__file__), "..", "fig")
plt.rcParams.update({"font.family": "Segoe UI", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.grid": True, "grid.alpha": .25, "figure.dpi": 150, "savefig.bbox": "tight", "axes.titleweight": "bold", "axes.titlesize": 11})
MRV, OL, WARM = "#6a6e77", "#2455c7", "#e08a00"
fig, (a, b) = plt.subplots(1, 2, figsize=(10.4, 3.7), gridspec_kw={"width_ratios": [1.15, 1]})

# (a) by fill %: MRV wasted tries (median) and the share of puzzles with one answer
labels = ["1 per\nnumber", "10", "15", "20", "25", "30", "34", "40", "45", "50", "60", "70"]
wasted = [0, 2, 2, 2, 5, 9, 10, 2, 0, 0, 0, 0]
x = list(range(len(labels)))
a.axvspan(3.5, 7.5, color=WARM, alpha=.13, lw=0)
a.text(5.5, 2.6, "middle zone:\nhundreds of answers", ha="center", va="bottom", fontsize=8.5, color="#9a5c00")
a.plot(x, wasted, "-o", color=MRV, ms=5, label="MRV wasted tries (median)")
a.set_xticks(x); a.set_xticklabels(labels, fontsize=8.5); a.set_ylim(-0.5, 12)
a.set_xlabel("givens, % of cells (random fill, 9×9)"); a.set_ylabel("MRV wasted tries (median)")
a2 = a.twinx(); a2.spines["right"].set_visible(True); a2.grid(False)
ux, uy = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11], [0, 0, 0, 0, 0, 0, 5, 40, 75, 87]
a2.plot(ux, uy, "--s", color=OL, ms=4, label="puzzles with exactly one answer (%)")
a2.set_ylim(-4, 100); a2.set_ylabel("exactly one answer (%)", color=OL); a2.tick_params(axis="y", colors=OL)
h1, l1 = a.get_legend_handles_labels(); h2, l2 = a2.get_legend_handles_labels()
a.legend(h1 + h2, l1 + l2, frameon=False, fontsize=8.3, loc="upper center", bbox_to_anchor=(0.5, -0.27), ncol=2)
a.set_title("(a) Easy – hard – easy by fill %")

# (b) by number of answers: median and worst wasted tries
groups = ["random\n> 1,000", "random\n101–1,000", "random\n11–100", "random\n2–10", "random\nexactly 1", "carved hard\nexactly 1"]
med = [9, 11, 2, 0, 0, 40]; worst = [13329, 754, 793, 234, 23, 1588]
cols = [MRV] * 5 + [OL]
bars = b.bar(range(6), med, color=cols, width=.62)
for i, (m, w) in enumerate(zip(med, worst)):
    b.text(i, m + 0.8, f"{m}", ha="center", fontsize=9, fontweight="bold")
    b.text(i, m + 4.2, f"worst {w:,}", ha="center", fontsize=7.4, color="#555")
b.set_xticks(range(6)); b.set_xticklabels(groups, fontsize=8.2); b.set_ylim(0, 50)
b.set_ylabel("MRV wasted tries (median)"); b.set_xlabel("number of answers (9×9)")
b.set_title("(b) One answer can be easy or hard")
b.text(3.4, 33, "same count of answers,\nvery different MRV work", ha="center", fontsize=8.3, color=OL)
for xy in [(4, 7.5), (4.7, 30)]:
    b.annotate("", xy=xy, xytext=(3.6, 32), arrowprops=dict(arrowstyle="->", color=OL, lw=.9))
fig.tight_layout()
fig.savefig(os.path.join(F, "f_when.png")); print("fig f_when")
