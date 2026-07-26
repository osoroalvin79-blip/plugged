// Safaricom Daraja API helper - handles M-Pesa STK Push (the "enter your PIN" prompt).
//
// This only activates once you've filled in the MPESA_* variables in .env.
// Until then, isConfigured() returns false and orders.js falls back to a plain
// "pay on delivery / pay the admin directly" flow, so the site works fully
// without M-Pesa set up.
//
// To get real credentials: create an app at https://developer.safaricom.co.ke
// Start on the Sandbox (fake money, for testing) before moving to Production.

const axios = require('axios');

const ENV = process.env.MPESA_ENV || 'sandbox';
const BASE_URL = ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

function isConfigured() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY &&
    process.env.MPESA_CALLBACK_URL
  );
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// Accepts 07XXXXXXXX, 7XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX and normalizes to 2547XXXXXXXX
function normalizePhone(phone) {
  let p = String(phone).replace(/\D/g, '');
  if (p.startsWith('254')) return p;
  if (p.startsWith('0')) return '254' + p.slice(1);
  if (p.startsWith('7') || p.startsWith('1')) return '254' + p;
  return p;
}

async function getAccessToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

// Triggers the STK push - the buyer's phone pops up asking for their M-Pesa PIN.
// Returns { MerchantRequestID, CheckoutRequestID, ResponseCode, ... } from Safaricom.
async function stkPush({ phone, amount, accountReference, transactionDesc }) {
  const token = await getAccessToken();
  const ts = timestamp();
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`
  ).toString('base64');

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: ts,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: normalizePhone(phone),
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: normalizePhone(phone),
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: String(accountReference).slice(0, 12),
    TransactionDesc: String(transactionDesc).slice(0, 13)
  };

  const res = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

module.exports = { isConfigured, stkPush, normalizePhone };
