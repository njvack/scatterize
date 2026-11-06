// src/verse-ui/summary-panel.js
// The right-hand panel: whole-verse statistics, then one block per fork
// listing its options with their median partial r and significant paths, and
// eta² (the share of variance in r the fork's options explain). Hovering an
// option highlights its paths in every curve; clicking pins the highlight.

import { dimName, fmtR, fmtP, fmtPct } from './labels.js';

export function createSummaryPanel({ container, onHover, onPin }) {
  let pinned = null;

  container.addEventListener('mouseover', e => {
    const row = e.target.closest('.option-row');
    if (row) onHover({ d: +row.dataset.d, o: +row.dataset.o });
  });
  container.addEventListener('mouseleave', () => onHover(null));
  container.addEventListener('focusin', e => {
    const row = e.target.closest('.option-row');
    if (row) onHover({ d: +row.dataset.d, o: +row.dataset.o });
  });
  container.addEventListener('focusout', () => onHover(null));
  container.addEventListener('click', e => {
    const row = e.target.closest('.option-row');
    if (row) togglePin(row);
  });
  container.addEventListener('keydown', e => {
    const row = e.target.closest('.option-row');
    if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); togglePin(row); }
  });

  function togglePin(row) {
    const sel = { d: +row.dataset.d, o: +row.dataset.o };
    pinned = pinned && pinned.d === sel.d && pinned.o === sel.o ? null : sel;
    onPin(pinned);
  }

  function render({ dims, summaries, observed, inference, progress, pinned: pin }) {
    pinned = pin;
    if (!dims) { container.innerHTML = ''; return; }
    const parts = [];
    parts.push('<div class="overall"><h2>All paths</h2><dl>');
    parts.push(`<dt>Paths fitted</dt><dd>${progress.done - progress.failed} of ${progress.total}</dd>`);
    if (progress.failed) parts.push(`<dt>Failed</dt><dd>${progress.failed}</dd>`);
    if (observed.k) {
      parts.push(`<dt>Median partial r</dt><dd>${fmtR(observed.medianR)}</dd>`);
      parts.push(`<dt>Positive</dt><dd>${fmtPct(observed.positive / observed.k)}</dd>`);
      parts.push(`<dt>Significant, positive</dt><dd>${fmtPct(observed.sigPositive / observed.k)}</dd>`);
      parts.push(`<dt>Significant, negative</dt><dd>${fmtPct(observed.sigNegative / observed.k)}</dd>`);
    }
    if (progress.boot) {
      if (inference?.p) {
        parts.push(`<dt>p (median, forced null)</dt><dd>${fmtP(inference.p.median)}</dd>`);
        parts.push(`<dt>p (share significant)</dt><dd>${fmtP(inference.p.shareSig)}</dd>`);
        parts.push(`<dt>p (Stouffer's Z)</dt><dd>${fmtP(inference.p.stouffer)}</dd>`);
      } else {
        parts.push(`<dt>Bootstrap</dt><dd>${progress.boot.done} of ${progress.boot.total}</dd>`);
      }
    }
    parts.push('</dl></div>');

    parts.push('<h2>Which choices matter?</h2>');
    parts.push('<p class="verse-hint">Hover an option to highlight its paths; click to pin. η² is the share of the spread in r that the fork explains.</p>');
    summaries.forEach((s, d) => {
      if (dims[d].options.length < 2) return;
      const eta = s.etaSquared;
      parts.push(`<div class="fork-summary"><h3><span>${esc(dimName(dims[d]))}</span><span class="eta">η² ${eta == null ? '—' : eta.toFixed(2)}</span></h3>`);
      parts.push(`<div class="eta-bar"><span style="width:${eta == null ? 0 : Math.round(eta * 100)}%"></span></div><ul>`);
      s.options.forEach((o, oi) => {
        const on = pin && pin.d === d && pin.o === oi;
        const sig = o.done ? `${o.sigPositive}+ ${o.sigNegative}−` : '';
        parts.push(`<li class="option-row" tabindex="0" role="button" aria-pressed="${on}" data-d="${d}" data-o="${oi}" title="${o.paths} paths">`
          + `<span class="opt-label">${esc(o.label)}</span><span class="opt-r">r ${fmtR(o.medianR)}</span><span class="opt-sig">${sig}</span></li>`);
      });
      parts.push('</ul></div>');
    });
    // Keep keyboard focus on the same row across re-renders.
    const active = document.activeElement?.closest?.('.option-row');
    const key = active && container.contains(active) ? `${active.dataset.d}:${active.dataset.o}` : null;
    container.innerHTML = parts.join('');
    if (key) {
      const [d, o] = key.split(':');
      container.querySelector(`.option-row[data-d="${d}"][data-o="${o}"]`)?.focus({ preventScroll: true });
    }
  }

  return { render };
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
