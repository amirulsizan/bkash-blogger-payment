// bkash.js

function initiateBkashPayment(amount, invoice) {
  // Replace with your bKash API details
  const bkashEndpoint = "YOUR_BKASH_API_ENDPOINT";
  const bkashMerchantId = "YOUR_MERCHANT_ID";
  
  // Create payload
  const payload = {
    amount: amount,
    invoice: invoice,
    merchant_id: bkashMerchantId
  };

  // Make the API request
  fetch(bkashEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === "success") {
      window.location.href = data.redirect_url;
    } else {
      alert("Payment failed: " + data.message);
    }
  })
  .catch(error => {
    console.error("Error:", error);
  });
}
