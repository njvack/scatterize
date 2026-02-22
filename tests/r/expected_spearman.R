#!/usr/bin/env Rscript
# Generate expected Spearman rank correlation results.
# Output: tests/fixtures/expected/spearman.json

if (!requireNamespace("jsonlite", quietly = TRUE))
  stop("Install jsonlite: install.packages('jsonlite')")

args <- commandArgs(trailingOnly = FALSE)
script_dir <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
data_dir    <- file.path(script_dir, "..", "fixtures", "data")
expected_dir <- file.path(script_dir, "..", "fixtures", "expected")
dir.create(expected_dir, recursive = TRUE, showWarnings = FALSE)

run_spearman <- function(df, x_col, y_col) {
  x <- df[[x_col]]
  y <- df[[y_col]]
  ct <- cor.test(x, y, method = "spearman")
  list(
    rho     = unname(ct$estimate),
    p_value = ct$p.value,
    n       = length(x)
  )
}

cases <- list(
  list(dataset = "cars",              x = "speed",      y = "dist"    ),
  list(dataset = "faithful",          x = "eruptions",  y = "waiting" ),
  list(dataset = "synthetic_linear",  x = "x",          y = "y"       ),
  list(dataset = "synthetic_monotone",x = "x",          y = "y"       )
)

results <- lapply(cases, function(case) {
  df <- read.csv(file.path(data_dir, paste0(case$dataset, ".csv")))
  cat(sprintf("  %s: %s ~ %s\n", case$dataset, case$y, case$x))
  list(dataset = case$dataset, x = case$x, y = case$y, results = run_spearman(df, case$x, case$y))
})

out <- file.path(expected_dir, "spearman.json")
writeLines(jsonlite::toJSON(results, digits = 10, auto_unbox = TRUE, pretty = TRUE), out)
cat("Wrote", out, "\n")
