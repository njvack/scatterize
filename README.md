# Scatterize 3

Interactive scatter plot explorer. Paste a CSV or Google Sheets URL, pick your X and Y variables, and get a regression plot with stats.

**[Open Scatterize 3 →](https://njvack.github.io/scatterize/)**

## Features

- OLS, robust (Tukey biweight), Spearman, and Theil-Sen regression
- Point censoring (click any point to exclude it from the fit)
- Nuisance covariate residualization
- Group coloring
- Drag-and-drop CSV files — data stays in your browser, never sent anywhere
- URL-shareable state (variable selections, censored points, etc.)
- SVG export for Illustrator

## Data sources

Paste any of these into the URL bar:

- A direct CSV URL (server must allow CORS)
- A Google Sheets URL (sheet must be shared "Anyone with the link")
- A GitHub file or Gist URL
- Or drop a CSV file directly onto the page

## Self-hosting

Download `scatterize.zip` from the [latest release](https://github.com/njvack/scatterize/releases/latest), unzip it, and serve the folder with any static web server. No server-side code required.

## Feedback

[Open an issue](https://github.com/njvack/scatterize/issues) for bug reports or feature requests.
