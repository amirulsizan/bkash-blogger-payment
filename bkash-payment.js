function initiateBkashPayment() {
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

    // Make API Call
    fetch(bkashApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + secretKey,
            "X-App-Key": merchantId
        },
        body: JSON.stringify(paymentDetails)
    })
    .then(response => response.json())
    .then(data => {
        if (data && data.paymentID) {
            // Redirect to bKash payment page
            window.location.href = data.bkashURL;
        } else {
            console.error("Payment initiation failed", data);
        }
    })
    .catch(error => {
        console.error("Error:", error);
    });
}
