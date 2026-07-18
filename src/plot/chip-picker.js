// src/plot/chip-picker.js
// Multi-select "chips + typeahead" picker: selected values render as removable
// chips, and a text input filters a dropdown of the remaining options. Scales
// to datasets with hundreds of columns where a checkbox list would not.
//
// Framework-free. Options may be marked "inert" (e.g. a column currently in
// use as X or Y): inert options are shown disabled in the dropdown, and an
// inert selected value renders as a dimmed chip with a badge — it stays
// selected but the caller is expected not to apply it.

export function createChipPicker({ container, inputId, placeholder = 'Add…',
                                    searchLabel = 'Search options', onChange }) {
  let options  = [];          // [{ value, label }]
  let selected = [];          // values, in selection order
  let inert    = new Map();   // value → { badge, title }
  let enabled  = true;
  let open     = false;
  let highlightValue = null;  // value of the highlighted dropdown item

  container.classList.add('chip-picker');

  const box = document.createElement('div');
  box.className = 'chip-picker-box';

  const chipsEl = document.createElement('span');
  chipsEl.className = 'chip-picker-chips';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'chip-picker-input';
  input.id = inputId;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-label', searchLabel);
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', `${inputId}-menu`);

  const menu = document.createElement('ul');
  menu.className = 'chip-picker-menu';
  menu.id = `${inputId}-menu`;
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;

  box.appendChild(chipsEl);
  box.appendChild(input);
  container.appendChild(box);
  container.appendChild(menu);

  const optionByValue = v => options.find(o => o.value === v);

  // Dropdown candidates: unselected options whose label matches the filter.
  function filteredOptions() {
    const q = input.value.trim().toLowerCase();
    const chosen = new Set(selected);
    return options.filter(o => !chosen.has(o.value)
      && (!q || o.label.toLowerCase().includes(q)));
  }

  function renderChips() {
    chipsEl.innerHTML = '';
    selected.forEach(v => {
      const opt = optionByValue(v);
      if (!opt) return;
      const info = inert.get(v);
      const chip = document.createElement('span');
      chip.className = 'chip' + (info ? ' chip-inert' : '');
      if (info?.title) chip.title = info.title;
      chip.appendChild(document.createTextNode(opt.label));
      if (info?.badge) {
        const badge = document.createElement('span');
        badge.className = 'chip-badge';
        badge.textContent = info.badge;
        chip.appendChild(badge);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-remove';
      btn.textContent = '×';
      btn.setAttribute('aria-label', `Remove ${opt.label}`);
      btn.disabled = !enabled;
      btn.addEventListener('click', () => remove(v));
      chip.appendChild(btn);
      chipsEl.appendChild(chip);
    });
  }

  function renderMenu() {
    menu.innerHTML = '';
    if (!open) { menu.hidden = true; setActiveDescendant(null); return; }

    const items = filteredOptions();
    const selectable = items.filter(o => !inert.has(o.value));
    if (highlightValue == null || !selectable.some(o => o.value === highlightValue)) {
      highlightValue = selectable[0]?.value ?? null;
    }

    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'chip-picker-empty';
      li.textContent = 'No matching columns';
      menu.appendChild(li);
    }
    items.forEach(o => {
      const li = document.createElement('li');
      const info = inert.get(o.value);
      li.id = `${inputId}-opt-${o.value}`;
      li.setAttribute('role', 'option');
      li.textContent = o.label;
      if (info) {
        li.classList.add('chip-picker-disabled');
        li.setAttribute('aria-disabled', 'true');
        if (info.badge) {
          const badge = document.createElement('span');
          badge.className = 'chip-badge';
          badge.textContent = info.badge;
          li.appendChild(badge);
        }
        if (info.title) li.title = info.title;
      } else {
        if (o.value === highlightValue) li.classList.add('chip-picker-highlight');
        li.setAttribute('aria-selected', 'false');
        // mousedown, not click: keep focus in the input while adding
        li.addEventListener('mousedown', e => { e.preventDefault(); add(o.value); });
        li.addEventListener('mousemove', () => {
          if (highlightValue !== o.value) { highlightValue = o.value; renderMenu(); }
        });
      }
      menu.appendChild(li);
    });

    menu.hidden = false;
    setActiveDescendant(highlightValue != null ? `${inputId}-opt-${highlightValue}` : null);
  }

  function setActiveDescendant(id) {
    input.setAttribute('aria-expanded', String(open));
    if (id) input.setAttribute('aria-activedescendant', id);
    else input.removeAttribute('aria-activedescendant');
  }

  function setOpen(next) {
    if (open === next) return;
    open = next;
    if (!open) highlightValue = null;
    renderMenu();
  }

  function add(value) {
    if (!enabled || selected.includes(value) || inert.has(value)) return;
    selected = [...selected, value];
    input.value = '';
    renderChips();
    renderMenu();
    onChange([...selected]);
  }

  function remove(value) {
    if (!enabled || !selected.includes(value)) return;
    selected = selected.filter(v => v !== value);
    renderChips();
    renderMenu();
    onChange([...selected]);
  }

  // Move the keyboard highlight over selectable (non-inert) items.
  function moveHighlight(delta) {
    const selectable = filteredOptions().filter(o => !inert.has(o.value));
    if (!selectable.length) return;
    const idx = selectable.findIndex(o => o.value === highlightValue);
    const next = idx < 0 ? (delta > 0 ? 0 : selectable.length - 1)
      : Math.min(Math.max(idx + delta, 0), selectable.length - 1);
    highlightValue = selectable[next].value;
    renderMenu();
  }

  input.addEventListener('focus', () => setOpen(true));
  input.addEventListener('click', () => setOpen(true));
  input.addEventListener('input', () => { highlightValue = null; setOpen(true); renderMenu(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      else moveHighlight(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlightValue != null) add(highlightValue);
    } else if (e.key === 'Escape') {
      if (open) { e.stopPropagation(); setOpen(false); }
    } else if (e.key === 'Backspace' && input.value === '' && selected.length) {
      remove(selected[selected.length - 1]);
    }
  });
  input.addEventListener('blur', () => setOpen(false));

  // Keep focus in the input when interacting with the menu chrome (scrollbar).
  menu.addEventListener('mousedown', e => e.preventDefault());

  // Clicking the box (chips padding area) focuses the input.
  box.addEventListener('mousedown', e => {
    if (e.target === box || e.target === chipsEl) {
      e.preventDefault();
      if (enabled) input.focus();
    }
  });

  return {
    // Full sync; safe to call on every state change — the input element (and
    // its focus / typed filter) persists across updates.
    update({ options: opts, selected: sel, inert: inertMap, enabled: en }) {
      if (opts) options = opts;
      if (sel) selected = sel.filter(v => optionByValue(v));
      if (inertMap) inert = inertMap;
      if (en != null && en !== enabled) {
        enabled = en;
        input.disabled = !enabled;
        box.classList.toggle('chip-picker-off', !enabled);
        if (!enabled) setOpen(false);
      }
      renderChips();
      renderMenu();
    },
    optionCount: () => options.length,
  };
}
