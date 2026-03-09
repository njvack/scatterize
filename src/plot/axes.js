// src/plot/axes.js
// Axis rendering functions for the scatterplot.
// Pure: take explicit parameters; no shared state.

import { TICK_LEN, fiveNum, fmtNum } from './plot-model.js';

// Draw only the axis spine (WebGL mode — fringe ticks go to the GL line buffer).
export function drawAxisSpine(g, len, orient, palette) {
  g.selectAll('*').remove();
  const isX = orient === 'x';
  g.append('line').classed('axis-line', true)
    .style('stroke', palette.axisLine).style('stroke-width', '1')
    .attr('x1', 0).attr('y1', 0)
    .attr('x2', isX ? len : 0)
    .attr('y2', isX ? 0 : len);
}

// Draw axis spine + per-point tick mark lines (SVG fallback; no text labels).
export function drawAxis(g, vals, scale, iH, iW, orient, palette) {
  g.selectAll('*').remove();
  const isX = orient === 'x';

  g.append('line')
    .classed('axis-line', true)
    .style('stroke', palette.axisLine).style('stroke-width', '1')
    .attr('x1', 0).attr('y1', 0)
    .attr('x2', isX ? iW : 0)
    .attr('y2', isX ? 0 : iH);

  const finiteVals = vals.filter(Number.isFinite);
  const inRange = finiteVals.filter(v => v >= scale.domain()[0] && v <= scale.domain()[1]);
  for (const v of inRange) {
    const pos = scale(v);
    g.append('line')
      .classed('tick-mark', true)
      .style('stroke', palette.tickMark).style('stroke-width', '0.75').style('opacity', '0.3')
      .attr('x1', isX ? pos : 0)
      .attr('y1', isX ? 0 : pos)
      .attr('x2', isX ? pos : -TICK_LEN)
      .attr('y2', isX ? TICK_LEN : pos);
  }
}

// Draw axis tick label text + axis title into group g.
// Uses a D3 join keyed by index so labels animate to new positions when data changes.
// Pass T (a d3.transition) to animate; omit or pass null to snap.
// Labels get tick-label--x / tick-label--y classes for targeted hover suppression.
export function drawAxisLabels(g, vals, scale, iH, iW, orient, label, customTicks, margin, palette, T = null) {
  const isX        = orient === 'x';
  const len        = isX ? iW : iH;
  const labelClass = isX ? 'tick-label--x' : 'tick-label--y';

  const finiteVals = vals.filter(Number.isFinite);
  const tickVals   = (customTicks ?? fiveNum(finiteVals))
    .filter(v => { const p = scale(v); return p >= -2 && p <= len + 2; });

  // Join by index — existing labels slide to new positions; new labels snap in.
  const sel = g.selectAll(`text.${labelClass}`).data(tickVals);

  sel.exit().remove();

  const entered = sel.enter().append('text')
    .classed('tick-label', true).classed(labelClass, true)
    .style('fill', palette.muted).style('font-size', '13px').style('font-family', palette.font)
    .attr('text-anchor', isX ? 'middle' : 'end')
    .attr('dominant-baseline', isX ? 'hanging' : 'middle')
    .text(v => fmtNum(v));

  // New elements snap to their position immediately (no transition from 0,0).
  if (isX) {
    entered.attr('x', v => scale(v)).attr('y', iH + TICK_LEN + 3);
  } else {
    entered.attr('x', -TICK_LEN - 3).attr('y', v => scale(v));
  }

  // Existing elements (update selection only) transition to new position.
  sel.text(v => fmtNum(v));
  const updT = T ? sel.transition(T) : sel;
  if (isX) {
    updT.attr('x', v => scale(v)).attr('y', iH + TICK_LEN + 3);
  } else {
    updT.attr('x', -TICK_LEN - 3).attr('y', v => scale(v));
  }

  // Axis title — one persistent element; snap on creation, transition thereafter.
  let title = g.select('text.axis-label');
  if (title.empty()) {
    title = g.append('text').classed('axis-label', true)
      .style('fill', palette.text).style('font-size', '14px')
      .style('font-family', palette.font).style('font-weight', '500')
      .attr('text-anchor', 'middle');
    if (!isX) title.attr('transform', 'rotate(-90)');
    // Snap new title to position immediately.
    if (isX) {
      title.attr('x', iW / 2).attr('y', iH + TICK_LEN + 42);
    } else {
      title.attr('x', -iH / 2).attr('y', -(margin.left - 15));
    }
  }
  title.text(label);
  const titleT = T ? title.transition(T) : title;
  if (isX) {
    titleT.attr('x', iW / 2).attr('y', iH + TICK_LEN + 42);
  } else {
    titleT.attr('x', -iH / 2).attr('y', -(margin.left - 15));
  }
}
