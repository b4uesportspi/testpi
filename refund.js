import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const BASE = 'https://b4uesportstest.vercel.app';
const OWNER_PI_UID = 'c8ade70c-7f39-4152-9b43-de252babfa80';
const SESSION_SECRET = '4d8bc6f0d7bdd59b5546ef8090c4b81af0ad11a5ef9dbe2f9c60346d40dfea6a80c2312bc688cfe2e48b9f81688bf764';

const token = jwt.sign(
  { userId: 'f7957a67-829e-45f4-8c5b-19371661fa13', piUID: OWNER_PI_UID, username: 'rinzindo4ji' },
  SESSION_SECRET,
  { algorithm: 'HS256', expiresIn: '1h' }
);

console.log('Sending 1 Pi refund to rinzindo4ji...');
const res = await fetch(`${BASE}/api/payments/a2u/refund`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ piUID: OWNER_PI_UID, amount: 1, reason: 'B4U Esports — 1 Pi refund to rinzindo4ji' })
});
const data = await res.json();
console.log('Status:', res.status);
console.log('Result:', JSON.stringify(data, null, 2));
