# Netlify Deployment

This fork uses a split setup:

- `GitHub` hosts the source code and runs data sync via GitHub Actions
- `Netlify` hosts the built static site
- `src/static/activities.json` is the main data artifact that future consumers can reuse

## Current architecture

- Repo: `https://github.com/resetsix/running_page`
- Branch: `master`
- Data sync workflow: `.github/workflows/run_data_sync.yml`
- Static hosting: Netlify
- Primary data file:
  - `https://raw.githubusercontent.com/resetsix/running_page/master/src/static/activities.json`

## Why this setup

- GitHub Actions already handles Keep sync and commits updated activity data back to the repo.
- Netlify only needs to rebuild when `master` changes.
- This keeps the deployment flow simple and makes the raw JSON reusable later from `blog-main`.

## GitHub setup

Make sure the repo secrets required by the selected `RUN_TYPE` are configured.

Current workflow defaults:

- `RUN_TYPE=keep`
- required secrets:
  - `KEEP_MOBILE`
  - `KEEP_PASSWORD`

Important workflow flags in this fork:

- `SAVE_DATA_IN_GITHUB_CACHE=false`
- `BUILD_GH_PAGES=false`

That means updated data is committed back to the repository and GitHub Pages is not used.

## Netlify setup

Import the GitHub repository into Netlify with these settings:

- Branch to deploy: `master`
- Build command: `pnpm build`
- Publish directory: `dist`

The repo already contains:

- `netlify.toml` for the build configuration
- a Netlify redirect rule for SPA routing, so refreshing `/summary` will not return `404`

## First deploy checklist

1. Connect Netlify to `resetsix/running_page`
2. Let Netlify read the existing `netlify.toml`
3. Run the first deploy
4. In GitHub Actions, manually trigger `Run Data Sync`
5. Confirm the workflow either commits new data or reports nothing new
6. Confirm Netlify rebuilds after the workflow push

## Later integration into `blog-main`

This Netlify site is a temporary standalone surface.

The long-term plan is to build a `/running` page inside `blog-main` and read the same data artifact directly from:

- `https://raw.githubusercontent.com/resetsix/running_page/master/src/static/activities.json`

That keeps `running_page` as the data producer and lets `blog-main` own the final presentation layer.
