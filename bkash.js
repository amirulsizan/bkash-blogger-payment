// bkash.js

function initiateBKashPayment(amount, invoice) {
  // Replace with your bKash API details
  const bkashEndpoint = "YOUR_BKASH_API_ENDPOINT";
  const bkashMerchantId = "YOUR_MERCHANT_ID";
  
  // Create payload
  const payload = {
    amount: amount,
    invoice: invoice,
    merchant_id: bkashMerchantId
  };

  // Make the API request and return the promise so callers can react to
  // the asynchronous result. Also surface HTTP errors that would
  // otherwise be swallowed by `response.json()`.
  return fetch(bkashEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  })
  .then(data => {
    if (data.status === "success") {
      window.location.href = data.redirect_url;
    } else {
      alert("Payment failed: " + data.message);
    }
    return data;
  })
  .catch(error => {
    console.error("Error:", error);
    throw error;
  });
}
