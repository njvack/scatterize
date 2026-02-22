.PHONY: all fixtures expected test clean r-deps

all: test

# Install required R packages
r-deps:
	Rscript -e "if (!requireNamespace('jsonlite', quietly=TRUE)) install.packages('jsonlite', repos='https://cran.r-project.org')"
	Rscript -e "if (!requireNamespace('mblm',     quietly=TRUE)) install.packages('mblm',     repos='https://cran.r-project.org')"

# Generate CSV data files (run once, or to regenerate synthetic data)
fixtures:
	Rscript tests/r/generate_fixtures.R

# Generate expected JSON from R reference implementations
# Depends on fixtures existing first
expected: fixtures
	Rscript tests/r/expected_ols.R
	Rscript tests/r/expected_robust.R
	Rscript tests/r/expected_spearman.R
	Rscript tests/r/expected_theilsen.R

# Run JS comparison against expected values
test:
	node tests/js/compare.mjs

# Remove all generated files (fixtures and expected)
# Useful if you want to regenerate everything from scratch
clean:
	rm -f tests/fixtures/data/*.csv
	rm -f tests/fixtures/expected/*.json
