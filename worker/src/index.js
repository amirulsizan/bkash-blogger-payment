/**
 * bKash Tokenized Checkout backend for Blogger (and any static site).
 *
 * Deploy this file as a Cloudflare Worker (free plan is enough). It keeps your
 * bKash credentials on the server, talks to the bKash API, and sends the
 * customer back to the checkout popup with the result.
 *
 * Routes
 *   GET  /            Health check: shows mode and whether secrets are set.
 *   POST /create      { amount, invoice?, product? } -> { paymentID, bkashURL, amount, invoice }
 *   GET  /callback    bKash redirects the customer here. The payment is executed
 *                     and the customer is redirected to POPUP_URL with the result.
 *   GET  /verify      ?paymentID=... -> authoritative status straight from bKash.
 *
 * Environment (Settings -> Variables and Secrets in the Cloudflare dashboard)
 *   BKASH_USERNAME, BKASH_PASSWORD,
 *   BKASH_APP_KEY, BKASH_APP_SECRET   Secrets from your bKash merchant account.
 *   POPUP_URL        https://<you>.github.io/bkash-blogger-payment/popup.html
 *   BKASH_MODE       "sandbox" (default) or "live".
 *   ALLOWED_ORIGINS  Optional, comma separated. Defaults to the POPUP_URL origin.
 *   PRICES           Optional JSON: {"Premium eBook": 500, "Donation": "any"}.
 *                    When set, only these products can be paid and the price is
 *                    enforced on the server.
 *   MAX_AMOUNT       Optional upper limit per payment, in BDT.
 *   BKASH_BASE_URL   Optional override of the bKash API base URL.
 */

const BKASH_BASE_URLS = {
  sandbox: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout',
  live: 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout',
};

const REQUIRED_SECRETS = [
  'BKASH_USERNAME',
  'BKASH_PASSWORD',
  'BKASH_APP_KEY',
  'BKASH_APP_SECRET',
];

const BKASH_TIMEOUT_MS = 30000;

// Grant tokens are valid for an hour; reuse them while this isolate is warm.
let tokenCache = null;

export function resetTokenCache() {
  tokenCache = null;
}

class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export default {
  async fetch(request, env) {
    const config = readConfig(env || {});
    const cors = corsHeaders(request, config);
    try {
      return await route(request, config, cors);
    } catch (err) {
      if (!(err instanceof HttpError)) {
        console.error('Unexpected error', err);
      }
      const status = err instanceof HttpError ? err.status : 500;
      const body = {
        error: {
          code: err instanceof HttpError ? err.code : 'internal_error',
          message:
            err instanceof HttpError ? err.message : 'Unexpected server error',
          ...(err instanceof HttpError && err.extra ? err.extra : {}),
        },
      };
      return json(body, status, cors || {});
    }
  },
};

async function route(request, config, cors) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'OPTIONS') {
    if (!cors) throw new HttpError(403, 'origin_not_allowed', 'Origin not allowed');
    return new Response(null, { status: 204, headers: cors });
  }

  if (path === '/' && request.method === 'GET') {
    return json(
      {
        ok: true,
        service: 'bkash-blogger',
        mode: config.mode,
        configured: config.missing.length === 0 && Boolean(config.popupUrl),
        missing: config.popupUrl
          ? config.missing
          : config.missing.concat('POPUP_URL'),
      },
      200,
      cors || {}
    );
  }

  if (path === '/create') {
    assertMethod(request, 'POST');
    // Only browsers send Origin; block other sites from creating payments.
    if (request.headers.get('Origin') && !cors) {
      throw new HttpError(403, 'origin_not_allowed', 'Origin not allowed');
    }
    return json(await createPayment(request, url, config), 200, cors || {});
  }

  if (path === '/callback') {
    assertMethod(request, 'GET');
    return handleCallback(url, config);
  }

  if (path === '/verify') {
    assertMethod(request, 'GET');
    return json(await verifyPayment(url, config), 200, cors || {});
  }

  throw new HttpError(404, 'not_found', 'Not found');
}

function readConfig(env) {
  const mode = String(env.BKASH_MODE || 'sandbox').toLowerCase() === 'live'
    ? 'live'
    : 'sandbox';
  const popupUrl = parseHttpUrl(env.POPUP_URL);
  let allowedOrigins = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (allowedOrigins.length === 0 && popupUrl) {
    allowedOrigins = [popupUrl.origin];
  }

  return {
    mode,
    baseUrl: String(env.BKASH_BASE_URL || BKASH_BASE_URLS[mode]).replace(/\/+$/, ''),
    username: env.BKASH_USERNAME,
    password: env.BKASH_PASSWORD,
    appKey: env.BKASH_APP_KEY,
    appSecret: env.BKASH_APP_SECRET,
    missing: REQUIRED_SECRETS.filter(name => !env[name]),
    popupUrl,
    allowedOrigins,
    prices: parsePrices(env.PRICES),
    maxAmount: env.MAX_AMOUNT ? Number(env.MAX_AMOUNT) : null,
  };
}

function parseHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function parsePrices(value) {
  if (!value) return null;
  try {
    const prices = typeof value === 'string' ? JSON.parse(value) : value;
    return prices && typeof prices === 'object' ? prices : null;
  } catch {
    console.error('PRICES is not valid JSON; ignoring it');
    return null;
  }
}

function corsHeaders(request, config) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed =
    config.allowedOrigins.includes('*') ||
    config.allowedOrigins.includes(origin);
  if (!allowed) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function assertMethod(request, method) {
  if (request.method !== method) {
    throw new HttpError(405, 'method_not_allowed', 'Use ' + method);
  }
}

function assertConfigured(config) {
  if (config.missing.length) {
    throw new HttpError(
      500,
      'not_configured',
      'The payment server is missing: ' + config.missing.join(', ')
    );
  }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Input validation

export function normalizeAmount(value) {
  const text = String(value == null ? '' : value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text) || !(Number(text) > 0)) {
    throw new HttpError(
      400,
      'invalid_amount',
      'Amount must be a positive number with at most 2 decimals'
    );
  }
  return Number(text).toFixed(2).replace(/\.00$/, '');
}

export function normalizeInvoice(value) {
  const cleaned = String(value || '')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 50);
  if (cleaned) return cleaned;
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return 'INV-' + Date.now().toString(36).toUpperCase() + '-' + random;
}

function resolvePrice(config, product, amount) {
  if (!config.prices) return amount;
  if (!product || !(product in config.prices)) {
    throw new HttpError(400, 'unknown_product', 'This product is not for sale');
  }
  const listed = config.prices[product];
  if (listed === 'any') return amount;
  const price = normalizeAmount(listed);
  if (price !== amount) {
    throw new HttpError(
      400,
      'price_mismatch',
      'The price of "' + product + '" is ' + price + ' BDT'
    );
  }
  return price;
}

// ---------------------------------------------------------------------------
// bKash API

async function bkashRequest(config, path, body, token) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = token;
    headers['X-App-Key'] = config.appKey;
  } else {
    headers.username = config.username;
    headers.password = config.password;
  }

  let response;
  try {
    response = await fetch(config.baseUrl + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(BKASH_TIMEOUT_MS),
    });
  } catch (err) {
    throw new HttpError(502, 'bkash_unreachable', 'Could not reach bKash. Please try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // handled below
  }
  if (!data || typeof data !== 'object') {
    throw new HttpError(502, 'bkash_bad_response', 'bKash returned an unexpected response');
  }
  return data;
}

function bkashError(data, fallback) {
  const message =
    (data && (data.statusMessage || data.errorMessage || data.message)) || fallback;
  const bkashCode = data && (data.statusCode || data.errorCode);
  return new HttpError(502, 'bkash_error', message, bkashCode ? { bkashCode } : undefined);
}

async function getToken(config) {
  const cacheKey = config.baseUrl + '|' + config.appKey;
  if (tokenCache && tokenCache.key === cacheKey && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  const data = await bkashRequest(config, '/token/grant', {
    app_key: config.appKey,
    app_secret: config.appSecret,
  });
  if (!data.id_token) throw bkashError(data, 'bKash rejected the merchant credentials');

  const lifetime = Number(data.expires_in) || 3600;
  tokenCache = {
    key: cacheKey,
    token: data.id_token,
    // Refresh five minutes early so a token never expires mid-checkout.
    expiresAt: Date.now() + Math.max(lifetime - 300, 60) * 1000,
  };
  return data.id_token;
}

async function createPayment(request, url, config) {
  assertConfigured(config);

  let input;
  try {
    input = await request.json();
  } catch {
    throw new HttpError(400, 'invalid_json', 'Send a JSON body');
  }
  input = input || {};

  const product = String(input.product || '').trim().slice(0, 100);
  const amount = resolvePrice(config, product, normalizeAmount(input.amount));
  if (config.maxAmount && Number(amount) > config.maxAmount) {
    throw new HttpError(400, 'amount_too_large', 'Maximum amount is ' + config.maxAmount + ' BDT');
  }
  const invoice = normalizeInvoice(input.invoice);

  const token = await getToken(config);
  const data = await bkashRequest(
    config,
    '/create',
    {
      mode: '0011',
      payerReference: invoice,
      callbackURL: new URL('/callback', url).toString(),
      amount,
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: invoice,
    },
    token
  );
  if (!data.paymentID || !data.bkashURL) {
    throw bkashError(data, 'bKash could not create the payment');
  }

  return { paymentID: data.paymentID, bkashURL: data.bkashURL, amount, invoice };
}

async function queryPayment(config, token, paymentID) {
  return bkashRequest(config, '/payment/status', { paymentID }, token);
}

async function executePayment(config, paymentID) {
  const token = await getToken(config);
  let data = null;
  try {
    data = await bkashRequest(config, '/execute', { paymentID }, token);
  } catch (err) {
    // A timeout here does not mean the payment failed; ask bKash below.
  }
  if (!data || data.transactionStatus !== 'Completed') {
    // Also covers refreshing the callback page: execute then reports an
    // invalid payment state, while the status query says "Completed".
    const status = await queryPayment(config, token, paymentID).catch(() => null);
    if (status && status.transactionStatus) return status;
  }
  return data || {};
}

function validPaymentID(value) {
  return typeof value === 'string' && /^[A-Za-z0-9]{1,64}$/.test(value);
}

async function handleCallback(url, config) {
  if (!config.popupUrl) {
    throw new HttpError(500, 'not_configured', 'The payment server is missing: POPUP_URL');
  }
  const paymentID = url.searchParams.get('paymentID');
  const status = url.searchParams.get('status');
  const target = new URL(config.popupUrl.toString());
  const result = target.searchParams;

  if (validPaymentID(paymentID)) result.set('paymentID', paymentID);

  if (status === 'cancel') {
    result.set('status', 'cancel');
  } else if (status === 'success' && validPaymentID(paymentID) && config.missing.length === 0) {
    let data;
    try {
      data = await executePayment(config, paymentID);
    } catch (err) {
      data = { statusMessage: err.message };
    }
    if (data.transactionStatus === 'Completed') {
      result.set('status', 'success');
      if (data.trxID) result.set('trxID', data.trxID);
      if (data.amount) result.set('amount', data.amount);
      if (data.merchantInvoiceNumber) result.set('invoice', data.merchantInvoiceNumber);
    } else {
      result.set('status', 'failure');
      result.set('message', data.statusMessage || data.errorMessage || 'The payment could not be completed');
    }
  } else {
    result.set('status', 'failure');
    result.set('message', 'The payment was not completed');
  }

  return new Response(null, {
    status: 302,
    headers: { Location: target.toString(), 'Cache-Control': 'no-store' },
  });
}

async function verifyPayment(url, config) {
  assertConfigured(config);
  const paymentID = url.searchParams.get('paymentID');
  if (!validPaymentID(paymentID)) {
    throw new HttpError(400, 'invalid_payment_id', 'Pass a valid paymentID');
  }
  const token = await getToken(config);
  const data = await queryPayment(config, token, paymentID);
  if (!data.transactionStatus) throw bkashError(data, 'Payment not found');

  return {
    paymentID,
    verified: data.transactionStatus === 'Completed',
    transactionStatus: data.transactionStatus,
    trxID: data.trxID || null,
    amount: data.amount || null,
    currency: data.currency || 'BDT',
    invoice: data.merchantInvoiceNumber || null,
  };
}
