// Handles the multi-step payment popup interactions

const params = new URLSearchParams(window.location.search);
const amount = params.get('amount') || '0';
const merchant = params.get('merchant') || '';
const invoice = params.get('invoice') || 'INV' + Date.now();

const amountEl = document.getElementById('amount');
if (amountEl) amountEl.textContent = amount;
const merchantEl = document.getElementById('merchantName');
if (merchantEl) merchantEl.textContent = merchant;
const invoiceEl = document.getElementById('invoiceNo');
if (invoiceEl) invoiceEl.textContent = invoice;

document.querySelectorAll('.next').forEach((btn) => {
  btn.addEventListener('click', () => {
    const currentStep = btn.closest('.popup-step');
    const nextStepNum = btn.dataset.next;
    if (currentStep && nextStepNum) {
      currentStep.classList.add('hidden');
      const nextStep = document.querySelector('.step-' + nextStepNum);
      if (nextStep) {
        nextStep.classList.remove('hidden');
      }
    }
  });
});

const confirmBtn = document.querySelector('.confirm');
if (confirmBtn) {
  confirmBtn.addEventListener('click', () => {
    confirmBtn.disabled = true;
    initiateBkashPayment(amount, invoice, merchant)
      .then(() => {
        alert('Payment request sent.');
        window.close();
      })
      .catch((err) => {
        alert('Payment failed: ' + err.message);
        confirmBtn.disabled = false;
      });
  });
}

document.querySelectorAll('.close').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (typeof window !== 'undefined' && window.close) {
      window.close();
    }
  });
});
