// Browser client for the bKash payment server in worker/.
//
// It asks your Worker to create a bKash payment, then sends the customer to
// bKash's own checkout page, where they enter their number, OTP and PIN.
// No bKash credentials ever reach the browser.

var BKASH_TRUSTED_HOSTS = ['bka.sh', 'bkash.com'];
var BKASH_CREATE_TIMEOUT_MS = 20000;

// Only ever send customers to bKash itself, even if the server is misconfigured.
function isTrustedBkashUrl(value) {
  try {
    var url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return BKASH_TRUSTED_HOSTS.some(function (host) {
      return url.hostname === host || url.hostname.slice(-host.length - 1) === '.' + host;
    });
  } catch (e) {
    return false;
  }
}

// Accepts 500, "500", "1,500", "৳ 990", "Tk. 500" or Bangla digits ("৫০০").
// Returns a canonical string such as "1500" or "99.50", or null if invalid.
function normalizeBkashAmount(value) {
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

async function initiateBkashPayment(amount, invoice, options) {
  // Older snippets passed a merchant number here; it is no longer needed.
  if (!options || typeof options !== 'object') options = {};

  var config = (typeof window !== 'undefined' && window.BKASH_CONFIG) || {};
  var apiBase = String(options.apiBase || config.apiBase || '').replace(/\/+$/, '');

  try {
    if (!apiBase) {
      throw new Error('No payment server configured. Set apiBase in config.js.');
    }
    var normalized = normalizeBkashAmount(amount);
    if (!normalized) throw new Error('Invalid amount');

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, BKASH_CREATE_TIMEOUT_MS);
    var response;
    try {
      response = await fetch(apiBase + '/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: normalized,
          invoice: invoice,
          product: options.product || '',
        }),
        signal: controller ? controller.signal : undefined,
      });
    } catch (err) {
      throw new Error(
        err && err.name === 'AbortError'
          ? 'The payment server took too long to respond'
          : 'Could not reach the payment server'
      );
    } finally {
      if (timer) clearTimeout(timer);
    }

    var data = null;
    try {
      data = await response.json();
    } catch (e) {
      // handled below
    }

    if (!response.ok || !data || !data.bkashURL) {
      var error = new Error(
        (data && data.error && data.error.message) || 'Payment initiation failed'
      );
      error.code = data && data.error && data.error.code;
      throw error;
    }

    if (!isTrustedBkashUrl(data.bkashURL)) {
      throw new Error('Refusing to redirect to a page that is not bKash');
    }

    if (options.redirect !== false) {
      window.location.href = data.bkashURL;
    }
    return data;
  } catch (err) {
    console.error('Error initiating bKash payment:', err);
    throw err;
  }
}

// Expose the function for browser usage
if (typeof window !== 'undefined') {
  window.initiateBkashPayment = initiateBkashPayment;
  window.bkashPayment = {
    initiate: initiateBkashPayment,
    isTrustedBkashUrl: isTrustedBkashUrl,
    normalizeAmount: normalizeBkashAmount,
  };
}

// Export for Node.js tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = initiateBkashPayment;
  module.exports.isTrustedBkashUrl = isTrustedBkashUrl;
  module.exports.normalizeAmount = normalizeBkashAmount;
}
