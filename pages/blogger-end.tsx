import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';

export default function BloggerEnd() {
  useEffect(() => {
    (window as any).bkashCreds = { merchantNumber: 'YOUR_MERCHANT_ID' };
    const bkash = (window as any).bkashBlogger;
    bkash && bkash.initButton('bkash-pay', 'priceDetails');
  }, []);

  return (
    <>
      <Head>
        <title>Payment Form</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div id="priceDetails" data-price="150">Price: 150 BDT</div>
      <button id="bkash-pay" className="bkash-pay-button">Pay with bKash</button>
      <Script src="/bkash-payment.js" strategy="afterInteractive" />
      <Script src="/blogger.js" strategy="afterInteractive" />
    </>
  );
}
