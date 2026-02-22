#!/usr/bin/env Rscript
# Generate expected robust regression results using MASS::rlm with psi.bisquare.
# This is M-estimation (IRLS + Tukey biweight), not MM-estimation.
# Output: tests/fixtures/expected/robust.json

if (!requireNamespace("jsonlite", quietly = TRUE))
  stop("Install jsonlite: install.packages('jsonlite')")

args <- commandArgs(trailingOnly = FALSE)
script_dir <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
data_dir    <- file.path(script_dir, "..", "fixtures", "data")
expected_dir <- file.path(script_dir, "..", "fixtures", "expected")
dir.create(expected_dir, recursive = TRUE, showWarnings = FALSE)

residualize <- function(df, y_col, nuisance_cols) {
  f <- as.formula(paste(y_col, "~", paste(nuisance_cols, collapse = " + ")))
  resid(lm(f, data = df))
}

run_robust <- function(df, x_col, y_col, nuisance_cols = character(0)) {
  x <- df[[x_col]]
  y <- if (length(nuisance_cols) > 0) residualize(df, y_col, nuisance_cols)
       else df[[y_col]]

  # psi.bisquare = Tukey biweight. Default tuning constant c=4.685 (95% efficiency).
  m  <- MASS::rlm(y ~ x, psi = MASS::psi.bisquare)
  sm <- summary(m)
  cs <- coef(sm)  # columns: Value, Std. Error, t value (no p-values — not well-defined for M-estimators)

  list(
    slope       = unname(cs["x",           "Value"      ]),
    intercept   = unname(cs["(Intercept)", "Value"      ]),
    se_slope    = unname(cs["x",           "Std. Error" ]),
    t_slope     = unname(cs["x",           "t value"    ]),
    se_intercept = unname(cs["(Intercept)", "Std. Error"]),
    t_intercept = unname(cs["(Intercept)", "t value"    ]),
    scale       = m$s,                   # robust scale estimate
    weights     = as.numeric(m$w),       # final IRLS weights, one per observation
    n           = length(x)
  )
}

cases <- list(
  list(dataset = "cars",               x = "speed",      y = "dist",        nuisance = c()),
  list(dataset = "stackloss",          x = "Air.Flow",   y = "stack.loss",  nuisance = c()),
  list(dataset = "synthetic_linear",   x = "x",          y = "y",           nuisance = c()),
  list(dataset = "synthetic_outliers", x = "x",          y = "y",           nuisance = c())
)

results <- lapply(cases, function(case) {
  df <- read.csv(file.path(data_dir, paste0(case$dataset, ".csv")))
  cat(sprintf("  %s: %s ~ %s\n", case$dataset, case$y, case$x))
  list(
    dataset  = case$dataset,
    x        = case$x,
    y        = case$y,
    nuisance = as.list(case$nuisance),
    results  = run_robust(df, case$x, case$y, case$nuisance)
  )
})

out <- file.path(expected_dir, "robust.json")
writeLines(jsonlite::toJSON(results, digits = 10, auto_unbox = TRUE, pretty = TRUE), out)
cat("Wrote", out, "\n")
