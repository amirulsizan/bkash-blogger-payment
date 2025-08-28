import Head from 'next/head';

export default function Popup() {
  return (
    <>
      <Head>
        <title>bKash Payment Popup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="bkash-popup">
        <div className="popup-header">
          <span className="logo">bKash</span>
          <span className="title">Payment</span>
        </div>
        <div className="popup-details">
          <p><strong>Merchant :</strong> BDSHOP.COM</p>
          <p><strong>Invoice no :</strong> 21279615</p>
          <p><strong>Amount :</strong> BDT 5</p>
        </div>
        <div className="popup-form">
          <label htmlFor="bkash-number">Your bKash account number</label>
          <input id="bkash-number" type="text" placeholder="e.g 01XXXXXXXXX" />
          <div className="terms">
            <input type="checkbox" id="agree" />
            <label htmlFor="agree">I agree to the <a href="#">terms and conditions</a></label>
          </div>
        </div>
        <div className="popup-actions">
          <button className="proceed">PROCEED</button>
          <button className="close">CLOSE</button>
        </div>
        <div className="popup-footer">
          16247
        </div>
      </div>
    </>
  );
}
