// src/plot/scatterplot.js
// D3 v7 scatter plot with per-point axis ticks, quartile labels,
// regression line, censoring, Voronoi hover/click, and superticks.
//
// Performance architecture: the main SVG is fully static between data/model
// changes — no event handlers, no DOM mutations during hover.  All hover
// rendering and mouse interaction live in a separate overlay SVG so the
// browser can cache the main SVG rasterization independently.
//
// NOTE: SVG export currently captures only the main SVG (axis tick-label text
// lives in the overlay and will be absent from exports).  This is a known gap.

import * as d3 from 'd3';
import { Z95 } from '../stats/common.js';

// ColorBrewer Paired palette for group coloring (via D3).
const PAIRED = d3.schemePaired;

// Approximate t_{0.975, df} via Cornish-Fisher expansion (4 terms).
// Error < 0.01 for df >= 5; used for 95% CI bands on OLS.
function tQ95(df) {
  const z = Z95, z2 = z * z;
  return z
    + (z2 * z + z) / (4 * df)
    + (5 * z2 * z2 * z + 16 * z2 * z + 3 * z) / (96 * df * df)
    + (3 * z2 * z2 * z2 * z + 19 * z2 * z2 * z + 17 * z2 * z - 15 * z) / (384 * df * df * df);
}

const MARGIN_DESKTOP = { top: 24, right: 24, bottom: 68, left: 88 };
const MARGIN_MOBILE  = { top: 16, right: 16, bottom: 52, left: 56 };
const TICK_LEN = 5;         // px: per-point tick marks on axis
const SUPERTICK_LEN = 14;   // px: hover supertick
const CORNER_R = 5;         // px: out-of-range corner marker radius
const POINT_R = 4.5;        // px: default point radius
const POINT_R_HOVER = 6.5;  // px: hovered point radius
const SNAP_PX = 2;           // px: grid cell size for Delaunay deduplication
const JITTER  = 0.15;       // px: random offset added to deduplicated coords to
                             //     prevent degenerate triangles from coincident pts
const MAX_HOVER_DIST = 40;  // px: beyond this from nearest representative, no hover

// Compute 5-number summary (min, q1, median, q3, max) for axis labeling.
// Snaps to the nearest actual data value rather than interpolating, so labels
// always correspond to values that exist in the data.
function fiveNum(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  const q = p => s[Math.round(p * (n - 1))];
  return [s[0], q(0.25), q(0.5), q(0.75), s[n - 1]];
}

// Format a number for axis labels: drop trailing zeros, limit precision.
function fmtNum(v) {
  if (v == null || !Number.isFinite(v)) return '';
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
// Color scale builder — exported for use by diagnostics and main.js
// ---------------------------------------------------------------------------

// buildColorOf(points, groupColorType) → (point) => color string
// `points` should be the active (uncensored) subset used to determine the scale range/groups.
export function buildColorOf(points, groupColorType) {
  const groupValues = points.map(p => p.group).filter(g => g != null);
  if (groupColorType === 'continuous' && groupValues.length) {
    const [lo, hi] = d3.extent(groupValues);
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]);
    return p => p.group == null ? 'var(--color-point)' : colorScale(p.group);
  }
  const groups = [...new Set(groupValues.map(String))].sort();
  return p => {
    if (p.group == null || groups.length === 0) return 'var(--color-point)';
    return PAIRED[groups.indexOf(String(p.group)) % PAIRED.length];
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// createScatterplot(svgEl, overlaySvgEl) → { update(opts), clear(), highlightPoint(index | null) }
//
// opts shape:
//   points: [{ index, displayX, displayY, originalX, originalY, group, censored }]
//   modelResult: { slope, intercept, ... } | null
//   xLabel, yLabel: strings
//   modelKey: 'ols' | 'robust' | 'spearman' | 'theilsen'
//   customXTicks, customYTicks: number[] | null
//   onPointClick(index): called when a point is clicked
//   onPointHover(index | null): called on hover change
export function createScatterplot(svgEl, overlaySvgEl) {
  const svg        = d3.select(svgEl);
  const overlaySvg = d3.select(overlaySvgEl);

  // ── Main SVG structure (static between data changes) ───────────────────
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

  // ── Overlay SVG structure (hover rendering + mouse interaction) ─────────
  // axisLabelsG: tick label text — updated on data change, suppressed on hover
  // hoverG: hover indicator + supertick lines — cleared/drawn on hover change
  // interaction rect: appended to overlayCanvas per update() call
  const overlayCanvas = overlaySvg.append('g').attr('class', 'overlay-canvas');
  const axisLabelsG   = overlayCanvas.append('g').attr('class', 'axis-labels');
  const hoverG        = overlayCanvas.append('g').attr('class', 'hover-layer')
    .style('pointer-events', 'none');

  let prevState = new Map(); // index → { sx, sy, cornerX, cornerY, isCorner }
  let currentHoverIdx = null; // index into voronoiPoints for current hover (dedup)
  let lastMousePos = null;    // [mx, my] in overlay coords; null when mouse is outside
  let _plotState = null;      // { allPoints, iH, colorOf, xScale, yScale } — for highlightPoint

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
    // Clear any stuck hover overlay immediately when data changes.
    clearHover();
    onPointHover(null);
    currentHoverIdx = null;

    const { width: W, height: H } = svgEl.getBoundingClientRect();
    if (W === 0 || H === 0) return;
    const MARGIN = W < 420 ? MARGIN_MOBILE : MARGIN_DESKTOP;
    const iW = W - MARGIN.left - MARGIN.right;
    const iH = H - MARGIN.top - MARGIN.bottom;

    // Sync main SVG dimensions.
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    canvas.attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
    clipRect.attr('width', iW).attr('height', iH);

    // Sync overlay SVG to same coordinate system.
    overlaySvg.attr('viewBox', `0 0 ${W} ${H}`);
    overlayCanvas.attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

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

    // ── Axes (spine + tick marks only — labels go to overlay) ─────────────

    xAxisG.attr('transform', `translate(0,${iH})`);
    yAxisG.attr('transform', `translate(0,0)`);

    drawAxis(xAxisG, active.map(p => p.displayX), xScale, iH, iW, 'x');
    drawAxis(yAxisG, active.map(p => p.displayY), yScale, iH, iW, 'y');

    // Axis labels drawn into overlay so suppression never touches main SVG.
    axisLabelsG.selectAll('*').remove();
    drawAxisLabels(axisLabelsG, active.map(p => p.displayX), xScale, iH, iW, 'x',
                   xLabel, customXTicks, MARGIN);
    drawAxisLabels(axisLabelsG, active.map(p => p.displayY), yScale, iH, iW, 'y',
                   yLabel, customYTicks, MARGIN);

    // ── Transition ────────────────────────────────────────────────────────

    const T = d3.transition().duration(200).ease(d3.easeExpOut);

    // ── Regression line ───────────────────────────────────────────────────

    const hasLine = modelResult && modelResult.slope != null
      && modelResult.intercept != null;

    if (hasLine) {
      const x0 = xScale.domain()[0];
      const x1 = xScale.domain()[1];
      const ly0 = yScale(modelResult.intercept + modelResult.slope * x0);
      const ly1 = yScale(modelResult.intercept + modelResult.slope * x1);
      const isNew = !regLineEl.attr('x1');
      regLineEl.style('display', null);
      if (isNew) {
        // First render: place directly to avoid animating from SVG origin.
        regLineEl
          .attr('x1', xScale(x0)).attr('y1', ly0)
          .attr('x2', xScale(x1)).attr('y2', ly1);
      } else {
        regLineEl.transition(T)
          .attr('x1', xScale(x0)).attr('y1', ly0)
          .attr('x2', xScale(x1)).attr('y2', ly1);
      }
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

    const colorOf = buildColorOf(active, groupColorType);

    // ── Points ────────────────────────────────────────────────────────────

    const allPoints = points.map(p => {
      const sx = xScale(p.displayX);
      const sy = yScale(p.displayY);
      const corner = p.censored ? cornerMarkerPos(p.displayX, p.displayY, xScale, yScale, iW, iH) : null;
      return { ...p, sx, sy, corner };
    });
    const newPointMap = new Map(allPoints.map(p => [p.index, p]));

    // Store state for highlightPoint() called from outside (e.g. QQ hover → main scatter).
    _plotState = { allPoints, iH, colorOf, xScale, yScale };

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

    // ── Hit detection: interaction rect in overlay + delaunay.find() ──────
    // Mouse events live entirely in the overlay SVG.  The main SVG has zero
    // event handlers and never mutates during user interaction, so the browser
    // can cache its rasterized texture across hover frames.

    // Collapse coincident/sub-pixel screen positions before triangulating.
    // At 2px the grid shape is invisible; it just prevents degenerate cells.
    // A tiny random jitter breaks collinearity without affecting hover feel.
    const gridMap = new Map();
    for (const p of allPoints) {
      const px = p.corner ? p.corner.x : p.sx;
      const py = p.corner ? p.corner.y : p.sy;
      const key = `${Math.round(px / SNAP_PX)},${Math.round(py / SNAP_PX)}`;
      if (!gridMap.has(key)) gridMap.set(key, p);
    }
    const voronoiPoints = [...gridMap.values()];

    overlayCanvas.selectAll('rect.interaction-rect').remove();

    if (voronoiPoints.length >= 2) {
      const vx = d => (d.corner ? d.corner.x : d.sx) + (Math.random() * 2 - 1) * JITTER;
      const vy = d => (d.corner ? d.corner.y : d.sy) + (Math.random() * 2 - 1) * JITTER;
      const delaunay = d3.Delaunay.from(voronoiPoints, vx, vy);

      function handleHover(mx, my) {
        const i = delaunay.find(mx, my);
        const d = voronoiPoints[i];
        const px = d.corner ? d.corner.x : d.sx;
        const py = d.corner ? d.corner.y : d.sy;

        if (Math.hypot(mx - px, my - py) > MAX_HOVER_DIST) {
          if (currentHoverIdx !== null) {
            currentHoverIdx = null;
            clearHover();
            onPointHover(null);
          }
          return;
        }

        if (i === currentHoverIdx) return;
        currentHoverIdx = i;
        clearHover();
        if (d.censored) {
          showCensorHover(d, xScale, yScale, iH);
          onPointHover(null);
        } else {
          showHover(d, iH, colorOf(d));
          onPointHover(d.index);
        }
      }

      // Extend slightly beyond plot area so corner markers are reachable.
      const VP = CORNER_R + 2;
      overlayCanvas.append('rect')
        .attr('class', 'interaction-rect')
        .attr('x', -VP).attr('y', -VP)
        .attr('width', iW + 2 * VP).attr('height', iH + 2 * VP)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .style('cursor', 'pointer')
        .on('mousemove', (event) => {
          const [mx, my] = d3.pointer(event);
          lastMousePos = [mx, my];
          handleHover(mx, my);
        })
        .on('mouseleave', () => {
          lastMousePos = null;
          if (currentHoverIdx === null) return;
          currentHoverIdx = null;
          clearHover();
          onPointHover(null);
        })
        .on('click', (event) => {
          const [mx, my] = d3.pointer(event);
          const i = delaunay.find(mx, my);
          if (i >= 0) onPointClick(voronoiPoints[i].index);
        });

      // Re-establish hover at the last known position after a data/model change
      // (e.g. censoring a point) so the highlight doesn't vanish until mousemove.
      if (lastMousePos) handleHover(...lastMousePos);
    }

    // Save positions for cross-element transition on next update.
    prevState = new Map(allPoints.map(p => [p.index, {
      sx: p.sx, sy: p.sy,
      cornerX: p.corner?.x, cornerY: p.corner?.y,
      isCorner: !!p.corner,
    }]));
  }

  // ── Hover supertick ───────────────────────────────────────────────────

  // Draw X and Y superticks at the given pixel positions with data-value labels,
  // and suppress nearby axis tick labels to avoid overdraw.
  function drawHoverSuperticks(xPos, xVal, yPos, yVal, iH) {
    hoverG.append('line')
      .classed('tick-mark--hover', true)
      .attr('x1', xPos).attr('y1', iH + 1)
      .attr('x2', xPos).attr('y2', iH + SUPERTICK_LEN);
    hoverG.append('text')
      .classed('tick-label--hover', true)
      .attr('x', xPos).attr('y', iH + SUPERTICK_LEN + 3)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .text(fmtNum(xVal));

    hoverG.append('line')
      .classed('tick-mark--hover', true)
      .attr('x1', -1).attr('y1', yPos)
      .attr('x2', -SUPERTICK_LEN).attr('y2', yPos);
    hoverG.append('text')
      .classed('tick-label--hover', true)
      .attr('x', -SUPERTICK_LEN - 3).attr('y', yPos)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .text(fmtNum(yVal));

    suppressNearbyLabels(true,  xPos);
    suppressNearbyLabels(false, yPos);
  }

  function showHover(d, iH, color) {
    hoverG.selectAll('*').remove();

    hoverG.append('circle')
      .attr('cx', d.sx).attr('cy', d.sy)
      .attr('r', POINT_R_HOVER)
      .attr('fill', color)
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5)
      .style('pointer-events', 'none');

    drawHoverSuperticks(d.sx, d.displayX, d.sy, d.displayY, iH);
  }

  function showCensorHover(d, xScale, yScale, iH) {
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

    // For corner points use the clamped pixel position so the tick lands just
    // past the axis edge rather than at the true (far out-of-range) position.
    const xPos = d.corner ? d.corner.x : xScale(d.displayX);
    const yPos = d.corner ? d.corner.y : yScale(d.displayY);
    drawHoverSuperticks(xPos, d.displayX, yPos, d.displayY, iH);
  }

  // Hide axis tick labels in the overlay that would be overdrawn by the hover
  // supertick.  Operates only on the small overlay axisLabelsG — never touches
  // the main SVG.  Restored by clearHover().
  function suppressNearbyLabels(isX, hoverPos) {
    const selector = isX ? 'text.tick-label--x' : 'text.tick-label--y';
    const attr     = isX ? 'x' : 'y';
    const pad      = isX ? 30 : 8;
    axisLabelsG.selectAll(selector).each(function() {
      const pos = +d3.select(this).attr(attr);
      if (Math.abs(pos - hoverPos) <= pad)
        d3.select(this).style('display', 'none');
    });
  }

  function clearHover() {
    hoverG.selectAll('*').remove();
    // Restore any axis labels that were suppressed during hover.
    axisLabelsG.selectAll('.tick-label--x, .tick-label--y').style('display', null);
  }

  // ── Axis drawing helpers ──────────────────────────────────────────────

  // Draw axis spine + per-point tick mark lines only (no text).
  // Text is drawn separately by drawAxisLabels() into the overlay SVG.
  function drawAxis(g, vals, scale, iH, iW, orient) {
    g.selectAll('*').remove();

    const isX = orient === 'x';

    // Axis spine
    g.append('line')
      .classed('axis-line', true)
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', isX ? iW : 0)
      .attr('y2', isX ? 0 : iH);

    // Per-point tick marks
    const finiteVals = vals.filter(Number.isFinite);
    const inRange = finiteVals.filter(v => v >= scale.domain()[0] && v <= scale.domain()[1]);
    for (const v of inRange) {
      const pos = scale(v);
      g.append('line')
        .classed('tick-mark', true)
        .attr('x1', isX ? pos : 0)
        .attr('y1', isX ? 0 : pos)
        .attr('x2', isX ? pos : -TICK_LEN)
        .attr('y2', isX ? TICK_LEN : pos);
    }
  }

  // Draw axis tick label text and axis title into the overlay group g.
  // Uses absolute coordinates matching overlayCanvas (same origin as canvas).
  // Labels get tick-label--x / tick-label--y classes for targeted suppression.
  function drawAxisLabels(g, vals, scale, iH, iW, orient, label, customTicks, margin) {
    const isX        = orient === 'x';
    const len        = isX ? iW : iH;
    const labelClass = isX ? 'tick-label--x' : 'tick-label--y';

    const finiteVals = vals.filter(Number.isFinite);
    const labels = customTicks ?? fiveNum(finiteVals);

    for (const v of labels) {
      const pos = scale(v);
      if (pos < -2 || pos > len + 2) continue; // skip if outside visible range
      const fmt = fmtNum(v);
      if (isX) {
        g.append('text')
          .classed('tick-label', true)
          .classed(labelClass, true)
          .attr('x', pos)
          .attr('y', iH + TICK_LEN + 3)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'hanging')
          .text(fmt);
      } else {
        g.append('text')
          .classed('tick-label', true)
          .classed(labelClass, true)
          .attr('x', -TICK_LEN - 3)
          .attr('y', pos)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .text(fmt);
      }
    }

    // Axis title
    if (isX) {
      g.append('text')
        .classed('axis-label', true)
        .attr('x', iW / 2)
        .attr('y', iH + TICK_LEN + 28)
        .attr('text-anchor', 'middle')
        .text(label);
    } else {
      g.append('text')
        .classed('axis-label', true)
        .attr('transform', `rotate(-90)`)
        .attr('x', -iH / 2)
        .attr('y', -(margin.left - 15))
        .attr('text-anchor', 'middle')
        .text(label);
    }
  }

  function clear() {
    // Remove data-driven content only; preserve the permanent SVG structure
    // so subsequent update() calls still work.
    pointsG.selectAll('*').remove();
    cornersG.selectAll('*').remove();
    clearHover();                                      // clears hoverG + restores axisLabelsG visibility
    axisLabelsG.selectAll('*').remove();
    overlayCanvas.selectAll('rect.interaction-rect').remove();
    xAxisG.selectAll('*').remove();
    yAxisG.selectAll('*').remove();
    regLineEl.style('display', 'none');
    ciBandEl.style('display', 'none');
  }

  // highlightPoint(index | null) — called externally (e.g. from QQ hover) to show
  // the hover indicator on a specific point without triggering onPointHover callback.
  function highlightPoint(index) {
    currentHoverIdx = null;
    clearHover();
    if (index == null || !_plotState) return;
    const d = _plotState.allPoints.find(p => p.index === index);
    if (!d || d.censored) return;
    showHover(d, _plotState.iH, _plotState.colorOf(d));
  }

  return { update, clear, highlightPoint };
}
