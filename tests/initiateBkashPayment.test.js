const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const initiateBkashPayment = require('../bkash-payment.js');
const { isTrustedBkashUrl, normalizeAmount } = initiateBkashPayment;

const API = 'https://bkash-blogger.example.workers.dev';

describe('initiateBkashPayment', () => {
  let originalConsoleError;
  let fetchCalls;

  function respondWith(data, ok = true) {
    global.fetch = (url, options) => {
      fetchCalls.push({ url, options });
      return Promise.resolve({ ok, json: () => Promise.resolve(data) });
    };
  }

  beforeEach(() => {
    fetchCalls = [];
    respondWith({});
    global.window = { location: { href: '' }, BKASH_CONFIG: { apiBase: API + '/' } };
    originalConsoleError = console.error;
    console.error = () => {};
  });

  afterEach(() => {
    console.error = originalConsoleError;
    delete global.fetch;
    delete global.window;
  });

  test('asks the payment server to create a payment and redirects to bKash', async () => {
    const successData = {
      paymentID: 'TR0011abc',
      bkashURL: 'https://sandbox.payment.bkash.com/?paymentId=TR0011abc',
    };
    respondWith(successData);

    const data = await initiateBkashPayment('990', 'INV123456', { product: 'eBook' });

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, API + '/create');
    assert.equal(fetchCalls[0].options.method, 'POST');
    assert.deepEqual(fetchCalls[0].options.headers, { 'Content-Type': 'application/json' });
    assert.deepEqual(JSON.parse(fetchCalls[0].options.body), {
      amount: '990',
      invoice: 'INV123456',
      product: 'eBook',
    });
    assert.deepEqual(data, successData);
    assert.equal(global.window.location.href, successData.bkashURL);
  });

  test('never sends bKash credentials from the browser', async () => {
    respondWith({ bkashURL: 'https://sandbox.payment.bkash.com/?paymentId=1' });
    await initiateBkashPayment('100', 'INV1');
    const sent = JSON.stringify(fetchCalls[0].options);
    assert.ok(!/authorization|x-app-key|secret|password/i.test(sent));
  });

  test('can skip the redirect', async () => {
    respondWith({ bkashURL: 'https://sandbox.payment.bkash.com/?paymentId=1' });
    await initiateBkashPayment('100', 'INV1', { redirect: false });
    assert.equal(global.window.location.href, '');
  });

  test('refuses to redirect anywhere except bKash', async () => {
    respondWith({ bkashURL: 'https://bkash.com.evil.example/pay' });
    await assert.rejects(() => initiateBkashPayment('100', 'INV1'), /not bKash/);
    assert.equal(global.window.location.href, '');
  });

  test('surfaces error messages from the payment server', async () => {
    respondWith({ error: { code: 'price_mismatch', message: 'The price of "eBook" is 500 BDT' } }, false);
    await assert.rejects(
      () => initiateBkashPayment('1', 'INV1', { product: 'eBook' }),
      err => err.code === 'price_mismatch' && /500 BDT/.test(err.message)
    );
  });

  test('fails clearly when no payment server is configured', async () => {
    global.window.BKASH_CONFIG = {};
    await assert.rejects(() => initiateBkashPayment('100', 'INV1'), /config\.js/);
    assert.equal(fetchCalls.length, 0);
  });

  test('rejects invalid amounts without calling the server', async () => {
    await assert.rejects(() => initiateBkashPayment('abc', 'INV1'), /Invalid amount/);
    assert.equal(fetchCalls.length, 0);
  });

  test('propagates network errors without redirect', async () => {
    const errors = [];
    console.error = (...args) => errors.push(args);
    global.fetch = () => Promise.reject(new Error('Network error'));

    await assert.rejects(() => initiateBkashPayment('100', 'INV1'), /reach the payment server/);

    assert.equal(global.window.location.href, '');
    assert.ok(errors.length > 0);
  });
});

describe('helpers', () => {
  test('isTrustedBkashUrl only accepts https bKash hosts', () => {
    assert.equal(isTrustedBkashUrl('https://sandbox.payment.bkash.com/?paymentId=1'), true);
    assert.equal(isTrustedBkashUrl('https://payment.bkash.com/redirect'), true);
    assert.equal(isTrustedBkashUrl('https://tokenized.pay.bka.sh/x'), true);
    assert.equal(isTrustedBkashUrl('http://payment.bkash.com/'), false);
    assert.equal(isTrustedBkashUrl('https://evilbkash.com/'), false);
    assert.equal(isTrustedBkashUrl('https://bkash.com.evil.example/'), false);
    assert.equal(isTrustedBkashUrl('javascript:alert(1)'), false);
    assert.equal(isTrustedBkashUrl('not a url'), false);
  });

  test('normalizeAmount understands common price formats', () => {
    assert.equal(normalizeAmount(500), '500');
    assert.equal(normalizeAmount('1,500'), '1500');
    assert.equal(normalizeAmount('৳ 990'), '990');
    assert.equal(normalizeAmount('Tk. 500'), '500');
    assert.equal(normalizeAmount('৫০০'), '500');
    assert.equal(normalizeAmount('99.5'), '99.50');
    assert.equal(normalizeAmount('100.00'), '100');
    for (const bad of ['', '0', '-5', 'abc', '10.555', null, undefined]) {
      assert.equal(normalizeAmount(bad), null, String(bad));
    }
  });
});
