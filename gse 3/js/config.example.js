/* ================================================================
   GSE StockSense AI — Client config (TEMPLATE)
   ----------------------------------------------------------------
   Copy this file to js/config.js and add your Gemini API key.
   js/config.js is git-ignored so the key is never committed.

   The key is still visible to anyone who loads the site, so in Google
   Cloud Console restrict it to the Generative Language API and your
   site's HTTP referrers — or move the Gemini call to a backend.
   Without js/config.js, KOJO runs in offline mode.
   ================================================================ */
window.GSE_CONFIG = {
  geminiApiKey: 'YOUR_GEMINI_API_KEY',
  // Tried in order; the next one is used if a model is overloaded (503), rate-limited (429) or retired (404)
  geminiModels: ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'],
  geminiTimeoutMs: 30000,
};
