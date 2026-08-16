/*
 * Pure request/poll state machine for the "Ask J.A.R.V.I.S." panel.
 *
 * Deliberately has NO DOM and NO direct network/Supabase dependency: every
 * side effect (posting the question, polling status, timers) is injected,
 * so this file loads unmodified in the browser (classic <script>, attaches
 * `window.AskJarvisClient`) AND in plain Node (`require(...)`) for the
 * automated tests under tests/ask-jarvis-client.test.js - no build tool,
 * no bundler, matching the rest of this static site.
 *
 * Rendering (textContent-only, never innerHTML, for anything that came
 * from the network) lives in index.html next to the DOM it renders into -
 * this file only decides WHAT should be shown, never HOW.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AskJarvisClient = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_QUESTION_LENGTH = 2000;
  var TERMINAL_STATUSES = { success: true, error: true, expired: true };
  var DEFAULT_POLL_INTERVAL_MS = 2500;

  function validateQuestion(text) {
    var trimmed = String(text === null || text === undefined ? '' : text).trim();
    if (!trimmed) {
      return { ok: false, reason: 'empty' };
    }
    if (trimmed.length > MAX_QUESTION_LENGTH) {
      return { ok: false, reason: 'too_long' };
    }
    return { ok: true, value: trimmed };
  }

  function isTerminalStatus(status) {
    return TERMINAL_STATUSES[status] === true;
  }

  // Single decision point for "darf gerade abgeschickt werden" - covers
  // both "nicht eingeloggt -> kein Request" and "Doppelabsenden
  // verhindert" as one small, directly testable pure function instead of
  // scattering the checks across DOM event handlers.
  function canSubmit(context) {
    context = context || {};
    if (!context.isAuthenticated) {
      return { ok: false, reason: 'not_authenticated' };
    }
    if (context.controllerPhase && context.controllerPhase !== 'idle' &&
        context.controllerPhase !== 'success' && context.controllerPhase !== 'error' &&
        context.controllerPhase !== 'expired') {
      return { ok: false, reason: 'already_active' };
    }
    var validation = validateQuestion(context.questionText);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }
    return { ok: true, value: validation.value };
  }

  // Only ever used to decide whether a source URL may become a clickable
  // href - rejects javascript:/data:/vbscript: and anything else that
  // isn't a plain http(s) URL, independent of how the value is rendered.
  function isSafeHttpUrl(value) {
    var text = String(value === null || value === undefined ? '' : value).trim();
    if (!text) {
      return false;
    }
    try {
      var parsed = new URL(text, 'https://example.invalid/');
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (error) {
      return false;
    }
  }

  function extractSource(source) {
    if (!source) {
      return { url: '', title: '' };
    }
    if (typeof source === 'string') {
      return { url: source, title: source };
    }
    if (typeof source === 'object') {
      var url = String(source.url || source.href || '');
      var title = String(source.title || source.name || url);
      return { url: url, title: title };
    }
    return { url: '', title: '' };
  }

  // The live ask-jarvis-bridge contract carries `sources` as plain
  // URL strings only (see Core/network_bridge.py::_extract_sources - a
  // documented, deliberately untouched server contract: no title, no
  // domain, no snippet). This mechanically derives a readable label from
  // the URL itself alone - same technique as the server-side
  // _title_from_url in Core/web_search_service.py - never invents
  // content beyond what the URL text already contains.
  function humanizeUrlLabel(url) {
    try {
      var parsed = new URL(String(url || ''));
      var segments = parsed.pathname.split('/').filter(function (part) { return part; });
      if (!segments.length) {
        return parsed.hostname;
      }
      var last = segments[segments.length - 1]
        .replace(/[-_]+/g, ' ')
        .replace(/\.[a-z0-9]{1,5}$/i, '')
        .trim();
      if (!last) {
        return parsed.hostname;
      }
      return last.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    } catch (error) {
      return String(url || '');
    }
  }

  function urlHostname(url) {
    try {
      return new URL(String(url || '')).hostname;
    } catch (error) {
      return '';
    }
  }

  // Recognizes the fixed, deterministic section headers Core/web_summary
  // .py::build_web_summary always produces, in this exact order and in
  // German only (never model-generated, never localized) - see that file
  // for the authoritative source of this list. Splits the answer text
  // into a short, directly readable "Kurzfassung" (shown as the main
  // answer) plus the remaining sections (kept, never dropped, just moved
  // behind an optional details view). If the text doesn't match this
  // known shape at all, nothing is invented or reordered: the raw text is
  // returned as the answer and there are no detail sections.
  var KNOWN_SECTION_HEADERS = [
    'Kurzfassung', 'Fakten', 'Daten', 'Ursachen',
    'Auswirkungen', 'Einordnung', 'Unsicherheiten', 'Quellen'
  ];
  var DETAIL_SECTION_ORDER = [
    'Fakten', 'Daten', 'Ursachen', 'Auswirkungen', 'Einordnung', 'Unsicherheiten'
  ];
  var SECTION_HEADER_PATTERN = new RegExp(
    '^(' + KNOWN_SECTION_HEADERS.join('|') + '):\\s*$'
  );

  function parseAskAnswer(rawText) {
    var text = String(rawText || '');
    var lines = text.split('\n');
    var sections = {};
    var current = null;

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      var headerMatch = SECTION_HEADER_PATTERN.exec(line.trim());
      if (headerMatch) {
        current = headerMatch[1];
        if (!sections[current]) { sections[current] = []; }
        continue;
      }
      if (current === null) { continue; }
      var trimmed = line.trim();
      if (!trimmed) { continue; }
      sections[current].push(trimmed.replace(/^-\s+/, '').replace(/^\d+\.\s+/, ''));
    }

    var summary = sections['Kurzfassung'];
    if (!summary || !summary.length) {
      // Doesn't match the known shape - show verbatim, invent nothing.
      var paragraphs = text.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
      return {
        structured: false,
        summaryParagraphs: paragraphs.length ? paragraphs : [text.trim()],
        detailSections: []
      };
    }

    var detailSections = [];
    DETAIL_SECTION_ORDER.forEach(function (name) {
      if (sections[name] && sections[name].length) {
        detailSections.push({ title: name, items: sections[name] });
      }
    });

    return {
      structured: true,
      summaryParagraphs: summary,
      detailSections: detailSections
    };
  }

  // The request/poll state machine. Every I/O primitive is injected:
  //   postCreate(question) -> Promise<{ok, status, requestId, errorCode}>
  //   getStatus(requestId) -> Promise<{ok, status, answer, sources, errorCode}>
  // so the whole lifecycle (submit -> pending/processing -> terminal) is
  // testable without a browser, a real Supabase project, or real timers.
  //
  // Deliberately NO client-side poll timeout: the backend is the sole
  // authority for success/error/expired. A request that is still
  // pending/processing server-side keeps being polled for as long as the
  // panel stays open, however long that takes - the client never invents
  // its own "took too long" failure for a request the server still
  // considers valid.
  function createController(options) {
    options = options || {};
    var postCreate = options.postCreate;
    var getStatus = options.getStatus;
    var setTimeoutFn = options.setTimeout ||
      (typeof setTimeout !== 'undefined' ? setTimeout : null);
    var clearTimeoutFn = options.clearTimeout ||
      (typeof clearTimeout !== 'undefined' ? clearTimeout : null);
    var pollIntervalMs = options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
    var onStateChange = options.onStateChange || function () {};

    var state = {
      phase: 'idle',
      requestId: null,
      question: '',
      result: null,
      errorCode: ''
    };
    var pollTimer = null;

    function setState(patch) {
      var next = {};
      for (var key in state) { next[key] = state[key]; }
      for (var patchKey in patch) { next[patchKey] = patch[patchKey]; }
      state = next;
      onStateChange(state);
    }

    function isBusy() {
      return state.phase === 'submitting' ||
        state.phase === 'pending' ||
        state.phase === 'processing';
    }

    function stopPolling() {
      if (pollTimer !== null && clearTimeoutFn) {
        clearTimeoutFn(pollTimer);
      }
      pollTimer = null;
    }

    function reset() {
      stopPolling();
      setState({
        phase: 'idle', requestId: null, question: '', result: null, errorCode: ''
      });
    }

    function schedulePoll() {
      stopPolling();
      if (!setTimeoutFn) { return; }
      pollTimer = setTimeoutFn(pollOnce, pollIntervalMs);
    }

    function pollOnce() {
      pollTimer = null;
      if (!state.requestId) { return; }
      getStatus(state.requestId).then(function (res) {
        if (!res || res.ok !== true) {
          setState({ phase: 'error', errorCode: (res && res.errorCode) || 'status_failed' });
          return;
        }
        if (isTerminalStatus(res.status)) {
          if (res.status === 'success') {
            var sources = Array.isArray(res.sources) ? res.sources.map(extractSource) : [];
            setState({
              phase: 'success',
              result: { answer: String(res.answer || ''), sources: sources }
            });
          } else if (res.status === 'error') {
            setState({ phase: 'error', errorCode: res.errorCode || 'server_error' });
          } else {
            setState({ phase: 'expired' });
          }
          return;
        }
        setState({ phase: res.status === 'processing' ? 'processing' : 'pending' });
        schedulePoll();
      }, function () {
        setState({ phase: 'error', errorCode: 'network_error' });
      });
    }

    function submit(rawQuestion, isAuthenticated) {
      var decision = canSubmit({
        isAuthenticated: isAuthenticated,
        controllerPhase: state.phase,
        questionText: rawQuestion
      });
      if (!decision.ok) {
        return Promise.resolve({ ok: false, reason: decision.reason });
      }
      setState({ phase: 'submitting', question: decision.value, result: null, errorCode: '' });
      return postCreate(decision.value).then(function (res) {
        if (!res || res.ok !== true || !res.requestId) {
          setState({ phase: 'error', errorCode: (res && res.errorCode) || 'request_failed' });
          return { ok: false, reason: (res && res.errorCode) || 'request_failed' };
        }
        setState({
          phase: res.status === 'processing' ? 'processing' : 'pending',
          requestId: res.requestId
        });
        schedulePoll();
        return { ok: true, requestId: res.requestId };
      }, function () {
        setState({ phase: 'error', errorCode: 'network_error' });
        return { ok: false, reason: 'network_error' };
      });
    }

    return {
      submit: submit,
      reset: reset,
      stopPolling: stopPolling,
      isBusy: isBusy,
      getState: function () { return state; }
    };
  }

  return {
    MAX_QUESTION_LENGTH: MAX_QUESTION_LENGTH,
    validateQuestion: validateQuestion,
    isTerminalStatus: isTerminalStatus,
    canSubmit: canSubmit,
    isSafeHttpUrl: isSafeHttpUrl,
    extractSource: extractSource,
    humanizeUrlLabel: humanizeUrlLabel,
    urlHostname: urlHostname,
    parseAskAnswer: parseAskAnswer,
    createController: createController
  };
});
