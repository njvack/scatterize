// src/plot/scatterplot.js
// D3 v7 scatter plot with per-point axis ticks, quartile labels,
// regression line, censoring, Voronoi hover/click, and superticks.
//
// Performance architecture: the main SVG is fully static between data/model
// changes — no event handlers, no DOM mutations during hover.  All hover
// rendering and mouse interaction live in a separate overlay SVG so the
// browser can cache the main SVG rasterization independently.
//
import * as d3 from 'd3';
import { Z95 } from '../stats/common.js';

// ColorBrewer Paired palette for group coloring (via D3).
const PAIRED = d3.schemePaired;

// Read CSS custom properties once at init — used to apply all visual styles
// inline so SVG export works without a stylesheet.
export function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = name => cs.getPropertyValue(name).trim();
  return {
    point:    v('--color-point'),
    regline:  v('--color-regline'),
    censored: v('--color-censored'),
    bg:       v('--color-bg'),
    text:     v('--color-text'),
    muted:    v('--color-text-muted'),
    font:     v('--font-sans'),
  };
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

const MARGIN_DESKTOP = { top: 24, right: 24, bottom: 68, left: 88 };
const MARGIN_MOBILE  = { top: 16, right: 16, bottom: 52, left: 56 };
const TICK_LEN = 5;         // px: per-point tick marks on axis
const SUPERTICK_LEN = 14;   // px: hover supertick
const CORNER_R = 5;         // px: out-of-range corner marker radius
const POINT_R = 4.5;        // px: default point radius (small n)
const POINT_R_MIN = 1.5;    // px: minimum point radius (large n)
const POINT_R_HOVER_DELTA = 2; // px: hover radius = point radius + this
const KDE_MAX_PX = 20;      // px: peak height/width of axis KDE strip
const KDE_GRID_N = 120;     // evaluation grid points for KDE

// Scale point radius down for large datasets: r ∝ n^(-0.25) with a floor.
// At n≤50: 4.5px; n=200: ~3.2px; n=500: ~2.5px; n=2000: ~1.8px.
function scaledPointR(n) {
  return Math.max(POINT_R_MIN, POINT_R * Math.pow(Math.min(1, 50 / n), 0.25));
}
const SNAP_PX = 2;           // px: grid cell size for Delaunay deduplication
const JITTER  = 0.15;       // px: random offset added to deduplicated coords to
                             //     prevent degenerate triangles from coincident pts
const MAX_HOVER_DIST = 40;  // px: beyond this from nearest representative, no hover
const CORNER_BOT_STRIP_Y  = 28;  // px below plot spine for outB corner diamonds
const CORNER_LEFT_STRIP_X = 60;  // px left  of plot spine for outL corner diamonds

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

// ---------------------------------------------------------------------------
// KDE helpers
// ---------------------------------------------------------------------------

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

// Evaluate Gaussian KDE over a uniform grid spanning [domainMin, domainMax].
// Returns [{ v, density }, ...] with KDE_GRID_N points.
function computeKDE(vals, domainMin, domainMax) {
  const bw = silvermanBandwidth(vals);
  const n = vals.length;
  const twoBwSq = 2 * bw * bw;
  const norm = n * bw * Math.sqrt(2 * Math.PI);
  return Array.from({ length: KDE_GRID_N }, (_, i) => {
    const v = domainMin + i * (domainMax - domainMin) / (KDE_GRID_N - 1);
    const density = vals.reduce((s, vi) => s + Math.exp(-((v - vi) * (v - vi)) / twoBwSq), 0) / norm;
    return { v, density };
  });
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
  const mx = outL ? -CORNER_LEFT_STRIP_X : outR ? innerW + PAD : Math.max(0, Math.min(innerW, sx));
  const my = outT ? -PAD : outB ? innerH + CORNER_BOT_STRIP_Y : Math.max(0, Math.min(innerH, sy));
  return { x: mx, y: my, outL, outB };
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
export function buildColorOf(points, groupColorType, fallbackColor = 'currentColor') {
  const groupValues = points.map(p => p.group).filter(g => g != null);
  if (groupColorType === 'continuous' && groupValues.length) {
    const [lo, hi] = d3.extent(groupValues);
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]);
    return p => p.group == null ? fallbackColor : colorScale(p.group);
  }
  const groups = [...new Set(groupValues.map(String))].sort();
  return p => {
    if (p.group == null || groups.length === 0) return fallbackColor;
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
  const palette    = readPalette();
  const svg        = d3.select(svgEl);
  const overlaySvg = d3.select(overlaySvgEl);

  // ── Main SVG structure (static between data changes) ───────────────────
  const defs = svg.append('defs');
  const clipId = 'plot-clip-' + Math.random().toString(36).slice(2);
  const clipRect = defs.append('clipPath').attr('id', clipId)
    .append('rect');


  // Solid background for export (Illustrator needs a background rect).
  svg.append('rect').attr('class', 'plot-bg')
    .attr('fill', palette.bg)
    .attr('width', '100%').attr('height', '100%');

  const canvas = svg.append('g').attr('class', 'canvas');
  const xAxisG  = canvas.append('g').attr('class', 'x-axis');
  const yAxisG  = canvas.append('g').attr('class', 'y-axis');
  // Axis label text lives in both the main SVG (for export) and the overlay
  // (for interactive hover suppression).  These groups use canvas coordinates.
  const xAxisLabelsG = canvas.append('g').attr('class', 'x-axis-labels');
  const yAxisLabelsG = canvas.append('g').attr('class', 'y-axis-labels');
  const plotArea = canvas.append('g').attr('class', 'plot-area')
    .attr('clip-path', `url(#${clipId})`);
  const xKdeEl = plotArea.append('path').attr('class', 'kde--x')
    .style('fill', '#aaa').style('fill-opacity', '0.35')
    .style('stroke', 'none').style('pointer-events', 'none');
  const yKdeEl = plotArea.append('path').attr('class', 'kde--y')
    .style('fill', '#aaa').style('fill-opacity', '0.35')
    .style('stroke', 'none').style('pointer-events', 'none');
  const ciBandEl   = plotArea.append('path').attr('class', 'ci-band')
    .style('fill', palette.regline).style('fill-opacity', '0.12')
    .style('stroke', 'none').style('pointer-events', 'none');
  const regLineEl  = plotArea.append('line').attr('class', 'regression-line')
    .style('stroke', palette.regline).style('stroke-width', '1.75')
    .style('fill', 'none');
  const pointsG    = plotArea.append('g').attr('class', 'points');
  const cornersG   = canvas.append('g').attr('class', 'corners'); // outside clip
  // Legend group lives in the main SVG so it's captured by SVG/PNG export.
  const legendG    = canvas.append('g').attr('class', 'legend');

  // ── Overlay SVG structure (hover rendering + mouse interaction) ─────────
  // xStripRect / yStripRect: opaque background rects that cover the main SVG
  //   axis label strips so the overlay labels render over a clean background.
  //   Sized once per layout in update(); never redrawn between data changes.
  // axisLabelsG: mirror of main SVG labels — suppressed near hover supertick
  // hoverG: hover indicator + supertick lines — cleared/drawn on hover change
  // interaction rect: appended to overlayCanvas per update() call
  const overlayCanvas = overlaySvg.append('g').attr('class', 'overlay-canvas');
  const xStripRect = overlayCanvas.append('rect').attr('class', 'axis-strip axis-strip--x')
    .attr('fill', palette.bg).style('pointer-events', 'none');
  const yStripRect = overlayCanvas.append('rect').attr('class', 'axis-strip axis-strip--y')
    .attr('fill', palette.bg).style('pointer-events', 'none');
  const axisLabelsG     = overlayCanvas.append('g').attr('class', 'axis-labels');
  const cornersOverlayG = overlayCanvas.append('g').attr('class', 'corners-overlay')
    .style('pointer-events', 'none');
  const hoverG          = overlayCanvas.append('g').attr('class', 'hover-layer')
    .style('pointer-events', 'none');
  // Legend labels mirrored in overlay so suppression never touches the export SVG.
  const legendLabelsG   = overlayCanvas.append('g').attr('class', 'legend-labels')
    .style('pointer-events', 'none');
  // Legend hover ring/line rendered in overlay so it doesn't affect export.
  const legendHoverG    = overlayCanvas.append('g').attr('class', 'legend-hover')
    .style('pointer-events', 'none');

  let prevState = new Map(); // index → { sx, sy, cornerX, cornerY, isCorner }
  let currentHoverIdx = null; // index into voronoiPoints for current hover (dedup)
  let lastMousePos = null;    // [mx, my] in overlay coords; null when mouse is outside
  let _plotState = null;      // { allPoints, iH, colorOf, xScale, yScale } — for highlightPoint
  let _pointR = POINT_R;         // current render's scaled point radius
  let _pointRHover = POINT_R + POINT_R_HOVER_DELTA; // current render's hover radius
  let _legendState = null;   // categorical or continuous legend state for hover

  function update({
    points,
    modelResult,
    xLabel = 'x',
    yLabel = 'y',
    modelKey = 'ols',
    groupColorType = 'categorical',
    groupLabel = null,
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

    // Size axis strip rects.  These cover the main SVG axis label strips so
    // the overlay labels render over a clean background.  The fringe tick
    // marks (TICK_LEN px beyond the spine) remain visible above the rects.
    xStripRect
      .attr('x', -MARGIN.left).attr('y', iH + TICK_LEN)
      .attr('width', iW + MARGIN.left + MARGIN.right)
      .attr('height', MARGIN.bottom - TICK_LEN);
    yStripRect
      .attr('x', -MARGIN.left).attr('y', -MARGIN.top)
      .attr('width', MARGIN.left - TICK_LEN)
      .attr('height', iH + MARGIN.top + MARGIN.bottom);

    // Scales from uncensored points only.
    const active = points.filter(p => !p.censored);
    if (!active.length) return;

    _pointR = scaledPointR(active.length);
    _pointRHover = _pointR + POINT_R_HOVER_DELTA;

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
    // Spines + fringe tick marks in the axis groups; labels in separate groups
    // so they sit above the data layer without being clipped.  Labels are also
    // mirrored into the overlay for interactive suppression during hover.

    xAxisG.attr('transform', `translate(0,${iH})`);
    yAxisG.attr('transform', `translate(0,0)`);

    drawAxis(xAxisG, active.map(p => p.displayX), xScale, iH, iW, 'x');
    drawAxis(yAxisG, active.map(p => p.displayY), yScale, iH, iW, 'y');

    // Main SVG labels (captured by export).
    xAxisLabelsG.selectAll('*').remove();
    drawAxisLabels(xAxisLabelsG, active.map(p => p.displayX), xScale, iH, iW, 'x',
                   xLabel, customXTicks, MARGIN);
    yAxisLabelsG.selectAll('*').remove();
    drawAxisLabels(yAxisLabelsG, active.map(p => p.displayY), yScale, iH, iW, 'y',
                   yLabel, customYTicks, MARGIN);

    // Overlay labels (covered by strip rects; suppressed near hover supertick).
    axisLabelsG.selectAll('*').remove();
    drawAxisLabels(axisLabelsG, active.map(p => p.displayX), xScale, iH, iW, 'x',
                   xLabel, customXTicks, MARGIN);
    drawAxisLabels(axisLabelsG, active.map(p => p.displayY), yScale, iH, iW, 'y',
                   yLabel, customYTicks, MARGIN);

    // ── Axis KDE strips ───────────────────────────────────────────────────
    // Shallow Gaussian KDE shown on the inside of each axis spine, giving a
    // visual sense of data density (especially useful for discrete/clumped X).

    const xVals = active.map(p => p.displayX).filter(Number.isFinite);
    const yVals = active.map(p => p.displayY).filter(Number.isFinite);

    function drawKdeStrip(el, vals, scale, orient) {
      const kdeData = computeKDE(vals, scale.domain()[0], scale.domain()[1]);
      const maxD = d3.max(kdeData, d => d.density);
      if (!maxD) { el.style('display', 'none'); return; }

      let areaGen;
      if (orient === 'x') {
        areaGen = d3.area()
          .x(d => scale(d.v))
          .y0(iH)
          .y1(d => iH - (d.density / maxD) * KDE_MAX_PX)
          .curve(d3.curveBasis);
      } else {
        areaGen = d3.area()
          .y(d => scale(d.v))
          .x0(0)
          .x1(d => (d.density / maxD) * KDE_MAX_PX)
          .curve(d3.curveBasis);
      }

      const isNew = !el.attr('d');
      el.style('display', null).datum(kdeData);
      if (isNew) {
        el.attr('d', areaGen);
      } else {
        el.transition(d3.transition().duration(200).ease(d3.easeExpOut)).attr('d', areaGen);
      }
    }

    drawKdeStrip(xKdeEl, xVals, xScale, 'x');
    drawKdeStrip(yKdeEl, yVals, yScale, 'y');

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

    const colorOf = buildColorOf(active, groupColorType, palette.point);
    drawLegend({ active, groupColorType, groupLabel, colorOf, modelResult, iW, iH });

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
            .attr('r', _pointR)
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
      .attr('r', _pointR)
      .classed('point--active',   d => !d.censored)
      .classed('point--censored', d => d.censored)
      .style('fill',         d => d.censored ? 'none' : colorOf(d))
      .style('stroke',       d => d.censored ? palette.censored : 'none')
      .style('stroke-width', d => d.censored ? '1.25px' : null)
      .style('opacity',      d => {
        if (d.censored) return 0.7;
        return d.weight != null ? 0.15 + 0.7 * d.weight : 0.85;
      })
      .style('cursor', 'pointer')
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
      .attr('d', d3.symbol().type(d3.symbolDiamond).size(60))
      .style('fill', 'none').style('stroke', palette.censored)
      .style('stroke-width', '1.5').style('opacity', '0.8').style('cursor', 'pointer');

    // Overlay corner diamonds — rendered after strip rects so they're visible.
    // No click handler (interaction delegated to interaction rect + Delaunay).
    // data-cx set for outB diamonds (X-axis suppression); data-cy for outL (Y-axis).
    cornersOverlayG.selectAll('.point--corner')
      .data(cornerPoints, d => d.index)
      .join(
        enter => enter.append('path').attr('class', 'point--corner'),
        update => update,
        exit => exit.remove()
      )
      .attr('transform', d => `translate(${d.corner.x},${d.corner.y})`)
      .attr('d', d3.symbol().type(d3.symbolDiamond).size(60))
      .attr('data-cx', d => d.corner.outB ? d.corner.x : null)
      .attr('data-cy', d => d.corner.outL ? d.corner.y : null)
      .style('fill', 'none').style('stroke', palette.censored)
      .style('stroke-width', '1.5').style('opacity', '0.8');

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

      // Extend beyond plot area so corner markers are reachable.
      // Left/bottom have larger extensions to cover the new corner positions.
      const LEFT_EXT = CORNER_LEFT_STRIP_X + CORNER_R + 2;  // 67 px left of spine
      const BOT_EXT  = CORNER_BOT_STRIP_Y  + CORNER_R + 2;  // 35 px below spine
      const EDGE_VP  = CORNER_R + 2;                         //  7 px (top / right)
      const interactionRect = overlayCanvas.append('rect')
        .attr('class', 'interaction-rect')
        .attr('x', -LEFT_EXT).attr('y', -EDGE_VP)
        .attr('width',  iW + LEFT_EXT + EDGE_VP)
        .attr('height', iH + EDGE_VP  + BOT_EXT)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .style('cursor', 'default');

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
            interactionRect.style('cursor', 'default');
          }
          return;
        }

        if (i === currentHoverIdx) return;
        currentHoverIdx = i;
        clearHover();
        interactionRect.style('cursor', 'pointer');
        if (d.censored) {
          showCensorHover(d, xScale, yScale, iH, iW);
          onPointHover(null);
        } else {
          showHover(d, iH, colorOf(d));
          onPointHover(d.index);
        }
      }

      interactionRect
        .on('mousemove', (event) => {
          const [mx, my] = d3.pointer(event);
          lastMousePos = [mx, my];
          handleHover(mx, my);
        })
        .on('mouseleave', () => {
          lastMousePos = null;
          if (currentHoverIdx !== null) {
            currentHoverIdx = null;
            clearHover();
            onPointHover(null);
          }
          interactionRect.style('cursor', 'default');
        })
        .on('click', () => {
          if (currentHoverIdx === null) return;
          onPointClick(voronoiPoints[currentHoverIdx].index);
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
      .style('stroke', palette.text).style('stroke-width', '1.5')
      .attr('x1', xPos).attr('y1', iH + 1)
      .attr('x2', xPos).attr('y2', iH + SUPERTICK_LEN);
    hoverG.append('text')
      .classed('tick-label--hover', true)
      .style('fill', palette.text).style('font-size', '13px')
      .style('font-family', palette.font).style('font-weight', '600')
      .attr('x', xPos).attr('y', iH + SUPERTICK_LEN + 3)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .text(fmtNum(xVal));

    hoverG.append('line')
      .classed('tick-mark--hover', true)
      .style('stroke', palette.text).style('stroke-width', '1.5')
      .attr('x1', -1).attr('y1', yPos)
      .attr('x2', -SUPERTICK_LEN).attr('y2', yPos);
    hoverG.append('text')
      .classed('tick-label--hover', true)
      .style('fill', palette.text).style('font-size', '13px')
      .style('font-family', palette.font).style('font-weight', '600')
      .attr('x', -SUPERTICK_LEN - 3).attr('y', yPos)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .text(fmtNum(yVal));

    suppressOverlappingItems(true,  xPos);
    suppressOverlappingItems(false, yPos);
  }

  function showHover(d, iH, color) {
    hoverG.selectAll('*').remove();

    hoverG.append('circle')
      .attr('cx', d.sx).attr('cy', d.sy)
      .attr('r', _pointRHover)
      .attr('fill', color)
      .attr('stroke', palette.text)
      .attr('stroke-width', 1.5)
      .style('pointer-events', 'none');

    drawHoverSuperticks(d.sx, d.displayX, d.sy, d.displayY, iH);
    if (_legendState && d.group != null) updateLegendHover(d.group);
  }

  function showCensorHover(d, xScale, yScale, iH, iW) {
    const cx = d.corner ? d.corner.x : d.sx;
    const cy = d.corner ? d.corner.y : d.sy;
    hoverG.selectAll('*').remove();

    if (d.corner) {
      hoverG.append('path')
        .attr('transform', `translate(${cx},${cy})`)
        .attr('d', d3.symbol().type(d3.symbolDiamond).size(60))
        .attr('fill', palette.censored)
        .attr('stroke', 'none')
        .attr('opacity', 1)
        .style('pointer-events', 'none');
    } else {
      hoverG.append('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', _pointRHover)
        .attr('fill', 'none')
        .attr('stroke', palette.censored)
        .attr('stroke-width', 2)
        .style('pointer-events', 'none');
    }

    // Clamp corner supertick positions to the plot area so superticks land on
    // the axis spine even when the corner diamond is far outside (e.g. outB is
    // 28 px below the spine — clamping puts the X-tick at the spine, not below).
    const xPos = d.corner ? Math.max(0, Math.min(iW, d.corner.x)) : xScale(d.displayX);
    const yPos = d.corner ? Math.max(0, Math.min(iH, d.corner.y)) : yScale(d.displayY);
    drawHoverSuperticks(xPos, d.displayX, yPos, d.displayY, iH);
  }

  // Hide axis tick labels and corner overlay diamonds that would be overdrawn
  // by the hover supertick.  Uses actual bounding-box widths for labels.
  // Operates only on overlay elements — never touches the main SVG.
  // Restored by clearHover().
  function suppressOverlappingItems(isX, hoverPos) {
    // Suppress axis tick labels whose bounding box overlaps the supertick.
    const selector = isX ? 'text.tick-label--x' : 'text.tick-label--y';
    axisLabelsG.selectAll(selector).each(function() {
      const el  = d3.select(this);
      const pos = +(isX ? el.attr('x') : el.attr('y'));
      const box = this.getBBox();
      const half = isX ? box.width / 2 : box.height / 2;
      if (Math.abs(pos - hoverPos) <= half + 2) el.style('display', 'none');
    });

    // Suppress corner overlay diamonds whose position overlaps the supertick.
    // data-cx is set only on outB diamonds (relevant for X-axis suppression);
    // data-cy is set only on outL diamonds (relevant for Y-axis suppression).
    const cornerAttr = isX ? 'data-cx' : 'data-cy';
    const DIAMOND_HALF = CORNER_R + 1;
    cornersOverlayG.selectAll('.point--corner').each(function() {
      const pos = +d3.select(this).attr(cornerAttr);
      if (!isNaN(pos) && Math.abs(pos - hoverPos) <= DIAMOND_HALF + 2)
        d3.select(this).style('display', 'none');
    });
  }

  function clearHover() {
    hoverG.selectAll('*').remove();
    legendHoverG.selectAll('*').remove();
    // Restore any axis labels, corner diamonds, or legend ticks suppressed during hover.
    axisLabelsG.selectAll('.tick-label--x, .tick-label--y').style('display', null);
    cornersOverlayG.selectAll('.point--corner').style('display', null);
    legendLabelsG.selectAll('.tick-label--legend').style('display', null);
  }

  // ── Legend rendering ──────────────────────────────────────────────────

  function drawLegend({ active, groupColorType, groupLabel, colorOf, modelResult, iW, iH }) {
    legendG.selectAll('*').remove();
    legendLabelsG.selectAll('*').remove();
    legendHoverG.selectAll('*').remove();
    _legendState = null;
    if (!groupLabel) return;
    const groupValues = active.map(p => p.group).filter(g => g != null);
    if (!groupValues.length) return;
    // Place legend in the corner the regression line points away from, so they
    // don't overlap: positive slope → upper-left clear, negative → upper-right.
    const isLeft = (modelResult?.slope ?? 0) >= 0;
    if (groupColorType === 'continuous') {
      drawContinuousLegend({ groupValues, groupLabel, colorOf, isLeft, iW });
    } else {
      drawCategoricalLegend({ groupValues, groupLabel, colorOf, isLeft, iW });
    }
  }

  function drawCategoricalLegend({ groupValues, groupLabel, colorOf, isLeft, iW }) {
    const PAD = 8, ITEM_H = 18, CR = 5, FS = 10, ITEM_TEXT_X = CR * 2 + 6, OUTER_PAD = 12;
    const groups = [...new Set(groupValues.map(String))].sort().slice(0, 10);

    legendG.append('text')
      .style('font-family', palette.font).style('font-size', `${FS}px`)
      .style('font-weight', '700').style('fill', palette.text)
      .attr('x', PAD).attr('y', PAD + FS)
      .text(groupLabel);

    groups.forEach((g, i) => {
      const localCy = PAD + FS + 10 + i * ITEM_H + CR;
      const localCx = PAD + CR;
      legendG.append('circle')
        .attr('cx', localCx).attr('cy', localCy)
        .attr('r', CR)
        .style('fill', colorOf({ group: g }))
        .style('stroke', 'none');
      legendG.append('text')
        .style('font-family', palette.font).style('font-size', `${FS}px`)
        .style('fill', palette.text)
        .attr('x', PAD + ITEM_TEXT_X).attr('y', localCy)
        .attr('dominant-baseline', 'middle')
        .text(g);
    });

    const bb = legendG.node().getBBox();
    legendG.insert('rect', ':first-child')
      .attr('x', bb.x - PAD).attr('y', bb.y - PAD)
      .attr('width', bb.width + 2 * PAD).attr('height', bb.height + 2 * PAD)
      .attr('rx', 4)
      .style('fill', palette.bg).style('fill-opacity', '0.88')
      .style('stroke', palette.muted).style('stroke-width', '0.5');

    const lx = isLeft ? OUTER_PAD : iW - (bb.width + 2 * PAD) - OUTER_PAD;
    const ly = OUTER_PAD;
    const tx = lx - (bb.x - PAD);
    const ty = ly - (bb.y - PAD);
    legendG.attr('transform', `translate(${tx},${ty})`);

    _legendState = {
      type: 'categorical',
      items: groups.map((g, i) => ({
        g,
        canvasCx: tx + PAD + CR,
        canvasCy: ty + PAD + FS + 10 + i * ITEM_H + CR,
      })),
      CR,
    };
  }

  function drawContinuousLegend({ groupValues, groupLabel, colorOf, isLeft, iW }) {
    const PAD = 8, FS = 10, LINE_LEN = 12, BAR_H = 100, TICK_LEN = 6, TICK_GAP = 4, OUTER_PAD = 12;
    const vals = groupValues.map(Number).filter(isFinite);
    if (!vals.length) return;
    const sorted = [...vals].sort(d3.ascending);
    const [lo, hi] = d3.extent(sorted);
    const thermoScale = d3.scaleLinear()
      .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi])
      .range([BAR_H - 1, 1]);  // 1px inset so extreme ticks stay inside bar bounds
    const Y0 = PAD + FS + 10;  // top of the spectrum area

    legendG.append('text')
      .style('font-family', palette.font).style('font-size', `${FS}px`)
      .style('font-weight', '700').style('fill', palette.text)
      .attr('x', PAD).attr('y', PAD + FS)
      .text(groupLabel);

    // Thin spine
    legendG.append('line')
      .attr('x1', PAD).attr('y1', Y0)
      .attr('x2', PAD).attr('y2', Y0 + BAR_H)
      .style('stroke', palette.muted).style('stroke-width', '1');

    // One colored line per data value — semi-transparent so density shows.
    for (const v of vals) {
      const y = Y0 + thermoScale(v);
      legendG.append('line')
        .attr('x1', PAD).attr('y1', y)
        .attr('x2', PAD + LINE_LEN).attr('y2', y)
        .style('stroke', colorOf({ group: v }))
        .style('stroke-width', '1')
        .style('opacity', '0.5');
    }

    // Quartile labels
    for (const v of fiveNum(sorted)) {
      const y = Y0 + thermoScale(v);
      legendG.append('text')
        .classed('tick-label--legend', true)
        .style('font-family', palette.font).style('font-size', `${FS}px`)
        .style('fill', palette.text)
        .attr('x', PAD + LINE_LEN + TICK_GAP).attr('y', y)
        .attr('dominant-baseline', 'middle')
        .text(fmtNum(v));
    }

    const bb = legendG.node().getBBox();
    legendG.insert('rect', ':first-child')
      .attr('x', bb.x - PAD).attr('y', bb.y - PAD)
      .attr('width', bb.width + 2 * PAD).attr('height', bb.height + 2 * PAD)
      .attr('rx', 4)
      .style('fill', palette.bg).style('fill-opacity', '0.88')
      .style('stroke', palette.muted).style('stroke-width', '0.5');

    const lx = isLeft ? OUTER_PAD : iW - (bb.width + 2 * PAD) - OUTER_PAD;
    const ly = OUTER_PAD;
    const tx = lx - (bb.x - PAD);
    const ty = ly - (bb.y - PAD);
    legendG.attr('transform', `translate(${tx},${ty})`);

    // Mirror quartile labels into the overlay — suppression operates here only.
    legendLabelsG.selectAll('*').remove();
    legendLabelsG.attr('transform', `translate(${tx},${ty})`);
    // Opaque rect hides the main SVG labels underneath so suppression leaves clean space.
    legendLabelsG.append('rect')
      .attr('x', PAD + LINE_LEN + TICK_GAP - 2)
      .attr('y', Y0 - 7)
      .attr('width', (bb.x + bb.width) - (PAD + LINE_LEN + TICK_GAP) + 4)
      .attr('height', BAR_H + 14)
      .style('fill', palette.bg);
    for (const v of fiveNum(sorted)) {
      const y = Y0 + thermoScale(v);
      legendLabelsG.append('text')
        .classed('tick-label--legend', true)
        .style('font-family', palette.font).style('font-size', `${FS}px`)
        .style('fill', palette.text)
        .attr('x', PAD + LINE_LEN + TICK_GAP).attr('y', y)
        .attr('dominant-baseline', 'middle')
        .text(fmtNum(v));
    }

    _legendState = {
      type: 'continuous',
      thermoScale,
      Y0,
      spineLocalX: PAD,
      LINE_LEN,
      TICK_GAP,
      colorOf,
      tx,
      ty,
    };
  }

  function updateLegendHover(groupVal) {
    legendHoverG.selectAll('*').remove();
    if (!_legendState) return;

    if (_legendState.type === 'categorical') {
      const key = String(groupVal);
      const item = _legendState.items.find(it => it.g === key);
      if (!item) return;
      legendHoverG.append('circle')
        .attr('cx', item.canvasCx).attr('cy', item.canvasCy)
        .attr('r', _legendState.CR + 2)
        .style('fill', 'none')
        .style('stroke', palette.text)
        .style('stroke-width', '1.5px');
    } else {
      const { thermoScale, Y0, spineLocalX, LINE_LEN, TICK_GAP, colorOf, tx, ty } = _legendState;
      const localY = Y0 + thermoScale(+groupVal);
      const canvasY = ty + localY;
      const canvasX0 = tx + spineLocalX;
      legendHoverG.append('line')
        .attr('x1', canvasX0).attr('y1', canvasY)
        .attr('x2', canvasX0 + LINE_LEN).attr('y2', canvasY)
        .style('stroke', colorOf({ group: +groupVal }))
        .style('stroke-width', '2px')
        .style('opacity', '1');
      legendHoverG.append('text')
        .style('fill', palette.text).style('font-size', '10px')
        .style('font-family', palette.font).style('font-weight', '600')
        .attr('x', canvasX0 + LINE_LEN + TICK_GAP).attr('y', canvasY)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .text(fmtNum(+groupVal));

      // Suppress quartile labels that would overlap the hover label.
      legendLabelsG.selectAll('.tick-label--legend').each(function() {
        const el = d3.select(this);
        if (Math.abs(+el.attr('y') - localY) < 8) el.style('display', 'none');
      });
    }
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
      .style('stroke', '#555').style('stroke-width', '1')
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
        .style('stroke', '#333').style('stroke-width', '0.75').style('opacity', '0.3')
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
          .style('fill', palette.muted).style('font-size', '13px').style('font-family', palette.font)
          .attr('x', pos)
          .attr('y', iH + TICK_LEN + 3)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'hanging')
          .text(fmt);
      } else {
        g.append('text')
          .classed('tick-label', true)
          .classed(labelClass, true)
          .style('fill', palette.muted).style('font-size', '13px').style('font-family', palette.font)
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
        .style('fill', palette.text).style('font-size', '14px')
        .style('font-family', palette.font).style('font-weight', '500')
        .attr('x', iW / 2)
        .attr('y', iH + TICK_LEN + 42)
        .attr('text-anchor', 'middle')
        .text(label);
    } else {
      g.append('text')
        .classed('axis-label', true)
        .style('fill', palette.text).style('font-size', '14px')
        .style('font-family', palette.font).style('font-weight', '500')
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
    cornersOverlayG.selectAll('*').remove();
    legendG.selectAll('*').remove();
    _legendState = null;
    clearHover();                                      // clears hoverG + legendHoverG + restores axisLabelsG visibility
    axisLabelsG.selectAll('*').remove();
    xAxisLabelsG.selectAll('*').remove();
    yAxisLabelsG.selectAll('*').remove();
    overlayCanvas.selectAll('rect.interaction-rect').remove();
    xAxisG.selectAll('*').remove();
    yAxisG.selectAll('*').remove();
    regLineEl.style('display', 'none');
    ciBandEl.style('display', 'none');
    xKdeEl.style('display', 'none');
    yKdeEl.style('display', 'none');
  }

  // highlightPoint(index | null) — called externally (e.g. from QQ hover) to show
  // a locating indicator on a specific point without triggering onPointHover.
  // Intentionally leaner than voronoi hover: larger circle only, no ring, no
  // superticks — communicates location, not interactability.
  function highlightPoint(index) {
    currentHoverIdx = null;
    clearHover();
    if (index == null || !_plotState) return;
    const d = _plotState.allPoints.find(p => p.index === index);
    if (!d || d.censored) return;
    hoverG.append('circle')
      .attr('cx', d.sx).attr('cy', d.sy)
      .attr('r', _pointRHover)
      .attr('fill', _plotState.colorOf(d))
      .style('pointer-events', 'none');
  }

  return { update, clear, highlightPoint };
}
