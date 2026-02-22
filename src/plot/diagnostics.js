// src/plot/diagnostics.js
// Residuals histogram with normal curve overlay, and Q-Q plot.
// Shown in the stats panel for OLS and Robust only.

import * as d3 from 'd3';

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

// Sample mean
function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// Sample standard deviation
function stdev(arr) {
  const mu = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - mu) ** 2, 0) / (arr.length - 1));
}

// ---------------------------------------------------------------------------
// Plot dimensions
// ---------------------------------------------------------------------------

const DIAG_MARGIN = { top: 12, right: 10, bottom: 28, left: 32 };
const FRINGE_H = 8; // height reserved for rug plot below histogram x-axis

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// createDiagnostics(histContainer, qqContainer) → { update(opts), clear() }
//
// opts:
//   residuals: number[]
//   activeIndices: number[]  (maps residual[i] → original row index for hover matching)
//   hoveredIndex: number | null  (original row index)
export function createDiagnostics(histContainer, qqContainer) {
  const histSvg = d3.select(histContainer);
  const qqSvg   = d3.select(qqContainer);

  function update({ residuals, activeIndices, hoveredIndex = null }) {
    if (!residuals || residuals.length < 3) {
      histSvg.selectAll('*').remove();
      qqSvg.selectAll('*').remove();
      return;
    }

    drawHistogram(histSvg, residuals, activeIndices, hoveredIndex);
    drawQQ(qqSvg, residuals, activeIndices, hoveredIndex);
  }

  function clear() {
    histSvg.selectAll('*').remove();
    qqSvg.selectAll('*').remove();
  }

  return { update, clear };
}

// ---------------------------------------------------------------------------
// Histogram with normal curve + fringe
// ---------------------------------------------------------------------------

function drawHistogram(svg, residuals, activeIndices, hoveredIndex) {
  const { width: W, height: H } = svg.node().getBoundingClientRect();
  if (W === 0 || H === 0) return;
  const m = DIAG_MARGIN;
  const iW = W - m.left - m.right;
  const iH = H - m.top - m.bottom - FRINGE_H;

  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

  const mu = mean(residuals);
  const sd = stdev(residuals);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(residuals).map((v, i) => v + (i === 0 ? -sd * 0.3 : sd * 0.3)))
    .range([0, iW]);

  // Bins
  const bins = d3.bin()
    .domain(xScale.domain())
    .thresholds(Math.min(20, Math.ceil(Math.sqrt(residuals.length))))
    (residuals);

  const maxDensity = d3.max(bins, b => {
    const bw = b.x1 - b.x0;
    return bw > 0 ? b.length / (residuals.length * bw) : 0;
  });
  const normalPeak = normalPDF(mu, mu, sd);
  const yMax = Math.max(maxDensity, normalPeak) * 1.1;

  const yScale = d3.scaleLinear().domain([0, yMax]).range([iH, 0]);

  // Bars
  g.selectAll('.diag-bar')
    .data(bins)
    .join('rect')
    .classed('diag-bar', true)
    .attr('x', b => xScale(b.x0) + 0.5)
    .attr('y', b => {
      const bw = b.x1 - b.x0;
      const density = bw > 0 ? b.length / (residuals.length * bw) : 0;
      return yScale(density);
    })
    .attr('width', b => Math.max(0, xScale(b.x1) - xScale(b.x0) - 1))
    .attr('height', b => {
      const bw = b.x1 - b.x0;
      const density = bw > 0 ? b.length / (residuals.length * bw) : 0;
      return iH - yScale(density);
    });

  // Normal curve
  const curveX = d3.range(xScale.domain()[0], xScale.domain()[1], sd / 20);
  const line = d3.line()
    .x(v => xScale(v))
    .y(v => yScale(normalPDF(v, mu, sd)));

  g.append('path')
    .classed('diag-curve', true)
    .attr('d', line(curveX));

  // Axes
  g.append('line').classed('diag-axis', true)
    .attr('x1', 0).attr('y1', iH).attr('x2', iW).attr('y2', iH);
  g.append('line').classed('diag-axis', true)
    .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', iH);

  // X axis ticks
  for (const v of [mu - 2 * sd, mu - sd, mu, mu + sd, mu + 2 * sd]) {
    const x = xScale(v);
    if (x < 0 || x > iW) continue;
    g.append('line').classed('diag-axis', true)
      .attr('x1', x).attr('y1', iH).attr('x2', x).attr('y2', iH + 4);
    if (v === mu || Math.abs(v - mu) === sd || Math.abs(v - mu) === 2 * sd) {
      g.append('text').classed('diag-tick-label', true)
        .attr('x', x).attr('y', iH + 6)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'hanging')
        .text(fmtShort(v));
    }
  }

  // Fringe (rug plot)
  const fringeY = iH + FRINGE_H / 2;
  const hoveredResidIndex = activeIndices ? activeIndices.indexOf(hoveredIndex) : -1;

  residuals.forEach((r, i) => {
    const isHovered = i === hoveredResidIndex;
    g.append('line')
      .classed('diag-fringe', !isHovered)
      .classed('diag-fringe--hovered', isHovered)
      .attr('x1', xScale(r)).attr('y1', fringeY - 3)
      .attr('x2', xScale(r)).attr('y2', fringeY + 3);
  });
}

// ---------------------------------------------------------------------------
// Q-Q plot: theoretical (X) vs sample (Y)
// ---------------------------------------------------------------------------

function drawQQ(svg, residuals, activeIndices, hoveredIndex) {
  const { width: W, height: H } = svg.node().getBoundingClientRect();
  if (W === 0 || H === 0) return;
  const m = DIAG_MARGIN;
  const iW = W - m.left - m.right;
  const iH = H - m.top - m.bottom;

  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

  const n = residuals.length;
  // Sort keeping original residual indices for hover matching.
  const sortedWithIdx = residuals.map((r, i) => ({ r, i })).sort((a, b) => a.r - b.r);
  const theoretical = sortedWithIdx.map((_, i) => normalQuantile((i + 0.5) / n));

  const xExt = d3.extent(theoretical);
  const yExt = d3.extent(sortedWithIdx, d => d.r);
  const xPad = (xExt[1] - xExt[0]) * 0.08;
  const yPad = (yExt[1] - yExt[0]) * 0.08;

  const xScale = d3.scaleLinear().domain([xExt[0] - xPad, xExt[1] + xPad]).range([0, iW]);
  const yScale = d3.scaleLinear().domain([yExt[0] - yPad, yExt[1] + yPad]).range([iH, 0]);

  // Reference line through Q1 and Q3
  const q1t = normalQuantile(0.25), q3t = normalQuantile(0.75);
  const q1s = sortedWithIdx[Math.floor(n * 0.25)].r;
  const q3s = sortedWithIdx[Math.floor(n * 0.75)].r;
  const slope = (q3s - q1s) / (q3t - q1t);
  const intercept = q1s - slope * q1t;

  const xd = xScale.domain();
  g.append('line').classed('diag-qqline', true)
    .attr('x1', xScale(xd[0])).attr('y1', yScale(intercept + slope * xd[0]))
    .attr('x2', xScale(xd[1])).attr('y2', yScale(intercept + slope * xd[1]));

  const hoveredResidIdx = activeIndices ? activeIndices.indexOf(hoveredIndex) : -1;

  // Points
  sortedWithIdx.forEach(({ r, i: residIdx }, si) => {
    const isHovered = residIdx === hoveredResidIdx;
    g.append('circle')
      .classed('diag-point', !isHovered)
      .classed('diag-point--hovered', isHovered)
      .attr('cx', xScale(theoretical[si]))
      .attr('cy', yScale(r))
      .attr('r', isHovered ? 4 : 2.5);
  });

  // Axes
  g.append('line').classed('diag-axis', true)
    .attr('x1', 0).attr('y1', iH).attr('x2', iW).attr('y2', iH);
  g.append('line').classed('diag-axis', true)
    .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', iH);

  // X axis label
  g.append('text').classed('diag-tick-label', true)
    .attr('x', iW / 2).attr('y', iH + 18)
    .attr('text-anchor', 'middle')
    .text('theoretical');

  // Y axis label (rotated)
  g.append('text').classed('diag-tick-label', true)
    .attr('transform', 'rotate(-90)')
    .attr('x', -iH / 2).attr('y', -m.left + 8)
    .attr('text-anchor', 'middle')
    .text('sample');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtShort(v) {
  if (v === 0) return '0';
  if (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(1);
  return parseFloat(v.toPrecision(3)).toString();
}
