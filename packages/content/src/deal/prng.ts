/** Small seeded PRNG (mulberry32): the same seed always deals the same deck. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(items: readonly T[], random: () => number): T | undefined {
  return items[Math.floor(random() * items.length)]
}

/** A fresh seed for a new deck (not reproducible — that is what the seed is stored for). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32)
}
