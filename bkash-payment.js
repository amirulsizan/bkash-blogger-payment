// bkash-payment.js
// Demonstrates the bKash sandbox payment flow for Blogger sites.
// Replace the placeholder credentials with your sandbox/app credentials
// from the bKash developer portal before deploying.

async function payWithBkash(amount = '100', invoice = 'INV' + Date.now()) {
  const baseUrl = 'https://checkout.sandbox.bka.sh/v1.2.0-beta';

  // Sandbox credentials - replace with your own details
  const appKey = 'YOUR_APP_KEY';
  const appSecret = 'YOUR_APP_SECRET';
  const username = 'YOUR_USERNAME';
  const password = 'YOUR_PASSWORD';

  try {
    // Step 1: grant token
    const tokenResponse = await fetch(`${baseUrl}/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username,
        password,
        'X-APP-Key': appKey,
      },
      body: JSON.stringify({
        app_key: appKey,
        app_secret: appSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token request failed');
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;
    if (!idToken) {
      throw new Error('Token missing in response');
    }

    // Step 2: create payment
    const paymentResponse = await fetch(`${baseUrl}/checkout/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        'X-APP-Key': appKey,
      },
      body: JSON.stringify({
        amount,
        currency: 'BDT',
        merchantInvoiceNumber: invoice,
        intent: 'sale',
      }),
    });

    if (!paymentResponse.ok) {
      throw new Error('Payment initiation failed');
    }

    const paymentData = await paymentResponse.json();
    if (paymentData.bkashURL) {
      window.location.href = paymentData.bkashURL;
    } else {
      throw new Error(paymentData.message || 'Payment initiation failed');
    }
  } catch (err) {
    console.error('Error initiating bKash payment:', err);
    alert('Payment failed: ' + err.message);
  }
}

// Expose the function globally for inline event handlers or other scripts
window.payWithBkash = payWithBkash;
