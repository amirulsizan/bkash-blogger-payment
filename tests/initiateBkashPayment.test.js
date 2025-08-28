const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const initiateBkashPayment = require('../bkash-payment.js');

describe('initiateBkashPayment', () => {
  let originalConsoleError;
  let fetchCalls;

  beforeEach(() => {
    fetchCalls = [];
    global.fetch = (url, options) => {
      fetchCalls.push({ url, options });
      return Promise.resolve({ json: () => Promise.resolve({}) });
    };
    global.window = { location: { href: '' } };
    originalConsoleError = console.error;
    console.error = () => {};
  });

  afterEach(() => {
    console.error = originalConsoleError;
    delete global.fetch;
    delete global.window;
  });

  test('sends expected payload and redirects on success', async () => {
    const successData = { paymentID: '123', bkashURL: 'https://bkash.com/pay/123' };
    global.fetch = (url, options) => {
      fetchCalls.push({ url, options });
      return Promise.resolve({ json: () => Promise.resolve(successData) });
    };

    await initiateBkashPayment();

    assert.deepStrictEqual(fetchCalls[0], {
      url: 'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer YOUR_SECRET_KEY',
          'X-App-Key': 'YOUR_MERCHANT_ID',
        },
        body: JSON.stringify({
          amount: '100',
          currency: 'BDT',
          merchantInvoiceNumber: 'INV123456',
          intent: 'sale',
        }),
      },
    });

    assert.strictEqual(global.window.location.href, 'https://bkash.com/pay/123');
  });

  test('handles failure without redirect', async () => {
    const errors = [];
    console.error = (...args) => errors.push(args);
    global.fetch = () => Promise.reject(new Error('Network error'));

    await initiateBkashPayment();

    assert.strictEqual(global.window.location.href, '');
    assert.ok(errors.length > 0);
  });
});
