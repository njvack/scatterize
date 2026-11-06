// src/verse/spec.js
// Scatterverse specification: the forks in the garden of analysis paths, how
// to enumerate every path, and the evaluation plan for a single path.
//
// A spec is plain data (so it can live in the URL):
//
//   {
//     outcomes:   ['wellbeing', 'anxiety'],   // pinned fork: y
//     predictors: ['screen_time'],            // pinned fork: x
//     always:     ['age'],                    // covariates in every path (specr add_to_formula)
//     forks: [                                // ordered, in the order the user added them
//       { kind: 'exclude', column: 'failed_check' },                 // options: apply, ignore
//       { kind: 'exclude', rows: [4, 17], label: 'hand-excluded' },  // from scatterplot censoring
//       { kind: 'covariates', mode: 'all', columns: ['sex', 'ses'] },
//       { kind: 'outlier', rule: 'z', thresholds: [2.5, 3], none: true, on: 'xy' },
//       { kind: 'outlier', rule: 'cooks', thresholds: [4], perN: true },
//       { kind: 'model', estimators: ['ols', 'm'] },
//     ],
//   }
//
// Columns are referenced by name. Forks may carry an `id` (for UI bookkeeping)
// and a `label`; neither affects results.
//
// Covariate block modes, after specr's setup():
//   'all'      every subset, including none: 2^k options (specr simplify = FALSE)
//   'simplify' none, each one alone, all together: k + 2 options (simplify = TRUE)
//   'nested'   none, then adding each covariate cumulatively in listed order: k + 1
//
// Outlier rules: 'z' (|z| > t), 'mad' (robust z > t), 'mahalanobis' (squared
// distance > t), 'cooks' (Cook's D > t, or t / n with perN). `on` picks the
// columns a raw rule looks at: 'xy' (default: the path's outcome and
// predictor) or 'model' (those plus the covariates chosen above the rule).
//
// Choosing paths is a Cartesian product, but each path evaluates top to bottom
// (see planPath): rows missing any variable the path uses drop first, then the
// forks apply in order. An outlier rule sees only rows left by the forks above
// it, and Cook's D fits the covariates and estimator chosen above it (OLS with
// no covariates if none). The final fit uses all of the path's covariates and
// its estimator (the last model fork's choice; OLS when there is none).
//
// A column in use as the path's x or y is dropped from its covariates (#39).
// Paths with x = y are skipped, and so are paths whose evaluation plan is
// identical to an earlier path's (e.g. the subset {x} collapses onto {}); the
// first path in enumeration order represents them.
//
// No DOM access; runs unchanged in a Web Worker.

export const FORK_KINDS = ['exclude', 'covariates', 'outlier', 'model'];
export const COVARIATE_MODES = ['all', 'simplify', 'nested'];
export const OUTLIER_RULES = ['z', 'mad', 'mahalanobis', 'cooks'];
export const ESTIMATORS = ['ols', 'm'];

// Above this many raw paths, enumeratePaths refuses (the caller should warn
// with countPaths before getting here).
export const MAX_PATHS = 250000;

export class SpecError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SpecError';
  }
}

const uniq = arr => [...new Set(arr)];
const isName = v => typeof v === 'string' && v.length > 0;

function nameList(v, what) {
  if (v == null) return [];
  if (!Array.isArray(v) || !v.every(isName)) throw new SpecError(`${what} must be a list of column names`);
  return uniq(v);
}

function numberList(v, what) {
  if (!Array.isArray(v) || !v.every(t => typeof t === 'number' && Number.isFinite(t))) {
    throw new SpecError(`${what} must be a list of numbers`);
  }
  return uniq(v);
}

function normalizeFork(f, i) {
  if (!f || typeof f !== 'object') throw new SpecError(`fork ${i + 1} is not an object`);
  const base = {};
  if (f.id != null) base.id = String(f.id);
  if (f.label != null) base.label = String(f.label);
  switch (f.kind) {
    case 'exclude': {
      if (f.rows != null) {
        if (!Array.isArray(f.rows) || !f.rows.every(r => Number.isInteger(r) && r >= 0)) {
          throw new SpecError(`fork ${i + 1}: rows must be row indices`);
        }
        return { ...base, kind: 'exclude', rows: uniq(f.rows).sort((a, b) => a - b) };
      }
      if (!isName(f.column)) throw new SpecError(`fork ${i + 1}: exclusion needs a column`);
      return { ...base, kind: 'exclude', column: f.column };
    }
    case 'covariates': {
      const mode = f.mode ?? 'all';
      if (!COVARIATE_MODES.includes(mode)) throw new SpecError(`fork ${i + 1}: unknown covariate mode ${mode}`);
      const columns = nameList(f.columns, `fork ${i + 1} columns`);
      if (!columns.length) throw new SpecError(`fork ${i + 1}: covariate block has no columns`);
      return { ...base, kind: 'covariates', mode, columns };
    }
    case 'outlier': {
      if (!OUTLIER_RULES.includes(f.rule)) throw new SpecError(`fork ${i + 1}: unknown outlier rule ${f.rule}`);
      const thresholds = numberList(f.thresholds ?? [], `fork ${i + 1} thresholds`);
      const none = f.none ?? true;
      if (!thresholds.length && !none) throw new SpecError(`fork ${i + 1}: outlier fork has no options`);
      const out = { ...base, kind: 'outlier', rule: f.rule, thresholds, none: !!none };
      if (f.rule === 'cooks') out.perN = !!f.perN;
      else out.on = f.on === 'model' ? 'model' : 'xy';
      return out;
    }
    case 'model': {
      const estimators = uniq(f.estimators ?? []);
      if (!estimators.length || !estimators.every(e => ESTIMATORS.includes(e))) {
        throw new SpecError(`fork ${i + 1}: estimators must be some of ${ESTIMATORS.join(', ')}`);
      }
      return { ...base, kind: 'model', estimators };
    }
    default:
      throw new SpecError(`fork ${i + 1}: unknown kind ${f.kind}`);
  }
}

// Validate and canonicalize a spec. Throws SpecError.
export function normalizeSpec(raw) {
  if (!raw || typeof raw !== 'object') throw new SpecError('spec must be an object');
  const outcomes = nameList(raw.outcomes, 'outcomes');
  const predictors = nameList(raw.predictors, 'predictors');
  if (!outcomes.length) throw new SpecError('spec needs at least one outcome');
  if (!predictors.length) throw new SpecError('spec needs at least one predictor');
  const forks = (raw.forks ?? []).map(normalizeFork);
  return { outcomes, predictors, always: nameList(raw.always, 'always'), forks };
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

function covariateSubsets(mode, cols) {
  const k = cols.length;
  if (mode === 'simplify') {
    const out = [[], ...cols.map(c => [c])];
    if (k > 1) out.push([...cols]);
    return out;
  }
  if (mode === 'nested') {
    return Array.from({ length: k + 1 }, (_, i) => cols.slice(0, i));
  }
  // All subsets, by size, then in listed order within a size.
  const out = [];
  const pick = (start, size, acc) => {
    if (acc.length === size) { out.push([...acc]); return; }
    for (let i = start; i < k; i++) { acc.push(cols[i]); pick(i + 1, size, acc); acc.pop(); }
  };
  for (let size = 0; size <= k; size++) pick(0, size, []);
  return out;
}

const RULE_LABEL = {
  z: t => `|z| > ${t}`,
  mad: t => `MAD > ${t}`,
  mahalanobis: t => `D² > ${t}`,
  cooks: (t, perN) => `Cook's D > ${perN ? `${t}/n` : t}`,
};

// The options of one fork, in display order: [{ label, value }].
//   exclude    value: true (apply) | false (ignore)
//   covariates value: array of column names
//   outlier    value: threshold | null (none)
//   model      value: estimator name
export function forkOptions(fork) {
  switch (fork.kind) {
    case 'outcome':
    case 'predictor':
      return fork.columns.map(c => ({ label: c, value: c }));
    case 'exclude':
      return [{ label: 'apply', value: true }, { label: 'ignore', value: false }];
    case 'covariates':
      return covariateSubsets(fork.mode, fork.columns)
        .map(s => ({ label: s.length ? s.join(' + ') : 'none', value: s }));
    case 'outlier': {
      const opts = fork.none ? [{ label: 'none', value: null }] : [];
      for (const t of fork.thresholds) opts.push({ label: RULE_LABEL[fork.rule](t, fork.perN), value: t });
      return opts;
    }
    case 'model':
      return fork.estimators.map(e => ({ label: e === 'm' ? 'robust (M)' : 'OLS', value: e }));
    default:
      throw new SpecError(`unknown fork kind ${fork.kind}`);
  }
}

// Every dimension of the path grid, in order: outcome, predictor, then the
// forks. Each is { kind, fork, options }; the pinned two have fork = null.
export function dimensions(spec) {
  return [
    { kind: 'outcome', fork: null, options: forkOptions({ kind: 'outcome', columns: spec.outcomes }) },
    { kind: 'predictor', fork: null, options: forkOptions({ kind: 'predictor', columns: spec.predictors }) },
    ...spec.forks.map(fork => ({ kind: fork.kind, fork, options: forkOptions(fork) })),
  ];
}

// Raw path count (the size of the Cartesian product), before skipping x = y
// and duplicate paths. Cheap: no enumeration.
export function countPaths(spec) {
  return dimensions(spec).reduce((p, d) => p * d.options.length, 1);
}

// Option indices of path number `index` (mixed radix, last dimension fastest).
export function choicesAt(dims, index) {
  const choices = new Array(dims.length);
  for (let d = dims.length - 1; d >= 0; d--) {
    const m = dims[d].options.length;
    choices[d] = index % m;
    index = Math.floor(index / m);
  }
  return choices;
}

// ---------------------------------------------------------------------------
// Path plans
// ---------------------------------------------------------------------------

// 32-bit FNV-1a of a list of integers, as base-36 text. Keeps hand-excluded
// row lists out of path keys.
function hashInts(arr) {
  let h = 0x811c9dc5;
  for (const v of arr) {
    let x = v | 0;
    for (let b = 0; b < 4; b++) { h ^= x & 0xff; h = Math.imul(h, 0x01000193); x >>>= 8; }
  }
  return (h >>> 0).toString(36);
}

// The evaluation plan for one path, or null when the path is impossible
// (x = y). choices: option index per dimension (see dimensions()).
//
// Plan: {
//   y, x, covariates,        final model columns (covariates in spec order)
//   estimator,               'ols' | 'm'
//   missing,                 columns whose missing values drop a row (first)
//   steps,                   filter steps for stats/filters.js, in fork order;
//                            a 'cooks' step carries its model as step.model
//   key,                     canonical text: equal keys ⇔ identical results
//   rowKeys,                 [missing key, ...one key per step]: the row set
//                            after step i depends only on rowKeys[0..i]
// }
export function planPath(spec, choices, dims = dimensions(spec)) {
  const y = dims[0].options[choices[0]].value;
  const x = dims[1].options[choices[1]].value;
  if (x === y) return null;
  const notXY = c => c !== x && c !== y;

  const covAbove = spec.always.filter(notXY);
  let estAbove = 'ols';
  let estimator = 'ols';
  const steps = [];
  const keySteps = [];

  for (let d = 2; d < dims.length; d++) {
    const fork = dims[d].fork;
    const value = dims[d].options[choices[d]].value;
    switch (fork.kind) {
      case 'exclude':
        if (!value) break;
        if (fork.rows) {
          steps.push({ type: 'rows', rows: fork.rows });
          keySteps.push(['rows', hashInts(fork.rows), fork.rows.length]);
        } else {
          steps.push({ type: 'exclude', column: fork.column });
          keySteps.push(['exclude', fork.column]);
        }
        break;
      case 'covariates':
        for (const c of value) if (notXY(c) && !covAbove.includes(c)) covAbove.push(c);
        break;
      case 'model':
        estAbove = estimator = value;
        break;
      case 'outlier': {
        if (value == null) break;
        if (fork.rule === 'cooks') {
          const model = { x, y, nuisance: [...covAbove], estimator: estAbove };
          steps.push({ type: 'cooks', threshold: value, perN: fork.perN, model });
          keySteps.push(['cooks', value, fork.perN, [...covAbove].sort(), estAbove]);
        } else {
          const columns = fork.on === 'model' ? [y, x, ...covAbove] : [y, x];
          steps.push({ type: fork.rule, columns, threshold: value });
          // z and MAD flag column by column, so their column order doesn't
          // matter; Mahalanobis is symmetric in its columns too.
          keySteps.push([fork.rule, value, [y, x], [...columns.slice(2)].sort()]);
        }
        break;
      }
    }
  }

  const covariates = covAbove;
  const missing = uniq([y, x, ...covariates]);
  const key = JSON.stringify([y, x, [...covariates].sort(), estimator, keySteps]);
  const rowKeys = [JSON.stringify([...missing].sort()), ...keySteps.map(k => JSON.stringify(k))];
  return { y, x, covariates, estimator, missing, steps, key, rowKeys };
}

// Enumerate every distinct path. Returns { dims, paths, raw, skipped } where
// paths = [{ index, choices, plan }] in enumeration order, raw is the raw
// count, and skipped = { sameXY, duplicate }.
export function enumeratePaths(spec, { maxPaths = MAX_PATHS } = {}) {
  const dims = dimensions(spec);
  const raw = countPaths(spec);
  if (raw > maxPaths) {
    throw new SpecError(`${raw.toLocaleString('en-US')} paths is more than the limit of ${maxPaths.toLocaleString('en-US')}`);
  }
  const seen = new Set();
  const paths = [];
  const skipped = { sameXY: 0, duplicate: 0 };
  for (let index = 0; index < raw; index++) {
    const choices = choicesAt(dims, index);
    const plan = planPath(spec, choices, dims);
    if (!plan) { skipped.sameXY++; continue; }
    if (seen.has(plan.key)) { skipped.duplicate++; continue; }
    seen.add(plan.key);
    paths.push({ index, choices, plan });
  }
  return { dims, paths, raw, skipped };
}

// Column names a spec reads: numeric (model and outlier columns) and flags
// (exclusion columns).
export function specColumns(spec) {
  const numeric = new Set([...spec.outcomes, ...spec.predictors, ...spec.always]);
  const flags = new Set();
  for (const f of spec.forks) {
    if (f.kind === 'covariates') f.columns.forEach(c => numeric.add(c));
    if (f.kind === 'exclude' && f.column) flags.add(f.column);
  }
  return { numeric: [...numeric], flags: [...flags] };
}

// ---------------------------------------------------------------------------
// Bridges from the scatterplot view
// ---------------------------------------------------------------------------

// Scatterverse ignores hand-censored rows. When a scatterplot URL arrives with
// censored rows, the view offers to turn them into this explicit, forkable
// exclusion ("hand-excluded": apply / ignore).
export function handExcludedFork(rows) {
  return normalizeFork({ kind: 'exclude', rows, label: 'hand-excluded' }, 0);
}

// A starting spec from scatterplot state (state.js shape) and the numeric
// column names that its indices refer to. Covariates become "always"; robust
// becomes a model fork with the M estimator (scatterverse has no MM); rank
// models fall back to OLS. Censored rows are returned separately, so the view
// can offer handExcludedFork(censored) instead of applying them silently.
export function specFromScatterState(state, numericNames) {
  const name = i => numericNames[i];
  const x = name(state.x) ?? numericNames[0];
  const y = name(state.y) ?? numericNames[1] ?? numericNames[0];
  const always = (state.n ?? []).map(name).filter(c => c != null && c !== x && c !== y);
  const forks = state.m === 'robust' ? [{ kind: 'model', estimators: ['m'] }] : [];
  return {
    spec: normalizeSpec({ outcomes: [y], predictors: [x], always, forks }),
    censored: [...(state.c ?? [])],
  };
}
