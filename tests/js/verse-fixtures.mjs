// Shared synthetic data and specs for scatterverse tests.
import { mulberry32 } from '../../src/verse/rng.js';

export function syntheticRows(n = 120, seed = 7) {
  const rand = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const rows = Array.from({ length: n }, (_, i) => {
    const c1 = gauss(), c2 = gauss(), x = gauss() + 0.5 * c1;
    return {
      x, x2: x + gauss(),
      y: 0.3 * x + 0.4 * c1 + gauss(),
      y2: 0.1 * x + gauss(),
      c1, c2: i % 17 === 0 ? null : c2, c3: gauss(),
      bot: i % 13 === 0 ? 'yes' : 'no',
      late: i % 7 === 0 ? 1 : 0,
    };
  });
  rows[5].y = 12;     // an outlier for the rules to find
  rows[9].x = -6;     // and a leverage point
  return rows;
}

export const NUMERIC = ['x', 'x2', 'y', 'y2', 'c1', 'c2', 'c3'];
export const FLAGS = ['bot', 'late'];

export const BIG_SPEC = {
  outcomes: ['y', 'y2'],
  predictors: ['x', 'x2'],
  always: ['c3'],
  forks: [
    { kind: 'exclude', column: 'bot' },
    { kind: 'covariates', mode: 'all', columns: ['c1', 'c2', 'y'] },
    { kind: 'outlier', rule: 'z', thresholds: [2.5, 3] },
    { kind: 'model', estimators: ['ols', 'm'] },
    { kind: 'outlier', rule: 'cooks', thresholds: [4], perN: true },
  ],
};

export const SMALL_SPEC = {
  outcomes: ['y'],
  predictors: ['x', 'x2'],
  forks: [
    { kind: 'exclude', column: 'late' },
    { kind: 'covariates', mode: 'simplify', columns: ['c1', 'c2'] },
    { kind: 'outlier', rule: 'mad', thresholds: [3] },
  ],
};
