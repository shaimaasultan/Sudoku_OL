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

def get_most_repeated_digit(grid):
    counts = count_digits(grid)
    if not counts:
        return None
    return counts.most_common(1)[0][0]

# ---------------------------------------------------------
# Build layer for a specific digit
# ---------------------------------------------------------

def build_layer(grid, digit):
    """
    Returns a 9×9 boolean matrix:
    True  = empty cell CAN be 'digit'
    False = cell is X (cannot be 'digit')
    """

    layer = [[True if grid[r][c] == 0 else False for c in range(9)] for r in range(9)]
    print(f"Layer for digit {digit}:")
    for row in layer:
        print(''.join(['.' if cell else 'X' for cell in row]))  

    # ---------------------------------------------------------
    # 1) For each 3×3 box: if any cell has the digit,
    #    mark ALL EMPTY cells in that box as X
    # ---------------------------------------------------------
    for box_r in range(0, 9, 3):
        for box_c in range(0, 9, 3):

            # Check if this box contains the digit
            box_has_digit = any(
                grid[r][c] == digit
                for r in range(box_r, box_r + 3)
                for c in range(box_c, box_c + 3)
            )

            if box_has_digit:
                # Mark all EMPTY cells in this box as X
                for r in range(box_r, box_r + 3):
                    for c in range(box_c, box_c + 3):
                        if grid[r][c] == 0:   # only empty cells
                            layer[r][c] = False

    # ---------------------------------------------------------
    # 2) For each cell that contains the digit:
    #    mark all EMPTY cells in its row and column as X
    # ---------------------------------------------------------
    for r in range(9):
        for c in range(9):
            if grid[r][c] == digit:

                # Row r
                for cc in range(9):
                    if grid[r][cc] == 0:   # only empty cells
                        layer[r][cc] = False

                # Column c
                for rr in range(9):
                    if grid[rr][c] == 0:   # only empty cells
                        layer[rr][c] = False

    print(f"Layer for digit {digit}:")
    for row in layer:
        print(''.join(['.' if cell else 'X' for cell in row]))  
    return layer

# ---------------------------------------------------------
# Step 3 & 4: fill yellow cells (boxes with exactly one candidate)
# ---------------------------------------------------------

def fill_for_digit(grid, digit, layer):
    """
    Fills cells for this digit if a box has exactly one True cell.
    Returns (new_grid, changed_flag)
    """
    changed = False
    new_grid = copy.deepcopy(grid)

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
# Step 10: fill rows/columns with exactly one empty cell
# ---------------------------------------------------------

def fill_single_missing(grid):
    changed = False
    new_grid = copy.deepcopy(grid)

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
# Main solver using your method
# ---------------------------------------------------------

def solve_sudoku_layer_method(grid):
    grid = copy.deepcopy(grid)

    while True:
        # 1) Count digits on current grid
        counts = count_digits(grid)
        if not counts:
            break

        # 2) Build ordered list of digits from most to least frequent
        digits_order = [d for (d, _) in counts.most_common()]

        any_change_in_round = False

        # 3) Process each digit in this fixed order
        for digit in digits_order:
            while True:
                layer = build_layer(grid, digit)
                new_grid, changed = fill_for_digit(grid, digit, layer)
                if not changed:
                    break
                grid = new_grid
                any_change_in_round = True

        # 4) Apply row/column single-missing rule once per round
        grid, changed_rc = fill_single_missing(grid)
        if changed_rc:
            any_change_in_round = True

        # 5) If nothing changed in this whole round, we are done
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

for row in solution:
    print(row)


print( get_most_repeated_digit(initial_grid))
