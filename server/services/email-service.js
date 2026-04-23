const config = require('../config');
const { logger } = require('../utils/logger');

// ---------------------------------------------------------------------------
// Transport — pluggable. Set EMAIL_PROVIDER=smtp or EMAIL_PROVIDER=resend.
// Falls back to console logging in development so the app boots without config.
// ---------------------------------------------------------------------------

const emailProvider = (process.env.EMAIL_PROVIDER || 'log').toLowerCase();
const fromAddress   = process.env.EMAIL_FROM || 'noreply@realcommerce.com';
const fromName      = process.env.EMAIL_FROM_NAME || 'RealCommerce';

const sendViaSMTP = async ({ to, subject, html }) => {
  // Lazy-require nodemailer so the server still boots if it is not installed.
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    throw new Error('nodemailer is not installed. Run: npm install nodemailer --prefix server');
  }

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({ from: `"${fromName}" <${fromAddress}>`, to, subject, html });
};

const sendViaResend = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${fromName} <${fromAddress}>`, to: [to], subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
};

const sendEmail = async ({ to, subject, html }) => {
  if (!to || !subject || !html) return;

  try {
    if (emailProvider === 'smtp') {
      await sendViaSMTP({ to, subject, html });
    } else if (emailProvider === 'resend') {
      await sendViaResend({ to, subject, html });
    } else {
      // Development fallback — log to console, never throw.
      logger.info('Email (dev log)', { to, subject, preview: html.slice(0, 120) });
      return;
    }
    logger.info('Email sent', { to, subject });
  } catch (error) {
    // Never crash the request because of an email failure.
    logger.error('Email delivery failed', { to, subject, error });
  }
};

// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------
const layout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RealCommerce</title>
  <style>
    body { margin:0; padding:0; background:#eaf0f6; font-family:Arial,sans-serif; color:#0F1111; }
    .wrap { max-width:600px; margin:32px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.1); }
    .hdr  { background:#131921; padding:20px 32px; }
    .hdr a{ color:#FFD814; font-size:20px; font-weight:700; text-decoration:none; }
    .body { padding:32px; }
    .body h1 { font-size:22px; margin:0 0 8px; }
    .body p  { font-size:14px; line-height:1.6; color:#565959; margin:0 0 12px; }
    .btn  { display:inline-block; background:linear-gradient(to bottom,#f7dfa5,#f0c14b); color:#111; border:1px solid #a88734; padding:10px 24px; border-radius:6px; font-size:14px; font-weight:700; text-decoration:none; margin:8px 0; }
    table.items { width:100%; border-collapse:collapse; margin:16px 0; font-size:13px; }
    table.items th { background:#f5f8fb; padding:8px 12px; text-align:left; border-bottom:1px solid #e0e0e0; }
    table.items td { padding:8px 12px; border-bottom:1px solid #f0f0f0; }
    .total-row td { font-weight:700; font-size:15px; border-top:2px solid #e0e0e0; }
    .ftr  { background:#232f3e; color:rgba(255,255,255,.6); font-size:12px; padding:16px 32px; text-align:center; }
    .ftr a{ color:rgba(255,255,255,.7); }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr"><a href="#">RealCommerce</a></div>
    <div class="body">${content}</div>
    <div class="ftr">© ${new Date().getFullYear()} RealCommerce, Inc. &nbsp;|&nbsp; <a href="#">Privacy</a> &nbsp;|&nbsp; <a href="#">Terms</a></div>
  </div>
</body>
</html>`;

const money = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount || 0));

// ---------------------------------------------------------------------------
// Transactional email senders
// ---------------------------------------------------------------------------

const sendWelcomeEmail = ({ to, fullName }) =>
  sendEmail({
    to,
    subject: 'Welcome to RealCommerce',
    html: layout(`
      <h1>Welcome, ${fullName}!</h1>
      <p>Your RealCommerce account is ready. You can now browse the catalog, save items to your wishlist, and check out with multi-currency support.</p>
      <a class="btn" href="${process.env.CLIENT_ORIGIN || '#'}">Start Shopping</a>
      <p style="margin-top:24px;font-size:12px;">If you did not create this account, you can safely ignore this email.</p>
    `),
  });

const sendPasswordResetEmail = ({ to, fullName, resetUrl }) =>
  sendEmail({
    to,
    subject: 'Reset your RealCommerce password',
    html: layout(`
      <h1>Reset your password</h1>
      <p>Hi ${fullName}, we received a request to reset the password for your account.</p>
      <a class="btn" href="${resetUrl}">Reset Password</a>
      <p>This link expires in <strong>1 hour</strong>. If you did not request a reset, you can safely ignore this email — your password will not change.</p>
    `),
  });

const sendOrderConfirmationEmail = ({ to, fullName, order, items = [] }) => {
  const itemRows = items.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${money(item.unit_price, order.currency_code)}</td>
      <td style="text-align:right">${money(item.line_total, order.currency_code)}</td>
    </tr>`).join('');

  return sendEmail({
    to,
    subject: `Order confirmed — ${order.order_number}`,
    html: layout(`
      <h1>Order confirmed ✓</h1>
      <p>Hi ${fullName}, thank you for your order. We have received it and will begin processing shortly.</p>
      <p><strong>Order number:</strong> ${order.order_number}<br/>
         <strong>Tracking number:</strong> ${order.trackingNumber || 'Pending'}</p>
      <table class="items">
        <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr><td colspan="3">Shipping</td><td style="text-align:right">${money(order.shipping_amount, order.currency_code)}</td></tr>
          <tr><td colspan="3">Tax</td><td style="text-align:right">${money(order.tax_amount, order.currency_code)}</td></tr>
          <tr class="total-row"><td colspan="3">Order Total</td><td style="text-align:right">${money(order.total_amount, order.currency_code)}</td></tr>
        </tfoot>
      </table>
      <a class="btn" href="${process.env.CLIENT_ORIGIN || '#'}/#/order/${order.order_number}">View Order</a>
    `),
  });
};

const sendShipmentDispatchedEmail = ({ to, fullName, order, shipment }) =>
  sendEmail({
    to,
    subject: `Your order ${order.order_number} has shipped`,
    html: layout(`
      <h1>Your order is on its way 🚚</h1>
      <p>Hi ${fullName}, great news — your order has been dispatched.</p>
      <p>
        <strong>Order:</strong> ${order.order_number}<br/>
        <strong>Carrier:</strong> ${shipment.carrier || 'Standard carrier'}<br/>
        <strong>Tracking number:</strong> ${shipment.tracking_number}<br/>
        <strong>Estimated delivery:</strong> ${order.delivery_eta || 'See tracking link'}
      </p>
      ${shipment.tracking_url ? `<a class="btn" href="${shipment.tracking_url}">Track Shipment</a>` : ''}
      <a class="btn" href="${process.env.CLIENT_ORIGIN || '#'}/#/order/${order.order_number}" style="margin-left:8px">View Order</a>
    `),
  });

const sendDeliveryConfirmationEmail = ({ to, fullName, order }) =>
  sendEmail({
    to,
    subject: `Order ${order.order_number} delivered`,
    html: layout(`
      <h1>Delivered ✓</h1>
      <p>Hi ${fullName}, your order <strong>${order.order_number}</strong> has been delivered.</p>
      <p>We hope you love your purchase. If anything is not right, our returns window is open for 30 days.</p>
      <a class="btn" href="${process.env.CLIENT_ORIGIN || '#'}/#/order/${order.order_number}">View Order</a>
    `),
  });

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendShipmentDispatchedEmail,
  sendDeliveryConfirmationEmail,
};
