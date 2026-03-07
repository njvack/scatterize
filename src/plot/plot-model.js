// src/plot/plot-model.js
// Pure computation layer for the scatterplot: given data + model results,
// produces all derived values needed for rendering — scales, point positions,
// KDE data, CI band, colors, Voronoi deduplication.
//
// No DOM access; fully testable without a browser.

import * as d3 from 'd3';
import { Z95 } from '../stats/common.js';

// ColorBrewer Paired palette for group coloring (via D3).
const PAIRED = d3.schemePaired;

// ── Layout ────────────────────────────────────────────────────────────────────

export const MARGIN_DESKTOP = { top: 24, right: 24, bottom: 68, left: 88 };
export const MARGIN_MOBILE  = { top: 16, right: 16, bottom: 52, left: 56 };

// ── Constants shared with the renderer ───────────────────────────────────────

export const TICK_LEN    = 5;    // px: per-point tick marks on axis
export const CORNER_R    = 7;    // px: out-of-range corner marker half-height
export const POINT_R     = 4.5;  // px: default point radius (small n)
export const POINT_R_MIN = 1.5;  // px: minimum point radius (large n)
export const KDE_MAX_PX  = 20;   // px: peak height/width of axis KDE strip

const KDE_GRID_N             = 120; // evaluation grid points for KDE
export const CORNER_BOT_STRIP_Y  = 28;  // px below plot spine for outB corner diamonds
export const CORNER_LEFT_STRIP_X = 60;  // px left of plot spine for outL corner diamonds
const SNAP_PX                = 2;   // px: grid cell size for Delaunay deduplication

// ── Helpers ───────────────────────────────────────────────────────────────────

// Scale point radius down for large datasets: r ∝ n^(-0.25) with a floor.
// At n≤50: 4.5px; n=200: ~3.2px; n=500: ~2.5px; n=2000: ~1.8px.
export function scaledPointR(n) {
  return Math.max(POINT_R_MIN, POINT_R * Math.pow(Math.min(1, 50 / n), 0.25));
}

// Compute 5-number summary (min, q1, median, q3, max) for axis labeling.
// Snaps to the nearest actual data value rather than interpolating.
export function fiveNum(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  const q = p => s[Math.round(p * (n - 1))];
  return [s[0], q(0.25), q(0.5), q(0.75), s[n - 1]];
}

// Format a number for axis labels: drop trailing zeros, limit precision.
export function fmtNum(v) {
  if (v == null || !Number.isFinite(v)) return '';
  if (Math.abs(v) >= 10000 || (Math.abs(v) < 0.001 && v !== 0)) {
    return v.toExponential(2);
  }
  const s = v.toPrecision(4);
  return String(parseFloat(s));
}

// Approximate t_{0.975, df} via Cornish-Fisher expansion (4 terms).
// Error < 0.01 for df >= 5; used for 95% CI bands on OLS.
function tQ95(df) {
  const z = Z95, z2 = z * z;
  return z
    + (z2 * z + z) / (4 * df)
    + (5 * z2 * z2 * z + 16 * z2 * z + 3 * z) / (96 * df * df)
    + (3 * z2 * z2 * z2 * z + 19 * z2 * z2 * z + 17 * z2 * z - 15 * z) / (384 * df * df * df);
}

// Silverman's rule of thumb bandwidth selector.
function silvermanBandwidth(vals) {
  const n = vals.length;
  if (n < 2) return 1;
  const sorted = [...vals].sort((a, b) => a - b);
  const mean = vals.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  const q1 = sorted[Math.floor(0.25 * (n - 1))];
  const q3 = sorted[Math.floor(0.75 * (n - 1))];
  const s = Math.min(std, (q3 - q1) / 1.34) || std;
  if (!s) return 1;
  return 1.06 * s * Math.pow(n, -0.2);
}

// Kernel density estimate on a uniform grid in [domainMin, domainMax].
export function computeKDE(vals, domainMin, domainMax) {
  const bw = silvermanBandwidth(vals);
  const n = vals.length;
  const norm = n * bw * Math.sqrt(2 * Math.PI);
  return Array.from({ length: KDE_GRID_N }, (_, i) => {
    const v = domainMin + i * (domainMax - domainMin) / (KDE_GRID_N - 1);
    const density = vals.reduce((sum, xi) => sum + Math.exp(-0.5 * ((v - xi) / bw) ** 2), 0) / norm;
    return { v, density };
  });
}

// Corner marker position for an out-of-range censored point.
// Returns null for in-range points; { x, y, outL, outR, outT, outB } otherwise.
function cornerMarkerPos(px, py, xScale, yScale, innerW, innerH) {
  const sx = xScale(px);
  const sy = yScale(py);
  const PAD = 4;
  const outL = sx < 0, outR = sx > innerW;
  const outT = sy < 0, outB = sy > innerH;
  if (!outL && !outR && !outT && !outB) return null;
  const mx = outL ? -CORNER_LEFT_STRIP_X : outR ? innerW + PAD : Math.max(0, Math.min(innerW, sx));
  const my = outT ? -PAD : outB ? innerH + CORNER_BOT_STRIP_Y : Math.max(0, Math.min(innerH, sy));
  return { x: mx, y: my, outL, outR, outT, outB };
}

// Compute CI band points for OLS, Robust, or Theil-Sen.
export function computeBand(r, key, [x0, x1], nPts) {
  if (!r) return null;
  const xs = Array.from({ length: nPts }, (_, i) => x0 + i * (x1 - x0) / (nPts - 1));
  if (key === 'ols' && r.sigma != null && r.xMean != null && r.sxx != null) {
    const t = tQ95(r.n - 2);
    return xs.map(x => {
      const yhat = r.intercept + r.slope * x;
      const se = r.sigma * Math.sqrt(1 / r.n + (x - r.xMean) ** 2 / r.sxx);
      return { x, lo: yhat - t * se, hi: yhat + t * se };
    });
  }
  if (key === 'robust' && r.covIntSlope != null) {
    const t = tQ95(r.n - 2);
    return xs.map(x => {
      const yhat = r.intercept + r.slope * x;
      const se = Math.sqrt(r.seIntercept ** 2 + 2 * x * r.covIntSlope + x * x * r.seSlope ** 2);
      return { x, lo: yhat - t * se, hi: yhat + t * se };
    });
  }
  if (key === 'theilsen' && r.slopeCILow != null) {
    return xs.map(x => ({
      x,
      lo: r.intercept + r.slopeCILow  * x,
      hi: r.intercept + r.slopeCIHigh * x,
    }));
  }
  return null;
}

// buildColorOf(points, groupColorType, fallbackColor) → (point) => color string
export function buildColorOf(points, groupColorType, fallbackColor = 'currentColor') {
  const groupValues = points.map(p => p.group).filter(g => g != null);
  if (groupColorType === 'continuous' && groupValues.length) {
    const vals = groupValues.map(Number).filter(isFinite);
    const [lo, hi] = d3.extent(vals);
    const scale = d3.scaleSequential(d3.interpolatePlasma)
      .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]);
    return p => (p.group != null && isFinite(+p.group)) ? scale(+p.group) : fallbackColor;
  }
  const groups = [...new Set(groupValues.map(String))].sort();
  if (!groups.length) return () => fallbackColor;
  const colorMap = new Map(groups.map((g, i) => [g, PAIRED[i % PAIRED.length]]));
  return p => (p.group != null ? (colorMap.get(String(p.group)) ?? fallbackColor) : fallbackColor);
}

// ── Main model builder ────────────────────────────────────────────────────────

// buildPlotModel — given points + model results + display config, returns all
// derived values needed for rendering. Pure function: no DOM access.
// Returns null if there are no active (uncensored) points.
export function buildPlotModel(points, modelResult, { W, H, modelKey, groupColorType, palette }) {
  const margin = W < 420 ? MARGIN_MOBILE : MARGIN_DESKTOP;
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const active = points.filter(p => !p.censored);
  if (!active.length) return null;

  const pointR = scaledPointR(active.length);

  const xExt = d3.extent(active, p => p.displayX);
  const yExt = d3.extent(active, p => p.displayY);
  const xPad = (xExt[1] - xExt[0]) * 0.06 || 1;
  const yPad = (yExt[1] - yExt[0]) * 0.06 || 1;

  const xScale = d3.scaleLinear()
    .domain([xExt[0] - xPad, xExt[1] + xPad])
    .range([0, iW]);
  const yScale = d3.scaleLinear()
    .domain([yExt[0] - yPad, yExt[1] + yPad])
    .range([iH, 0]);

  const allPoints = points.map(p => {
    const sx = xScale(p.displayX);
    const sy = yScale(p.displayY);
    const corner = p.censored
      ? cornerMarkerPos(p.displayX, p.displayY, xScale, yScale, iW, iH)
      : null;
    return { ...p, sx, sy, corner };
  });

  const xVals = active.map(p => p.displayX).filter(Number.isFinite);
  const yVals = active.map(p => p.displayY).filter(Number.isFinite);

  const xKdeData = computeKDE(xVals, xScale.domain()[0], xScale.domain()[1]);
  const yKdeData = computeKDE(yVals, yScale.domain()[0], yScale.domain()[1]);

  const bandData = computeBand(modelResult, modelKey, xScale.domain(), 60);
  const hasLine  = modelResult?.slope != null && modelResult?.intercept != null;

  const colorOf = buildColorOf(active, groupColorType, palette.point);

  // Voronoi deduplication: collapse sub-pixel coincident points before triangulating.
  const gridMap = new Map();
  for (const p of allPoints) {
    const px = p.corner ? p.corner.x : p.sx;
    const py = p.corner ? p.corner.y : p.sy;
    const key = `${Math.round(px / SNAP_PX)},${Math.round(py / SNAP_PX)}`;
    if (!gridMap.has(key)) gridMap.set(key, p);
  }

  return {
    W, H, iW, iH, margin,
    active,
    pointR,
    xScale, yScale,
    xVals, yVals,
    allPoints,
    cornerPoints: allPoints.filter(p => p.corner),
    xKdeData, yKdeData,
    bandData,
    hasLine,
    colorOf,
    voronoiPoints: [...gridMap.values()],
  };
}
