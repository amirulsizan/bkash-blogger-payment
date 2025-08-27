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

