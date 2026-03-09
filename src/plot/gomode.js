// Go mode: keyboard navigation through active scatter plot points.
// Manages sorted point lists for X, Y, and QQ criteria and the toolbar UI.

export function createGoMode(toolbarEl, { onSelect } = {}) {
  let _byX = [], _byY = [], _byQQ = [];
  let _position = null;   // 0-based index into current criterion's sorted array; null = no selection
  let _criterion = 'x';  // 'x' | 'y' | 'qq'
  let _hasQQ = false;
  let _pendingRowIndex = null;  // row index to select on next update (e.g. after uncensoring)

  const _indexInput = toolbarEl.querySelector('#go-index');
  const _totalEl    = toolbarEl.querySelector('#go-total');
  const _pctInput   = toolbarEl.querySelector('#go-pct');
  const _critBtns   = toolbarEl.querySelectorAll('[data-crit]');
  const _qqBtn      = toolbarEl.querySelector('[data-crit="qq"]');

  function _sorted() {
    return _criterion === 'y' ? _byY : _criterion === 'qq' ? _byQQ : _byX;
  }

  // Fewest decimal places needed to uniquely display each percentile step.
  function _pctDecimals(n) {
    if (n <= 2) return 0;
    return Math.max(0, Math.ceil(Math.log10(n - 1) - 2));
  }

  function _percentileAt(pos) {
    const n = _sorted().length;
    if (n <= 1) return 0;
    return (pos / (n - 1)) * 100;
  }

  function _posAtPct(pct) {
    const n = _sorted().length;
    if (n <= 1) return 0;
    return Math.max(0, Math.min(n - 1, Math.round((pct / 100) * (n - 1))));
  }

  function _rowIndexAt(pos) {
    const pts = _sorted();
    return (pos != null && pos >= 0 && pos < pts.length) ? pts[pos].rowIndex : null;
  }

  function _findPos(rowIndex) {
    if (rowIndex == null) return -1;
    return _sorted().findIndex(p => p.rowIndex === rowIndex);
  }

  function _syncDisplay() {
    const pts = _sorted();
    const n   = pts.length;
    _totalEl.textContent = n > 0 ? String(n) : '—';
    if (_position == null || n === 0) {
      _indexInput.value = '';
      _pctInput.value   = '';
    } else {
      _indexInput.value = _position + 1;  // 1-based
      _pctInput.value   = _percentileAt(_position).toFixed(_pctDecimals(n));
    }
  }

  function _setPosition(pos, notify = true) {
    const n = _sorted().length;
    if (n === 0) { _position = null; _syncDisplay(); return; }
    _position = Math.max(0, Math.min(n - 1, pos));
    _syncDisplay();
    if (notify) onSelect?.(_rowIndexAt(_position));
  }

  function _updateCritBtns() {
    if (!_hasQQ && _criterion === 'qq') _criterion = 'x';
    _critBtns.forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.crit === _criterion));
    });
    _qqBtn.disabled = !_hasQQ;
  }

  // Criterion button clicks
  _critBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled || btn.dataset.crit === _criterion) return;
      const prevRowIndex = _rowIndexAt(_position);
      _criterion = btn.dataset.crit;
      _updateCritBtns();
      if (prevRowIndex != null) {
        const p = _findPos(prevRowIndex);
        if (p >= 0) _position = p;
      }
      _syncDisplay();
      onSelect?.(_rowIndexAt(_position));
    });
  });

  // Index input (1-based; confirms on change/Enter)
  _indexInput.addEventListener('change', () => {
    const v = parseInt(_indexInput.value, 10);
    if (!isNaN(v)) _setPosition(v - 1);
  });
  _indexInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); _indexInput.blur(); }
  });

  // Percentile input (confirms on change/Enter)
  _pctInput.addEventListener('change', () => {
    const v = parseFloat(_pctInput.value);
    if (!isNaN(v)) _setPosition(_posAtPct(Math.max(0, Math.min(100, v))));
  });
  _pctInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); _pctInput.blur(); }
  });

  return {
    /** Call after each render with fresh point data. */
    update({ activePoints, residuals, hasQQ }) {
      _hasQQ = hasQQ && !!(residuals?.length);
      const prevRowIndex = _rowIndexAt(_position);

      _byX = [...activePoints].sort((a, b) =>
        a.xVal - b.xVal || a.yVal - b.yVal || a.rowIndex - b.rowIndex);
      _byY = [...activePoints].sort((a, b) =>
        a.yVal - b.yVal || a.xVal - b.xVal || a.rowIndex - b.rowIndex);
      if (_hasQQ && residuals) {
        const residMap = new Map(activePoints.map((p, i) => [p.rowIndex, residuals[i]]));
        _byQQ = [...activePoints].sort((a, b) =>
          residMap.get(a.rowIndex) - residMap.get(b.rowIndex) || a.rowIndex - b.rowIndex);
      } else {
        _byQQ = [];
      }

      _updateCritBtns();

      // If a pending selection was requested (e.g. after uncensoring), use it.
      const targetRow = _pendingRowIndex ?? prevRowIndex;
      _pendingRowIndex = null;

      // Restore position for the target row; if it was removed (censored),
      // clamp to the nearest valid position in the new sorted order.
      if (targetRow != null) {
        const newPos = _findPos(targetRow);
        if (newPos >= 0) {
          _position = newPos;
        } else {
          _position = Math.min(_position ?? 0, _sorted().length - 1);
          if (_position < 0) _position = null;
        }
      } else if (_sorted().length === 0) {
        _position = null;
      }
      _syncDisplay();
      // Re-fire onSelect so the visual highlight stays in sync after data changes.
      if (_position != null) onSelect?.(_rowIndexAt(_position));
    },

    /** Move by delta points (±1 for single step). Bounded, no wrap. */
    step(delta) {
      const n = _sorted().length;
      if (!n) return;
      // If no selection, first rightward step starts at 0; leftward starts at n-1.
      const start = _position ?? (delta > 0 ? -1 : n);
      _setPosition(start + delta);
    },

    /** Move by approximately deltaPercent percentile units. */
    stepByPercentile(deltaPercent) {
      const n = _sorted().length;
      if (!n) return;
      const currentPct = _position != null
        ? _percentileAt(_position)
        : (deltaPercent > 0 ? 0 : 100);
      _setPosition(_posAtPct(currentPct + deltaPercent));
    },

    /** Jump to first or last point. */
    jumpToEnd(end) {
      const n = _sorted().length;
      if (!n) return;
      _setPosition(end === 'last' ? n - 1 : 0);
    },

    /** Currently selected row index, or null if no selection. */
    getRowIndex() {
      return _rowIndexAt(_position);
    },

    /** Cycle the criterion by delta (+1 forward, -1 backward), skipping unavailable ones. */
    cycleCriterion(delta) {
      const available = ['x', 'y', ...(_hasQQ ? ['qq'] : [])];
      const idx = available.indexOf(_criterion);
      const next = available[(idx + delta + available.length) % available.length];
      if (next === _criterion) return;
      const prevRowIndex = _rowIndexAt(_position);
      _criterion = next;
      _updateCritBtns();
      if (prevRowIndex != null) {
        const p = _findPos(prevRowIndex);
        if (p >= 0) _position = p;
      }
      _syncDisplay();
      onSelect?.(_rowIndexAt(_position));
    },

    /** Select a specific row index, either immediately or on the next update
     *  (e.g. after uncensoring, the point re-enters the active set on re-render). */
    selectRowIndex(rowIndex) {
      const pos = _findPos(rowIndex);
      if (pos >= 0) {
        _setPosition(pos);
      } else {
        _pendingRowIndex = rowIndex;
      }
    },

    /** Clear selection (e.g. when data is unloaded). */
    reset() {
      _position = null;
      _syncDisplay();
    },
  };
}
