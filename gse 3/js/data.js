/* ================================================================
   GSE StockSense AI — Data Layer
   ================================================================ */
window.GSE = window.GSE || {};

GSE.stocks = [
  { ticker: 'MTNGH',  name: 'MTN Ghana Ltd',               sector: 'Telecom',        price: 6.33,   rsi: 58, marketCap: 'large',  pe: 14.2, divYield: 3.8, signal: 'BUY',  fundamentalScore: 78, change: +1.2,  volume: 1230000 },
  { ticker: 'GCB',    name: 'GCB Bank Ltd',                 sector: 'Banking',        price: 52.00,  rsi: 44, marketCap: 'large',  pe: 6.1,  divYield: 5.2, signal: 'BUY',  fundamentalScore: 82, change: +0.8,  volume: 450000 },
  { ticker: 'EGH',    name: 'Ecobank Ghana Ltd',            sector: 'Banking',        price: 18.50,  rsi: 62, marketCap: 'large',  pe: 7.8,  divYield: 4.1, signal: 'HOLD', fundamentalScore: 71, change: -0.3,  volume: 380000 },
  { ticker: 'ACCESS', name: 'Access Bank Ghana',            sector: 'Banking',        price: 5.10,   rsi: 40, marketCap: 'mid',    pe: 5.5,  divYield: 3.0, signal: 'BUY',  fundamentalScore: 68, change: +0.5,  volume: 290000 },
  { ticker: 'SCB',    name: 'Standard Chartered Ghana',     sector: 'Banking',        price: 29.80,  rsi: 55, marketCap: 'large',  pe: 8.3,  divYield: 6.0, signal: 'HOLD', fundamentalScore: 75, change: +0.1,  volume: 210000 },
  { ticker: 'CAL',    name: 'CAL Bank Ltd',                 sector: 'Banking',        price: 0.87,   rsi: 38, marketCap: 'mid',    pe: 3.9,  divYield: 2.5, signal: 'BUY',  fundamentalScore: 65, change: +1.2,  volume: 950000 },
  { ticker: 'RBGH',   name: 'Republic Bank Ghana',          sector: 'Banking',        price: 1.24,   rsi: 51, marketCap: 'mid',    pe: 4.2,  divYield: 3.2, signal: 'HOLD', fundamentalScore: 63, change: 0.0,   volume: 180000 },
  { ticker: 'ABSA',   name: 'Absa Bank Ghana',              sector: 'Banking',        price: 14.70,  rsi: 67, marketCap: 'large',  pe: 9.1,  divYield: 4.8, signal: 'HOLD', fundamentalScore: 70, change: -0.7,  volume: 320000 },
  { ticker: 'HFC',    name: 'HFC Bank Ghana Ltd',           sector: 'Banking',        price: 0.29,   rsi: 35, marketCap: 'small',  pe: 2.8,  divYield: 1.0, signal: 'BUY',  fundamentalScore: 52, change: +2.1,  volume: 120000 },
  { ticker: 'SIC',    name: 'SIC Insurance Co. Ltd',        sector: 'Insurance',      price: 0.20,   rsi: 42, marketCap: 'small',  pe: 5.6,  divYield: 2.2, signal: 'BUY',  fundamentalScore: 58, change: +0.5,  volume: 85000 },
  { ticker: 'EIC',    name: 'Enterprise Insurance Co.',     sector: 'Insurance',      price: 1.82,   rsi: 60, marketCap: 'small',  pe: 7.2,  divYield: 3.8, signal: 'HOLD', fundamentalScore: 61, change: -0.5,  volume: 62000 },
  { ticker: 'GOIL',   name: 'GOIL Company Ltd',             sector: 'Energy',         price: 5.45,   rsi: 72, marketCap: 'mid',    pe: 11.4, divYield: 2.9, signal: 'SELL', fundamentalScore: 55, change: +1.8,  volume: 340000 },
  { ticker: 'TOTAL',  name: 'Total Petroleum Ghana',        sector: 'Energy',         price: 7.80,   rsi: 69, marketCap: 'mid',    pe: 12.0, divYield: 2.1, signal: 'HOLD', fundamentalScore: 60, change: +0.9,  volume: 195000 },
  { ticker: 'GGBL',   name: 'Guinness Ghana Breweries',     sector: 'Consumer Goods', price: 3.20,   rsi: 48, marketCap: 'mid',    pe: 18.5, divYield: 1.5, signal: 'HOLD', fundamentalScore: 64, change: -1.2,  volume: 270000 },
  { ticker: 'BOPP',   name: 'Benso Oil Palm Plantation',    sector: 'Agriculture',    price: 5.60,   rsi: 53, marketCap: 'mid',    pe: 9.8,  divYield: 5.5, signal: 'BUY',  fundamentalScore: 73, change: +0.4,  volume: 110000 },
  { ticker: 'PBC',    name: 'Produce Buying Company',       sector: 'Agriculture',    price: 0.18,   rsi: 32, marketCap: 'small',  pe: 4.1,  divYield: 0.8, signal: 'BUY',  fundamentalScore: 48, change: +3.0,  volume: 45000 },
  { ticker: 'FML',    name: 'Fan Milk Ltd',                 sector: 'Consumer Goods', price: 1.64,   rsi: 57, marketCap: 'mid',    pe: 15.2, divYield: 3.1, signal: 'HOLD', fundamentalScore: 67, change: -0.2,  volume: 98000 },
  { ticker: 'UNIL',   name: 'Unilever Ghana Ltd',           sector: 'Consumer Goods', price: 24.50,  rsi: 63, marketCap: 'mid',    pe: 20.1, divYield: 4.5, signal: 'HOLD', fundamentalScore: 69, change: +0.6,  volume: 87000 },
  { ticker: 'CLYD',   name: 'Clydestone (Ghana) Ltd',       sector: 'Technology',     price: 0.12,   rsi: 29, marketCap: 'small',  pe: 3.5,  divYield: 0.5, signal: 'BUY',  fundamentalScore: 44, change: +4.5,  volume: 25000 },
  { ticker: 'AADS',   name: 'African Alliance Insurance',   sector: 'Insurance',      price: 0.09,   rsi: 45, marketCap: 'small',  pe: 2.9,  divYield: 1.2, signal: 'HOLD', fundamentalScore: 42, change: 0.0,   volume: 18000 },
  { ticker: 'TRANSOL',name: 'Transol Solutions Ghana',      sector: 'Technology',     price: 0.04,   rsi: 25, marketCap: 'small',  pe: 1.8,  divYield: 0.0, signal: 'BUY',  fundamentalScore: 38, change: +5.0,  volume: 12000 },
  { ticker: 'CMLT',   name: 'Camelot Ghana Ltd',            sector: 'Technology',     price: 0.07,   rsi: 33, marketCap: 'small',  pe: 2.2,  divYield: 0.4, signal: 'BUY',  fundamentalScore: 41, change: +2.8,  volume: 9000 },
  { ticker: 'ETI',    name: 'Ecobank Transnational Inc.',   sector: 'Banking',        price: 0.22,   rsi: 48, marketCap: 'large',  pe: 5.0,  divYield: 2.8, signal: 'HOLD', fundamentalScore: 66, change: +0.4,  volume: 580000 },
  { ticker: 'AYRTN',  name: 'Airtel-Tigo Ghana',            sector: 'Telecom',        price: 0.10,   rsi: 40, marketCap: 'mid',    pe: 8.5,  divYield: 0.0, signal: 'HOLD', fundamentalScore: 50, change: -1.0,  volume: 120000 },
  { ticker: 'SOGEGH', name: 'Societe Generale Ghana',       sector: 'Banking',        price: 1.60,   rsi: 56, marketCap: 'mid',    pe: 6.4,  divYield: 3.5, signal: 'BUY',  fundamentalScore: 67, change: +0.6,  volume: 210000 },
  { ticker: 'MIGA',   name: 'Mega African Capital',         sector: 'Banking',        price: 0.06,   rsi: 37, marketCap: 'small',  pe: 2.0,  divYield: 0.5, signal: 'BUY',  fundamentalScore: 39, change: +2.0,  volume: 15000 },
  { ticker: 'GSR',    name: 'Golden Star Resources',        sector: 'Mining',         price: 1.95,   rsi: 61, marketCap: 'mid',    pe: 14.8, divYield: 0.8, signal: 'HOLD', fundamentalScore: 62, change: +1.1,  volume: 85000 },
  { ticker: 'AGA',    name: 'AngloGold Ashanti Ghana',      sector: 'Mining',         price: 285.00, rsi: 66, marketCap: 'large',  pe: 22.0, divYield: 1.2, signal: 'HOLD', fundamentalScore: 72, change: +0.3,  volume: 42000 },
  { ticker: 'TULLOW', name: 'Tullow Oil Ghana',             sector: 'Energy',         price: 0.44,   rsi: 55, marketCap: 'mid',    pe: 8.2,  divYield: 0.0, signal: 'HOLD', fundamentalScore: 57, change: -0.5,  volume: 95000 },
  { ticker: 'UNIL2',  name: 'Starlife Assurance',           sector: 'Insurance',      price: 0.55,   rsi: 50, marketCap: 'small',  pe: 6.8,  divYield: 1.9, signal: 'HOLD', fundamentalScore: 54, change: -0.3,  volume: 32000 },
  { ticker: 'PBC2',   name: 'Meridian-Marshalls',           sector: 'Consumer Goods', price: 0.05,   rsi: 28, marketCap: 'small',  pe: 1.5,  divYield: 0.0, signal: 'BUY',  fundamentalScore: 36, change: +5.6,  volume: 8000 },
];

GSE.sectors = ['Banking & Finance','Insurance','Telecom','Energy & Oil','Consumer Goods','Agriculture','Technology & Fintech','Mining & Resources'];

GSE.macro = {
  bogRate: 29.0, bogChange: -0.5,
  usdGhs: 12.85, usdGhsChange: +0.8,
  goldOz: 3120.40, goldChange: +1.3,
  cocoaTon: 9800, cocoaChange: -2.1,
  inflation: 22.4, gdpGrowth: 5.7,
};

GSE.news = [
  { id:1, headline:'Bank of Ghana Holds Policy Rate at 29% Amid Inflation Concerns', source:'Business & Financial Times', timestamp:'2026-03-16T10:30:00Z', category:'BoG Decision', direction:'neutral', magnitude:'medium', affectedTickers:['GCB','EGH','ACCESS','SCB','CAL'], confidence:'HIGH', aiInterpretation:'The BoG holding rates steady signals a cautious stance. Bank stocks may face NIM compression but strong capital buffers should maintain dividend payouts.', tags:['MACRO — affects all banks'] },
  { id:2, headline:'MTN Ghana Reports 18% Revenue Growth in Q4 2025, Raises Dividend', source:'Ghana Web Business', timestamp:'2026-03-15T14:00:00Z', category:'Company News', direction:'bullish', magnitude:'high', affectedTickers:['MTNGH'], confidence:'HIGH', aiInterpretation:'MTN Ghana\'s revenue beat drives a dividend increase. With RSI still below 65, this stock remains a strong BUY for moderate and aggressive profiles.', tags:['BULLISH for MTNGH'] },
  { id:3, headline:'Global Gold Prices Hit 3-Year High as USD Weakens', source:'Bloomberg Africa', timestamp:'2026-03-15T08:45:00Z', category:'Commodity Prices', direction:'bullish', magnitude:'medium', affectedTickers:['AGA','GSR'], confidence:'MEDIUM', aiInterpretation:'Rising gold prices directly benefit AngloGold Ashanti and Golden Star Resources. Watch for upward earnings revisions in the next quarterly cycle.', tags:['BULLISH for AGA','BULLISH for GSR'] },
  { id:4, headline:'GCB Bank to Expand Digital Banking Across 5 New Regions', source:'Graphic Online', timestamp:'2026-03-14T16:20:00Z', category:'Company News', direction:'bullish', magnitude:'medium', affectedTickers:['GCB'], confidence:'MEDIUM', aiInterpretation:'GCB\'s digital expansion reduces branch costs and targets the unbanked population — a long-term growth driver for conservative dividend investors.', tags:['BULLISH for GCB'] },
  { id:5, headline:'Budget 2026 Introduces Capital Gains Tax on Stock Profits', source:'Business & Financial Times', timestamp:'2026-03-13T12:00:00Z', category:'Fiscal Policy', direction:'bearish', magnitude:'high', affectedTickers:['MTNGH','GCB','EGH','ACCESS','SCB','GOIL'], confidence:'HIGH', aiInterpretation:'Capital gains tax reduces effective returns for GSE investors. Short-term sell pressure is likely as institutions reassess position sizes.', tags:['BEARISH — market-wide','MACRO — affects all sectors'] },
  { id:6, headline:'GOIL Records Record Volume But Margins Squeezed by Forex Costs', source:'Graphic Online', timestamp:'2026-03-12T09:15:00Z', category:'Company News', direction:'bearish', magnitude:'medium', affectedTickers:['GOIL'], confidence:'HIGH', aiInterpretation:'GOIL\'s volume growth is impressive, but forex-linked cost pressures and RSI of 72 (overbought) confirm our SELL signal. Consider taking profits.', tags:['BEARISH for GOIL'] },
  { id:7, headline:'Cocoa Prices Fall 8% on Global Supply Surplus Fears', source:'Bloomberg Africa', timestamp:'2026-03-11T11:30:00Z', category:'Commodity Prices', direction:'bearish', magnitude:'medium', affectedTickers:['PBC','BOPP','GGBL'], confidence:'MEDIUM', aiInterpretation:'Falling cocoa prices pressure farmgate revenues for PBC. BOPP\'s diversified crop mix offers partial insulation from the downturn.', tags:['BEARISH for PBC','NEUTRAL for BOPP'] },
  { id:8, headline:'NCA Grants New Spectrum to Airtel-Tigo, Increasing Competition', source:'Ghana Web Business', timestamp:'2026-03-10T15:00:00Z', category:'Telecom Regulation', direction:'neutral', magnitude:'low', affectedTickers:['MTNGH','AYRTN'], confidence:'MEDIUM', aiInterpretation:'New spectrum signals intensifying competition. MTN Ghana\'s dominant 55% market share provides a buffer — watch ARPU trends in upcoming quarters.', tags:['NEUTRAL for MTNGH','BULLISH for AYRTN'] },
  { id:9, headline:'Access Bank Ghana Posts 40% Profit After Tax Growth in FY2025', source:'Business & Financial Times', timestamp:'2026-03-09T13:45:00Z', category:'Company News', direction:'bullish', magnitude:'high', affectedTickers:['ACCESS'], confidence:'HIGH', aiInterpretation:'ACCESS PAT surge driven by strong loan growth and improved asset quality. With RSI at 40 and PE at 5.5x, this is deeply undervalued.', tags:['BULLISH for ACCESS'] },
  { id:10, headline:'SIC Insurance Wins GHS 250M Government Vehicle Contract', source:'Graphic Online', timestamp:'2026-03-08T10:00:00Z', category:'Company News', direction:'bullish', magnitude:'medium', affectedTickers:['SIC'], confidence:'MEDIUM', aiInterpretation:'The 3-year government contract provides SIC with reliable revenue. Given its low RSI of 42, this is an interesting speculative BUY.', tags:['BULLISH for SIC'] },
];

GSE.profileRules = {
  conservative: { label:'Conservative', description:"We'll prioritise dividend-paying blue-chip stocks with low RSI and strong fundamentals.", maxAllocationPct:8,  maxRSI:60, minDivYield:2.0, topPicks:['GCB','MTNGH','EGH','SCB','BOPP'] },
  moderate:     { label:'Moderate',     description:"We'll balance growth and income — liquid stocks with RSI below 70.",                    maxAllocationPct:15, maxRSI:70, minDivYield:0,   topPicks:['MTNGH','GCB','ACCESS','CAL','BOPP','SOGEGH'] },
  aggressive:   { label:'Aggressive',   description:"We'll prioritise high-growth stocks and small caps for maximum return potential.",       maxAllocationPct:20, maxRSI:80, minDivYield:0,   topPicks:['MTNGH','ACCESS','CAL','HFC','SIC','CLYD','TRANSOL','PBC'] },
};

GSE.orbitCards = [
  { label:'RSI Signal Detected', value:'MTNGH', sub:'RSI 58 — BUY Zone', signal:'BUY' },
  { label:'Signal', value:'BUY · GCB · GHS 52.00', sub:'Fundamental Score: 82/100', signal:'BUY' },
  { label:'Stocks Monitored', value:'31 Stocks', sub:'Live Ghana Stock Exchange', signal:'DATA' },
];

GSE.getStock    = t => GSE.stocks.find(s => s.ticker.toUpperCase() === t.toUpperCase());
GSE.getSignalStocks = (signal='BUY', profile='moderate') => {
  const rules = GSE.profileRules[profile] || GSE.profileRules.moderate;
  return GSE.stocks.filter(s => (signal==='ALL' || s.signal===signal) && s.rsi <= rules.maxRSI)
                   .sort((a,b) => b.fundamentalScore - a.fundamentalScore);
};
GSE.calcAllocation = (ticker, capital, profile='moderate') => {
  const stock = GSE.getStock(ticker); if (!stock) return null;
  const rules = GSE.profileRules[profile] || GSE.profileRules.moderate;
  const pct = rules.maxAllocationPct;
  const amount = (pct/100)*capital;
  const shares = Math.floor(amount/stock.price);
  return { ticker, pct, amount, shares, pricePerShare:stock.price, profile, capital };
};

/* ================================================================
   GSE StockSense AI — Live API Fetchers
   ================================================================ */

GSE.fetchLiveStockData = async function() {
  try {
    const res = await fetch('https://dev.kwayisi.org/apis/gse/live');
    if (!res.ok) throw new Error('Failed to fetch stock data');
    const liveData = await res.json();
    
    liveData.forEach(liveStock => {
      const existing = GSE.getStock(liveStock.name);
      if (existing) {
        existing.price = liveStock.price;
        existing.change = liveStock.change;
        existing.volume = liveStock.volume;
      } else {
        GSE.stocks.push({
          ticker: liveStock.name,
          name: liveStock.name,
          sector: 'Other',
          price: liveStock.price,
          rsi: 50,
          marketCap: 'small',
          pe: 10,
          divYield: 0,
          signal: 'HOLD',
          fundamentalScore: 50,
          change: liveStock.change,
          volume: liveStock.volume
        });
      }
    });

    // Notify UI to re-render
    window.dispatchEvent(new CustomEvent('gseDataUpdated'));
  } catch (err) {
    console.error('Error fetching GSE live stocks:', err);
  }
};

GSE.rssSources = [
  { url: 'https://citinewsroom.com/category/business/feed/', category: 'Ghana News' },
  { url: 'https://www.myjoyonline.com/category/business/feed/', category: 'Ghana News' },
  { url: 'https://graphic.com.gh/category/business/feed', category: 'Ghana News' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Global News' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', category: 'Global News' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', category: 'Global News' }
];

GSE.newsKeywords = ['stocks', 'shares', 'investment', 'economy', 'inflation', 'interest rates', 'banking', 'earnings', 'gdp', 'cedi', 'market'];

GSE.fetchLiveNews = async function() {
  try {
    const proxyUrl = 'https://corsproxy.io/?';
    
    const promises = GSE.rssSources.map(async (source) => {
      try {
        const fetchUrl = proxyUrl + encodeURIComponent(source.url);
        const res = await fetch(fetchUrl);
        if (!res.ok) return [];
        const text = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const items = Array.from(xmlDoc.querySelectorAll('item'));
        
        let sourceName = source.category;
        const channelTitle = xmlDoc.querySelector('channel > title');
        if (channelTitle && channelTitle.textContent) {
          sourceName = channelTitle.textContent.replace('RSS Feed', '').trim();
        }

        const parsedItems = items.map((item, index) => {
          const title = item.querySelector('title')?.textContent || '';
          const link = item.querySelector('link')?.textContent || '';
          const pubDateNode = item.querySelector('pubDate');
          const pubDate = pubDateNode ? pubDateNode.textContent : new Date().toISOString();
          
          return {
            id: sourceName + '_' + index + '_' + Date.now(),
            headline: title,
            source: sourceName,
            timestamp: new Date(pubDate).toISOString(),
            category: source.category,
            link: link,
            direction: 'neutral',
            magnitude: 'medium',
            affectedTickers: [],
            confidence: 'MEDIUM',
            aiInterpretation: 'Live external article.',
            tags: [source.category.toUpperCase()]
          };
        });
        
        // Keyword filter
        return parsedItems.filter(item => {
          const lowerTitle = item.headline.toLowerCase();
          return GSE.newsKeywords.some(kw => lowerTitle.includes(kw));
        });
        
      } catch (err) {
        console.error('Error fetching RSS ' + source.url, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const allNews = results.flat();
    
    if (allNews.length > 0) {
      allNews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      GSE.news = allNews;
      window.dispatchEvent(new CustomEvent('gseNewsUpdated'));
    }
  } catch (err) {
    console.error('Failed to fetch live news:', err);
  }
};

// Start initial fetches and set intervals
GSE.fetchLiveStockData();
GSE.fetchLiveNews();
setInterval(GSE.fetchLiveStockData, 5 * 60 * 1000);
setInterval(GSE.fetchLiveNews, 10 * 60 * 1000);
