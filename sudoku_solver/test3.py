from sympy import primerange
import math
import matplotlib.pyplot as plt

def spf(n):
    d = 2
    while d * d <= n:
        if n % d == 0:
            return d
        d += 1
    return n

def classify_prime(p):
    n1 = p*p + 2*p
    if spf(n1) == p:
        return "G2"
    n2 = p*p + 4*p
    if spf(n2) == p:
        return "G4"
    return "other"

def phi(p):
    k1 = None
    k2 = None
    k = 1
    while k2 is None:
        n = p*p + 2*k*p
        if spf(n) == p:
            if k1 is None:
                k1 = k
            else:
                k2 = k
                break
        k += 1
    return (k1, k2 - k1)

def collect_normalized(X):
    G2_norm = []
    G4_norm = []
    for p in primerange(2, X+1):
        group = classify_prime(p)
        if group in ("G2", "G4"):
            k1, m = phi(p)
            y = m / math.log(p)
            if group == "G2":
                G2_norm.append(y)
            else:
                G4_norm.append(y)
    return G2_norm, G4_norm


cutoffs = [5000, 20000, 80000]
bins = 40

plt.figure(figsize=(12, 6))

for i, X in enumerate(cutoffs, 1):
    G2_norm, G4_norm = collect_normalized(X)

    plt.subplot(2, len(cutoffs), i)
    plt.hist(G2_norm, bins=bins, density=True, alpha=0.6, label=f"G2 up to {X}")
    plt.hist(G4_norm, bins=bins, density=True, alpha=0.6, label=f"G4 up to {X}")
    plt.title(f"Normalized m/log p, X={X}")
    plt.xlabel("m / log p")
    plt.ylabel("density")
    plt.legend()

    # Optional: overlay an exponential with some lambda (e.g. lambda=1)
    import numpy as np
    xs = np.linspace(0, max(G2_norm + G4_norm), 200)
    lam = 1.0
    plt.plot(xs, lam * np.exp(-lam * xs), 'k--', linewidth=1)

plt.tight_layout()
plt.show()
