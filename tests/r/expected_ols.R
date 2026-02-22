#!/usr/bin/env Rscript
# Generate expected OLS results using R's lm().
# Output: tests/fixtures/expected/ols.json

if (!requireNamespace("jsonlite", quietly = TRUE))
  stop("Install jsonlite: install.packages('jsonlite')")

args <- commandArgs(trailingOnly = FALSE)
script_dir <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
data_dir    <- file.path(script_dir, "..", "fixtures", "data")
expected_dir <- file.path(script_dir, "..", "fixtures", "expected")
dir.create(expected_dir, recursive = TRUE, showWarnings = FALSE)

# Residualize y against nuisance columns, return residuals.
residualize <- function(df, y_col, nuisance_cols) {
  f <- as.formula(paste(y_col, "~", paste(nuisance_cols, collapse = " + ")))
  resid(lm(f, data = df))
}

run_ols <- function(df, x_col, y_col, nuisance_cols = character(0)) {
  x <- df[[x_col]]
  y <- if (length(nuisance_cols) > 0) residualize(df, y_col, nuisance_cols)
       else df[[y_col]]

  m  <- lm(y ~ x)
  sm <- summary(m)
  cs <- coef(sm)

  list(
    slope         = unname(cs["x",             "Estimate"   ]),
    intercept     = unname(cs["(Intercept)",   "Estimate"   ]),
    se_slope      = unname(cs["x",             "Std. Error" ]),
    t_slope       = unname(cs["x",             "t value"    ]),
    p_slope       = unname(cs["x",             "Pr(>|t|)"   ]),
    se_intercept  = unname(cs["(Intercept)",   "Std. Error" ]),
    t_intercept   = unname(cs["(Intercept)",   "t value"    ]),
    p_intercept   = unname(cs["(Intercept)",   "Pr(>|t|)"   ]),
    r_squared     = sm$r.squared,
    adj_r_squared = sm$adj.r.squared,
    n             = length(x),
    df_residual   = sm$df[2]
  )
}

cases <- list(
  list(dataset = "cars",             x = "speed", y = "dist",  nuisance = c()),
  list(dataset = "mtcars",           x = "wt",    y = "mpg",   nuisance = c()),
  list(dataset = "mtcars",           x = "wt",    y = "mpg",   nuisance = c("cyl")),
  list(dataset = "anscombe",         x = "x1",    y = "y1",    nuisance = c()),
  list(dataset = "anscombe",         x = "x2",    y = "y2",    nuisance = c()),
  list(dataset = "anscombe",         x = "x3",    y = "y3",    nuisance = c()),
  list(dataset = "anscombe",         x = "x4",    y = "y4",    nuisance = c()),
  list(dataset = "synthetic_linear", x = "x",     y = "y",     nuisance = c()),
  list(dataset = "synthetic_outliers", x = "x",   y = "y",     nuisance = c())
)

results <- lapply(cases, function(case) {
  df <- read.csv(file.path(data_dir, paste0(case$dataset, ".csv")))
  cat(sprintf("  %s: %s ~ %s", case$dataset, case$y, case$x))
  if (length(case$nuisance) > 0) cat(sprintf(" | nuisance: %s", paste(case$nuisance, collapse = ", ")))
  cat("\n")
  list(
    dataset  = case$dataset,
    x        = case$x,
    y        = case$y,
    nuisance = as.list(case$nuisance),   # always a JSON array, never unboxed
    results  = run_ols(df, case$x, case$y, case$nuisance)
  )
})

out <- file.path(expected_dir, "ols.json")
writeLines(jsonlite::toJSON(results, digits = 10, auto_unbox = TRUE, pretty = TRUE), out)
cat("Wrote", out, "\n")
