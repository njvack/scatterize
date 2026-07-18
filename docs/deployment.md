# Deployment

Scatterize is a static site. Both the live site and per-PR previews are
published to a single `gh-pages` branch, served by GitHub Pages.

## Layout of the `gh-pages` branch

```
/                     ← the live site (deployed from main)
/pr-preview/pr-42/    ← ephemeral preview for PR #42
/pr-preview/pr-57/    ← ephemeral preview for PR #57
```

- **`main`** is built and published to the branch root by
  `.github/workflows/deploy.yml`. It excludes `pr-preview/`, so publishing the
  live site never disturbs an open PR's preview.
- **Pull requests** are built and published to `pr-preview/pr-<N>/` by
  `.github/workflows/pr-preview.yml`. The action comments the preview URL on
  the PR and **removes the directory when the PR is merged or closed**, so
  previews are ephemeral.

A preview lives at:

```
https://njvack.github.io/scatterize/pr-preview/pr-<N>/
```

Relative asset paths throughout the app make it work unchanged from a
subdirectory — no base-path configuration is needed.

## One-time repository settings

These cannot be set from code and must be configured once by a repo admin:

1. **Pages source** — Settings → Pages → *Build and deployment* →
   **Deploy from a branch**, branch **`gh-pages`**, folder **`/ (root)`**.
   (Previously this was set to "GitHub Actions".)
2. **Workflow permissions** — Settings → Actions → General →
   *Workflow permissions* → **Read and write permissions**, so the workflows
   can push to `gh-pages` and comment on PRs.

## Notes

- Previews are only built for PRs from branches in this repository. PRs opened
  from forks get a restricted token and will not produce a preview.
- The `gh-pages` branch is created automatically on the first deploy after the
  Pages source is switched.
