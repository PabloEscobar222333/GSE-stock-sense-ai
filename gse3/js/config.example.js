/* ================================================================
   GSE StockSense AI — Client config (TEMPLATE)
   ----------------------------------------------------------------
   Copy this file to js/config.js and add your Gemini API key.
   js/config.js is git-ignored so the key is never committed.

   This file is for local development only — a key here is visible to
   anyone who loads the page. On Vercel, leave it out and set
   GEMINI_API_KEY in the project's Environment Variables instead;
   chat.html then calls Gemini through the api/gemini.js proxy.
   ================================================================ */
window.GSE_CONFIG = {
  geminiApiKey: 'YOUR_GEMINI_API_KEY',
  // Tried in order; the next one is used if a model is overloaded (503), rate-limited (429) or retired (404)
  geminiModels: ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'],
  geminiTimeoutMs: 30000,
};
