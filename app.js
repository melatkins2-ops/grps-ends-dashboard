/* GRPS ENDS Dashboard
   All numbers live in the data/ folder as CSV files. To refresh the dashboard,
   edit those files; this script reads them every time the page opens. */
"use strict";

const FILES = {
  settings: "settings.csv",
  measures: "measures.csv",
  results: "results.csv",
  schools: "school_directory.csv",
  names: "school_names.csv",
  evidence: "school_evidence.csv",
  attendance: "school_attendance.csv",
  attendanceSub: "school_attendance_subgroups.csv",
  coverage: "school_ends_coverage.csv",
  population: "district_population.csv",
  mstep: "mstep_math_subgroups.csv",
  discipline: "discipline_context.csv"
};

const DOMAINS = [
  { name: "Graduation & Advancement", slug: "graduation",
    about: "Graduation, ninth-grade credits, SAT, advanced coursework and what graduates do next." },
  { name: "Academic Achievement", slug: "achievement",
    about: "Growth and proficiency from Grade 3 through high school, including English learner growth." },
  { name: "Personal Responsibility & Belonging", slug: "belonging",
    about: "Attendance, suspension and whether scholars feel they belong at school." }
];

const STATUS_STYLE = {
  "Up to date": "good",
  "New state data released": "warn",
  "Waiting on GRPS data": "",
  "Being checked": "info"
};

let D = {};          // loaded data, keyed like FILES
let S = {};          // settings

/* ---------- small helpers ---------- */
const $ = sel => document.querySelector(sel);
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = v => { if (v == null) return null; const s = String(v).trim().replace(/[%,$]/g, ""); if (!/^-?\d*\.?\d+$/.test(s)) return null; return parseFloat(s); };
const isPct = v => String(v || "").includes("%");
/* "R 44.5 / M 43.8" (reading / math) shows as "44.5 / 43.8" with a small label */
const COMPOSITE = /^R\s*([\d.]+)\s*\/\s*M\s*([\d.]+)$/;
const show = v => { const m = String(v || "").match(COMPOSITE); return m ? esc(m[1] + " / " + m[2]) : esc(v); };
const showNote = v => COMPOSITE.test(String(v || "")) ? `<div class="tiny muted">Reading / Math</div>` : "";
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fmtDiff = (d, pct) => (d > 0 ? "+" : d < 0 ? "−" : "") + Math.abs(d).toFixed(1) + (pct ? " pts" : "");

function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(x => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell); if (row.some(x => x !== "")) rows.push(row);
  const head = rows.shift().map(h => h.trim());
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

async function loadData() {
  const entries = await Promise.all(Object.entries(FILES).map(async ([key, file]) => {
    const res = await fetch("data/" + file, { cache: "no-cache" });
    if (!res.ok) throw new Error("Could not load data/" + file + " (" + res.status + ")");
    return [key, parseCSV(await res.text())];
  }));
  D = Object.fromEntries(entries);
  S = Object.fromEntries(D.settings.map(r => [r.Setting, r.Value]));
}

/* ---------- data access ---------- */
const measure = id => D.measures.find(m => m.MeasureID === id);
const domainOf = name => DOMAINS.find(d => d.name === name);
const districtRows = id => D.results.filter(r => r.MeasureID === id && !r.School && !r.Subgroup).sort((a, b) => +a.Year - +b.Year);
const subgroupRows = (id, yr) => D.results.filter(r => r.MeasureID === id && r.Subgroup && !r.School && (yr == null || +r.Year === +yr));
const numericRows = id => districtRows(id).filter(r => num(r.Value) !== null);
const latest = id => { const r = districtRows(id); return r[r.length - 1]; };

function yearLabel(id, y) {
  y = +y;
  if (["1.2a", "1.10"].includes(id)) return "Class of " + y;
  if (["1.3a", "1.3b", "2.3a", "2.3b", "2.4", "2.5", "2.6"].includes(id)) return "Spring " + y;
  return (y - 1) + "–" + String(y).slice(2);
}

/* direction of change, judged against the measure's "higher/lower is better" */
function change(m, from, to) {
  if (!from || !to) return null;
  const a = num(from.Value), b = num(to.Value);
  if (a === null || b === null) return null;
  const d = b - a;
  const good = d === 0 ? null : (m.Direction === "lower" ? d < 0 : d > 0);
  return { d, good, pct: isPct(to.Value), from };
}
function changeHTML(m, ch, vsText) {
  if (!ch) return "";
  if (ch.d === 0) return `<div class="change muted">No change ${vsText}</div>`;
  const cls = ch.good ? "up-good" : "up-bad";
  const arrow = ch.d > 0 ? "↑" : "↓";
  return `<div class="change ${cls}">${arrow} ${fmtDiff(ch.d, ch.pct)} <span class="muted">${vsText}</span></div>`;
}
function sinceFirst(m) {
  const rows = numericRows(m.MeasureID);
  if (rows.length < 2) return "";
  const ch = change(m, rows[0], rows[rows.length - 1]);
  return changeHTML(m, ch, "since " + yearLabel(m.MeasureID, rows[0].Year));
}
function vsPrior(m) {
  const rows = numericRows(m.MeasureID);
  if (rows.length < 2) return "";
  const ch = change(m, rows[rows.length - 2], rows[rows.length - 1]);
  return changeHTML(m, ch, "vs. " + yearLabel(m.MeasureID, rows[rows.length - 2].Year));
}
function statusChip(m) { return `<span class="chip ${STATUS_STYLE[m.DataStatus] || ""}">${esc(m.DataStatus)}</span>`; }

/* ---------- charts ---------- */
function sparkline(m) {
  const rows = numericRows(m.MeasureID);
  if (rows.length < 2) return "";
  const vals = rows.map(r => num(r.Value)), min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const W = 120, H = 38, P = 4;
  const pts = vals.map((v, i) => [P + i * (W - 2 * P) / (vals.length - 1), H - P - (v - min) / span * (H - 2 * P)]);
  const ch = change(m, rows[0], rows[rows.length - 1]);
  const color = !ch || ch.good === null ? "#5b6672" : ch.good ? "#2b7a57" : "#b0452c";
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend: ${rows.map(r => esc(r.Value)).join(", ")}">
    <polyline class="line" stroke="${color}" points="${pts.map(p => p.join(",")).join(" ")}"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${color}"/></svg>`;
}

function trendChart(m) {
  const rows = numericRows(m.MeasureID);
  const vals = rows.map(r => num(r.Value));
  const narrow = window.innerWidth < 640;
  const W = narrow ? 420 : 960, H = narrow ? 260 : 280, L = narrow ? 44 : 56, R = narrow ? 40 : 64, T = 34, B = 42;
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.35, Math.abs(max) * 0.05, 1);
  min = Math.max(0, min - pad); max = max + pad;
  const step = niceStep((max - min) / 4);
  min = Math.floor(min / step) * step; max = Math.ceil(max / step) * step;
  const x = i => L + (rows.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (rows.length - 1));
  const y = v => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const pct = isPct(rows[0].Value);
  let grid = "";
  for (let g = min; g <= max + 1e-9; g += step) {
    grid += `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}"/><text x="${L - 8}" y="${y(g) + 4}" text-anchor="end">${+g.toFixed(1)}${pct ? "%" : ""}</text>`;
  }
  const pts = rows.map((r, i) => [x(i), y(vals[i])]);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.Measure)} by year: ${rows.map(r => yearLabel(m.MeasureID, r.Year) + " " + r.Value).join(", ")}">
    <g class="grid">${grid}</g>
    <polyline fill="none" stroke="#1f5a94" stroke-width="3" points="${pts.map(p => p.join(",")).join(" ")}"/>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff" stroke="#1f5a94" stroke-width="3"/>
      <text class="val" x="${p[0]}" y="${p[1] - 12}" text-anchor="middle">${esc(rows[i].Value)}</text>
      <text x="${p[0]}" y="${H - 12}" text-anchor="middle">${esc(narrow ? String(yearLabel(m.MeasureID, rows[i].Year)).replace(/^(Class of|Spring) /, "") : yearLabel(m.MeasureID, rows[i].Year))}</text>`).join("")}
  </svg>`;
}
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function subgroupBars(m, yr) {
  const groups = subgroupRows(m.MeasureID, yr);
  const dist = D.results.find(r => r.MeasureID === m.MeasureID && +r.Year === +yr && !r.School && !r.Subgroup);
  const dv = dist ? num(dist.Value) : null;
  const vals = groups.map(g => num(g.Value));
  if (vals.some(v => v === null)) {
    return `<div class="table-wrap"><table><thead><tr><th>Group</th><th>Result</th></tr></thead><tbody>${groups.map(g => `<tr><td>${esc(g.Subgroup)}</td><td><b>${esc(g.Value)}</b></td></tr>`).join("")}</tbody></table></div>
      ${dist ? `<p class="small muted">District: ${esc(dist.Value)}</p>` : ""}`;
  }
  const scale = Math.max(...vals, dv || 0) * 1.05 || 1;
  const pct = isPct(groups[0].Value);
  const rows = groups.map((g, i) => ({ g, v: vals[i] })).sort((a, b) => b.v - a.v);
  return `<div class="bars">${rows.map(({ g, v }) => {
    const below = dv !== null && (m.Direction === "lower" ? v > dv : v < dv);
    return `<div class="bar"><div>${esc(g.Subgroup)}</div>
      <div class="track"><div class="fill ${below ? "low" : ""}" style="width:${(v / scale * 100).toFixed(1)}%"></div>
      ${dv !== null ? `<div class="dline" style="left:${(dv / scale * 100).toFixed(1)}%"></div>` : ""}</div>
      <div class="num">${esc(g.Value)}</div>
      <div class="diff">${dv !== null ? fmtDiff(v - dv, pct) : ""}</div></div>`;
  }).join("")}</div>
  ${dv !== null ? `<div class="legend"><i></i>District result: ${esc(dist.Value)}. Orange bars are below the district result.</div>` : ""}`;
}

/* the scholar group furthest behind the district result, latest year with group data (percentage measures) */
function biggestGap() {
  let best = null;
  D.measures.forEach(m => {
    const yrs = [...new Set(subgroupRows(m.MeasureID).map(r => +r.Year))].sort();
    const yr = yrs[yrs.length - 1]; if (!yr) return;
    const dist = D.results.find(r => r.MeasureID === m.MeasureID && +r.Year === yr && !r.School && !r.Subgroup);
    if (!dist || !isPct(dist.Value) || num(dist.Value) === null) return;
    const dv = num(dist.Value);
    subgroupRows(m.MeasureID, yr).forEach(g => {
      const v = num(g.Value); if (v === null) return;
      const behind = m.Direction === "lower" ? v - dv : dv - v;
      if (behind > 0 && (!best || behind > best.behind)) best = { m, yr, g, dist, behind };
    });
  });
  return best;
}

/* ---------- pages ---------- */
function pageHome() {
  const loaded = D.measures.filter(m => districtRows(m.MeasureID).length).length;
  const fresh = D.measures.filter(m => m.DataStatus === "New state data released");
  const gap = biggestGap();
  const cards = DOMAINS.map(dom => {
    const ms = D.measures.filter(m => m.Domain === dom.name && m.Headline).sort((a, b) => a.Headline - b.Headline);
    const [lead, ...rest] = ms;
    const lr = latest(lead.MeasureID);
    return `<article class="card domain-card">
      <div class="domain-name">${esc(dom.name)}</div>
      <a class="link-plain" href="#measure/${lead.MeasureID}" style="text-decoration:none;color:inherit">
        <div class="headline-row"><div class="big">${lr ? show(lr.Value) : "—"}</div>${sparkline(lead)}</div>${lr ? showNote(lr.Value) : ""}
        <div class="mname">${esc(lead.Measure)}</div>
        <div class="small muted">${lr ? esc(yearLabel(lead.MeasureID, lr.Year)) : "No result loaded yet"}</div>
        ${sinceFirst(lead)}
      </a>
      <div class="subrows">${rest.map(m => {
        const r = latest(m.MeasureID);
        return `<a class="subrow" href="#measure/${m.MeasureID}"><span><span class="mname2">${esc(m.Measure)}</span><br><span class="tiny muted">${r ? esc(yearLabel(m.MeasureID, r.Year)) : esc(m.DataStatus)}</span></span><span class="v">${r ? show(r.Value) : "—"}</span></a>`;
      }).join("")}</div>
      <div class="card-foot"><a class="link-arrow" href="#ends/${dom.slug}">All ${D.measures.filter(m => m.Domain === dom.name).length} measures →</a></div>
    </article>`;
  }).join("");

  return `<h2>How GRPS scholars are doing</h2>
  <p class="lede">The scholar outcomes the Board of Education has defined as success, with the latest result for each. ${loaded} of ${D.measures.length} ENDS measures have results loaded. Data as of ${esc(asOfText())}.</p>
  <div class="grid3">${cards}</div>
  <div class="section callouts">
    ${gap ? `<div class="callout"><div class="section-label">Largest gap</div>
      <h3>${esc(gap.m.Measure)}, ${esc(yearLabel(gap.m.MeasureID, gap.yr))}</h3>
      <p>${esc(gap.g.Subgroup)} scholars: <b>${esc(gap.g.Value)}</b>, ${gap.behind.toFixed(0)} points behind the district result of ${esc(gap.dist.Value)}.</p>
      <a class="link-arrow" href="#equity/${gap.m.MeasureID}">See all groups →</a></div>` : ""}
    <div class="callout navy"><div class="section-label">Data to add</div>
      <h3>${fresh.length} measure${fresh.length === 1 ? " has" : "s have"} newer state results not loaded yet</h3>
      <p>${fresh.map(m => esc(m.Measure)).join(", ")}.</p>
      <a class="link-arrow" href="#data">See data status →</a></div>
  </div>
  <p class="note">Results are described without On Track / Off Track labels until the Board adopts targets for each measure. Differences between groups describe outcomes; they don't explain causes.</p>`;
}

function pageEnds(focus) {
  return `<h2>The ENDS</h2>
  <p class="lede">All ${D.measures.length} measures the Board monitors, grouped by outcome area. Select a measure to see its trend, groups, source and the question it raises.</p>
  ${DOMAINS.map(dom => `<div class="domain-head" id="d-${dom.slug}"><div><h3 style="font-size:21px">${esc(dom.name)}</h3><div class="small muted">${esc(dom.about)}</div></div></div>
    <div class="mlist">${D.measures.filter(m => m.Domain === dom.name).map(m => {
      const r = latest(m.MeasureID);
      return `<a class="mrow" href="#measure/${m.MeasureID}">
        <div><span class="mid">${esc(m.MeasureID)}</span> <span class="mname2">${esc(m.Measure)}</span><div class="small muted">${esc(m.Definition)}</div></div>
        <div><div class="mval">${r ? show(r.Value) : "—"}</div>${r ? showNote(r.Value) : ""}<div class="tiny muted">${r ? esc(yearLabel(m.MeasureID, r.Year)) : "Not loaded"}</div></div>
        <div class="spark-cell">${sparkline(m)}</div>
        <div class="status">${statusChip(m)}</div></a>`;
    }).join("")}</div>`).join("")}`;
}

function pageMeasure(id) {
  const m = measure(id);
  if (!m) return notFound();
  const rows = districtRows(id), nrows = numericRows(id), r = rows[rows.length - 1];
  const dom = domainOf(m.Domain);
  const subYears = [...new Set(subgroupRows(id).map(x => +x.Year))].sort();
  const subYr = subYears[subYears.length - 1];
  const ev = D.evidence.filter(x => x.MeasureID === id);
  let trend;
  if (nrows.length >= 2) trend = trendChart(m);
  else if (rows.length) trend = `<div class="empty">Only one result is loaded so far, so there's no trend yet.</div>`;
  else trend = `<div class="empty"><b>No GRPS result is loaded for this measure yet.</b><br>${esc(m.NextStep)}</div>`;

  return `<a class="back" href="#ends/${dom ? dom.slug : ""}">← ${esc(m.Domain)}</a>
  <div class="eyebrow">ENDS ${esc(m.MeasureID)}</div>
  <h2>${esc(m.Measure)}</h2>
  <p class="lede">${esc(m.Definition)}. ${m.Direction === "lower" ? "Lower is better." : "Higher is better."}</p>
  <div class="measure-top">
    <div class="card">
      <div class="section-label">Latest result</div>
      <div class="big">${r ? show(r.Value) : "—"}</div>${r ? showNote(r.Value) : ""}
      <div class="small muted">${r ? esc(yearLabel(id, r.Year)) : "Not loaded yet"}</div>
      ${vsPrior(m)}${sinceFirst(m)}
    </div>
    <div class="card">
      <div class="section-label">Where the data stand</div>
      <p style="margin:0 0 10px">${statusChip(m)}</p>
      <dl class="kv"><dt>Source</dt><dd>${esc(m.Source)}</dd><dt>Newest release</dt><dd>${esc(m.NewestRelease)}</dd><dt>Next step</dt><dd>${esc(m.NextStep)}</dd></dl>
    </div>
  </div>
  <div class="card"><div class="section-label">Trend</div>${trend}
    ${rows.length ? `<details><summary>Notes on these numbers</summary><ul>${rows.map(x => `<li><b>${esc(yearLabel(id, x.Year))}: ${esc(x.Value)}</b>. ${esc(x.Note)}</li>`).join("")}</ul></details>` : ""}
  </div>
  ${subYr ? `<div class="card section"><div class="section-label">By scholar group, ${esc(yearLabel(id, subYr))}</div>${subgroupBars(m, subYr)}
    <p class="small"><a href="#equity/${id}">Compare other years in Equity →</a></p></div>` : ""}
  ${m.MonitoringQuestion ? `<div class="question section"><div class="section-label">Question for the Board</div><p>${esc(m.MonitoringQuestion)}</p></div>` : ""}
  ${ev.length ? `<div class="section"><div class="section-label">School evidence for this measure</div><div class="evidence">${ev.map(evCard).join("")}</div></div>` : ""}`;
}

function evCard(x, showSchool = true) {
  return `<div class="ev"><div class="tiny muted">${esc(showSchool ? x.School : x.Type)}</div><div class="v">${esc(x.Value)}</div>
    <div class="mname2">${esc(x.Metric)}</div><div class="tiny muted">${esc(x.ValidatedPeriod || x.Period)}${x.ValidationStatus ? " · " + esc(x.ValidationStatus) : ""}</div>
    ${x.Detail ? `<p class="small" style="margin:8px 0 0">${esc(x.Detail)}</p>` : ""}</div>`;
}

function pageEquity(id, yr) {
  const withSub = D.measures.filter(m => subgroupRows(m.MeasureID).length);
  let m = measure(id);
  if (!m || !subgroupRows(m.MeasureID).length) m = measure("2.6") && subgroupRows("2.6").length ? measure("2.6") : withSub[0];
  const yrs = [...new Set(subgroupRows(m.MeasureID).map(r => +r.Year))].sort();
  if (!yrs.includes(+yr)) yr = yrs[yrs.length - 1];
  const dist = D.results.find(r => r.MeasureID === m.MeasureID && +r.Year === +yr && !r.School && !r.Subgroup);
  const mstepGroups = [...new Set(D.mstep.map(x => x.Subgroup))];
  const disc = D.discipline[0];
  return `<h2>Equity</h2>
  <p class="lede">How results differ across scholar groups. Groups with fewer than 10 scholars aren't shown.</p>
  <div class="controls">
    <label>Measure<select id="eqMeasure">${withSub.map(x => `<option value="${x.MeasureID}" ${x === m ? "selected" : ""}>${esc(x.MeasureID)} · ${esc(x.Measure)}</option>`).join("")}</select></label>
    <label>Year<select id="eqYear">${yrs.map(y => `<option value="${y}" ${y === +yr ? "selected" : ""}>${esc(yearLabel(m.MeasureID, y))}</option>`).join("")}</select></label>
  </div>
  <div class="card">
    <h3>${esc(m.Measure)}, ${esc(yearLabel(m.MeasureID, yr))}</h3>
    <div class="small muted">${dist ? "District: " + esc(dist.Value) + " · " : ""}${m.Direction === "lower" ? "Lower is better" : "Higher is better"} · <a href="#measure/${m.MeasureID}">Measure details</a></div>
    ${subgroupBars(m, yr)}
  </div>
  <div class="section grid2">
    <div class="card"><div class="section-label">Who GRPS serves, 2024–25</div>
      <div class="chips">${D.population.map(x => `<div class="pop">${esc(x.Subgroup)}<b>${esc(x.Value)}</b></div>`).join("")}</div></div>
    ${disc ? `<div class="card"><div class="section-label">Discipline, 2024–25</div>
      <p style="margin:0">${esc(disc.Subgroup)} scholars were <b>${esc(disc.PopulationShare)}</b> of enrollment and <b>${esc(disc.IncidentShare)}</b> of suspension incidents.</p>
      <p class="small muted">This compares shares of incidents, not individual suspension rates.</p></div>` : ""}
  </div>
  <details class="card section" style="margin-top:18px"><summary>M-STEP Math by group and grade, Spring 2025</summary>
    <p class="small muted">Grade-level context only. Not combined into ENDS 2.3b because group denominators aren't available in this source.</p>
    <div class="table-wrap"><table><thead><tr><th>Group</th>${[3, 4, 5, 6, 7].map(g => `<th>Grade ${g}</th>`).join("")}</tr></thead><tbody>
    ${mstepGroups.map(sg => `<tr><td>${esc(sg)}</td>${[3, 4, 5, 6, 7].map(g => { const r = D.mstep.find(x => x.Subgroup === sg && +x.Grade === g); return `<td>${r ? esc(r.Value) : "—"}</td>`; }).join("")}</tr>`).join("")}
    </tbody></table></div></details>`;
}

function pageSchools(name) {
  const schools = D.schools.map(s => s.School).sort((a, b) => a.localeCompare(b));
  if (name && !schools.includes(name)) name = "";
  let body;
  if (!name) {
    body = `<div class="empty">Choose a school to see its profile, chronic absence and any school-level ENDS evidence. District results remain the Board's main monitoring view.</div>`;
  } else body = schoolProfile(name);
  return `<h2>Schools</h2>
  <p class="lede">Building-level ENDS data for all ${schools.length} active GRPS schools. Measures that don't apply to a school's grades are left out.</p>
  <div class="controls"><label>School<select id="schoolSel"><option value="">Choose a school</option>${schools.map(s => `<option ${s === name ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label></div>
  ${body}`;
}

function schoolProfile(name) {
  const meta = D.schools.find(s => s.School === name) || {};
  const nm = D.names.find(s => s.School === name) || {};
  const att = D.attendance.filter(x => x.School === name).sort((a, b) => +a.Year - +b.Year);
  const sub = D.attendanceSub.filter(x => x.School === name);
  const cov = D.coverage.filter(x => x.School === name && x.Applicability === "Applicable");
  const ev = D.evidence.filter(x => x.School === name);
  const ca = measure("3.1");
  let h = `<div class="card"><div class="small muted">${esc(meta.GradeSpan || "")}${nm.FormerName ? " · Formerly " + esc(nm.FormerName) : ""}</div>
    <h3 style="font-size:22px">${esc(name)}</h3>
    <div class="stats">
      <div class="stat"><span>Scholars</span><b>${esc(meta.Enrollment || "—")}</b></div>
      <div class="stat"><span>Free/reduced lunch</span><b>${meta.FRL ? esc(meta.FRL) + "%" : "—"}</b></div>
      <div class="stat"><span>English learners</span><b>${meta.EL ? esc(meta.EL) + "%" : "—"}</b></div>
      <div class="stat"><span>Special education</span><b>${meta.SE ? esc(meta.SE) + "%" : "—"}</b></div>
    </div></div>`;

  h += `<div class="card section"><div class="section-label">Chronic absence (ENDS 3.1)</div>`;
  if (att.length) {
    const cur = att[att.length - 1], prev = att[att.length - 2];
    const dist = D.results.find(r => r.MeasureID === "3.1" && r.Year === cur.Year && !r.School && !r.Subgroup);
    const ch = prev ? change(ca, prev, cur) : null;
    h += `<div class="grid3" style="gap:12px">
      <div><div class="big big-sm">${esc(cur.Value)}</div><div class="small muted">${esc(yearLabel("3.1", cur.Year))} · ${esc(cur.ChronicAbsent)} of ${esc(cur.Population)} scholars</div></div>
      ${prev ? `<div><div class="big big-sm">${esc(prev.Value)}</div><div class="small muted">${esc(yearLabel("3.1", prev.Year))}</div>${changeHTML(ca, ch, "change")}</div>` : ""}
      ${dist ? `<div><div class="big big-sm">${esc(dist.Value)}</div><div class="small muted">District, ${esc(yearLabel("3.1", dist.Year))}</div></div>` : ""}
    </div>`;
    if (sub.length) {
      const cats = [...new Set(sub.map(x => x.Category))];
      h += `<details><summary>Chronic absence by scholar group, ${esc(yearLabel("3.1", sub[0].Year))}</summary>
        <p class="small muted">Groups with fewer than 10 scholars are suppressed.</p>
        ${cats.map(c => `<div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>${esc(c)}</th><th>Chronic absence</th><th>Scholars</th></tr></thead><tbody>
        ${sub.filter(x => x.Category === c).sort((a, b) => num(b.Value) - num(a.Value)).map(x => `<tr><td>${esc(x.Subgroup)}</td><td><b>${esc(x.Value)}</b></td><td>${esc(x.N)}</td></tr>`).join("")}</tbody></table></div>`).join("")}
      </details>`;
    }
  } else h += `<p class="muted" style="margin:0">No chronic absence record for this building in the attendance source.</p>`;
  h += `</div>`;

  if (cov.length) {
    const has = cov.filter(x => x.DataStatus === "Validated data loaded").length;
    h += `<div class="card section"><div class="section-label">ENDS measures that apply here</div>
      <p class="small muted" style="margin:0">${has} of ${cov.length} have building data loaded.</p>
      <div class="cov">${cov.map(x => `<div class="${x.DataStatus === "Validated data loaded" ? "has" : ""}"><b>${esc(x.Measure)}</b>${x.LatestValue ? esc(x.LatestValue) + (x.LatestPeriod ? " · " + esc(/^\d{4}$/.test(x.LatestPeriod) ? yearLabel(x.MeasureID, x.LatestPeriod) : x.LatestPeriod) : "") : `<span class="muted">${esc(x.DataStatus)}</span>`}</div>`).join("")}</div></div>`;
  }
  if (ev.length) h += `<div class="section"><div class="section-label">School evidence (CNA and state reports)</div><div class="evidence">${ev.map(x => evCard(x, false)).join("")}</div></div>`;
  return h;
}

function pageData() {
  const counts = {};
  D.measures.forEach(m => counts[m.DataStatus] = (counts[m.DataStatus] || 0) + 1);
  const files = [
    ["settings.csv", "Data-as-of date and version shown on every page"],
    ["measures.csv", "The 19 ENDS measures: definitions, sources, data status, next step, Board question"],
    ["results.csv", "District results by year, plus scholar-group results"],
    ["school_directory.csv", "Schools, grade spans and enrollment profile"],
    ["school_names.csv", "School names, former names and codes"],
    ["school_attendance.csv", "Chronic absence by school"],
    ["school_attendance_subgroups.csv", "Chronic absence by school and scholar group"],
    ["school_ends_coverage.csv", "Which measures apply to each school and what's loaded"],
    ["school_evidence.csv", "School CNA and state-report evidence"],
    ["district_population.csv", "Who GRPS serves"],
    ["mstep_math_subgroups.csv", "M-STEP Math by group and grade"],
    ["discipline_context.csv", "Discipline disproportionality context"]
  ];
  return `<h2>Data</h2>
  <p class="lede">Where every number comes from, how current it is, and what's next. Data as of ${esc(asOfText())}.</p>
  <div class="counts">${Object.keys(STATUS_STYLE).map(s => `<div class="count"><b>${counts[s] || 0}</b>${statusChipText(s)}</div>`).join("")}</div>
  <div class="table-wrap"><table><thead><tr><th>Measure</th><th>Latest loaded</th><th>Status</th><th>Newest release</th><th>Next step</th></tr></thead><tbody>
  ${D.measures.map(m => { const r = latest(m.MeasureID); return `<tr><td><a href="#measure/${m.MeasureID}">${esc(m.MeasureID)} · ${esc(m.Measure)}</a><div class="tiny muted">${esc(m.Source)}</div></td><td>${r ? show(r.Value) + "<div class='tiny muted'>" + esc(yearLabel(m.MeasureID, r.Year)) + "</div>" : "—"}</td><td>${statusChip(m)}</td><td>${esc(m.NewestRelease)}</td><td class="small">${esc(m.NextStep)}</td></tr>`; }).join("")}
  </tbody></table></div>

  <div class="section grid2">
    <div class="card"><h3>Reading these numbers</h3><ul class="small" style="padding-left:18px;margin:6px 0 0">
      <li>Graduation inclusion rules changed with the Class of 2023. Earlier published rates weren't recalculated.</li>
      <li>The SAT moved to a digital format in Spring 2024. Compare across that year with care.</li>
      <li>Chronic absence for 2022–23 is a rounded GRPS CNA value. From 2023–24 on, values come from MI School Data.</li>
      <li>Suspension rates are calculated from GRPS CNA counts and are still being validated.</li>
      <li>Postsecondary enrollment uses "within six months"; the adopted ENDS wording is "fall after graduation."</li>
      <li>Results for groups with fewer than 10 scholars are suppressed.</li>
      <li>No value is estimated or carried forward. Missing results stay missing.</li>
    </ul></div>
    <div class="card"><h3>How to update the dashboard</h3><ol class="steps small">
      <li>Open the file in the <code>data</code> folder on GitHub and choose Edit (or upload a new copy saved as CSV from Excel).</li>
      <li>For new results, add a row to <code>results.csv</code>: measure ID, year, value and a note naming the source.</li>
      <li>Update the measure's status and next step in <code>measures.csv</code>.</li>
      <li>Change <code>data_as_of</code> in <code>settings.csv</code>.</li>
      <li>Open a pull request. The site check runs automatically; once merged, the live site updates in a minute or two.</li>
    </ol></div>
  </div>
  <div class="card section"><h3>Data files</h3><ul class="files">${files.map(([f, d]) => `<li><a href="data/${f}" download>${f}</a><br><span class="tiny muted">${d}</span></li>`).join("")}</ul>
  <p class="small muted">Source records, audits and templates are in the <code>reference</code> folder of the repository.</p></div>`;
}
function statusChipText(s) { return `<span class="chip ${STATUS_STYLE[s]}">${esc(s)}</span>`; }

function notFound() { return `<h2>Page not found</h2><p><a href="#home">Back to Home</a></p>`; }

/* ---------- router ---------- */
function asOfText() {
  const d = new Date((S.data_as_of || "") + "T12:00:00");
  return isNaN(d) ? (S.data_as_of || "") : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function route() {
  const [tab, a, b] = decodeURIComponent(location.hash.replace(/^#/, "")).split("/");
  let html, active = tab || "home", scrollTarget = null;
  switch (tab || "home") {
    case "home": html = pageHome(); break;
    case "ends": html = pageEnds(); scrollTarget = a ? "d-" + a : null; break;
    case "measure": html = pageMeasure(a); active = "ends"; break;
    case "equity": html = pageEquity(a, b); break;
    case "schools": html = pageSchools(a); break;
    case "data": html = pageData(); break;
    default: html = notFound();
  }
  const main = $("#main");
  main.innerHTML = html;
  document.querySelectorAll(".tabs a").forEach(x => x.toggleAttribute("aria-current", false));
  const t = document.querySelector(`.tabs a[data-tab="${active}"]`);
  if (t) t.setAttribute("aria-current", "page");
  const h2 = main.querySelector("h2");
  document.title = (h2 && tab && tab !== "home" ? h2.textContent + " · " : "") + "GRPS ENDS Dashboard";
  wire();
  const el = scrollTarget && document.getElementById(scrollTarget);
  if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
}

function wire() {
  const eqM = $("#eqMeasure"), eqY = $("#eqYear"), sch = $("#schoolSel");
  if (eqM) eqM.onchange = () => { location.hash = "#equity/" + eqM.value; };
  if (eqY) eqY.onchange = () => { location.hash = "#equity/" + eqM.value + "/" + eqY.value; };
  if (sch) sch.onchange = () => { location.hash = "#schools/" + encodeURIComponent(sch.value); };
}

async function start() {
  try {
    await loadData();
  } catch (e) {
    $("#main").innerHTML = `<div class="empty"><b>The dashboard data didn't load.</b><br>${esc(e.message)}.<br>
      If you opened this file directly from your computer, open the live site instead: the page reads its data from the <code>data</code> folder over the web.</div>`;
    return;
  }
  $("#asof").innerHTML = `Data as of<br><b>${esc(asOfText())}</b>`;
  $("#footer").innerHTML = `GRPS ENDS Dashboard · Version ${esc(S.version || "")} · Data as of ${esc(asOfText())} · Maintained by GRPS Community &amp; Student Affairs`;
  window.addEventListener("hashchange", route);
  route();
}
start();
