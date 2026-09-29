import random
import copy

# ---------------------------------------------------------
# Use your existing box-shape function
# ---------------------------------------------------------

def choose_box_shape(N):
    best = None
    root = N**0.5
    for r in range(1, N+1):
        if N % r == 0:
            c = N // r
            if r <= c:
                diff = abs(r - root)
                if best is None or diff < best[0]:
                    best = (diff, r, c)
    return best[1], best[2]

# ---------------------------------------------------------
# Check if placing a digit is valid
# ---------------------------------------------------------

def valid(grid, r, c, val):
    N = len(grid)
    box_rows, box_cols = choose_box_shape(N)

    # Row
    if val in grid[r]:
        return False

    # Column
    for rr in range(N):
        if grid[rr][c] == val:
            return False

    # Box
    br = (r // box_rows) * box_rows
    bc = (c // box_cols) * box_cols
    for rr in range(br, br + box_rows):
        for cc in range(bc, bc + box_cols):
            if grid[rr][cc] == val:
                return False

    return True

# ---------------------------------------------------------
# Build a full valid Sudoku solution
# ---------------------------------------------------------

def fill_grid(grid):
    N = len(grid)
    for r in range(N):
        for c in range(N):
            if grid[r][c] == 0:
                nums = list(range(1, N+1))
                random.shuffle(nums)
                for val in nums:
                    if valid(grid, r, c, val):
                        grid[r][c] = val
                        if fill_grid(grid):
                            return True
                        grid[r][c] = 0
                return False
    return True

# ---------------------------------------------------------
# FAST puzzle generator (no uniqueness check)
# ---------------------------------------------------------

# def generate_initial_grid(N, clues_ratio=0.45):
#     """
#     N: grid size (4, 6, 8, 9, 12, 16, 36, ...)
#     clues_ratio: fraction of cells to keep (0.35–0.55 recommended)
#     """

#     # Step 1: build a full valid solution
#     grid = [[0]*N for _ in range(N)]
#     fill_grid(grid)
#     solution = copy.deepcopy(grid)

#     # Step 2: remove numbers randomly (NO uniqueness check)
#     total_cells = N * N
#     clues = int(total_cells * clues_ratio)
#     cells_to_remove = total_cells - clues

#     positions = [(r, c) for r in range(N) for c in range(N)]
#     random.shuffle(positions)

#     for i in range(cells_to_remove):
#         r, c = positions[i]
#         grid[r][c] = 0

#     return grid, solution

def generate_full_sudoku(N):
    box_rows, box_cols = choose_box_shape(N)
    grid = [[0]*N for _ in range(N)]

    for r in range(N):
        for c in range(N):
            grid[r][c] = (r * box_cols + r // box_rows + c) % N + 1

    return grid


def shuffle_sudoku(grid):
    N = len(grid)
    box_rows, box_cols = choose_box_shape(N)

    # Shuffle digits
    perm = list(range(1, N+1))
    random.shuffle(perm)
    for r in range(N):
        for c in range(N):
            grid[r][c] = perm[grid[r][c]-1]

    # Shuffle row bands
    for band in range(0, N, box_rows):
        rows = list(range(band, band + box_rows))
        random.shuffle(rows)
        grid[band:band+box_rows] = [grid[r] for r in rows]

    # Shuffle column bands
    for band in range(0, N, box_cols):
        cols = list(range(band, band + box_cols))
        random.shuffle(cols)
        for r in range(N):
            grid[r][band:band+box_cols] = [grid[r][c] for c in cols]

    return grid


def generate_initial_grid(N, clues_ratio=0.45):
    full = generate_full_sudoku(N)
    full = shuffle_sudoku(full)
    solution = copy.deepcopy(full)

    total = N*N
    clues = int(total * clues_ratio)
    remove = total - clues

    positions = [(r,c) for r in range(N) for c in range(N)]
    random.shuffle(positions)

    for i in range(remove):
        r, c = positions[i]
        full[r][c] = 0

    return full, solution

