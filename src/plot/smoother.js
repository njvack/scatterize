// src/plot/smoother.js
// Running median + IQR and LOWESS smoothers.
//
// Both return { line: [{x, y}], band: [{x, y0, y1}] | null }
// so scatterplot.js can render them uniformly.
//
// Window/bandwidth is a nearest-neighbor fraction: for each grid point,
// the k = max(7, round(fraction * n)) closest points by x distance are used.
// This adapts automatically to uneven x spacing (no hard bin edges).

import { fiveNum } from './plot-model.js';

const MIN_PTS = 7;

// ── Running median + IQR ─────────────────────────────────────────────────────

export function runningMedianIQR(active, windowFraction, gridSize = 200) {
  const pts = preparePoints(active, windowFraction);
  if (!pts) return null;
  const { xs, ys, k, xMin, xMax, n } = pts;

  const line = [], band = [];

  for (let gi = 0; gi < gridSize; gi++) {
    const gx = xMin + (gi / (gridSize - 1)) * (xMax - xMin);
    const windowYs = nearestKYs(xs, ys, n, k, gx);
    if (!windowYs) continue;

    const [, q1, median, q3] = fiveNum(windowYs);
    line.push({ x: gx, y: median });
    band.push({ x: gx, y0: q1, y1: q3 });
  }

  return line.length >= 2 ? { line, band } : null;
}

// ── LOWESS ───────────────────────────────────────────────────────────────────
//
// Cleveland (1979) locally weighted regression with tricube kernel.
// Single-pass (no outlier-robustness iterations).
//
// Bootstrap CI: neighborhoods and tricube weights are precomputed once.
// Each bootstrap sample reassigns multiplicity counts to the sorted points,
// then runs WLS using baseWeight * count as the effective weight — O(gridSize*k)
// per bootstrap rather than a full LOWESS refit.

export function lowess(active, bandwidth, { gridSize = 200, nBootstrap = 200 } = {}) {
  const pts = preparePoints(active, bandwidth);
  if (!pts) return null;
  const { xs, ys, k, xMin, xMax, n } = pts;

  // ── Build grid: fitted value + precomputed neighborhood per grid point ──

  // Store neighborhoods as flat typed arrays for fast bootstrap inner loop.
  const gridXs     = [];   // gx for each valid grid point
  const fittedYs   = [];   // base LOWESS fitted value at each grid point
  // Per grid point: k neighbors stored in parallel flat arrays (concatenated).
  const nbrSortedIdxs  = [];  // sortedIdx into xs/ys
  const nbrXs          = [];
  const nbrYs          = [];
  const nbrBaseWeights = [];
  const nbrCounts      = [];  // number of neighbors per grid point (may be < k at edges)

  for (let gi = 0; gi < gridSize; gi++) {
    const gx = xMin + (gi / (gridSize - 1)) * (xMax - xMin);
    const nbrs = nearestKWithDist(xs, ys, n, k, gx);
    if (!nbrs) continue;

    const m = nbrs.length;
    const maxDist = nbrs[m - 1].dist;  // sorted by dist ascending

    const idxArr = new Int32Array(m);
    const xArr   = new Float64Array(m);
    const yArr   = new Float64Array(m);
    const wArr   = new Float64Array(m);

    let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
    for (let j = 0; j < m; j++) {
      const { sortedIdx, x, y, dist } = nbrs[j];
      const u = maxDist < 1e-12 ? 0 : dist / maxDist;
      const w = (1 - u * u * u) ** 3;
      idxArr[j] = sortedIdx;
      xArr[j]   = x;
      yArr[j]   = y;
      wArr[j]   = w;
      sw   += w;  swx  += w * x;  swy  += w * y;
      swxx += w * x * x;  swxy += w * x * y;
    }

    gridXs.push(gx);
    fittedYs.push(wlsSolve(sw, swx, swy, swxx, swxy, gx));
    nbrSortedIdxs.push(idxArr);
    nbrXs.push(xArr);
    nbrYs.push(yArr);
    nbrBaseWeights.push(wArr);
    nbrCounts.push(m);
  }

  if (gridXs.length < 2) return null;

  const line = gridXs.map((x, i) => ({ x, y: fittedYs[i] }));
  if (nBootstrap <= 0) return { line, band: null };

  // ── Bootstrap CI ─────────────────────────────────────────────────────────

  const G = gridXs.length;
  const counts  = new Int32Array(n);
  // bootFits[gi] collects one fitted value per bootstrap per grid point.
  const bootFits = Array.from({ length: G }, () => new Float64Array(nBootstrap));

  for (let b = 0; b < nBootstrap; b++) {
    counts.fill(0);
    for (let i = 0; i < n; i++) counts[Math.floor(Math.random() * n)]++;

    for (let gi = 0; gi < G; gi++) {
      const m    = nbrCounts[gi];
      const idxs = nbrSortedIdxs[gi];
      const xs_  = nbrXs[gi];
      const ys_  = nbrYs[gi];
      const bws  = nbrBaseWeights[gi];

      let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
      for (let j = 0; j < m; j++) {
        const w = bws[j] * counts[idxs[j]];
        const x = xs_[j], y = ys_[j];
        sw   += w;  swx  += w * x;  swy  += w * y;
        swxx += w * x * x;  swxy += w * x * y;
      }
      bootFits[gi][b] = (sw < 1e-12)
        ? fittedYs[gi]  // degenerate sample — fall back to base fit
        : wlsSolve(sw, swx, swy, swxx, swxy, gridXs[gi]);
    }
  }

  // Percentile band: sort bootstrap fits at each grid point, take 2.5/97.5.
  const band = gridXs.map((x, gi) => {
    const fits = bootFits[gi].slice().sort();
    return { x, y0: quantileSorted(fits, 0.025), y1: quantileSorted(fits, 0.975) };
  });

  return { line, band };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function preparePoints(active, fraction) {
  const n = active.length;
  if (n < MIN_PTS) return null;

  const sorted = [...active].sort((a, b) => a.x - b.x);
  const xs = sorted.map(p => p.x);
  const ys = sorted.map(p => p.y);
  const xMin = xs[0], xMax = xs[n - 1];
  if (xMin === xMax) return null;

  const k = Math.max(MIN_PTS, Math.round(fraction * n));
  return { xs, ys, k, xMin, xMax, n };
}

// Returns y values of k nearest points to gx, or null if < MIN_PTS found.
function nearestKYs(xs, ys, n, k, gx) {
  const lo = bisect(xs, n, gx);
  let left = lo - 1, right = lo;
  const out = [];
  while (out.length < k) {
    const dL = left  >= 0 ? Math.abs(xs[left]  - gx) : Infinity;
    const dR = right < n  ? Math.abs(xs[right] - gx) : Infinity;
    if (dL === Infinity && dR === Infinity) break;
    if (dL <= dR) { out.push(ys[left--]); } else { out.push(ys[right++]); }
  }
  return out.length >= MIN_PTS ? out : null;
}

// Returns [{sortedIdx, x, y, dist}] sorted by dist ascending, or null.
function nearestKWithDist(xs, ys, n, k, gx) {
  const lo = bisect(xs, n, gx);
  let left = lo - 1, right = lo;
  const out = [];
  while (out.length < k) {
    const dL = left  >= 0 ? Math.abs(xs[left]  - gx) : Infinity;
    const dR = right < n  ? Math.abs(xs[right] - gx) : Infinity;
    if (dL === Infinity && dR === Infinity) break;
    if (dL <= dR) { out.push({ sortedIdx: left,  x: xs[left],  y: ys[left],  dist: dL }); left--;  }
    else          { out.push({ sortedIdx: right, x: xs[right], y: ys[right], dist: dR }); right++; }
  }
  if (out.length < MIN_PTS) return null;
  out.sort((a, b) => a.dist - b.dist);
  return out;
}

// Weighted least-squares: y = a + b*x, predict at xp.
function wlsSolve(sw, swx, swy, swxx, swxy, xp) {
  const denom = sw * swxx - swx * swx;
  if (Math.abs(denom) < 1e-12) return swy / sw;
  const slope = (sw * swxy - swx * swy) / denom;
  return (swy - slope * swx) / sw + slope * xp;
}

// Linear-interpolation quantile on a pre-sorted array.
function quantileSorted(sorted, p) {
  const h = p * (sorted.length - 1);
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return lo === hi ? sorted[lo] : sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

// First index where xs[i] >= gx.
function bisect(xs, n, gx) {
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < gx) lo = mid + 1; else hi = mid;
  }
  return lo;
}
