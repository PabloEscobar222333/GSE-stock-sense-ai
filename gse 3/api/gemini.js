/* ================================================================
   GSE StockSense AI — Gemini proxy (Vercel serverless function)
   ----------------------------------------------------------------
   Keeps the Gemini API key on the server. The browser POSTs
   { model, body } and this forwards body to Gemini's generateContent.
   Set GEMINI_API_KEY in Vercel → Project → Settings → Environment Variables.
   ================================================================ */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: { message: 'GEMINI_API_KEY is not set on the server' } });

  const { model, body } = req.body || {};
  // Only Gemini model names — stops the endpoint being used for other Google APIs
  if (typeof model !== 'string' || !/^gemini-[\w.-]+$/.test(model) || !body || typeof body !== 'object') {
    return res.status(400).json({ error: { message: 'Expected { model, body }' } });
  }

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55000),
    });
    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (e) {
    const timedOut = e.name === 'TimeoutError';
    return res.status(timedOut ? 504 : 502).json({ error: { message: timedOut ? 'Gemini timed out' : 'Could not reach Gemini' } });
  }
};
