// blogger.js - helper to wire bKash payments in Blogger pages
(function () {
  function initButton(buttonId, amountInputId) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.addEventListener('click', function () {
      var amountEl = amountInputId ? document.getElementById(amountInputId) : null;
      var amount = amountEl && amountEl.value ? amountEl.value : '100';
      initiateBkashPayment(amount, 'INV' + Date.now());
    });
  }

  window.bkashBlogger = { initButton: initButton };
})();
