// src/verse/summary.js
// Curve-level numbers: the observed spec-curve statistics, their forced-null
// bootstrap p-values, and per-fork summaries ("which choice matters").
//
// Significance is |z| > 1.96, with z the signed normal equivalent of each
// path's two-sided p (OLS: from t; M: the robust t itself). That is p < .05,
// and the same rule applies to observed paths and bootstrap draws.

import { Z95 } from '../stats/common.js';

function median(values) {
  const a = Float64Array.from(values).sort();
  const m = a.length;
  if (!m) return null;
  return m % 2 ? a[(m - 1) / 2] : (a[m / 2 - 1] + a[m / 2]) / 2;
}

// Statistics of one curve. r, z: partial r and signed z per path (NaN entries
// are skipped). Returns { k, medianR, positive, sigPositive, sigNegative,
// stouffer } where stouffer = Σz / √k.
export function curveStats(r, z) {
  const rs = [];
  let k = 0, positive = 0, sigPositive = 0, sigNegative = 0, sumZ = 0;
  for (let i = 0; i < r.length; i++) {
    if (!Number.isFinite(r[i]) || !Number.isFinite(z[i])) continue;
    k++;
    rs.push(r[i]);
    if (r[i] > 0) positive++;
    if (z[i] > Z95) sigPositive++;
    else if (z[i] < -Z95) sigNegative++;
    sumZ += z[i];
  }
  return {
    k,
    medianR: median(rs),
    positive,
    sigPositive,
    sigNegative,
    stouffer: k ? sumZ / Math.sqrt(k) : null,
  };
}

// Observed curve statistics oriented for one-sided tests, as Simonsohn et al.
// do: the median and Stouffer's Z in their own observed direction, and the
// share of significant paths in the dominant direction (the sign with more
// significant paths; ties go to the median's sign).
export function orientedStats(stats) {
  const medianSign = Math.sign(stats.medianR ?? 0) || 1;
  const dominant = stats.sigPositive === stats.sigNegative
    ? medianSign
    : (stats.sigPositive > stats.sigNegative ? 1 : -1);
  const zSign = Math.sign(stats.stouffer ?? 0) || 1;
  return {
    medianSign, dominant, zSign,
    median: medianSign * (stats.medianR ?? 0),
    shareSig: stats.k ? (dominant > 0 ? stats.sigPositive : stats.sigNegative) / stats.k : 0,
    stouffer: zSign * (stats.stouffer ?? 0),
  };
}

// Forced-null bootstrap p-values.
// observed: curveStats of the observed paths.
// drawR, drawZ: Float32Arrays, path-major (index pathIndex·draws + d), with
// paths in the same order as the observed arrays.
// Returns { draws, observed: orientedStats, p: { median, shareSig, stouffer } }
// where each p is the share of usable draws at least as extreme as observed,
// in the observed direction.
export function bootstrapPValues(observed, drawR, drawZ, paths, draws) {
  const o = orientedStats(observed);
  const r = new Float64Array(paths);
  const z = new Float64Array(paths);
  let used = 0, nMedian = 0, nShare = 0, nZ = 0;
  for (let d = 0; d < draws; d++) {
    for (let i = 0; i < paths; i++) { r[i] = drawR[i * draws + d]; z[i] = drawZ[i * draws + d]; }
    const s = curveStats(r, z);
    if (!s.k) continue;
    used++;
    if (o.medianSign * s.medianR >= o.median) nMedian++;
    const sig = o.dominant > 0 ? s.sigPositive : s.sigNegative;
    if (sig / s.k >= o.shareSig) nShare++;
    if (o.zSign * s.stouffer >= o.stouffer) nZ++;
  }
  return {
    draws: used,
    observed: o,
    p: used ? { median: nMedian / used, shareSig: nShare / used, stouffer: nZ / used } : null,
  };
}

// Per-fork summaries. dims: spec.dimensions(); paths: [{ choices }]; results:
// parallel array of path results (null while pending). For each dimension:
//   { kind, options: [{ label, paths, share, done, medianR, sigPositive,
//     sigNegative }], etaSquared }
// share is the option's share of all paths: pooled numbers weight options by
// it, so a fork with nine thresholds and "none" leans 90% toward excluding.
// etaSquared is the share of variance in partial r (over finished paths)
// explained by the fork's options; null with fewer than two usable groups.
export function forkSummaries(dims, paths, results) {
  return dims.map((dim, d) => {
    const groups = dim.options.map(o => ({ label: o.label, paths: 0, rs: [], zs: [] }));
    for (let i = 0; i < paths.length; i++) {
      const g = groups[paths[i].choices[d]];
      g.paths++;
      const res = results[i];
      if (res?.ok && Number.isFinite(res.partialR)) { g.rs.push(res.partialR); g.zs.push(res.z); }
    }
    let all = 0, sum = 0, used = 0;
    for (const g of groups) { for (const v of g.rs) sum += v; all += g.rs.length; if (g.rs.length) used++; }
    const grand = all ? sum / all : 0;
    let ssTotal = 0, ssBetween = 0;
    for (const g of groups) {
      if (!g.rs.length) continue;
      let gs = 0;
      for (const v of g.rs) { gs += v; ssTotal += (v - grand) ** 2; }
      ssBetween += g.rs.length * (gs / g.rs.length - grand) ** 2;
    }
    return {
      kind: dim.kind,
      options: groups.map(g => ({
        label: g.label,
        paths: g.paths,
        share: paths.length ? g.paths / paths.length : 0,
        done: g.rs.length,
        medianR: median(g.rs),
        sigPositive: g.zs.filter(v => v > Z95).length,
        sigNegative: g.zs.filter(v => v < -Z95).length,
      })),
      etaSquared: used >= 2 && ssTotal > 0 ? ssBetween / ssTotal : null,
    };
  });
}
