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

No CDNs. All dependencies via npm. esbuild bundles `src/main.js` and its imports (including npm packages from `node_modules/`) into `dist/main.js` that the browser can load.

```json
"scripts": {
  "dev": "esbuild src/main.js --bundle --outfile=dist/main.js --servedir=. --watch",
  "build": "esbuild src/main.js --bundle --outfile=dist/main.js --minify"
}
```

No config file. No HMR (full page reload on change — fine). Simple and understandable.

---

## Architecture Decisions (Settled)

### Stats library: custom implementations + ml-matrix

All four stat methods are custom implementations validated against R, with no dependency on simple-statistics (removed). `ml-matrix` handles the linear algebra:
- `QrDecomposition` in `residualize()` — avoids squaring the condition number vs normal equations
- `solve()` (LU with pivoting) in the robust IRLS loop

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

### Data input: URL paste field

On the landing/header area: a text input where users paste their data URL.

Google Sheets detection: if URL matches `docs.google.com/spreadsheets`, transform to `/export?format=csv` URL. Handle the `gid=` parameter for specific sheets.

CORS note: if fetch fails with a CORS error, show a clear message: "This URL doesn't allow cross-origin access. For Google Sheets: File → Share → Anyone with the link. For other CSVs, the server needs CORS headers."

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
- **Robust:** `MASS::rlm(y ~ x, data=df, psi=psi.bisquare)` — M-estimation with Tukey biweight, matches the original `sm.RLM(..., M=TukeyBiweight())`. Check coefficients and weights. **Not** MM-estimation.
- **Spearman:** `cor.test(x, y, method="spearman")` — check rho and p-value
- **Theil-Sen:** `mblm::mblm(y ~ x)` or `DescTools::TheilSen()` — slope and intercept; Kendall's τ p-value via `cor.test(x, y, method="kendall")`

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
