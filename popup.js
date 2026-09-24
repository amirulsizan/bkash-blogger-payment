// Checkout popup: review -> pay on bKash's own page -> result.
//
// Started by blogger.js with ?amount=&invoice=&product=&origin=&return=
// The Worker sends the customer back with ?status=&paymentID=&trxID=...
// Without an apiBase in config.js the popup runs in demo mode and simulates bKash.
(function () {
  'use strict';

  var STORAGE_KEY = 'bkb:checkout';
  var STATUSES = ['success', 'failure', 'cancel'];

  var config = window.BKASH_CONFIG || {};
  var payment = window.bkashPayment;
  var params = new URLSearchParams(window.location.search);
  var demo = !config.apiBase;

  function $(id) {
    return document.getElementById(id);
  }

  // A checkout must never run inside someone else's frame (clickjacking).
  if (window.top !== window.self) {
    document.body.textContent = 'Please open this checkout in its own window.';
    return;
  }

  // -------------------------------------------------------------------------
  // Input cleaning: every value below comes from the URL.

  function cleanText(value, max) {
    return String(value || '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, max || 100);
  }

  function cleanInvoice(value) {
    return String(value || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 50);
  }

  function cleanOrigin(value) {
    try {
      var url = new URL(value);
      return /^https?:$/.test(url.protocol) && url.origin === value ? value : '';
    } catch (e) {
      return '';
    }
  }

  function cleanUrl(value) {
    try {
      var url = new URL(value);
      return /^https?:$/.test(url.protocol) ? url.toString() : '';
    } catch (e) {
      return '';
    }
  }

  function createInvoice() {
    return 'INV-' + Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function formatAmount(amount) {
    var number = Number(amount);
    try {
      return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
      return number.toFixed(2);
    }
  }

  function readSaved() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') || {};
    } catch (e) {
      return {};
    }
  }

  function save(extra) {
    try {
      var data = {
        amount: ctx.amount,
        invoice: ctx.invoice,
        product: ctx.product,
        origin: ctx.origin,
        returnUrl: ctx.returnUrl,
      };
      Object.keys(extra || {}).forEach(function (key) {
        data[key] = extra[key];
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Private mode: the result still shows, it just can't reach the opener.
    }
  }

  var status = params.get('status');
  var isResult = status !== null;
  // After bKash, the Worker only knows the payment. The rest was saved before
  // leaving; ignore it if it belongs to another checkout.
  var saved = readSaved();
  if (isResult && params.get('invoice') && saved.invoice && saved.invoice !== params.get('invoice')) {
    saved = {};
  }
  if (!isResult) saved = {};

  var ctx = {
    merchant: cleanText(config.merchantName, 60) || 'Merchant',
    amount: payment.normalizeAmount(params.get('amount') || saved.amount),
    invoice: cleanInvoice(params.get('invoice') || saved.invoice) || createInvoice(),
    product: cleanText(params.get('product') || saved.product),
    origin: cleanOrigin(params.get('origin') || saved.origin),
    returnUrl: cleanUrl(params.get('return') || saved.returnUrl),
  };

  // -------------------------------------------------------------------------
  // Rendering

  function announce(text) {
    $('liveRegion').textContent = text;
  }

  function showView(name) {
    ['review', 'processing', 'result', 'invalid'].forEach(function (view) {
      $('view-' + view).hidden = view !== name;
    });
    var heading = $('view-' + name).querySelector('.co-title');
    if (heading && name !== 'review') heading.focus({ preventScroll: true });
  }

  function setStep(active, failed) {
    Array.prototype.forEach.call(document.querySelectorAll('.co-step'), function (step) {
      var n = Number(step.getAttribute('data-step'));
      var error = Boolean(failed) && n === active;
      var done = n < active || (n === active && active === 3 && !failed);
      step.classList.toggle('is-done', done);
      step.classList.toggle('is-active', n === active && !done && !error);
      step.classList.toggle('is-error', error);
      if (n === active) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  }

  function renderSummary() {
    $('merchantName').textContent = ctx.merchant;
    $('merchantNote').textContent = ctx.merchant;
    $('merchantInitial').textContent = ctx.merchant.charAt(0).toUpperCase();
    $('demoBadge').hidden = !demo;
    $('demoSimulator').hidden = !demo;
    $('invoiceValue').textContent = ctx.invoice;

    if (ctx.product) {
      $('productName').textContent = ctx.product;
      $('productName').hidden = false;
    }
    if (ctx.amount) {
      var amount = formatAmount(ctx.amount);
      $('amountValue').textContent = amount;
      $('payLabel').textContent = 'Pay ৳' + amount;
      document.title = 'Pay ৳' + amount + ' · ' + ctx.merchant;
    } else {
      $('amountValue').textContent = '—';
    }
  }

  function showError(message) {
    $('reviewErrorText').textContent = message;
    $('reviewError').hidden = false;
  }

  // -------------------------------------------------------------------------
  // Step 1 -> 2

  function startPayment() {
    $('reviewError').hidden = true;
    save();
    setStep(2);
    showView('processing');
    announce('Connecting to bKash');

    if (demo) {
      runDemo();
      return;
    }

    payment
      .initiate(ctx.amount, ctx.invoice, { product: ctx.product })
      .then(function (data) {
        save({ paymentID: data.paymentID });
        $('processingTitle').textContent = 'Opening bKash…';
      })
      .catch(function (err) {
        setStep(1);
        showView('review');
        showError("Couldn't start the payment. " + (err && err.message ? err.message : ''));
        $('payBtn').focus();
      });
  }

  function runDemo() {
    var checked = document.querySelector('input[name="outcome"]:checked');
    var outcome = checked ? checked.value : 'success';
    var id = Math.random().toString(36).slice(2, 10).toUpperCase();

    setTimeout(function () {
      $('processingTitle').textContent = 'Waiting for bKash…';
      $('processingText').textContent =
        'Demo: this is where bKash asks for the customer’s number, OTP and PIN.';
    }, 900);

    setTimeout(function () {
      // Come back exactly like the Worker would redirect a real payment.
      var result = new URLSearchParams({
        status: outcome,
        paymentID: 'DEMO' + id,
        amount: ctx.amount,
        invoice: ctx.invoice,
        demo: '1',
      });
      if (outcome === 'success') result.set('trxID', 'DEMO' + id.slice(0, 6));
      if (outcome === 'failure') result.set('message', 'Insufficient balance (simulated)');
      window.location.replace(window.location.pathname + '?' + result.toString());
    }, 2400);
  }

  // -------------------------------------------------------------------------
  // Step 3

  function readResult() {
    var result = {
      status: STATUSES.indexOf(status) === -1 ? 'failure' : status,
      paymentID: cleanText(params.get('paymentID'), 64),
      trxID: cleanText(params.get('trxID'), 64),
      amount: payment.normalizeAmount(params.get('amount')) || ctx.amount,
      invoice: cleanInvoice(params.get('invoice')) || ctx.invoice,
      product: ctx.product,
      message: cleanText(params.get('message'), 200),
      demo: params.get('demo') === '1',
    };
    ctx.amount = result.amount;
    ctx.invoice = result.invoice;
    return result;
  }

  function notifyOpener(result) {
    if (!window.opener || !ctx.origin) return false;
    try {
      window.opener.postMessage(
        {
          source: 'bkash-blogger',
          type: 'result',
          status: result.status,
          invoice: result.invoice,
          amount: result.amount,
          product: result.product,
          paymentID: result.paymentID,
          trxID: result.trxID,
          message: result.message,
          demo: result.demo,
        },
        ctx.origin
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  function returnUrlFor(result) {
    if (!ctx.returnUrl) return '';
    var url = new URL(ctx.returnUrl);
    url.searchParams.set('bkash_status', result.status);
    url.searchParams.set('bkash_invoice', result.invoice);
    if (result.amount) url.searchParams.set('bkash_amount', result.amount);
    if (result.trxID) url.searchParams.set('bkash_trx', result.trxID);
    if (result.paymentID) url.searchParams.set('bkash_payment', result.paymentID);
    if (result.message) url.searchParams.set('bkash_message', result.message);
    if (result.demo) url.searchParams.set('bkash_demo', '1');
    return url.toString();
  }

  function retry() {
    var again = new URLSearchParams({ amount: ctx.amount, invoice: ctx.invoice });
    if (ctx.product) again.set('product', ctx.product);
    if (ctx.origin) again.set('origin', ctx.origin);
    if (ctx.returnUrl) again.set('return', ctx.returnUrl);
    window.location.replace(window.location.pathname + '?' + again.toString());
  }

  function showResult() {
    var result = readResult();
    var notified = notifyOpener(result);
    var standalone = !window.opener;
    var backUrl = returnUrlFor(result);

    renderSummary();
    setStep(3, result.status !== 'success');
    $('resultIcon').className = 'co-result-icon is-' + result.status;
    $('trxValue').textContent = result.trxID || '—';
    $('trxRow').hidden = !result.trxID;
    $('resultAmount').textContent = ctx.amount ? '৳' + formatAmount(ctx.amount) : '—';
    $('resultInvoice').textContent = result.invoice;
    $('resultTime').textContent = new Date().toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    var title;
    var message;
    if (result.status === 'success') {
      title = 'Payment successful';
      message = notified
        ? ctx.merchant + ' has been notified. Keep the transaction ID for your records.'
        : 'Keep the transaction ID for your records.';
    } else if (result.status === 'cancel') {
      title = 'Payment cancelled';
      message = 'You cancelled on bKash. No money was taken.';
    } else {
      title = 'Payment failed';
      message = (result.message || 'bKash could not complete the payment').replace(/[.!\s]*$/, '. ') +
        'No money was taken.';
    }
    if (result.demo) title += ' (demo)';
    $('resultTitle').textContent = title;
    $('resultMessage').textContent = message;
    document.title = title + ' · ' + ctx.merchant;

    var primary = $('primaryAction');
    var secondary = $('secondaryAction');
    var backLabel = 'Back to ' + ctx.merchant;

    if (result.status === 'success') {
      primary.textContent = standalone && backUrl ? backLabel : 'Done';
      primary.onclick = function () {
        leave(backUrl);
      };
      secondary.hidden = true;
    } else {
      primary.textContent = 'Try again';
      primary.onclick = retry;
      secondary.hidden = false;
      secondary.textContent = standalone && backUrl ? backLabel : 'Close';
      secondary.onclick = function () {
        leave(backUrl);
      };
    }

    showView('result');
    announce(title);
    exitUrl = backUrl;
  }

  // -------------------------------------------------------------------------
  // Leaving

  var exitUrl = '';

  // Close the popup, or go back to the shop when this page was opened in the
  // same tab (window.close() is ignored for windows a script didn't open).
  function leave(url) {
    window.close();
    setTimeout(function () {
      if (url) window.location.href = url;
      else if (window.history.length > 1) window.history.back();
    }, 150);
  }

  function cancelCheckout() {
    var url = returnUrlFor({ status: 'cancel', invoice: ctx.invoice, amount: ctx.amount });
    if (window.opener && ctx.origin) {
      notifyOpener({ status: 'cancel', invoice: ctx.invoice, amount: ctx.amount, product: ctx.product, demo: demo });
    }
    leave(url);
  }

  function copyTransactionId() {
    var text = $('trxValue').textContent;
    var done = function () {
      $('copyLabel').textContent = 'Copied';
      announce('Transaction ID copied');
      setTimeout(function () {
        $('copyLabel').textContent = 'Copy';
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        selectText($('trxValue'));
      });
    } else {
      selectText($('trxValue'));
    }
  }

  function selectText(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // -------------------------------------------------------------------------
  // Wire up

  $('payBtn').addEventListener('click', startPayment);
  $('cancelBtn').addEventListener('click', cancelCheckout);
  $('invalidClose').addEventListener('click', function () {
    leave(ctx.returnUrl);
  });
  $('copyTrx').addEventListener('click', copyTransactionId);
  $('closeBtn').addEventListener('click', function () {
    if (!$('view-result').hidden) leave(exitUrl);
    else if (!$('view-review').hidden) cancelCheckout();
    else leave(ctx.returnUrl);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && $('view-processing').hidden) $('closeBtn').click();
  });

  // Coming back from the bfcache (e.g. the Back button on bKash's page).
  window.addEventListener('pageshow', function (event) {
    if (event.persisted && !$('view-processing').hidden) {
      setStep(1);
      showView('review');
    }
  });

  if (isResult) {
    showResult();
  } else if (!ctx.amount) {
    renderSummary();
    setStep(1, true);
    showView('invalid');
  } else {
    renderSummary();
    setStep(1);
    showView('review');
  }
})();
