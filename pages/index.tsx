import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    (window as any).bkashCreds = { merchantNumber: 'YOUR_MERCHANT_ID' };
    const bkash = (window as any).bkashBlogger;
    bkash && bkash.initButton('bkash-pay', 'priceDetails');
  }, []);

  const year = new Date().getFullYear();

  return (
    <>
      <Head>
        <title>bKash Blogger Payments</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <nav className="nav">
        <div className="nav-logo">bKash Blogger</div>
        <ul className="nav-links">
          <li><a href="/docs">Docs</a></li>
          <li><a href="/setup">Setup</a></li>
        </ul>
      </nav>

      <header className="hero">
        <h1>Integrate bKash into Blogger</h1>
        <p>Add a payment button to your Blogspot site without a backend.</p>
        <a className="btn-primary" href="/setup">View Setup Guide</a>
      </header>

      <main>
        <section className="features">
          <div className="feature-card">
            <h3>Drop-In Script</h3>
            <p>Include a single JS file to enable payments.</p>
          </div>
          <div className="feature-card">
            <h3>No Backend</h3>
            <p>Works entirely on the client for Blogger pages.</p>
          </div>
          <div className="feature-card">
            <h3>Secure Redirect</h3>
            <p>Users complete payment on bKash’s hosted flow.</p>
          </div>
        </section>

        <section className="demo">
          <h2>Payment Demo</h2>
          <div className="product-card">
            <h3>Demo Product</h3>
            <p id="priceDetails" data-price="990">Price: 990 BDT</p>
            <button id="bkash-pay" className="bkash-pay-button">Pay with bKash</button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>© {year} bKash Blogger Payment | Brainchild of <a href="https://sizan.me" target="_blank" rel="noopener noreferrer">Amirul Sizan</a></p>
      </footer>

      <Script src="/bkash-payment.js" strategy="afterInteractive" />
      <Script src="/blogger.js" strategy="afterInteractive" />
    </>
  );
}
