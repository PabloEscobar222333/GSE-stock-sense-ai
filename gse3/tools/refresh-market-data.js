#!/usr/bin/env node
/* ================================================================
   GSE StockSense AI — Market data refresher
   ----------------------------------------------------------------
   Keeps two files up to date:
     tools/history.json   full daily closing-price history for every GSE
                          equity + the GSE Composite Index (used by
                          tools/backtest.js; not loaded by the app)
     js/market-data.js    what the app loads: company info, the last ~1
                          year of closes per stock, and Ghana macro data

   Modes
     node tools/refresh-market-data.js           daily (seconds): append
         today's closing prices from the GSE API (weekdays, after the
         15:00 GMT close, skipping days with no trading) and refresh macro.
         On Saturdays, or if more than one trading day is missing, it
         switches to a full refresh automatically.
     node tools/refresh-market-data.js --full    full rebuild of price
         history from afx.kwayisi.org. That site asks crawlers for a 60s
         delay (robots.txt), so this takes ~40 minutes.
     --fill-missing                               re-download only stocks/index with no history
     --macro-only                                 just refresh macro data
     --dry-run                                    don't write any files
     --now=<ISO time>                             pretend it's this time (testing)

   Sources
     Prices:  dev.kwayisi.org/apis/gse (live), afx.kwayisi.org (history)
     Macro:   Bank of Ghana homepage (policy rate, inflation, 91-day T-bill)
              fawazahmed0/currency-api (USD/GHS, gold)
              FRED PCOCOUSDM (IMF monthly cocoa price)
              World Bank NY.GDP.MKTP.KD.ZG (annual GDP growth)

   Requires Node 18+ (built-in fetch).
   ================================================================ */
const fs = require('fs');
const path = require('path');

const API = 'https://dev.kwayisi.org/apis/gse';
const CHART = 'https://afx.kwayisi.org/chart/gse/';
const CHART_DELAY_MS = 60 * 1000;   // robots.txt Crawl-delay: 60
const APP_CLOSES = 260;             // ~1 trading year shipped to the browser
const MARKET_CLOSE_UTC = 15.5;      // GSE trades 10:00–15:00 GMT; wait until 15:30
const ROOT = path.join(__dirname, '..');
const HISTORY = path.join(__dirname, 'history.json');
const OUT = path.join(ROOT, 'js', 'market-data.js');
const HEADERS = { 'User-Agent': 'StockSense-GSE-refresh/2.0 (+educational project)' };

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
// --now=2026-11-09T16:30:00Z pretends it's that time (for testing the daily logic)
const nowArg = process.argv.find(a => a.startsWith('--now='));
const now = () => nowArg ? new Date(nowArg.slice(6)) : new Date();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const isoDay = d => d.toISOString().slice(0, 10);
const isWeekday = iso => ![0, 6].includes(new Date(iso + 'T12:00:00Z').getUTCDay());

// Retries network errors and 5xx responses (3 attempts, 10s then 30s apart)
async function get(url, type = 'json') {
  let lastErr;
  for (const wait of [0, 10000, 30000]) {
    if (wait) await sleep(wait);
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      if (!res.ok) {
        lastErr = new Error(`${url} → HTTP ${res.status}`);
        if (res.status < 500) throw lastErr;   // 4xx won't fix itself
        continue;
      }
      return type === 'json' ? await res.json() : await res.text();
    } catch (e) {
      lastErr = e;
      if (/HTTP 4\d\d/.test(e.message)) throw e;
    }
  }
  throw lastErr;
}

/* ── Price history ─────────────────────────────────────────────── */
// The chart endpoint is a Highcharts script containing [d("YYYY-MM-DD"),close] pairs
async function getChart(slug) {
  // An empty slug is the GSE Composite Index chart
  const js = await get(slug ? CHART + slug : CHART.replace(/\/$/, ''), 'text');
  return [...js.matchAll(/\[d\("(\d{4}-\d{2}-\d{2})"\),\s*([\d.]+)\]/g)]
    .map(m => [m[1], Number(m[2])])
    .filter(([, c]) => c > 0);
}

async function fullRefresh(history) {
  const live = await get(`${API}/live`);
  const tickers = live.map(x => x.name).filter(Boolean);
  log(`Full refresh of ${tickers.length} equities + GSE-CI (~${tickers.length + 1} min)`);
  const stocks = {};
  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    let info = {};
    try { info = await get(`${API}/equities/${t}`); } catch (e) { log(`  info ${t}: ${e.message}`); }
    let closes = [];
    try { closes = await getChart(t.toLowerCase()); } catch (e) { log(`  closes ${t}: ${e.message}`); }
    const prev = history.stocks?.[t];
    if (!closes.length && prev) closes = prev.closes; // keep what we had if the download failed
    const c = info.company || {};
    stocks[t] = { ticker: t, name: c.name || prev?.name || t, gseSector: c.sector || prev?.gseSector || null, industry: c.industry || prev?.industry || null, shares: info.shares || prev?.shares || null, closes };
    log(`[${i + 1}/${tickers.length}] ${t}: ${closes.length} closes${closes.length ? ` (${closes[0][0]} → ${closes[closes.length - 1][0]})` : ''}`);
    await sleep(CHART_DELAY_MS);
  }
  let index = history.index || [];
  try { index = await getChart(''); log(`GSE-CI: ${index.length} closes`); } catch (e) { log(`  GSE-CI: ${e.message}`); }
  return { ...history, stocks, index, fullRefreshAt: new Date().toISOString() };
}

// Re-download only stocks (and the index) whose history is empty — e.g. after a network drop
async function fillMissing(history) {
  const missing = Object.values(history.stocks).filter(s => !s.closes.length);
  log(`Filling ${missing.length} stocks${history.index?.length ? '' : ' + GSE-CI'}`);
  for (const s of missing) {
    try {
      const info = await get(`${API}/equities/${s.ticker}`);
      const c = info.company || {};
      Object.assign(s, { name: c.name || s.name, gseSector: c.sector || s.gseSector, industry: c.industry || s.industry, shares: info.shares || s.shares });
    } catch (e) { log(`  info ${s.ticker}: ${e.message}`); }
    try { s.closes = await getChart(s.ticker.toLowerCase()); } catch (e) { log(`  closes ${s.ticker}: ${e.message}`); }
    log(`  ${s.ticker}: ${s.closes.length} closes`);
    await sleep(CHART_DELAY_MS);
  }
  if (!history.index?.length) {
    try { history.index = await getChart(''); log(`  GSE-CI: ${history.index.length} closes`); } catch (e) { log(`  GSE-CI: ${e.message}`); }
  }
  return history;
}

// Expected trading weekdays strictly between two ISO dates
function weekdaysBetween(a, b) {
  const out = [];
  const d = new Date(a + 'T12:00:00Z');
  for (d.setUTCDate(d.getUTCDate() + 1); isoDay(d) < b; d.setUTCDate(d.getUTCDate() + 1)) {
    if (isWeekday(isoDay(d))) out.push(isoDay(d));
  }
  return out;
}

// Returns the updated history, or null if a full refresh is needed instead
async function dailyAppend(history) {
  const at = now();
  const today = isoDay(at);
  const hourUtc = at.getUTCHours() + at.getUTCMinutes() / 60;
  if (!isWeekday(today)) { log('Weekend — no session to record'); return history; }
  if (hourUtc < MARKET_CLOSE_UTC) { log(`Market not closed yet (${hourUtc.toFixed(2)} UTC) — not recording today's close`); return history; }

  const lastDates = Object.values(history.stocks).map(s => s.closes.at(-1)?.[0]).filter(Boolean).sort();
  const lastSession = lastDates.at(-1);
  const missing = lastSession ? weekdaysBetween(lastSession, today) : [];
  // One missing weekday is usually a public holiday; more than that means runs were missed
  if (missing.length > 1) { log(`Missing ${missing.length} trading days since ${lastSession} — need a full refresh`); return null; }

  const live = await get(`${API}/live`);
  const totalVolume = live.reduce((sum, x) => sum + (Number(x.volume) || 0), 0);
  if (totalVolume === 0) { log('No trades recorded today (holiday?) — skipping'); return history; }

  let appended = 0, added = 0;
  for (const x of live) {
    const price = Number(x.price);
    if (!x.name || !(price > 0)) continue;
    let s = history.stocks[x.name];
    if (!s) {
      // New listing — fetch its company info; history starts today
      let info = {};
      try { info = await get(`${API}/equities/${x.name}`); } catch {}
      const c = info.company || {};
      s = history.stocks[x.name] = { ticker: x.name, name: c.name || x.name, gseSector: c.sector || null, industry: c.industry || null, shares: info.shares || null, closes: [] };
      added++;
    }
    const last = s.closes.at(-1);
    if (last && last[0] === today) last[1] = price;
    else { s.closes.push([today, price]); appended++; }
  }
  log(`Recorded ${today} closes for ${appended} stocks${added ? ` (${added} new listings)` : ''}`);
  return history;
}

/* ── Macro ─────────────────────────────────────────────────────── */
const CURRENCY_API = [
  d => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${d}/v1/currencies/usd.min.json`,
  d => `https://${d}.currency-api.pages.dev/v1/currencies/usd.min.json`,
];
async function currencies(date) {
  for (const url of CURRENCY_API) {
    try { return await get(url(date)); } catch {}
  }
  throw new Error(`currency-api ${date} unavailable`);
}

// The BoG homepage shows each headline figure as "<value> <label>"
function bogFigure(text, label) {
  const i = text.indexOf(label);
  if (i < 0) return null;
  const nums = text.slice(Math.max(0, i - 200), i).match(/-?\d+(?:\.\d+)?/g);
  return nums ? Number(nums.at(-1)) : null;
}

async function refreshMacro(prev = {}) {
  const m = { ...prev };
  const today = isoDay(new Date());
  const stamp = (key, value, asOf, source) => {
    if (value === null || value === undefined || Number.isNaN(value)) return;
    const old = prev[key];
    // Keep the last different value so the app can show how it changed
    const previous = old && old.value !== value ? { value: old.value, asOf: old.asOf } : old?.previous || null;
    m[key] = { value, asOf, source, previous };
  };

  try {
    const html = await get('https://www.bog.gov.gh/', 'text');
    const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
    stamp('policyRate', bogFigure(text, 'Current Monetary Policy Rate'), today, 'Bank of Ghana');
    stamp('inflation',  bogFigure(text, 'Current inflation rate'), today, 'Bank of Ghana');
    stamp('tbill91',    bogFigure(text, '91-Day Treasury Bill Rate'), today, 'Bank of Ghana');
    log(`BoG: policy ${m.policyRate?.value}%, inflation ${m.inflation?.value}%, 91-day ${m.tbill91?.value}%`);
  } catch (e) { log(`BoG: ${e.message}`); }

  try {
    const latest = await currencies('latest');
    const d = new Date(latest.date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1);
    let before = null;
    try { before = await currencies(isoDay(d)); } catch {}
    const ghs = latest.usd.ghs, gold = 1 / latest.usd.xau;
    m.usdGhs = { value: +ghs.toFixed(4), asOf: latest.date, source: 'currency-api (daily reference rate)',
                 changePct: before ? +((ghs / before.usd.ghs - 1) * 100).toFixed(2) : null };
    m.goldOz = { value: +gold.toFixed(2), asOf: latest.date, source: 'currency-api (XAU)',
                 changePct: before ? +((gold / (1 / before.usd.xau) - 1) * 100).toFixed(2) : null };
    log(`FX: USD/GHS ${m.usdGhs.value}, gold $${m.goldOz.value}/oz`);
  } catch (e) { log(`FX/gold: ${e.message}`); }

  try {
    const csv = await get('https://fred.stlouisfed.org/graph/fredgraph.csv?id=PCOCOUSDM', 'text');
    const rows = csv.trim().split('\n').slice(1).map(r => r.split(',')).filter(r => r[1] && r[1] !== '.');
    const [d1, v1] = rows.at(-1), [, v0] = rows.at(-2);
    m.cocoaTon = { value: Math.round(Number(v1)), asOf: d1.slice(0, 7), source: 'IMF via FRED (monthly average)',
                   changePct: +((Number(v1) / Number(v0) - 1) * 100).toFixed(1) };
    log(`Cocoa: $${m.cocoaTon.value}/t (${m.cocoaTon.asOf})`);
  } catch (e) { log(`Cocoa: ${e.message}`); }

  try {
    const wb = await get('https://api.worldbank.org/v2/country/GHA/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=10');
    const row = (wb[1] || []).find(r => r.value !== null);
    if (row) m.gdpGrowth = { value: +row.value.toFixed(1), asOf: row.date, source: 'World Bank (annual)' };
    log(`GDP growth: ${m.gdpGrowth?.value}% (${m.gdpGrowth?.asOf})`);
  } catch (e) { log(`GDP: ${e.message}`); }

  m.updatedAt = new Date().toISOString();
  return m;
}

/* ── Output ────────────────────────────────────────────────────── */
function writeFiles(history) {
  if (DRY) { log('Dry run — not writing files'); return; }
  fs.writeFileSync(HISTORY, JSON.stringify(history));
  const app = {
    generatedAt: new Date().toISOString(),
    sources: ['dev.kwayisi.org/apis/gse', 'afx.kwayisi.org', 'bog.gov.gh', 'currency-api', 'FRED', 'World Bank'],
    macro: history.macro || {},
    stocks: Object.values(history.stocks).map(s => ({ ...s, closes: s.closes.slice(-APP_CLOSES) })),
  };
  fs.writeFileSync(OUT, `/* AUTO-GENERATED by tools/refresh-market-data.js — do not edit by hand.\n   Real GSE prices and Ghana macro data. Generated ${app.generatedAt}. */\nwindow.GSE_MARKET = ${JSON.stringify(app)};\n`);
  log(`Wrote ${path.relative(ROOT, OUT)} and ${path.relative(ROOT, HISTORY)}`);
}

(async () => {
  let history = { stocks: {}, index: [], macro: {} };
  if (fs.existsSync(HISTORY)) history = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));

  if (args.has('--fill-missing')) {
    history = await fillMissing(history);
  } else if (!args.has('--macro-only')) {
    const saturday = now().getUTCDay() === 6;
    let next = null;
    if (!args.has('--full') && !saturday && Object.keys(history.stocks).length) next = await dailyAppend(history);
    if (!next) next = await fullRefresh(history);
    history = next;
  }
  history.macro = await refreshMacro(history.macro);
  writeFiles(history);
})().catch(e => { console.error(e); process.exit(1); });
