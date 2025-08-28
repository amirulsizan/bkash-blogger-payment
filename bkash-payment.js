// Example bKash API URLs
var bkashApiUrl = "https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create";
var tokenUrl = "https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/token/grant";

// Your bKash Merchant Credentials
var merchantId = "YOUR_MERCHANT_ID";
var secretKey = "YOUR_SECRET_KEY"; // Also known as app secret

// Cached access token and expiry time
var accessToken = null;
var tokenExpiryTime = 0;

// Retrieve a temporary access token from bKash
async function getBkashToken(retry = true) {
    if (accessToken && Date.now() < tokenExpiryTime) {
        return accessToken;
    }

    try {
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                app_key: merchantId,
                app_secret: secretKey
            })
        });

        if (!response.ok) {
            throw new Error("Token request failed");
        }

        const data = await response.json();
        if (data && data.id_token) {
            accessToken = data.id_token;
            tokenExpiryTime = Date.now() + (data.expires_in || 3600) * 1000;
            return accessToken;
        }

        throw new Error("Invalid token response");
    } catch (error) {
        console.error("Error retrieving bKash token:", error);
        if (retry) {
            return getBkashToken(false);
        }
        throw error;
    }
}

// Initiate the bKash payment
async function initiateBkashPayment(retry = true) {

function initiateBKashPayment() {
    // Example bKash Payment API URL
    var bkashApiUrl = "https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create";

    // Your bKash Merchant Credentials
    var merchantId = "YOUR_MERCHANT_ID";
    var secretKey = "YOUR_SECRET_KEY";
    
    // Payment Details
    var paymentDetails = {
        amount: "100", // Example amount
        currency: "BDT",
        merchantInvoiceNumber: "INV123456",
        intent: "sale"
    };

    try {
        const token = await getBkashToken();

        const response = await fetch(bkashApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token,
                "X-App-Key": merchantId
            },
            body: JSON.stringify(paymentDetails)
        });

        // Retry once if the token has expired or is invalid
        if (response.status === 401 && retry) {
            accessToken = null;
            return initiateBkashPayment(false);
        }

        const data = await response.json();
        if (data && data.paymentID) {
            // Redirect to bKash payment page
            window.location.href = data.bkashURL;
        } else {
            console.error("Payment initiation failed", data);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

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