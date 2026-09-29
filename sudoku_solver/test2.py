from sympy import primerange

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
        return "G2"   # starts with 2p
    n2 = p*p + 4*p
    if spf(n2) == p:
        return "G4"   # starts with 4p
    return "other"    # starts at 6p or later

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

def experiment(X):
    G2_second = []
    G4_second = []
    G2_count = G4_count = 0

    for p in primerange(2, X+1):
        group = classify_prime(p)
        if group == "G2":
            G2_count += 1
            k1, d2 = phi(p)
            G2_second.append(d2)
        elif group == "G4":
            G4_count += 1
            k1, d2 = phi(p)
            G4_second.append(d2)

    return G2_count, G4_count, G2_second, G4_second

import matplotlib.pyplot as plt

X = 50000
G2_count, G4_count, G2_second, G4_second = experiment(X)

plt.figure(figsize=(10,4))

plt.subplot(1,2,1)
plt.hist(G2_second, bins=range(1, max(G2_second)+2), density=True, alpha=0.7)
plt.title(f"G2 (starts 2p), count={G2_count}")
plt.xlabel("second coordinate (k2 - k1)")
plt.ylabel("density")

plt.subplot(1,2,2)
plt.hist(G4_second, bins=range(1, max(G4_second)+2), density=True, alpha=0.7)
plt.title(f"G4 (starts 4p), count={G4_count}")
plt.xlabel("second coordinate (k2 - k1)")

plt.tight_layout()
plt.show()
