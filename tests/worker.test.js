const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const BASE = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout';
const WORKER = 'https://bkash-blogger.example.workers.dev';
const POPUP = 'https://shop.github.io/bkash-blogger-payment/popup.html';

const env = {
  BKASH_USERNAME: 'user',
  BKASH_PASSWORD: 'pass',
  BKASH_APP_KEY: 'app-key',
  BKASH_APP_SECRET: 'app-secret',
  POPUP_URL: POPUP,
};

let worker;
let resetTokenCache;
let calls;
let bkash;
const originalFetch = global.fetch;

// A tiny fake of the bKash tokenized checkout API.
function fakeBkash(overrides = {}) {
  return {
    '/token/grant': () => ({ statusCode: '0000', id_token: 'tok-1', expires_in: 3600 }),
    '/create': body => ({
      statusCode: '0000',
      paymentID: 'TR0011abc',
      bkashURL: 'https://sandbox.payment.bkash.com/?paymentId=TR0011abc',
      amount: body.amount,
      merchantInvoiceNumber: body.merchantInvoiceNumber,
    }),
    '/execute': body => ({
      statusCode: '0000',
      transactionStatus: 'Completed',
      paymentID: body.paymentID,
      trxID: 'BFD90JRLST',
      amount: '500',
      merchantInvoiceNumber: 'INV-1',
    }),
    '/payment/status': body => ({
      statusCode: '0000',
      transactionStatus: 'Completed',
      paymentID: body.paymentID,
      trxID: 'BFD90JRLST',
      amount: '500',
      currency: 'BDT',
      merchantInvoiceNumber: 'INV-1',
    }),
    ...overrides,
  };
}

function call(path, init = {}, customEnv = env) {
  return worker.fetch(new Request(WORKER + path, init), customEnv);
}

function create(body, headers = {}, customEnv = env) {
  return call(
    '/create',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://shop.github.io', ...headers },
      body: JSON.stringify(body),
    },
    customEnv
  );
}

describe('bKash worker', () => {
  before(async () => {
    const mod = await import('../worker/src/index.js');
    worker = mod.default;
    resetTokenCache = mod.resetTokenCache;
  });

  beforeEach(() => {
    resetTokenCache();
    calls = [];
    bkash = fakeBkash();
    global.fetch = async (url, options) => {
      const path = url.slice(BASE.length);
      const body = JSON.parse(options.body);
      calls.push({ url, path, headers: options.headers, body });
      const handler = bkash[path];
      if (!handler) throw new Error('unexpected bKash call ' + url);
      const result = handler(body);
      if (result instanceof Error) throw result;
      return { json: async () => result };
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('health check reports configuration', async () => {
    const res = await call('/', {}, { POPUP_URL: POPUP });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.mode, 'sandbox');
    assert.equal(data.configured, false);
    assert.deepEqual(data.missing, ['BKASH_USERNAME', 'BKASH_PASSWORD', 'BKASH_APP_KEY', 'BKASH_APP_SECRET']);
  });

  test('create grants a token and creates a tokenized checkout payment', async () => {
    const res = await create({ amount: '500', invoice: 'INV-1', product: 'eBook' });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(data, {
      paymentID: 'TR0011abc',
      bkashURL: 'https://sandbox.payment.bkash.com/?paymentId=TR0011abc',
      amount: '500',
      invoice: 'INV-1',
    });
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://shop.github.io');

    assert.equal(calls[0].path, '/token/grant');
    assert.equal(calls[0].headers.username, 'user');
    assert.equal(calls[0].headers.password, 'pass');
    assert.deepEqual(calls[0].body, { app_key: 'app-key', app_secret: 'app-secret' });

    assert.equal(calls[1].path, '/create');
    assert.equal(calls[1].headers.Authorization, 'tok-1');
    assert.equal(calls[1].headers['X-App-Key'], 'app-key');
    assert.deepEqual(calls[1].body, {
      mode: '0011',
      payerReference: 'INV-1',
      callbackURL: WORKER + '/callback',
      amount: '500',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: 'INV-1',
    });
  });

  test('reuses the grant token between payments', async () => {
    await create({ amount: '500' });
    await create({ amount: '700' });
    assert.equal(calls.filter(c => c.path === '/token/grant').length, 1);
  });

  test('rejects invalid amounts before calling bKash', async () => {
    for (const amount of ['', '0', '-5', 'abc', '10.555', null]) {
      const res = await create({ amount });
      assert.equal(res.status, 400, 'amount ' + amount);
      assert.equal((await res.json()).error.code, 'invalid_amount');
    }
    assert.equal(calls.length, 0);
  });

  test('blocks browsers from origins that are not allowed', async () => {
    const res = await create({ amount: '500' }, { Origin: 'https://evil.example' });
    assert.equal(res.status, 403);
    assert.equal(calls.length, 0);
  });

  test('answers CORS preflight for allowed origins', async () => {
    const res = await call('/create', {
      method: 'OPTIONS',
      headers: { Origin: 'https://shop.github.io', 'Access-Control-Request-Method': 'POST' },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://shop.github.io');
  });

  test('enforces server-side prices when PRICES is set', async () => {
    const priced = { ...env, PRICES: '{"Premium eBook": 500, "Donation": "any"}' };

    let res = await create({ amount: '1', product: 'Premium eBook' }, {}, priced);
    assert.equal((await res.json()).error.code, 'price_mismatch');

    res = await create({ amount: '500', product: 'Something else' }, {}, priced);
    assert.equal((await res.json()).error.code, 'unknown_product');

    res = await create({ amount: '500.00', product: 'Premium eBook' }, {}, priced);
    assert.equal(res.status, 200);

    res = await create({ amount: '77', product: 'Donation' }, {}, priced);
    assert.equal(res.status, 200);
  });

  test('surfaces bKash errors without leaking credentials', async () => {
    bkash['/token/grant'] = () => ({ statusCode: '2001', statusMessage: 'Invalid App Key' });
    const res = await create({ amount: '500' });
    const data = await res.json();
    assert.equal(res.status, 502);
    assert.equal(data.error.message, 'Invalid App Key');
    assert.equal(data.error.bkashCode, '2001');
    assert.ok(!JSON.stringify(data).includes('app-secret'));
  });

  test('reports a clear error when secrets are missing', async () => {
    const res = await create({ amount: '500' }, {}, { POPUP_URL: POPUP });
    const data = await res.json();
    assert.equal(res.status, 500);
    assert.equal(data.error.code, 'not_configured');
  });

  test('callback executes the payment and redirects to the popup', async () => {
    const res = await call('/callback?paymentID=TR0011abc&status=success&signature=x');
    assert.equal(res.status, 302);
    const location = new URL(res.headers.get('Location'));
    assert.equal(location.origin + location.pathname, POPUP);
    assert.equal(location.searchParams.get('status'), 'success');
    assert.equal(location.searchParams.get('paymentID'), 'TR0011abc');
    assert.equal(location.searchParams.get('trxID'), 'BFD90JRLST');
    assert.equal(location.searchParams.get('amount'), '500');
    assert.equal(location.searchParams.get('invoice'), 'INV-1');
    assert.deepEqual(calls.map(c => c.path), ['/token/grant', '/execute']);
  });

  test('callback falls back to a status query when execute fails', async () => {
    bkash['/execute'] = () => ({ statusCode: '2056', statusMessage: 'Invalid Payment State' });
    const res = await call('/callback?paymentID=TR0011abc&status=success');
    const location = new URL(res.headers.get('Location'));
    assert.equal(location.searchParams.get('status'), 'success');
    assert.equal(location.searchParams.get('trxID'), 'BFD90JRLST');
    assert.deepEqual(calls.map(c => c.path), ['/token/grant', '/execute', '/payment/status']);
  });

  test('callback reports failure when bKash does not complete the payment', async () => {
    bkash['/execute'] = () => ({ statusCode: '2023', statusMessage: 'Insufficient Balance' });
    bkash['/payment/status'] = () => ({ statusCode: '0000', transactionStatus: 'Initiated' });
    const res = await call('/callback?paymentID=TR0011abc&status=success');
    const location = new URL(res.headers.get('Location'));
    assert.equal(location.searchParams.get('status'), 'failure');
  });

  test('callback passes cancel and failure through without executing', async () => {
    let res = await call('/callback?paymentID=TR0011abc&status=cancel');
    assert.equal(new URL(res.headers.get('Location')).searchParams.get('status'), 'cancel');

    res = await call('/callback?paymentID=TR0011abc&status=failure');
    assert.equal(new URL(res.headers.get('Location')).searchParams.get('status'), 'failure');
    assert.equal(calls.length, 0);
  });

  test('verify returns the authoritative status from bKash', async () => {
    const res = await call('/verify?paymentID=TR0011abc', { headers: { Origin: 'https://shop.github.io' } });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.verified, true);
    assert.equal(data.trxID, 'BFD90JRLST');
    assert.equal(data.invoice, 'INV-1');

    const bad = await call('/verify?paymentID=../../etc');
    assert.equal(bad.status, 400);
  });
});
