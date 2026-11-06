// src/verse-ui/labels.js
// Display text shared by the scatterverse panels.

const RULE_NAMES = { z: 'z-score', mad: 'MAD', mahalanobis: 'Mahalanobis', cooks: "Cook's D" };

export function dimName(dim) {
  switch (dim.kind) {
    case 'outcome': return 'Outcome';
    case 'predictor': return 'Predictor';
    case 'exclude':
      return dim.fork.label ?? (dim.fork.rows ? 'Hand-excluded rows' : `Exclude by ${dim.fork.column}`);
    case 'covariates': return dim.fork.label ?? 'Covariates';
    case 'outlier': return dim.fork.label ?? `Outliers: ${RULE_NAMES[dim.fork.rule]}`;
    case 'model': return 'Model';
    default: return dim.kind;
  }
}

export function fmtR(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
}

export function fmtP(p) {
  if (p == null || !Number.isFinite(p)) return '—';
  if (p < 0.001) return '< .001';
  return p.toFixed(3).replace(/^0/, '');
}

export function fmtPct(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${Math.round(v * 100)}%`;
}
