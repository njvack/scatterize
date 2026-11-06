# Scatterize Design Notes

## What We're Building

A static-site scatter plot explorer for researchers, replacing a Flask/Python app that was too expensive to run. Everything runs client-side. Users paste a URL to a Google Sheet or CSV; they get an interactive scatter plot with regression, shareable via URL.

## Core Constraints

- No server — must run on GitHub Pages or any static host
- State must live entirely in the URL hash (sharing is fundamental)
- SVG export must work in Adobe Illustrator (no external font refs, no foreignObject)
- Statistical results must be validated against R before shipping

---

## Decisions

### Nonparametric methods: Both Spearman and Theil-Sen

Both are available as separate model choices — they serve different purposes:

- **Spearman** (`spearman`): rank-transforms X and Y, plots ranks, outputs ρ and p-value. Good for testing monotonic association.
- **Theil-Sen** (`theilsen`): plots data in original units with a median-slope robust line, outputs slope, intercept, and Kendall's τ p-value. Better for regression interpretation.

Neither supports nuisance covariates. The UI model selector will offer: OLS / Robust / Spearman / Theil-Sen.

### Build tooling: esbuild, single app

No CDNs. All dependencies via npm. esbuild bundles two entry points (including npm packages from `node_modules/`): `src/main.js` → `public/dist/main.js` for the page, and `src/stats/worker.js` → `public/dist/stats/worker.js` for regression workers.

```json
"scripts": {
  "dev": "esbuild src/main.js src/stats/worker.js --bundle --outdir=public/dist --outbase=src --servedir=public --watch --sourcemap",
  "build": "esbuild src/main.js src/stats/worker.js --bundle --outdir=public/dist --outbase=src --minify"
}
```

No config file. No HMR (full page reload on change — fine). Simple and understandable.

---

## Architecture Decisions (Settled)

### Stats library: custom implementations + a typed-array kernel

All four stat methods are custom implementations validated against R, with no dependency on simple-statistics (removed). OLS and robust regression run on `src/stats/kernel.js`: column-major `Float64Array` design matrices, Householder QR (avoids squaring the condition number vs normal equations), weighted QR for the IRLS loop, and cross-product helpers for fitting many related models from shared sufficient statistics. The kernel has no DOM access, so it also runs in Web Workers (`src/stats/pool.js`, `src/stats/worker.js`). `ml-matrix` remains for the S-estimator's small subset solves.

The pre-kernel implementations live in `tests/js/oracle/` as a test oracle: `tests/js/kernel.test.mjs` checks the kernel against them on randomized data, and `npm run bench` compares their throughput.

All stats functions: pure, typed inputs (arrays of numbers), consistent output objects. OLS and Robust return `residuals` for use by diagnostic plots.

### Plotting: D3 v7

- Same conceptual approach as the original D3 v3 code, updated to v7 API
- Key D3 v7 changes from v3: `d3.select` still same; scales are `d3.scaleLinear()` not `d3.scale.linear()`; no more `d3.geom.voronoi` — use `d3.Delaunay.from()` instead
- SVG structure mirrors the original: data canvas, point groups, regression line, axis ticks at data points, quartile labels

### CSV Parsing: Papa Parse

- Handles encoding, dialects, quoted fields
- `header: true` gives named columns (use column names as labels)
- `dynamicTyping: true` auto-converts numbers
- Works entirely client-side

### State: Native URL hash

Replace jQuery BBQ with native:

```js
// Read state
const params = new URLSearchParams(window.location.hash.slice(1));

// Write state
window.location.hash = params.toString();

// React to changes
window.addEventListener('hashchange', handleHashChange);
```

All state lives in the hash and is parsed/serialized by `src/state.js`
(`parseState` / `serializeState`). Serialization only emits non-default values,
so shared URLs stay short. The full parameter schema:

| Param  | Type                     | Default   | Meaning                                                              |
|--------|--------------------------|-----------|---------------------------------------------------------------------|
| `src`  | string                   | `null`    | Data source URL                                                     |
| `x`    | int                      | `0`       | Column index for the X variable                                    |
| `y`    | int                      | `1`       | Column index for the Y variable                                    |
| `m`    | string                   | `ols`     | Model: `ols`, `robust`, `spearman`, `theilsen`                     |
| `n`    | comma-separated ints     | `[]`      | Nuisance covariate column indices                                  |
| `c`    | comma-separated ints     | `[]`      | Censored (excluded) point row indices                             |
| `h`    | int                      | `null`    | Column index used for group coloring (`null` = none)              |
| `xl`   | comma-separated floats   | `null`    | Custom X axis tick labels; `null` = automatic five-number summary |
| `yl`   | comma-separated floats   | `null`    | Custom Y axis tick labels; `null` = automatic five-number summary |
| `sm`   | string                   | `null`    | Smoother: `null`, `median`, `lowess`                              |
| `sw`   | int (1–100)              | `10`      | Smoother window/bandwidth, percent of points                      |
| `hide` | comma-separated tokens   | `[]`      | Hidden plot elements: subset of `fit`, `ci`, `kde`, `fringe`      |
| `lb`   | `i:text` entries, commas | `[]`      | Point labels keyed by row index; text is `encodeURIComponent`d    |

`xl`/`yl` are sorted ascending on parse for canonical URLs (rendering itself is
order-independent). They can be set from the plot settings gear menu (a
comma-separated numeric field, blank = auto) or by hand-editing the URL.

`lb` encodes point labels as `index:text` entries joined by commas, sorted by
index. Each label's text is `encodeURIComponent`d per entry so commas, colons,
and unicode in a label survive the delimiters; `serializeLabels`/`parseLabels`
in `state.js` are the round-trip pair. Labels are keyed by original row index
(same as `c`), so they follow a point across model, variable, and censoring
changes, and go stale if the source CSV's row order changes. Cleared on data
load/unload alongside `c`.

### Point labels (issue #63)

Users mark individual points to track whether an outlier is unusual everywhere
or only on one axis. Built keyboard-first on the existing **go mode** rather
than on the pointer, because points aren't reachable DOM elements (WebGL pixels
/ a single overlay hit-rect), so a pointer-only affordance would exclude screen
readers:

- **Interaction:** the go-mode point is labeled via the `e` shortcut or the
  toolbar **Label** button; right-click / shift-click is a pointer convenience
  alias. All routes open one shared popover input (`label-editor.js`) with
  standard focus discipline (focus in on open, Enter/blur commit, Escape
  cancel, focus restored on close). Clearing the text removes the label.
- **Prominence without color reliance:** a larger stroked ring over the point
  (size + dark outline), plus the label text itself as a redundant encoding.
- **Placement:** greedy NE/NW/SE/SW quadrant choice per label, minimizing
  overlap with other points, placed labels, and out-of-bounds area — held to
  the issue's "if reasonable," not a force-directed solver.
- **Text** lives in the static front SVG with a `paint-order: stroke` halo, so
  it's captured by `getExportSVG()` (SVG + PNG) for free and never mutates
  during hover. A `label` column (beside X) is added to the CSV export when any
  labels exist. Changes and the selected point's label are announced through the
  existing `aria-live` region.

### Data input: URL paste field

On the landing/header area: a text input where users paste their data URL.

Google Sheets detection: if URL matches `docs.google.com/spreadsheets`, transform to `/export?format=csv` URL. Handle the `gid=` parameter for specific sheets.

CORS note: if fetch fails with a CORS error, show a clear message: "This URL doesn't allow cross-origin access. For Google Sheets: File → Share → Anyone with the link. For other CSVs, the server needs CORS headers."

### Scatterverse engine (issues #71, #72, #74)

The engine behind the scatterverse view lives in `src/verse/`, with no DOM access, so all of it runs in regression workers.

- **`spec.js`**: the spec (outcomes and predictors pinned on top, "always" covariates, then forks in the order the user added them: exclusion columns, hand-excluded rows, covariate blocks in `all` / `simplify` / `nested` mode, outlier rules, model). `enumeratePaths` walks the Cartesian product and gives each path an evaluation plan: rows missing a used variable drop first, then the forks apply top to bottom, so an outlier rule sees only rows left above it and Cook's D fits the covariates and estimator chosen above it. The final fit uses all of the path's covariates and the last model fork's estimator. X and Y win over covariates (#39); x = y paths and paths whose plan duplicates an earlier one are skipped. A plan's `key` is canonical, so equal keys mean equal results.
- **`url.js`**: the spec as deflate + base64url JSON in `vs`, with `seed` and `boot` (draw count) as plain parameters.
- **`evaluate.js`**: fits many paths at once. Row sets are cached by pipeline prefix and interned by content; all OLS paths on one row set share a centered cross-product matrix, and each is then a Cholesky solve on its sub-block (cost independent of n). M paths fit one by one from the OLS start. `evaluatePlanReference` fits a path from scratch with `ols()` / `robustM()` and is the test oracle. Covariate subsets are solved directly rather than by Gray-code sweeps: a k×k Cholesky is already tiny next to the cross-product pass, and sweeps accumulate rounding.
- **Forced-null bootstrap** (`bootstrapPlans`): per draw, one resample of all rows (seeded per draw, so results don't depend on how draws are split), y* = y − b̂·x per path, refit. Row sets stay at their observed values. OLS paths reuse weighted cross-products, and forcing the null only changes the y row of each sub-block; M paths refit by IRLS on the resample.
- **`summary.js`**: curve statistics (median partial r, share significant in the dominant direction, Stouffer's Z), one-sided bootstrap p-values, and per-fork summaries: each option's share of paths, per-option median r and significance counts, and η² of r by option.
- **`engine.js`**: scheduling as a step function `(state, event) → { state, effects }` with no I/O. Results are cached by plan key, so fork edits compute only new paths. Jobs queue in the engine by priority (OLS, M, bootstrap OLS, bootstrap M) and at most `capacity` run at once; superseded jobs are aborted and their replies ignored. `runner.js` connects it to the worker pool.
- **Significance** is |z| > 1.96 with z the normal equivalent of each path's two-sided p (OLS from t, M from the robust t), for observed paths and draws alike.
- **Cook's D under an M model** (a Cook's rule below a model fork that picked M) uses the converged IRLS weights as WLS weights; a point the M fit rejected has D = 0.

Concurrency tests (`tests/js/verse-engine.test.mjs`) drive the step function directly, run the runner against a manual pool where the test picks completion order, and use `fc.scheduler()` for seeded random interleavings of edits, data swaps, bootstrap changes and completions. Invariants: the final curve equals from-scratch fits of the final spec, every cached result belongs to the current dataset, aborted jobs never write, every job settles, and no more than `capacity` jobs run at once.

---

## Visual Design

### Inspiration

- Default Quarto HTML book theme / R package documentation sites (pkgdown)
- Clean, professional, academic-friendly
- Sans-serif UI chrome, but the plot itself should look like it could be in a journal

### Key visual elements to preserve from original

1. **Per-point tick marks** on both axes — shows the actual distribution without cluttering the plot area
2. **Quartile axis labels** — min, Q1, median, Q3, max by default
3. **Censored points** — two cases:
   - *In axis range:* shown at actual (x, y) position, greyed/hollow, clickable to uncensor
      - *Out of axis range:* small marker just outside the plot boundary on the relevant edge(s), clickable to uncensor. If out of range on both axes, one marker at the nearest corner (not two separate markers).
   - Axis limits are computed from **uncensored points only**, so outliers don't crunch the scale
   - Original approach (indicator-variable trick, projecting censored points onto regression line) is explicitly rejected — dishonest and confusing
4. **Regression line in warm brown/rust** color — stands out from the blue data points
5. **Group colors** from ColorBrewer "Paired" palette
6. **Hover supertick** — when hovering a point, a bigger tick + value appears on each axis
7. **Downloadint plot** - plots can be downloaded as .svg and opened in a vector program for publications; point groups remain grouped, plot retains as much style as possible

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Scatterize    [data URL input field]   [load btn]  │
├──────────┬──────────────────────────┬───────────────┤
│ Controls │                          │  Stats panel  │
│          │      Scatter plot        │               │
│ X var ▾  │                          │  OLS results  │
│ Y var ▾  │                          │  b =  0.42    │
│ Model ▾  │                          │  t =  3.21    │
│          │                          │  p =  0.002   │
│ Nuisance │                          │               │
│ □ col1   │                          │               │
│ □ col2   │                          │               │
│          │                          ├───────────────┤
│ Group ▾  │                          │               │
│ Filter ▾ │                          │  Diagnostic   │
│          │                          │  plots        │
│[Export]  │                          │               │
└──────────┴──────────────────────────┴───────────────┘
```

---

## R Validation Approach

For each statistical method, we maintain an R script in `tests/r/` that:

1. Loads a small, well-known test dataset (or generates one with `set.seed`)
2. Runs the reference R implementation
3. Prints output to stdout in a parseable format

And a corresponding JS script in `tests/js/` that:
1. Loads the same dataset
2. Runs our JS implementation
3. Compares against the R output (hard-coded expected values)

### Reference R implementations

- **OLS:** `lm(y ~ x + nuisance, data=df)` — check `coef()`, `summary()$r.squared`, p-values
- **Robust:** `MASS::rlm(y ~ x, data=df, method="MM")` — MM-estimation (Yohai 1987): a high-breakdown S-estimate (`lqs(method="S", k0=1.548)`, exact subset enumeration) supplies the start coefficients and a fixed scale, then a Tukey-biweight (c=4.685) M-step runs from there. 50% breakdown, 95% Gaussian efficiency. SEs use the `summary.rlm` XtX formula. Layered fixtures in `expected_mm.R` check the S-step and the full MM fit; `robustM()` (plain `psi=psi.bisquare`, M-estimation) is retained internally and checked by `expected_robust.R`.
- **Spearman:** `cor.test(x, y, method="spearman")` — check rho and p-value
- **Theil-Sen:** `mblm::mblm(y ~ x)` or `DescTools::TheilSen()` — slope and intercept; Kendall's τ p-value via `cor.test(x, y, method="kendall")`
- **Scatterverse paths:** `expected_specr.R` fits whole specification grids with `lm()` and `MASS::rlm(psi = psi.bisquare)`, built the way `specr::setup()` builds them (controls with and without `simplify`, `add_to_formula`, subsets, per-model NA drop), plus a grid with outlier rules done with `scale()` and `cooks.distance()`. When `specr` is installed the script also fits specr's own grid and stops if any path disagrees.

### Residualization (nuisance covariates)

When nuisance variables are present, we fit `y ~ nuisance1 + nuisance2` and display the residuals on the Y axis, then regress those residuals on X. The R equivalent:

```r
model_nuis <- lm(y ~ nuis1 + nuis2, data=df)
y_resid <- resid(model_nuis)
model_main <- lm(y_resid ~ x, data=df)
```

---

## Diagnostic Plots

Shown in the stats panel for **OLS and Robust only** — parametric diagnostics don't make sense for rank-based methods (Spearman, Theil-Sen).

### Stats panel layout

1. Model results — fixed at top, always visible
2. Descriptive stats — scrollable
3. Two diagnostic mini-plots — pinned near bottom

### The two plots

Both are **2:1 aspect ratio** (wider than tall) so they stack compactly without wasting vertical space.

**1. Residuals histogram with normal curve overlay**
- X axis: residual values; Y axis: density
- Normal curve fit to residuals overlaid
- Shapiro-Wilk W and p-value as text annotation
- Fringe on X axis showing individual residual positions, with hover-highlight matching the main plot

**2. Q-Q plot**
- Standard orientation: theoretical normal quantiles on X, sorted sample residuals on Y
- Do not reorient to share an axis with the histogram — Q-Q convention matters
- Hover-highlight: hovering a point on the main scatter plot highlights the corresponding point here

### Interactivity

- Both plots update live on point censoring (residuals recomputed from new fit)
- Hover on main plot → highlight on both diagnostic plots
- Do not share axes between histogram and Q-Q plot
- Points move smoothly with easing when axes / models change

---

## What We're NOT Doing

- No server-side computation
- No file uploads (URLs only)
- No user accounts or saved sessions
- No mobile-first design (desktop-focused, but should degrade okay)
- No IE support
- No React/Vue/Angular — vanilla JS + D3
