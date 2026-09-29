import math

from sympy import primerange

from sympy import primerange

def spf(n):
    d = 2
    while d * d <= n:
        if n % d == 0:
            return d
        d += 1
    return n

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

def classify_prime(p):
    n1 = p*p + 2*p
    if spf(n1) == p:
        return "G2"
    n2 = p*p + 4*p
    if spf(n2) == p:
        return "G4"
    return "other"

def collect_normalized_by_group(X):
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

from scipy.stats import ks_2samp

for X in [5000, 20000, 80000]:
    G2_norm, G4_norm = collect_normalized_by_group(X)
    stat, pval = ks_2samp(G2_norm, G4_norm)
    print(f"X={X}: KS(G2, G4) = {stat:.4f}, p={pval:.4g}")

from scipy.stats import kstest, expon

lam = 1.0  # you can later fit this from the data

for X in [5000, 20000, 80000]:
    G2_norm, G4_norm = collect_normalized_by_group(X)

    stat2, p2 = kstest(G2_norm, lambda x: expon.cdf(x, scale=1/lam))
    stat4, p4 = kstest(G4_norm, lambda x: expon.cdf(x, scale=1/lam))

    print(f"X={X}: KS(G2, Exp) = {stat2:.4f}, p={p2:.4g}")
    print(f"       KS(G4, Exp) = {stat4:.4f}, p={p4:.4g}")
