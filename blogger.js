// blogger.js - "Pay with bKash" buttons for Blogger posts, pages and gadgets.
//
//   <script src="https://you.github.io/bkash-blogger-payment/blogger.js"></script>
//   <button data-bkash-amount="500" data-bkash-product="Premium eBook">Pay with bKash</button>
//
// A click opens the checkout popup (popup.html next to this file). The customer
// pays on bKash's own page, and this page gets the result as a DOM event:
//
//   document.addEventListener('bkash:success', e => console.log(e.detail.trxID));
//
// Script tag options: data-popup (checkout URL), data-api (Worker URL, needed
// for bkashBlogger.verify) and data-toast="false" (hide the built-in notices).
(function () {
  'use strict';

  // The snippet may be pasted into several posts that show on one page.
  if (window.bkashBlogger && window.bkashBlogger.version) return;

  var VERSION = '2.0.0';
  var BUTTON_SELECTOR = '[data-bkash-amount], [data-bkash-amount-from]';
  var FINAL_STATUSES = ['success', 'failure', 'cancel'];
  var PENDING_KEY = 'bkb:pending';

  var script = document.currentScript || findScript();
  var scriptSrc = (script && script.src) || window.location.href;
  var settings = {
    popupUrl: resolveUrl((script && script.getAttribute('data-popup')) || 'popup.html'),
    apiBase: trimSlash(script && script.getAttribute('data-api')),
    toast: !script || script.getAttribute('data-toast') !== 'false',
  };
  var payments = {};

  function findScript() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (/blogger\.js([?#]|$)/.test(scripts[i].src)) return scripts[i];
    }
    return null;
  }

  function resolveUrl(value) {
    return new URL(value, scriptSrc).toString();
  }

  function trimSlash(value) {
    return String(value || '').replace(/\/+$/, '');
  }

  // Same rules as normalizeBkashAmount in bkash-payment.js.
  function normalizeAmount(value) {
    if (value == null) return null;
    var text = String(value)
      .replace(/[০-৯]/g, function (d) {
        return String(d.charCodeAt(0) - 0x09e6);
      })
      .replace(/,/g, '');
    if (/-\s*\d/.test(text)) return null;
    var match = text.match(/\d+(\.\d+)?/);
    if (!match || !/^\d+(\.\d{1,2})?$/.test(match[0]) || !(Number(match[0]) > 0)) {
      return null;
    }
    return Number(match[0]).toFixed(2).replace(/\.00$/, '');
  }

  function formatAmount(amount) {
    var number = Number(amount);
    if (!isFinite(number)) return String(amount || '');
    try {
      return '৳' + number.toLocaleString('en-IN', {
        minimumFractionDigits: number % 1 ? 2 : 0,
        maximumFractionDigits: 2,
      });
    } catch (e) {
      return '৳' + number;
    }
  }

  function createInvoice(prefix) {
    var clean = String(prefix || 'INV').replace(/[^A-Za-z0-9-]/g, '').slice(0, 16) || 'INV';
    return (
      clean + '-' +
      Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).slice(2, 6).toUpperCase()
    );
  }

  function currentUrlWithoutResult() {
    var url = new URL(window.location.href);
    Array.from(url.searchParams.keys()).forEach(function (key) {
      if (key.indexOf('bkash_') === 0) url.searchParams.delete(key);
    });
    url.hash = '';
    return url.toString();
  }

  function allButtons() {
    return Array.prototype.slice.call(document.querySelectorAll(BUTTON_SELECTOR));
  }

  // -------------------------------------------------------------------------
  // Payments

  function pay(options) {
    options = options || {};
    var amount = normalizeAmount(options.amount);
    if (!amount) {
      var error = new Error('Please enter a valid amount');
      if (settings.toast) toast('failure', 'Invalid amount', error.message);
      return Promise.reject(error);
    }

    var invoice =
      String(options.invoice || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 50) ||
      createInvoice(options.invoicePrefix);
    var product = String(options.product || '').slice(0, 100);

    var url = new URL(settings.popupUrl);
    url.searchParams.set('amount', amount);
    url.searchParams.set('invoice', invoice);
    if (product) url.searchParams.set('product', product);
    url.searchParams.set('origin', window.location.origin);
    url.searchParams.set('return', currentUrlWithoutResult());

    // Only one checkout window at a time; a new payment replaces the old one.
    Object.keys(payments).forEach(function (key) {
      settle(payments[key], { status: 'closed' });
    });

    return new Promise(function (resolve) {
      var record = createRecord({
        invoice: invoice,
        amount: amount,
        product: product,
        options: options,
        button: options.button || null,
        resolve: resolve,
      });
      payments[invoice] = record;

      var popup = openPopup(url.toString());
      if (!popup) {
        // Popups are blocked (common in Facebook/Messenger in-app browsers):
        // continue in this tab. The result comes back as bkash_* URL params.
        try {
          sessionStorage.setItem(PENDING_KEY, JSON.stringify({
            invoice: invoice,
            successUrl: options.successUrl || '',
            buttonIndex: allButtons().indexOf(record.button),
          }));
        } catch (e) {
          // storage unavailable; the result still arrives, just without the button link
        }
        window.location.href = url.toString();
        return;
      }

      record.popup = popup;
      setBusy(record.button, true);
      record.timer = setInterval(function () {
        if (popup.closed) settle(record, { status: 'closed' });
      }, 700);
    });
  }

  function openPopup(url) {
    var width = 440;
    var height = 720;
    var left = (window.screenX || 0) + ((window.outerWidth || width) - width) / 2;
    var top = (window.screenY || 0) + ((window.outerHeight || height) - height) / 2;
    var popup = null;
    try {
      popup = window.open(
        url,
        'bkashCheckout',
        'popup=yes,scrollbars=yes,resizable=yes,width=' + width + ',height=' + height +
          ',left=' + Math.max(0, Math.round(left)) + ',top=' + Math.max(0, Math.round(top))
      );
    } catch (e) {
      popup = null;
    }
    if (popup) {
      try {
        popup.focus();
      } catch (e) {
        // ignore
      }
    }
    return popup;
  }

  function createRecord(fields) {
    fields.options = fields.options || {};
    fields.resolve = fields.resolve || function () {};
    fields.seen = {};
    return fields;
  }

  // A checkout ends with a success or when its window closes. Failures and
  // cancellations are reported too, but the customer can still press
  // "Try again" in the popup, so they don't end it.
  function settle(record, result) {
    if (record.final) return;
    var status = result.status;
    var detail = {
      status: status,
      invoice: record.invoice,
      amount: result.amount || record.amount,
      product: record.product || result.product || '',
      paymentID: result.paymentID || null,
      trxID: result.trxID || null,
      message: result.message || '',
      demo: Boolean(result.demo),
    };

    if (status === 'closed') {
      // A late result can still arrive after this, e.g. if the browser hid
      // the popup from us while it was on bKash's page.
      if (record.closed) return;
      record.closed = true;
      stopWatching(record);
      setBusy(record.button, false);
      finish(record, record.last || detail);
      dispatch(record.button, ['bkash:close'], detail);
      runCallback(record.options.onClose, detail);
      return;
    }

    // Refreshing the result page sends the same result again.
    var key = [status, detail.paymentID, detail.trxID].join('|');
    if (record.seen[key]) return;
    record.seen[key] = true;
    record.last = detail;

    dispatch(record.button, ['bkash:' + status, 'bkash:result'], detail);
    runCallback(
      { success: record.options.onSuccess, failure: record.options.onFailure, cancel: record.options.onCancel }[status],
      detail
    );
    if (settings.toast) showResultToast(detail);

    if (status === 'success') {
      record.final = true;
      stopWatching(record);
      setBusy(record.button, false);
      finish(record, detail);
      markPaid(record.button);
      if (record.options.successUrl) {
        setTimeout(function () {
          window.location.href = resolveAgainstPage(record.options.successUrl);
        }, 1200);
      }
    }
  }

  function finish(record, detail) {
    if (record.done) return;
    record.done = true;
    record.resolve(detail);
  }

  function resolveAgainstPage(value) {
    return new URL(value, window.location.href).toString();
  }

  function stopWatching(record) {
    if (record.timer) clearInterval(record.timer);
    record.timer = null;
  }

  function runCallback(fn, detail) {
    if (typeof fn !== 'function') return;
    try {
      fn(detail);
    } catch (e) {
      console.error('bkashBlogger callback failed:', e);
    }
  }

  function dispatch(target, names, detail) {
    var el = target && target.isConnected ? target : document;
    names.forEach(function (name) {
      el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail }));
    });
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source !== 'bkash-blogger' || data.type !== 'result') return;
    if (event.origin !== new URL(settings.popupUrl).origin) return;
    if (FINAL_STATUSES.indexOf(data.status) === -1 || typeof data.invoice !== 'string') return;

    var record = payments[data.invoice];
    if (!record) {
      // e.g. the page was reloaded while the popup was open
      record = payments[data.invoice] = createRecord({
        invoice: data.invoice,
        amount: data.amount,
        product: data.product,
      });
    }
    settle(record, data);
  });

  // The same-tab fallback returns here with ?bkash_status=...
  function readReturnedResult() {
    var url = new URL(window.location.href);
    var status = url.searchParams.get('bkash_status');
    if (!status) return;

    var result = {
      status: status,
      invoice: url.searchParams.get('bkash_invoice') || '',
      amount: url.searchParams.get('bkash_amount'),
      trxID: url.searchParams.get('bkash_trx'),
      paymentID: url.searchParams.get('bkash_payment'),
      message: url.searchParams.get('bkash_message'),
      demo: url.searchParams.get('bkash_demo') === '1',
    };
    try {
      history.replaceState(history.state, '', currentUrlWithoutResult() + window.location.hash);
    } catch (e) {
      // ignore
    }
    if (FINAL_STATUSES.indexOf(status) === -1) return;

    var pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
      sessionStorage.removeItem(PENDING_KEY);
    } catch (e) {
      pending = null;
    }
    var matches = pending && pending.invoice === result.invoice;
    settle(
      createRecord({
        invoice: result.invoice,
        amount: result.amount,
        options: { successUrl: matches ? pending.successUrl : '' },
        button: matches ? allButtons()[pending.buttonIndex] || null : null,
      }),
      result
    );
  }

  function verify(paymentID) {
    if (!settings.apiBase) {
      return Promise.reject(
        new Error('Add data-api="https://your-worker.workers.dev" to the blogger.js script tag to verify payments')
      );
    }
    return fetch(settings.apiBase + '/verify?paymentID=' + encodeURIComponent(paymentID))
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.error) throw new Error(data.error.message);
        return data;
      });
  }

  // -------------------------------------------------------------------------
  // Buttons

  function readValue(el) {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return el.value;
    return el.getAttribute('data-price') || el.textContent;
  }

  function payFromButton(button, amountSourceId, extra) {
    var existing = findOpenPayment(button);
    if (existing) {
      existing.popup.focus();
      return;
    }

    var sourceId = amountSourceId || button.getAttribute('data-bkash-amount-from');
    var raw = button.getAttribute('data-bkash-amount');
    var source = null;
    if (sourceId) {
      source = document.getElementById(sourceId);
      if (!source) {
        console.error('bkashBlogger: no element with id "' + sourceId + '"');
        if (settings.toast) toast('failure', 'Payment button is misconfigured', 'Amount field "' + sourceId + '" not found');
        return;
      }
      raw = readValue(source);
      var min = source.getAttribute('min');
      var amount = normalizeAmount(raw);
      if (min && amount && Number(amount) < Number(min)) {
        if (settings.toast) toast('failure', 'Amount too low', 'The minimum is ' + formatAmount(min));
        source.focus();
        return;
      }
    }

    var options = {
      amount: raw,
      product: button.getAttribute('data-bkash-product') || '',
      invoicePrefix: button.getAttribute('data-bkash-invoice-prefix') || '',
      successUrl: button.getAttribute('data-bkash-success-url') || '',
      button: button,
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        options[key] = extra[key];
      });
    }
    pay(options).catch(function () {
      if (source) source.focus();
    });
  }

  function findOpenPayment(button) {
    for (var key in payments) {
      var record = payments[key];
      if (record.button === button && !record.closed && !record.final && record.popup && !record.popup.closed) {
        return record;
      }
    }
    return null;
  }

  function decorate(button) {
    if (button.getAttribute('data-bkash-style') !== 'none') {
      button.classList.add('bkb-button');
    }
    if (button.tagName === 'BUTTON' && !button.getAttribute('type')) {
      button.setAttribute('type', 'button');
    }
  }

  function decorateWithin(root) {
    if (root.matches && root.matches(BUTTON_SELECTOR)) decorate(root);
    if (root.querySelectorAll) {
      Array.prototype.forEach.call(root.querySelectorAll(BUTTON_SELECTOR), decorate);
    }
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.classList.toggle('bkb-busy', busy);
    if (busy) button.setAttribute('aria-busy', 'true');
    else button.removeAttribute('aria-busy');
  }

  function markPaid(button) {
    if (!button || !button.isConnected) return;
    button.classList.add('bkb-paid');
    button.textContent = button.getAttribute('data-bkash-paid-text') || 'Paid ✓';
    if (button.tagName === 'BUTTON') button.disabled = true;
  }

  // Legacy API: bkashBlogger.initButton('payBtn', 'amount')
  function initButton(buttonId, amountInputId, options) {
    var button = document.getElementById(buttonId);
    if (!button) {
      console.error('bkashBlogger: no element with id "' + buttonId + '"');
      return null;
    }
    if (button.hasAttribute('data-bkash-bound')) return button;
    button.setAttribute('data-bkash-bound', '');
    decorate(button);
    button.addEventListener('click', function (event) {
      event.preventDefault();
      payFromButton(button, amountInputId, options);
    });
    return button;
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest(BUTTON_SELECTOR);
    if (!button || button.hasAttribute('data-bkash-bound') || button.disabled) return;
    event.preventDefault();
    payFromButton(button);
  });

  // -------------------------------------------------------------------------
  // Notices

  function toast(kind, title, message) {
    if (!document.body) return;
    var region = document.getElementById('bkb-toasts');
    if (!region) {
      region = document.createElement('div');
      region.id = 'bkb-toasts';
      region.className = 'bkb-toasts';
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }

    var item = document.createElement('div');
    item.className = 'bkb-toast bkb-toast--' + kind;
    item.setAttribute('role', kind === 'failure' ? 'alert' : 'status');

    var icon = document.createElement('span');
    icon.className = 'bkb-toast__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = kind === 'success' ? '✓' : kind === 'cancel' ? '–' : '!';

    var body = document.createElement('div');
    body.className = 'bkb-toast__body';
    var strong = document.createElement('strong');
    strong.textContent = title;
    body.appendChild(strong);
    if (message) {
      var text = document.createElement('span');
      text.textContent = message;
      body.appendChild(text);
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'bkb-toast__close';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.addEventListener('click', function () {
      item.remove();
    });

    item.appendChild(icon);
    item.appendChild(body);
    item.appendChild(close);
    region.appendChild(item);
    setTimeout(function () {
      item.remove();
    }, kind === 'success' ? 12000 : 7000);
  }

  function showResultToast(detail) {
    var demo = detail.demo ? ' (demo)' : '';
    if (detail.status === 'success') {
      toast(
        'success',
        'Payment successful' + demo,
        formatAmount(detail.amount) + (detail.trxID ? ' · TrxID ' + detail.trxID : '')
      );
    } else if (detail.status === 'cancel') {
      toast('cancel', 'Payment cancelled' + demo, 'No money was taken.');
    } else {
      toast('failure', 'Payment failed' + demo, detail.message || 'Please try again.');
    }
  }

  function injectStyles() {
    if (document.getElementById('bkb-styles')) return;
    var logo = resolveUrl('Images/bkash-logo-64.png');
    var css =
      // The doubled class outranks typical Blogger theme button rules.
      '.bkb-button.bkb-button{display:inline-flex;align-items:center;justify-content:center;gap:10px;' +
      'min-height:48px;padding:10px 22px 10px 12px;border:0;border-radius:12px;background:#e2136e;color:#fff;' +
      'font:600 16px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.01em;' +
      'text-decoration:none;cursor:pointer;box-shadow:0 6px 18px rgba(226,19,110,.28);' +
      'transition:transform .15s ease,box-shadow .15s ease,background-color .15s ease;-webkit-tap-highlight-color:transparent}' +
      '.bkb-button.bkb-button::before{content:"";flex:none;width:28px;height:28px;border-radius:50%;' +
      'background:#e2136e url("' + logo + '") center/cover no-repeat;box-shadow:0 0 0 2px rgba(255,255,255,.9)}' +
      '.bkb-button.bkb-button:hover{background:#c90f5f;transform:translateY(-1px);box-shadow:0 10px 24px rgba(226,19,110,.34)}' +
      '.bkb-button.bkb-button:active{transform:translateY(0)}' +
      '.bkb-button.bkb-button:focus-visible{outline:3px solid rgba(226,19,110,.45);outline-offset:3px}' +
      '.bkb-button.bkb-busy{cursor:progress;opacity:.85}' +
      '.bkb-button.bkb-busy::after{content:"";width:16px;height:16px;border-radius:50%;' +
      'border:2px solid rgba(255,255,255,.45);border-top-color:#fff;animation:bkb-spin .8s linear infinite}' +
      '.bkb-button.bkb-paid,.bkb-button.bkb-paid:hover{background:#15803d;box-shadow:none;transform:none;cursor:default}' +
      '.bkb-button.bkb-paid::before{display:none}' +
      '@keyframes bkb-spin{to{transform:rotate(360deg)}}' +
      '.bkb-toasts{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;' +
      'display:flex;flex-direction:column;gap:10px;width:min(420px,calc(100vw - 32px));pointer-events:none}' +
      '.bkb-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:12px;padding:14px 14px 14px 16px;' +
      'background:#fff;color:#1f2937;border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.18),0 0 0 1px rgba(15,23,42,.06);' +
      'font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;animation:bkb-in .25s ease-out}' +
      '.bkb-toast__icon{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;' +
      'font-weight:700;color:#fff;background:#dc2626}' +
      '.bkb-toast--success .bkb-toast__icon{background:#16a34a}' +
      '.bkb-toast--cancel .bkb-toast__icon{background:#64748b}' +
      '.bkb-toast__body{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;overflow-wrap:anywhere}' +
      '.bkb-toast__body strong{font-size:15px;color:#111827}' +
      '.bkb-toast__body span{color:#4b5563}' +
      '.bkb-toast__close{flex:none;border:0;background:none;color:#6b7280;font-size:20px;line-height:1;cursor:pointer;padding:2px 4px;border-radius:6px}' +
      '.bkb-toast__close:hover{background:#f3f4f6;color:#111827}' +
      '@keyframes bkb-in{from{opacity:0;transform:translateY(8px)}}' +
      '@media (prefers-reduced-motion:reduce){.bkb-button.bkb-button,.bkb-toast{transition:none;animation:none}' +
      '.bkb-button.bkb-busy::after{animation-duration:2s}}';
    var style = document.createElement('style');
    style.id = 'bkb-styles';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function configure(options) {
    options = options || {};
    if (options.popupUrl) settings.popupUrl = resolveUrl(options.popupUrl);
    if ('apiBase' in options) settings.apiBase = trimSlash(options.apiBase);
    if ('toast' in options) settings.toast = options.toast !== false;
    return settings;
  }

  function start() {
    injectStyles();
    decorateWithin(document);
    if (window.MutationObserver) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          Array.prototype.forEach.call(mutation.addedNodes, function (node) {
            if (node.nodeType === 1) decorateWithin(node);
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
    readReturnedResult();
  }

  window.bkashBlogger = {
    version: VERSION,
    configure: configure,
    pay: pay,
    initButton: initButton,
    verify: verify,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
