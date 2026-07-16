default: test

# Install required R packages
r-deps:
    Rscript -e "if (!requireNamespace('jsonlite',   quietly=TRUE)) install.packages('jsonlite',   repos='https://cran.r-project.org')"
    Rscript -e "if (!requireNamespace('mblm',       quietly=TRUE)) install.packages('mblm',       repos='https://cran.r-project.org')"
    Rscript -e "if (!requireNamespace('robustbase', quietly=TRUE)) install.packages('robustbase', repos='https://cran.r-project.org')"

# Generate CSV data files (run once, or to regenerate synthetic data)
fixtures:
    Rscript tests/r/generate_fixtures.R

# Generate expected JSON from R reference implementations (regenerates fixtures first)
expected: fixtures
    Rscript tests/r/expected_ols.R
    Rscript tests/r/expected_robust.R
    Rscript tests/r/expected_mm.R
    Rscript tests/r/expected_spearman.R
    Rscript tests/r/expected_theilsen.R

# Run all JS tests (unit tests + R-comparison)
test:
    npm test

# Run only the R-comparison against expected values
test-stats:
    node tests/js/compare.mjs

# Run only the unit tests
test-unit:
    node --test tests/js/*.test.mjs

# Bundle and minify for production
build:
    npm run build

# Start the dev server with live rebuild
dev:
    npm run dev

# Lint source
lint:
    npm run lint

# Remove all generated files (fixtures and expected)
clean:
    rm -f tests/fixtures/data/*.csv
    rm -f tests/fixtures/expected/*.json
