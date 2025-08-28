// Simplified bKash payment integration used for the demo and tests.
// Replace the placeholder credentials with real values when deploying.

async function initiateBkashPayment(
  amount = '100',
  invoice = 'INV123456',
  merchantNumber
) {
  const url = 'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create';

  const payload = {
    amount,
    currency: 'BDT',
    merchantInvoiceNumber: invoice,
    intent: 'sale',
  };

  const merchant =
    merchantNumber ||
    (typeof bkashCreds !== 'undefined' && bkashCreds.merchantNumber) ||
    'YOUR_MERCHANT_ID';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_SECRET_KEY',
        'X-App-Key': merchant,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data && data.bkashURL) {
      // Redirect the user to complete payment
      window.location.href = data.bkashURL;
    } else {
      console.error('Payment initiation failed', data);
    }
  } catch (err) {
    console.error('Error initiating bKash payment:', err);
  }
}

// Expose the function for browser usage
if (typeof window !== 'undefined') {
  window.initiateBkashPayment = initiateBkashPayment;
}

// Export for Node.js tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = initiateBkashPayment;
}
