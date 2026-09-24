# bKash for Blogger

Add a **Pay with bKash** button to any Blogger (Blogspot) post. Customers pay on
bKash's own secure page, and your merchant credentials stay on a free serverless
Worker, never in your blog.

- **Docs site:** open `index.html` (or your GitHub Pages URL). It includes a live
  demo, a [setup guide](setup.html), a [snippet builder](blogger-examples.html)
  and a [reference](docs.html).
- **Markdown guide:** [BLOGGER_INTEGRATION.md](BLOGGER_INTEGRATION.md)

```html
<script src="https://YOUR-GITHUB-NAME.github.io/bkash-blogger-payment/blogger.js"></script>
<button data-bkash-amount="500" data-bkash-product="Premium eBook">Pay with bKash</button>
```

## How it works

Blogger can only host static pages, and bKash's API needs secret credentials, so
the work is split three ways:

```
 Blogger post              Checkout popup             bKash                 Worker (Cloudflare)
 ────────────              ──────────────             ─────                 ───────────────────
 blogger.js  ──opens──▶    popup.html  ──POST /create──────────────────────▶ grant token + create
                                       ◀───────────── bkashURL ────────────
                           redirect ─────────────────▶ number, OTP, PIN
                                                       ──▶ /callback ──────▶ execute payment
                           result page ◀──────────────────────── redirect ──
 bkash:success ◀─postMessage─
```

1. `blogger.js` turns any element with `data-bkash-amount` into a button that
   opens the checkout popup.
2. The popup (hosted on your GitHub Pages fork) asks your Worker to create a
   payment and sends the customer to bKash.
3. The customer enters their number, OTP and PIN **on bKash's page**.
4. bKash calls the Worker back. The Worker executes the payment and returns the
   customer to the popup, which tells your post the result.

No credentials are needed to try it: with no Worker configured, the checkout
runs in **demo mode**, so the whole flow works and no money moves.

## Quick start

1. **Fork** this repo and enable **GitHub Pages** (Settings → Pages → Deploy
   from branch `main`, folder `/`).
2. **Get bKash Tokenized Checkout credentials** (sandbox first): username,
   password, app key and app secret.
3. **Deploy the Worker** in [`worker/`](worker/) on Cloudflare (dashboard
   copy-paste or `npx wrangler deploy`) and add the four credentials as secrets,
   plus `POPUP_URL`.
4. **Point the checkout at it:** set `apiBase` and `merchantName` in
   [`config.js`](config.js).
5. **Paste the snippet** into a post's HTML view, a gadget or your theme.

The [setup guide](setup.html) walks through every screen.

## Project structure

```
bkash-blogger-payment/
├── blogger.js              Script for your blog: buttons, popup, events
├── popup.html/.css/.js     Checkout popup: review → bKash → result
├── config.js               Your Worker URL and shop name (edit in your fork)
├── bkash-payment.js        Browser client for the Worker, used by the popup
├── worker/
│   ├── src/index.js        Cloudflare Worker: bKash Tokenized Checkout API
│   └── wrangler.toml       Worker settings
├── index.html              Docs site: home and live demo
├── setup.html              Docs site: setup guide
├── blogger-examples.html   Docs site: snippet builder and examples
├── docs.html               Docs site: reference
├── styles.css, site.js, examples.js   Docs site styling and behaviour
├── Images/                 bKash logo (SVG source and small PNGs)
├── tests/                  Node tests for the client and the Worker
└── BLOGGER_INTEGRATION.md  The full guide in Markdown
```

## Security

- The checkout never collects PINs or OTPs; bKash's page does.
- bKash credentials live only in the Worker's secrets. Nothing in this repo or
  on Blogger is secret, so **never put credentials in `config.js` or a post.**
- The popup only redirects to `https://` bKash domains and only reports results
  to the blog that opened it.
- Set `PRICES` on the Worker so nobody can pay less by editing your page.
- Events on your blog run in the visitor's browser. Confirm the transaction ID
  in your merchant portal or with the Worker's `/verify` endpoint before
  delivering anything valuable.

## Development

```bash
npm test        # client and Worker tests (Node 18+, no dependencies)
npm run dev     # serve the docs site and popup on http://localhost:3000
cd worker && npx wrangler dev   # run the Worker locally
```

## Contributing

Issues and pull requests are welcome. Please run `npm test` before submitting.

## License

MIT. See [LICENSE](LICENSE). This is an independent project and is not
affiliated with bKash Limited.
