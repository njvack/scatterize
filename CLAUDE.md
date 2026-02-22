# Scatterize — Claude Guide

## What This Is

A pure client-side scatter plot explorer for researchers. Users paste a URL to a Google Sheet or public CSV; the app lets them pick X/Y variables, choose a regression method, click to censor outlier points, add nuisance covariates (residualizing them out), group/color by a column, and export a publication-quality SVG. All state lives in the URL hash, so plots are shareable.

**Goal:** Rewrite the original Python/Flask app as a fully static site deployable on GitHub Pages. No server — all statistics run in the browser.

## Tech Stack

- **Stats:** `simple-statistics` as the base library; custom IRLS M-estimation (Tukey biweight) added to match its API style
- **Plotting:** D3.js v7 — keeps SVG fidelity and full control for Illustrator export
- **CSV parsing:** Papa Parse
- **State:** Native `URLSearchParams` + `hashchange` (no jQuery)
- **Build:** esbuild (no CDNs — all deps via npm). Bundles `src/main.js` → `dist/main.js`. Dev: `--servedir=. --watch`. Prod: add `--minify`. No config file.
- **Style:** Quarto/R guide aesthetic (clean serif headings, generous whitespace, muted palette)

## Statistical Methods

Four regression modes, all supporting point censoring and column filtering:

| Mode | Key | Key Output | Covariates | Notes |
|------|-----|-----------|-----------|-------|
| OLS | `ols` | β, t, p, R² | Yes (residualized) | Standard linear regression |
| Robust | `robust` | β, t, p | Yes (residualized) | M-estimation: IRLS with Tukey biweight weights |
| Spearman | `spearman` | ρ, p | No | Rank-transforms X and Y; plots ranks |
| Theil-Sen | `theilsen` | slope, τ, p | No | Median pairwise slope; original units |

Spearman and Theil-Sen serve different purposes and should both be available. Neither supports nuisance covariates (residualization doesn't compose cleanly with rank methods).

**Point censoring in OLS/Robust:** The original used indicator variable trick (censor column per point). New version should just exclude censored rows from the fit. The visual weight of censored points goes to 0 (grey, hollow) but they still appear on the plot.

## Testing

All statistical implementations validated against R before use.

- R harnesses: `tests/r/` — run with `Rscript tests/r/<file>.R`
- JS harnesses: `tests/js/` — run with `node tests/js/<file>.js` (or vitest)
- R reference implementations:
  - OLS: base `lm()`
  - Robust: `MASS::rlm(y ~ x, psi=psi.bisquare)` — M-estimation with Tukey biweight (not MM)
  - Spearman: `stats::cor.test(method="spearman")`
  - Theil-Sen: `mblm::mblm()` or `DescTools::TheilSen()`
- Tolerance: match R output to ~6 significant figures for coefficients, ~4 for p-values

When adding a new stat: write the R reference first, confirm it gives expected output on test data, then implement JS and compare.

## URL State Schema

All app state in the URL hash:

| Key | Value | Example |
|-----|-------|---------|
| `src` | CSV/Sheet URL | `src=https://...` |
| `x` | Column index (int) | `x=0` |
| `y` | Column index (int) | `y=1` |
| `m` | Model (`ols`, `robust`, `spearman`, `theilsen`) | `m=ols` |
| `n` | Nuisance column indices (comma-sep) | `n=2,3` |
| `c` | Censored row indices (comma-sep) | `c=5,7` |
| `h` | Highlight/group column index | `h=4` |
| `f` | Filter column index | `f=1` |
| `xl` | Custom X axis tick values (comma-sep) | `xl=0,5,10` |
| `yl` | Custom Y axis tick values (comma-sep) | `yl=-1,0,1` |

## Key Features to Preserve from Original

- Per-data-point tick marks on both axes (at the actual data values, not fixed intervals)
- Quartile labels on axes by default, overridable with `xl`/`yl`
- Click a point to censor it; click again to uncensor
- Censored points within axis range: shown at actual position, grey/hollow, still clickable
- Censored points outside axis range: small marker just outside the plot boundary, clickable to uncensor
- Axis limits computed from uncensored points only (censored outliers don't crunch the scale)
- Nuisance covariates residualize Y (label changes to "Residualized Y")
- Group/color by column (ColorBrewer "Paired" palette, 8 colors)
- Voronoi-based point targeting for easier clicking
- SVG export that works in Illustrator (fonts embedded, no external deps)
- Keyboard shortcuts: `j`/`k` Y var, `u`/`i` X var, `o`/`p` model, `c` toggle censors

## Project Structure (Planned)

```
scatterize/
├── CLAUDE.md
├── docs/
│   └── design.md
├── package.json
├── index.html
├── src/
│   ├── main.js
│   ├── state.js              # URL hash state management
│   ├── data.js               # CSV fetching and parsing (Papa Parse)
│   ├── stats/
│   │   ├── ols.js            # OLS via simple-statistics
│   │   ├── robust.js         # M-estimation (Tukey biweight IRLS)
│   │   ├── spearman.js       # Spearman rank correlation
│   │   ├── theilsen.js       # Theil-Sen estimator + Kendall's τ
│   │   └── common.js         # Shared: residualization, centering, etc.
│   └── plot/
│       ├── scatterplot.js
│       └── dashboard.js
├── tests/
│   ├── fixtures/             # Shared CSVs generated by R, consumed by both
│   ├── r/                    # R validation scripts
│   └── js/                   # JS test harnesses
└── static/
    └── css/
        └── style.css
```

## Data Input

Users paste a URL into a text field. Two cases:

1. **Google Sheets:** URL like `https://docs.google.com/spreadsheets/d/{id}/...` → convert to CSV export URL (`/export?format=csv&gid={gid}`) before fetching
2. **Public CSV:** Fetch directly. Requires CORS headers on the server — if fetch fails, show a helpful error explaining this.

Parse with Papa Parse (`header: true, dynamicTyping: true, skipEmptyLines: true`).

## Coding Conventions

- ES modules throughout (`import`/`export`)
- No jQuery
- D3 v7 API (not v3/v5 — the original used v3)
- Keep stats modules pure functions where possible (input arrays → result objects)
- Stats results objects should be consistent across methods: `{ slope, intercept, rSquared?, pValue, n, ... }`
