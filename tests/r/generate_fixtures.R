#!/usr/bin/env Rscript
# Generate CSV data fixtures used by both R and JS tests.
# Run this once (or when you want to regenerate synthetic data).
# Output goes to tests/fixtures/data/

args <- commandArgs(trailingOnly = FALSE)
script_dir <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
data_dir <- file.path(script_dir, "..", "fixtures", "data")
dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)

save_csv <- function(data, name) {
  path <- file.path(data_dir, paste0(name, ".csv"))
  write.csv(data, path, row.names = FALSE)
  cat(sprintf("  wrote %s (%d rows)\n", basename(path), nrow(data)))
}

cat("Standard R datasets:\n")
save_csv(cars, "cars")
save_csv(mtcars, "mtcars")
save_csv(stackloss, "stackloss")
save_csv(faithful, "faithful")
save_csv(anscombe, "anscombe")

cat("\nSynthetic datasets:\n")

# Clean linear: y = 2.5x + 1.0 + noise
# Good baseline for OLS/robust/Theil-Sen
set.seed(42)
n <- 50
x <- rnorm(n)
y <- 2.5 * x + 1.0 + rnorm(n, sd = 0.5)
save_csv(data.frame(x = x, y = y), "synthetic_linear")

# Linear with outliers: same true relationship, a few extreme Y values
# OLS and robust should give notably different results
set.seed(42)
n <- 50
x <- rnorm(n)
y <- 2.5 * x + 1.0 + rnorm(n, sd = 0.5)
y[c(5, 15, 30)] <- c(15, -12, 18)
save_csv(data.frame(x = x, y = y), "synthetic_outliers")

# Monotone but nonlinear: y = exp(x) + noise
# Spearman >> Pearson here; good for demonstrating the difference
set.seed(42)
n <- 50
x <- runif(n, 0.1, 3)
y <- exp(x) + rnorm(n, sd = 0.3)
save_csv(data.frame(x = x, y = y), "synthetic_monotone")

cat("\nDone.\n")
