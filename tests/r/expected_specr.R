#!/usr/bin/env Rscript
# Reference results for the scatterverse path engine (src/verse/).
#
# Builds a synthetic dataset (tests/fixtures/data/verse.csv) and fits every
# path of a few specification grids with lm() and MASS::rlm(), following
# specr's setup() semantics:
#   - x × y × controls × subsets, Cartesian product
#   - controls: simplify = FALSE → every subset; TRUE → none, each, all
#   - add_to_formula: covariates in every model
#   - subsets: "all" plus each listed level (here bot == "no", i.e. the
#     scatterverse exclusion fork on `bot` applied)
#   - rows with NA in a model's variables drop per model (na.omit)
# Robust paths use rlm(psi = psi.bisquare), M-estimation, as scatterverse does.
#
# A further grid adds outlier rules that specr doesn't have (|z| > 3 via
# scale(), Cook's D > 4/n via cooks.distance()), applied in fork order after
# the exclusion, to check that pipeline's semantics against R's own functions.
#
# If specr is installed, its grid is fitted too and must agree with ours
# (estimates, SEs, n). CRAN access isn't needed otherwise.
#
# Output: tests/fixtures/data/verse.csv, tests/fixtures/expected/specr.json

if (!requireNamespace("jsonlite", quietly = TRUE)) stop("Install jsonlite")
if (!requireNamespace("MASS", quietly = TRUE)) stop("Install MASS")

args <- commandArgs(trailingOnly = FALSE)
script_dir <- dirname(normalizePath(sub("--file=", "", args[grep("--file=", args)])))
data_dir     <- file.path(script_dir, "..", "fixtures", "data")
expected_dir <- file.path(script_dir, "..", "fixtures", "expected")
dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)
dir.create(expected_dir, recursive = TRUE, showWarnings = FALSE)

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
set.seed(65)
n  <- 150
c1 <- rnorm(n)
c2 <- rnorm(n)
c3 <- rnorm(n)
x1 <- rnorm(n) + 0.5 * c1
x2 <- x1 + rnorm(n)
y1 <- 0.3 * x1 + 0.4 * c1 - 0.2 * c3 + rnorm(n)
y2 <- 0.1 * x2 + 0.3 * c2 + rnorm(n)
y1[c(7, 40)] <- c(9, -8)          # outliers for the rules and the M fits
x1[90] <- -6                      # a leverage point
c2[c(3, 33, 77)] <- NA            # missing covariate values drop per path
bot <- ifelse(seq_len(n) %% 11 == 0, "yes", "no")
df <- data.frame(y1, y2, x1, x2, c1, c2, c3, bot)
write.csv(df, file.path(data_dir, "verse.csv"), row.names = FALSE)

# ---------------------------------------------------------------------------
# Fitting
# ---------------------------------------------------------------------------
fit_path <- function(d, y, x, controls, estimator) {
  f <- as.formula(paste(y, "~", paste(c(x, controls), collapse = " + ")))
  if (estimator == "m") {
    m  <- MASS::rlm(f, data = d, psi = MASS::psi.bisquare)
    cs <- coef(summary(m))
    list(estimate = unname(cs[x, "Value"]), std_error = unname(cs[x, "Std. Error"]),
         statistic = unname(cs[x, "t value"]), p_value = NULL,
         nobs = length(m$residuals))
  } else {
    m  <- lm(f, data = d)
    cs <- coef(summary(m))
    list(estimate = unname(cs[x, "Estimate"]), std_error = unname(cs[x, "Std. Error"]),
         statistic = unname(cs[x, "t value"]), p_value = unname(cs[x, "Pr(>|t|)"]),
         nobs = nobs(m))
  }
}

control_sets <- function(controls, simplify) {
  if (simplify) {
    out <- c(list(character(0)), as.list(controls))
    if (length(controls) > 1) out <- c(out, list(controls))
    return(out)
  }
  out <- list(character(0))
  for (k in seq_along(controls)) out <- c(out, combn(controls, k, simplify = FALSE))
  out
}

# Rows a path keeps: complete cases on its variables, then each filter step in order.
path_rows <- function(d, vars, steps) {
  keep <- which(complete.cases(d[, vars, drop = FALSE]))
  for (s in steps) {
    sub <- d[keep, , drop = FALSE]
    drop <- switch(s$type,
      exclude = sub$bot == "yes",
      z = apply(abs(scale(sub[, s$columns, drop = FALSE])) > s$threshold, 1, any),
      cooks = {
        m <- lm(as.formula(paste(s$y, "~", paste(c(s$x, s$nuisance), collapse = " + "))), data = sub)
        cooks.distance(m) > s$threshold / nrow(sub)
      })
    keep <- keep[!drop]
  }
  keep
}

grid_case <- function(name, ys, xs, controls, simplify, always, estimators, rules = FALSE) {
  results <- list()
  for (y in ys) for (x in xs) for (ctrl in control_sets(controls, simplify)) {
    covs <- setdiff(c(always, ctrl), c(x, y))
    for (subset in c("all", "bot = no")) for (est in estimators) {
      zs <- if (rules) c(NA, 3) else NA
      cks <- if (rules) c(NA, 4) else NA
      for (zt in zs) for (ck in cks) {
        steps <- list()
        if (subset != "all") steps <- c(steps, list(list(type = "exclude")))
        if (!is.na(zt)) steps <- c(steps, list(list(type = "z", columns = c(y, x), threshold = zt)))
        if (!is.na(ck)) steps <- c(steps, list(list(type = "cooks", y = y, x = x, nuisance = covs, threshold = ck)))
        rows <- path_rows(df, c(y, x, covs), steps)
        r <- fit_path(df[rows, ], y, x, covs, est)
        results[[length(results) + 1]] <- c(list(
          y = y, x = x, controls = I(covs), subset = subset, estimator = est,
          z = if (is.na(zt)) NULL else zt, cooks = if (is.na(ck)) NULL else ck), r)
      }
    }
  }
  forks <- list(
    list(kind = "exclude", column = "bot"),
    list(kind = "covariates", mode = if (simplify) "simplify" else "all", columns = I(controls)))
  if (rules) forks <- c(forks, list(
    list(kind = "outlier", rule = "z", thresholds = I(3), on = "xy"),
    list(kind = "outlier", rule = "cooks", thresholds = I(4), perN = TRUE)))
  forks <- c(forks, list(list(kind = "model", estimators = I(estimators))))
  list(name = name, dataset = "verse",
       spec = list(outcomes = I(ys), predictors = I(xs), always = I(always), forks = forks),
       results = results)
}

cases <- list(
  grid_case("specr grid: all subsets, lm + rlm", c("y1", "y2"), c("x1", "x2"),
            c("c1", "c2"), FALSE, "c3", c("ols", "m")),
  grid_case("specr grid: simplify, add_to_formula", c("y1"), c("x1", "x2"),
            c("c1", "c2", "c3"), TRUE, character(0), c("ols")),
  grid_case("pipeline: exclusion, |z| > 3, Cook's D > 4/n", c("y1"), c("x1"),
            c("c1", "c2"), FALSE, "c3", c("ols", "m"), rules = TRUE)
)

# ---------------------------------------------------------------------------
# Cross-check against specr itself, when it's installed.
# ---------------------------------------------------------------------------
if (requireNamespace("specr", quietly = TRUE)) {
  cat("Cross-checking against specr", as.character(packageVersion("specr")), "\n")
  rlm_bisq <- function(formula, data) MASS::rlm(formula, data = data, psi = MASS::psi.bisquare)
  assign("rlm_bisq", rlm_bisq, envir = globalenv())
  check_specr <- function(case, controls, simplify, always, models) {
    s <- specr::setup(data = df, y = case$spec$outcomes, x = case$spec$predictors,
                      model = models, controls = controls, simplify = simplify,
                      add_to_formula = if (length(always)) always else NULL,
                      subsets = list(bot = "no"))
    res <- as.data.frame(specr::specr(s))
    for (r in case$results) {
      model <- if (r$estimator == "m") "rlm_bisq" else "lm"
      ctrl  <- if (length(setdiff(r$controls, always))) paste(setdiff(r$controls, always), collapse = " + ") else "no covariates"
      sub   <- if (r$subset == "all") "all" else "bot = no"
      hit <- res[res$y == r$y & res$x == r$x & res$model == model & res$controls == ctrl & res$subsets == sub, ]
      if (nrow(hit) != 1) stop(sprintf("specr row not found: %s ~ %s | %s | %s | %s", r$y, r$x, ctrl, sub, model))
      stopifnot(abs(hit$estimate - r$estimate) < 1e-8 * max(1, abs(r$estimate)),
                abs(hit$std.error - r$std_error) < 1e-8 * max(1, abs(r$std_error)),
                hit$fit_nobs == r$nobs)
    }
    cat("  ", case$name, ": ", length(case$results), " paths agree\n", sep = "")
  }
  check_specr(cases[[1]], c("c1", "c2"), FALSE, "c3", c("lm", "rlm_bisq"))
  check_specr(cases[[2]], c("c1", "c2", "c3"), TRUE, character(0), "lm")
} else {
  cat("specr not installed; skipping the specr cross-check\n")
}

out <- file.path(expected_dir, "specr.json")
writeLines(jsonlite::toJSON(cases, auto_unbox = TRUE, digits = 15, null = "null", pretty = TRUE), out)
cat(sprintf("Wrote %s (%d cases)\n", out, length(cases)))
