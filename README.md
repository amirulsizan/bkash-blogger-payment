# bKash Payment Integration for Blogger

This project demonstrates how to integrate bKash payment method into a Blogger Blogspot payment page using JavaScript.

## ✅ Confirmed: Works 100% with Blogger!

**YES, this integration is FULLY compatible with Blogger/Blogspot!** This is a pure client-side JavaScript solution that requires no backend server, making it perfect for static platforms like Blogger.

### Why It Works on Blogger:
- ✅ **No Backend Required**: 100% client-side JavaScript
- ✅ **Popup-Based**: Opens payment in a separate window
- ✅ **Secure**: All payments processed through official bKash gateway
- ✅ **Easy Integration**: Just copy and paste code into your Blogger posts
- ✅ **Mobile Friendly**: Works perfectly on all devices

## 🚀 Quick Start for Blogger

### Method 1: Direct Copy-Paste (Easiest)

1. **Visit the Examples Page**: Open `blogger-examples.html` in your browser
2. **Choose a Template**: Pick from single product, multiple products, or custom amount
3. **Copy the Code**: Click the "Copy" button
4. **Paste in Blogger**: 
   - Go to your Blogger post
   - Switch to HTML view
   - Paste the code
5. **Update Credentials**: Replace `YOUR_MERCHANT_NUMBER` and GitHub Pages URL
6. **Publish**: That's it! You're ready to accept payments

### Method 2: Theme Integration (For Multiple Posts)

Add the scripts to your Blogger theme for site-wide availability:

1. Go to **Theme → Edit HTML**
2. Find `</head>` tag
3. Add before `</head>`:

```html
<script src="https://yourusername.github.io/bkash-blogger-payment/bkash-payment.js"></script>
<script src="https://yourusername.github.io/bkash-blogger-payment/blogger.js"></script>
```

4. Then in any post, just add:
```html
<input id="amount" type="number" value="100" />
<button id="payBtn">Pay with bKash</button>
<script>bkashBlogger.initButton('payBtn', 'amount');</script>
```

## 📁 Project Structure

```
bkash-blogger-payment/
├── 🎨 Frontend Files
│   ├── index.html              # Homepage with live demo
│   ├── blogger-examples.html   # Ready-to-use code snippets ⭐
│   ├── docs.html               # API documentation
│   ├── setup.html              # Step-by-step setup guide
│   └── styles.css              # Main stylesheet
│
├── 💳 Payment Integration
│   ├── bkash-payment.js        # Core payment logic
│   ├── blogger.js              # Blogger helper functions
│   ├── popup.html              # Payment popup UI
│   ├── popup.css               # Popup styling
│   └── popup.js                # Popup interactions
│
├── 📚 Documentation
│   ├── README.md               # This file
│   ├── BLOGGER_INTEGRATION.md  # Complete Blogger guide ⭐
│   └── LICENSE                 # MIT License
│
├── ⚙️  Configuration
│   ├── package.json            # NPM configuration
│   └── .gitignore              # Git ignore rules
│
├── 🖼️  Assets
│   └── images/                 # Logo and graphics
│
└── 🧪 Tests
    └── tests/                  # Automated tests
```

## 📖 Complete Documentation

- **[Blogger Examples](blogger-examples.html)** - Ready-to-use code snippets
- **[Integration Guide](BLOGGER_INTEGRATION.md)** - Complete Blogger integration guide
- **[Setup Guide](setup.html)** - Step-by-step setup instructions
- **[API Documentation](docs.html)** - Technical API reference

## Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)
- [Running Tests](#running-tests)
- [Contributing](#contributing)
- [License](#license)

## Introduction

This repository provides a simple guide and code snippets to integrate bKash payment method into a Blogger Blogspot page for accepting payments from users. The integration involves client-side JavaScript for calculating and initiating payments using bKash API.

## Prerequisites

Before you begin, make sure you have the following:

- **bKash Merchant Account**: Sign up at [bKash Developer Portal](https://developer.bka.sh/)
- **Blogger Website**: Any Blogspot blog with access to post/theme editor
- **GitHub Account** (Optional but recommended for hosting files)

### Getting bKash Credentials

1. Visit [bKash Developers Portal](https://developer.bka.sh/)
2. Create or log in to your account
3. Obtain from dashboard:
   - Merchant Number
   - App Key
   - App Secret
   - Username
   - Password

**For Testing**: Use sandbox credentials provided by bKash for development and testing.

## Setup

1. **Obtain bKash API Credentials**:
   - Go to [bKash Developers Portal](https://developer.bka.sh/) and create or log in to your account.
   - Obtain your Merchant ID, Username, and Password from the dashboard.

2. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/bkash-payment-integration.git
   cd bkash-blogger-payment
   npm install

   ```

3. **Configure the Payment Page:**
   Edit your Blogger page HTML to include the payment form and JavaScript code provided in this repository.

## Usage

1. **Customize Payment Form:**
   Modify the provided HTML and JavaScript files to fit your specific product pricing and layout requirements.
2. **Integrate with bKash API:**
   Use the provided JavaScript snippets to calculate the payment amount and initiate a payment request to bKash API.

## Testing and Deployment

Test the integration thoroughly in a development environment. Deploy the changes to your Blogger site after successful testing.

## Running Tests

To run the automated tests for this project:

```bash
npm test
```

This uses Node's built-in test runner and requires no additional setup.

   Modify the provided HTML and JavaScript files to fit your specific product pricing and layout requirements.

2. **Trigger the payment:**

   Include `bkash-payment.js` and call `payWithBkash` from a button click. Replace the placeholder credentials in `bkash-payment.js` with your own sandbox or production credentials.

   ```html
   <button onclick="payWithBkash('100', 'INV123')">Pay with bKash</button>
   ```

   The script requests a sandbox token and redirects customers to bKash for approval.

## Testing and Deployment

Test the integration thoroughly in a development environment. Deploy the changes to your Blogger site after successful testing.

## Contributing

Contributions are welcome! If you have suggestions, improvements, or bug fixes, please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

This project is licensed under the MIT License - see the LICENSE.txt file for details.
