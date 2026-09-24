// Snippet builder and live previews for blogger-examples.html.
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeText(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function defaultBase() {
    var loc = window.location;
    if (/\.github\.io$/.test(loc.hostname)) {
      return loc.origin + loc.pathname.replace(/[^/]*$/, '');
    }
    return 'https://YOUR-GITHUB-NAME.github.io/bkash-blogger-payment/';
  }

  function withSlash(url) {
    url = url.trim() || defaultBase();
    return /\/$/.test(url) ? url : url + '/';
  }

  // What a preview can render: no script tags and no redirect after paying.
  function toPreview(html) {
    return html
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/\s+data-bkash-success-url="[^"]*"/g, '')
      .trim();
  }

  // -------------------------------------------------------------------------
  // Snippet builder

  function builderState() {
    var mode = document.querySelector('input[name="g-mode"]:checked').value;
    return {
      base: withSlash($('g-base').value),
      mode: mode,
      product: $('g-product').value.trim(),
      price: $('g-price').value.trim().replace(/,/g, ''),
      label: $('g-label').value.trim() || 'Pay with bKash',
      success: $('g-success').value.trim(),
      includeScript: $('g-script').checked,
    };
  }

  function buildSnippet(state) {
    var lines = [];
    if (state.includeScript) {
      lines.push('<script src="' + escapeAttr(state.base + 'blogger.js') + '"></script>', '');
    }
    var attrs = [];
    if (state.mode === 'custom') {
      lines.push(
        '<input id="bkash-custom-amount" type="number" min="' + escapeAttr(state.price) +
          '" inputmode="numeric" placeholder="Amount in BDT">'
      );
      attrs.push('data-bkash-amount-from="bkash-custom-amount"');
    } else {
      attrs.push('data-bkash-amount="' + escapeAttr(state.price) + '"');
    }
    if (state.product) attrs.push('data-bkash-product="' + escapeAttr(state.product) + '"');
    if (state.success) attrs.push('data-bkash-success-url="' + escapeAttr(state.success) + '"');
    lines.push('<button ' + attrs.join(' ') + '>' + escapeText(state.label) + '</button>');
    return lines.join('\n');
  }

  function updateBuilder() {
    var state = builderState();
    var custom = state.mode === 'custom';
    $('g-price-label').textContent = custom ? 'Minimum (৳)' : 'Price (৳)';

    var valid = /^\d+(\.\d{1,2})?$/.test(state.price) && Number(state.price) > 0;
    $('g-price').setAttribute('aria-invalid', String(!valid));
    $('g-price-error').hidden = valid;
    if (!valid) return;

    var snippet = buildSnippet(state);
    var pre = $('g-code');
    pre.querySelector('code').textContent = snippet;
    window.site.renderCode(pre);
    $('g-preview').innerHTML = toPreview(snippet);
    if (custom) $('bkash-custom-amount').value = state.price;
  }

  function setupBuilder() {
    var form = $('builderForm');
    if (!form) return;
    $('g-base').value = defaultBase();
    form.addEventListener('input', updateBuilder);
    form.addEventListener('change', updateBuilder);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
    });
    updateBuilder();
  }

  // -------------------------------------------------------------------------
  // Example previews render the example's own code.

  function renderExample(preview) {
    var code = preview.closest('.example-body').querySelector('pre code');
    preview.innerHTML = toPreview(code.textContent);
  }

  function setupExamples() {
    document.querySelectorAll('[data-preview]').forEach(renderExample);
    document.querySelectorAll('[data-reset]').forEach(function (button) {
      button.addEventListener('click', function () {
        renderExample(button.closest('.example-body').querySelector('[data-preview]'));
      });
    });

    // The "reveal after payment" example's inline script, for its preview.
    document.addEventListener('bkash:success', function (event) {
      if (event.detail.product !== 'Members Guide') return;
      var trx = document.getElementById('paid-trx');
      var content = document.getElementById('paid-content');
      if (trx) trx.textContent = event.detail.trxID;
      if (content) content.hidden = false;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupBuilder();
    setupExamples();
  });
})();
