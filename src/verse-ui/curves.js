// src/verse-ui/curves.js
// The grid of specification curves: one panel per outcome × predictor. Each
// panel draws its paths sorted by partial r, with 95% CIs, on a y scale shared
// by every panel so curves can be compared at a glance. Optional strips below
// the curve, in the same path order:
//   - residual normality (Filliben's probability-plot r) per path
//   - the choice matrix (which option of each fork the path took); shown for
//     the focused panel only, since it needs a row per option.
//
// Canvas, not SVG: a curve can have tens of thousands of paths.

import { Z95 } from '../stats/common.js';
import { dimName, fmtR, fmtP } from './labels.js';

const CURVE_H = { grid: 170, focus: 280 };
const DIAG_H = 56;
const ROW_H = 13;
const GROUP_GAP = 8;
const PAD_TOP = 8;
const AXIS_W = 50;

function cssVar(name, fallback) {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

function readColors() {
  return {
    pos: cssVar('--sig-pos', '#2a6fb8'),
    neg: cssVar('--sig-neg', '#c2491d'),
    ns: cssVar('--nonsig', '#9aa0a6'),
    hi: cssVar('--highlight', '#e8a33d'),
    text: cssVar('--color-text', '#212529'),
    muted: cssVar('--color-text-muted', '#3f464a'),
    border: cssVar('--color-border', '#dee2e6'),
    axis: cssVar('--color-axis-line', '#555'),
    font: cssVar('--font-sans', 'sans-serif'),
  };
}

function niceTicks(lo, hi, count = 4) {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= count) ?? mag * 10;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

// Which dims get matrix rows: forks with more than one option. When the grid
// splits by outcome x predictor those two are fixed within a panel; as one
// curve they are forks like any other.
function matrixDims(dims, split) {
  return dims.map((d, i) => ({ d, i })).filter(({ d, i }) => (!split || i >= 2) && d.options.length > 1);
}

export function createCurveGrid({ container, tooltip, onFocus }) {
  const panels = new Map();  // id → { el, canvas, title, stats, focusBtn, layout }
  let model = null;
  let colors = null;

  function panelEl(id) {
    let p = panels.get(id);
    if (p) return p;
    const el = document.createElement('article');
    el.className = 'curve-panel';
    const head = document.createElement('header');
    const title = document.createElement('h3');
    const stats = document.createElement('span');
    stats.className = 'curve-stats';
    const focusBtn = document.createElement('button');
    focusBtn.className = 'curve-focus';
    focusBtn.type = 'button';
    focusBtn.addEventListener('click', () => onFocus(model.focus === id ? null : id));
    head.append(title, stats, focusBtn);
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    el.append(head, canvas);
    p = { id, el, canvas, title, stats, focusBtn, layout: null };
    canvas.addEventListener('mousemove', e => hover(p, e));
    canvas.addEventListener('mouseleave', () => { tooltip.hidden = true; });
    canvas.addEventListener('click', () => onFocus(model.focus === id ? null : id));
    panels.set(id, p);
    return p;
  }

  function render(next) {
    model = next;
    colors = readColors();
    const visible = model.focus ? model.panels.filter(p => p.id === model.focus) : model.panels;
    const cols = model.focus ? 1 : Math.max(1, Math.min(model.columns, 3));
    container.style.gridTemplateColumns = `repeat(${cols}, minmax(280px, 1fr))`;

    const keep = new Set(visible.map(p => p.id));
    for (const [id, p] of panels) if (!keep.has(id)) { p.el.remove(); panels.delete(id); }
    visible.forEach((data, i) => {
      const p = panelEl(data.id);
      if (container.children[i] !== p.el) container.insertBefore(p.el, container.children[i] ?? null);
      p.title.textContent = data.title;
      const s = data.stats;
      p.stats.textContent = s.k
        ? `${s.k} paths · median r ${fmtR(s.medianR)} · ${s.sigPositive} sig +, ${s.sigNegative} sig −`
          + (data.pending ? ` · ${data.pending} pending` : '')
          + (data.failed ? ` · ${data.failed} failed` : '')
          + (data.inference?.p
            ? ` · bootstrap p: median ${fmtP(data.inference.p.median)}, share sig ${fmtP(data.inference.p.shareSig)}, Stouffer ${fmtP(data.inference.p.stouffer)}`
            : '')
        : (data.pending ? `${data.pending} pending` : 'no paths');
      p.focusBtn.textContent = model.focus ? 'Back to grid' : (model.panels.length > 1 ? 'Focus' : '');
      p.focusBtn.hidden = !model.focus && model.panels.length <= 1;
      draw(p, data);
    });
  }

  function draw(p, data) {
    const focus = !!model.focus || model.panels.length === 1;
    const mDims = focus ? matrixDims(model.dims, model.split) : [];
    const ctx0 = p.canvas.getContext('2d');
    ctx0.font = `11px ${colors.font}`;
    const labelW = mDims.length
      ? Math.min(220, 12 + Math.max(...mDims.flatMap(({ d }) => [dimName(d), ...d.options.map(o => '  ' + o.label)])
        .map(t => ctx0.measureText(t).width)))
      : 0;
    const left = Math.max(AXIS_W, labelW);
    const curveH = focus ? CURVE_H.focus : CURVE_H.grid;
    const diagH = model.showDiag ? DIAG_H + 6 : 0;
    const matrixH = mDims.reduce((h, { d }) => h + ROW_H * (d.options.length + 1) + GROUP_GAP, 0);
    const width = p.canvas.clientWidth || p.el.clientWidth || 400;
    const height = PAD_TOP + curveH + 18 + diagH + matrixH;

    const dpr = window.devicePixelRatio || 1;
    p.canvas.style.height = `${height}px`;
    p.canvas.width = Math.round(width * dpr);
    p.canvas.height = Math.round(height * dpr);
    const ctx = p.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.font = `11px ${colors.font}`;
    ctx.textBaseline = 'middle';

    const paths = data.paths;
    const n = paths.length;
    const plotW = Math.max(10, width - left - 8);
    const step = n ? plotW / n : 0;
    const xAt = i => left + (i + 0.5) * step;
    const [ylo, yhi] = model.yDomain;
    const y = v => PAD_TOP + (1 - (v - ylo) / (yhi - ylo)) * curveH;
    p.layout = { left, step, n, curveTop: PAD_TOP, curveH };
    p.canvas.setAttribute('aria-label',
      `Specification curve for ${data.title}: ${n} paths, partial r from ${fmtR(paths[0]?.result.partialR)} to ${fmtR(paths[n - 1]?.result.partialR)}`);

    // Axis and zero line.
    ctx.strokeStyle = colors.border;
    ctx.fillStyle = colors.muted;
    ctx.textAlign = 'right';
    for (const t of niceTicks(ylo, yhi)) {
      ctx.beginPath();
      ctx.moveTo(left - 4, y(t)); ctx.lineTo(left + plotW, y(t));
      ctx.lineWidth = t === 0 ? 1.2 : 0.5;
      ctx.strokeStyle = t === 0 ? colors.axis : colors.border;
      ctx.stroke();
      ctx.fillText(fmtR(t), left - 6, y(t));
    }
    ctx.save();
    ctx.translate(10, PAD_TOP + curveH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('partial r', 0, 0);
    ctx.restore();

    const hl = model.highlight;
    const match = hl ? (pth => pth.choices[hl.d] === hl.o) : () => true;
    const colorOf = r => r.z > Z95 ? colors.pos : r.z < -Z95 ? colors.neg : colors.ns;
    const dotR = Math.max(1, Math.min(3, step * 0.45));

    const drawMarks = (want, alpha) => {
      ctx.globalAlpha = alpha * 0.45;
      ctx.lineWidth = Math.max(0.5, Math.min(1.5, step * 0.5));
      for (let i = 0; i < n; i++) {
        const pth = paths[i];
        if (match(pth) !== want) continue;
        const ci = pth.result.ci;
        if (!ci) continue;
        ctx.strokeStyle = colorOf(pth.result);
        ctx.beginPath();
        ctx.moveTo(xAt(i), y(ci[0])); ctx.lineTo(xAt(i), y(ci[1]));
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      for (let i = 0; i < n; i++) {
        const pth = paths[i];
        if (match(pth) !== want) continue;
        ctx.fillStyle = colorOf(pth.result);
        ctx.beginPath();
        ctx.arc(xAt(i), y(pth.result.partialR), dotR, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    if (hl) {
      drawMarks(false, 0.12);
      drawMarks(true, 1);
      // Tick under each highlighted path, so sparse matches are easy to find.
      ctx.fillStyle = colors.hi;
      for (let i = 0; i < n; i++) if (match(paths[i])) ctx.fillRect(xAt(i) - Math.max(0.5, step / 2), PAD_TOP + curveH + 4, Math.max(1, step), 4);
    } else {
      drawMarks(true, 1);
    }

    let top = PAD_TOP + curveH + 18;

    // Diagnostics strip: Filliben r per path. Robust residuals are heavy-tailed
    // by design, so M paths are drawn hollow and compare only with each other.
    if (model.showDiag) {
      const [dlo, dhi] = model.diagDomain;
      const dy = v => top + (1 - (v - dlo) / (dhi - dlo || 1)) * DIAG_H;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(left, top, plotW, DIAG_H);
      ctx.fillStyle = colors.muted;
      ctx.textAlign = 'right';
      ctx.fillText(dhi.toFixed(2), left - 6, top + 5);
      ctx.fillText(dlo.toFixed(2), left - 6, top + DIAG_H - 5);
      ctx.save();
      ctx.translate(10, top + DIAG_H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('QQ r', 0, 0);
      ctx.restore();
      const r = Math.max(1, Math.min(2.5, step * 0.4));
      for (let i = 0; i < n; i++) {
        const pth = paths[i];
        const f = pth.result.diagnostics?.filliben;
        if (f == null) continue;
        ctx.globalAlpha = match(pth) ? 1 : 0.12;
        ctx.beginPath();
        ctx.arc(xAt(i), dy(Math.max(dlo, f)), r, 0, 2 * Math.PI);
        if (pth.result.estimator === 'm') { ctx.strokeStyle = colors.muted; ctx.lineWidth = 1; ctx.stroke(); }
        else { ctx.fillStyle = colors.muted; ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      top += DIAG_H + 6;
    }

    // Choice matrix.
    for (const { d: dim, i: di } of mDims) {
      ctx.fillStyle = colors.text;
      ctx.textAlign = 'left';
      ctx.font = `600 11px ${colors.font}`;
      ctx.fillText(dimName(dim), 2, top + ROW_H / 2);
      ctx.font = `11px ${colors.font}`;
      top += ROW_H;
      dim.options.forEach((opt, oi) => {
        const rowMid = top + ROW_H / 2;
        const isHl = hl && hl.d === di && hl.o === oi;
        if (isHl) {
          ctx.fillStyle = colors.hi;
          ctx.globalAlpha = 0.18;
          ctx.fillRect(0, top, width, ROW_H);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = colors.muted;
        ctx.textAlign = 'left';
        let label = opt.label;
        while (label.length > 3 && ctx.measureText('  ' + label).width > left - 8) label = label.slice(0, -2) + '…';
        ctx.fillText('  ' + label, 2, rowMid);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(left, rowMid); ctx.lineTo(left + plotW, rowMid); ctx.stroke();
        const h = ROW_H - 4;
        for (let i = 0; i < n; i++) {
          const pth = paths[i];
          if (pth.choices[di] !== oi) continue;
          ctx.globalAlpha = match(pth) ? 1 : 0.15;
          ctx.fillStyle = colorOf(pth.result);
          ctx.fillRect(xAt(i) - Math.max(0.5, step * 0.4), rowMid - h / 2, Math.max(1, step * 0.8), h);
        }
        ctx.globalAlpha = 1;
        top += ROW_H;
      });
      top += GROUP_GAP;
    }
  }

  function hover(p, e) {
    const L = p.layout;
    const data = model?.panels.find(d => d.id === p.id);
    if (!L || !data || !L.n) return;
    const rect = p.canvas.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - L.left) / L.step);
    if (i < 0 || i >= L.n) { tooltip.hidden = true; return; }
    const pth = data.paths[i];
    const r = pth.result;
    const rows = matrixDims(model.dims, model.split)
      .map(({ d: dim, i: d }) => `<dt>${esc(dimName(dim))}</dt><dd>${esc(dim.options[pth.choices[d]].label)}</dd>`).join('');
    tooltip.innerHTML =
      `<strong>r = ${fmtR(r.partialR)}</strong> [${fmtR(r.ci?.[0])}, ${fmtR(r.ci?.[1])}] · p ${fmtP(r.p)} · n ${r.n}`
      + `<dl>${rows}`
      + (r.diagnostics ? `<dt>QQ r</dt><dd>${r.diagnostics.filliben?.toFixed(3) ?? '—'}</dd><dt>max Cook's D</dt><dd>${r.diagnostics.maxCooks.toFixed(3)}</dd>` : '')
      + `</dl>`;
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let tx = e.clientX + 14, ty = e.clientY + 14;
    if (tx + tw > window.innerWidth - 8) tx = e.clientX - tw - 14;
    if (ty + th > window.innerHeight - 8) ty = e.clientY - th - 14;
    tooltip.style.left = `${tx}px`;
    tooltip.style.top = `${ty}px`;
  }

  return {
    render,
    redraw() { if (model) render(model); },
  };
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
