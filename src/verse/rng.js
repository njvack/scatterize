// src/verse/rng.js
// Seeded randomness for the bootstrap. Every draw gets its own stream derived
// from (seed, draw index), so a draw's resample doesn't depend on how draws
// are split across workers or in what order they run.

// Mix two 32-bit integers into one (murmur3 finalizer over a combined word).
export function hash32(a, b) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// mulberry32: small, fast, and good enough for resampling indices.
// Returns () => uniform float in [0, 1).
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bootstrap resample of n rows as counts: counts[i] = how many times row i
// was drawn (n draws with replacement). Sums to n.
export function drawCounts(seed, draw, n) {
  const rand = mulberry32(hash32(seed, draw));
  const counts = new Uint32Array(n);
  for (let i = 0; i < n; i++) counts[Math.floor(rand() * n)]++;
  return counts;
}
