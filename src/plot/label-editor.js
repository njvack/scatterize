// src/plot/label-editor.js
// A single reusable popover text input for naming a point. Opened from either
// the keyboard/go-mode path or a pointer gesture (right-click / shift-click),
// so mouse, keyboard, and screen-reader users share one accessible editor.
//
// Focus discipline: focus moves into the input on open and returns to the
// previously focused element on close. Enter or blur commits; Escape cancels.

// createLabelEditor(rootEl, inputEl, { maxLen })
//   rootEl  — the positioned popover container (absolutely positioned within
//             a `position: relative` ancestor, e.g. #plot-area)
//   inputEl — the <input> inside rootEl
export function createLabelEditor(rootEl, inputEl, { maxLen = 40 } = {}) {
  let _onCommit = null;      // callback(text) for the current open session
  let _restoreFocus = null;  // element to refocus on close
  let _committing = false;   // guards blur-commit against Enter/Escape double-fire
  let _open = false;

  if (inputEl && maxLen) inputEl.setAttribute('maxlength', String(maxLen));

  function close({ restoreFocus = true } = {}) {
    if (!_open) return;
    _open = false;
    rootEl.hidden = true;
    const target = _restoreFocus;
    _onCommit = null;
    _restoreFocus = null;
    // Return focus so keyboard users aren't dropped at the top of the document.
    if (restoreFocus && target && typeof target.focus === 'function') {
      target.focus();
    }
  }

  function commit() {
    if (!_open || _committing) return;
    _committing = true;
    const cb = _onCommit;
    const text = inputEl.value.trim().slice(0, maxLen);
    close();
    cb?.(text);
    _committing = false;
  }

  function cancel() {
    if (!_open) return;
    close();
  }

  // Position the popover near an anchor point, clamped inside the plot area.
  function position(anchor) {
    if (!anchor) return;
    // Measure after making visible so offsetWidth/Height are real.
    const parent = rootEl.offsetParent ?? rootEl.parentElement;
    const pw = parent?.clientWidth  ?? Infinity;
    const ph = parent?.clientHeight ?? Infinity;
    const w = rootEl.offsetWidth  || 160;
    const h = rootEl.offsetHeight || 32;
    const GAP = 10;
    // Prefer up-right of the point; flip when it would overflow.
    let left = anchor.x + GAP;
    let top  = anchor.y - h - GAP;
    if (left + w > pw) left = anchor.x - w - GAP;
    if (top < 0)       top  = anchor.y + GAP;
    left = Math.max(4, Math.min(left, pw - w - 4));
    top  = Math.max(4, Math.min(top,  ph - h - 4));
    rootEl.style.left = `${left}px`;
    rootEl.style.top  = `${top}px`;
  }

  inputEl?.addEventListener('keydown', e => {
    // Keep plot-level shortcuts from firing while typing.
    e.stopPropagation();
    if (e.key === 'Enter')       { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  // Commit on blur (click elsewhere) unless we're already closing via key.
  inputEl?.addEventListener('blur', () => { if (_open) commit(); });

  return {
    /** open({ anchor: {x,y}, value, onCommit }) — show editor focused on the input. */
    open({ anchor = null, value = '', onCommit } = {}) {
      _onCommit = onCommit;
      _restoreFocus = document.activeElement;
      _open = true;
      rootEl.hidden = false;
      inputEl.value = value ?? '';
      position(anchor);
      inputEl.focus();
      inputEl.select();
    },
    close: () => close(),
    isOpen: () => _open,
  };
}
