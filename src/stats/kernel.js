// src/stats/kernel.js
// Typed-array linear algebra kernel shared by OLS and robust regression.
//
// Design matrices are column-major Float64Arrays: element (i, j) of an n×k
// matrix lives at X[j * n + i]. Column 0 is the intercept, column 1 is x, and
// columns 2.. are nuisance covariates. Column-major layout keeps the inner
// loops over rows contiguous, which is where nearly all the time goes.
//
// Fits use Householder QR (the same algorithm as ml-matrix's QrDecomposition
// and JAMA), which avoids squaring the condition number the way normal
// equations do. Cross-product helpers (crossProducts / solveCrossProducts) are
// exposed separately for callers that fit many related models from shared
// sufficient statistics.
//
// No DOM access and no dependencies, so this runs unchanged in a Web Worker.

// A column whose Householder norm falls below this fraction of its original
// norm is treated as linearly dependent on the columns before it.
const RANK_TOL = 1e-10;

export class RankDeficientError extends Error {
  constructor(message = 'Matrix is rank deficient') {
    super(message);
    this.name = 'RankDeficientError';
  }
}

// Build the column-major design [1, x, ...nuisance].
// x: array-like (length n); nuisance: array of array-likes (each length n).
// Returns { X, n, k }.
export function designMatrix(x, nuisance = []) {
  const n = x.length;
  const k = nuisance.length + 2;
  const X = new Float64Array(n * k);
  X.fill(1, 0, n);
  for (let i = 0; i < n; i++) X[n + i] = x[i];
  for (let p = 0; p < nuisance.length; p++) {
    const col = nuisance[p];
    const off = (p + 2) * n;
    for (let i = 0; i < n; i++) X[off + i] = col[i];
  }
  return { X, n, k };
}

// Householder QR of an n×k column-major matrix. X is not modified unless
// inPlace is true (callers that built a scratch copy can skip the extra copy).
// Returns { QR, rdiag, n, k }: Householder vectors below the diagonal, R's
// strict upper triangle above it (R[j][l] = QR[l * n + j] for l > j), and R's
// diagonal in rdiag. Throws RankDeficientError for collinear columns.
export function qrDecompose(X, n, k, inPlace = false) {
  const A = inPlace ? X : X.slice(0, n * k);
  const rdiag = new Float64Array(k);

  // Original column norms. Householder reflections are orthogonal, so a
  // column's full norm never changes; the rank check compares the part left
  // below the diagonal against it.
  const colNorm = new Float64Array(k);
  for (let j = 0; j < k; j++) {
    const off = j * n;
    let s = 0;
    for (let i = 0; i < n; i++) { const a = A[off + i]; s += a * a; }
    colNorm[j] = Math.sqrt(s);
  }

  for (let j = 0; j < k; j++) {
    const off = j * n;
    let nrm = 0;
    for (let i = j; i < n; i++) { const a = A[off + i]; nrm += a * a; }
    nrm = Math.sqrt(nrm);
    if (!(nrm > RANK_TOL * colNorm[j])) throw new RankDeficientError();

    if (A[off + j] < 0) nrm = -nrm;
    const scale = 1 / nrm;
    for (let i = j; i < n; i++) A[off + i] *= scale;
    A[off + j] += 1;
    const pivot = A[off + j];
    for (let l = j + 1; l < k; l++) {
      const offl = l * n;
      let s = 0;
      for (let i = j; i < n; i++) s += A[off + i] * A[offl + i];
      s = -s / pivot;
      for (let i = j; i < n; i++) A[offl + i] += s * A[off + i];
    }
    rdiag[j] = -nrm;
  }
  return { QR: A, rdiag, n, k };
}

// Least-squares coefficients from a QR factorization. y: array-like (length n).
// Returns a Float64Array of length k.
export function qrSolve({ QR, rdiag, n, k }, y) {
  const v = Float64Array.from(y);
  // v ← Qᵀy
  for (let j = 0; j < k; j++) {
    const off = j * n;
    let s = 0;
    for (let i = j; i < n; i++) s += QR[off + i] * v[i];
    s = -s / QR[off + j];
    for (let i = j; i < n; i++) v[i] += s * QR[off + i];
  }
  // Back-substitute R b = (Qᵀy)[0..k)
  const b = new Float64Array(k);
  for (let j = k - 1; j >= 0; j--) {
    let s = v[j];
    for (let l = j + 1; l < k; l++) s -= QR[l * n + j] * b[l];
    b[j] = s / rdiag[j];
  }
  return b;
}

// (XᵀX)⁻¹ from a QR factorization: R⁻¹R⁻ᵀ. Returns a row-major k×k
// Float64Array (symmetric).
export function qrXtXInverse({ QR, rdiag, n, k }) {
  // Rinv: upper triangular, row-major
  const Rinv = new Float64Array(k * k);
  for (let j = k - 1; j >= 0; j--) {
    Rinv[j * k + j] = 1 / rdiag[j];
    for (let c = j + 1; c < k; c++) {
      let s = 0;
      for (let l = j + 1; l <= c; l++) s += QR[l * n + j] * Rinv[l * k + c];
      Rinv[j * k + c] = -s / rdiag[j];
    }
  }
  const inv = new Float64Array(k * k);
  for (let a = 0; a < k; a++) {
    for (let b = a; b < k; b++) {
      let s = 0;
      for (let m = b; m < k; m++) s += Rinv[a * k + m] * Rinv[b * k + m];
      inv[a * k + b] = s;
      inv[b * k + a] = s;
    }
  }
  return inv;
}

// Fitted values X b. Returns a Float64Array of length n.
export function fitted(X, n, k, b) {
  const yHat = new Float64Array(n);
  for (let j = 0; j < k; j++) {
    const bj = b[j];
    if (bj === 0) continue;
    const off = j * n;
    for (let i = 0; i < n; i++) yHat[i] += X[off + i] * bj;
  }
  return yHat;
}

// Residuals y − X b. Returns a Float64Array of length n.
export function residuals(X, n, k, y, b) {
  const r = fitted(X, n, k, b);
  for (let i = 0; i < n; i++) r[i] = y[i] - r[i];
  return r;
}

// Weighted least squares: minimizes Σ wᵢ (yᵢ − xᵢb)² via QR of √W·X.
// w: array-like of non-negative weights (length n). Returns Float64Array b.
export function wlsSolve(X, n, k, y, w) {
  const Xw = new Float64Array(n * k);
  const yw = new Float64Array(n);
  const sw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    sw[i] = Math.sqrt(w[i]);
    yw[i] = y[i] * sw[i];
  }
  for (let j = 0; j < k; j++) {
    const off = j * n;
    for (let i = 0; i < n; i++) Xw[off + i] = X[off + i] * sw[i];
  }
  return qrSolve(qrDecompose(Xw, n, k, true), yw);
}

// ---------------------------------------------------------------------------
// Cross-products (sufficient statistics)
// ---------------------------------------------------------------------------

// Augmented weighted cross-product matrix [X y]ᵀ W [X y], row-major
// (k+1)×(k+1). The last row/column holds Xᵀy and yᵀy. w is optional (null → 1).
// OLS on any subset of the columns only needs the matching sub-block, so one
// pass over the data can serve many related fits.
export function crossProducts(X, n, k, y, w = null) {
  const m = k + 1;
  const C = new Float64Array(m * m);
  const col = j => (j < k ? X.subarray(j * n, (j + 1) * n) : y);
  for (let a = 0; a < m; a++) {
    const ca = col(a);
    for (let b = a; b < m; b++) {
      const cb = col(b);
      let s = 0;
      if (w) for (let i = 0; i < n; i++) s += w[i] * ca[i] * cb[i];
      else   for (let i = 0; i < n; i++) s += ca[i] * cb[i];
      C[a * m + b] = s;
      C[b * m + a] = s;
    }
  }
  return C;
}

// Solve the normal equations for a subset of columns of an augmented
// cross-product matrix C (from crossProducts, dimension m×m with y last).
// cols: indices of the design columns to use (default: all of them).
// Returns { b, inv, ssr }: coefficients, (XᵀX)⁻¹ (row-major, length q²), and
// the residual sum of squares. Uses Cholesky; throws RankDeficientError when
// the sub-block isn't positive definite.
//
// Normal equations square the condition number, so callers should center or
// standardize columns when precision matters; QR fits above don't need that.
export function solveCrossProducts(C, m, cols = null) {
  const idx = cols ?? Array.from({ length: m - 1 }, (_, j) => j);
  const q = idx.length;
  const yi = m - 1;

  // Cholesky: A = L Lᵀ, L row-major lower triangular
  const L = new Float64Array(q * q);
  for (let j = 0; j < q; j++) {
    const ajj = C[idx[j] * m + idx[j]];
    let s = ajj;
    for (let p = 0; p < j; p++) s -= L[j * q + p] * L[j * q + p];
    if (!(s > RANK_TOL * Math.abs(ajj))) throw new RankDeficientError();
    const d = Math.sqrt(s);
    L[j * q + j] = d;
    for (let i = j + 1; i < q; i++) {
      let t = C[idx[i] * m + idx[j]];
      for (let p = 0; p < j; p++) t -= L[i * q + p] * L[j * q + p];
      L[i * q + j] = t / d;
    }
  }

  // Forward/back substitution for b, and Xᵀy · b for the residual SS
  const z = new Float64Array(q);
  for (let i = 0; i < q; i++) {
    let s = C[idx[i] * m + yi];
    for (let p = 0; p < i; p++) s -= L[i * q + p] * z[p];
    z[i] = s / L[i * q + i];
  }
  const b = new Float64Array(q);
  for (let i = q - 1; i >= 0; i--) {
    let s = z[i];
    for (let p = i + 1; p < q; p++) s -= L[p * q + i] * b[p];
    b[i] = s / L[i * q + i];
  }
  let zz = 0;
  for (let i = 0; i < q; i++) zz += z[i] * z[i];
  const ssr = C[yi * m + yi] - zz;

  // (XᵀX)⁻¹ = L⁻ᵀ L⁻¹
  const Linv = new Float64Array(q * q);
  for (let j = 0; j < q; j++) {
    Linv[j * q + j] = 1 / L[j * q + j];
    for (let i = j + 1; i < q; i++) {
      let s = 0;
      for (let p = j; p < i; p++) s += L[i * q + p] * Linv[p * q + j];
      Linv[i * q + j] = -s / L[i * q + i];
    }
  }
  const inv = new Float64Array(q * q);
  for (let a = 0; a < q; a++) {
    for (let c = a; c < q; c++) {
      let s = 0;
      for (let p = c; p < q; p++) s += Linv[p * q + a] * Linv[p * q + c];
      inv[a * q + c] = s;
      inv[c * q + a] = s;
    }
  }
  return { b, inv, ssr };
}
