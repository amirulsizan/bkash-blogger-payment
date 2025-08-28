import Head from 'next/head';

export default function Setup() {
  return (
    <>
      <Head>
        <title>Blogger Setup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <nav className="nav">
        <div className="nav-logo">bKash Blogger</div>
        <ul className="nav-links">
          <li><a href="/docs">Docs</a></li>
          <li><a href="/setup">Setup</a></li>
          <li><a href="/">Home</a></li>
        </ul>
      </nav>
      <main className="content">
        <h1>Setup on Blogger</h1>
        <ol>
          <li>Host <code>bkash-payment.js</code> and <code>blogger.js</code> or use the versions in this repository.</li>
          <li>Open Blogger's theme editor and insert the following snippet where the button should appear:</li>
        </ol>
        <pre><code>{`<input id="amount" type="number" placeholder="Amount"/>
<button id="payBtn">Pay with bKash</button>
<script src="/path/to/bkash-payment.js"></script>
<script src="/path/to/blogger.js"></script>
<script>bkashBlogger.initButton('payBtn','amount');</script>`}</code></pre>
        <p>Replace the script paths with your own and update credentials inside <code>bkash-payment.js</code>.</p>
      </main>
      <footer className="footer">
        <p>© 2024 bKash Blogger Payment</p>
      </footer>
    </>
  );
}
