// Seeded randomness, so a screenshot seed rebuilds the same island.
// mulberry32 is a tiny deterministic PRNG; valueNoise2D layers it into
// smooth 2D noise with two octaves for hills and ridges.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function makeNoise2D(seed) {
  const rand = mulberry32(seed);
  const size = 64;
  const gridA = new Float32Array(size * size);
  const gridB = new Float32Array(size * size);
  for (let i = 0; i < gridA.length; i++) gridA[i] = rand();
  for (let i = 0; i < gridB.length; i++) gridB[i] = rand();

  function sample(grid, x, z) {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = smooth(x - xi);
    const zf = smooth(z - zi);
    const x0 = ((xi % size) + size) % size;
    const x1 = (x0 + 1) % size;
    const z0 = ((zi % size) + size) % size;
    const z1 = (z0 + 1) % size;
    const a = grid[z0 * size + x0];
    const b = grid[z0 * size + x1];
    const c = grid[z1 * size + x0];
    const d = grid[z1 * size + x1];
    return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf;
  }

  // Returns 0..1. Two octaves: broad hills plus smaller bumps.
  return function noise2D(x, z) {
    const coarse = sample(gridA, x, z);
    const fine = sample(gridB, x * 3.1, z * 3.1);
    return coarse * 0.72 + fine * 0.28;
  };
}
