import time, statistics, random
import tkinter as tk
from suduku15 import generate_initial_grid , SudokuGUI
def benchmark_sizes(sizes=(9, 12, 16, 25, 36), trials=10):
    results = {}
    for N in sizes:
        times = []
        for _ in range(trials):
            grid = generate_initial_grid(N, clues_ratio=0.25)
            gui = SudokuGUI(tk.Tk(), grid)
            start = time.time()
            _ = gui.is_puzzle_solvable(grid)
            end = time.time()
            times.append(end - start)
        results[N] = {
            "avg": statistics.mean(times),
            "max": max(times),
            "min": min(times),
        }
    return results

if __name__ == "__main__":
    sizes_to_test = [9, 12, 16, 25, 36]
    benchmark_results = benchmark_sizes(sizes=sizes_to_test, trials=5)
    for size, stats in benchmark_results.items():
        print(f"Size: {size}x{size} - Avg: {stats['avg']:.4f}s, Max: {stats['max']:.4f}s, Min: {stats['min']:.4f}s")
