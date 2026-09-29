# benchmark.py
import time
import csv
import os
from solver import solve_grid
from utils import load_grid_from_file, is_solved


def benchmark_folder(folder_path, max_depth=3):
    """
    Run the hybrid solver on all puzzles inside a folder.
    Returns a list of (filename, N, time_sec, solved_flag).
    """
    results = []

    for fname in sorted(os.listdir(folder_path)):
        if not fname.endswith(".txt"):
            continue

        path = os.path.join(folder_path, fname)
        grid = load_grid_from_file(path)
        n = len(grid)

        print(f"Running {fname} (size {n}x{n})...")

        start = time.time()
        solution = solve_grid(grid, max_depth=max_depth)
        end = time.time()

        solved = is_solved(solution) if solution else False
        elapsed = end - start

        print(f"  → time: {elapsed:.4f}s | solved: {solved}")

        results.append((fname, n, elapsed, solved))

    return results


def save_results_csv(results, out_path):
    """
    Save benchmark results to CSV.
    Columns: filename, N, time_sec, solved
    """
    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["filename", "N", "time_sec", "solved"])
        for row in results:
            writer.writerow(row)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Benchmark hybrid Sudoku solver")
    parser.add_argument(
        "--folder",
        type=str,
        required=True,
        help="Folder containing puzzle .txt files",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=3,
        help="Maximum backtracking depth",
    )
    parser.add_argument(
        "--out",
        type=str,
        default="benchmark_results.csv",
        help="Output CSV file",
    )
    args = parser.parse_args()

    results = benchmark_folder(args.folder, max_depth=args.max_depth)
    save_results_csv(results, args.out)

    print("\nBenchmark complete.")
    print(f"Results saved to: {args.out}")

    print("\nSummary:")
    for fname, n, t, solved in results:
        print(f"{fname:25s} | {n:2d}x{n:2d} | {t:8.4f}s | solved={solved}")


if __name__ == "__main__":
    main()


# Example usage:
# python benchmark.py --folder benchmarks/puzzles/ --max-depth 3 --out results.csv    