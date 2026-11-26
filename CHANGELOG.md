# Changelog

## Version 37 (November 2026)

Rebuild of the page and how it gets its data.

- The page now reads every number from CSV files in `data/`. Before, the data was copied into `index.html`, so editing the CSVs didn't change the site.
- New structure: Home, The ENDS, Equity, Schools, Data. Equity, data status and sources were built before but weren't in the menu.
- Overview, Explore ENDS and Board View merged into one Home page with trend lines and data-status labels.
- Each measure has its own page: trend chart, results by scholar group, data status, the Board's question and school evidence.
- Phone layout: all five menu items fit on screen.
- White masthead, so the logo no longer sits in a white box on blue.
- One version number and data-as-of date, both set in `data/settings.csv`.
- Data refresh: all 19 measures now show 2022–2026 district results and scholar-group results from the GRPS ENDS Data Dive presented to the Board on November 6, 2026 (Office of Assessment and Evaluation). This includes 2025–26 chronic absence (40.4%), and all 19 measures now have results (9 before).
- Held back until confirmed: suspension results by group (the packet's figures look like shares of all scholars, not group rates) and the 2023 SAT EBRW result for White scholars (likely an entry error). Belonging for 2022 and 2023 uses the Board slide values (56.8%, 60.1%), confirmed accurate; 2022–23 group results are not shown.
- NWEA MAP Growth charts show Reading and Math as separate lines.
- School applicability fixed: elementary schools no longer list SAT, AP or postsecondary measures; high schools no longer list grades 3–7 M-STEP; Grade 3 and Grade 8 measures follow the grades each school serves.
- Removed the CSV upload tools (they depended on a missing function and saved data only in one browser). Data updates now go through the `data/` files.
- Duplicate root-level CSVs removed; source and audit files moved to `reference/`.

## Version 33

Header update:
- Uses the approved ENDS visual concept.
- Removes the white logo card from Version 32.
- Crops out the concept's nonfunctional mock navigation.
- Keeps the dashboard's actual navigation functional.
- Restyles the actual navigation as a blue/orange ribbon.
- Adds responsive behavior for tablet and phone.
- Preserves Version 32 dashboard content, data, and functions.

## Version 34

Fixes:
- Embedded the approved header artwork directly into index.html.
  This prevents the broken-image problem seen on GitHub Pages.
- Restyled the real dashboard navigation as a rounded blue/orange ribbon
  to more closely match the approved mockup.
- Preserved the dashboard's existing functional sections and data.
- No separate assets folder is required for the header in this version.

## Version 35
Data currency audit date: September 21, 2026

This build does not invent replacement values.

Verified release changes:
- Spring 2026 M-STEP/SAT/PSAT results are publicly available.
- 2025–26 attendance/chronic absenteeism is publicly available.
- Dashboard fields still showing older GRPS values are explicitly marked "latest loaded" where the new GRPS numeric value has not yet been extracted and validated.
- GRPS-local measures (MAP, AP, on-track credits, suspension, belonging) remain dependent on approved local extracts.
- Added ENDS_Data_Currency_Audit_2026-09-21.csv to document the currency state of every adopted measure.

## Version 36

Header redesign:
- Removed generated skyline artwork, decorative icons, script tagline, and marketing-style treatment.
- Returned to an institutional GRPS masthead built in HTML/CSS.
- Uses the official GRPS logo already used in the project.
- No white logo card.
- Keeps Board of Education Outcomes / ENDS Dashboard hierarchy.
- Retains Outcomes • Progress • Equity as a restrained text treatment.
- Simplifies navigation with an orange active indicator instead of a large orange tab.
- Preserves Version 35 data-currency work and dashboard functionality.

