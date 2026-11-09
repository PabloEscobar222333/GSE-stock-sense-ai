/* ================================================================
   GSE StockSense AI — App Utilities
   Auth, Session, Toast, Profile, Prefs, Watchlist, Alerts, Sidebar
   ================================================================ */

/* ── HTML escaping (for any user- or network-supplied text) ───── */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* Only allow http(s) links from external feeds */
function safeUrl(url) {
  try {
    const u = new URL(url, window.location.href);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
  } catch { return null; }
}

/* ── Per-user storage (keys are namespaced by the logged-in email) */
const UserStore = {
  NAMES: ['profile', 'watchlist', 'alerts', 'prefs'],

  prefix(email) { return `gse_u:${String(email || '').toLowerCase()}:`; },

  currentEmail() {
    const s = Auth.getSession();
    return s ? s.email : null;
  },

  get(name, fallback = null) {
    const email = this.currentEmail();
    if (!email) return fallback;
    try {
      const v = JSON.parse(localStorage.getItem(this.prefix(email) + name));
      return v ?? fallback;
    } catch { return fallback; }
  },

  set(name, value) {
    const email = this.currentEmail();
    if (!email) return;
    localStorage.setItem(this.prefix(email) + name, JSON.stringify(value));
  },

  remove(name) {
    const email = this.currentEmail();
    if (email) localStorage.removeItem(this.prefix(email) + name);
  },

  renameUser(oldEmail, newEmail) {
    const oldP = this.prefix(oldEmail), newP = this.prefix(newEmail);
    Object.keys(localStorage).filter(k => k.startsWith(oldP)).forEach(k => {
      localStorage.setItem(newP + k.slice(oldP.length), localStorage.getItem(k));
      localStorage.removeItem(k);
    });
  },

  clearUser(email) {
    const p = this.prefix(email);
    Object.keys(localStorage).filter(k => k.startsWith(p)).forEach(k => localStorage.removeItem(k));
  },

  // Move data saved by the old single-user version (gse_profile, gse_watchlist, ...) into this user's namespace
  migrateLegacy(email) {
    let legacyUser = null;
    try { legacyUser = JSON.parse(localStorage.getItem('gse_user')); } catch {}
    if (!legacyUser || String(legacyUser.email).toLowerCase() !== String(email).toLowerCase()) return;
    this.NAMES.forEach(name => {
      const v = localStorage.getItem('gse_' + name);
      if (v !== null) localStorage.setItem(this.prefix(email) + name, v);
    });
    ['gse_user', 'gse_profile', 'gse_usage', 'gse_subscription', 'gse_watchlist', 'gse_alerts'].forEach(k => localStorage.removeItem(k));
  },
};

/* ── Auth ─────────────────────────────────────────────────────── */
/* NOTE: this is a browser-only demo. Real accounts need a server — anything
   stored in localStorage can be read and edited by the person using the browser. */
const Auth = {
  USERS_KEY: 'gse_users',
  SESSION_KEY: 'gse_session',

  getUsers() {
    try { return JSON.parse(localStorage.getItem(this.USERS_KEY)) || {}; } catch { return {}; }
  },

  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  getUser(email) {
    return this.getUsers()[String(email || '').toLowerCase()] || null;
  },

  saveUser(user) {
    const users = this.getUsers();
    users[user.email.toLowerCase()] = user;
    this.saveUsers(users);
  },

  async hashPassword(password, salt) {
    const text = `${salt}:${password}`;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for non-secure contexts (no Web Crypto)
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    return 'djb2-' + h.toString(16);
  },

  newSalt() {
    const arr = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(arr) : arr.forEach((_, i) => arr[i] = Math.random() * 256);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Throws an Error with a user-facing message if the email is taken
  async register({ name, email, password, google = false }) {
    email = email.trim().toLowerCase();
    if (this.getUser(email) && !google) throw new Error('An account with that email already exists. Please log in.');
    const existing = this.getUser(email);
    const user = existing || { name, email, createdAt: Date.now() };
    if (google) user.google = true;
    if (password) {
      user.salt = this.newSalt();
      user.passwordHash = await this.hashPassword(password, user.salt);
    }
    this.saveUser(user);
    UserStore.migrateLegacy(email);
    this.login(user);
    return user;
  },

  // Account saved by the old single-user version (no password), if it matches this email
  getLegacyUser(email) {
    try {
      const u = JSON.parse(localStorage.getItem('gse_user'));
      return u && String(u.email).toLowerCase() === String(email).trim().toLowerCase() ? u : null;
    } catch { return null; }
  },

  // Returns the user on success, or null if the email/password is wrong
  async verify(email, password) {
    const user = this.getUser(email);
    if (!user || !user.passwordHash) return null;
    const hash = await this.hashPassword(password, user.salt);
    return hash === user.passwordHash ? user : null;
  },

  login(user) {
    // Never copy the password hash into the session
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({ name: user.name, email: user.email, loggedInAt: Date.now() }));
  },

  getSession() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)) || null; } catch { return null; }
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    window.location.href = 'index.html';
  },

  // Returns false (and redirects) if there is no valid session
  requireAuth() {
    if (!this.isLoggedIn()) {
      localStorage.removeItem(this.SESSION_KEY);
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  isLoggedIn() {
    const s = this.getSession();
    return !!(s && s.email && this.getUser(s.email));
  },

  // Update name/email; migrates the user's stored data when the email changes
  updateAccount({ name, email }) {
    const session = this.getSession();
    const oldEmail = session.email.toLowerCase();
    const newEmail = email.trim().toLowerCase();
    if (newEmail !== oldEmail && this.getUser(newEmail)) throw new Error('Another account already uses that email.');
    const users = this.getUsers();
    const user = { ...users[oldEmail], name, email: newEmail };
    delete users[oldEmail];
    users[newEmail] = user;
    this.saveUsers(users);
    if (newEmail !== oldEmail) UserStore.renameUser(oldEmail, newEmail);
    this.login(user);
    return user;
  },

  deleteAccount() {
    const s = this.getSession();
    if (!s) return;
    UserStore.clearUser(s.email);
    const users = this.getUsers();
    delete users[s.email.toLowerCase()];
    this.saveUsers(users);
    localStorage.removeItem(this.SESSION_KEY);
  },
};

/* ── Toast Notifications ─────────────────────────────────────── */
const Toast = {
  container: null,

  init() {
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  },

  show(type = 'success', message = '', duration = 5000) {
    if (!this.container) this.init();
    const icons = { success: '✓', warning: '⚠', error: '✕', info: 'ℹ' };
    const colors = { success: 'var(--emerald)', warning: 'var(--amber)', error: 'var(--red)', info: 'var(--text-secondary)' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span style="font-size:18px;color:${colors[type]}">${icons[type]}</span><span></span>`;
    // Messages often contain user input (tickers, names) — never parse them as HTML
    toast.lastElementChild.textContent = message;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
    return toast;
  },
};

/* ── Profile ─────────────────────────────────────────────────── */
const Profile = {
  get() {
    return UserStore.get('profile', null);
  },

  save(profileData) {
    UserStore.set('profile', profileData);
  },

  getRiskLabel() {
    const p = this.get();
    return p ? p.riskProfile : 'moderate';
  },

  getCapital() {
    const p = this.get();
    return p ? (p.capitalAmount || 5000) : 5000;
  },
};

/* ── Preferences ─────────────────────────────────────────────── */
const Prefs = {
  DEFAULTS: { notifSignals: true, notifRSI: true, notifNews: false, showRSI: true, showCharts: true },

  get() {
    return { ...this.DEFAULTS, ...(UserStore.get('prefs', {}) || {}) };
  },

  save(prefs) {
    UserStore.set('prefs', { ...this.get(), ...prefs });
  },
};

/* ── Watchlist ───────────────────────────────────────────────── */
const Watchlist = {
  DEFAULT: ['MTNGH', 'GCB', 'BOPP'],

  get() {
    const list = UserStore.get('watchlist', null);
    return Array.isArray(list) ? list : this.DEFAULT.slice();
  },

  save(list) {
    UserStore.set('watchlist', list);
  },

  clear() {
    UserStore.set('watchlist', []);
  },
};

/* ── Alerts (stored per user, evaluated whenever market data updates) ── */
const Alerts = {
  get() {
    let list = UserStore.get('alerts', null);
    if (!Array.isArray(list)) {
      list = this.defaults();
      this.save(list);
    }
    return list;
  },

  save(list) {
    UserStore.set('alerts', list);
  },

  defaults() {
    const today = new Date().toISOString().split('T')[0];
    return [
      { id:1, ticker:'MTNGH',  type:'RSI_ABOVE',     threshold:70,   active:true, created:today, triggered:false },
      { id:2, ticker:'GCB',    type:'RSI_BELOW',     threshold:35,   active:true, created:today, triggered:false },
      { id:3, ticker:'GOIL',   type:'PRICE_BELOW',   threshold:5.00, active:true, created:today, triggered:false },
      { id:4, ticker:'ACCESS', type:'SIGNAL_CHANGE', threshold:0,    active:true, created:today, triggered:false, baseline: (GSE.getStock('ACCESS') || {}).signal },
    ];
  },

  create(ticker, type, threshold) {
    const s = GSE.getStock(ticker);
    const alert = { id: Date.now(), ticker, type, threshold, active: true, created: new Date().toISOString().split('T')[0], triggered: false };
    if (type === 'SIGNAL_CHANGE') alert.baseline = s ? s.signal : null;
    const list = this.get();
    list.unshift(alert);
    this.save(list);
    this.check();
    return alert;
  },

  describe(a) {
    const labels = {
      RSI_ABOVE:   `RSI rises above ${a.threshold}`,
      RSI_BELOW:   `RSI falls below ${a.threshold}`,
      PRICE_ABOVE: `Price rises above GHS ${a.threshold}`,
      PRICE_BELOW: `Price falls below GHS ${a.threshold}`,
      SIGNAL_CHANGE: a.baseline ? `Signal changes from ${a.baseline}` : 'Signal changes (BUY/SELL/HOLD)',
    };
    return labels[a.type] || a.type;
  },

  isMet(a, s) {
    switch (a.type) {
      case 'RSI_ABOVE':     return s.rsi > a.threshold;
      case 'RSI_BELOW':     return s.rsi < a.threshold;
      case 'PRICE_ABOVE':   return s.price > a.threshold;
      case 'PRICE_BELOW':   return s.price < a.threshold;
      case 'SIGNAL_CHANGE': return !!a.baseline && s.signal !== a.baseline;
      default: return false;
    }
  },

  // Re-arm a triggered alert (signal alerts take the current signal as the new baseline)
  rearm(id) {
    const list = this.get();
    const a = list.find(x => x.id === id);
    if (!a) return;
    a.triggered = false;
    delete a.triggeredAt;
    if (a.type === 'SIGNAL_CHANGE') { const s = GSE.getStock(a.ticker); a.baseline = s ? s.signal : a.baseline; }
    this.save(list);
  },

  check() {
    if (!Auth.isLoggedIn()) return;
    const list = this.get();
    const prefs = Prefs.get();
    let changed = false;
    list.forEach(a => {
      if (!a.active || a.triggered) return;
      const s = GSE.getStock(a.ticker);
      if (!s) return;
      if (a.type === 'SIGNAL_CHANGE' && !a.baseline) { a.baseline = s.signal; changed = true; return; }
      if (!this.isMet(a, s)) return;
      a.triggered = true;
      a.triggeredAt = Date.now();
      changed = true;
      const wantsToast = a.type.startsWith('RSI') ? prefs.notifRSI : prefs.notifSignals;
      if (wantsToast) Toast.show('warning', `Alert triggered: ${a.ticker} — ${this.describe(a)}`);
    });
    if (changed) {
      this.save(list);
      window.dispatchEvent(new CustomEvent('gseAlertsUpdated'));
    }
  },
};

/* ── Sidebar Rendering (shared across all app pages) ─────────── */
const Sidebar = {
  NAV_ITEMS: [
    { href:'dashboard.html', label:'Dashboard', icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
    { href:'scanner.html',   label:'Radar Scanner', icon:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>' },
    { href:'watchlist.html', label:'Watchlist', icon:'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>' },
    { href:'portfolio.html', label:'Portfolio', icon:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L6 7h12l-2-4z"/><path d="M12 12v4"/><path d="M10 14h4"/>' },
    { href:'alerts.html',    label:'Alerts', icon:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
    { href:'news.html',      label:'News Monitor', icon:'<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/><rect x="2" y="8" width="8" height="14"/>' },
    { href:'chat.html',      label:'AI Analyst', icon:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
    { hr: true },
    { href:'settings.html',  label:'Settings', icon:'<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a1 1 0 0 0-1.41 0l-1.1 1.1a7 7 0 0 0-9.12 9.12l-1.1 1.1a1 1 0 0 0 0 1.41l.7.7a1 1 0 0 0 1.41 0l1.1-1.1a7 7 0 0 0 9.12-9.12l1.1-1.1a1 1 0 0 0 0-1.41z"/>' },
  ],

  LOGO_SVG: `<svg class="logo-icon" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 2L31 9.5V24.5L17 32L3 24.5V9.5L17 2Z" stroke="#C9A84C" stroke-width="1.5" fill="rgba(201,168,76,0.08)"/>
    <path d="M17 8L26 12.5V21.5L17 26L8 21.5V12.5L17 8Z" fill="rgba(201,168,76,0.15)" stroke="#C9A84C" stroke-width="1"/>
    <circle cx="17" cy="17" r="2.5" fill="#C9A84C"/>
  </svg>`,

  render(activePage) {
    const user = Auth.getSession() || { name: 'Investor' };
    const displayName = escapeHtml(user.name || 'Investor');
    const initial = escapeHtml((user.name || 'I')[0].toUpperCase());
    const profile = Profile.get();

    const html = `
      <aside class="sidebar" id="appSidebar">
        <div class="sidebar-logo">
          ${this.LOGO_SVG}
          <span class="logo-text">StockSense</span>
        </div>
        <nav class="sidebar-nav">
          ${this.NAV_ITEMS.map(item => {
            if (item.hr) return '<div class="divider" style="margin:8px 16px"></div>';
            const isActive = item.href === activePage;
            return `<a href="${item.href}" class="nav-item ${isActive ? 'active' : ''}" id="nav-${item.href.replace('.html','')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
              <span>${item.label}</span>
            </a>`;
          }).join('')}
        </nav>
        <div class="sidebar-footer">
          <div style="position:relative">
            <div id="profileTrigger" onclick="Sidebar.toggleDropdown(event)" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-sm);cursor:pointer;transition:background 0.2s ease;user-select:none" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
              <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--emerald));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--bg-deep);flex-shrink:0">${initial}</div>
              <div style="overflow:hidden;flex:1;min-width:0">
                <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${displayName}</div>
                <div style="font-size:11px;color:var(--text-muted)">${profile ? profile.riskProfile.charAt(0).toUpperCase()+profile.riskProfile.slice(1) : 'Set profile'}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);flex-shrink:0;transition:transform 0.2s ease" id="profileChevron"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <!-- Profile Dropdown -->
            <div id="profileDropdown" style="display:none;position:absolute;bottom:calc(100% + 8px);left:0;right:0;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:0 8px 32px rgba(0,0,0,0.5);overflow:hidden;z-index:200;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">
              <a href="settings.html" style="display:flex;align-items:center;gap:10px;padding:12px 16px;font-size:13px;font-weight:500;color:var(--text-primary);text-decoration:none;transition:background 0.15s ease;font-family:var(--font-body)" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                Edit Profile
              </a>
              <div style="height:1px;background:var(--border);margin:0 12px"></div>
              <button onclick="Auth.logout()" style="display:flex;align-items:center;gap:10px;width:100%;padding:12px 16px;background:transparent;border:none;font-size:13px;font-weight:500;color:var(--red);cursor:pointer;font-family:var(--font-body);text-align:left;transition:background 0.15s ease" onmouseover="this.style.background='rgba(255,69,96,0.08)'" onmouseout="this.style.background='transparent'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Log Out
              </button>
            </div>
          </div>
        </div>
      </aside>`;
    return html;
  },

  toggleDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    const chevron  = document.getElementById('profileChevron');
    const isOpen   = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    if (!isOpen) {
      // Close when clicking anywhere outside
      setTimeout(() => {
        document.addEventListener('click', function closeDropdown(ev) {
          if (!document.getElementById('profileDropdown').contains(ev.target) &&
              !document.getElementById('profileTrigger').contains(ev.target)) {
            document.getElementById('profileDropdown').style.display = 'none';
            if (document.getElementById('profileChevron')) {
              document.getElementById('profileChevron').style.transform = 'rotate(0deg)';
            }
            document.removeEventListener('click', closeDropdown);
          }
        });
      }, 0);
    }
  },

  renderMobileNav(activePage) {
    const items = [
      { href:'dashboard.html', label:'Home',    icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
      { href:'scanner.html',   label:'Scanner', icon:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
      { href:'news.html',      label:'News',    icon:'<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/><rect x="2" y="8" width="8" height="14"/>' },
      { href:'chat.html',      label:'AI Chat', icon:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
    ];

    const profileIcon = '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>';
    const isProfileActive = activePage === 'settings.html';

    const navItems = items.map(item => {
      const isActive = item.href === activePage;
      return `<a href="${item.href}" class="mobile-nav-item ${isActive ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
        <span>${item.label}</span>
      </a>`;
    }).join('');

    return `<nav class="mobile-nav" id="mobileNav">
      <!-- Mobile profile dropdown (renders above the nav bar) -->
      <div id="mobileProfileDropdown" style="display:none;position:absolute;bottom:68px;right:12px;width:200px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:0 -4px 32px rgba(0,0,0,0.6);overflow:hidden;z-index:999;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">
        <a href="settings.html" style="display:flex;align-items:center;gap:10px;padding:14px 16px;font-size:14px;font-weight:500;color:var(--text-primary);text-decoration:none;transition:background 0.15s;font-family:var(--font-body)" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Edit Profile
        </a>
        <div style="height:1px;background:var(--border)"></div>
        <button onclick="Auth.logout()" style="display:flex;align-items:center;gap:10px;width:100%;padding:14px 16px;background:transparent;border:none;font-size:14px;font-weight:500;color:var(--red);cursor:pointer;font-family:var(--font-body);text-align:left;transition:background 0.15s" onmouseover="this.style.background='rgba(255,69,96,0.08)'" onmouseout="this.style.background='transparent'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log Out
        </button>
      </div>
      <div class="mobile-nav-items">
        ${navItems}
        <!-- Profile button with dropdown -->
        <button id="mobileProfileBtn" onclick="Sidebar.toggleMobileProfileDropdown(event)" class="mobile-nav-item ${isProfileActive ? 'active' : ''}" style="background:none;border:none;cursor:pointer;padding:0;flex:1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${profileIcon}</svg>
          <span>Profile</span>
        </button>
      </div>
    </nav>`;
  },

  toggleMobileProfileDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('mobileProfileDropdown');
    if (!dropdown) return;
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      setTimeout(() => {
        document.addEventListener('click', function closeMobileDropdown(ev) {
          const dd   = document.getElementById('mobileProfileDropdown');
          const btn  = document.getElementById('mobileProfileBtn');
          if (dd && btn && !dd.contains(ev.target) && !btn.contains(ev.target)) {
            dd.style.display = 'none';
            document.removeEventListener('click', closeMobileDropdown);
          }
        });
      }, 0);
    }
  },

  injectTopbarAvatar() {
    const topbars = document.querySelectorAll('.topbar-right');
    if (!topbars.length) return;

    const user = Auth.getSession() || { name: 'Investor' };
    const html = `
      <div style="position:relative; margin-left: 12px;" id="topbarProfileWrapper">
        <div id="topbarTrigger" onclick="Sidebar.toggleTopbarDropdown(event)" style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--emerald));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--bg-deep);cursor:pointer;user-select:none;transition:transform 0.2s ease" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Profile Menu">
          ${escapeHtml((user.name||'I')[0].toUpperCase())}
        </div>
        <!-- Topbar Dropdown -->
        <div id="topbarDropdown" style="display:none;position:absolute;top:calc(100% + 12px);right:0;width:180px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:0 8px 32px rgba(0,0,0,0.5);overflow:hidden;z-index:999;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
            <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(user.name||'Investor')}</div>
          </div>
          <a href="settings.html" style="display:flex;align-items:center;gap:10px;padding:12px 16px;font-size:13px;font-weight:500;color:var(--text-primary);text-decoration:none;transition:background 0.15s ease;font-family:var(--font-body)" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Edit Profile
          </a>
          <button onclick="Auth.logout()" style="display:flex;align-items:center;gap:10px;width:100%;padding:12px 16px;background:transparent;border:none;border-top:1px solid var(--border);font-size:13px;font-weight:500;color:var(--red);cursor:pointer;font-family:var(--font-body);text-align:left;transition:background 0.15s ease" onmouseover="this.style.background='rgba(255,69,96,0.08)'" onmouseout="this.style.background='transparent'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log Out
          </button>
        </div>
      </div>
    `;

    topbars.forEach(tb => {
      // Remove any previously hardcoded avatar
      const oldAvatar = tb.querySelector('#topbarAvatar');
      if (oldAvatar) oldAvatar.remove();

      // Ensure we don't inject multiple times (e.g. if code runs twice)
      if (!tb.querySelector('#topbarProfileWrapper')) {
        tb.insertAdjacentHTML('beforeend', html);
      }
    });
  },

  toggleTopbarDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('topbarDropdown');
    if (!dropdown) return;
    const isOpen   = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      setTimeout(() => {
        document.addEventListener('click', function closeDropdown(ev) {
          const dd = document.getElementById('topbarDropdown');
          const trig = document.getElementById('topbarTrigger');
          if (dd && trig && !dd.contains(ev.target) && !trig.contains(ev.target)) {
            dd.style.display = 'none';
            document.removeEventListener('click', closeDropdown);
          }
        });
      }, 0);
    }
  }
};

/* ── App Init ─────────────────────────────────────────────────── */
function initApp(activePage) {
  Toast.init();
  // Inject sidebar
  const sidebarHolder = document.getElementById('sidebarHolder');
  if (sidebarHolder) sidebarHolder.innerHTML = Sidebar.render(activePage);
  // Inject mobile nav
  const mobileHolder = document.getElementById('mobileNavHolder');
  if (mobileHolder) mobileHolder.innerHTML = Sidebar.renderMobileNav(activePage);
  
  // Inject topbar profile dropdown
  Sidebar.injectTopbarAvatar();

  // Live market data + alert evaluation (only on app pages, not landing/login)
  Alerts.check();
  window.addEventListener('gseDataUpdated', () => Alerts.check());
  if (GSE.startLiveUpdates) GSE.startLiveUpdates();
}

/* ── Number formatting helpers ───────────────────────────────── */
function formatGHS(n) { return `GHS ${Number(n).toLocaleString('en-GH', {minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function formatNum(n, d=2) { return Number(n).toFixed(d); }
function signClass(n) { return n > 0 ? 'number-positive' : n < 0 ? 'number-negative' : 'number-neutral'; }
function signStr(n)   { return n > 0 ? `+${n}` : `${n}`; }

/* ── Mini price chart helper (Canvas sparkline) ──────────────── */
function drawSparkline(canvas, data, color = '#00C896') {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '40');
  grad.addColorStop(1, color + '00');
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Fill
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
}
