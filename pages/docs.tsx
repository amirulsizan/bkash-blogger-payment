import Head from 'next/head';

export default function Docs() {
  return (
    <>
      <Head>
        <title>bKash Blogger Docs</title>
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
        <h1>Documentation</h1>
        <p>The <code>bkashBlogger</code> helper exposes a single function to wire up payments on Blogger pages.</p>
        <pre><code>{`<script src="bkash-payment.js"></script>
<script src="blogger.js"></script>
<script>
  bkashBlogger.initButton('payBtn', 'amount');
</script>`}</code></pre>
        <p>Replace the placeholder credentials inside <code>bkash-payment.js</code> with your own bKash keys before going live.</p>
      </main>
      <footer className="footer">
        <p>© 2024 bKash Blogger Payment</p>
      </footer>
    </>
  );
}
