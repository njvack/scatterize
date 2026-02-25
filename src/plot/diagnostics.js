// src/plot/diagnostics.js
// Joined diagnostic panel: distplot (bars left) + shared Y axis + QQ plot (right).
// Shown in the stats panel for OLS and Robust only.

import * as d3 from 'd3';
import { mean, stdev } from '../stats/common.js';

// ---------------------------------------------------------------------------
// Normal distribution utilities
// ---------------------------------------------------------------------------

// Inverse normal CDF (rational approximation, Beasley-Springer-Moro).
// Accurate to ~7 significant figures.
function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return  Infinity;
  const a = [-3.969683028665376e+01,  2.209460984245205e+02,
             -2.759285104469687e+02,  1.383577518672690e+02,
             -3.066479806614716e+01,  2.506628277459239e+00];
  const b = [-5.447609879822406e+01,  1.615858368580409e+02,
             -1.556989798598866e+02,  6.680131188771972e+01,
             -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01,
             -2.400758277161838e+00, -2.549732539343734e+00,
              4.374664141464968e+00,  2.938163982698783e+00];
  const d = [ 7.784695709041462e-03,  3.224671290700398e-01,
              2.445134137142996e+00,  3.754408661907416e+00];
  const pLo = 0.02425, pHi = 1 - pLo;
  if (p < pLo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHi) {
    const q = p - 0.5, r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
            (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

// Normal PDF
function normalPDF(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const DIAG_MARGIN = { top: 8, right: 8, bottom: 20, left: 8 };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// createDiagnostics(container) → { update(opts), clear() }
//
// opts:
//   residuals: number[]
//   activeIndices: number[]        maps residual[i] → original row index
//   hoveredIndex: number | null    original row index of hovered point
//   pointColors: string[] | null   parallel to residuals, one color per active point
//   onQQHover: (index | null) => void
export function createDiagnostics(container) {
  const svg = d3.select(container);

  let diagState = null;
  let lastResiduals     = null;
  let lastActiveIndices = null;

  function update({ residuals, activeIndices, hoveredIndex = null, pointColors = null }) {
    if (!residuals || residuals.length < 3) {
      svg.selectAll('*').remove();
      diagState = null;
      lastResiduals     = null;
      lastActiveIndices = null;
      return;
    }

    // Full redraw only when underlying data changes, not on every hover.
    if (residuals !== lastResiduals || activeIndices !== lastActiveIndices) {
      diagState = fullDraw(svg, residuals, activeIndices, pointColors);
      lastResiduals     = residuals;
      lastActiveIndices = activeIndices;
    }

    // Hover highlight: append/remove elements — no full redraw.
    highlightDiag(diagState, activeIndices, hoveredIndex);
  }

  function clear() {
    svg.selectAll('*').remove();
    diagState = null;
    lastResiduals     = null;
    lastActiveIndices = null;
  }

  return { update, clear };
}

// ---------------------------------------------------------------------------
// Full draw — single SVG with joined distplot (left) and QQ (right)
// ---------------------------------------------------------------------------

function fullDraw(svg, residuals, activeIndices, pointColors) {
  const { width: W, height: H } = svg.node().getBoundingClientRect();
  if (W === 0 || H === 0) return null;

  const m = DIAG_MARGIN;
  const iW = W - m.left - m.right;
  const iH = H - m.top - m.bottom;

  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const n = residuals.length;
  const mu = mean(residuals);
  const sd = stdev(residuals);

  // Shared Y scale (residual values, shared between dist and QQ panels).
  const yExt = d3.extent(residuals);
  const yPad = (yExt[1] - yExt[0]) * 0.1 || sd * 0.3 || 1;
  const yScale = d3.scaleLinear()
    .domain([yExt[0] - yPad, yExt[1] + yPad])
    .range([iH, 0]);

  // Panel layout: equal widths around the shared axis.
  const panelW = iW / 2;
  const sharedAxisX = m.left + panelW; // SVG x coordinate of the shared axis

  // ── Main translated group ─────────────────────────────────────────────
  const innerG = svg.append('g').attr('transform', `translate(0, ${m.top})`);

  // ── Shared Y axis line ────────────────────────────────────────────────
  innerG.append('line').classed('diag-axis', true)
    .attr('x1', sharedAxisX).attr('y1', 0)
    .attr('x2', sharedAxisX).attr('y2', iH);

  // Axis tick marks only — no labels.
  for (const v of yScale.ticks(4)) {
    const y = yScale(v);
    innerG.append('line').classed('diag-axis', true)
      .attr('x1', sharedAxisX - 3).attr('y1', y)
      .attr('x2', sharedAxisX).attr('y2', y);
  }

  // ── Distplot panel ────────────────────────────────────────────────────
  // Origin at (m.left, 0) within innerG. Bars extend left from x = panelW.
  const distG = innerG.append('g').attr('transform', `translate(${m.left}, 0)`);
  drawDist(distG, residuals, n, mu, sd, panelW, iH, yScale);

  // ── Fringe (rug) on shared axis ───────────────────────────────────────
  // Drawn after distplot so it renders on top of bars/KDE fill. Not hoverable.
  const fringeG = innerG.append('g').attr('class', 'diag-fringe-group');
  for (const r of residuals) {
    fringeG.append('line').classed('diag-fringe', true)
      .attr('x1', sharedAxisX - 4).attr('y1', yScale(r))
      .attr('x2', sharedAxisX).attr('y2', yScale(r));
  }

  // ── QQ panel ─────────────────────────────────────────────────────────
  // Origin at (sharedAxisX, 0) within innerG.
  const qqG = innerG.append('g').attr('transform', `translate(${sharedAxisX}, 0)`);
  const { sortedWithIdx, theoretical, xScale: qqXScale } =
    drawQQ(qqG, residuals, n, iH, yScale, panelW, pointColors);

  return {
    svg,
    innerG,
    fringeG,
    qqG,
    yScale,
    iH,
    m,
    sharedAxisX,
    residuals,
    sortedWithIdx,
    theoretical,
    qqXScale,
    hasHover: false,
  };
}

// ---------------------------------------------------------------------------
// Distplot (rotated histogram or KDE)
// Bars/curve extend LEFT from x = panelW (the shared axis edge in local coords).
// ---------------------------------------------------------------------------

function drawDist(g, residuals, n, mu, sd, panelW, iH, yScale) {
  const k = Math.round(Math.sqrt(n));

  if (k <= 20) {
    // Binned histogram
    const binGen = d3.bin()
      .domain(yScale.domain())
      .thresholds(k);
    const bins = binGen(residuals);

    const maxDensity = d3.max(bins, b => {
      const bw = b.x1 - b.x0;
      return bw > 0 ? b.length / (n * bw) : 0;
    });
    const normalPeak = normalPDF(mu, mu, sd);
    const xMax = Math.max(maxDensity, normalPeak) * 1.1 || 1;

    // x scale: density 0 → panelW (at shared axis); density max → 0 (left edge).
    const xScale = d3.scaleLinear().domain([0, xMax]).range([panelW, 0]);

    // Rotated bars: y spans the bin's residual range; x spans from shared axis left.
    g.selectAll('.diag-bar')
      .data(bins)
      .join('rect').classed('diag-bar', true)
      .attr('x', b => {
        const bw = b.x1 - b.x0;
        const density = bw > 0 ? b.length / (n * bw) : 0;
        return xScale(density);
      })
      .attr('y', b => yScale(b.x1))
      .attr('width', b => {
        const bw = b.x1 - b.x0;
        const density = bw > 0 ? b.length / (n * bw) : 0;
        return Math.max(0, panelW - xScale(density));
      })
      .attr('height', b => Math.max(0, yScale(b.x0) - yScale(b.x1)));

    // Rotated normal curve: y = residual value, x = PDF density going left.
    const curveVals = d3.range(yScale.domain()[0], yScale.domain()[1] + sd / 20, sd / 20);
    const line = d3.line()
      .y(v => yScale(v))
      .x(v => xScale(normalPDF(v, mu, sd)));
    g.append('path').classed('diag-curve', true).attr('d', line(curveVals));

  } else {
    // KDE with Silverman IQR-robust bandwidth.
    // h = 0.9 * min(σ, IQR/1.34) * n^(-0.2)
    // No-ties variance formula — errs conservative (wider CI) with ties.
    const sorted = [...residuals].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const h = 0.9 * Math.min(sd, iqr / 1.34) * Math.pow(n, -0.2) || sd * 0.1;

    const [yLo, yHi] = yScale.domain();
    const step = (yHi - yLo) / 80;
    const evalPts = d3.range(yLo, yHi + step, step);

    function kde(x) {
      return residuals.reduce((sum, r) => {
        const z = (x - r) / h;
        return sum + Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
      }, 0) / (n * h);
    }

    const densities = evalPts.map(kde);
    const normalDensities = evalPts.map(v => normalPDF(v, mu, sd));
    const xMax = Math.max(d3.max(densities), d3.max(normalDensities)) * 1.1 || 1;
    const xScale = d3.scaleLinear().domain([0, xMax]).range([panelW, 0]);

    // KDE as filled area (same bar style as histogram).
    const area = d3.area()
      .y((_, i) => yScale(evalPts[i]))
      .x0(panelW)
      .x1(d => xScale(d));
    g.append('path').classed('diag-bar', true).attr('d', area(densities));

    // Normal curve — same style as QQ reference line.
    const normalLine = d3.line()
      .y((_, i) => yScale(evalPts[i]))
      .x(d => xScale(d));
    g.append('path').classed('diag-curve', true).attr('d', normalLine(normalDensities));
  }
}

// ---------------------------------------------------------------------------
// QQ plot: theoretical (X) vs sample Y (shared yScale)
// ---------------------------------------------------------------------------

function drawQQ(g, residuals, n, iH, yScale, panelW, pointColors) {
  const sortedWithIdx = residuals.map((r, i) => ({ r, i })).sort((a, b) => a.r - b.r);
  const theoretical = sortedWithIdx.map((_, i) => normalQuantile((i + 0.5) / n));

  const xExt = d3.extent(theoretical);
  const xPad = (xExt[1] - xExt[0]) * 0.08;
  const xScale = d3.scaleLinear()
    .domain([xExt[0] - xPad, xExt[1] + xPad])
    .range([0, panelW]);

  // Reference line through Q1 and Q3 — same .diag-curve style as normal curve.
  const q1t = normalQuantile(0.25), q3t = normalQuantile(0.75);
  const q1s = sortedWithIdx[Math.floor(n * 0.25)].r;
  const q3s = sortedWithIdx[Math.floor(n * 0.75)].r;
  const slope = (q3s - q1s) / (q3t - q1t);
  const intercept = q1s - slope * q1t;
  const xd = xScale.domain();
  g.append('line').classed('diag-curve', true)
    .attr('x1', xScale(xd[0])).attr('y1', yScale(intercept + slope * xd[0]))
    .attr('x2', xScale(xd[1])).attr('y2', yScale(intercept + slope * xd[1]));

  // QQ points colored by group.
  const pointsLayer = g.append('g').attr('class', 'qq-points');
  sortedWithIdx.forEach(({ r, i }, si) => {
    const color = pointColors ? pointColors[i] : 'var(--color-point)';
    pointsLayer.append('circle').classed('diag-point', true)
      .attr('cx', xScale(theoretical[si]))
      .attr('cy', yScale(r))
      .attr('r', 2.5)
      .attr('fill', color);
  });

  return { sortedWithIdx, theoretical, xScale };
}

// ---------------------------------------------------------------------------
// Hover highlight — append/remove a single element; no full redraw
// ---------------------------------------------------------------------------

function highlightDiag(state, activeIndices, hoveredIndex) {
  if (!state) return;

  if (state.hasHover) {
    state.innerG.selectAll('.diag-fringe--hovered, .diag-point--hovered').remove();
    state.hasHover = false;
  }

  if (hoveredIndex == null) return;
  const i = activeIndices ? activeIndices.indexOf(hoveredIndex) : -1;
  if (i < 0) return;

  const r = state.residuals[i];
  const y = state.yScale(r);

  // Fringe highlight on shared axis.
  state.innerG.append('line')
    .classed('diag-fringe--hovered', true)
    .attr('x1', state.sharedAxisX - 6)
    .attr('y1', y)
    .attr('x2', state.sharedAxisX)
    .attr('y2', y);

  // QQ point highlight.
  const si = state.sortedWithIdx.findIndex(d => d.i === i);
  if (si >= 0) {
    state.qqG.append('circle')
      .classed('diag-point--hovered', true)
      .attr('cx', state.qqXScale(state.theoretical[si]))
      .attr('cy', state.yScale(state.sortedWithIdx[si].r))
      .attr('r', 4);
  }

  state.hasHover = true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtShort(v) {
  if (v === 0) return '0';
  if (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(1);
  return parseFloat(v.toPrecision(3)).toString();
}
