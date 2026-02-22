#!/usr/bin/env Rscript
# Generate expected Theil-Sen estimator results.
# Uses mblm::mblm(repeated=FALSE) for slope/intercept.
# Uses cor.test(method="kendall") for tau and p-value.
# Output: tests/fixtures/expected/theilsen.json

if (!requireNamespace("jsonlite", quietly = TRUE))
  stop("Install jsonlite: install.packages('jsonlite')")
if (!requireNamespace("mblm", quietly = TRUE))
  stop("Install mblm: install.packages('mblm')")

args <- commandArgs(trailingOnly = FALSE)
script_dir <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
data_dir    <- file.path(script_dir, "..", "fixtures", "data")
expected_dir <- file.path(script_dir, "..", "fixtures", "expected")
dir.create(expected_dir, recursive = TRUE, showWarnings = FALSE)

run_theilsen <- function(df, x_col, y_col) {
  x <- df[[x_col]]
  y <- df[[y_col]]

  # repeated=FALSE: Theil-Sen (median of pairwise slopes)
  # repeated=TRUE would be Siegel's repeated median, which is different
  m  <- mblm::mblm(y ~ x, repeated = FALSE)
  kt <- cor.test(x, y, method = "kendall")

  list(
    slope     = unname(coef(m)["x"]),
    intercept = unname(coef(m)["(Intercept)"]),
    tau       = unname(kt$estimate),
    p_value   = kt$p.value,
    n         = length(x)
  )
}

cases <- list(
  list(dataset = "cars",               x = "speed",    y = "dist" ),
  list(dataset = "faithful",           x = "eruptions",y = "waiting"),
  list(dataset = "synthetic_linear",   x = "x",        y = "y"    ),
  list(dataset = "synthetic_outliers", x = "x",        y = "y"    )
)

results <- lapply(cases, function(case) {
  df <- read.csv(file.path(data_dir, paste0(case$dataset, ".csv")))
  cat(sprintf("  %s: %s ~ %s\n", case$dataset, case$y, case$x))
  list(dataset = case$dataset, x = case$x, y = case$y, results = run_theilsen(df, case$x, case$y))
})

out <- file.path(expected_dir, "theilsen.json")
writeLines(jsonlite::toJSON(results, digits = 10, auto_unbox = TRUE, pretty = TRUE), out)
cat("Wrote", out, "\n")
