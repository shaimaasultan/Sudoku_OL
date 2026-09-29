def is_valid(grid, r, col, num):
    # Check row and column
    for i in range(12):
        if grid[r][i] == num or grid[i][col] == num:
            return False
            
    # Check 3x4 sub-region
    start_row, start_col = 3 * (r // 3), 4 * (col // 4)
    for i in range(start_row, start_row + 3):
        for j in range(start_col, start_col + 4):
            if grid[i][j] == num:
                return False
    return True

def solve(grid):
    for r in range(12):
        for c in range(12):
            if grid[r][c] == 0:
                for num in range(1, 13):
                    if is_valid(grid, r, c, num):
                        grid[r][c] = num
                        if solve(grid):
                            return True
                        grid[r][c] = 0
                return False
    return True

# Representing your gray cells (0 = empty)
gray_grid = [
    [1, 5, 2, 7, 4, 3, 8, 12, 6, 9, 11, 10],
    [3, 11, 8, 9, 5, 1, 6, 10, 2, 4, 7, 12],
    [4, 12, 6, 10, 0, 2, 0, 0, 3, 8, 5, 1],
    [8, 4, 5, 2, 0, 0, 0, 0, 7, 12, 10, 3],
    [11, 10, 9, 6, 0, 5, 0, 0, 0, 1, 0, 0],
    [7, 1, 12, 3, 0, 4, 10, 0, 5, 2, 6, 11],
    [6, 2, 7, 11, 0, 8, 0, 0, 12, 10, 0, 0],
    [9, 3, 1, 12, 10, 7, 0, 0, 0, 5, 0, 6],
    [5, 8, 10, 4, 0, 6, 0, 0, 11, 3, 0, 7],
    [10, 9, 11, 0, 0, 12, 0, 0, 0, 6, 0, 0],
    [2, 6, 3, 0, 0, 11, 0, 0, 10, 7, 12, 0],
    [12, 7, 4, 0, 0, 10, 0, 0, 0, 11, 0, 0]
]

if solve(gray_grid):
    print("The grid is solvable!")
else:
    print("No solution exists for the gray cells provided.")
