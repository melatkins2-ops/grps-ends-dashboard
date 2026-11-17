# GRPS ENDS Dashboard

A clear view of the scholar outcomes the Board of Education has defined as success for GRPS (ENDS): graduation and advancement, academic achievement, and personal responsibility and belonging, with progress and equity views.

**Live site:** https://melatkins2-ops.github.io/grps-ends-dashboard/

## What's here

- `index.html`: the dashboard (Outcomes, Progress, Equity, Explore Data)
- `Building_ENDS_*.csv`, `ENDS_Context_Data.csv`, `District_Subgroup_Context.csv`: the data the dashboard reads
- `DATA_PROVENANCE.csv`: where each value came from, its confidence, and caveats
- `ENDS_Data_Currency_Audit_*.csv`, `Building_Level_Data_Validation_Audit.csv`: data checks
- `ENDS_Data_Load_Template.csv`: the format for loading new data

## Good to know

- When data is refreshed, update the CSVs and add the source to `DATA_PROVENANCE.csv`.
- The page shows a data-currency date; update it with each refresh.

## Updating the site

Edit the files on a branch and open a pull request. GitHub Pages publishes `main` automatically, usually within a minute or two of a merge.

## Automated site check

Every pull request and every push to `main` runs **Site check** (`.github/workflows/site-check.yml`). It opens the site in a headless browser at desktop (1366px) and phone (390px) widths and fails if the page throws a JavaScript error, a local file or image is missing, or the page scrolls sideways. See the Actions tab for results.

Maintained by GRPS Community & Student Affairs.
