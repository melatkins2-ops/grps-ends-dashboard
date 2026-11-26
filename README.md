# GRPS ENDS Dashboard

A clear view of the scholar outcomes the Board of Education has defined as success for GRPS (ENDS): graduation and advancement, academic achievement, and personal responsibility and belonging.

**Live site:** https://melatkins2-ops.github.io/grps-ends-dashboard/

## Pages

- **Home**: the headline result for each outcome area, its trend, the largest group gap, and which measures have newer data waiting.
- **The ENDS**: all 19 measures. Each measure has its own page with a trend chart, results by scholar group, data status and the Board's monitoring question.
- **Equity**: results by scholar group for any measure and year that has group data.
- **Schools**: building profile, chronic absence and school-level evidence for all 43 active schools.
- **Data**: where every number comes from, how current it is, what's next, and the data files.

Pages have their own links (for example `#measure/3.1` or `#schools/Union High`), so you can share a specific view.

## How it's built

- `index.html`, `styles.css` and `app.js` are the page. They contain no numbers.
- Every number lives in the `data/` folder as a CSV file. The page reads those files each time it opens.
- `reference/` holds source records, audits and templates that the page doesn't read (for example `DATA_PROVENANCE.csv`).

Because the page loads its data over the web, opening `index.html` straight from your computer shows a message instead of the dashboard. Use the live site, or run `python3 -m http.server` in this folder and open http://localhost:8000.

## Updating the data

1. Edit the file in `data/` on GitHub (or upload a new copy saved as CSV from Excel).
2. New result: add a row to `data/results.csv` with the measure ID, year, value and a note naming the source.
3. Update that measure's `DataStatus`, `NewestRelease` and `NextStep` in `data/measures.csv`. Use one of: `Up to date`, `New state data released`, `Waiting on GRPS data`, `Being checked`.
4. Change `data_as_of` in `data/settings.csv`.
5. Add the source to `reference/DATA_PROVENANCE.csv`.
6. Open a pull request. GitHub Pages publishes `main` within a minute or two of a merge.

Year convention in `results.csv`: the year a school year or test ends (`2025` = 2024–25, Spring 2025 or Class of 2025).

## Automated site check

Every pull request and every push to `main` runs **Site check** (`.github/workflows/site-check.yml`). It opens the site in a headless browser at desktop (1366px) and phone (390px) widths and fails if the page throws a JavaScript error, a file is missing, or the page scrolls sideways. See the Actions tab for results.

See `CHANGELOG.md` for version history.

Maintained by GRPS Community & Student Affairs.
