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
- SVG export for Illustrator / Inkscape

## Data sources

Paste any of these into the URL bar:

- A direct CSV URL (server must allow CORS)
- A Google Sheets URL (sheet must be shared "Anyone with the link")
- A GitHub file or Gist URL
- Or drop a CSV file directly onto the page

## Self-hosting

Download `scatterize.zip` from the [latest release](https://github.com/njvack/scatterize/releases/latest), unzip it, and open index.html in your web browser, or put the contents on any static web server.

## Credits

This was built with a great deal of help from Claude Code and Anthropic's 4.6 set of models. I'll try and write more about the authoring process later. Long story short, though: As of early 2026, computers can write code.

The typeface used in Scatterize is the excellent [League Spartan](https://www.theleagueofmoveabletype.com/league-spartan), designed by [Caroline Hadilaksono](https://www.theleagueofmoveabletype.com/team/caroline-hadilaksono), [Micah Rich](https://www.theleagueofmoveabletype.com/team/micah-rich), [Tyler Finck](https://www.theleagueofmoveabletype.com/team/tyler-finck), and [Matt Bailey](https://www.theleagueofmoveabletype.com/team/matt-bailey) of [The League of Movable Type](https://www.theleagueofmoveabletype.com/). 

## Feedback

[Open an issue](https://github.com/njvack/scatterize/issues) for bug reports or feature requests.
