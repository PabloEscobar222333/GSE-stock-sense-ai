# GSE-stock-sense-ai
Analyse the Ghana Stock Exchange: a front-end web app (plain HTML/CSS/JS, no build step) with a signal dashboard, radar scanner, watchlist, portfolio allocator, alerts, news, and **KOJO**, an AI analyst chat powered by Google Gemini.

> Educational project, not financial advice. See **Backtest** below before relying on the signals.

## Run it
Serve the `gse 3/` folder over HTTP (some browser APIs don't work from `file://`):

```bash
cd "gse 3"
python3 -m http.server 8000   # then open http://localhost:8000
```

Accounts are stored in the browser (localStorage) for demo purposes only.

### Gemini key (for KOJO)
```bash
cp "gse 3/js/config.example.js" "gse 3/js/config.js"   # then paste your key
```
`js/config.js` is git-ignored. The key is still visible to anyone who loads the site, so restrict it in Google Cloud Console to the Generative Language API and your site's referrers, or move the call to a backend. Without it, KOJO answers in offline mode.

## Data
All market data is real:

| Data | Source |
|---|---|
| Live prices, company info, shares | [GSE-API](https://dev.kwayisi.org/apis/gse) |
| Daily price history (2016→), GSE-CI index | [afx.kwayisi.org](https://afx.kwayisi.org/gse/) |
| Policy rate, inflation, 91-day T-bill | [Bank of Ghana](https://www.bog.gov.gh/) |
| USD/GHS, gold (also refreshed live in the browser) | [currency-api](https://github.com/fawazahmed0/exchange-api) |
| Cocoa (monthly) | IMF via [FRED](https://fred.stlouisfed.org/series/PCOCOUSDM) |
| GDP growth (annual) | World Bank |
| News | MyJoyOnline, Bloomberg, CNBC, BBC RSS via rss2json |

RSI, 50/200-day averages, returns, volatility, the 0–100 score and BUY/HOLD/SELL signals are computed in the browser from the price history (`js/data.js`). There is no P/E or dividend data.

### Refreshing data
```bash
node "gse 3/tools/refresh-market-data.js"            # daily: append today's closes + macro (seconds)
node "gse 3/tools/refresh-market-data.js" --full     # rebuild full history (~40 min, 60s crawl delay)
node "gse 3/tools/refresh-market-data.js" --fill-missing
```
`tools/install-daily-refresh.sh` schedules the daily run on macOS (launchd). On macOS, a project inside Desktop/Documents needs Full Disk Access for `node`, or move it elsewhere.

## Backtest
```bash
node "gse 3/tools/backtest.js"
```
Replays the app's exact signal rules on 2017-09 → 2026-11 (weekly rebalance, top 8 BUYs, next-day fills). Results (`tools/backtest-results.json`):

| | Total | CAGR | Max drawdown |
|---|---|---|---|
| GSE-CI buy & hold | +505% | 22.2% | −48% |
| Equal-weight all stocks | +618% | 24.5% | −37% |
| Moderate profile, 0% costs | −24% | −3.0% | −28% |
| Moderate profile, 1% costs | −53% | −8.1% | −54% |

**The current trend-following rules do not work on the GSE.** BUY signals underperformed the average stock by 6.2% over the following 3 months, and SELL signals *outperformed* by 4.3%. Limits: prices only (no dividends), cash earns 0%, survivorship bias (only today's listings), close-price fills.
