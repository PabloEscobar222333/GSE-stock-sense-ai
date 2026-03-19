/* ================================================================
   GSE StockSense AI — App Utilities
   Auth, Session, Usage Counter, Paywall, Toast, Sidebar
   ================================================================ */

/* ── Auth ─────────────────────────────────────────────────────── */
const Auth = {
  KEY: 'gse_user',
  SESSION_KEY: 'gse_session',

  getUser() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || null; } catch { return null; }
  },

  getSession() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)) || null; } catch { return null; }
  },

  saveUser(user) {
    localStorage.setItem(this.KEY, JSON.stringify(user));
  },

  login(user) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({ ...user, loggedInAt: Date.now() }));
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    window.location.href = 'index.html';
  },

  requireAuth() {
    if (!this.getSession()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  isLoggedIn() {
    return !!this.getSession();
  },
};

/* ── Usage Counter ────────────────────────────────────────────── */
const Usage = {
  KEY: 'gse_usage',
  FREE_LIMIT: 5,

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || { count: 0, limit: this.FREE_LIMIT }; } catch { return { count: 0, limit: this.FREE_LIMIT }; }
  },

  isPremium() {
    try {
      const sub = JSON.parse(localStorage.getItem('gse_subscription'));
      return sub && sub.isPremium === true;
    } catch { return false; }
  },

  remaining() {
    if (this.isPremium()) return Infinity;
    const u = this.get();
    return Math.max(0, u.limit - u.count);
  },

  canAnalyze() {
    return this.isPremium() || this.remaining() > 0;
  },

  increment() {
    if (this.isPremium()) return;
    const u = this.get();
    u.count = Math.min(u.count + 1, this.FREE_LIMIT + 1);
    localStorage.setItem(this.KEY, JSON.stringify(u));
    this.updateAllCounters();
  },

  // Returns true if analysis allowed, false if paywalled
  checkAndConsume() {
    if (this.canAnalyze()) {
      this.increment();
      this.updateAllCounters();
      return true;
    } else {
      Paywall.show();
      return false;
    }
  },

  updateAllCounters() {
    const rem = this.remaining();
    const isPremium = this.isPremium();

    // Sidebar counter
    document.querySelectorAll('[data-usage-remaining]').forEach(el => {
      el.textContent = isPremium ? 'Unlimited' : `${rem} remaining`;
    });
    document.querySelectorAll('[data-usage-bar]').forEach(el => {
      el.style.width = isPremium ? '100%' : `${(rem / this.FREE_LIMIT) * 100}%`;
      el.style.background = rem <= 1 ? 'var(--red)' : rem <= 2 ? 'var(--amber)' : '';
    });

    // Topbar pill
    document.querySelectorAll('[data-usage-pill]').forEach(el => {
      if (isPremium) {
        el.textContent = 'Premium';
        el.className = 'usage-pill';
      } else {
        el.textContent = `${rem} of ${this.FREE_LIMIT} free`;
        el.className = `usage-pill ${rem <= 1 ? 'critical' : rem <= 2 ? 'warning' : ''}`;
      }
    });
  },
};

/* ── Paywall ─────────────────────────────────────────────────── */
const Paywall = {
  show() {
    if (document.getElementById('paywallModal')) return;
    const modal = document.createElement('div');
    modal.id = 'paywallModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="Upgrade to continue">
        <div style="text-align:center;margin-bottom:8px;">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin:0 auto 16px">
            <path d="M24 4L44 16V32L24 44L4 32V16L24 4Z" stroke="var(--gold)" stroke-width="1.5" fill="var(--gold-glow)"/>
            <path d="M24 12L36 19V32L24 39L12 32V19L24 12Z" fill="rgba(201,168,76,0.15)" stroke="var(--gold)" stroke-width="1"/>
          </svg>
          <h2 style="text-align:center">You've explored everything free.</h2>
          <p style="text-align:center">Upgrade to keep your edge on the Ghana Stock Exchange.</p>
        </div>
        <div class="modal-plans">
          <div class="plan-card" id="planMonthly">
            <div class="plan-name">Monthly</div>
            <div class="plan-price">GHS 100</div>
            <div class="plan-period">per month</div>
            <ul style="list-style:none;text-align:left;font-size:13px;color:var(--text-secondary);margin-bottom:20px;display:flex;flex-direction:column;gap:6px">
              <li>✓ Unlimited analyses</li>
              <li>✓ Real-time AI signals</li>
              <li>✓ Portfolio allocator</li>
              <li>✓ News monitor</li>
              <li>✓ Alert system</li>
            </ul>
            <button class="btn btn-secondary btn-lg" onclick="Paywall.upgrade('monthly')">Choose Monthly</button>
          </div>
          <div class="plan-card featured" id="planYearly">
            <div class="best-value">Best Value</div>
            <div class="plan-name">Yearly</div>
            <div class="plan-price">GHS 900</div>
            <div class="plan-period">per year</div>
            <div class="plan-savings">Save GHS 300 vs monthly</div>
            <ul style="list-style:none;text-align:left;font-size:13px;color:var(--text-secondary);margin-bottom:20px;display:flex;flex-direction:column;gap:6px">
              <li>✓ Everything in monthly</li>
              <li>✓ Priority signal alerts</li>
              <li>✓ Advanced macro dashboard</li>
              <li>✓ Downloadable PDF reports</li>
              <li>✓ Early feature access</li>
            </ul>
            <button class="btn btn-gold btn-lg" onclick="Paywall.upgrade('yearly')">Choose Yearly</button>
          </div>
        </div>
        <p style="text-align:center;font-size:12px;color:var(--text-muted)">Cancel anytime. No hidden fees.</p>
        <button onclick="Paywall.close()" style="position:absolute;top:20px;right:20px;color:var(--text-muted);font-size:24px;line-height:1;background:none;border:none;cursor:pointer">×</button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) Paywall.close(); });
  },

  close() {
    const m = document.getElementById('paywallModal');
    if (m) m.remove();
  },

  upgrade(plan) {
    const sub = { isPremium: true, plan, startedAt: Date.now() };
    localStorage.setItem('gse_subscription', JSON.stringify(sub));
    this.close();
    Usage.updateAllCounters();
    Toast.show('success', `Upgraded to ${plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan! Welcome to StockSense Premium.`);
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
    toast.innerHTML = `
      <span style="font-size:18px;color:${colors[type]}">${icons[type]}</span>
      <span>${message}</span>`;
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
  KEY: 'gse_profile',

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || null; } catch { return null; }
  },

  save(profileData) {
    localStorage.setItem(this.KEY, JSON.stringify(profileData));
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
    { href:'pricing.html',   label:'Pricing', icon:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' },
    { href:'settings.html',  label:'Settings', icon:'<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a1 1 0 0 0-1.41 0l-1.1 1.1a7 7 0 0 0-9.12 9.12l-1.1 1.1a1 1 0 0 0 0 1.41l.7.7a1 1 0 0 0 1.41 0l1.1-1.1a7 7 0 0 0 9.12-9.12l1.1-1.1a1 1 0 0 0 0-1.41z"/>' },
  ],

  LOGO_SVG: `<svg class="logo-icon" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 2L31 9.5V24.5L17 32L3 24.5V9.5L17 2Z" stroke="#C9A84C" stroke-width="1.5" fill="rgba(201,168,76,0.08)"/>
    <path d="M17 8L26 12.5V21.5L17 26L8 21.5V12.5L17 8Z" fill="rgba(201,168,76,0.15)" stroke="#C9A84C" stroke-width="1"/>
    <circle cx="17" cy="17" r="2.5" fill="#C9A84C"/>
  </svg>`,

  render(activePage) {
    const user = Auth.getSession() || { name: 'Investor' };
    const profile = Profile.get();
    const usage = Usage.get();
    const isPremium = Usage.isPremium();
    const rem = Usage.remaining();

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
          ${!isPremium ? `<div class="usage-counter">
            <div class="usage-label">
              <span>Free Analyses</span>
              <span data-usage-remaining>${rem} remaining</span>
            </div>
            <div class="usage-bar"><div class="usage-bar-fill" data-usage-bar style="width:${(rem/5)*100}%"></div></div>
          </div>` : `<div class="usage-counter" style="border-color:var(--gold);background:var(--gold-glow)">
            <div class="usage-label"><span style="color:var(--gold)">Premium Active</span><span style="color:var(--gold)">Unlimited</span></div>
          </div>`}
          <div style="position:relative">
            <div id="profileTrigger" onclick="Sidebar.toggleDropdown(event)" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-sm);cursor:pointer;transition:background 0.2s ease;user-select:none" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
              <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--emerald));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--bg-deep);flex-shrink:0">${(user.name||'I')[0].toUpperCase()}</div>
              <div style="overflow:hidden;flex:1;min-width:0">
                <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.name||'Investor'}</div>
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
          ${(user.name||'I')[0].toUpperCase()}
        </div>
        <!-- Topbar Dropdown -->
        <div id="topbarDropdown" style="display:none;position:absolute;top:calc(100% + 12px);right:0;width:180px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:0 8px 32px rgba(0,0,0,0.5);overflow:hidden;z-index:999;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
            <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.name||'Investor'}</div>
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

  // Update topbar usage pill
  Usage.updateAllCounters();
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

/* ── Generate mock price history ──────────────────────────────── */
function mockPriceHistory(basePrice, days = 30, signal = 'HOLD') {
  const prices = [basePrice];
  const trend = signal === 'BUY' ? 0.003 : signal === 'SELL' ? -0.003 : 0;
  for (let i = 1; i < days; i++) {
    const prev = prices[i - 1];
    const change = (Math.random() - 0.5) * 0.02 + trend;
    prices.push(Math.max(0.01, prev * (1 + change)));
  }
  return prices;
}
