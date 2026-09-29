import copy
from collections import Counter

# ---------------------------------------------------------
# Utility functions
# ---------------------------------------------------------

def find_box(r, c):
    return (r // 3) * 3 + (c // 3)

def empty_cells(grid):
    return [(r, c) for r in range(9) for c in range(9) if grid[r][c] == 0]

def count_digits(grid):
    flat = [x for row in grid for x in row if x != 0]
    return Counter(flat)

# ---------------------------------------------------------
# Visual Layer Printer
# ---------------------------------------------------------

def print_layer(grid, layer, digit):
    print(f"\n=== LAYER FOR DIGIT {digit} ===\n")
    for r in range(9):
        row_str = ""
        for c in range(9):
            if grid[r][c] != 0:
                row_str += f" {grid[r][c]} "
            else:
                row_str += " . " if layer[r][c] else " X "
            if c in (2, 5):
                row_str += "|"
        print(row_str)
        if r in (2, 5):
            print("-" * 33)
    print("\n")

# ---------------------------------------------------------
# Corrected build_layer (your exact logic)
# ---------------------------------------------------------

def build_layer(grid, digit):
    """
    True  = empty cell CAN be digit
    False = empty cell CANNOT be digit
    Filled cells always False
    """

    layer = [[True if grid[r][c] == 0 else False for c in range(9)] for r in range(9)]

    # 1) For each 3×3 box: if any cell has the digit, block all empty cells in that box
    for box_r in range(0, 9, 3):
        for box_c in range(0, 9, 3):

            box_has_digit = any(
                grid[r][c] == digit
                for r in range(box_r, box_r + 3)
                for c in range(box_c, box_c + 3)
            )

            if box_has_digit:
                for r in range(box_r, box_r + 3):
                    for c in range(box_c, box_c + 3):
                        if grid[r][c] == 0:
                            layer[r][c] = False

    # 2) For each cell containing digit: block empty cells in its row and column
    for r in range(9):
        for c in range(9):
            if grid[r][c] == digit:

                # Row
                for cc in range(9):
                    if grid[r][cc] == 0:
                        layer[r][cc] = False

                # Column
                for rr in range(9):
                    if grid[rr][c] == 0:
                        layer[rr][c] = False

    return layer

# ---------------------------------------------------------
# Fill boxes with exactly one allowed cell
# ---------------------------------------------------------

def fill_for_digit(grid, digit, layer):
    new_grid = copy.deepcopy(grid)
    changed = False

    for b in range(9):
        br = (b // 3) * 3
        bc = (b % 3) * 3

        candidates = [(r, c) for r in range(br, br + 3)
                              for c in range(bc, bc + 3)
                              if layer[r][c]]

        if len(candidates) == 1:
            r, c = candidates[0]
            if new_grid[r][c] == 0:
                new_grid[r][c] = digit
                changed = True

    return new_grid, changed

# ---------------------------------------------------------
# Fill rows/columns with exactly one missing number
# ---------------------------------------------------------

def fill_single_missing(grid):
    new_grid = copy.deepcopy(grid)
    changed = False

    # Rows
    for r in range(9):
        row = new_grid[r]
        if row.count(0) == 1:
            missing = set(range(1, 10)) - set(row)
            c = row.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    # Columns
    for c in range(9):
        col = [new_grid[r][c] for r in range(9)]
        if col.count(0) == 1:
            missing = set(range(1, 10)) - set(col)
            r = col.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    return new_grid, changed

# ---------------------------------------------------------
# Main Solver (correct digit-order logic)
# ---------------------------------------------------------

def solve_sudoku_layer_method(grid):
    grid = copy.deepcopy(grid)

    while True:
        counts = count_digits(grid)
        if not counts:
            break

        # FIXED ORDER for this round
        digits_order = [d for (d, _) in counts.most_common()]

        any_change_in_round = False

        for digit in digits_order:
            while True:
                layer = build_layer(grid, digit)
                print_layer(grid, layer, digit)   # Visual layer

                new_grid, changed = fill_for_digit(grid, digit, layer)
                if not changed:
                    break

                grid = new_grid
                any_change_in_round = True

        # Apply row/column single-missing rule
        grid, changed_rc = fill_single_missing(grid)
        if changed_rc:
            any_change_in_round = True

        # If nothing changed in this entire round → done
        if not any_change_in_round:
            break

    return grid

# ---------------------------------------------------------
# Example usage
# ---------------------------------------------------------

initial_grid = [
    [5,3,0, 0,7,0, 0,0,0],
    [6,0,0, 1,9,5, 0,0,0],
    [0,9,8, 0,0,0, 0,6,0],

    [8,0,0, 0,6,0, 0,0,3],
    [4,0,0, 8,0,3, 0,0,1],
    [7,0,0, 0,2,0, 0,0,6],

    [0,6,0, 0,0,0, 2,8,0],
    [0,0,0, 4,1,9, 0,0,5],
    [0,0,0, 0,8,0, 0,7,9],
]

solution = solve_sudoku_layer_method(initial_grid)

print("\n=== FINAL SOLUTION ===\n")
for row in solution:
    print(row)
