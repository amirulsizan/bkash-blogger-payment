// blogger.js - helper to wire bKash payments in Blogger pages
(function () {
  function getAmount(amountId) {
    var el = amountId ? document.getElementById(amountId) : null;
    if (!el) return '100';
    return el.value || el.dataset.price || el.textContent || '100';
  }

  function createModal(amount, merchant) {
    var overlay = document.createElement('div');
    overlay.className = 'bkash-modal active';
    var content = document.createElement('div');
    content.className = 'bkash-modal-content';
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    function step1() {
      content.innerHTML =
        '<h3>Your bKash Number</h3>' +
        '<input type="text" id="bkash-number" />' +
        '<button id="bkash-next-1" class="bkash-pay-button">Next</button>';
      document
        .getElementById('bkash-next-1')
        .addEventListener('click', step2);
    }

    function step2() {
      content.innerHTML =
        '<h3>OTP</h3>' +
        '<input type="text" id="bkash-otp" />' +
        '<button id="bkash-next-2" class="bkash-pay-button">Pay</button>';
      document
        .getElementById('bkash-next-2')
        .addEventListener('click', step3);
    }

    function step3() {
      content.innerHTML = '<h3>Processing Payment...</h3>';
      initiateBkashPayment(amount, 'INV' + Date.now(), merchant);
      setTimeout(close, 1000);
    }

    function close() {
      document.body.removeChild(overlay);
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    step1();
  }

  function initButton(buttonId, amountInputId) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.classList.add('bkash-pay-button');

    btn.addEventListener('click', function () {
      var amount = getAmount(amountInputId);
      var merchant =
        (window.bkashCreds && window.bkashCreds.merchantNumber) ||
        'YOUR_MERCHANT_ID';
      createModal(amount, merchant);
    });
  }

  window.bkashBlogger = { initButton: initButton };
})();

