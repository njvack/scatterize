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
import { createWebGLRenderer } from './webgl-renderer.js';
import {
  buildPlotModel, buildColorOf,
  fmtNum,
  POINT_R, TICK_LEN, CORNER_R, KDE_MAX_PX,
  CORNER_BOT_STRIP_Y, CORNER_LEFT_STRIP_X,
} from './plot-model.js';
import { drawAxisSpine, drawAxis, drawAxisLabels } from './axes.js';
import { createLegendRenderer } from './legend.js';

export { buildColorOf } from './plot-model.js';

const SUPERTICK_LEN       = 14;   // px: hover supertick
const POINT_R_HOVER_DELTA = 2;    // px: hover radius = point radius + this
const MAX_HOVER_DIST      = 40;   // px: beyond this from nearest point, no hover

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

// Convert a CSS color string + alpha to a WebGL straight RGBA array [0-1].
// D3's color() handles hex, rgb(), named colors, etc.
function cssToGL(str, alpha = 1) {
  const c = d3.color(str);
  return c ? [c.r / 255, c.g / 255, c.b / 255, alpha] : [0, 0, 0, alpha];
}

// in frontSvg with D3 joins (same as before, just split across two SVGs).
export function createScatterplot(backSvgEl, frontSvgEl, overlaySvgEl, { glCanvas = null } = {}) {
  const palette    = readPalette();
  const backSvg    = d3.select(backSvgEl);
  const frontSvg   = d3.select(frontSvgEl);
  const overlaySvg = d3.select(overlaySvgEl);

  // ── WebGL renderer (null → SVG fallback) ───────────────────────────────
  const glRenderer = glCanvas ? createWebGLRenderer(glCanvas) : null;
  const dpr = window.devicePixelRatio || 1;

  // ── Back SVG structure (static; rendered below WebGL canvas) ───────────
  // Contains: background rect, axis KDE strips, CI band, regression line.
  const backDefs    = backSvg.append('defs');
  const backClipId  = 'plot-clip-back-' + Math.random().toString(36).slice(2);
  const backClipRect = backDefs.append('clipPath').attr('id', backClipId).append('rect');

  // Solid background for export (Illustrator needs a background rect).
  backSvg.append('rect').attr('class', 'plot-bg')
    .attr('fill', palette.bg)
    .attr('width', '100%').attr('height', '100%');

  const backCanvas   = backSvg.append('g').attr('class', 'canvas');
  const backPlotArea = backCanvas.append('g').attr('class', 'plot-area')
    .attr('clip-path', `url(#${backClipId})`);
  const xKdeEl = backPlotArea.append('path').attr('class', 'kde--x')
    .style('fill', '#aaa').style('fill-opacity', '0.35')
    .style('stroke', 'none').style('pointer-events', 'none');
  const yKdeEl = backPlotArea.append('path').attr('class', 'kde--y')
    .style('fill', '#aaa').style('fill-opacity', '0.35')
    .style('stroke', 'none').style('pointer-events', 'none');
  const ciBandEl  = backPlotArea.append('path').attr('class', 'ci-band')
    .style('fill', palette.regline).style('fill-opacity', '0.12')
    .style('stroke', 'none').style('pointer-events', 'none');
  const regLineEl = backPlotArea.append('line').attr('class', 'regression-line')
    .style('stroke', palette.regline).style('stroke-width', '1.75')
    .style('fill', 'none');

  // ── Front SVG structure (static; rendered above WebGL canvas) ──────────
  // Contains: axis spines/labels, points (SVG fallback), corners, legend.
  const frontDefs   = frontSvg.append('defs');
  const frontClipId = 'plot-clip-front-' + Math.random().toString(36).slice(2);
  const frontClipRect = frontDefs.append('clipPath').attr('id', frontClipId).append('rect');

  const frontCanvas  = frontSvg.append('g').attr('class', 'canvas');
  const xAxisG       = frontCanvas.append('g').attr('class', 'x-axis');
  const yAxisG       = frontCanvas.append('g').attr('class', 'y-axis');
  // Axis label text: in front SVG for export, and mirrored in overlay for
  // interactive hover suppression.  Both use canvas (margin-translated) coords.
  const xAxisLabelsG = frontCanvas.append('g').attr('class', 'x-axis-labels');
  const yAxisLabelsG = frontCanvas.append('g').attr('class', 'y-axis-labels');
  const frontPlotArea = frontCanvas.append('g').attr('class', 'plot-area')
    .attr('clip-path', `url(#${frontClipId})`);
  const pointsG  = frontPlotArea.append('g').attr('class', 'points');
  const cornersG = frontCanvas.append('g').attr('class', 'corners'); // outside clip
  // Legend lives in front SVG so it's above the WebGL canvas and captured by export.
  const legendG  = frontCanvas.append('g').attr('class', 'legend');

  // ── Overlay SVG structure (hover rendering + mouse interaction) ─────────
  // hoverG: hover indicator + supertick lines — cleared/drawn on hover change
  // interaction rect: appended to overlayCanvas per update() call
  // cornersOverlayG: invisible paths carrying data-cx/data-cy for hover suppression
  const overlayCanvas = overlaySvg.append('g').attr('class', 'overlay-canvas');
  const cornersOverlayG = overlayCanvas.append('g').attr('class', 'corners-overlay')
    .style('pointer-events', 'none');
  // Group hover layer: dim rect + re-rendered group points.  Must be below hoverG
  // so the point hover ring + superticks sit on top of the group dim effect.
  const groupHoverG     = overlayCanvas.append('g').attr('class', 'group-hover-layer')
    .style('pointer-events', 'none');
  const hoverG          = overlayCanvas.append('g').attr('class', 'hover-layer')
    .style('pointer-events', 'none');
  // Legend labels mirrored in overlay so suppression never touches the export SVG.
  const legendLabelsG   = overlayCanvas.append('g').attr('class', 'legend-labels')
    .style('pointer-events', 'none');
  // Legend hover ring/line rendered in overlay so it doesn't affect export.
  const legendHoverG    = overlayCanvas.append('g').attr('class', 'legend-hover')
    .style('pointer-events', 'none');
  // Transparent hit rects for categorical legend rows.  Must be raised above the
  // voronoi interactionRect each update() so it captures mouseenter before Voronoi.
  const legendInteractionG = overlayCanvas.append('g').attr('class', 'legend-interaction');

  const legendRenderer = createLegendRenderer(
    legendG, legendLabelsG, legendHoverG, legendInteractionG, palette,
  );

  let prevState = new Map(); // index → { sx, sy, cornerX, cornerY, isCorner }
  let currentHoverIdx = null; // data point index (.index) of current hover, or null
  let lastMousePos = null;    // [mx, my] in overlay coords; null when mouse is outside
  let _plotState = null;      // { allPoints, iH, colorOf, xScale, yScale } — for highlightPoint
  let _pointR = POINT_R;         // current render's scaled point radius
  let _pointRHover = POINT_R + POINT_R_HOVER_DELTA; // current render's hover radius
  let _onGroupHover = () => {};  // called with groupName | null from showGroupHover
  let _lastPhysW = 0, _lastPhysH = 0;  // detect canvas resize for WebGL snap
  let _animatingUntil = 0;  // suppress hover while points are in flight

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
    onGroupHover = () => {},
    animate = true,
  }) {
    _onGroupHover = onGroupHover;
    if (animate) _animatingUntil = performance.now() + 220;  // 200ms anim + buffer

    // Clear any stuck hover overlay immediately when data changes.
    clearHover();
    groupHoverG.selectAll('*').remove();
    _onGroupHover(null);
    onPointHover(null);
    currentHoverIdx = null;

    const { width: W, height: H } = backSvgEl.getBoundingClientRect();
    if (W === 0 || H === 0) return;
    const model = buildPlotModel(points, modelResult, { W, H, modelKey, groupColorType, palette });
    if (!model) return;
    const { iW, iH, margin: MARGIN, xScale, yScale, active,
            allPoints, xVals, yVals, colorOf, voronoiPoints, cornerPoints,
            xKdeData, yKdeData, bandData, hasLine, pointR } = model;
    _pointR = pointR;
    _pointRHover = pointR + POINT_R_HOVER_DELTA;

    // Sync all SVG layers to the same coordinate system.
    backSvg.attr('viewBox', `0 0 ${W} ${H}`);
    backCanvas.attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
    backClipRect.attr('width', iW).attr('height', iH);

    frontSvg.attr('viewBox', `0 0 ${W} ${H}`);
    frontCanvas.attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
    frontClipRect.attr('width', iW).attr('height', iH);

    overlaySvg.attr('viewBox', `0 0 ${W} ${H}`);
    overlayCanvas.attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Resize WebGL canvas to physical pixels.
    let _glResized = false;
    if (glRenderer) {
      const physW = Math.round(W * dpr), physH = Math.round(H * dpr);
      _glResized = physW !== _lastPhysW || physH !== _lastPhysH;
      _lastPhysW = physW;  _lastPhysH = physH;
      glRenderer.resize(physW, physH);
    }

    // ── Shared transition — created first so all animated elements use the same one.
    const T = d3.transition().duration(animate ? 200 : 0).ease(d3.easeExpOut);

    // ── Axes ──────────────────────────────────────────────────────────────
    // Spines + fringe tick marks in the axis groups; labels in separate groups
    // so they sit above the data layer without being clipped.

    xAxisG.attr('transform', `translate(0,${iH})`);
    yAxisG.attr('transform', `translate(0,0)`);

    if (glRenderer) {
      // WebGL mode: SVG draws spine only; fringe ticks go to the GL line buffer.
      drawAxisSpine(xAxisG, iW, 'x');
      drawAxisSpine(yAxisG, iH, 'y');
    } else {
      // SVG fallback: draw spine + per-point fringe ticks in SVG.
      drawAxis(xAxisG, xVals, xScale, iH, iW, 'x');
      drawAxis(yAxisG, yVals, yScale, iH, iW, 'y');
    }

    // Front SVG labels — D3 join inside drawAxisLabels; pass T so they animate.
    drawAxisLabels(xAxisLabelsG, xVals, xScale, iH, iW, 'x', xLabel, customXTicks, MARGIN, palette, T);
    drawAxisLabels(yAxisLabelsG, yVals, yScale, iH, iW, 'y', yLabel, customYTicks, MARGIN, palette, T);

    // ── Axis KDE strips ───────────────────────────────────────────────────
    // Shallow Gaussian KDE shown on the inside of each axis spine, giving a
    // visual sense of data density (especially useful for discrete/clumped X).

    function drawKdeStrip(el, kdeData, scale, orient) {
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
      if (isNew || !animate) {
        el.attr('d', areaGen);
      } else {
        el.transition(T).attr('d', areaGen);
      }
    }

    drawKdeStrip(xKdeEl, xKdeData, xScale, 'x');
    drawKdeStrip(yKdeEl, yKdeData, yScale, 'y');

    // ── Regression line ───────────────────────────────────────────────────

    if (hasLine) {
      const x0 = xScale.domain()[0];
      const x1 = xScale.domain()[1];
      const ly0 = yScale(modelResult.intercept + modelResult.slope * x0);
      const ly1 = yScale(modelResult.intercept + modelResult.slope * x1);
      const isNew = !regLineEl.attr('x1');
      regLineEl.style('display', null);
      if (isNew || !animate) {
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

    if (bandData) {
      const areaGen = d3.area()
        .x(d => xScale(d.x))
        .y0(d => yScale(d.lo))
        .y1(d => yScale(d.hi));
      const isNew = !ciBandEl.attr('d');
      ciBandEl.style('display', null).datum(bandData);
      if (isNew || !animate) {
        ciBandEl.attr('d', areaGen);
      } else {
        ciBandEl.transition(T).attr('d', areaGen);
      }
    } else {
      ciBandEl.style('display', 'none');
    }

    // ── Group color scale ─────────────────────────────────────────────────

    legendRenderer.drawLegend({ active, groupColorType, groupLabel, colorOf, modelResult, iW, onGroupHover: showGroupHover });

    // ── Points ────────────────────────────────────────────────────────────

    const newPointMap = new Map(allPoints.map(p => [p.index, p]));

    // Store state for highlightPoint() called from outside (e.g. QQ hover → main scatter).
    _plotState = { allPoints, iH, iW, colorOf, xScale, yScale };

    if (glRenderer) {
      // ── WebGL rendering path ─────────────────────────────────────────────
      // Clear SVG point layer (WebGL replaces it).
      pointsG.selectAll('*').remove();

      // Build point data for the GPU: CSS pixel coords in plot-container space.
      // All points included: in-range censored = hollow circle; out-of-range
      // censored = hollow diamond at their corner position in the margin strip.
      const STROKE_W        = 1.25;
      const CORNER_STROKE_W = 1.5;
      const cornerInnerR    = Math.max(0, 0.5 * (CORNER_R - CORNER_STROKE_W) / CORNER_R);
      const glPoints = [];
      for (const p of allPoints) {
        const alpha = p.censored ? 0.7 : (p.weight != null ? 0.15 + 0.7 * p.weight : 0.85);
        if (p.corner) {
          glPoints.push({
            x: MARGIN.left + p.corner.x,
            y: MARGIN.top  + p.corner.y,
            r: CORNER_R,
            color: cssToGL(palette.censored, 0.8),
            innerRadius: cornerInnerR,
            shape: 1,
          });
        } else {
          const fullX = MARGIN.left + p.sx;
          const fullY = MARGIN.top  + p.sy;
          if (p.censored) {
            const innerR = Math.max(0, 0.5 * (_pointR - STROKE_W) / _pointR);
            glPoints.push({ x: fullX, y: fullY, r: _pointR,
              color: cssToGL(palette.censored, alpha), innerRadius: innerR, shape: 0 });
          } else {
            glPoints.push({ x: fullX, y: fullY, r: _pointR,
              color: cssToGL(colorOf(p), alpha), innerRadius: 0, shape: 0 });
          }
        }
      }

      // Build fringe tick line data: CSS pixel coords in plot-container space.
      // Every point gets two entries (x tick + y tick) regardless of censored status,
      // so the array length stays constant at 2*n across censoring changes — a
      // necessary condition for the WebGL renderer to interpolate rather than snap.
      // Censored and corner points get alpha=0 (invisible but still present).
      const glLines = [];
      for (const p of allPoints) {
        const alpha = (p.censored || p.corner) ? 0 : 0.3;
        const color = cssToGL(palette.muted, alpha);
        glLines.push(
          { x1: MARGIN.left + p.sx, y1: MARGIN.top + iH,
            x2: MARGIN.left + p.sx, y2: MARGIN.top + iH + TICK_LEN, color },
          { x1: MARGIN.left,            y1: MARGIN.top + p.sy,
            x2: MARGIN.left - TICK_LEN, y2: MARGIN.top + p.sy, color },
        );
      }

      glRenderer.transitionTo(glPoints, glLines, dpr, animate && !_glResized);

    } else {
      // ── SVG rendering path (fallback) ────────────────────────────────────
      const circlePoints = allPoints.filter(p => !p.censored || !p.corner);

      pointsG.selectAll('.point')
        .data(circlePoints, d => d.index)
        .join(
          enter => {
            const nodes = enter.append('circle').attr('class', 'point')
              .attr('r', _pointR)
              .attr('cx', d => { const p = prevState.get(d.index); return p?.isCorner ? p.cornerX : d.sx; })
              .attr('cy', d => { const p = prevState.get(d.index); return p?.isCorner ? p.cornerY : d.sy; });
            nodes.transition(T).attr('cx', d => d.sx).attr('cy', d => d.sy);
            return nodes;
          },
          update => update.call(sel =>
            sel.transition(T).attr('cx', d => d.sx).attr('cy', d => d.sy)
          ),
          exit => {
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
    }

    // Out-of-range censored: corner diamonds.
    // WebGL mode: rendered by the GPU at their corner positions (shape: 1 above).
    // SVG fallback: drawn as SVG paths with a D3 transition.
    // cornersOverlayG is always updated for data-cx/data-cy (hover suppression)
    // but kept invisible (stroke: none) — it's a data-attribute carrier only.
    if (!glRenderer) {
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
    } else {
      cornersG.selectAll('*').remove();
    }

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
      .style('fill', 'none').style('stroke', 'none');

    // ── Hit detection: interaction rect in overlay + delaunay.find() ──────
    // Mouse events live entirely in the overlay SVG.  The main SVG has zero
    // event handlers and never mutates during user interaction, so the browser
    // can cache its rasterized texture across hover frames.

    // A tiny random jitter breaks collinearity without affecting hover feel.
    overlayCanvas.selectAll('rect.interaction-rect').remove();

    if (voronoiPoints.length >= 1) {
      // Spatial grid for hit detection — robust to collinear/coincident points
      // that cause degenerate Delaunay triangulations (e.g. many x=0 values).
      // Grid cells are MAX_HOVER_DIST/2 wide; querying a 5×5 neighbourhood
      // guarantees we find any point within MAX_HOVER_DIST of the cursor.
      const GRID_CELL = MAX_HOVER_DIST / 2;
      const gridCells = new Map();
      for (const p of voronoiPoints) {
        const px = p.corner ? p.corner.x : p.sx;
        const py = p.corner ? p.corner.y : p.sy;
        const key = `${Math.floor(px / GRID_CELL)},${Math.floor(py / GRID_CELL)}`;
        if (!gridCells.has(key)) gridCells.set(key, []);
        gridCells.get(key).push({ p, px, py });
      }

      function findNearest(mx, my) {
        const cx0 = Math.floor(mx / GRID_CELL);
        const cy0 = Math.floor(my / GRID_CELL);
        let bestDist = MAX_HOVER_DIST;
        let bestP = null;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const cell = gridCells.get(`${cx0 + dx},${cy0 + dy}`);
            if (!cell) continue;
            for (const { p, px, py } of cell) {
              const dist = Math.hypot(mx - px, my - py);
              if (dist < bestDist) { bestDist = dist; bestP = p; }
            }
          }
        }
        return bestP; // null if nothing within MAX_HOVER_DIST
      }

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
        if (performance.now() < _animatingUntil) return;
        const d = findNearest(mx, my);

        if (!d) {
          if (currentHoverIdx !== null) {
            currentHoverIdx = null;
            clearHover();
            onPointHover(null);
            interactionRect.style('cursor', 'default');
          }
          return;
        }

        if (d.index === currentHoverIdx) return;
        currentHoverIdx = d.index;
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
          onPointClick(currentHoverIdx);
        });

      // Re-establish hover at the last known position after a data/model change
      // (e.g. censoring a point) so the highlight doesn't vanish until mousemove.
      if (lastMousePos) handleHover(...lastMousePos);
    }

    // Legend interaction rects must be the topmost child of overlayCanvas so they
    // capture mouseenter/mouseleave before the voronoi interactionRect does.
    legendInteractionG.raise();

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

  // outline: true  → ring + pointer cursor (interactable voronoi hover)
  //          false → circle only, no ring (locating hover e.g. from QQ)
  function showHover(d, iH, color, { outline = true } = {}) {
    hoverG.selectAll('*').remove();

    const circle = hoverG.append('circle')
      .attr('cx', d.sx).attr('cy', d.sy)
      .attr('r', _pointRHover)
      .attr('fill', color)
      .style('pointer-events', 'none');

    if (outline) circle.attr('stroke', palette.text).attr('stroke-width', 1.5);

    drawHoverSuperticks(d.sx, d.displayX, d.sy, d.displayY, iH);
    if (legendRenderer.getLegendState() && d.group != null) legendRenderer.updateLegendHover(d.group);
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
    const selector  = isX ? 'text.tick-label--x' : 'text.tick-label--y';
    const labelsEl  = isX ? xAxisLabelsG : yAxisLabelsG;
    labelsEl.selectAll(selector).each(function() {
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
    // Restore axis labels and legend ticks suppressed during hover.
    xAxisLabelsG.selectAll('.tick-label--x').style('display', null);
    yAxisLabelsG.selectAll('.tick-label--y').style('display', null);
    legendLabelsG.selectAll('.tick-label--legend').style('display', null);
  }

  // showGroupHover(groupName | null) — dim everything outside the named group.
  // Called from categorical legend mouseenter/mouseleave.
  //
  // Approach: dim rect over the inner plot area, then re-render above it:
  //   • group points at full color
  //   • clones of KDE strips, reg line, CI band (so they don't disappear)
  //   • clone of the legend (so it doesn't disappear)
  //   • a subtle row-highlight on the hovered legend item
  //
  // O(k + fixed-element count) DOM ops — fine for large n.
  function showGroupHover(groupName) {
    groupHoverG.selectAll('*').remove();
    if (groupName == null || !_plotState) return;

    const { allPoints, iH, iW, colorOf } = _plotState;
    const groupStr = String(groupName);

    // Dim rect covers the inner plot area (overlayCanvas is margin-translated).
    groupHoverG.append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width', iW).attr('height', iH)
      .attr('fill', palette.bg)
      .attr('opacity', 0.72);

    // Re-render group points at full color on top of the dim.
    for (const d of allPoints) {
      if (d.censored || d.corner) continue;
      if (String(d.group) !== groupStr) continue;
      groupHoverG.append('circle')
        .attr('cx', d.sx).attr('cy', d.sy)
        .attr('r', _pointR)
        .attr('fill', colorOf(d));
    }

    // Clone KDE strips, CI band, and regression line above the dim so they
    // remain visible (they live in plotArea in the main SVG; no clip-path needed
    // here since they're computed within the scale domain).
    for (const el of [xKdeEl, yKdeEl, ciBandEl, regLineEl]) {
      const node = el.node();
      if (node && node.style.display !== 'none') {
        groupHoverG.node().appendChild(node.cloneNode(true));
      }
    }

    // Clone the legend above the dim with non-hovered items dimmed.
    legendRenderer.appendGroupHoverClone(groupHoverG, groupStr);

    _onGroupHover(groupName);
  }

  function clear() {
    // Remove data-driven content only; preserve the permanent SVG structure
    // so subsequent update() calls still work.
    pointsG.selectAll('*').remove();
    cornersG.selectAll('*').remove();
    cornersOverlayG.selectAll('*').remove();
    legendG.selectAll('*').remove();
    clearHover();
    groupHoverG.selectAll('*').remove();
    legendInteractionG.selectAll('*').remove();
    xAxisLabelsG.selectAll('*').remove();
    yAxisLabelsG.selectAll('*').remove();
    overlayCanvas.selectAll('rect.interaction-rect').remove();
    xAxisG.selectAll('*').remove();
    yAxisG.selectAll('*').remove();
    regLineEl.interrupt().style('display', 'none').attr('x1', null);
    ciBandEl.interrupt().style('display', 'none').attr('d', null);
    xKdeEl.style('display', 'none');
    yKdeEl.style('display', 'none');
    if (glRenderer) glRenderer.clear();
  }

  // highlightPoint(index | null) — called externally (e.g. from QQ hover) to show
  // the full hover treatment (superticks, legend highlight) without triggering
  // onPointHover. No ring and no cursor change — signals location, not clickability.
  function highlightPoint(index) {
    currentHoverIdx = null;
    clearHover();
    if (index == null || !_plotState) return;
    const d = _plotState.allPoints.find(p => p.index === index);
    if (!d || d.censored) return;
    showHover(d, _plotState.iH, _plotState.colorOf(d), { outline: false });
  }

  // getExportSVG() — returns a combined SVG element containing:
  //   back SVG content (bg, KDE, CI, regline)
  //   WebGL-generated SVG elements (fringe ticks + points, if WebGL active)
  //   front SVG content (axes, labels, legend, corners)
  // The returned element is not attached to the DOM; caller serializes it.
  function getExportSVG() {
    const W = backSvgEl.clientWidth;
    const H = backSvgEl.clientHeight;
    const ns   = 'http://www.w3.org/2000/svg';
    const root = document.createElementNS(ns, 'svg');
    root.setAttribute('viewBox', `0 0 ${W} ${H}`);
    root.setAttribute('width',  W);
    root.setAttribute('height', H);
    root.setAttribute('xmlns',  ns);

    for (const child of backSvgEl.children)  root.appendChild(child.cloneNode(true));
    if (glRenderer) root.appendChild(glRenderer.toSVGGroup(backClipId));
    for (const child of frontSvgEl.children) root.appendChild(child.cloneNode(true));

    return root;
  }

  return { update, clear, highlightPoint, getExportSVG };
}
