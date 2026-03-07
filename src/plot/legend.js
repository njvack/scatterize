// src/plot/legend.js
// Legend rendering: categorical (color swatches) and continuous (spectrum).
//
// createLegendRenderer(legendG, legendLabelsG, legendHoverG, legendInteractionG, palette)
//   → { drawLegend, updateLegendHover, getLegendState, appendGroupHoverClone }

import * as d3 from 'd3';
import { fiveNum, fmtNum } from './plot-model.js';

export function createLegendRenderer(legendG, legendLabelsG, legendHoverG, legendInteractionG, palette) {
  let _legendState = null;

  // onGroupHover(groupName | null) — callback set by drawLegend caller (scatterplot.js
  // passes showGroupHover). Stored so updateLegendHover doesn't need it as a parameter.
  function drawLegend({ active, groupColorType, groupLabel, colorOf, modelResult, iW, onGroupHover }) {
    legendG.selectAll('*').remove();
    legendLabelsG.selectAll('*').remove();
    legendHoverG.selectAll('*').remove();
    legendInteractionG.selectAll('*').remove();
    _legendState = null;
    if (!groupLabel) return;
    const groupValues = active.map(p => p.group).filter(g => g != null);
    if (!groupValues.length) return;
    const isLeft = (modelResult?.slope ?? 0) >= 0;
    if (groupColorType === 'continuous') {
      drawContinuousLegend({ groupValues, groupLabel, colorOf, isLeft, iW });
    } else {
      drawCategoricalLegend({ groupValues, groupLabel, colorOf, isLeft, iW, onGroupHover });
    }
  }

  function drawCategoricalLegend({ groupValues, groupLabel, colorOf, isLeft, iW, onGroupHover }) {
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

    // Hit rects in the overlay so they can be raised above the Voronoi interactionRect.
    legendInteractionG.selectAll('*').remove();
    groups.forEach((g, i) => {
      legendInteractionG.append('rect')
        .attr('x', tx + bb.x - PAD)
        .attr('y', ty + PAD + FS + 10 + i * ITEM_H)
        .attr('width', bb.width + 2 * PAD)
        .attr('height', ITEM_H)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .style('cursor', 'default')
        .on('mouseenter', () => onGroupHover(g))
        .on('mouseleave', () => onGroupHover(null));
    });

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
      const key  = String(groupVal);
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
      const localY  = Y0 + thermoScale(+groupVal);
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
        .attr('text-anchor', 'start').attr('dominant-baseline', 'middle')
        .text(fmtNum(+groupVal));

      // Suppress quartile labels that would overlap the hover label.
      legendLabelsG.selectAll('.tick-label--legend').each(function() {
        const el = d3.select(this);
        if (Math.abs(+el.attr('y') - localY) < 8) el.style('display', 'none');
      });
    }
  }

  // Append a dimmed clone of the legend to container, with groupStr as the active group.
  // Only acts for categorical legends. Used by showGroupHover in scatterplot.js.
  function appendGroupHoverClone(container, groupStr) {
    const legendNode = legendG.node();
    if (!legendNode || _legendState?.type !== 'categorical') return;
    const clone = legendNode.cloneNode(true);
    clone.style.pointerEvents = 'none';
    const si = _legendState.items.findIndex(it => String(it.g) === groupStr);
    if (si >= 0) {
      const kids = clone.children;
      _legendState.items.forEach((_, i) => {
        if (i === si) return;
        const circle = kids[2 + i * 2];
        const text   = kids[2 + i * 2 + 1];
        if (circle) circle.style.opacity = '0.2';
        if (text)   text.style.opacity   = '0.2';
      });
    }
    container.node().appendChild(clone);
  }

  function getLegendState() { return _legendState; }

  return { drawLegend, updateLegendHover, getLegendState, appendGroupHoverClone };
}
