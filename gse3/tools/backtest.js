#!/usr/bin/env node
/* ================================================================
   GSE StockSense AI — Backtest of the app's BUY/SELL/HOLD rules
   ----------------------------------------------------------------
   Replays the exact signal code in js/data.js (computeIndicators,
   fitsProfile, perStockPct) over the full price history in
   tools/history.json (built by: node tools/refresh-market-data.js --full).

   Method
     - Every REBALANCE_DAYS trading days, compute every stock's indicators
       using only prices up to that day (last 260 closes, as in the app).
     - Hold the top 8 BUY signals that fit the profile, sized with the
       app's perStockPct (≤ max % per stock, never > 100% total); the rest
       sits in cash earning 0%.
     - Trades fill at the NEXT day's close (no look-ahead) and pay COST
       per side on the value traded.
   Benchmarks
     - GSE Composite Index (GSE-CI), buy and hold
     - Equal-weight basket of every listed stock, rebalanced monthly, no costs
   Also measures signal quality: average forward 1- and 3-month returns
   after BUY / HOLD / SELL signals vs the average stock.

   Known limits (read before trusting results)
     - Prices only: no dividends for either the strategy or the benchmarks.
     - Cash earns 0% — Ghana T-bills paid ~15–35% in 2022–24, so idle cash
       had a large real alternative that this ignores.
     - Survivorship bias: only stocks listed today are included.
     - Market-cap tiers use today's share counts.
     - Assumes you can trade at the closing price; on the GSE many orders
       take days to fill.

   Usage: node tools/backtest.js [--cost=0.01] [--rebalance=5]
   ================================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const argv = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const COSTS = argv.cost !== undefined ? [Number(argv.cost)] : [0, 0.01, 0.02];
const REBALANCE_DAYS = Number(argv.rebalance || 5);
const TOP_N = 8;                   // the Portfolio page shows the top 8
const WINDOW = 260;                // closes the app keeps per stock
const WARMUP = 210;                // need ~200 closes for the 200-day average
const PROFILES = ['conservative', 'moderate', 'aggressive'];

/* ── Load the app's own signal code ───────────────────────────── */
const ctx = { console, window: null, GSE_MARKET: { stocks: [], macro: {} }, fetch: () => Promise.reject(new Error('offline')), setInterval: () => 0, CustomEvent: class {} };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8'), ctx);
const GSE = ctx.GSE;

/* ── Load price history ───────────────────────────────────────── */
const histPath = process.env.GSE_HISTORY || path.join(__dirname, 'history.json');
if (!fs.existsSync(histPath)) { console.error('tools/history.json not found — run: node tools/refresh-market-data.js --full'); process.exit(1); }
const hist = JSON.parse(fs.readFileSync(histPath, 'utf8'));
const index = hist.index || [];
if (!index.length) { console.error('No GSE-CI history in tools/history.json'); process.exit(1); }

const dates = index.map(r => r[0]);           // GSE-CI dates = trading days
const T = dates.length;
const tickers = Object.keys(hist.stocks);
// Aligned close matrix with forward-fill after listing; null before listing
const px = {};
for (const t of tickers) {
  const m = new Map(hist.stocks[t].closes);
  const row = new Array(T).fill(null);
  let last = null;
  for (let i = 0; i < T; i++) { if (m.has(dates[i])) last = m.get(dates[i]); row[i] = last; }
  px[t] = row;
}
const firstIdx = t => px[t].findIndex(v => v !== null);

function indicatorsAt(t, i) {
  const start = Math.max(firstIdx(t), i - WINDOW + 1);
  if (start < 0 || i - start + 1 < 20) return null;
  const history = [];
  for (let k = start; k <= i; k++) history.push([dates[k], px[t][k]]);
  return GSE.computeIndicators({ ticker: t, shares: hist.stocks[t].shares, history, price: px[t][i], change: 0 });
}

/* ── Strategy simulation ──────────────────────────────────────── */
function simulate(profile, cost) {
  let cash = 1, units = {};
  const values = [];
  let pending = null, turnover = 0, invested = [], positions = [], trades = 0;
  const startIdx = WARMUP;
  for (let i = startIdx; i < T; i++) {
    // Execute yesterday's decision at today's close
    if (pending) {
      const V = cash + Object.entries(units).reduce((s, [t, u]) => s + u * px[t][i], 0);
      const target = {};
      pending.forEach(({ ticker, w }) => { target[ticker] = w * V; });
      let traded = 0;
      for (const t of new Set([...Object.keys(units), ...Object.keys(target)])) {
        const cur = (units[t] || 0) * px[t][i];
        const tgt = target[t] || 0;
        if (Math.abs(tgt - cur) > 1e-9) { traded += Math.abs(tgt - cur); trades++; }
      }
      const fee = traded * cost;
      const V2 = V - fee;
      units = {};
      let allocated = 0;
      for (const [t, val] of Object.entries(target)) { const v = val * (V2 / V); units[t] = v / px[t][i]; allocated += v; }
      cash = V2 - allocated;
      turnover += traded / V;
      pending = null;
    }
    const V = cash + Object.entries(units).reduce((s, [t, u]) => s + u * px[t][i], 0);
    values.push(V);
    invested.push(1 - cash / V);
    positions.push(Object.keys(units).length);

    if ((i - startIdx) % REBALANCE_DAYS === 0 && i + 1 < T) {
      const picks = tickers.map(t => px[t][i] !== null ? indicatorsAt(t, i) : null)
        .filter(s => s && s.signal === 'BUY' && GSE.fitsProfile(s, profile))
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_N);
      const w = GSE.perStockPct(picks.length, profile) / 100;
      pending = picks.map(s => ({ ticker: s.ticker, w }));
    }
  }
  const years = (values.length - 1) / 252;
  return { values, turnoverPerYear: turnover / years, avgInvested: avg(invested), avgPositions: avg(positions), trades };
}

/* ── Benchmarks ───────────────────────────────────────────────── */
function indexBuyHold() {
  const base = index[WARMUP][1];
  return { values: index.slice(WARMUP).map(r => r[1] / base) };
}

function equalWeight() {
  let V = 1, units = {};
  const values = [];
  for (let i = WARMUP; i < T; i++) {
    if ((i - WARMUP) % 21 === 0) {
      const listed = tickers.filter(t => px[t][i] !== null);
      V = Object.keys(units).length ? Object.entries(units).reduce((s, [t, u]) => s + u * px[t][i], 0) : V;
      units = {};
      listed.forEach(t => { units[t] = (V / listed.length) / px[t][i]; });
    }
    values.push(Object.entries(units).reduce((s, [t, u]) => s + u * px[t][i], 0));
  }
  return { values };
}

/* ── Signal quality ───────────────────────────────────────────── */
function signalQuality() {
  const buckets = { BUY: { r1: [], r3: [] }, HOLD: { r1: [], r3: [] }, SELL: { r1: [], r3: [] } };
  for (let i = WARMUP; i + 64 < T; i += REBALANCE_DAYS) {
    const rows = tickers.map(t => px[t][i] !== null ? indicatorsAt(t, i) : null).filter(s => s && !s.thinlyTraded && !s.noHistory);
    if (!rows.length) continue;
    const fwd = (t, k) => px[t][i + 1 + k] / px[t][i + 1] - 1;   // enter next day
    const avg1 = avg(rows.map(s => fwd(s.ticker, 21))), avg3 = avg(rows.map(s => fwd(s.ticker, 63)));
    rows.forEach(s => {
      buckets[s.signal].r1.push(fwd(s.ticker, 21) - avg1);
      buckets[s.signal].r3.push(fwd(s.ticker, 63) - avg3);
    });
  }
  return Object.fromEntries(Object.entries(buckets).map(([k, b]) => [k, {
    n: b.r1.length,
    excess1m: pct(avg(b.r1)), excess3m: pct(avg(b.r3)),
    beat3m: pct(b.r3.filter(x => x > 0).length / Math.max(1, b.r3.length)),
  }]));
}

/* ── Metrics ──────────────────────────────────────────────────── */
function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function pct(x, d = 1) { return Math.round(x * 100 * 10 ** d) / 10 ** d; }
function metrics(values) {
  const n = values.length, years = (n - 1) / 252;
  const total = values[n - 1] / values[0] - 1;
  const cagr = Math.pow(values[n - 1] / values[0], 1 / years) - 1;
  let peak = values[0], mdd = 0;
  const rets = [];
  for (let i = 1; i < n; i++) {
    peak = Math.max(peak, values[i]);
    mdd = Math.min(mdd, values[i] / peak - 1);
    rets.push(values[i] / values[i - 1] - 1);
  }
  const mean = avg(rets), sd = Math.sqrt(avg(rets.map(r => (r - mean) ** 2)));
  return { total: pct(total), cagr: pct(cagr), maxDrawdown: pct(mdd), volatility: pct(sd * Math.sqrt(252)), sharpe0: +(sd ? (mean / sd) * Math.sqrt(252) : 0).toFixed(2) };
}
function yearly(values) {
  const out = {};
  const ds = dates.slice(WARMUP);
  let startV = values[0], year = ds[0].slice(0, 4);
  for (let i = 1; i < values.length; i++) {
    const y = ds[i].slice(0, 4);
    if (y !== year) { out[year] = pct(values[i - 1] / startV - 1); startV = values[i - 1]; year = y; }
  }
  out[year + (ds.at(-1).slice(5) !== '12-31' ? ' (YTD)' : '')] = pct(values.at(-1) / startV - 1);
  return out;
}

/* ── Run ──────────────────────────────────────────────────────── */
const period = `${dates[WARMUP]} → ${dates.at(-1)}`;
console.log(`\nBacktest period: ${period} (${((T - WARMUP) / 252).toFixed(1)} years), ${tickers.length} stocks, rebalance every ${REBALANCE_DAYS} days\n`);

const results = { period, rebalanceDays: REBALANCE_DAYS, topN: TOP_N, benchmarks: {}, strategies: {} };
const idx = indexBuyHold(), ew = equalWeight();
results.benchmarks['GSE-CI buy & hold'] = { ...metrics(idx.values), yearly: yearly(idx.values) };
results.benchmarks['Equal-weight all stocks'] = { ...metrics(ew.values), yearly: yearly(ew.values) };

for (const profile of PROFILES) {
  for (const cost of COSTS) {
    const r = simulate(profile, cost);
    results.strategies[`${profile} @ ${cost * 100}% cost`] = {
      ...metrics(r.values), yearly: yearly(r.values),
      avgInvested: pct(r.avgInvested), avgPositions: +r.avgPositions.toFixed(1), turnoverPerYear: +r.turnoverPerYear.toFixed(1),
    };
  }
}
results.signalQuality = signalQuality();

const rows = { ...results.benchmarks, ...results.strategies };
console.table(Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, {
  'Total %': v.total, 'CAGR %': v.cagr, 'Max DD %': v.maxDrawdown, 'Vol %': v.volatility, Sharpe: v.sharpe0,
  'Invested %': v.avgInvested ?? 100, Positions: v.avgPositions ?? '-', 'Turnover/yr': v.turnoverPerYear ?? '-',
}])));
console.log('\nCalendar-year returns (%):');
console.table(Object.fromEntries(Object.entries(rows).filter(([k]) => !k.includes('@') || k.includes('@ 1%')).map(([k, v]) => [k, v.yearly])));
console.log('\nSignal quality — average return vs the average stock after each signal (non-thin stocks):');
console.table(results.signalQuality);

fs.writeFileSync(path.join(__dirname, 'backtest-results.json'), JSON.stringify(results, null, 2));
console.log('\nSaved tools/backtest-results.json');
