// Enhanced popup interactions with validation and smooth UX

// Parse URL parameters
const params = new URLSearchParams(window.location.search);
const amount = params.get('amount') || '0';
const merchant = params.get('merchant') || 'Demo Merchant';
const invoice = params.get('invoice') || 'INV' + Date.now();

// Populate payment details
const amountEl = document.getElementById('amount');
if (amountEl) amountEl.textContent = amount;
const merchantEl = document.getElementById('merchantName');
if (merchantEl) merchantEl.textContent = merchant;
const invoiceEl = document.getElementById('invoiceNo');
if (invoiceEl) invoiceEl.textContent = invoice;

// Current step tracking
let currentStep = 1;

// Validation functions
function validateBkashNumber(number) {
  const regex = /^01[0-9]{9}$/;
  return regex.test(number);
}

function validateVerificationCode(code) {
  const regex = /^[0-9]{6}$/;
  return regex.test(code);
}

function validatePIN(pin) {
  const regex = /^[0-9]{4}$/;
  return regex.test(pin);
}

// Show error on input
function showError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) {
    input.classList.add('error');
    if (error) error.style.display = 'block';
  }
}

// Clear error on input
function clearError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) {
    input.classList.remove('error');
    if (error) error.style.display = 'none';
  }
}

// Update progress indicator
function updateProgress(step) {
  document.querySelectorAll('.progress-step').forEach((el, index) => {
    const stepNum = index + 1;
    if (stepNum < step) {
      el.classList.add('completed');
      el.classList.remove('active');
    } else if (stepNum === step) {
      el.classList.add('active');
      el.classList.remove('completed');
    } else {
      el.classList.remove('active', 'completed');
    }
  });
}

// Navigate to step
function goToStep(step) {
  document.querySelectorAll('.popup-step').forEach(el => {
    el.classList.remove('active');
  });
  
  const targetStep = document.querySelector('.step-' + step);
  if (targetStep) {
    targetStep.classList.add('active');
    currentStep = step;
    updateProgress(step);
  }
}

// Step 1: Account Number Validation
const bkashNumberInput = document.getElementById('bkash-number');
const agreeCheckbox = document.getElementById('agree');
const step1NextBtn = document.querySelector('.step-1 .next-btn');

if (bkashNumberInput) {
  bkashNumberInput.addEventListener('input', () => {
    clearError('bkash-number', 'number-error');
  });
}

if (step1NextBtn) {
  step1NextBtn.addEventListener('click', () => {
    const number = bkashNumberInput?.value || '';
    const agreed = agreeCheckbox?.checked || false;
    
    let isValid = true;
    
    if (!validateBkashNumber(number)) {
      showError('bkash-number', 'number-error');
      isValid = false;
    }
    
    if (!agreed) {
      alert('Please agree to the terms and conditions');
      isValid = false;
    }
    
    if (isValid) {
      goToStep(2);
    }
  });
}

// Step 2: Verification Code
const verificationCodeInput = document.getElementById('verification-code');
const step2NextBtn = document.querySelector('.step-2 .next-btn');
const resendBtn = document.getElementById('resend-code');

if (verificationCodeInput) {
  verificationCodeInput.addEventListener('input', () => {
    clearError('verification-code', 'code-error');
  });
}

if (step2NextBtn) {
  step2NextBtn.addEventListener('click', () => {
    const code = verificationCodeInput?.value || '';
    
    if (!validateVerificationCode(code)) {
      showError('verification-code', 'code-error');
      return;
    }
    
    goToStep(3);
  });
}

// Resend code functionality
if (resendBtn) {
  let resendCooldown = false;
  resendBtn.addEventListener('click', () => {
    if (resendCooldown) return;
    
    resendCooldown = true;
    resendBtn.disabled = true;
    resendBtn.textContent = 'Code sent!';
    
    setTimeout(() => {
      resendBtn.disabled = false;
      resendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg> Resend Code';
      resendCooldown = false;
    }, 3000);
  });
}

// Step 3: PIN Confirmation
const pinInput = document.getElementById('pin');
const confirmBtn = document.getElementById('confirm-payment');
const loadingOverlay = document.getElementById('loading-overlay');

if (pinInput) {
  pinInput.addEventListener('input', () => {
    clearError('pin', 'pin-error');
  });
}

if (confirmBtn) {
  confirmBtn.addEventListener('click', () => {
    const pin = pinInput?.value || '';
    
    if (!validatePIN(pin)) {
      showError('pin', 'pin-error');
      return;
    }
    
    // Show loading
    if (loadingOverlay) {
      loadingOverlay.classList.add('active');
    }
    confirmBtn.disabled = true;
    
    // Simulate payment processing
    if (typeof initiateBkashPayment === 'function') {
      initiateBkashPayment(amount, invoice, merchant)
        .then(() => {
          setTimeout(() => {
            alert('✅ Payment successful!');
            window.close();
          }, 1500);
        })
        .catch((err) => {
          if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
          }
          confirmBtn.disabled = false;
          alert('❌ Payment failed: ' + err.message);
        });
    } else {
      // Demo mode
      setTimeout(() => {
        if (loadingOverlay) {
          loadingOverlay.classList.remove('active');
        }
        alert('✅ Payment successful! (Demo Mode)');
        window.close();
      }, 2000);
    }
  });
}

// Back button functionality
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const backStep = parseInt(btn.dataset.back);
    if (backStep) {
      goToStep(backStep);
    }
  });
});

// Close button functionality
document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel the payment?')) {
      window.close();
    }
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const closeBtns = document.querySelectorAll('.close-btn');
    if (closeBtns.length > 0) {
      closeBtns[0].click();
    }
  }
  
  if (e.key === 'Enter') {
    const activeStep = document.querySelector('.popup-step.active');
    if (activeStep) {
      const nextBtn = activeStep.querySelector('.next-btn, .confirm-btn');
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
      }
    }
  }
});

// Initialize
updateProgress(1);
