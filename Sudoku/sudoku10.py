import tkinter as tk
import copy
from collections import Counter
import math
#import initialGridGenerator as igg
import random
# ---------------------------------------------------------
# Symbol mapping for N up to 62 (1-9, A-Z, a-z)
# ---------------------------------------------------------

SYMBOLS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def num_to_symbol(x):
    if x <= 0:
        return "."
    if x < len(SYMBOLS):
        return SYMBOLS[x]
    return str(x)

# ---------------------------------------------------------
# Size + box shape
# ---------------------------------------------------------

def get_size(grid):
    return len(grid)

def choose_box_shape(N):
    # Find factor pair (r, c) with r*c=N, r<=c, closest to sqrt(N)
    best = None
    root = math.sqrt(N)
    for r in range(1, N+1):
        if N % r == 0:
            c = N // r
            if r <= c:
                diff = abs(r - root)
                if best is None or diff < best[0]:
                    best = (diff, r, c)
    if best is None:
        raise ValueError(f"No valid box shape for N={N}")
    _, r, c = best
    return r, c

def count_digits(grid):
    flat = [x for row in grid for x in row if x != 0]
    return Counter(flat)

def is_solved(grid):
    N = get_size(grid)
    return all(grid[r][c] != 0 for r in range(N) for c in range(N))

# ---------------------------------------------------------
# Layer construction (generalized)
# ---------------------------------------------------------

def build_layer(grid, digit):
    N = get_size(grid)
    box_rows, box_cols = choose_box_shape(N)

    layer = [[True if grid[r][c] == 0 else False for c in range(N)] for r in range(N)]

    # Block boxes
    for br in range(0, N, box_rows):
        for bc in range(0, N, box_cols):
            box_has_digit = any(
                grid[r][c] == digit
                for r in range(br, br + box_rows)
                for c in range(bc, bc + box_cols)
            )
            if box_has_digit:
                for r in range(br, br + box_rows):
                    for c in range(bc, bc + box_cols):
                        if grid[r][c] == 0:
                            layer[r][c] = False

    # Block rows/columns
    for r in range(N):
        for c in range(N):
            if grid[r][c] == digit:
                for cc in range(N):
                    if grid[r][cc] == 0:
                        layer[r][cc] = False
                for rr in range(N):
                    if grid[rr][c] == 0:
                        layer[rr][c] = False

    return layer

# ---------------------------------------------------------
# Fill logic (generalized)
# ---------------------------------------------------------

def fill_for_digit(grid, digit, layer):
    N = get_size(grid)
    box_rows, box_cols = choose_box_shape(N)
    new_grid = copy.deepcopy(grid)
    changed = False

    for br in range(0, N, box_rows):
        for bc in range(0, N, box_cols):
            candidates = [
                (r, c)
                for r in range(br, br + box_rows)
                for c in range(bc, bc + box_cols)
                if layer[r][c]
            ]
            if len(candidates) == 1:
                r, c = candidates[0]
                if new_grid[r][c] == 0:
                    new_grid[r][c] = digit
                    changed = True

    return new_grid, changed

def fill_single_missing(grid):
    N = get_size(grid)
    new_grid = copy.deepcopy(grid)
    changed = False

    # Rows
    for r in range(N):
        row = new_grid[r]
        if row.count(0) == 1:
            missing = set(range(1, N + 1)) - set(row)
            c = row.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    # Columns
    for c in range(N):
        col = [new_grid[r][c] for r in range(N)]
        if col.count(0) == 1:
            missing = set(range(1, N + 1)) - set(col)
            r = col.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    return new_grid, changed

# ---------------------------------------------------------
# Deterministic propagation using layer logic
# ---------------------------------------------------------

def propagate_with_layers(grid):
    grid = copy.deepcopy(grid)
    while True:
        changed_any = False

        counts = count_digits(grid)
        if counts:
            digits_order = [d for (d, _) in counts.most_common()]
            for digit in digits_order:
                layer = build_layer(grid, digit)
                new_grid, changed = fill_for_digit(grid, digit, layer)
                if changed:
                    grid = new_grid
                    changed_any = True

        grid, changed_rc = fill_single_missing(grid)
        if changed_rc:
            changed_any = True

        if not changed_any:
            break

    return grid

# ---------------------------------------------------------
# Backtracking with MRV, as a generator for animation
# ---------------------------------------------------------

def compute_candidates(grid):
    N = len(grid)
    box_rows, box_cols = choose_box_shape(N)
    candidates = [[set() for _ in range(N)] for _ in range(N)]

    all_digits = set(range(1, N+1))

    for r in range(N):
        for c in range(N):
            if grid[r][c] != 0:
                continue

            row_vals = set(grid[r])
            col_vals = {grid[rr][c] for rr in range(N)}

            br = (r // box_rows) * box_rows
            bc = (c // box_cols) * box_cols
            box_vals = {
                grid[rr][cc]
                for rr in range(br, br+box_rows)
                for cc in range(bc, bc+box_cols)
            }

            used = row_vals | col_vals | box_vals
            candidates[r][c] = all_digits - used

    return candidates

def select_mrv_cell(candidates, grid):
    N = len(grid)
    best = None
    best_pos = None

    for r in range(N):
        for c in range(N):
            if grid[r][c] == 0:
                k = len(candidates[r][c])
                if k == 0:
                    return None, None  # conflict
                if best is None or k < best:
                    best = k
                    best_pos = (r, c)

    return best_pos

def deep_solve_generator(grid):
    grid = propagate_with_layers(grid)
    yield {"type": "state", "grid": copy.deepcopy(grid)}

    if is_solved(grid):
        yield {"type": "done", "grid": copy.deepcopy(grid)}
        return

    candidates = compute_candidates(grid)
    pos = select_mrv_cell(candidates, grid)
    if pos == (None, None):
        yield {"type": "dead", "grid": copy.deepcopy(grid)}
        return

    r, c = pos # type: ignore
    for val in sorted(candidates[r][c]): # type: ignore
        trial = copy.deepcopy(grid)
        trial[r][c] = val

        yield {
            "type": "guess",
            "row": r,
            "col": c,
            "value": val,
            "grid": copy.deepcopy(trial),
        }

        child_solved = False
        for ev in deep_solve_generator(trial):
            if ev["type"] == "dead":
                break
            if ev["type"] == "done":
                yield ev
                return
            yield ev

        # backtrack from this guess
        yield {
            "type": "backtrack",
            "row": r,
            "col": c,
            "grid": copy.deepcopy(grid),
        }

    yield {"type": "dead", "grid": copy.deepcopy(grid)}

#---------------------------------------------------------
# Simple backtracking solver for instant solve option
#---------------------------------------------------------
def deep_solve_instant_core(grid):
    """
    A pure, instant, non-animated deep solver.
    Uses MRV + backtracking + your propagation logic.
    Returns a solved grid or None.
    """
    # First propagate deterministically
    grid = propagate_with_layers(copy.deepcopy(grid))

    # If solved, return
    if is_solved(grid):
        return grid

    # Compute candidates
    candidates = compute_candidates(grid)
    pos = select_mrv_cell(candidates, grid)

    # Conflict
    if pos == (None, None):
        return None

    r, c = pos # type: ignore

    # Try each candidate
    for val in sorted(candidates[r][c]): # type: ignore
        trial = copy.deepcopy(grid)
        trial[r][c] = val

        result = deep_solve_instant_core(trial)
        if result is not None:
            return result

    # All failed → backtrack
    return None


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

    # Digit permutation
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

#----------------------------------------------
# Alternative puzzle generator using backtracking (slower, but can create very hard puzzles)
# def generate_initial_grid(N, clues_ratio=0.45):
#------------------------------
import copy

def deep_solve_hybrid(grid):
    """
    Top-level hybrid solver:
    1) Run your layer algorithm first.
    2) If not solved, run recursive backtracking.
    3) Each guess is followed by another layer pass.
    """
    # Work on a copy
    grid = copy.deepcopy(grid)

    # First: run your layer algorithm
    grid = propagate_with_layers(grid)

    # If solved after layers, done
    if is_solved(grid):
        return grid

    # Otherwise, start hybrid backtracking
    return _backtrack_hybrid(grid)


def _backtrack_hybrid(grid):
    """
    Recursive part of the hybrid solver:
    - Normal MRV backtracking.
    - After each guess, run propagate_with_layers().
    - If a branch gets stuck, unwind and try the next guess.
    """
    # If solved at this node, return
    if is_solved(grid):
        return grid

    # Compute candidates
    candidates = compute_candidates(grid)
    r, c = select_mrv_cell(candidates, grid) # type: ignore

    # No valid MRV cell -> contradiction
    if (r, c) == (None, None):
        return None

    options = sorted(candidates[r][c]) # type: ignore
    if not options:
        return None

    # Try each candidate
    for val in options:
        trial = copy.deepcopy(grid)
        trial[r][c] = val

        # Immediately run your layer algorithm on this guess
        trial = propagate_with_layers(trial)

        # If that alone solves it, great
        if is_solved(trial):
            return trial

        # Otherwise, go deeper
        result = _backtrack_hybrid(trial)
        if result is not None:
            return result

    # All candidates for this cell failed -> backtrack
    return None



# ---------------------------------------------------------
# GUI (Canvas-based, fully size-agnostic)
# ---------------------------------------------------------

class SudokuGUI:
    def __init__(self, root, grid):
        self.root = root
        self.grid = copy.deepcopy(grid)
        self.N = get_size(grid)
        self.box_rows, self.box_cols = choose_box_shape(self.N)

        # Mark original givens
        self.original = [[(grid[r][c] != 0) for c in range(self.N)] for r in range(self.N)]

        self.round_digits = []
        self.current_digit_index = 0
        self.any_change_in_round = False

        self.playing = False

        # Deep solve animation state
        self.deep_gen = None
        self.highlight_guess = None
        self.highlight_backtrack = None

        size = 40 * self.N
        self.canvas = tk.Canvas(root, width=size, height=size, bg="white")
        self.canvas.pack()

        controls = tk.Frame(root)
        controls.pack(pady=5)

        self.next_button = tk.Button(controls, text="Next Step", command=self.next_step)
        self.next_button.grid(row=0, column=0, padx=5)

        self.play_button = tk.Button(controls, text="Play", command=self.toggle_play)
        self.play_button.grid(row=0, column=1, padx=5)

        self.deep_button = tk.Button(controls, text="Deep Solve", command=self.deep_solve)
        self.deep_button.grid(row=0, column=2, padx=5)

        self.deep_instant_button = tk.Button(controls, text="Deep Solve (Instant)", command=self.deep_solve_instant)
        self.deep_instant_button.grid(row=0, column=6, padx=5)

        tk.Label(controls, text="Speed (ms):").grid(row=0, column=3, padx=5)
        self.speed_scale = tk.Scale(controls, from_=50, to=2000,
                                    orient=tk.HORIZONTAL)
        self.speed_scale.set(300)
        self.speed_scale.grid(row=0, column=4, padx=5)

        controls2 = tk.Frame(root)
        controls2.pack(pady=5)

        tk.Label(controls2, text="Size:").grid(row=0, column=0, padx=5)
        self.size_var = tk.StringVar()
        self.size_var.set("9")
        sizes = ["4", "6", "8", "9", "12", "16", "36"]
        self.size_menu = tk.OptionMenu(controls2, self.size_var, *sizes)
        self.size_menu.grid(row=0, column=1, padx=5)

        tk.Label(controls2, text="Difficulty:").grid(row=0, column=2, padx=5)
        self.diff_scale = tk.Scale(controls2, from_=20, to=80, orient=tk.HORIZONTAL)
        self.diff_scale.set(45)
        self.diff_scale.grid(row=0, column=3, padx=5)

        self.new_button = tk.Button(controls2, text="New Puzzle", command=self.new_puzzle)
        self.new_button.grid(row=0, column=4, padx=5)

        self.deep_hybrid_button = tk.Button(controls, text="Deep Solve (Hybrid)",
                                    command=self.deep_solve_hybrid)
        self.deep_hybrid_button.grid(row=0, column=5, padx=5)



        self.update_display()
        self.root.after(100, self.animation_loop)

    def update_display(self, layer=None, digit=None):
        self.canvas.delete("all")
        cell_size = int(self.canvas.winfo_width() / self.N)

        for r in range(self.N):
            for c in range(self.N):
                x1 = c * cell_size
                y1 = r * cell_size
                x2 = x1 + cell_size
                y2 = y1 + cell_size

                box_index = (r // self.box_rows) * (self.N // self.box_cols) + (c // self.box_cols)
                base_color = "#ffffff" if box_index % 2 == 0 else "#eef2ff"
                cell_color = "#d0e7ff" if self.original[r][c] else base_color

                # DeepSolve highlights override base color
                if self.highlight_guess == (r, c):
                    cell_color = "#b6ffb6"  # light green
                elif self.highlight_backtrack == (r, c):
                    cell_color = "#ffb6b6"  # light red

                self.canvas.create_rectangle(x1, y1, x2, y2,
                                             fill=cell_color, outline="black")

                val = self.grid[r][c]
                if val != 0:
                    color = "blue" if self.original[r][c] else "black"
                    weight = "bold" if self.original[r][c] else "normal"
                    self.canvas.create_text(
                        x1 + cell_size / 2,
                        y1 + cell_size / 2,
                        text=num_to_symbol(val),
                        font=("Arial", max(8, cell_size // 2), weight),
                        fill=color
                    )
                else:
                    if layer is not None:
                        if layer[r][c]:
                            self.canvas.create_text(
                                x1 + cell_size / 2,
                                y1 + cell_size / 2,
                                text=".",
                                font=("Arial", max(8, cell_size // 2)),
                                fill="green"
                            )
                        else:
                            self.canvas.create_text(
                                x1 + cell_size / 2,
                                y1 + cell_size / 2,
                                text="X",
                                font=("Arial", max(8, cell_size // 2)),
                                fill="red"
                            )

        if digit is not None:
            self.root.title(f"{self.N}x{self.N} Layer for {num_to_symbol(digit)}")
        else:
            self.root.title(f"{self.N}x{self.N} Sudoku Layer Viewer")

    def next_step(self):
        # Disable DeepSolve animation if running
        self.deep_gen = None
        self.highlight_guess = None
        self.highlight_backtrack = None

        if is_solved(self.grid):
            self.playing = False
            self.root.title("Solved!")
            return

        if not self.round_digits:
            counts = count_digits(self.grid)
            if not counts:
                self.playing = False
                self.root.title("No digits — finished")
                return
            self.round_digits = [d for (d, _) in counts.most_common()]
            self.current_digit_index = 0
            self.any_change_in_round = False

        if self.current_digit_index >= len(self.round_digits):
            self.grid, changed_rc = fill_single_missing(self.grid)
            if changed_rc:
                self.any_change_in_round = True
                self.update_display()
            else:
                if not self.any_change_in_round:
                    self.playing = False
                    self.root.title("No more changes — finished")
                    return
            self.round_digits = []
            return

        digit = self.round_digits[self.current_digit_index]

        layer = build_layer(self.grid, digit)
        self.update_display(layer, digit)

        new_grid, changed = fill_for_digit(self.grid, digit, layer)

        if changed:
            self.grid = new_grid
            self.any_change_in_round = True
            self.update_display()
        else:
            self.current_digit_index += 1

    def toggle_play(self):
        # Stop DeepSolve if running
        self.deep_gen = None
        self.highlight_guess = None
        self.highlight_backtrack = None

        self.playing = not self.playing
        self.play_button.config(text="Pause" if self.playing else "Play")

    def animation_loop(self):
        if self.playing:
            self.next_step()
        delay = self.speed_scale.get()
        self.root.after(delay, self.animation_loop)

    def new_puzzle(self):
        # Stop animations
        self.playing = False
        self.deep_gen = None
        self.highlight_guess = None
        self.highlight_backtrack = None
        self.play_button.config(text="Play")

        # Read size + difficulty
        N = int(self.size_var.get())
        clues_ratio = self.diff_scale.get() / 100.0

        # Generate puzzle
        grid, _ = generate_initial_grid(N, clues_ratio)

        # Update internal state
        self.grid = grid
        self.N = N
        self.box_rows, self.box_cols = choose_box_shape(N)
        self.original = [[(grid[r][c] != 0) for c in range(N)] for r in range(N)]

        # Destroy old canvas and create a new one
        self.canvas.destroy()
        size = 40 * N
        self.canvas = tk.Canvas(self.root, width=size, height=size, bg="white")
        self.canvas.pack()

        # Reset solver state
        self.round_digits = []
        self.current_digit_index = 0
        self.any_change_in_round = False

        # Redraw
        self.update_display()
        self.root.title(f"New {N}x{N} Puzzle")

    def deep_solve_hybrid(self):
        self.playing = False
        self.play_button.config(text="Play")

        solution = deep_solve_hybrid(self.grid)

        if solution is not None:
            self.grid = solution
            self.update_display()
            self.root.title("Solved by Hybrid DeepSolve")
        else:
            self.root.title("No solution (Hybrid DeepSolve)")

    # ---------------- DeepSolve animation -----------------

    def deep_solve(self):
        # Stop normal play
        self.playing = False
        self.play_button.config(text="Play")

        # Start generator from current grid
        self.deep_gen = deep_solve_generator(self.grid)
        self.highlight_guess = None
        self.highlight_backtrack = None
        self.root.title("DeepSolve running...")
        self.animate_deep()

    def animate_deep(self):
        if self.deep_gen is None:
            return
        try:
            event = next(self.deep_gen)
            self.animate_deep_event(event)
            delay = self.speed_scale.get()
            self.root.after(delay, self.animate_deep)
        except StopIteration:
            self.deep_gen = None

    def animate_deep_event(self, event):
        et = event["type"]
        if et == "state":
            self.grid = event["grid"]
            self.highlight_guess = None
            self.highlight_backtrack = None
            self.update_display()
        elif et == "guess":
            self.grid = event["grid"]
            self.highlight_guess = (event["row"], event["col"])
            self.highlight_backtrack = None
            self.update_display()
        elif et == "backtrack":
            self.grid = event["grid"]
            self.highlight_backtrack = (event["row"], event["col"])
            self.highlight_guess = None
            self.update_display()
        elif et == "done":
            self.grid = event["grid"]
            self.highlight_guess = None
            self.highlight_backtrack = None
            self.update_display()
            self.root.title("Solved by DeepSolve")
            self.deep_gen = None
        elif et == "dead":
            # No solution from this branch; just show grid
            self.grid = event["grid"]
            self.highlight_guess = None
            self.highlight_backtrack = None
            self.update_display()
            if not is_solved(self.grid):
                self.root.title("No solution (DeepSolve)")

    def deep_solve_instant(self):
        # Stop any animation
        self.playing = False
        self.deep_gen = None
        self.highlight_guess = None
        self.highlight_backtrack = None
        self.play_button.config(text="Play")

        # Solve instantly
        solution = deep_solve_instant_core(self.grid)

        if solution is not None:
            self.grid = solution
            self.update_display()
            self.root.title("Solved instantly by DeepSolve")
        else:
            self.root.title("No solution (Instant DeepSolve)")
# ---------------------------------------------------------
# Example: your hard 9x9
# ---------------------------------------------------------

if __name__ == "__main__":
    initial_grid_9x9 = [
        [0,0,0, 0,0,1, 2,3,0],
        [1,2,3, 0,0,8, 0,4,0],
        [0,0,0, 0,0,0, 0,0,0],

        [0,0,0, 2,0,0, 0,0,0],
        [0,0,0, 0,3,0, 0,0,0],
        [0,0,0, 0,0,5, 0,0,0],

        [0,0,0, 0,0,0, 0,6,0],
        [0,7,0, 9,0,0, 4,5,1],
        [0,8,9, 6,0,0, 0,0,0]
    ]

    # clues_ratio controls difficulty.

    # 0.55 → easier

    # 0.45 → medium

    # 0.35 → hard
    # Generate a 9×9 puzzle 
    initial, solution = generate_initial_grid(9,0.1)
    # Generate a 9×9 puzzle 
    initial, solution = generate_initial_grid(8,0.5)
    root = tk.Tk()
    app = SudokuGUI(root, initial)
    root.mainloop()
