// Handles the multi-step payment popup interactions

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
    // Placeholder confirmation action
    alert('Payment confirmed!');
  });
}

document.querySelectorAll('.close').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (typeof window !== 'undefined' && window.close) {
      window.close();
    }
  });
});
