/*
 * J.A.R.V.I.S. Network — shared, page-independent site chrome logic.
 *
 * Redesign-Schritt 4A.1 (WEBSITE_ARCHITECTURE_V1.md): consolidates the
 * genuinely global parts of what used to be an ~860-line script
 * duplicated between index.html and project/index.html - mobile nav,
 * the i18n engine core, login/logout, and the Ask JARVIS panel wiring.
 *
 * Deliberately NOT included here (stays page-specific, see the
 * Schritt-4A.1 report for the full classification):
 *   - HOME's own content data/rendering (renderHomeV1 and friends)
 *   - the Observation/Reaction UI (form, list, confirm/contradict) -
 *     PROJECT does not need it and must not load it just because it
 *     used to live in the same copied block
 *   - PROJECT's own content data/rendering (renderProject)
 *
 * Plain classic script (loaded via <script src="site-chrome.js">, no
 * type="module") so every page can include it with one line - the one
 * genuinely module-only piece (the Supabase JS import) is loaded via a
 * dynamic import() inside initAuthAndAsk(), which works from a classic
 * script in every browser this site already targets.
 *
 * No framework, no bundler, no build step, no SPA router - this file
 * is a plain static asset like foundation.css/site-chrome.css.
 */
(function (window, document) {
  'use strict';

  // ==================================================================
  // i18n engine core. Pages register their own STRINGS (nav.*/login.*/
  // ask.*/footer.* are already provided here so pages don't repeat
  // them) and their own page title, then call applyStaticStrings() and
  // their own initial render once on load. onLanguageChange(fn) lets a
  // page hook its own re-render for subsequent language switches.
  // ==================================================================
  var STRINGS = {
    "nav.home": { en: "HOME", de: "STARTSEITE" },
    "nav.project": { en: "PROJECT", de: "PROJEKT" },
    "nav.signal": { en: "SIGNAL", de: "SIGNAL" },
    "nav.discuss": { en: "DISCUSS", de: "DISKUTIEREN" },
    "nav.knowledge": { en: "KNOWLEDGE", de: "WISSEN" },
    "nav.lab": { en: "LAB", de: "LABOR" },
    "nav.search": { en: "SEARCH", de: "SUCHE" },
    "nav.login": { en: "LOGIN", de: "ANMELDEN" },
    "nav.online": { en: "ONLINE", de: "ONLINE" },
    "ask.btn": { en: "ASK J.A.R.V.I.S.", de: "J.A.R.V.I.S. FRAGEN" },
    "ask.placeholder": { en: "Ask about anything on this platform…", de: "Frag alles über diese Plattform…" },
    "ask.send": { en: "ASK", de: "FRAGEN" },
    "ask.note": { en: "Ask a question and get a real, cited answer from J.A.R.V.I.S.", de: "Stelle eine Frage und erhalte eine echte, belegte Antwort von J.A.R.V.I.S." },
    "ask.statusSubmitting": { en: "Sending…", de: "Wird gesendet…" },
    "ask.statusPending": { en: "Waiting in queue…", de: "Wartet in der Warteschlange…" },
    "ask.statusProcessing": { en: "J.A.R.V.I.S. is researching…", de: "J.A.R.V.I.S. recherchiert…" },
    "ask.authRequired": { en: "Sign in to ask J.A.R.V.I.S.", de: "Melde dich an, um J.A.R.V.I.S. zu fragen." },
    "ask.authRequiredLink": { en: "Sign in", de: "Anmelden" },
    "ask.expired": { en: "This request took too long and expired. Please try again.", de: "Diese Anfrage hat zu lange gedauert und ist abgelaufen. Bitte erneut versuchen." },
    "ask.errorGeneric": { en: "Something went wrong. Please try again.", de: "Etwas ist schiefgelaufen. Bitte erneut versuchen." },
    "ask.error.network_request_rate_limited": { en: "Too many questions in a short time. Please wait a moment.", de: "Zu viele Fragen in kurzer Zeit. Bitte kurz warten." },
    "ask.error.network_request_user_busy": { en: "You already have an open question. Please wait for it to finish.", de: "Du hast bereits eine offene Frage. Bitte warte, bis sie fertig ist." },
    "ask.error.network_request_queue_full": { en: "J.A.R.V.I.S. is busy right now. Please try again shortly.", de: "J.A.R.V.I.S. ist gerade ausgelastet. Bitte versuche es gleich noch einmal." },
    "ask.error.network_request_question_invalid": { en: "That question isn't valid (empty or too long).", de: "Diese Frage ist ungültig (leer oder zu lang)." },
    "ask.error.network_request_user_invalid": { en: "Please sign in again.", de: "Bitte melde dich erneut an." },
    "ask.error.user_context_missing": { en: "Please sign in again.", de: "Bitte melde dich erneut an." },
    "ask.error.network_turn_timeout": { en: "J.A.R.V.I.S. took too long to answer. Please try again.", de: "J.A.R.V.I.S. hat zu lange für die Antwort gebraucht. Bitte erneut versuchen." },
    "ask.error.network_turn_answer_empty": { en: "J.A.R.V.I.S. didn't produce an answer. Please try again.", de: "J.A.R.V.I.S. hat keine Antwort erzeugt. Bitte erneut versuchen." },
    "ask.sectionAnswer": { en: "ANSWER", de: "ANTWORT" },
    "ask.sourceLabelSingular": { en: "Source:", de: "Quelle:" },
    "ask.sourceLabelPlural": { en: "Sources:", de: "Quellen:" },
    "ask.answerPlaceholder": { en: "Here's where J.A.R.V.I.S.'s answer will appear.", de: "Hier erscheint die Antwort von J.A.R.V.I.S." },
    "ask.showDetails": { en: "Show research details", de: "Recherche-Details anzeigen" },
    "ask.detail.Fakten": { en: "Facts", de: "Fakten" },
    "ask.detail.Daten": { en: "Data", de: "Daten" },
    "ask.detail.Ursachen": { en: "Causes", de: "Ursachen" },
    "ask.detail.Auswirkungen": { en: "Effects", de: "Auswirkungen" },
    "ask.detail.Einordnung": { en: "Context", de: "Einordnung" },
    "ask.detail.Unsicherheiten": { en: "Uncertainties", de: "Unsicherheiten" },
    "login.title": { en: "SIGN IN", de: "ANMELDEN" },
    "login.tabSignin": { en: "SIGN IN", de: "ANMELDEN" },
    "login.tabSignup": { en: "SIGN UP", de: "REGISTRIEREN" },
    "login.email": { en: "Email", de: "E-Mail" },
    "login.password": { en: "Password", de: "Passwort" },
    "login.submitSignin": { en: "SIGN IN", de: "ANMELDEN" },
    "login.submitSignup": { en: "CREATE ACCOUNT", de: "KONTO ERSTELLEN" },
    "login.working": { en: "Working…", de: "Einen Moment…" },
    "login.success": { en: "Signed in.", de: "Angemeldet." },
    "login.signupCheckEmail": { en: "Check your email to confirm your account.", de: "Bitte bestätige dein Konto per E-Mail." },
    "login.errorMissing": { en: "Please enter email and password.", de: "Bitte E-Mail und Passwort eingeben." },
    "login.errorGeneric": { en: "Sign-in failed. Please try again.", de: "Anmeldung fehlgeschlagen. Bitte erneut versuchen." },
    "login.signedOut": { en: "Signed out.", de: "Abgemeldet." },
    "login.forgotLink": { en: "Forgot password?", de: "Passwort vergessen?" },
    "login.forgotHint": { en: "Enter your email and we'll send you a reset link.", de: "Gib deine E-Mail-Adresse ein, wir senden dir einen Reset-Link." },
    "login.forgotSubmit": { en: "SEND RESET LINK", de: "RESET-LINK SENDEN" },
    "login.backToSignin": { en: "Back to sign in", de: "Zurück zur Anmeldung" },
    "login.recoveryHint": { en: "Enter a new password for your account.", de: "Gib ein neues Passwort für dein Konto ein." },
    "login.newPassword": { en: "New password", de: "Neues Passwort" },
    "login.confirmPassword": { en: "Confirm password", de: "Passwort bestätigen" },
    "login.recoverySubmit": { en: "SET NEW PASSWORD", de: "NEUES PASSWORT SETZEN" },
    "login.resetEmailSent": { en: "Check your email for a password reset link.", de: "Prüfe deine E-Mails für den Reset-Link." },
    "login.passwordUpdated": { en: "Password updated. You're signed in.", de: "Passwort aktualisiert. Du bist angemeldet." },
    "login.errorMissingEmail": { en: "Please enter your email.", de: "Bitte E-Mail-Adresse eingeben." },
    "login.errorPasswordTooShort": { en: "Password must be at least 6 characters.", de: "Passwort muss mindestens 6 Zeichen haben." },
    "login.errorPasswordMismatch": { en: "Passwords do not match.", de: "Passwörter stimmen nicht überein." },
    "login.recoveryLinkInvalid": { en: "This reset link is invalid or has expired. Please request a new one.", de: "Dieser Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an." },
    "footer.desc": { en: "A digital platform for people who want to understand, discuss and build the next generation of intelligent systems.", de: "Eine digitale Plattform für Menschen, die die nächste Generation intelligenter Systeme verstehen, diskutieren und mitgestalten wollen." },
    "footer.tagline": { en: "Built. Tested. Changed. Tested again.", de: "Gebaut. Getestet. Geändert. Wieder getestet." },
    "footer.platform": { en: "PLATFORM", de: "PLATTFORM" },
    "footer.project": { en: "JARVIS Project", de: "JARVIS Projekt" },
    "footer.knowledge": { en: "AI Knowledge", de: "KI-Wissen" },
    "footer.news": { en: "AI Signal", de: "KI Signal" },
    "footer.lab": { en: "AI Lab", de: "KI Labor" },
    "footer.community": { en: "DISCUSS", de: "DISKUTIEREN" },
    "footer.discussions": { en: "Discussions", de: "Diskussionen" },
    "footer.models": { en: "Models", de: "Modelle" },
    "footer.ideas": { en: "Ideas", de: "Ideen" },
    "footer.room": { en: "JARVIS Room", de: "JARVIS Raum" },
    "footer.about": { en: "ABOUT", de: "ÜBER" },
    "footer.aboutProject": { en: "About the Project", de: "Über das Projekt" },
    "footer.roadmap": { en: "Roadmap", de: "Roadmap" },
    "footer.contact": { en: "Contact", de: "Kontakt" },
    "footer.copy": { en: "© J.A.R.V.I.S. NETWORK — A GROWING AI COMMUNITY", de: "© J.A.R.V.I.S. NETWORK — EINE WACHSENDE KI-COMMUNITY" },
    "footer.networkOnline": { en: "NETWORK ONLINE", de: "NETZWERK ONLINE" }
  };

  var pageTitleMap = null;
  var languageChangeListeners = [];

  var currentLang = (function () {
    try {
      var saved = localStorage.getItem('jarvis-lang');
      if (saved === 'en' || saved === 'de') { return saved; }
    } catch (e) {}
    return (navigator.language || 'en').toLowerCase().indexOf('de') === 0 ? 'de' : 'en';
  })();

  function registerStrings(obj) {
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) { STRINGS[key] = obj[key]; }
    }
  }

  function t(key) {
    var entry = STRINGS[key];
    return entry ? entry[currentLang] : key;
  }

  function getLang() { return currentLang; }

  function setPageTitle(map) { pageTitleMap = map; }

  function applyStaticStrings() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.documentElement.lang = currentLang;
    if (pageTitleMap) { document.title = pageTitleMap[currentLang]; }
    document.querySelectorAll('#lang-toggle button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === currentLang);
    });
  }

  function onLanguageChange(fn) { languageChangeListeners.push(fn); }

  function setLanguage(lang) {
    currentLang = lang;
    try { localStorage.setItem('jarvis-lang', lang); } catch (e) {}
    applyStaticStrings();
    languageChangeListeners.forEach(function (fn) { fn(lang); });
  }

  document.querySelectorAll('#lang-toggle button').forEach(function (b) {
    b.addEventListener('click', function () { setLanguage(b.getAttribute('data-lang')); });
  });

  // ==================================================================
  // Small shared rendering utilities (no page-specific data).
  // ==================================================================
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderNodeFlow(container, items) {
    if (!container) { return; }
    container.innerHTML = '';
    items.forEach(function (node, idx) {
      var span = document.createElement('span');
      span.className = 'arch-node' + (node.emphasis ? ' emphasis' : '');
      span.textContent = node[currentLang];
      container.appendChild(span);
      if (idx < items.length - 1) {
        var arrow = document.createElement('span');
        arrow.className = 'arch-arrow';
        arrow.textContent = '→';
        container.appendChild(arrow);
      }
    });
  }

  function renderParagraphs(container, paragraphs) {
    if (!container) { return; }
    container.innerHTML = '';
    (paragraphs[currentLang] || []).forEach(function (text) {
      var p = document.createElement('p');
      p.textContent = text; // textContent only - never innerHTML
      container.appendChild(p);
    });
  }

  // ==================================================================
  // Mobile main-navigation toggle. Identical markup/IDs on every page
  // (#nav-toggle / #main-nav) - see site-chrome.css for the CSS side.
  // ==================================================================
  function initMobileNav() {
    var navToggle = document.getElementById('nav-toggle');
    var mainNav = document.getElementById('main-nav');
    if (!navToggle || !mainNav) { return; }

    function isOpen() { return mainNav.classList.contains('open'); }
    function close() {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
    function open() {
      mainNav.classList.add('open');
      navToggle.setAttribute('aria-expanded', 'true');
    }

    navToggle.addEventListener('click', function () { if (isOpen()) { close(); } else { open(); } });
    mainNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { close(); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { close(); navToggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!isOpen()) { return; }
      if (mainNav.contains(e.target) || navToggle.contains(e.target)) { return; }
      close();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && isOpen()) { close(); }
    });
  }

  // ==================================================================
  // PROJECT local navigation - grouped, scalable (Redesign-Schritt 4G,
  // WEBSITE_ARCHITECTURE_V1.md). Single shared source of truth for
  // which PROJECT-area pages exist and how they group, so a new page
  // only ever needs one new line here plus one initProjectNav() call -
  // never per-page duplicated link lists. Only pages that actually
  // exist are listed; a group with no real pages yet simply doesn't
  // render (see PROJECT_NAV_GROUPS) - no "coming soon" / dead links.
  // Same accessible toggle/panel pattern as initMobileNav() above:
  // aria-expanded, Escape-to-close, outside-click-to-close, resize-
  // past-breakpoint-closes. Desktop (>860px): panel renders as a
  // compact grouped row. Mobile (<=860px): panel becomes a disclosure
  // dropdown behind the toggle button.
  // ==================================================================
  var PROJECT_NAV_GROUPS = [
    { en: "OVERVIEW", de: "ÜBERSICHT", items: [
      { key: "overview", en: "Overview", de: "Übersicht", href: "" },
      { key: "story", en: "Story", de: "Geschichte", href: "geschichte/" }
    ] },
    { en: "THINKING & REMEMBERING", de: "DENKEN & ERINNERN", items: [
      { key: "core", en: "Core", de: "Kern", href: "kern/" },
      { key: "memory", en: "Memory", de: "Gedächtnis", href: "gedaechtnis/" },
      { key: "planning", en: "Planning", de: "Planung", href: "planung/" }
    ] },
    { en: "PERCEIVING & COMMUNICATING", de: "WAHRNEHMEN & KOMMUNIZIEREN", items: [
      { key: "voice", en: "Voice", de: "Sprache", href: "sprache/" },
      { key: "vision", en: "Vision", de: "Vision", href: "vision/" }
    ] },
    { en: "ACTING & RESEARCHING", de: "HANDELN & RECHERCHIEREN", items: [
      { key: "agents", en: "Agents", de: "Agenten", href: "agenten/" },
      { key: "research", en: "Research", de: "Recherche", href: "recherche/" },
      { key: "browser", en: "Browser", de: "Browser", href: "browser/" },
      { key: "tools", en: "Tools", de: "Werkzeuge", href: "werkzeuge/" },
      { key: "automation", en: "Automation", de: "Automatisierung", href: "automatisierung/" }
    ] },
    { en: "INFRASTRUCTURE", de: "INFRASTRUKTUR", items: [
      { key: "hardware", en: "Hardware", de: "Hardware", href: "hardware/" }
    ] }
  ];

  function initProjectNav(current, base) {
    var container = document.getElementById("project-nav");
    if (!container) { return; }
    base = base || "";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "pnav-toggle";
    toggle.id = "pnav-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "pnav-panel");
    var toggleLabel = document.createElement("span");
    var caret = document.createElement("span");
    caret.className = "pnav-caret";
    caret.setAttribute("aria-hidden", "true");
    caret.textContent = "▾";
    toggle.appendChild(toggleLabel);
    toggle.appendChild(caret);

    var panel = document.createElement("div");
    panel.className = "pnav-panel";
    panel.id = "pnav-panel";

    function renderTexts() {
      toggleLabel.textContent = currentLang === "de" ? "Bereich auswählen" : "Choose a section";
      panel.querySelectorAll(".pnav-group").forEach(function (groupEl, gi) {
        var group = PROJECT_NAV_GROUPS[gi];
        groupEl.querySelector(".pnav-group-title").textContent = group[currentLang];
        groupEl.querySelectorAll("a").forEach(function (a, ii) {
          a.textContent = group.items[ii][currentLang];
        });
      });
    }

    PROJECT_NAV_GROUPS.forEach(function (group) {
      var groupEl = document.createElement("div");
      groupEl.className = "pnav-group";
      var titleEl = document.createElement("span");
      titleEl.className = "pnav-group-title";
      groupEl.appendChild(titleEl);
      group.items.forEach(function (item) {
        var a = document.createElement("a");
        a.className = "pnav-link";
        a.href = base + item.href;
        if (item.key === current) {
          a.classList.add("current");
          a.setAttribute("aria-current", "page");
        }
        groupEl.appendChild(a);
      });
      panel.appendChild(groupEl);
    });

    container.innerHTML = "";
    container.appendChild(toggle);
    container.appendChild(panel);
    renderTexts();

    function isOpen() { return panel.classList.contains("open"); }
    function close() { panel.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    function open() { panel.classList.add("open"); toggle.setAttribute("aria-expanded", "true"); }

    toggle.addEventListener("click", function () { if (isOpen()) { close(); } else { open(); } });
    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { close(); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { close(); toggle.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!isOpen()) { return; }
      if (panel.contains(e.target) || toggle.contains(e.target)) { return; }
      close();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860 && isOpen()) { close(); }
    });

    onLanguageChange(renderTexts);
  }

  // ==================================================================
  // Supabase config + REST helpers. Same real project/public key on
  // every page - never a service key (see supabase/README.md).
  // ==================================================================
  var JARVIS_NETWORK_CONFIG = {
    supabaseUrl: 'https://dvnfgqgfwkjdlfpkaefq.supabase.co',
    supabasePublishableKey: 'sb_publishable_n733LwdTlQkOi3aFg4uUXA_SgTwoI06',
    gatewayUrl: ''
  };

  function isSupabaseConfigured() {
    return !!(
      JARVIS_NETWORK_CONFIG.supabaseUrl &&
      JARVIS_NETWORK_CONFIG.supabaseUrl.indexOf('https://') === 0 &&
      JARVIS_NETWORK_CONFIG.supabasePublishableKey
    );
  }

  function restFetch(path) {
    var url = JARVIS_NETWORK_CONFIG.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + path;
    return fetch(url, { headers: { apikey: JARVIS_NETWORK_CONFIG.supabasePublishableKey } }).then(function (res) {
      if (!res.ok) { throw new Error('Supabase request failed: ' + res.status + ' ' + path); }
      return res.json();
    });
  }

  // Same anon-key GET as restFetch(), plus the signed-in user's own
  // bearer token - needed for rows RLS scopes to "own row only" (e.g.
  // a member's own reaction), which restFetch() alone would see as the
  // anon role and get zero rows for. Generic REST utility, not
  // Observation-specific, even though today only the Observation code
  // on HOME calls it.
  function restFetchAuthenticated(path) {
    var url = JARVIS_NETWORK_CONFIG.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + path;
    return fetch(url, {
      headers: { apikey: JARVIS_NETWORK_CONFIG.supabasePublishableKey, Authorization: 'Bearer ' + accessToken() }
    }).then(function (res) {
      if (!res.ok) { throw new Error('Supabase request failed: ' + res.status + ' ' + path); }
      return res.json();
    });
  }

  // ==================================================================
  // Auth + Ask JARVIS. session/accessToken/isAuthenticated are exposed
  // so a page's own code (e.g. HOME's Observation/Reaction UI) can read
  // the shared session without re-implementing login. onAuthChange(fn)
  // lets a page hook additional work into the same
  // getSession()/onAuthStateChange() flow this module already owns,
  // instead of adding a second auth listener.
  // ==================================================================
  var session = null;
  var authChangeListeners = [];

  function isAuthenticated() { return !!session; }
  function accessToken() { return session && session.access_token ? session.access_token : ''; }
  function currentUserId() { return session && session.user ? session.user.id : ''; }
  function onAuthChange(fn) { authChangeListeners.push(fn); }

  function initAuthAndAsk() {
    var AJC = window.AskJarvisClient;
    if (!isSupabaseConfigured() || !AJC) { return; }

    import('https://esm.sh/@supabase/supabase-js@2').then(function (mod) {
      var createClient = mod.createClient;
      var supabase = createClient(JARVIS_NETWORK_CONFIG.supabaseUrl, JARVIS_NETWORK_CONFIG.supabasePublishableKey);
      var EDGE_FUNCTION_URL = JARVIS_NETWORK_CONFIG.supabaseUrl.replace(/\/+$/, '') + '/functions/v1/ask-jarvis';

      var loginBtn = document.getElementById('nav-login-btn');
      var loginPanel = document.getElementById('login-panel');
      var loginClose = document.getElementById('login-close');
      var loginForm = document.getElementById('login-form');
      var loginEmail = document.getElementById('login-email');
      var loginPassword = document.getElementById('login-password');
      var loginSubmit = document.getElementById('login-submit');
      var loginStatus = document.getElementById('login-status');
      var loginTabSignin = document.getElementById('login-tab-signin');
      var loginTabSignup = document.getElementById('login-tab-signup');
      var loginTabs = document.getElementById('login-tabs');
      var loginForgotLink = document.getElementById('login-forgot-link');
      var forgotForm = document.getElementById('forgot-form');
      var forgotEmail = document.getElementById('forgot-email');
      var forgotSubmit = document.getElementById('forgot-submit');
      var forgotBackLink = document.getElementById('forgot-back-link');
      var recoveryForm = document.getElementById('recovery-form');
      var recoveryPassword = document.getElementById('recovery-password');
      var recoveryPasswordConfirm = document.getElementById('recovery-password-confirm');
      var recoverySubmit = document.getElementById('recovery-submit');

      // Fixed, single allowed redirect target - never derived from the
      // current location, so this can't be manipulated into pointing
      // anywhere else (e.g. via a crafted query string).
      var PASSWORD_RESET_REDIRECT_URL = 'https://jarvis-network-ai.github.io/';

      var askBtn = document.getElementById('ask-toggle');
      var askPanel = document.getElementById('ask-panel');
      var askClose = document.getElementById('ask-close');
      var askInput = document.getElementById('ask-input');
      var askSend = document.getElementById('ask-send');
      var askCharCount = document.getElementById('ask-char-count');
      var askStatus = document.getElementById('ask-status');
      var askStatusSpinner = document.getElementById('ask-status-spinner');
      var askStatusText = document.getElementById('ask-status-text');
      var askAnswer = document.getElementById('ask-answer');
      var askDetails = document.getElementById('ask-details');
      var askDetailsBody = document.getElementById('ask-details-body');
      var askSourcesSection = document.getElementById('ask-sources-section');
      var askSourcesLabel = document.getElementById('ask-sources-label');
      var askSources = document.getElementById('ask-sources');
      var askAuthRequired = document.getElementById('ask-auth-required');
      var askAuthLoginLink = document.getElementById('ask-auth-login-link');

      function setAskPanelOpen(isOpen) {
        if (!askPanel || !askBtn) { return; }
        askPanel.classList.toggle('open', isOpen);
        askBtn.hidden = isOpen;
      }

      if (askBtn) { askBtn.addEventListener('click', function () { setAskPanelOpen(!askPanel.classList.contains('open')); }); }
      if (askClose) { askClose.addEventListener('click', function () { setAskPanelOpen(false); }); }
      // Redesign-Schritt 10 (ASK JARVIS, 18. August 2026): the main-nav
      // "ASK J.A.R.V.I.S." link now points to the real standalone /ask/
      // page (analogous to KNOWLEDGE/LAB/DISCUSS), so it navigates like
      // every other nav entry instead of intercepting the click to open
      // the floating quick-ask panel. The floating panel itself (opened
      // via the separate `#ask-toggle` corner button) is unchanged.

      var loginMode = 'signin';

      function updateLoginButton() {
        if (session && session.user) {
          loginBtn.textContent = session.user.email || t('login.signedIn');
        } else {
          loginBtn.textContent = t('nav.login');
        }
      }

      function setLoginStatus(message, kind) {
        loginStatus.textContent = message || '';
        loginStatus.classList.remove('is-error', 'is-ok');
        if (kind) { loginStatus.classList.add(kind === 'error' ? 'is-error' : 'is-ok'); }
      }

      function openLoginPanelFn() { loginPanel.classList.add('open'); }
      function closeLoginPanel() { loginPanel.classList.remove('open'); setLoginStatus(''); }

      function setLoginMode(mode) {
        loginMode = mode;
        var isAuthMode = mode === 'signin' || mode === 'signup';
        loginTabs.hidden = !isAuthMode;
        loginForm.hidden = !isAuthMode;
        forgotForm.hidden = mode !== 'forgot';
        recoveryForm.hidden = mode !== 'recovery';
        if (isAuthMode) {
          loginTabSignin.classList.toggle('active', mode === 'signin');
          loginTabSignup.classList.toggle('active', mode === 'signup');
          loginSubmit.textContent = t(mode === 'signin' ? 'login.submitSignin' : 'login.submitSignup');
        }
        setLoginStatus('');
      }

      loginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (session) { supabase.auth.signOut(); return; }
        loginPanel.classList.toggle('open');
      });
      loginClose.addEventListener('click', closeLoginPanel);
      loginTabSignin.addEventListener('click', function () { setLoginMode('signin'); });
      loginTabSignup.addEventListener('click', function () { setLoginMode('signup'); });
      loginForgotLink.addEventListener('click', function () { setLoginMode('forgot'); });
      forgotBackLink.addEventListener('click', function () { setLoginMode('signin'); });

      forgotForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = forgotEmail.value.trim();
        if (!email) { setLoginStatus(t('login.errorMissingEmail'), 'error'); return; }
        forgotSubmit.disabled = true;
        setLoginStatus(t('login.working'), null);
        supabase.auth.resetPasswordForEmail(email, { redirectTo: PASSWORD_RESET_REDIRECT_URL }).then(function (res) {
          forgotSubmit.disabled = false;
          if (res.error) { setLoginStatus(res.error.message || t('login.errorGeneric'), 'error'); return; }
          setLoginStatus(t('login.resetEmailSent'), 'ok');
        }).catch(function () {
          forgotSubmit.disabled = false;
          setLoginStatus(t('login.errorGeneric'), 'error');
        });
      });

      recoveryForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var password = recoveryPassword.value;
        var confirmPassword = recoveryPasswordConfirm.value;
        if (!password || password.length < 6) { setLoginStatus(t('login.errorPasswordTooShort'), 'error'); return; }
        if (password !== confirmPassword) { setLoginStatus(t('login.errorPasswordMismatch'), 'error'); return; }
        recoverySubmit.disabled = true;
        setLoginStatus(t('login.working'), null);
        supabase.auth.updateUser({ password: password }).then(function (res) {
          recoverySubmit.disabled = false;
          if (res.error) { setLoginStatus(res.error.message || t('login.errorGeneric'), 'error'); return; }
          recoveryForm.reset();
          setLoginStatus(t('login.passwordUpdated'), 'ok');
          window.setTimeout(function () { setLoginMode('signin'); closeLoginPanel(); }, 1200);
        }).catch(function () {
          recoverySubmit.disabled = false;
          setLoginStatus(t('login.errorGeneric'), 'error');
        });
      });

      function checkAuthCallbackParams() {
        var rawHash = window.location.hash || '';
        var hashParams = new URLSearchParams(rawHash.indexOf('#') === 0 ? rawHash.slice(1) : rawHash);
        var searchParams = new URLSearchParams(window.location.search || '');
        var errorCode = hashParams.get('error_code') || hashParams.get('error') ||
          searchParams.get('error_code') || searchParams.get('error');
        if (!errorCode) { return; }
        openLoginPanelFn();
        setLoginMode('forgot');
        setLoginStatus(t('login.recoveryLinkInvalid'), 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      checkAuthCallbackParams();

      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = loginEmail.value.trim();
        var password = loginPassword.value;
        if (!email || !password) { setLoginStatus(t('login.errorMissing'), 'error'); return; }
        loginSubmit.disabled = true;
        setLoginStatus(t('login.working'), null);
        var action = loginMode === 'signin'
          ? supabase.auth.signInWithPassword({ email: email, password: password })
          : supabase.auth.signUp({ email: email, password: password });
        action.then(function (res) {
          loginSubmit.disabled = false;
          if (res.error) { setLoginStatus(res.error.message || t('login.errorGeneric'), 'error'); return; }
          if (loginMode === 'signup' && res.data && !res.data.session) {
            setLoginStatus(t('login.signupCheckEmail'), 'ok');
            return;
          }
          setLoginStatus(t('login.success'), 'ok');
          window.setTimeout(closeLoginPanel, 700);
        }).catch(function () {
          loginSubmit.disabled = false;
          setLoginStatus(t('login.errorGeneric'), 'error');
        });
      });

      function handleSessionChange(newSession) {
        session = newSession || null;
        updateLoginButton();
        updateAskAuthGate();
        authChangeListeners.forEach(function (fn) { fn(session); });
      }

      supabase.auth.getSession().then(function (res) {
        handleSessionChange((res.data && res.data.session) || null);
      });
      supabase.auth.onAuthStateChange(function (event, newSession) {
        handleSessionChange(newSession);
        if (event === 'PASSWORD_RECOVERY') {
          openLoginPanelFn();
          setLoginMode('recovery');
          setLoginStatus('');
        }
      });

      onLanguageChange(updateLoginButton);

      function postCreate(question) {
        return fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', apikey: JARVIS_NETWORK_CONFIG.supabasePublishableKey, Authorization: 'Bearer ' + accessToken() },
          body: JSON.stringify({ question: question })
        }).then(function (res) {
          return res.json().catch(function () { return null; }).then(function (body) {
            if (res.status === 202 && body && body.request_id) {
              return { ok: true, status: body.status, requestId: body.request_id };
            }
            return { ok: false, errorCode: (body && body.error) || ('http_' + res.status) };
          });
        });
      }

      function getStatus(requestId) {
        var url = EDGE_FUNCTION_URL + '?request_id=' + encodeURIComponent(requestId);
        return fetch(url, {
          method: 'GET',
          headers: { apikey: JARVIS_NETWORK_CONFIG.supabasePublishableKey, Authorization: 'Bearer ' + accessToken() }
        }).then(function (res) {
          return res.json().catch(function () { return null; }).then(function (body) {
            if (res.status === 200 && body && body.status) {
              return { ok: true, status: body.status, answer: body.answer, sources: body.sources, errorCode: body.error_code };
            }
            return { ok: false, errorCode: (body && body.error) || ('http_' + res.status) };
          });
        });
      }

      var controller = AJC.createController({ postCreate: postCreate, getStatus: getStatus, onStateChange: renderAskState });

      function updateAskAuthGate() {
        if (!askInput) { return; }
        var authed = isAuthenticated();
        askAuthRequired.hidden = authed;
        var busy = controller.isBusy();
        askInput.disabled = !authed || busy;
        askSend.disabled = !authed || busy;
      }

      if (askAuthLoginLink) { askAuthLoginLink.addEventListener('click', openLoginPanelFn); }

      function resetAnswerToPlaceholder() {
        askAnswer.setAttribute('data-i18n', 'ask.answerPlaceholder');
        askAnswer.textContent = t('ask.answerPlaceholder');
        askAnswer.classList.add('is-placeholder');
        askDetails.hidden = true;
        askDetails.open = false;
        while (askDetailsBody.firstChild) { askDetailsBody.removeChild(askDetailsBody.firstChild); }
        askSourcesSection.hidden = true;
        while (askSources.firstChild) { askSources.removeChild(askSources.firstChild); }
      }

      var ASK_STATUS_LABELS = { submitting: 'ask.statusSubmitting', pending: 'ask.statusPending', processing: 'ask.statusProcessing' };

      function askErrorText(errorCode) {
        var key = 'ask.error.' + errorCode;
        var translated = t(key);
        return translated !== key ? translated : t('ask.errorGeneric');
      }

      function detailBlockTitle(name) {
        var key = 'ask.detail.' + name;
        var translated = t(key);
        return translated !== key ? translated : name;
      }

      function renderAnswer(answerText, sources) {
        var parsed = AJC.parseAskAnswer(answerText);

        askAnswer.removeAttribute('data-i18n');
        askAnswer.classList.remove('is-placeholder');
        while (askAnswer.firstChild) { askAnswer.removeChild(askAnswer.firstChild); }
        parsed.summaryParagraphs.forEach(function (paragraph) {
          var p = document.createElement('p');
          p.textContent = paragraph; // textContent only - never model HTML
          askAnswer.appendChild(p);
        });

        while (askDetailsBody.firstChild) { askDetailsBody.removeChild(askDetailsBody.firstChild); }
        if (parsed.detailSections.length) {
          parsed.detailSections.forEach(function (section) {
            var block = document.createElement('div');
            block.className = 'ask-detail-block';
            var heading = document.createElement('h4');
            heading.textContent = detailBlockTitle(section.title);
            block.appendChild(heading);
            var list = document.createElement('ul');
            section.items.forEach(function (item) {
              var li = document.createElement('li');
              li.textContent = item;
              list.appendChild(li);
            });
            block.appendChild(list);
            askDetailsBody.appendChild(block);
          });
          askDetails.hidden = false;
        } else {
          askDetails.hidden = true;
          askDetails.open = false;
        }

        while (askSources.firstChild) { askSources.removeChild(askSources.firstChild); }
        var validSources = (sources || []).filter(function (source) { return AJC.isSafeHttpUrl(source.url); });
        if (validSources.length) {
          askSourcesLabel.textContent = t(validSources.length === 1 ? 'ask.sourceLabelSingular' : 'ask.sourceLabelPlural');
          validSources.forEach(function (source) {
            var a = document.createElement('a');
            a.href = source.url; // safe: passed isSafeHttpUrl
            a.target = '_blank';
            a.rel = 'noopener noreferrer nofollow';
            a.textContent = AJC.urlHostname(source.url) || source.url;
            askSources.appendChild(a);
          });
          askSourcesSection.hidden = false;
        } else {
          askSourcesSection.hidden = true;
        }
      }

      function renderAskState(state) {
        updateAskAuthGate();
        if (state.phase === 'submitting') { resetAnswerToPlaceholder(); }
        if (state.phase === 'submitting' || state.phase === 'pending' || state.phase === 'processing') {
          askStatus.hidden = false;
          askStatus.classList.remove('is-error');
          askStatusSpinner.hidden = false;
          askStatusText.textContent = t(ASK_STATUS_LABELS[state.phase] || 'ask.statusPending');
          return;
        }
        if (state.phase === 'success' && state.result) {
          askStatus.hidden = true;
          renderAnswer(state.result.answer, state.result.sources);
          return;
        }
        if (state.phase === 'error') {
          askStatus.hidden = false;
          askStatusSpinner.hidden = true;
          askStatus.classList.add('is-error');
          askStatusText.textContent = askErrorText(state.errorCode);
          return;
        }
        if (state.phase === 'expired') {
          askStatus.hidden = false;
          askStatusSpinner.hidden = true;
          askStatus.classList.add('is-error');
          askStatusText.textContent = t('ask.expired');
        }
      }

      function updateCharCount() {
        var length = askInput.value.length;
        askCharCount.textContent = length + ' / ' + AJC.MAX_QUESTION_LENGTH;
        askCharCount.classList.toggle('is-over', length > AJC.MAX_QUESTION_LENGTH);
      }

      function submitAskQuestion() {
        var question = askInput.value;
        controller.submit(question, isAuthenticated()).then(function (result) {
          if (!result.ok && result.reason === 'not_authenticated') { openLoginPanelFn(); }
        });
      }

      // Redesign-Schritt 13 (COVER, 19. August 2026): the COVER page
      // intentionally has no Ask JARVIS UI at all (no #ask-panel
      // markup), only login - so askInput/askSend can legitimately be
      // null here, unlike every other page. Same null-guard style
      // already used above for askBtn/askClose in this function.
      if (askInput) {
        askInput.addEventListener('input', updateCharCount);
        updateCharCount();
        askInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { submitAskQuestion(); } });
      }
      if (askSend) { askSend.addEventListener('click', submitAskQuestion); }

      window.addEventListener('pagehide', function () { controller.stopPolling(); });

      updateAskAuthGate();
    });
  }

  function openLoginPanel() {
    var panel = document.getElementById('login-panel');
    if (panel) { panel.classList.add('open'); }
  }

  window.SiteChrome = {
    registerStrings: registerStrings,
    t: t,
    getLang: getLang,
    setPageTitle: setPageTitle,
    applyStaticStrings: applyStaticStrings,
    setLanguage: setLanguage,
    onLanguageChange: onLanguageChange,
    escapeHtml: escapeHtml,
    renderNodeFlow: renderNodeFlow,
    renderParagraphs: renderParagraphs,
    initMobileNav: initMobileNav,
    initProjectNav: initProjectNav,
    JARVIS_NETWORK_CONFIG: JARVIS_NETWORK_CONFIG,
    isSupabaseConfigured: isSupabaseConfigured,
    restFetch: restFetch,
    restFetchAuthenticated: restFetchAuthenticated,
    isAuthenticated: isAuthenticated,
    accessToken: accessToken,
    currentUserId: currentUserId,
    openLoginPanel: openLoginPanel,
    onAuthChange: onAuthChange,
    initAuthAndAsk: initAuthAndAsk
  };
})(window, document);
