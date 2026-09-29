import random
import math


# ------------------------------------------------------------
# 1. Build a valid NxN Sudoku base grid (block-correct)
# ------------------------------------------------------------
def build_base_sudoku(N):
    """
    Works for any N = B^2 (e.g., 36, 49)
    Uses the generalized Sudoku base pattern:
    value(r,c) = ((r % B) * B + (r // B) + c) % N + 1
    """
    B = int(math.sqrt(N))
    grid = [[0] * N for _ in range(N)]

    for r in range(N):
        for c in range(N):
            grid[r][c] = (((r % B) * B) + (r // B) + c) % N + 1

    return grid


# ------------------------------------------------------------
# 2. Remove clues by percentage
# ------------------------------------------------------------
def make_puzzle_from_solution(solution, clue_fraction=0.70, seed=0):
    random.seed(seed)
    N = len(solution)
    puzzle = [[solution[r][c] for c in range(N)] for r in range(N)]

    for r in range(N):
        for c in range(N):
            if random.random() > clue_fraction:
                puzzle[r][c] = 0

    return puzzle


# ------------------------------------------------------------
# 3. Write puzzle to .txt with block spacing
# ------------------------------------------------------------
def write_puzzle_txt(puzzle, path):
    N = len(puzzle)
    B = int(math.sqrt(N))

    with open(path, "w") as f:
        for r in range(N):
            row_parts = []
            for c in range(N):
                v = puzzle[r][c]
                row_parts.append(str(v) if v != 0 else "0")

                # vertical block spacing
                if (c + 1) % B == 0 and c + 1 != N:
                    row_parts.append("")  # double space

            f.write(" ".join(row_parts) + "\n")

            # horizontal block spacing
            if (r + 1) % B == 0 and r + 1 != N:
                f.write("\n")


# ------------------------------------------------------------
# 4. Unified generator for 36×36 or 49×49
# ------------------------------------------------------------
def generate_sudoku(N, clue_fraction=0.70, seed=0):
    """
    Generates a valid NxN Sudoku puzzle for N = B^2 (36 or 49).
    """
    assert int(math.sqrt(N)) ** 2 == N, "N must be a perfect square (36 or 49)."

    solution = build_base_sudoku(N)
    puzzle = make_puzzle_from_solution(solution, clue_fraction, seed)

    return puzzle


# ------------------------------------------------------------
# 5. Example usage
# ------------------------------------------------------------
if __name__ == "__main__":
    N = 49
    clue = 0.60
    seed = 52

    puzzle = generate_sudoku(N, clue_fraction=clue, seed=seed)
    write_puzzle_txt(puzzle, f"benchmarks/puzzles/{N}x{N}_{clue}p.txt")

    print(f"Generated benchmarks/puzzles/{N}x{N}_{clue}p.txt")
