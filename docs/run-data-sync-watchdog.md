# Run Data Sync watchdog

`resetsix/running_page` is a public fork, so GitHub can mark scheduled workflows as
`disabled_fork`. When that happens, the fork's own scheduled workflow stops running.
Use this watchdog from a non-fork repository or any external cron host to keep
`run_data_sync.yml` active.

## One-off local recovery

```bash
GITHUB_TOKEN=$(gh auth token) node scripts/ensure-run-data-sync-active.mjs
GITHUB_TOKEN=$(gh auth token) TRIGGER_RUN=true node scripts/ensure-run-data-sync-active.mjs
```

## Recommended GitHub Actions watchdog

Create a small private, non-fork repository such as `running-page-watchdog`, add a
repository secret named `RUNNING_PAGE_PAT`, and store a fine-grained token that can
read/write Actions for `resetsix/running_page`. Then add this workflow there:

```yaml
name: Running page workflow watchdog

on:
  schedule:
    - cron: '7 0 * * *'
  workflow_dispatch:
    inputs:
      trigger_run:
        description: Trigger Run Data Sync after enabling
        required: false
        default: 'false'

jobs:
  ensure-active:
    runs-on: ubuntu-latest
    steps:
      - name: Ensure Run Data Sync is active
        env:
          GH_TOKEN: ${{ secrets.RUNNING_PAGE_PAT }}
          TRIGGER_RUN: ${{ github.event.inputs.trigger_run || 'false' }}
        run: |
          set -euo pipefail
          workflow='repos/resetsix/running_page/actions/workflows/run_data_sync.yml'
          state=$(gh api "$workflow" --jq .state)
          echo "run_data_sync.yml state: $state"
          if [ "$state" != "active" ]; then
            gh api --method PUT "$workflow/enable"
            echo "enabled run_data_sync.yml"
          fi
          if [ "$TRIGGER_RUN" = "true" ]; then
            gh workflow run run_data_sync.yml --repo resetsix/running_page --ref master
          fi
```

Keep the watchdog outside this fork. A workflow inside the fork cannot recover the
fork if GitHub disables scheduled workflows again.
