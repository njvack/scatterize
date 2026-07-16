#!/usr/bin/env Rscript
# Generate expected MM-estimation results, layered so each JS stage is checked:
#   s_step  — MASS::lqs(method="S", k0=1.548, nsamp="exact"): the high-breakdown
#             S-estimate that provides MM's start coefficients and fixed scale.
#   results — MASS::rlm(method="MM") + summary(): the full MM fit (coef, SE via
#             the XtX formula, fixed scale, and final IRLS weights).
# nsamp="exact" keeps the S-estimate deterministic (no RNG), so JS can match it
# at tight tolerance. All fixtures are small enough that lqs picks "exact"
# regardless (choose(n, p) < 5000).
# Output: tests/fixtures/expected/mm.json

if (!requireNamespace("jsonlite", quietly = TRUE))
  stop("Install jsonlite: install.packages('jsonlite')")
if (!requireNamespace("MASS", quietly = TRUE)) stop("Install MASS")

args <- commandArgs(trailingOnly = FALSE)
script_dir <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
data_dir     <- file.path(script_dir, "..", "fixtures", "data")
expected_dir <- file.path(script_dir, "..", "fixtures", "expected")
dir.create(expected_dir, recursive = TRUE, showWarnings = FALSE)

run_mm <- function(df, x_col, y_col, nuisance_cols = character(0)) {
  predictors <- c(x_col, nuisance_cols)
  f <- as.formula(paste(y_col, "~", paste(predictors, collapse = " + ")))

  # S-step: high-breakdown initial estimate + fixed scale.
  l <- MASS::lqs(f, data = df, method = "S", k0 = 1.548, nsamp = "exact")

  # Full MM fit.
  m  <- MASS::rlm(f, data = df, method = "MM")
  sm <- summary(m)
  cs <- coef(sm)  # columns: Value, Std. Error, t value

  nuisance_stats <- lapply(nuisance_cols, function(z) list(
    coef = unname(cs[z, "Value"]),
    se   = unname(cs[z, "Std. Error"]),
    t    = unname(cs[z, "t value"])
  ))

  list(
    s_step = list(
      coef  = unname(coef(l)),   # model-matrix order: (Intercept), x, nuisance...
      scale = unname(l$scale)
    ),
    results = list(
      slope        = unname(cs[x_col,         "Value"]),
      intercept    = unname(cs["(Intercept)", "Value"]),
      se_slope     = unname(cs[x_col,         "Std. Error"]),
      t_slope      = unname(cs[x_col,         "t value"]),
      se_intercept = unname(cs["(Intercept)", "Std. Error"]),
      t_intercept  = unname(cs["(Intercept)", "t value"]),
      scale        = m$s,
      weights      = as.numeric(m$w),
      n            = nrow(df),
      nuisance_stats = nuisance_stats
    )
  )
}

cases <- list(
  list(dataset = "starsCYG",           x = "log.Te",   y = "log.light",  nuisance = c()),
  list(dataset = "phones",             x = "year",     y = "calls",      nuisance = c()),
  list(dataset = "cars",               x = "speed",    y = "dist",       nuisance = c()),
  list(dataset = "stackloss",          x = "Air.Flow", y = "stack.loss", nuisance = c()),
  list(dataset = "mtcars",             x = "wt",       y = "mpg",        nuisance = c("cyl")),
  list(dataset = "synthetic_outliers", x = "x",        y = "y",          nuisance = c())
)

results <- lapply(cases, function(case) {
  df <- read.csv(file.path(data_dir, paste0(case$dataset, ".csv")))
  cat(sprintf("  %s: %s ~ %s", case$dataset, case$y, case$x))
  if (length(case$nuisance) > 0) cat(sprintf(" | nuisance: %s", paste(case$nuisance, collapse = ", ")))
  cat("\n")
  c(
    list(dataset = case$dataset, x = case$x, y = case$y, nuisance = as.list(case$nuisance)),
    run_mm(df, case$x, case$y, case$nuisance)
  )
})

out <- file.path(expected_dir, "mm.json")
writeLines(jsonlite::toJSON(results, digits = 10, auto_unbox = TRUE, pretty = TRUE), out)
cat("Wrote", out, "\n")
