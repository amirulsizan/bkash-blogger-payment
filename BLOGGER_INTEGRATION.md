# bKash on Blogger: complete integration guide

This guide takes you from nothing to a working **Pay with bKash** button on your
Blogger site. The same steps, with screenshots of each setting, are on the docs
site's [setup guide](setup.html).

## Can Blogger really take bKash payments?

Yes, with one extra piece. Blogger only serves static pages, and the bKash
payment API needs your **app secret and password**. Anything in a Blogger post
or theme is public, so those can't live there. This project adds a tiny
**Cloudflare Worker** (free plan) that keeps the credentials and talks to bKash.

| Piece    | Hosted on                  | Holds secrets? |
| -------- | -------------------------- | -------------- |
| Checkout | GitHub Pages (your fork)   | No             |
| Worker   | Cloudflare Workers         | **Yes**        |
| Button   | Your Blogger post or theme | No             |

The customer's number, OTP and PIN are entered on **bKash's own page**. Neither
your blog nor the checkout ever asks for them.

## How a payment flows

1. The customer clicks a button in your post. `blogger.js` opens
   `popup.html?amount=500&invoice=…` in a small window.
2. The popup calls `POST {worker}/create`. The Worker gets a grant token from
   bKash, creates a Tokenized Checkout payment and returns its `bkashURL`.
3. The popup navigates to `bkashURL`, where the customer pays.
4. bKash redirects to `{worker}/callback`. The Worker **executes** the payment
   (or queries its status if execute fails) and redirects back to the popup
   with `status`, `trxID` and `paymentID`.
5. The popup shows a receipt and sends the result to your post, which fires
   `bkash:success` (or `bkash:failure` / `bkash:cancel`).

## Step 1: Fork and publish the checkout

1. Fork <https://github.com/amirulsizan/bkash-blogger-payment>.
2. In your fork: **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
3. After a minute, open
   `https://YOUR-GITHUB-NAME.github.io/bkash-blogger-payment/popup.html?amount=10`.
   You should see the checkout with a **Demo** badge.

Until step 4 is done the checkout runs in **demo mode**: the full flow works,
including events on your blog, but no money moves.

## Step 2: Get bKash credentials

You need a bKash merchant account with **Payment Gateway (Tokenized
Checkout)** access. bKash issues sandbox credentials for testing and live
credentials after approval:

- `username`, `password`
- `app_key`, `app_secret`

Ask through the [bKash developer portal](https://developer.bka.sh/) or your
bKash account manager. Sandbox access comes with test wallet numbers and their
OTP and PIN.

> **Never** put these values in Blogger, in `config.js`, or in any file in your
> fork. They go only into the Worker's secrets.

## Step 3: Deploy the Worker

The Worker is a single file: [`worker/src/index.js`](worker/src/index.js).

### Option A: Cloudflare dashboard

1. **Workers & Pages → Create → Create Worker**, name it `bkash-blogger`,
   **Deploy**.
2. **Edit code**, replace everything with `worker/src/index.js`, **Deploy**.
3. **Settings → Variables and Secrets**, add:

   | Name               | Type   | Value                                                                  |
   | ------------------ | ------ | ---------------------------------------------------------------------- |
   | `BKASH_USERNAME`   | Secret | from bKash                                                             |
   | `BKASH_PASSWORD`   | Secret | from bKash                                                             |
   | `BKASH_APP_KEY`    | Secret | from bKash                                                             |
   | `BKASH_APP_SECRET` | Secret | from bKash                                                             |
   | `POPUP_URL`        | Text   | `https://YOUR-GITHUB-NAME.github.io/bkash-blogger-payment/popup.html` |
   | `BKASH_MODE`       | Text   | `sandbox` (later `live`)                                               |

4. Open the Worker URL. It should say `"configured": true`; otherwise `missing`
   lists what's left.

### Option B: Wrangler CLI

Edit `POPUP_URL` in [`worker/wrangler.toml`](worker/wrangler.toml), then:

```bash
cd worker
npx wrangler login
npx wrangler secret put BKASH_USERNAME
npx wrangler secret put BKASH_PASSWORD
npx wrangler secret put BKASH_APP_KEY
npx wrangler secret put BKASH_APP_SECRET
npx wrangler deploy
```

### Optional Worker settings

| Name              | Purpose                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `PRICES`          | JSON like `{"Premium eBook": 500, "Donation": "any"}`. Only listed products can be paid, at these prices. |
| `ALLOWED_ORIGINS` | Comma-separated sites that may call the Worker from a browser. Defaults to the `POPUP_URL` origin. |
| `MAX_AMOUNT`      | Reject payments above this many taka.                                                       |

## Step 4: Connect the checkout to the Worker

Edit [`config.js`](config.js) in your fork:

```js
window.BKASH_CONFIG = {
  apiBase: 'https://bkash-blogger.YOUR-NAME.workers.dev',
  merchantName: 'Your Shop Name',
};
```

Commit, wait for GitHub Pages to redeploy, and the **Demo** badge disappears.

## Step 5: Add a button to Blogger

### In a post or page

Open the post, click the pencil icon, choose **HTML view**, paste, and publish
from HTML view (switching back to Compose view can reformat custom HTML):

```html
<script src="https://YOUR-GITHUB-NAME.github.io/bkash-blogger-payment/blogger.js"></script>
<button data-bkash-amount="500" data-bkash-product="Premium eBook">Pay with bKash</button>
```

### In a gadget

**Layout → Add a Gadget → HTML/JavaScript**, paste the same snippet.

### Site-wide, in the theme

**Theme → Edit HTML**, just before `</body>`:

```html
<script src='https://YOUR-GITHUB-NAME.github.io/bkash-blogger-payment/blogger.js' defer='defer'></script>
```

Blogger themes are XML: write `defer='defer'` rather than a bare `defer`, and
close the tag with `</script>`. After this, posts only need the `<button>`.

### More button types

```html
<!-- Customer chooses the amount (min 10) -->
<input id="donation-amount" type="number" min="10" value="100">
<button data-bkash-amount-from="donation-amount" data-bkash-product="Donation">Donate</button>

<!-- Keep your own styling and open a thank-you page after paying -->
<a href="#" data-bkash-style="none" data-bkash-amount="1200"
   data-bkash-product="Consultation" data-bkash-success-url="/p/thank-you.html">Book now</a>

<!-- React to the payment -->
<script>
  document.addEventListener('bkash:success', function (event) {
    alert('Thanks! Transaction ID: ' + event.detail.trxID);
  });
</script>
```

The [snippet builder](blogger-examples.html) generates these for you, and the
[reference](docs.html) lists every attribute, event and option.

## Step 6: Test in the sandbox

1. Publish the post and click the button.
2. Press **Pay** in the checkout and use a sandbox wallet with the OTP and PIN
   from bKash.
3. The popup shows the transaction ID and your post shows "Payment successful".
4. Double-check with the Worker:

   ```bash
   curl "https://bkash-blogger.YOUR-NAME.workers.dev/verify?paymentID=TR0011..."
   ```

## Step 7: Go live

- Replace the four secrets with live credentials and set `BKASH_MODE=live`.
- Set `PRICES` so prices can't be tampered with.
- Make a small real payment and find it in your bKash merchant portal.
- bKash may ask for your website and callback domain during approval. The
  callback domain is your Worker's (for example
  `bkash-blogger.YOUR-NAME.workers.dev`); a custom domain also works.

## Security checklist

- [ ] Credentials exist only in the Worker's secrets.
- [ ] `PRICES` is set for fixed-price products.
- [ ] `ALLOWED_ORIGINS` lists only your GitHub Pages site (and your blog if you
      call `verify()` from it).
- [ ] You confirm transaction IDs (merchant portal or `/verify`) before
      delivering anything valuable. Blog events run in the visitor's browser
      and can be faked by a determined visitor.

## Troubleshooting

| Symptom                                   | Fix                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Button does nothing and looks unstyled    | Open the `blogger.js` URL in a new tab; it must load. Paste in **HTML view**.         |
| Checkout still shows **Demo**             | `apiBase` is empty or GitHub Pages hasn't redeployed. Wait and hard-refresh.          |
| "Could not reach the payment server"      | Wrong `apiBase`, Worker not deployed, or GitHub Pages origin missing from `ALLOWED_ORIGINS`. |
| "The payment server is missing: …"        | Add the listed secrets to the Worker.                                                  |
| bKash error such as "Invalid App Key"     | Wrong credentials, or sandbox credentials with `BKASH_MODE=live` (or the reverse).    |
| "The price of … is … BDT"                 | The button's amount doesn't match `PRICES`.                                            |
| Popup blocked                             | Handled: checkout continues in the same tab and returns to the post.                   |
| Paid, but the post didn't update          | The popup was closed early. Check the merchant portal or `/verify`.                    |

## Help

- Issues: <https://github.com/amirulsizan/bkash-blogger-payment/issues>
- bKash developer docs: <https://developer.bka.sh/>
- bKash helpline: 16247
