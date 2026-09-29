# utils.py
import math


def load_grid_from_file(path):
    """
    Load a grid from a text file.
    - Rows separated by newlines.
    - Cells separated by spaces or nothing.
    - 0 or . for empty cells.
    """
    grid = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if " " in line:
                tokens = line.split()
            else:
                tokens = list(line)
            row = []
            for t in tokens:
                if t in ("0", "."):
                    row.append(0)
                else:
                    row.append(int(t))
            grid.append(row)
  
    return grid


import math
from pprint import pprint

def print_grid(grid):
    for row in grid:
        line = " ".join("." if v == 0 else str(v) for v in row)
        print(line)


def is_solved(grid):
    return all(all(cell != 0 for cell in row) for row in grid)


def get_empty_cells(grid):
    n = len(grid)
    cells = []
    for r in range(n):
        for c in range(n):
            if grid[r][c] == 0:
                cells.append((r, c))
    return cells


def build_domains(grid):
    """
    Initial domains: for each empty cell, {1..N} minus row/col/block values.
    """
    n = len(grid)
    all_vals = set(range(1, n + 1))
    domains = {}
    for r in range(n):
        for c in range(n):
            if grid[r][c] == 0:
                used = get_row_values(grid, r) | get_col_values(grid, c) | get_block_values(
                    grid, r, c
                )
                domains[(r, c)] = all_vals - used
    return domains


def get_row_values(grid, r):
    return {v for v in grid[r] if v != 0}


def get_col_values(grid, c):
    return {grid[r][c] for r in range(len(grid)) if grid[r][c] != 0}


def get_block_values(grid, r, c):
    n = len(grid)
    b = int(math.sqrt(n))
    if b * b != n:
        return set()
    br = (r // b) * b
    bc = (c // b) * b
    vals = set()
    for rr in range(br, br + b):
        for cc in range(bc, bc + b):
            v = grid[rr][cc]
            if v != 0:
                vals.add(v)
    return vals
