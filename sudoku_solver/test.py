from sympy import primerange

def smallest_prime_factor(n):
    # naive version; you can optimize
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
        if smallest_prime_factor(n) == p:
            if k1 is None:
                k1 = k
            else:
                k2 = k
                break
        k += 1
    return (k1, k2 - k1)

def count_phases(X, targets):
    counts = {t: 0 for t in targets}
    for p in primerange(2, X+1):
        k1, d2 = phi(p)
        phase = (k1, d2)
        if phase in counts:
            counts[phase] += 1
    return counts

targets = [(1,2), (2,1), (2,3), (3,2) , (3,4), (4,3), (4,5), (5,4)]
print(count_phases(5000, targets))
