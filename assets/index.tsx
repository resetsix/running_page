export const yearStats = import.meta.glob('./year_*.svg', { import: 'ReactComponent' })
export const yearSummaryStats = import.meta.glob(['./year_summary_*.svg', './year_summary_*.en.svg'], { import: 'ReactComponent' })
export const githubYearStats = import.meta.glob(['./github_*.svg', './github_*.en.svg'], { import: 'ReactComponent' })
export const totalStat = import.meta.glob(
  [
    './github.svg',
    './github.en.svg',
    './grid.svg',
    './grid.en.svg',
    './mol.svg',
    './mol.en.svg',
    './mol_*.svg',
    './mol_*.en.svg',
  ],
  { import: 'ReactComponent' }
)
