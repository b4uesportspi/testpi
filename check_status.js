import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const BASE = 'https://b4uesportstest.vercel.app';
const OWNER_PI_UID = 'c8ade70c-7f39-4152-9b43-de252babfa80';
const SECRET = '4d8bc6f0d7bdd59b5546ef8090c4b81af0ad11a5ef9dbe2f9c60346d40dfea6a80c2312bc688cfe2e48b9f81688bf764';

const token = jwt.sign(
  { userId: 'f7957a67-829e-45f4-8c5b-19371661fa13', piUID: OWNER_PI_UID, username: 'rinzindo4ji' },
  SECRET, { algorithm: 'HS256', expiresIn: '1h' }
);

const r = await fetch(`${BASE}/api/payments/a2u/status`, {
  headers: { Authorization: `Bearer ${token}` }
});
const d = await r.json();
console.log('Status:', r.status);
console.log(JSON.stringify(d, null, 2));
