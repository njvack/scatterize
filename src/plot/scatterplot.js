// src/plot/scatterplot.js
// D3 v7 scatter plot with per-point axis ticks, quartile labels,
// regression line, censoring, Voronoi hover/click, and superticks.

import * as d3 from 'd3';

// ColorBrewer Paired palette for group coloring (via D3).
const PAIRED = d3.schemePaired;

// Approximate t_{0.975, df} via Cornish-Fisher expansion (4 terms).
// Error < 0.01 for df >= 5; used for 95% CI bands on OLS.
const Z95 = 1.9599639845400536;
function tQ95(df) {
  const z = Z95, z2 = z * z;
  return z
    + (z2 * z + z) / (4 * df)
    + (5 * z2 * z2 * z + 16 * z2 * z + 3 * z) / (96 * df * df)
    + (3 * z2 * z2 * z2 * z + 19 * z2 * z2 * z + 17 * z2 * z - 15 * z) / (384 * df * df * df);
}

const MARGIN = { top: 24, right: 24, bottom: 68, left: 88 };
const TICK_LEN = 5;         // px: per-point tick marks on axis
const SUPERTICK_LEN = 14;   // px: hover supertick
const CORNER_R = 5;         // px: out-of-range corner marker radius
const POINT_R = 4.5;        // px: default point radius
const POINT_R_HOVER = 6.5;  // px: hovered point radius

// Compute 5-number summary (min, q1, median, q3, max) for axis labeling.
function fiveNum(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  const q = p => {
    const idx = p * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
  };
  return [s[0], q(0.25), q(0.5), q(0.75), s[n - 1]];
}

// Format a number for axis labels: drop trailing zeros, limit precision.
function fmtNum(v) {
  if (Math.abs(v) >= 10000 || (Math.abs(v) < 0.001 && v !== 0)) {
    return v.toExponential(2);
  }
  const s = v.toPrecision(4);
  return String(parseFloat(s));
}

// Given a point's (displayX, displayY) in data coords, determine if it's
// out of range of the given domain, and return the clamped SVG position
// for a corner marker (or null if in range).
function cornerMarkerPos(px, py, xScale, yScale, innerW, innerH) {
  const sx = xScale(px);
  const sy = yScale(py);
  const outL = sx < 0, outR = sx > innerW;
  const outT = sy < 0, outB = sy > innerH;
  if (!outL && !outR && !outT && !outB) return null;
  const PAD = CORNER_R + 2;
  const mx = outL ? -PAD : outR ? innerW + PAD : Math.max(0, Math.min(innerW, sx));
  const my = outT ? -PAD : outB ? innerH + PAD : Math.max(0, Math.min(innerH, sy));
  return { x: mx, y: my };
}

// ---------------------------------------------------------------------------
// CI band computation
// ---------------------------------------------------------------------------

// Returns array of { x, lo, hi } for the 95% confidence band, or null if
// insufficient parameters.  nPts controls smoothness (irrelevant for Theil-Sen
// which is always linear, but we use the same number for consistency).
function computeBand(r, key, [x0, x1], nPts) {
  if (!r) return null;
  const xs = Array.from({ length: nPts }, (_, i) => x0 + i * (x1 - x0) / (nPts - 1));

  if (key === 'ols' && r.sigma != null && r.xMean != null && r.sxx != null) {
    const t = tQ95(r.dfResidual);
    return xs.map(xv => {
      const fit = r.intercept + r.slope * xv;
      const hw  = t * r.sigma * Math.sqrt(1 / r.n + (xv - r.xMean) ** 2 / r.sxx);
      return { x: xv, lo: fit - hw, hi: fit + hw };
    });
  }

  if (key === 'robust' && r.covIntSlope != null) {
    return xs.map(xv => {
      const fit    = r.intercept + r.slope * xv;
      const varFit = r.seIntercept ** 2 + 2 * xv * r.covIntSlope + xv ** 2 * r.seSlope ** 2;
      const hw     = Z95 * Math.sqrt(Math.max(0, varFit));
      return { x: xv, lo: fit - hw, hi: fit + hw };
    });
  }

  if (key === 'theilsen' && r.slopeCILow != null) {
    // Two straight lines — only need the domain endpoints, but use nPts for
    // a consistent path length so d3.area transition doesn't produce artifacts.
    return xs.map(xv => {
      const yA = r.interceptCILow  + r.slopeCILow  * xv;
      const yB = r.interceptCIHigh + r.slopeCIHigh * xv;
      return { x: xv, lo: Math.min(yA, yB), hi: Math.max(yA, yB) };
    });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// createScatterplot(svgEl) → { update(opts), clear() }
//
// opts shape:
//   points: [{ index, displayX, displayY, originalX, originalY, group, censored }]
//   modelResult: { slope, intercept, ... } | null
//   xLabel, yLabel: strings
//   modelKey: 'ols' | 'robust' | 'spearman' | 'theilsen'
//   customXTicks, customYTicks: number[] | null
//   onPointClick(index): called when a point is clicked
//   onPointHover(index | null): called on hover change
export function createScatterplot(svgEl) {
  const svg = d3.select(svgEl);

  // Create SVG structure once.
  const defs = svg.append('defs');
  const clipId = 'plot-clip-' + Math.random().toString(36).slice(2);
  const clipRect = defs.append('clipPath').attr('id', clipId)
    .append('rect');

  const canvas = svg.append('g').attr('class', 'canvas');
  const xAxisG  = canvas.append('g').attr('class', 'x-axis');
  const yAxisG  = canvas.append('g').attr('class', 'y-axis');
  const plotArea = canvas.append('g').attr('class', 'plot-area')
    .attr('clip-path', `url(#${clipId})`);
  const ciBandEl   = plotArea.append('path').attr('class', 'ci-band');
  const regLineEl  = plotArea.append('line').attr('class', 'regression-line');
  const pointsG    = plotArea.append('g').attr('class', 'points');
  const cornersG   = canvas.append('g').attr('class', 'corners'); // outside clip
  const hoverG     = canvas.append('g').attr('class', 'hover-layer').style('pointer-events', 'none');
  const voronoiG   = canvas.append('g').attr('class', 'voronoi-overlay').style('fill', 'none');

  let lastOnHover = null;
  let prevState = new Map(); // index → { sx, sy, cornerX, cornerY, isCorner }

  function update({
    points,
    modelResult,
    xLabel = 'x',
    yLabel = 'y',
    modelKey = 'ols',
    groupColorType = 'categorical',
    customXTicks = null,
    customYTicks = null,
    onPointClick = () => {},
    onPointHover = () => {},
  }) {
    lastOnHover = onPointHover;
    // Clear any stuck hover overlay immediately when data changes.
    clearHover();
    onPointHover(null);

    const { width: W, height: H } = svgEl.getBoundingClientRect();
    if (W === 0 || H === 0) return;
    const iW = W - MARGIN.left - MARGIN.right;
    const iH = H - MARGIN.top - MARGIN.bottom;

    svg.attr('viewBox', `0 0 ${W} ${H}`);
    canvas.attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
    clipRect.attr('width', iW).attr('height', iH);

    // Scales from uncensored points only.
    const active = points.filter(p => !p.censored);
    if (!active.length) return;

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

    // ── Axes ──────────────────────────────────────────────────────────────

    xAxisG.attr('transform', `translate(0,${iH})`);
    yAxisG.attr('transform', `translate(0,0)`);

    drawAxis(xAxisG, active.map(p => p.displayX), xScale, iH, iW, 'x',
             xLabel, customXTicks);
    drawAxis(yAxisG, active.map(p => p.displayY), yScale, iH, iW, 'y',
             yLabel, customYTicks);

    // ── Transition ────────────────────────────────────────────────────────

    const T = d3.transition().duration(200).ease(d3.easeExpOut);

    // ── Regression line ───────────────────────────────────────────────────

    const hasLine = modelResult && modelResult.slope != null
      && modelResult.intercept != null;

    if (hasLine) {
      const x0 = xScale.domain()[0];
      const x1 = xScale.domain()[1];
      regLineEl.style('display', null);
      regLineEl.transition(T)
        .attr('x1', xScale(x0)).attr('y1', yScale(modelResult.intercept + modelResult.slope * x0))
        .attr('x2', xScale(x1)).attr('y2', yScale(modelResult.intercept + modelResult.slope * x1));
    } else {
      regLineEl.interrupt().style('display', 'none');
    }

    // ── CI band ───────────────────────────────────────────────────────────

    const bandData = computeBand(modelResult, modelKey, xScale.domain(), 60);
    if (bandData) {
      const areaGen = d3.area()
        .x(d => xScale(d.x))
        .y0(d => yScale(d.lo))
        .y1(d => yScale(d.hi));
      ciBandEl.style('display', null).datum(bandData).attr('d', areaGen);
    } else {
      ciBandEl.style('display', 'none');
    }

    // ── Group color scale ─────────────────────────────────────────────────

    const groupValues = active.map(p => p.group).filter(g => g != null);
    let colorOf;
    if (groupColorType === 'continuous' && groupValues.length) {
      const [lo, hi] = d3.extent(groupValues);
      const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]);
      colorOf = p => p.group == null ? 'var(--color-point)' : colorScale(p.group);
    } else {
      // categorical or string: discrete Paired palette
      const groups = [...new Set(groupValues.map(String))].sort();
      colorOf = p => {
        if (p.group == null || groups.length === 0) return 'var(--color-point)';
        return PAIRED[groups.indexOf(String(p.group)) % PAIRED.length];
      };
    }

    // ── Points ────────────────────────────────────────────────────────────

    const allPoints = points.map(p => {
      const sx = xScale(p.displayX);
      const sy = yScale(p.displayY);
      const corner = p.censored ? cornerMarkerPos(p.displayX, p.displayY, xScale, yScale, iW, iH) : null;
      return { ...p, sx, sy, corner };
    });
    const newPointMap = new Map(allPoints.map(p => [p.index, p]));

    // Active + in-range censored: drawn as circles in the plot area
    const circlePoints = allPoints.filter(p => !p.censored || !p.corner);

    pointsG.selectAll('.point')
      .data(circlePoints, d => d.index)
      .join(
        enter => {
          const nodes = enter.append('circle').attr('class', 'point')
            .attr('r', POINT_R)
            // If this circle was previously a corner diamond, start it there
            // so it animates inward to its actual position.
            .attr('cx', d => { const p = prevState.get(d.index); return p?.isCorner ? p.cornerX : d.sx; })
            .attr('cy', d => { const p = prevState.get(d.index); return p?.isCorner ? p.cornerY : d.sy; });
          nodes.transition(T).attr('cx', d => d.sx).attr('cy', d => d.sy);
          return nodes;
        },
        update => update.call(sel =>
          sel.transition(T).attr('cx', d => d.sx).attr('cy', d => d.sy)
        ),
        exit => {
          // If the exiting circle is becoming a corner diamond, animate it
          // flying out to the corner position before removing.
          exit.each(function(d) {
            const next = newPointMap.get(d.index);
            if (next?.corner) {
              d3.select(this).raise()
                .transition(T)
                .attr('cx', next.corner.x)
                .attr('cy', next.corner.y)
                .remove();
            } else {
              d3.select(this).remove();
            }
          });
        }
      )
      .attr('r', POINT_R)
      .classed('point--active',   d => !d.censored)
      .classed('point--censored', d => d.censored)
      .style('fill',    d => d.censored ? null : colorOf(d))
      .style('stroke',  d => d.censored ? null : null)
      .style('opacity', d => d.weight != null ? 0.15 + 0.7 * d.weight : null)
      .on('click', (event, d) => { event.stopPropagation(); onPointClick(d.index); });

    // Out-of-range censored: corner diamonds drawn outside clip
    const cornerPoints = allPoints.filter(p => p.corner);

    cornersG.selectAll('.point--corner')
      .data(cornerPoints, d => d.index)
      .join(
        enter => enter.append('path').attr('class', 'point--corner')
          .attr('transform', d => `translate(${d.corner.x},${d.corner.y})`)
          .on('click', (event, d) => { event.stopPropagation(); onPointClick(d.index); }),
        update => update.call(sel =>
          sel.transition(T).attr('transform', d => `translate(${d.corner.x},${d.corner.y})`)
        ),
        exit => exit.remove()
      )
      .attr('d', d3.symbol().type(d3.symbolDiamond).size(60));

    // ── Voronoi hit areas ─────────────────────────────────────────────────
    // All points participate, including censored ones.  Corner points use
    // their clamped boundary position so their Voronoi cell covers the
    // nearest plot edge rather than some far-off out-of-range coordinate.

    const voronoiPoints = allPoints;

    if (voronoiPoints.length >= 2) {
      const vx = d => d.corner ? d.corner.x : d.sx;
      const vy = d => d.corner ? d.corner.y : d.sy;
      const delaunay = d3.Delaunay.from(voronoiPoints, vx, vy);
      // Extend bounds by the diamond margin so corner cells cover the strip
      // where the diamond markers actually appear.
      const VP = CORNER_R + 2;
      const voronoi  = delaunay.voronoi([-VP, -VP, iW + VP, iH + VP]);

      voronoiG.selectAll('path')
        .data(voronoiPoints)
        .join('path')
        .attr('d', (_, i) => voronoi.renderCell(i))
        .style('pointer-events', 'all')
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
          if (d.censored) {
            showCensorHover(d, xScale, yScale, iH, iW);
          } else {
            showHover(d, xScale, yScale, iH, iW, colorOf(d));
            onPointHover(d.index);
          }
        })
        .on('mouseout', () => {
          clearHover();
          onPointHover(null);
        })
        .on('click', (event, d) => onPointClick(d.index));
    } else {
      voronoiG.selectAll('path').remove();
    }

    // Save positions for cross-element transition on next update.
    prevState = new Map(allPoints.map(p => [p.index, {
      sx: p.sx, sy: p.sy,
      cornerX: p.corner?.x, cornerY: p.corner?.y,
      isCorner: !!p.corner,
    }]));
  }

  // ── Hover supertick ───────────────────────────────────────────────────

  function showHover(d, xScale, yScale, iH, iW, color) {
    hoverG.selectAll('*').remove();

    // Highlight ring on the point
    hoverG.append('circle')
      .attr('cx', d.sx).attr('cy', d.sy)
      .attr('r', POINT_R_HOVER)
      .attr('fill', color)
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5)
      .style('pointer-events', 'none');

    // X supertick
    const xSy = iH;
    hoverG.append('line')
      .classed('tick-mark--hover', true)
      .attr('x1', d.sx).attr('y1', xSy + 1)
      .attr('x2', d.sx).attr('y2', xSy + SUPERTICK_LEN);
    hoverG.append('text')
      .classed('tick-label--hover', true)
      .attr('x', d.sx).attr('y', xSy + SUPERTICK_LEN + 3)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .text(fmtNum(d.displayX));

    // Y supertick
    hoverG.append('line')
      .classed('tick-mark--hover', true)
      .attr('x1', -1).attr('y1', d.sy)
      .attr('x2', -SUPERTICK_LEN).attr('y2', d.sy);
    hoverG.append('text')
      .classed('tick-label--hover', true)
      .attr('x', -SUPERTICK_LEN - 3).attr('y', d.sy)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .text(fmtNum(d.displayY));
  }

  function showCensorHover(d, xScale, yScale, iH, iW) {
    const cx = d.corner ? d.corner.x : d.sx;
    const cy = d.corner ? d.corner.y : d.sy;
    hoverG.selectAll('*').remove();

    if (d.corner) {
      hoverG.append('path')
        .attr('transform', `translate(${cx},${cy})`)
        .attr('d', d3.symbol().type(d3.symbolDiamond).size(60))
        .attr('fill', 'var(--color-censored)')
        .attr('stroke', 'none')
        .attr('opacity', 1)
        .style('pointer-events', 'none');
    } else {
      hoverG.append('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', POINT_R_HOVER)
        .attr('fill', 'none')
        .attr('stroke', 'var(--color-censored)')
        .attr('stroke-width', 2)
        .style('pointer-events', 'none');
    }

    // Superticks: for corner points use the clamped corner coordinate so the
    // tick lands just past the axis edge rather than at the true (far
    // out-of-range) scaled position, which would be off-screen.
    const xPos = d.corner ? d.corner.x : xScale(d.displayX);
    hoverG.append('line')
      .classed('tick-mark--hover', true)
      .attr('x1', xPos).attr('y1', iH + 1)
      .attr('x2', xPos).attr('y2', iH + SUPERTICK_LEN);
    hoverG.append('text')
      .classed('tick-label--hover', true)
      .attr('x', xPos).attr('y', iH + SUPERTICK_LEN + 3)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .text(fmtNum(d.displayX));

    const yPos = d.corner ? d.corner.y : yScale(d.displayY);
    hoverG.append('line')
      .classed('tick-mark--hover', true)
      .attr('x1', -1).attr('y1', yPos)
      .attr('x2', -SUPERTICK_LEN).attr('y2', yPos);
    hoverG.append('text')
      .classed('tick-label--hover', true)
      .attr('x', -SUPERTICK_LEN - 3).attr('y', yPos)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .text(fmtNum(d.displayY));
  }

  function clearHover() {
    hoverG.selectAll('*').remove();
  }

  // ── Axis drawing helper ───────────────────────────────────────────────

  function drawAxis(g, vals, scale, iH, iW, orient, label, customTicks) {
    g.selectAll('*').remove();

    const isX = orient === 'x';
    const len = isX ? iW : iH;

    // Axis spine
    g.append('line')
      .classed('axis-line', true)
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', isX ? iW : 0)
      .attr('y2', isX ? 0 : iH);

    // Per-point tick marks
    const inRange = vals.filter(v => v >= scale.domain()[0] && v <= scale.domain()[1]);
    for (const v of inRange) {
      const pos = scale(v);
      g.append('line')
        .classed('tick-mark', true)
        .attr('x1', isX ? pos : 0)
        .attr('y1', isX ? 0 : pos)
        .attr('x2', isX ? pos : -TICK_LEN)
        .attr('y2', isX ? TICK_LEN : pos);
    }

    // Quartile labels
    const labels = customTicks ?? fiveNum(vals);
    for (const v of labels) {
      const pos = scale(v);
      if (pos < -2 || pos > len + 2) continue; // skip if outside visible range
      const fmt = fmtNum(v);
      if (isX) {
        g.append('text')
          .classed('tick-label', true)
          .attr('x', pos).attr('y', TICK_LEN + 3)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'hanging')
          .text(fmt);
      } else {
        g.append('text')
          .classed('tick-label', true)
          .attr('x', -TICK_LEN - 3).attr('y', pos)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .text(fmt);
      }
    }

    // Axis label
    if (isX) {
      g.append('text')
        .classed('axis-label', true)
        .attr('x', iW / 2)
        .attr('y', TICK_LEN + 28)
        .attr('text-anchor', 'middle')
        .text(label);
    } else {
      g.append('text')
        .classed('axis-label', true)
        .attr('transform', `rotate(-90)`)
        .attr('x', -iH / 2)
        .attr('y', -(TICK_LEN + 68))
        .attr('text-anchor', 'middle')
        .text(label);
    }
  }

  function clear() {
    // Remove data-driven content only; preserve the permanent SVG structure
    // so subsequent update() calls still work.
    pointsG.selectAll('*').remove();
    cornersG.selectAll('*').remove();
    voronoiG.selectAll('*').remove();
    hoverG.selectAll('*').remove();
    xAxisG.selectAll('*').remove();
    yAxisG.selectAll('*').remove();
    regLineEl.style('display', 'none');
    ciBandEl.style('display', 'none');
  }

  return { update, clear };
}
