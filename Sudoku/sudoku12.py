import tkinter as tk
import copy
import math
import random
import time
from collections import Counter

SYMBOLS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def num_to_symbol(x):
    if x <= 0:
        return "."
    if x < len(SYMBOLS):
        return SYMBOLS[x]
    return str(x)

def get_size(grid):
    return len(grid)

def choose_box_shape(N):
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

# ---------------- LAYER ALGORITHM ----------------

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

# ---------------- CANDIDATES + MRV ----------------

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
            cand = all_digits - used
            candidates[r][c] = cand

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
                    return None, None
                if best is None or k < best:
                    best = k
                    best_pos = (r, c)
    return best_pos

# ---------------- HYBRID INSTANT SOLVER ----------------

def deep_solve_hybrid_core(grid):
    grid = propagate_with_layers(copy.deepcopy(grid))
    if is_solved(grid):
        return grid

    candidates = compute_candidates(grid)
    r, c = select_mrv_cell(candidates, grid)
    if (r, c) == (None, None):
        return None

    options = sorted(candidates[r][c])
    if not options:
        return None

    for val in options:
        trial = copy.deepcopy(grid)
        trial[r][c] = val
        trial = propagate_with_layers(trial)
        if is_solved(trial):
            return trial
        result = deep_solve_hybrid_core(trial)
        if result is not None:
            return result

    return None

def deep_solve_hybrid(grid):
    grid = copy.deepcopy(grid)
    grid = propagate_with_layers(grid)
    if is_solved(grid):
        return grid
    return deep_solve_hybrid_core(grid)

# ---------------- JUMP-BACKTRACKING GENERATOR ----------------

def deep_solve_jump_generator(grid, forced_cell=None, visited_jumps=None):
    if visited_jumps is None:
        visited_jumps = set()

    grid = propagate_with_layers(copy.deepcopy(grid))
    yield {"type": "state", "grid": copy.deepcopy(grid)}

    if is_solved(grid):
        yield {"type": "done", "grid": copy.deepcopy(grid)}
        return

    candidates = compute_candidates(grid)

    if forced_cell is not None:
        r, c = forced_cell
        if grid[r][c] != 0:
            forced_cell = None

    if forced_cell is None:
        r, c = select_mrv_cell(candidates, grid)
    else:
        r, c = forced_cell

    if (r, c) == (None, None):
        yield {"type": "dead", "grid": copy.deepcopy(grid)}
        return

    opts = sorted(candidates[r][c])
    if not opts:
        yield {"type": "dead", "grid": copy.deepcopy(grid)}
        return

    val = opts[0]
    trial = copy.deepcopy(grid)
    trial[r][c] = val

    yield {
        "type": "guess",
        "row": r,
        "col": c,
        "value": val,
        "grid": copy.deepcopy(trial),
    }

    for ev in deep_solve_jump_generator(trial, None, visited_jumps):
        if ev["type"] == "dead":
            break
        if ev["type"] == "done":
            yield ev
            return
        yield ev

    yield {
        "type": "backtrack",
        "row": r,
        "col": c,
        "grid": copy.deepcopy(grid),
    }

    N = len(grid)
    empty_cells = [(rr, cc) for rr in range(N) for cc in range(N) if grid[rr][cc] == 0]

    # Opposite side jump
    opp_r = N - 1 - r
    opp_c = N - 1 - c
    opposite = (opp_r, opp_c)

    if opposite in empty_cells:
        jump_key = ((r, c), opposite)
        if jump_key not in visited_jumps:
            visited_jumps.add(jump_key)
            for ev in deep_solve_jump_generator(copy.deepcopy(grid), forced_cell=opposite, visited_jumps=visited_jumps):
                yield ev
            return

    # Region jump
    box_rows, box_cols = choose_box_shape(N)
    region_r = (r // box_rows)
    region_c = (c // box_cols)
    region_cells = []
    for rr in range(N):
        for cc in range(N):
            if grid[rr][cc] == 0:
                if (rr // box_rows) != region_r or (cc // box_cols) != region_c:
                    region_cells.append((rr, cc))

    for (rr, cc) in region_cells:
        jump_key = ((r, c), (rr, cc))
        if jump_key not in visited_jumps:
            visited_jumps.add(jump_key)
            for ev in deep_solve_jump_generator(copy.deepcopy(grid), forced_cell=(rr, cc), visited_jumps=visited_jumps):
                yield ev
            return

    # Fallback: any other empty cell
    for (rr, cc) in empty_cells:
        if (rr, cc) == (r, c):
            continue
        jump_key = ((r, c), (rr, cc))
        if jump_key not in visited_jumps:
            visited_jumps.add(jump_key)
            for ev in deep_solve_jump_generator(copy.deepcopy(grid), forced_cell=(rr, cc), visited_jumps=visited_jumps):
                yield ev
            return

    yield {"type": "dead", "grid": copy.deepcopy(grid)}

# ---------------- SIMPLE GUI SHELL (you can merge with yours) ----------------

class SudokuGUI:
    def __init__(self, root, grid):
        self.root = root
        self.grid = copy.deepcopy(grid)
        self.N = get_size(grid)
        self.box_rows, self.box_cols = choose_box_shape(self.N)
        self.original = [[(grid[r][c] != 0) for c in range(self.N)] for r in range(self.N)]

        self.start_time = None
        self.timer_running = False

        size = 40 * self.N
        self.canvas = tk.Canvas(root, width=size, height=size, bg="white")
        self.canvas.pack()

        controls = tk.Frame(root)
        controls.pack(pady=5)

        self.next_button = tk.Button(controls, text="Next Step", command=self.next_step)
        self.next_button.grid(row=0, column=0, padx=5)

        self.play_button = tk.Button(controls, text="Play", command=self.toggle_play)
        self.play_button.grid(row=0, column=1, padx=5)

        self.deep_hybrid_button = tk.Button(controls, text="Deep Solve (Hybrid)", command=self.deep_solve_hybrid)
        self.deep_hybrid_button.grid(row=0, column=2, padx=5)

        self.deep_jump_anim_button = tk.Button(controls, text="Deep Solve (Jump animate)", command=self.deep_solve_jump_animated)
        self.deep_jump_anim_button.grid(row=0, column=3, padx=5)

        self.speed_scale = tk.Scale(controls, from_=10, to=2000, orient=tk.HORIZONTAL)
        self.speed_scale.set(200)
        self.speed_scale.grid(row=0, column=4, padx=5)

        self.timer_label = tk.Label(root, text="Time: 00:00:00", font=("Arial", 12))
        self.timer_label.pack(pady=5)

        self.playing = False
        self.round_digits = []
        self.current_digit_index = 0
        self.any_change_in_round = False

        self.deep_gen = None

        self.update_display()
        self.root.after(100, self.animation_loop)

    def format_time(self, seconds):
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    def update_timer(self):
        if self.timer_running and self.start_time is not None:
            elapsed = time.time() - self.start_time
            self.timer_label.config(text=f"Time: {self.format_time(elapsed)}")
            self.root.after(1000, self.update_timer)

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

                self.canvas.create_rectangle(x1, y1, x2, y2, fill=cell_color, outline="black")

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

        if digit is not None:
            self.root.title(f"{self.N}x{self.N} Layer for {num_to_symbol(digit)}")
        else:
            self.root.title(f"{self.N}x{self.N} Sudoku Viewer")

    def next_step(self):
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
        self.playing = not self.playing
        self.play_button.config(text="Pause" if self.playing else "Play")

    def animation_loop(self):
        if self.playing:
            self.next_step()
        delay = self.speed_scale.get()
        self.root.after(delay, self.animation_loop)

    def deep_solve_hybrid(self):
        self.playing = False
        self.play_button.config(text="Play")
        self.start_time = time.time()
        self.timer_running = True
        self.update_timer()

        solution = deep_solve_hybrid(self.grid)

        self.timer_running = False
        if solution is not None:
            self.grid = solution
            self.update_display()
            elapsed = time.time() - self.start_time
            self.timer_label.config(text=f"Time: {self.format_time(elapsed)}")
            self.root.title("Solved by Hybrid DeepSolve")
        else:
            elapsed = time.time() - self.start_time
            self.timer_label.config(text=f"Failed after {self.format_time(elapsed)}")
            self.root.title("No solution (Hybrid DeepSolve)")

    def deep_solve_jump_animated(self):
        self.playing = False
        self.play_button.config(text="Play")
        self.start_time = time.time()
        self.timer_running = True
        self.update_timer()

        self.deep_gen = deep_solve_jump_generator(self.grid)

        try:
            event = next(self.deep_gen)
        except StopIteration:
            self.timer_running = False
            return

        self.animate_deep_event(event)

    def animate_deep_event(self, event):
        et = event["type"]

        if et == "state":
            self.grid = event["grid"]
            self.update_display()

        elif et == "guess":
            self.grid = event["grid"]
            self.update_display()

        elif et == "backtrack":
            self.grid = event["grid"]
            self.update_display()

        elif et == "done":
            self.grid = event["grid"]
            self.update_display()
            self.timer_running = False
            elapsed = time.time() - self.start_time
            self.timer_label.config(text=f"Time: {self.format_time(elapsed)}")
            self.root.title("Solved by Jump DeepSolve")
            return

        elif et == "dead":
            self.timer_running = False
            elapsed = time.time() - self.start_time
            self.timer_label.config(text=f"Failed after {self.format_time(elapsed)}")
            self.root.title("No solution (Jump DeepSolve)")
            return

        try:
            next_event = next(self.deep_gen)
        except StopIteration:
            self.timer_running = False
            return

        delay = self.speed_scale.get()
        self.root.after(delay, lambda ev=next_event: self.animate_deep_event(ev))

# ---------------- DEMO ----------------

if __name__ == "__main__":
    # Simple 9x9 demo; replace with your 16x16 / 36x36 grid
    demo_grid = [
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

    root = tk.Tk()
    app = SudokuGUI(root, demo_grid)
    root.mainloop()
