#!/usr/bin/env Rscript
# Generate expected OLS results using R's lm().
# Uses joint model: lm(y ~ x + nuisance1 + nuisance2 + ...)
# Output: tests/fixtures/expected/ols.json

if (!requireNamespace("jsonlite", quietly = TRUE))
  stop("Install jsonlite: install.packages('jsonlite')")

args <- commandArgs(trailingOnly = FALSE)
script_dir <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
data_dir    <- file.path(script_dir, "..", "fixtures", "data")
expected_dir <- file.path(script_dir, "..", "fixtures", "expected")
dir.create(expected_dir, recursive = TRUE, showWarnings = FALSE)

run_ols <- function(df, x_col, y_col, nuisance_cols = character(0)) {
  predictors <- c(x_col, nuisance_cols)
  f  <- as.formula(paste(y_col, "~", paste(predictors, collapse = " + ")))
  m  <- lm(f, data = df)
  sm <- summary(m)
  cs <- coef(sm)
  fs <- sm$fstatistic

  t_x      <- cs[x_col, "t value"]
  df_resid <- sm$df[2]
  df_model <- fs[["numdf"]]
  partial_r2_x <- t_x^2 / (t_x^2 + df_resid)
  f_stat <- fs[["value"]]
  p_f    <- pf(f_stat, df_model, df_resid, lower.tail = FALSE)

  nuisance_stats <- lapply(nuisance_cols, function(z) {
    t_z <- cs[z, "t value"]
    list(
      coef       = unname(cs[z, "Estimate"   ]),
      se         = unname(cs[z, "Std. Error" ]),
      t          = t_z,
      p          = unname(cs[z, "Pr(>|t|)"  ]),
      partial_r2 = t_z^2 / (t_z^2 + df_resid)
    )
  })

  list(
    slope         = unname(cs[x_col,          "Estimate"   ]),
    intercept     = unname(cs["(Intercept)",  "Estimate"   ]),
    se_slope      = unname(cs[x_col,          "Std. Error" ]),
    t_slope       = t_x,
    p_slope       = unname(cs[x_col,          "Pr(>|t|)"   ]),
    se_intercept  = unname(cs["(Intercept)",  "Std. Error" ]),
    t_intercept   = unname(cs["(Intercept)",  "t value"    ]),
    p_intercept   = unname(cs["(Intercept)",  "Pr(>|t|)"   ]),
    r_squared      = partial_r2_x,      # partial R² for X: t²/(t² + df)
    full_r_squared = sm$r.squared,      # full model R²
    adj_r_squared  = sm$adj.r.squared,
    f_stat         = f_stat,
    p_f            = p_f,
    n              = nrow(df),
    df_residual    = df_resid,
    nuisance_stats = nuisance_stats
  )
}

cases <- list(
  list(dataset = "cars",             x = "speed", y = "dist",       nuisance = c()),
  list(dataset = "mtcars",           x = "wt",    y = "mpg",        nuisance = c()),
  list(dataset = "mtcars",           x = "wt",    y = "mpg",        nuisance = c("cyl")),
  list(dataset = "mtcars",           x = "wt",    y = "mpg",        nuisance = c("cyl", "hp")),
  list(dataset = "stackloss",        x = "Air.Flow", y = "stack.loss", nuisance = c("Water.Temp")),
  list(dataset = "anscombe",         x = "x1",    y = "y1",         nuisance = c()),
  list(dataset = "anscombe",         x = "x2",    y = "y2",         nuisance = c()),
  list(dataset = "anscombe",         x = "x3",    y = "y3",         nuisance = c()),
  list(dataset = "anscombe",         x = "x4",    y = "y4",         nuisance = c()),
  list(dataset = "synthetic_linear", x = "x",     y = "y",          nuisance = c()),
  list(dataset = "synthetic_outliers", x = "x",   y = "y",          nuisance = c())
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
