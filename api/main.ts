import * as dotenv from 'dotenv';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as pkg from 'pg';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { sendProfileUpdateEmail, sendPurchaseConfirmationEmail, sendAdminPurchaseNotification } from './email.js';
import {
  applyCouponRedemptionForTransaction,
  MarketingCouponError,
  trackMarketingClick,
  trackMarketingOpen,
  validateCouponForUser,
} from '../server/services/marketing-automation.js';
import { assertDatabaseUrlSupported, createPostgresPoolConfig, describePoolConfig } from '../server/db-config.js';
import { db as drizzleDb, pool } from '../server/db.js';
import { evaluateWalletBinding } from '../server/wallet-binding.js';
const { Pool } = pkg;
type PoolClient = pkg.PoolClient;
const globalDb = globalThis as any;
const isVercel = Boolean(process.env.VERCEL);

dotenv.config(); // Load environment variables from .env

const OWNER_PI_UID = (process.env.OWNER_PI_UID || 'c8ade70c-7f39-4152-9b43-de252babfa80').trim();

function isOwnerPiUID(piUID: unknown): boolean {
  return String(piUID || '').trim() === OWNER_PI_UID;
}

const ADMIN_WALLET_ADDRESS = 'GBGHA73VUPUEJBH76RDMJVWGJNZNRVGJLFLFUV2OO6DPIRFO5DS2NOER';

function isAdminWalletAddress(address: unknown): boolean {
  return String(address || '').trim() === ADMIN_WALLET_ADDRESS;
}

function isValidStellarAddress(address: unknown): address is string {
  return typeof address === 'string' && /^G[A-Z2-7]{55}$/.test(address.trim());
}

function getBearerToken(req: VercelRequest): string {
  const authToken = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!authToken || authToken.split('.').length !== 3) {
    throw new Error('Unauthorized');
  }
  return authToken;
}

function getAuthenticatedUserId(req: VercelRequest): string {
  const authToken = getBearerToken(req);
  const decoded = jwt.verify(authToken, JWT_SECRET, { algorithms: ['HS256'] }) as any;
  if (!decoded || !decoded.userId) {
    const err = new Error('Invalid token payload');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return String(decoded.userId);
}

async function extractWalletAddressFromStellarTx(txid: string, retries = 2): Promise<string | null> {
  if (!txid || typeof txid !== 'string' || txid.length < 10) {
    return null;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`https://api.mainnet.minepi.com/transactions/${encodeURIComponent(txid)}`, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        console.warn('extractWalletAddressFromStellarTx: Stellar tx lookup failed', { txid, status: response.status });
        return null;
      }

      const data = await response.json() as any;
      const candidates: string[] = [];

      if (isValidStellarAddress(data.source_account)) {
        candidates.push(data.source_account.trim());
      }

      if (Array.isArray(data._embedded?.records)) {
        for (const op of data._embedded.records) {
          if (!op || op.type !== 'payment') continue;
          if (isValidStellarAddress(op.source_account)) {
            candidates.push(op.source_account.trim());
          } else if (isValidStellarAddress(op.from)) {
            candidates.push(op.from.trim());
          }
        }
      }

      for (const candidate of candidates) {
        if (!isAdminWalletAddress(candidate)) {
          return candidate;
        }
      }

      return null;
    } catch (error: any) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      console.error('extractWalletAddressFromStellarTx error:', error?.message || error);
      return null;
    }
  }
  return null;
}

async function extractWalletAddressFromPiPaymentDetails(paymentId: string): Promise<string | null> {
  if (!paymentId || typeof paymentId !== 'string') {
    return null;
  }

  try {
    const response = await axios.get(`${PI_API_BASE}/v2/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Key ${PI_SERVER_API_KEY}` }
    });

    if (response.status !== 200 || !response.data || typeof response.data !== 'object') {
      console.warn('extractWalletAddressFromPiPaymentDetails: Invalid payment response', { paymentId, status: response.status });
      return null;
    }

    const details = response.data as any;
    const candidates: string[] = [];

    if (details.direction === 'user_to_app') {
      if (isValidStellarAddress(details.from_address)) candidates.push(details.from_address.trim());
      if (isValidStellarAddress(details.to_address)) candidates.push(details.to_address.trim());
    } else if (details.direction === 'app_to_user') {
      if (isValidStellarAddress(details.to_address)) candidates.push(details.to_address.trim());
      if (isValidStellarAddress(details.from_address)) candidates.push(details.from_address.trim());
    } else {
      if (isValidStellarAddress(details.from_address)) candidates.push(details.from_address.trim());
      if (isValidStellarAddress(details.to_address)) candidates.push(details.to_address.trim());
    }

    for (const candidate of candidates) {
      if (!isAdminWalletAddress(candidate)) {
        return candidate;
      }
    }

    return null;
  } catch (error: any) {
    console.error('extractWalletAddressFromPiPaymentDetails error:', error?.message || error);
    return null;
  }
}

if (process.env.VERCEL) {
  console.log('🔒 Running on Vercel - environment variables should be set in Vercel dashboard');
  console.log('🔒 OWNER_PI_UID from env:', process.env.OWNER_PI_UID);
}

declare global {
  // eslint-disable-next-line no-var
  var __b4uApiPool: pkg.Pool | undefined;
}

// Debug: Log which environment is being used
const dbUrl = process.env.DATABASE_URL || 'NOT SET';
const dbHost = dbUrl.includes('@') ? dbUrl.split('@')[1].split(':')[0] : 'unknown';
const isSandbox = dbUrl.includes('ukjbpaopceazkibmqztn');
const isProduction = !isSandbox && dbUrl !== 'NOT SET';

console.log('🚀 API Initializing - Database Environment Check:');
console.log('  DATABASE_URL Status:', dbUrl === 'NOT SET' ? '❌ NOT SET' : '✅ SET');
console.log('  Database Host:', dbHost);
console.log('  Environment Detected:', isSandbox ? '🔵 SANDBOX' : isProduction ? '🟢 PRODUCTION' : '⚠️ UNKNOWN');
console.log('  Node Environment:', process.env.NODE_ENV || 'not set');

if (isSandbox) {
  console.warn('⚠️  WARNING: Using SANDBOX database! For production, ensure DATABASE_URL is set in Vercel environment variables.');
}

// Use the singleton database connection from server/db.js
console.log('API database pool ready - using singleton connection from server/db.js');

function redactHeaders(headers: VercelRequest['headers']) {
  const redacted: Record<string, unknown> = { ...headers };
  for (const key of Object.keys(redacted)) {
    const normalized = key.toLowerCase();
    if (
      normalized === 'authorization' ||
      normalized.includes('token') ||
      normalized.includes('signature') ||
      normalized.includes('cookie')
    ) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}

function getPublicBodyLog(body: unknown) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  return '[REDACTED_OBJECT]';
}

function isDatabaseConnectivityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout exceeded|ECONN|ENOTFOUND|ETIMEDOUT|database.*connect|Unsupported DATABASE_URL/i.test(message);
}

const PI_API_BASE = 'https://api.minepi.com';
const PI_SERVER_API_KEY = process.env.PI_SERVER_API_KEY || process.env.PI_API_KEY || 'your_pi_server_api_key_here';
const PI_SANDBOX_MODE = String(process.env.PI_SANDBOX_MODE || 'false').toLowerCase() === 'true';

/**
 * Send native In-App Notification via Pi Network Platform API v2
 * POST /v2/in_app_notifications/notify
 */
async function sendPiInAppNotification(notification: {
  title: string;
  body: string;
  user_uid: string;
  subroute?: string;
}): Promise<boolean> {
  if (!PI_SERVER_API_KEY || PI_SERVER_API_KEY === 'your_pi_server_api_key_here') {
    return false;
  }
  try {
    const formattedSubroute = notification.subroute
      ? (notification.subroute.startsWith('/') ? notification.subroute : `/${notification.subroute}`)
      : '/dashboard';

    const response = await axios.post(
      `${PI_API_BASE}/v2/in_app_notifications/notify`,
      {
        notifications: [
          {
            title: notification.title,
            body: notification.body,
            user_uid: notification.user_uid,
            subroute: formattedSubroute,
          },
        ],
      },
      {
        headers: {
          Authorization: `Key ${PI_SERVER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
    return response.status === 200 || response.status === 201;
  } catch (err: any) {
    console.warn('Pi In-App Notification non-blocking error:', err?.response?.data || err?.message || err);
    return false;
  }
}
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GOOGLE_AI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
const CHAT_SOURCE_URLS = ['https://b4uesportstest.vercel.app', 'https://b4uesports.com'];
const CHAT_SOURCE_CACHE_TTL_MS = 5 * 60 * 1000;
const chatSourceCache = new Map<string, { expiresAt: number; value: string }>();

const CHAT_SYSTEM_PROMPT = `You are the official AI assistant for B4U Esports, a platform where users purchase in-game tokens and digital services using Pi Network.

Your job is to help users with buying tokens, making payments with Pi coins, uploading payment screenshots, checking order status, handling delays, and resolving failed transactions.

Always understand the user's intent even if they make spelling mistakes, typos, broken sentences, or use slang. Do not mention spelling errors. Interpret the closest correct meaning and respond accordingly.

If the message is unclear, assume it is related to payments, tokens, or orders and provide the most helpful answer.

Keep answers clear, short, and helpful. Be professional but friendly.

Always ground factual answers in the official B4U website whenever grounding context is provided:
- https://b4uesportstest.vercel.app (primary source)
- https://b4uesports.com (secondary source for additional details only)

Use information from https://b4uesportstest.vercel.app for all answers whenever possible. Only include additional details from https://b4uesports.com when the primary site does not contain the required information.

If the grounding context contains the answer, use it and do not guess.
If the grounding context is missing or unclear, say that you are not fully sure and guide the user to official support instead of inventing facts.

Show empathy when users seem frustrated, worried, or confused.
Use a few relevant emojis naturally, but do not overdo them.

Important payment instructions:
- Users must send Pi coins to complete a purchase
- Users must upload a payment screenshot for verification
- Orders are processed after verification
- Delivery may take a few minutes

If a user says they didn't receive tokens:
- Ask them to wait a few minutes
- Confirm payment was completed
- Suggest contacting support with proof if the issue continues

If a user reports payment failure:
- Explain possible reasons like network delay or incorrect steps
- Guide them on how to retry properly

Never give false information. If unsure, guide the user to contact support.

You act as a reliable and smart support agent for B4U Esports.

Contact Information:
- Email: info@b4uesports.com
- WhatsApp: Available through website footer
- Support hours: 24/7 for transaction issues`;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHtmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function getKeywordStems(message: string): string[] {
  return Array.from(
    new Set(
      message
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4)
        .map((token) => token.slice(0, 5))
    )
  );
}

function scoreSnippetRelevance(text: string, message: string): number {
  const lowerText = text.toLowerCase();
  return getKeywordStems(message).reduce((score, stem) => score + (lowerText.includes(stem) ? 1 : 0), 0);
}

async function fetchChatSource(url: string): Promise<string> {
  const cached = chatSourceCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; B4U-Esports-AI/1.0)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const text = await response.text();
  chatSourceCache.set(url, {
    value: text,
    expiresAt: Date.now() + CHAT_SOURCE_CACHE_TTL_MS
  });
  return text;
}

async function getWordPressSearchSnippets(query: string): Promise<string[]> {
  try {
    const searchUrl = `https://b4uesports.com/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=3`;
    const payload = await fetchChatSource(searchUrl);
    const results = JSON.parse(payload);

    if (!Array.isArray(results)) {
      return [];
    }

    const snippets = await Promise.all(
      results
        .filter((item) => item?.url && item?.title)
        .slice(0, 2)
        .map(async (item) => {
          try {
            const pageHtml = await fetchChatSource(String(item.url));
            const pageText = stripHtmlToText(pageHtml);
            return `Source: ${item.url}\nTitle: ${item.title}\nSnippet: ${truncateText(pageText, 800)}`;
          } catch (error) {
            console.error('Chat grounding: failed to fetch WordPress result page:', item?.url, error);
            return `Source: ${item.url}\nTitle: ${item.title}`;
          }
        })
    );

    return snippets.filter(Boolean);
  } catch (error) {
    console.error('Chat grounding: WordPress search failed:', error);
    return [];
  }
}

async function getStaticSiteSnippets(message: string): Promise<string[]> {
  const staticUrls = [
    'https://b4uesportstest.vercel.app',
    'https://b4uesports.com',
    'https://b4uesports.com/faqs/',
    'https://b4uesports.com/bhutanese-esports/'
  ];

  const snippets = await Promise.all(
    staticUrls.map(async (url) => {
      try {
        const html = await fetchChatSource(url);
        const pageText = stripHtmlToText(html);
        return {
          url,
          score: scoreSnippetRelevance(pageText, message),
          snippet: `Source: ${url}\nSnippet: ${truncateText(pageText, 1100)}`
        };
      } catch (error) {
        console.error('Chat grounding: failed to fetch static source:', url, error);
        return null;
      }
    })
  );

  return snippets
    .filter((item): item is { url: string; score: number; snippet: string } => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.snippet);
}

async function getChatWebsiteContext(message: string): Promise<string> {
  const [searchSnippets, staticSnippets] = await Promise.all([
    getWordPressSearchSnippets(message),
    getStaticSiteSnippets(message)
  ]);

  const combined = [...searchSnippets, ...staticSnippets].slice(0, 4);

  if (combined.length === 0) {
    return `No website grounding could be fetched from ${CHAT_SOURCE_URLS.join(' and ')}.`;
  }

  return combined.join('\n\n---\n\n');
}

// Helper function to check if Pi Server API Key is properly configured
const isPiServerConfigured = () => PI_SERVER_API_KEY && PI_SERVER_API_KEY !== 'your_pi_server_api_key_here' && PI_SERVER_API_KEY !== 'your_pi_api_key_here';

function getChatFallbackResponse(): string {
  return `🤖 I'm currently experiencing high traffic. Please try again in a moment.

For immediate assistance:
📧 Email: info@b4uesports.com
💬 WhatsApp: Use the link in our website footer

How can I help you today?`;
}

function extractChatIntent(response: string): string {
  const lower = response.toLowerCase();

  if (lower.includes('payment') || lower.includes('pay')) return 'payment';
  if (lower.includes('purchase') || lower.includes('buy')) return 'purchase';
  if (lower.includes('order') || lower.includes('delivery')) return 'order_status';
  if (lower.includes('refund') || lower.includes('failed')) return 'issue';
  if (lower.includes('support') || lower.includes('contact')) return 'support';
  if (lower.includes('token') || lower.includes('pi')) return 'token_info';
  if (lower.includes('game') || lower.includes('pubg') || lower.includes('mlbb')) return 'game_info';

  return 'general';
}

function normalizeProfileEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeProfilePhone(phone: unknown): string {
  return typeof phone === 'string' ? phone.replace(/\s+/g, '').trim() : '';
}

async function validateUniqueProfileContact(userId: string, email: unknown, phone: unknown) {
  const normalizedEmail = normalizeProfileEmail(email);
  const normalizedPhone = normalizeProfilePhone(phone);

  if (!normalizedEmail && !normalizedPhone) {
    return;
  }

  const conditions: string[] = [];
  const params: any[] = [userId];
  let paramIndex = 2;

  if (normalizedEmail) {
    conditions.push(`LOWER(TRIM(email)) = $${paramIndex}`);
    params.push(normalizedEmail);
    paramIndex++;
  }

  if (normalizedPhone) {
    conditions.push(`REGEXP_REPLACE(TRIM(phone), '\\s+', '', 'g') = $${paramIndex}`);
    params.push(normalizedPhone);
    paramIndex++;
  }

  const conflictQuery = `
    SELECT id, username, email, phone
    FROM app_users
    WHERE id <> $1
      AND (${conditions.join(' OR ')})
    LIMIT 1
  `;

  const conflict = await pool.query(conflictQuery, params);
  if (conflict.rows.length === 0) {
    return;
  }

  const existing = conflict.rows[0];
  if (normalizedEmail && normalizeProfileEmail(existing.email) === normalizedEmail) {
    return {
      status: 409,
      code: 'EMAIL_ALREADY_IN_USE',
      message: 'This email address is already used by another user.',
    };
  }

  if (normalizedPhone && normalizeProfilePhone(existing.phone) === normalizedPhone) {
    return {
      status: 409,
      code: 'PHONE_ALREADY_IN_USE',
      message: 'This phone number is already used by another user.',
    };
  }

  return {
    status: 409,
    code: 'PROFILE_CONTACT_ALREADY_IN_USE',
    message: 'This email or phone number is already used by another user.',
  };
}

function buildRuleBasedChatResponse(message: string): { response: string; intent: string } {
  const normalized = message.toLowerCase().trim();

  if (
    normalized.includes('not receive') ||
    normalized.includes("didn't receive") ||
    normalized.includes('didnt receive') ||
    normalized.includes('not delivered') ||
    normalized.includes('no token') ||
    normalized.includes('tokens not') ||
    normalized.includes('order not')
  ) {
    return {
      intent: 'order_status',
      response:
        `Please wait a few minutes and confirm that your payment was completed.\n\n` +
        `If you already paid, make sure you uploaded the payment screenshot so the order can be verified.\n\n` +
        `If the tokens still have not arrived, contact support with your payment proof and order details:\n` +
        `Email: info@b4uesports.com\n` +
        `WhatsApp: Use the link in our website footer`
    };
  }

  if (
    normalized.includes('failed') ||
    normalized.includes('failure') ||
    normalized.includes('pending') ||
    normalized.includes('cancel') ||
    normalized.includes('decline') ||
    normalized.includes('abandon')
  ) {
    return {
      intent: 'issue',
      response:
        `If your payment failed or is still pending, please do this:\n\n` +
        `1. Check whether the Pi payment was actually sent.\n` +
        `2. Upload your payment screenshot if the transfer was completed.\n` +
        `3. Wait a few minutes for verification.\n` +
        `4. If the issue continues, contact support with your transaction proof.\n\n` +
        `Email: info@b4uesports.com\n` +
        `WhatsApp: Use the link in our website footer`
    };
  }

  if (
    normalized.includes('buy') ||
    normalized.includes('purchase') ||
    normalized.includes('how to order') ||
    normalized.includes('how do i order') ||
    normalized.includes('how to buy')
  ) {
    return {
      intent: 'purchase',
      response:
        `To place an order on B4U Esports:\n\n` +
        `1. Select your game or service.\n` +
        `2. Choose the package you want.\n` +
        `3. Complete the Pi payment.\n` +
        `4. Upload your payment screenshot.\n` +
        `5. Wait a few minutes while the order is verified and processed.\n\n` +
        `Tell me the game or package you want if you need step-by-step help.`
    };
  }

  if (
    normalized.includes('pi') ||
    normalized.includes('pay') ||
    normalized.includes('payment') ||
    normalized.includes('screenshot')
  ) {
    return {
      intent: 'payment',
      response:
        `To complete payment, send the required Pi amount and then upload your payment screenshot for verification.\n\n` +
        `Orders are processed after the payment proof is reviewed. If you already paid and the order has not updated yet, please wait a few minutes or contact support with the screenshot.\n\n` +
        `Email: info@b4uesports.com`
    };
  }

  if (
    normalized.includes('support') ||
    normalized.includes('contact') ||
    normalized.includes('whatsapp') ||
    normalized.includes('email')
  ) {
    return {
      intent: 'support',
      response:
        `You can contact B4U Esports support here:\n\n` +
        `Email: info@b4uesports.com\n` +
        `WhatsApp: Use the link in our website footer\n\n` +
        `Support is available for payment, order, and delivery issues.`
    };
  }

  if (
    normalized.includes('pubg') ||
    normalized.includes('mlbb') ||
    normalized.includes('mobile legends') ||
    normalized.includes('free fire') ||
    normalized.includes('roblox') ||
    normalized.includes('tiktok') ||
    normalized.includes('youtube') ||
    normalized.includes('instagram') ||
    normalized.includes('netflix') ||
    normalized.includes('canva')
  ) {
    return {
      intent: 'game_info',
      response:
        `We support games and digital services including PUBG Mobile, PUBG KR, Mobile Legends, Clash of Clans, Free Fire, Roblox, NEW STATE, TikTok, YouTube, Facebook, Instagram, Netflix, and Canva.\n\n` +
        `Tell me which game or service you want, and I will guide you through the order steps.`
    };
  }

  return {
    intent: 'general',
    response:
      `I can help with purchases, Pi payments, screenshots, pending orders, failed transactions, and delivery issues.\n\n` +
      `You can ask things like:\n` +
      `- how to buy PUBG UC\n` +
      `- payment failed\n` +
      `- order still pending\n` +
      `- did not receive tokens\n\n` +
      `If you need direct support, email info@b4uesports.com.`
  };
}

function getRuleBasedFallback(messages: Array<{ role: 'user' | 'assistant'; content: string }>): { response: string; intent: string } {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  return buildRuleBasedChatResponse(lastUserMessage);
}

function getDirectWebsiteAnswer(message: string, websiteContext: string): { response: string; intent: string } | null {
  const normalized = message.toLowerCase();

  if (normalized.includes('founder') || normalized.includes('who founded')) {
    const founderMatch = websiteContext.match(/Founded by\s+([A-Z][A-Za-z\s]+?)(?:,|\.)/i);
    if (founderMatch?.[1]) {
      return {
        response: `👑 According to the official B4U website, B4U Esports was founded by ${founderMatch[1].trim()}.`,
        intent: 'general'
      };
    }
  }

  if (normalized.includes('email') || normalized.includes('contact')) {
    const emailMatch = websiteContext.match(/[A-Z0-9._%+-]+@b4uesports\.com/i);
    if (emailMatch?.[0]) {
      return {
        response: `📧 You can contact B4U Esports at ${emailMatch[0]}.`,
        intent: 'support'
      };
    }
  }

  return null;
}

async function getChatAIResponse(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
  if (!GOOGLE_AI_API_KEY) {
    console.error('Chat AI: GOOGLE_AI_API_KEY is not configured');
    return getRuleBasedFallback(messages);
  }

  try {
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    const websiteContext = await getChatWebsiteContext(latestUserMessage);
    const directWebsiteAnswer = getDirectWebsiteAnswer(latestUserMessage, websiteContext);

    if (directWebsiteAnswer) {
      return directWebsiteAnswer;
    }

    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(GOOGLE_AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GOOGLE_AI_API_KEY
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{
            text:
              `${CHAT_SYSTEM_PROMPT}\n\n` +
              `Official website grounding for this conversation:\n${websiteContext}\n\n` +
              `Use the website grounding above for factual answers. If the answer is not supported there, say so honestly and direct the user to official support.`
          }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Chat AI API error:', response.status, errorData);
      return getRuleBasedFallback(messages);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!text) {
      console.error('Chat AI returned empty response:', data);
      return getRuleBasedFallback(messages);
    }

    return {
      response: text,
      intent: extractChatIntent(text)
    };
  } catch (error) {
    console.error('Chat AI request failed:', error);
    return getRuleBasedFallback(messages);
  }
}

async function resolveChatUserId(rawUserId: unknown): Promise<string | null> {
  if (!rawUserId || typeof rawUserId !== 'string') {
    return null;
  }

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id FROM app_users WHERE id = $1 LIMIT 1', [rawUserId]);
    return result.rows.length > 0 ? rawUserId : null;
  } catch (error) {
    console.error('Chat route: failed to validate user ID, falling back to guest mode:', error);
    return null;
  } finally {
    client.release();
  }
}

// Chat persistence and API handlers removed to eliminate tournament chat and AI chat features.
// These functions are stubbed to keep the server file holistic but prevent any chat-related DB access or AI calls.
async function saveChatMessageRecord(_: any) { return null; }
async function getChatMessagesBySessionRecord(_: string, __: number = 20) { return []; }
async function getChatMessagesByUserRecord(_: string, __: number = 100) { return []; }
async function handleChatMessage(req: any, res: any) {
  return res.status(410).json({ error: 'Chat feature removed' });
}
async function handleChatSession(req: any, res: any) {
  return res.status(410).json({ error: 'Chat feature removed' });
}
async function handleChatUser(req: any, res: any) {
  return res.status(410).json({ error: 'Chat feature removed' });
}

async function handleMarketingCouponValidate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as any;
    const userId = decoded.userId;
    const { code, packageId } = req.body || {};

    if (!code || !packageId) {
      return res.status(400).json({
        success: false,
        message: "Coupon code and package are required",
        code: "COUPON_REQUEST_INVALID",
      });
    }

    const coupon = await validateCouponForUser(userId, String(code), String(packageId));
    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        bonusTokens: coupon.bonusTokens,
        discountedPiAmount: coupon.discountedPiAmount,
        originalPiAmount: coupon.originalPiAmount,
        expiresAt: coupon.expiresAt,
      },
    });
  } catch (error: any) {
    if (error instanceof MarketingCouponError) {
      console.warn("Marketing coupon validation rejected:", { code: error.code });
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    console.error("Marketing coupon validation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to validate coupon right now",
      code: "COUPON_VALIDATION_FAILED",
    });
  }
}

function getClientIpAddress(req: VercelRequest): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim();
  }
  return req.socket?.remoteAddress;
}

function getSafeRedirectUrl(rawRedirect: string | undefined): string {
  if (!rawRedirect) {
    return `${process.env.APP_URL || process.env.VERCEL_APP_URL || "https://b4uesportstest.vercel.app"}/`;
  }

  try {
    const parsed = new URL(rawRedirect);
    const allowedOrigin = new URL(process.env.APP_URL || process.env.VERCEL_APP_URL || "https://b4uesportstest.vercel.app").origin;
    if (parsed.origin === allowedOrigin) {
      return parsed.toString();
    }
  } catch (error) {
    console.error("Invalid redirect URL for marketing click tracking:", rawRedirect, error);
  }

  return `${process.env.APP_URL || process.env.VERCEL_APP_URL || "https://b4uesportstest.vercel.app"}/`;
}

async function handleMarketingOpen(req: VercelRequest, res: VercelResponse) {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (token) {
      await trackMarketingOpen(token, String(req.headers["user-agent"] || ""), getClientIpAddress(req));
    }
  } catch (error) {
    console.error("Marketing open tracking failed:", error);
  }

  const pixel = Buffer.from("R0lGODlhAQABAPAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return res.status(200).send(pixel);
}

function setNoStoreHeaders(res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
}

function setShortCacheHeaders(res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
}

async function handleMarketingClick(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const redirect = getSafeRedirectUrl(typeof req.query.redirect === "string" ? req.query.redirect : undefined);

  try {
    if (token) {
      await trackMarketingClick(token, redirect, String(req.headers["user-agent"] || ""), getClientIpAddress(req));
    }
  } catch (error) {
    console.error("Marketing click tracking failed:", error);
  }

  return res.redirect(302, redirect);
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret';

// EmailJS configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'your-service-id';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'your-template-id';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'your-public-key';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || undefined;

// Handle connection errors gracefully
pool.on('error', (err: Error) => {
  console.error('API Database pool error:', err.message);
  // Don't throw error here to prevent app crash
});

// Avoid spending a serverless database slot on startup health checks.
if (!isVercel) {
  pool.query('SELECT NOW()', (err: Error, res: any) => {
    if (err) {
      console.error('API Database connection test failed:', err);
      console.warn('API Database connection test failed, but continuing to start app - queries will retry');
    } else {
      console.log('API Database connection test successful:', res.rows[0]);
    }
  });
}

// Handle PiNet metadata requests
async function handlePiNetMeta(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get the pathname from query parameters
    const { pathname } = req.query;
    
    // Log the request for debugging
    console.log('PiNet metadata request received for pathname:', pathname);
    
    // Define the base metadata
    const baseMetadata = {
      title: "B4U Esports - In-game Tokens & Social Media Boosting Marketplace",
      description: "Buy in-game tokens, digital gift cards, and social media boosting services with Pi Network. Fast, secure payments for gamers, streamers, and creators.",
      authors: [
        {
          name: "B4U Esports Team",
          url: ""
        }
      ],
      keywords: [
        "Pi Network",
        "in-game tokens",
        "digital gift cards",
        "social media boosting",
        "stream growth",
        "gaming marketplace",
        "creator services",
        "esports",
        "online influence",
        "digital services",
        "crypto payments",
        "streamer support",
        "gaming currency",
        "digital storefront"
      ],
      creator: "B4U Esports",
      publisher: "B4U Esports",
      formatDetection: {
        telephone: false,
        date: false,
        address: false,
        email: false,
        url: false
      },
      abstract: "B4U Esports is a Pi Network marketplace for in-game tokens, digital gift cards, and social media growth services that help gamers and creators scale quickly.",
      category: "Gaming",
      classification: "Entertainment",
      openGraph: {
        type: "website",
        title: "B4U Esports - In-game Tokens & Social Growth Marketplace",
        description: "Buy in-game tokens, digital gift cards, and social media boosting services with Pi Network on B4U Esports.",
        locale: "en_US",
        images: [
          {
            url: "",
            width: 512,
            height: 512,
            alt: "B4U Esports Logo"
          }
        ],
        countryName: "Bhutan"
      },
      twitter: {
        card: "summary_large_image",
        title: "B4U Esports - In-game Tokens & Social Growth Marketplace",
        description: "Buy in-game tokens, digital gift cards, and social media boosting services with Pi Network on B4U Esports.",
        creator: "@b4uesports",
        creatorId: "1847509990053920768",
        images: [
          {
            url: "",
            alt: "B4U Esports Logo"
          }
        ]
      },
      icons: [
        {
          url: "",
          type: "image/png",
          sizes: "512x512"
        }
      ]
    };
    
    // Return the metadata
    res.status(200).json(baseMetadata);
  } catch (error: any) {
    console.error('PiNet metadata error:', error);
    res.status(500).json({ message: 'Failed to generate metadata', error: error.message });
  }
}

// Add a function to test database connectivity
const testDatabaseConnectivity = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connectivity test: Connection acquired');
    const result = await client.query('SELECT 1 as test');
    console.log('Database connectivity test: Query successful, result:', result.rows[0]);
    client.release();
    console.log('Database connectivity test: Connection released');
    return true;
  } catch (error) {
    console.error('Database connectivity test failed:', error);
    return false;
  }
};

// Add a debug endpoint to check database connectivity
async function handleDebugConfig(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Test database connectivity
    console.log('Debug config: Testing database connectivity');
    const dbConnected = await testDatabaseConnectivity();
    
    // Log CORS headers for debugging
    console.log('CORS Headers:', {
      'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
    });
    
    const configInfo = {
      piServerApiKeyConfigured: isPiServerConfigured(),
      piServerApiKeyLength: PI_SERVER_API_KEY ? PI_SERVER_API_KEY.length : 0,
      piServerApiKeyPreview: PI_SERVER_API_KEY ? PI_SERVER_API_KEY.substring(0, 10) + '...' : 'NOT SET',
      jwtSecretLength: JWT_SECRET ? JWT_SECRET.length : 0,
      jwtSecretPreview: JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'NOT SET',
      databaseUrlConfigured: !!process.env.DATABASE_URL,
      databaseUrlPreview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT SET',
      databaseConnected: dbConnected,
      corsHeaders: {
        'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
      }
    };
    
    console.log('Debug config info:', configInfo);
    return res.status(200).json(configInfo);
  } catch (error: any) {
    console.error('Debug config error:', error);
    return res.status(500).json({ message: 'Debug config check failed', error: error.message });
  }
}

// Add a debug endpoint to check environment variables
async function handleDebugEnv(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const envInfo = {
      piServerApiKeyConfigured: isPiServerConfigured(),
      piServerApiKeyLength: PI_SERVER_API_KEY ? PI_SERVER_API_KEY.length : 0,
      piServerApiKeyPreview: PI_SERVER_API_KEY ? PI_SERVER_API_KEY.substring(0, 10) + '...' : 'NOT SET',
      jwtSecretLength: JWT_SECRET ? JWT_SECRET.length : 0,
      jwtSecretPreview: JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'NOT SET',
      databaseUrlConfigured: !!process.env.DATABASE_URL,
      databaseUrlPreview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT SET',
    };
    
    console.log('Environment variables info:', envInfo);
    return res.status(200).json(envInfo);
  } catch (error: any) {
    console.error('Debug env error:', error);
    return res.status(500).json({ message: 'Debug env check failed', error: error.message });
  }
}

// Temporary debug endpoint to check all transactions
async function handleDebugTransactions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // SECURITY: Require authentication and admin status to view debug transactions
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (verifyError: any) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const isAdmin = Boolean(decoded?.isAdmin);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Admin access required for debug transactions' });
    }

    console.log('Debug Transactions endpoint: Function called by admin');
    
    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();
    
    // Get all transactions (admin only - use with caution)
    const transactions = await storage.getAllTransactions();
    console.log('Debug Transactions endpoint: Found transactions', { count: transactions.length });
    
    // Also get pending transactions specifically
    const client = await pool.connect();
    try {
      const pendingTransactions = await client.query(
        'SELECT * FROM app_transactions WHERE status = $1 ORDER BY created_at DESC LIMIT 10',
        ['pending']
      );
      console.log('Debug Transactions endpoint: Pending transactions', { count: pendingTransactions.rows.length });
      
      return res.status(200).json({ 
        allTransactions: transactions.slice(0, 10), // Only return first 10
        pendingTransactions: pendingTransactions.rows,
        totalTransactions: transactions.length
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Debug Transactions endpoint: Error:', error);
    return res.status(500).json({ 
      message: 'Debug transactions failed', 
      error: error.message 
    });
  }
}

// Endpoint to check today's purchases
async function handleTodayPurchases(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Today Purchases endpoint: Function called');
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          u.email,
          u.display_name,
          t.id,
          t.status,
          t.pi_amount,
          t.usd_amount,
          t.created_at,
          p.name as package_name
        FROM app_transactions t
        JOIN app_users u ON t.user_id = u.id
        LEFT JOIN app_packages p ON t.package_id = p.id
        WHERE DATE(t.created_at) = CURRENT_DATE
        ORDER BY t.created_at DESC;
      `);
      
      const total = result.rows.reduce((sum: number, row: any) => sum + (parseFloat(row.usd_amount) || 0), 0);
      
      return res.status(200).json({ 
        purchases: result.rows,
        count: result.rows.length,
        totalRevenue: total.toFixed(2)
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Today Purchases endpoint: Error:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch today purchases', 
      error: error.message 
    });
  }
}

// Temporary debug endpoint to check database connectivity and table existence
async function handleDebugDatabase(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Debug Database endpoint: Function called');
    
    // Test database connectivity
    const client = await pool.connect();
    try {
      // Check if transactions table exists
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'transactions' OR table_name = 'app_transactions'
      `);
      
      console.log('Debug Database endpoint: Table check result', tableCheck.rows);
      
      // Get count of transactions
      const transactionCountResult = await client.query('SELECT COUNT(*) as count FROM app_transactions');
      console.log('Debug Database endpoint: Transaction count', transactionCountResult.rows[0]);
      
      // Get count of users
      const userCountResult = await client.query('SELECT COUNT(*) as count FROM app_users');
      console.log('Debug Database endpoint: User count', userCountResult.rows[0]);
      
      // Get count of packages
      const packageCountResult = await client.query('SELECT COUNT(*) as count FROM app_packages');
      console.log('Debug Database endpoint: Package count', packageCountResult.rows[0]);
      
      // Get all transactions (limit to 10 for performance)
      const allTransactionsResult = await client.query('SELECT * FROM app_transactions ORDER BY created_at DESC LIMIT 10');
      console.log('Debug Database endpoint: All transactions', allTransactionsResult.rows);
      
      // Get one sample user if exists
      const sampleUserResult = await client.query('SELECT * FROM app_users LIMIT 1');
      console.log('Debug Database endpoint: Sample user', sampleUserResult.rows[0]);
      
      // Get one sample package if exists
      const samplePackageResult = await client.query('SELECT * FROM app_packages LIMIT 1');
      console.log('Debug Database endpoint: Sample package', samplePackageResult.rows[0]);
      
      return res.status(200).json({
        tableExists: tableCheck.rows.length > 0,
        transactionCount: transactionCountResult.rows[0].count,
        userCount: userCountResult.rows[0].count,
        packageCount: packageCountResult.rows[0].count,
        allTransactions: allTransactionsResult.rows,
        sampleUser: sampleUserResult.rows[0],
        samplePackage: samplePackageResult.rows[0],
        tableNames: tableCheck.rows.map((row: any) => row.table_name)
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Debug Database endpoint: Error:', error);
    return res.status(500).json({ 
      message: 'Debug database check failed', 
      error: error.message 
    });
  }
}

async function ensureFeedbackTable(client: pkg.PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_feedback (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR,
      username VARCHAR NOT NULL,
      email VARCHAR,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    ALTER TABLE app_feedback
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS app_feedback_replies (
      id VARCHAR PRIMARY KEY,
      feedback_id VARCHAR NOT NULL REFERENCES app_feedback(id) ON DELETE CASCADE,
      user_id VARCHAR,
      username VARCHAR NOT NULL,
      email VARCHAR,
      comment TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;
    ALTER TABLE app_feedback_replies ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE app_feedback FROM anon;
    REVOKE ALL ON TABLE app_feedback FROM authenticated;
    REVOKE ALL ON TABLE app_feedback FROM PUBLIC;
    REVOKE ALL ON TABLE app_feedback_replies FROM anon;
    REVOKE ALL ON TABLE app_feedback_replies FROM authenticated;
    REVOKE ALL ON TABLE app_feedback_replies FROM PUBLIC;
  `);
}

function getFeedbackAuthUser(req: VercelRequest) {
  const token = req.headers.authorization?.toString().replace('Bearer ', '');
  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
  return {
    userId: decoded.userId || null,
    username: decoded.username || 'Anonymous',
    email: decoded.email || null,
  };
}

function normalizeFeedbackIdentity(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function loadFeedbackWithReplies(client: pkg.PoolClient) {
  await ensureFeedbackTable(client);

  const feedbackResult = await client.query(
    `SELECT f.id, f.user_id, f.username, f.rating, f.comment, f.created_at, f.updated_at,
            u.profile_picture AS profile_picture
      FROM app_feedback f
      LEFT JOIN app_users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT 100`
  );
  const repliesResult = await client.query(
    `SELECT r.id, r.feedback_id, r.user_id, r.username, r.comment, r.created_at, r.updated_at,
            u.profile_picture AS profile_picture
      FROM app_feedback_replies r
      LEFT JOIN app_users u ON u.id = r.user_id
      ORDER BY r.created_at ASC`
  );

  const repliesByFeedback = new Map<string, any[]>();
  for (const reply of repliesResult.rows) {
    const currentReplies = repliesByFeedback.get(reply.feedback_id) || [];
    currentReplies.push({
      id: reply.id,
      feedbackId: reply.feedback_id,
      userId: reply.user_id,
      username: reply.username,
      comment: reply.comment,
      created_at: reply.created_at,
      updated_at: reply.updated_at,
      profilePicture: reply.profile_picture || null,
    });
    repliesByFeedback.set(reply.feedback_id, currentReplies);
  }

  return feedbackResult.rows.map((item) => ({
    id: item.id,
    userId: item.user_id,
    username: item.username,
    rating: item.rating,
    comment: item.comment,
    created_at: item.created_at,
    updated_at: item.updated_at,
    profilePicture: item.profile_picture || null,
    replies: repliesByFeedback.get(item.id) || [],
  }));
}

async function handleFeedback(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      try {
        const feedbacks = await loadFeedbackWithReplies(client);
        return res.status(200).json({ success: true, feedbacks });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Feedback GET error:', error);
      return res.status(500).json({ message: 'Failed to load feedback', error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { rating, comment } = req.body || {};
      const parsedRating = Number(rating);
      const textComment = typeof comment === 'string' ? comment.trim() : '';

      if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
      }

      if (!textComment) {
        return res.status(400).json({ message: 'Comment is required.' });
      }

      let authUser;
      try {
        authUser = getFeedbackAuthUser(req);
      } catch (verifyError: any) {
        return res.status(401).json({ message: 'Invalid token signature' });
      }

      if (!authUser?.userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const client = await pool.connect();
      try {
        const userResult = await client.query(
          'SELECT is_profile_verified FROM app_users WHERE id = $1',
          [authUser.userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (!userResult.rows[0].is_profile_verified) {
          return res.status(403).json({
            message: 'Profile verification required to submit feedback. Please verify your profile before leaving feedback.',
          });
        }

        await ensureFeedbackTable(client);
        const feedbackId = randomUUID();
        const insertResult = await client.query(
          `INSERT INTO app_feedback (id, user_id, username, email, rating, comment)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, user_id, username, email, rating, comment, created_at, updated_at`,
          [feedbackId, authUser.userId, authUser.username, authUser.email, parsedRating, textComment]
        );
        const updatedTokenBalance = await grantB4uTokens(
          authUser.userId,
          FEEDBACK_REWARD_TOKENS,
          'feedback_reward',
          `Feedback reward: ${FEEDBACK_REWARD_TOKENS} ${B4U_TOKEN_NAME}`,
          feedbackId,
          client,
        );

        return res.status(201).json({
          success: true,
          tokensAwarded: FEEDBACK_REWARD_TOKENS,
          tokenName: B4U_TOKEN_NAME,
          tokenSymbol: B4U_TOKEN_SYMBOL,
          tokens: updatedTokenBalance,
          feedback: {
            id: insertResult.rows[0].id,
            userId: insertResult.rows[0].user_id,
            username: insertResult.rows[0].username,
            rating: insertResult.rows[0].rating,
            comment: insertResult.rows[0].comment,
            created_at: insertResult.rows[0].created_at,
            updated_at: insertResult.rows[0].updated_at,
            replies: [],
          },
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Feedback POST error:', error);
      return res.status(500).json({ message: 'Failed to submit feedback', error: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, rating, comment } = req.body || {};
      const feedbackId = typeof id === 'string' ? id.trim() : '';
      const parsedRating = Number(rating);
      const textComment = typeof comment === 'string' ? comment.trim() : '';

      if (!feedbackId) {
        return res.status(400).json({ message: 'Feedback id is required.' });
      }

      if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
      }

      if (!textComment) {
        return res.status(400).json({ message: 'Comment is required.' });
      }

      let authUser;
      try {
        authUser = getFeedbackAuthUser(req);
      } catch (verifyError: any) {
        return res.status(401).json({ message: 'Invalid token signature' });
      }

      if (!authUser?.userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const client = await pool.connect();
      try {
        const userResult = await client.query(
          'SELECT is_profile_verified FROM app_users WHERE id = $1',
          [authUser.userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (!userResult.rows[0].is_profile_verified) {
          return res.status(403).json({
            message: 'Profile verification required to submit feedback. Please verify your profile before editing or submitting feedback.',
          });
        }

        await ensureFeedbackTable(client);
        const existingFeedbackResult = await client.query(
          'SELECT id, user_id, username, email FROM app_feedback WHERE id = $1',
          [feedbackId]
        );

        if (existingFeedbackResult.rows.length === 0) {
          return res.status(404).json({ message: 'Feedback not found.' });
        }

        const existingFeedback = existingFeedbackResult.rows[0];
        const canEditFeedback =
          existingFeedback.user_id === authUser.userId ||
          normalizeFeedbackIdentity(existingFeedback.username) === normalizeFeedbackIdentity(authUser.username) ||
          (
            !!existingFeedback.email &&
            normalizeFeedbackIdentity(existingFeedback.email) === normalizeFeedbackIdentity(authUser.email)
          );

        if (!canEditFeedback) {
          return res.status(403).json({ message: 'You can only edit your own feedback.' });
        }

        const updateResult = await client.query(
          `UPDATE app_feedback
           SET user_id = $1,
               email = COALESCE(email, $2),
               rating = $3,
               comment = $4,
               updated_at = NOW()
           WHERE id = $5
           RETURNING id, user_id, username, email, rating, comment, created_at, updated_at`,
          [authUser.userId, authUser.email, parsedRating, textComment, feedbackId]
        );

        return res.status(200).json({
          success: true,
          feedback: {
            id: updateResult.rows[0].id,
            userId: updateResult.rows[0].user_id,
            username: updateResult.rows[0].username,
            rating: updateResult.rows[0].rating,
            comment: updateResult.rows[0].comment,
            created_at: updateResult.rows[0].created_at,
            updated_at: updateResult.rows[0].updated_at,
          },
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Feedback PUT error:', error);
      return res.status(500).json({ message: 'Failed to update feedback', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleFeedbackReply(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let authUser;
  try {
    authUser = getFeedbackAuthUser(req);
  } catch (verifyError: any) {
    return res.status(401).json({ message: 'Invalid token signature' });
  }

  if (!authUser?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const client = await pool.connect();
  try {
    const userResult = await client.query(
      'SELECT is_profile_verified FROM app_users WHERE id = $1',
      [authUser.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!userResult.rows[0].is_profile_verified) {
      return res.status(403).json({
        message: 'Profile verification required to submit or reply to feedback. Please verify your profile first.',
      });
    }
  } finally {
    client.release();
  }

  if (req.method === 'POST') {
    try {
      const { feedbackId, comment } = req.body || {};
      const targetFeedbackId = typeof feedbackId === 'string' ? feedbackId.trim() : '';
      const textComment = typeof comment === 'string' ? comment.trim() : '';

      if (!targetFeedbackId) {
        return res.status(400).json({ message: 'Feedback id is required.' });
      }

      if (!textComment) {
        return res.status(400).json({ message: 'Reply is required.' });
      }

      const client = await pool.connect();
      try {
        await ensureFeedbackTable(client);
        const feedbackExists = await client.query('SELECT id FROM app_feedback WHERE id = $1', [targetFeedbackId]);
        if (feedbackExists.rows.length === 0) {
          return res.status(404).json({ message: 'Feedback not found.' });
        }

        const replyId = randomUUID();
        const insertResult = await client.query(
          `INSERT INTO app_feedback_replies (id, feedback_id, user_id, username, email, comment)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, feedback_id, user_id, username, email, comment, created_at, updated_at`,
          [replyId, targetFeedbackId, authUser.userId, authUser.username, authUser.email, textComment]
        );

        return res.status(201).json({
          success: true,
          reply: {
            id: insertResult.rows[0].id,
            feedbackId: insertResult.rows[0].feedback_id,
            userId: insertResult.rows[0].user_id,
            username: insertResult.rows[0].username,
            comment: insertResult.rows[0].comment,
            created_at: insertResult.rows[0].created_at,
            updated_at: insertResult.rows[0].updated_at,
          },
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Feedback reply POST error:', error);
      return res.status(500).json({ message: 'Failed to submit reply', error: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, comment } = req.body || {};
      const replyId = typeof id === 'string' ? id.trim() : '';
      const textComment = typeof comment === 'string' ? comment.trim() : '';

      if (!replyId) {
        return res.status(400).json({ message: 'Reply id is required.' });
      }

      if (!textComment) {
        return res.status(400).json({ message: 'Reply is required.' });
      }

      const client = await pool.connect();
      try {
        await ensureFeedbackTable(client);
        const existingReplyResult = await client.query(
          'SELECT id, user_id, username, email FROM app_feedback_replies WHERE id = $1',
          [replyId]
        );

        if (existingReplyResult.rows.length === 0) {
          return res.status(404).json({ message: 'Reply not found.' });
        }

        const existingReply = existingReplyResult.rows[0];
        const canEditReply =
          existingReply.user_id === authUser.userId ||
          normalizeFeedbackIdentity(existingReply.username) === normalizeFeedbackIdentity(authUser.username) ||
          (
            !!existingReply.email &&
            normalizeFeedbackIdentity(existingReply.email) === normalizeFeedbackIdentity(authUser.email)
          );

        if (!canEditReply) {
          return res.status(403).json({ message: 'You can only edit your own reply.' });
        }

        const updateResult = await client.query(
          `UPDATE app_feedback_replies
           SET user_id = $1,
               email = COALESCE(email, $2),
               comment = $3,
               updated_at = NOW()
           WHERE id = $4
           RETURNING id, feedback_id, user_id, username, email, comment, created_at, updated_at`,
          [authUser.userId, authUser.email, textComment, replyId]
        );

        return res.status(200).json({
          success: true,
          reply: {
            id: updateResult.rows[0].id,
            feedbackId: updateResult.rows[0].feedback_id,
            userId: updateResult.rows[0].user_id,
            username: updateResult.rows[0].username,
            comment: updateResult.rows[0].comment,
            created_at: updateResult.rows[0].created_at,
            updated_at: updateResult.rows[0].updated_at,
          },
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Feedback reply PUT error:', error);
      return res.status(500).json({ message: 'Failed to update reply', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

// Add event listeners for pool errors
pool.on('error', (err: Error) => {
  console.error('Database pool error:', err);
});

pool.on('connect', () => {
  console.log('Database pool connection established');
});

pool.on('acquire', () => {
  console.log('Database connection acquired from pool');
});

pool.on('remove', () => {
  console.log('Database connection removed from pool');
});

pool.on('release', (err?: Error) => {
  if (err) {
    console.error('Database connection release error:', err);
  } else {
    console.log('Database connection released back to pool');
  }
});

// Handler for Admin Login
async function handleAdminLogin(req: VercelRequest, res: VercelResponse) {
  console.log('Admin Login endpoint: Function called with method:', req.method);
  console.log('Admin Login endpoint: Request headers:', req.headers);
  console.log('Admin Login endpoint: Request body:', req.body);
  console.log('Admin Login endpoint: Full request object:', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers,
    body: req.body
  });
  
  // More detailed method checking
  console.log('Admin Login endpoint: Request method details:', {
    method: req.method,
    methodType: typeof req.method,
    methodLength: req.method ? req.method.length : 0,
    isPost: req.method === "POST",
    methodUppercase: req.method ? req.method.toUpperCase() : 'undefined',
    methodLowercase: req.method ? req.method.toLowerCase() : 'undefined'
  });
  
  if (req.method !== "POST") {
    console.log('Admin Login endpoint: Method not allowed', req.method);
    return res.status(405).json({ 
      message: "Method not allowed. Expected POST, got " + req.method,
      method: req.method,
      allowed: "POST"
    });
  }

  try {
    console.log('Admin Login endpoint: Admin login attempt');
    
    const { username, password } = req.body;
    if (!username || !password) {
      console.log('Admin Login endpoint: Username or password missing');
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Check if we have a real database connection
    if (!pool) {
      console.log('Admin Login endpoint: Database not initialized');
      return res.status(500).json({ message: 'Database not initialized' });
    }

    // Fetch admin from database using raw SQL
    const client = await pool.connect();
    try {
      console.log('Admin Login endpoint: Checking credentials for', username);
      
      const result = await client.query(
        'SELECT id, username, password, email, role, is_active, last_login FROM admins WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        console.log('Admin Login endpoint: Admin not found for username', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const admin = result.rows[0];
      
      // Check if admin is active
      if (!admin.is_active) {
        console.log('Admin Login endpoint: Admin account is inactive for', username);
        return res.status(401).json({ message: 'Account is inactive' });
      }
      
      // Verify password using bcrypt
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(password, admin.password);
      
      if (!isValidPassword) {
        console.log('Admin Login endpoint: Invalid password for', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Update last login timestamp
      await client.query(
        'UPDATE admins SET last_login = NOW() WHERE id = $1',
        [admin.id]
      );
      
      // Generate JWT token
      const jwt = await import('jsonwebtoken');
      const token = jwt.sign(
        { adminId: admin.id, username: admin.username, role: admin.role }, 
        JWT_SECRET, 
        { expiresIn: '8h', algorithm: 'HS256' }
      );

      // Return admin data without password
      const adminData = {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      };

      console.log('Admin Login endpoint: Successful login for', username);
      
      res.status(200).json({
        admin: adminData,
        token: token,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Admin Login endpoint: Login error:', error);
    res.status(500).json({ 
      message: 'Login failed', 
      error: error.message 
    });
  }
}

// ── Admin: verify Pi UID owns the request ──────────────────────────────────
async function verifyAdminRequest(req: VercelRequest): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token.split('.').length !== 3) return { ok: false, error: 'Unauthorized' };
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    if (!isOwnerPiUID(decoded.piUID)) return { ok: false, error: 'Forbidden' };
    return { ok: true, userId: decoded.userId };
  } catch {
    return { ok: false, error: 'Invalid token' };
  }
}

// Handler for Admin Analytics
async function handleAdminAnalytics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return res.status(401).json({ message: auth.error });

  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM app_users)::int                                          AS "totalUsers",
        (SELECT COUNT(*) FROM app_transactions)::int                                   AS "totalTransactions",
        COALESCE((SELECT SUM(pi_amount::numeric) FROM app_transactions WHERE status='completed'),0)::float AS "totalRevenue",
        CASE WHEN (SELECT COUNT(*) FROM app_transactions) = 0 THEN 0
             ELSE ROUND(
               (SELECT COUNT(*) FROM app_transactions WHERE status='completed')::numeric
               / (SELECT COUNT(*) FROM app_transactions)::numeric * 100, 2
             )
        END::float                                                                     AS "successRate"
    `);
    return res.json(result.rows[0]);
  } catch (e: any) {
    console.error('Admin analytics error:', e.message);
    return res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

// Handler for Admin Users list
async function handleAdminUsers(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return res.status(401).json({ message: auth.error });

  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        u.phone,
        u.country,
        u.is_active AS "isActive",
        COALESCE(u.total_spent::float, 0) AS "totalSpent",
        COUNT(t.id)::int AS "transactionCount"
      FROM app_users u
      LEFT JOIN app_transactions t ON t.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 500
    `);
    return res.json(result.rows);
  } catch (e: any) {
    console.error('Admin users error:', e.message);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
}

// Handler for Admin Transactions list
async function handleAdminTransactions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return res.status(401).json({ message: auth.error });

  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.payment_id   AS "paymentId",
        t.txid,
        t.pi_amount    AS "piAmount",
        t.usd_amount   AS "usdAmount",
        t.status,
        t.created_at   AS "createdAt",
        json_build_object('username', u.username, 'email', u.email) AS "user",
        CASE
          WHEN p.id IS NOT NULL THEN json_build_object('name', p.name, 'game', p.game)
          ELSE json_build_object('name', 'N/A', 'game', 'N/A')
        END AS "package"
      FROM app_transactions t
      LEFT JOIN app_users u ON u.id = t.user_id
      LEFT JOIN app_packages p ON p.id = t.package_id
      ORDER BY t.created_at DESC
      LIMIT 500
    `);
    return res.json(result.rows);
  } catch (e: any) {
    console.error('Admin transactions error:', e.message);
    return res.status(500).json({ message: 'Failed to fetch transactions' });
  }
}

// Handler for Admin Packages list + create
async function handleAdminPackages(req: VercelRequest, res: VercelResponse) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return res.status(401).json({ message: auth.error });

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT id, game, name, in_game_amount AS "inGameAmount",
               usdt_value AS "usdtValue", is_active AS "isActive"
        FROM app_packages ORDER BY created_at DESC
      `);
      return res.json(result.rows);
    } catch (e: any) {
      return res.status(500).json({ message: 'Failed to fetch packages' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { game, name, inGameAmount, usdtValue, image } = req.body;
      const result = await pool.query(
        `INSERT INTO app_packages (game, name, in_game_amount, usdt_value, image)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [game, name, inGameAmount, usdtValue, image || '']
      );
      return res.json(result.rows[0]);
    } catch (e: any) {
      return res.status(500).json({ message: 'Failed to create package' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

// Handler for Admin Package update (PUT /api/admin/packages/:id)
async function handleAdminPackageUpdate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' });
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return res.status(401).json({ message: auth.error });

  try {
    // Extract id from path: /api/admin/packages/:id
    const id = (req.url || '').split('/').pop()?.split('?')[0];
    if (!id) return res.status(400).json({ message: 'Package ID required' });

    const { isActive, game, name, inGameAmount, usdtValue } = req.body;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(isActive); }
    if (game !== undefined)     { fields.push(`game = $${idx++}`);      values.push(game); }
    if (name !== undefined)     { fields.push(`name = $${idx++}`);      values.push(name); }
    if (inGameAmount !== undefined) { fields.push(`in_game_amount = $${idx++}`); values.push(inGameAmount); }
    if (usdtValue !== undefined) { fields.push(`usdt_value = $${idx++}`); values.push(usdtValue); }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE app_packages SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING id, game, name, in_game_amount AS "inGameAmount", usdt_value AS "usdtValue", is_active AS "isActive"`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Package not found' });
    return res.json(result.rows[0]);
  } catch (e: any) {
    console.error('Admin package update error:', e.message);
    return res.status(500).json({ message: 'Failed to update package' });
  }
}

// Handler for Incomplete Payment
async function handleIncompletePaymentV2(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    console.log('Incomplete Payment endpoint: Method not allowed', req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Incomplete Payment endpoint: Incomplete payment request received', {
      body: req.body,
      headers: req.headers
    });
    
    const { paymentId } = req.body;
    if (!paymentId) {
      console.log('Incomplete Payment endpoint: Payment ID missing in request body', req.body);
      return res.status(400).json({ message: 'Payment ID required' });
    }

    console.log('Incomplete Payment endpoint: Handling incomplete payment', { paymentId });

    // Debug logging for payment completion
    console.log('Incomplete payment debug', {
      paymentId,
      apiUrl: `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      headers: {
        Authorization: `Key ${PI_SERVER_API_KEY ? '***' : 'MISSING'}`,
        'Content-Type': 'application/json'
      }
    });

    // Check payment status before attempting to complete
    try {
      console.log('Incomplete Payment endpoint: Checking payment status before completion');
      const paymentStatusResponse = await axios.get(`https://api.minepi.com/v2/payments/${paymentId}`, {
        headers: {
          'Authorization': `Key ${PI_SERVER_API_KEY}`,
        }
      });
      
      if (paymentStatusResponse.status === 200) {
        const paymentStatus = paymentStatusResponse.data;
        console.log('Incomplete Payment endpoint: Payment status:', paymentStatus);
        
        // Check if payment is already completed
        if (paymentStatus.status && paymentStatus.status.developer_completed) {
          console.log('Incomplete Payment endpoint: Payment already completed, skipping completion');
          // Update transaction in database to reflect completion
          const client = await pool.connect();
          try {
            await client.query(
              'UPDATE app_transactions SET status = $1, updated_at = NOW() WHERE payment_id = $2',
              ['completed', paymentId]
            );
            console.log('Incomplete Payment endpoint: Transaction updated to completed in database');
          } finally {
            client.release();
          }
          return res.status(200).json({ success: true, message: 'Payment already completed' });
        }
        // Check if payment is approved by user
        else if (paymentStatus.status && !paymentStatus.status.developer_approved) {
          console.warn('Incomplete Payment endpoint: Payment not yet approved by developer, cannot complete');
          return res.status(400).json({ message: 'Payment not yet approved by developer' });
        }
        else if (paymentStatus.status && !paymentStatus.status.transaction_verified) {
          console.warn('Incomplete Payment endpoint: Payment transaction not yet verified, cannot complete');
          return res.status(400).json({ message: 'Payment transaction not yet verified' });
        }
      } else {
        console.error('Incomplete Payment endpoint: Failed to get payment status:', paymentStatusResponse.status);
        const statusErrorData = await paymentStatusResponse.data;
        console.error('Incomplete Payment endpoint: Payment status error data:', statusErrorData);
      }
    } catch (statusError: any) {
      console.error('Incomplete Payment endpoint: Payment status check failed:', statusError);
      return res.status(500).json({ message: 'Payment status check failed', error: statusError.message });
    }

    // Attempt to complete the payment
    try {
      console.log('Incomplete Payment endpoint: Attempting to complete payment');
      
      // First, get the payment details to extract the txid
      console.log('Incomplete Payment endpoint: Fetching payment details to get txid');
      const paymentDetailsResponse = await axios.get(`https://api.minepi.com/v2/payments/${paymentId}`, {
        headers: {
          'Authorization': `Key ${PI_SERVER_API_KEY}`,
        }
      });
      
      if (paymentDetailsResponse.status !== 200) {
        console.error('Incomplete Payment endpoint: Failed to get payment details:', paymentDetailsResponse.status);
        return res.status(500).json({ message: 'Failed to get payment details', status: paymentDetailsResponse.status });
      }
      
      const paymentDetails = paymentDetailsResponse.data;
      const txid = paymentDetails.transaction?.txid;
      
      if (!txid) {
        console.error('Incomplete Payment endpoint: No txid found in payment details', paymentDetails);
        return res.status(400).json({ message: 'Transaction ID missing from payment details' });
      }
      
      console.log('Incomplete Payment endpoint: Found txid:', txid);
      
      // Now complete the payment with the txid
      const completePaymentResponse = await axios.post(`https://api.minepi.com/v2/payments/${paymentId}/complete`, 
        { txid }, // Include the txid in the request body
        {
          headers: {
            'Authorization': `Key ${PI_SERVER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (completePaymentResponse.status === 200) {
        const completePaymentData = completePaymentResponse.data;
        console.log('Incomplete Payment endpoint: Payment completed successfully:', completePaymentData);

        // Update transaction in database to reflect completion
        const client = await pool.connect();
        try {
          await client.query(
            'UPDATE transactions SET status = $1, txid = $2, updated_at = NOW() WHERE payment_id = $3',
            ['completed', txid, paymentId]
          );
          console.log('Incomplete Payment endpoint: Transaction updated to completed in database');
        } finally {
          client.release();
        }

        return res.status(200).json({ success: true, message: 'Payment completed successfully' });
      } else {
        console.error('Incomplete Payment endpoint: Payment completion failed:', completePaymentResponse.status);
        const completionErrorData = await completePaymentResponse.data;
        console.error('Incomplete Payment endpoint: Payment completion error data:', completionErrorData);
        return res.status(500).json({ message: 'Payment completion failed', error: completionErrorData });
      }
    } catch (completionError: any) {
      console.error('Incomplete Payment endpoint: Payment completion failed:', completionError);
      return res.status(500).json({ message: 'Payment completion failed', error: completionError.message });
    }
  } catch (error: any) {
    console.error('Incomplete Payment endpoint: Error handling incomplete payment:', error);
    return res.status(500).json({ message: 'Error handling incomplete payment', error: error.message });
  }
}

// Enhanced payment completion function with detailed debugging
async function handlePaymentComplete(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    console.log('Payment Complete endpoint: Method not allowed', req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Payment Complete endpoint: Payment completion request received', {
      body: getPublicBodyLog(req.body),
      headers: redactHeaders(req.headers)
    });
    
    const { paymentId, txid } = req.body;
    if (!paymentId || !txid) {
      console.log('Payment Complete endpoint: Payment ID or TXID missing in request body', req.body);
      return res.status(400).json({ message: 'Payment ID and TXID required' });
    }

    console.log('Payment Complete endpoint: Completing payment', { paymentId, txid });

    // Debug logging for payment completion
    console.log('Payment complete debug', {
      paymentId,
      txid,
      apiUrl: `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      headers: {
        Authorization: `Key ${PI_SERVER_API_KEY ? '***' : 'MISSING'}`,
        'Content-Type': 'application/json'
      }
    });

    let authenticatedUserId: string;
    try {
      authenticatedUserId = getAuthenticatedUserId(req);
      console.log('Payment Complete endpoint: Authenticated user ID', authenticatedUserId);
    } catch (authError: any) {
      console.error('Payment Complete endpoint: Authentication failed', authError?.message || authError);
      if (authError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired. Please log in again.' });
      }
      return res.status(401).json({ message: authError.message || 'Unauthorized' });
    }

    let skipPiComplete = false;
    // Check payment status before attempting to complete
    try {
      console.log('Payment Complete endpoint: Checking payment status before completion');
      const paymentStatusResponse = await axios.get(`https://api.minepi.com/v2/payments/${paymentId}`, {
        headers: {
          'Authorization': `Key ${PI_SERVER_API_KEY}`,
        }
      });
      
      if (paymentStatusResponse.status === 200) {
        const paymentStatus = paymentStatusResponse.data;
        console.log('Payment Complete endpoint: Payment status:', paymentStatus);
        
        // If the payment has already been completed on Pi, skip the complete call and continue to post-completion handling.
        if (paymentStatus.status && paymentStatus.status.developer_completed) {
          console.log('Payment Complete endpoint: Payment already completed on Pi, skipping complete call');
          skipPiComplete = true;
        }
        // Check if payment is approved by developer
        else if (paymentStatus.status && !paymentStatus.status.developer_approved) {
          console.warn('Payment Complete endpoint: Payment not yet approved by developer, cannot complete');
          return res.status(400).json({ message: 'Payment not yet approved by developer' });
        }
        else if (paymentStatus.status && !paymentStatus.status.transaction_verified) {
          console.warn('Payment Complete endpoint: Payment transaction not yet verified, cannot complete');
          return res.status(400).json({ message: 'Payment transaction not yet verified' });
        }
      } else {
        console.error('Payment Complete endpoint: Failed to get payment status:', paymentStatusResponse.status);
        const statusErrorData = await paymentStatusResponse.data;
        console.error('Payment Complete endpoint: Payment status error data:', statusErrorData);
      }
    } catch (statusError: any) {
      console.error('Payment Complete endpoint: Payment status check failed:', statusError);
      return res.status(500).json({ message: 'Payment status check failed', error: statusError.message });
    }

    // Test database connectivity first
    const dbConnected = await testDatabaseConnectivity(); // Quick test
    if (!dbConnected) {
      console.error('Payment Complete endpoint: Database connection failed');
      return res.status(500).json({ message: 'Database connection failed' });
    }

    // Get transaction from database
    let client = await pool.connect();
    let clientReleased = false;
    const releasePaymentClient = () => {
      if (!clientReleased) {
        client.release();
        clientReleased = true;
      }
    };

    let completed = false;
    const maxRetries = 3;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        // Get transaction by paymentId for the authenticated user
        const transactionResult = await client.query(
            'SELECT t.*, u.pi_uid as user_pi_uid, u.email as user_email, u.username as user_username, u.wallet_address as user_wallet_address, u.phone as user_phone, u.game_accounts as user_game_accounts, u.social_accounts as user_social_accounts, p.name as package_name, p.game as package_game, p.in_game_amount as package_in_game_amount FROM app_transactions t JOIN app_users u ON t.user_id = u.id LEFT JOIN app_packages p ON t.package_id = p.id WHERE t.payment_id = $1 AND t.user_id = $2',
            [paymentId, authenticatedUserId],
        );

        if (transactionResult.rows.length === 0) {
          const existingTransactionResult = await client.query(
            'SELECT user_id FROM app_transactions WHERE payment_id = $1',
            [paymentId]
          );
          if (existingTransactionResult.rows.length > 0) {
            console.warn('Payment Complete endpoint: Payment ID belongs to another user', {
              paymentId,
              authenticatedUserId,
              transactionUserId: existingTransactionResult.rows[0].user_id
            });
            return res.status(403).json({ message: 'Forbidden' });
          }

          console.warn('Payment Complete endpoint: Transaction not found for authenticated user', { paymentId, authenticatedUserId });
          return res.status(404).json({ message: 'Transaction not found for current user' });
        }

        const transaction = transactionResult.rows[0];
        console.log('Payment Complete endpoint: Transaction found', { transactionId: transaction.id });
        if (!isPiServerConfigured()) {
          console.error('Payment Complete endpoint: Pi Server API Key not configured');
          return res.status(500).json({ message: 'Pi Server API Key not configured' });
        }
        if (!skipPiComplete) {
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              console.log(`Payment Complete endpoint: Attempt ${attempt + 1} to complete payment with Pi Network`, { paymentId, txid });
              
              const piResponse = await axios.post(
                  `https://api.minepi.com/v2/payments/${paymentId}/complete`,
                  { txid },
                  {
                    headers: {
                      'Authorization': `Key ${PI_SERVER_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    timeout: 10000 // 10 second timeout
                  }
                );
              
              if (piResponse.status === 200) {
                console.log('Payment Complete endpoint: Pi Network completion successful');
                const completionData = piResponse.data;
                console.log('Payment Complete endpoint: Pi Network completion response:', completionData);
                completed = true;
                break;
              }

              console.error(`Payment Complete endpoint: Pi Network completion attempt ${attempt + 1} failed with status:`, piResponse.status);
              const errorData = await piResponse.data;
              console.error('Payment Complete endpoint: Pi Network error data:', errorData);
              
              if (piResponse.status === 400) {
                console.error('Payment Complete endpoint: 400 error indicates invalid request - check payment state, txid validity, and authorization header');
                console.error('Payment Complete endpoint: Common causes of 400 errors:');
                console.error('  1. Payment already completed');
                console.error('  2. Invalid txid');
                console.error('  3. Payment not yet approved by user');
                console.error('  4. Wrong network (testnet vs mainnet)');
                console.error('  5. Expired App Access Token');
              }
            } catch (piError: any) {
              console.error(`Payment Complete endpoint: Pi Network completion attempt ${attempt + 1} failed:`, piError.message);
              console.error('Payment Complete endpoint: Pi Network completion error details:', piError);

              if (attempt < maxRetries - 1) {
                const waitTime = Math.pow(2, attempt) * 2000; // 2s, 4s, 6s
                console.warn(`Payment Complete endpoint: Retry ${attempt + 1}/${maxRetries}: Waiting ${waitTime/1000}s before retrying...`);
                await delay(waitTime);
              }
            }
          }
        } else {
          completed = true;
          console.log('Payment Complete endpoint: Skipping Pi completion because payment is already completed on Pi');
        }
        
        if (!completed) {
          console.log('Payment Complete endpoint: Payment completion failed with Pi Network API');
          // Update transaction status to failed in database
          if (transaction) {
            await client.query(
              'UPDATE app_transactions SET status = $1, failure_reason = $2, updated_at = NOW() WHERE id = $3',
              ['failed', 'Payment completion failed with Pi Network API', transaction.id]
            );
            console.log('Payment Complete endpoint: Transaction marked as failed in database');
            releasePaymentClient();
            
            // Send failure notification email to user
            try {
              if (transaction.user_email && transaction.package_name) {
                // Load email service dynamically
                const emailModule = await import('../dist/server/services/email.js');
                const { sendPaymentFailureNotification } = emailModule;
                
                console.log('Payment Complete endpoint: Attempting to send payment failure notification email to user:', transaction.user_email);
                const emailResult = await sendPaymentFailureNotification({
                  to: transaction.user_email,
                  username: transaction.user_username,
                  packageName: transaction.package_name,
                  piAmount: transaction.pi_amount,
                  failureReason: 'Payment completion failed with Pi Network API',
                  transactionId: transaction.id,
                  paymentId: paymentId,
                  isCancelled: false,
                  game: transaction.package_game,
                  gameAccounts: transaction.user_game_accounts,
                  socialAccounts: transaction.user_social_accounts
                });
                
                if (emailResult) {
                  console.log('Payment Complete endpoint: Payment failure notification email sent successfully to user:', transaction.user_email);
                } else {
                  console.log('Payment Complete endpoint: Failed to send payment failure notification email to user:', transaction.user_email);
                }
              } else {
                console.log('Payment Complete endpoint: Skipping failure notification email - missing user email or package name');
              }
            } catch (emailError) {
              console.error('Payment Complete endpoint: Payment failure notification email sending failed:', emailError);
            }
          }
          // Return error response
          return res.status(500).json({ 
            message: 'Payment completion failed with Pi Network API', 
            paymentId,
            txid
          });
        }

      // If we have a transaction in our database, update it
      if (transaction) {
        // Get wallet address from Stellar Horizon API using the blockchain txid
        // This is the MOST RELIABLE way to get the user's actual wallet address
        let walletAddress = '';

        if (txid && txid.length > 10) {
          console.log(`Payment Complete endpoint: Fetching user wallet from Stellar Horizon using txid: ${txid}`);
          walletAddress = (await extractWalletAddressFromStellarTx(txid)) || '';
          if (walletAddress) {
            console.log(`Payment Complete endpoint: User wallet extracted from Stellar Horizon: ${walletAddress}`);
          }
        } else {
          console.log('Payment Complete endpoint: No txid available, cannot fetch wallet from Stellar Horizon');
        }

        if (!walletAddress) {
          console.log(`Payment Complete endpoint: Could not extract wallet address from Stellar Horizon for txid ${txid}`);
        }

        if (!walletAddress) {
          const fallbackWallet = await extractWalletAddressFromPiPaymentDetails(paymentId);
          if (fallbackWallet) {
            walletAddress = fallbackWallet;
            console.log('Payment Complete endpoint: Fallback wallet extracted from Pi payment details:', walletAddress);
          }
        }

        // If we still don't have the wallet address from Pi Network, 
        // check if we already have it stored for this user
        const existingWalletAddress = transaction?.user_wallet_address;
        if (!walletAddress && existingWalletAddress) {
          walletAddress = existingWalletAddress;
          console.log('Payment Complete endpoint: Using existing wallet address from user record:', walletAddress);
        }

        // Securely bind wallet address if available and valid
        if (walletAddress && walletAddress.trim().length > 0) {
          let duplicateOwnerUserId: string | undefined;
          try {
            const duplicateOwnerResult = await client.query(
              'SELECT id FROM app_users WHERE wallet_address = $1 AND wallet_address IS NOT NULL AND TRIM(wallet_address) != \'\' AND id <> $2 LIMIT 1',
              [walletAddress, transaction.user_id]
            );
            duplicateOwnerUserId = duplicateOwnerResult.rows[0]?.id;
          } catch (dupErr) {
            console.error('Payment Complete endpoint: Error checking duplicate wallet:', dupErr);
          }

          const isUserAdmin = isOwnerPiUID(transaction.user_pi_uid);
          const decision = evaluateWalletBinding({
            incomingWalletAddress: walletAddress,
            currentWalletAddress: existingWalletAddress,
            duplicateOwnerUserId,
            authenticatedUserId: transaction.user_id,
            isAdminUser: isUserAdmin,
            allowWalletUpdate: true,
          });

          if (decision.allowed && decision.action === 'allow') {
            try {
              console.log('Payment Complete endpoint: Updating user wallet address in database:', {
                userId: transaction.user_id,
                walletAddress: walletAddress.substring(0, 16) + '...'
              });
              
              await client.query(
                'UPDATE app_users SET wallet_address = $1, wallet_verified_at = NOW(), wallet_verified_txid = $2, wallet_verified_payment_id = $3, updated_at = NOW() WHERE id = $4',
                [walletAddress, txid || null, paymentId, transaction.user_id]
              );
            } catch (updateError) {
              console.error('Payment Complete endpoint: Failed to update user wallet address:', updateError);
            }
          } else if (!decision.allowed) {
            console.warn('Payment Complete endpoint: Wallet binding skipped for user', {
              userId: transaction.user_id,
              walletAddress,
              reason: decision.reason
            });
            // Do NOT abort the payment completion with 409 since the blockchain payment is already completed!
          }
        } else {
          console.log('Payment Complete endpoint: No wallet address available for user:', {
            userId: transaction.user_id,
            hasStoredAddress: !!transaction.user_wallet_address
          });
        }

        // Update transaction with txid and completed status only if Pi Network completion was successful
        if (completed) {
          await client.query(
            'UPDATE app_transactions SET status = $1, txid = $2, success_reason = $3, updated_at = NOW() WHERE id = $4',
            ['completed', txid, 'Payment successfully completed with Pi Network', transaction.id]
          );
          console.log('Payment Complete endpoint: Transaction completed successfully', { transactionId: transaction.id });

          if (transaction.payment_type === 'SUBSCRIPTION' || transaction.metadata?.type === 'subscription') {
            try {
              const subscriptionDetails = transaction.metadata?.subscriptionDetails || {};
              const subscriptionType = subscriptionDetails.subscriptionType || transaction.metadata?.subscriptionType || 'weekly';
              const durationDays = subscriptionType === 'monthly' ? 30 : 7;
              await client.query(
                `INSERT INTO pi_subscriptions (
                  user_id,
                  package_id,
                  sub_id,
                  auto_renew,
                  status,
                  expires_at,
                  last_processed_at,
                  user_name,
                  user_email,
                  user_phone,
                  user_game_ign,
                  user_game_uid,
                  user_team_name,
                  subscription_type,
                  subscription_name,
                  subscription_duration,
                  amount_pi,
                  created_at,
                  updated_at
                ) VALUES (
                  $1, $2, $3, false, 'active', NOW() + ($4 * interval '1 day'), NOW(),
                  $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
                )
                ON CONFLICT (sub_id) DO UPDATE SET
                  status = 'active',
                  expires_at = EXCLUDED.expires_at,
                  last_processed_at = NOW(),
                  user_name = EXCLUDED.user_name,
                  user_email = EXCLUDED.user_email,
                  user_phone = EXCLUDED.user_phone,
                  user_game_ign = EXCLUDED.user_game_ign,
                  user_game_uid = EXCLUDED.user_game_uid,
                  user_team_name = EXCLUDED.user_team_name,
                  subscription_type = EXCLUDED.subscription_type,
                  subscription_name = EXCLUDED.subscription_name,
                  subscription_duration = EXCLUDED.subscription_duration,
                  amount_pi = EXCLUDED.amount_pi,
                  updated_at = NOW()`,
                [
                  transaction.user_id,
                  transaction.package_id || null,
                  paymentId,
                  durationDays,
                  subscriptionDetails.userName || null,
                  subscriptionDetails.userEmail || null,
                  subscriptionDetails.userPhone || subscriptionDetails.contactNumber || null,
                  subscriptionDetails.userGameIgn || null,
                  subscriptionDetails.userGameUid || null,
                  subscriptionDetails.userTeamName || null,
                  subscriptionType,
                  subscriptionDetails.subscriptionName || null,
                  subscriptionDetails.subscriptionDuration || null,
                  transaction.pi_amount,
                ]
              );
              console.log('Payment Complete endpoint: Subscription activated', {
                userId: transaction.user_id,
                paymentId,
                subscriptionType,
              });
            } catch (subscriptionError) {
              console.error('Payment Complete endpoint: Failed to activate subscription record:', subscriptionError);
            }
          }
          releasePaymentClient();
          
          // Process purchase rewards - Add tokens based on successful purchase count
          try {
            console.log('Payment Complete endpoint: Processing purchase rewards for user', transaction.user_id);
            
            // Import the purchase reward service
            const { PurchaseRewardService } = await import('../server/services/purchase-reward.js');
            
            // Process the completed purchase and award tokens if milestone reached
            const rewardResult = await PurchaseRewardService.processCompletedPurchase(
              transaction.user_id,
              transaction.id
            );
            
            if (rewardResult.success && rewardResult.tokensAwarded && rewardResult.tokensAwarded > 0) {
              console.log('Payment Complete endpoint: Purchase reward processed successfully:', {
                userId: transaction.user_id,
                tokensAwarded: rewardResult.tokensAwarded,
                milestone: rewardResult.milestone,
                message: rewardResult.message
              });
              
              // Optionally send notification email about the reward
              try {
                const { sendPurchaseRewardEmail } = await import('../dist/server/services/email-robust.js');
                await sendPurchaseRewardEmail({
                  to: transaction.user_email,
                  username: transaction.user_username,
                  tokensAwarded: rewardResult.tokensAwarded,
                  milestone: rewardResult.milestone || 0,
                  totalPurchases: rewardResult.message.match(/\d+ successful purchases/) ? 
                    parseInt(rewardResult.message.match(/\d+/)?.[0] || '0') : 0,
                  transactionId: transaction.id
                });
                console.log('Payment Complete endpoint: Reward notification email sent to user:', transaction.user_email);
              } catch (emailError) {
                console.error('Payment Complete endpoint: Failed to send reward notification email:', emailError);
                // Don't fail the transaction if email fails
              }
            } else {
              console.log('Payment Complete endpoint: No milestone reward for this purchase:', rewardResult.message);
            }
          } catch (rewardError) {
            console.error('Payment Complete endpoint: Error processing purchase rewards:', rewardError);
            // Don't fail the transaction if reward processing fails
          }

          try {
            const redemptionResult = await applyCouponRedemptionForTransaction(transaction.id);
            console.log('Payment Complete endpoint: Marketing coupon redemption result:', redemptionResult);
          } catch (marketingError) {
            console.error('Payment Complete endpoint: Error applying marketing coupon redemption:', marketingError);
            // Do not fail transaction completion if coupon redemption fails
          }

          // Dispatch In-App Notification (Pi Network v2 push notification)
          if (transaction.user_pi_uid) {
            sendPiInAppNotification({
              title: 'Payment Confirmed! 🎮',
              body: `Your payment of ${transaction.pi_amount} Pi has been confirmed. Thank you!`,
              user_uid: transaction.user_pi_uid,
              subroute: '/dashboard'
            }).catch((err: any) => console.warn('Payment Complete endpoint: Non-blocking in-app notification error:', err?.message || err));
          }
        } else {
          console.log('Payment Complete endpoint: Pi Network completion was not successful, transaction remains in current status', { transactionId: transaction.id });
        }

        releasePaymentClient();

        // Send confirmation emails only for successful transactions using robust email service
        try {
          // Load the robust email service from source so local fixes apply immediately
          const { sendTransactionEmails, sendAdminPurchaseNotificationWithRetry } = await import('../server/services/email-robust.js');
          const emailClient = await pool.connect();

          try {
            console.log('Payment Complete endpoint: Attempting to send all transaction emails with robust service');
            const emailResult = await sendTransactionEmails(transaction, emailClient, 'completed');

            if (emailResult) {
              console.log('Payment Complete endpoint: All transaction emails sent successfully');
            } else {
              console.log('Payment Complete endpoint: Some or all transaction emails failed to send');
            }
          } finally {
            emailClient.release();
          }
        } catch (emailError) {
          console.error('Payment Complete endpoint: Robust email sending failed:', emailError);
          // Fallback: attempt direct admin notification so admins still get notified
          try {
            const { getDefaultAdminEmails } = await import('../server/services/email-robust.js');
            const adminEmails = getDefaultAdminEmails();
            if (adminEmails.length > 0) {
              console.log('Payment Complete endpoint: Fallback sending admin notifications to', adminEmails);
              let fallbackAdminSentCount = 0;
              for (const adminEmail of adminEmails) {
                try {
                  const { sendAdminPurchaseNotification } = await import('../server/services/email.js');
                  await sendAdminPurchaseNotification({
                    adminEmail,
                    username: transaction.user_username,
                    userEmail: transaction.user_email,
                    userPhone: transaction.user_phone || 'Not provided',
                    packageName: transaction.package_name,
                    game: transaction.package_game,
                    inGameAmount: transaction.package_in_game_amount,
                    piAmount: transaction.pi_amount,
                    usdAmount: transaction.usd_amount,
                    gameAccount: transaction.game_account || 'Not provided',
                    transactionId: transaction.id,
                    paymentId: transaction.payment_id,
                    txid: transaction.txid
                  });
                  fallbackAdminSentCount++;
                  console.log('Payment Complete endpoint: Fallback admin email sent to', adminEmail);
                } catch (fallbackErr) {
                  console.error('Payment Complete endpoint: Fallback admin email failed for', adminEmail, fallbackErr);
                }
              }
              // Mark admin_email_sent if at least one fallback succeeded
              if (fallbackAdminSentCount > 0) {
                try {
                  await client.query(
                    'UPDATE app_transactions SET admin_email_sent = true, updated_at = NOW() WHERE id = $1',
                    [transaction.id]
                  );
                  console.log('Payment Complete endpoint: admin_email_sent flag set (fallback path)');
                } catch (updateErr) {
                  console.error('Payment Complete endpoint: Failed to set admin_email_sent flag (fallback):', updateErr);
                }
              }
            } else {
              console.warn('Payment Complete endpoint: No fallback admin emails configured');
            }
          } catch (fallbackError) {
            console.error('Payment Complete endpoint: Fallback admin notification failed:', fallbackError);
          }
        }

        if (completed) {
          res.status(200).json({ success: true, transactionId: transaction.id, txid });
        } else {
          // Even if Pi Network completion failed, we should still return a response
          res.status(500).json({ 
            success: false, 
            message: 'Payment completion failed with Pi Network API', 
            paymentId,
            txid
          });
        }
      } else {
        // If we don't have a transaction in our database, still return success
        // since we successfully completed the payment with Pi Network
        console.log('Payment Complete endpoint: Payment completed with Pi Network, no database transaction to update');
        res.status(200).json({ success: true, message: 'Payment completed successfully with Pi Network' });
      }
    } finally {
      releasePaymentClient();
    }
  } catch (error: any) {
    console.error('Payment Complete endpoint: Completion error:', error);
    res.status(500).json({ 
      message: 'Payment completion failed', 
      error: error.message 
    });
  }
}

// Handler for manually updating transaction status (for debugging purposes)
async function handleUpdateTransactionStatus(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { transactionId, status, txid } = req.body;
    
    if (!transactionId || !status) {
      return res.status(400).json({ message: "Transaction ID and status are required" });
    }

    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();

    // Update transaction status
    const updateData: any = { status, updatedAt: new Date() };
    if (txid) {
      updateData.txid = txid;
    }
    
    const updatedTransaction = await storage.updateTransaction(transactionId, updateData);
    
    if (!updatedTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    console.log('Transaction status updated manually:', { transactionId, status, txid });
    return res.status(200).json({ 
      message: "Transaction status updated successfully",
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Update transaction status error:', error);
    return res.status(500).json({ 
      message: "Failed to update transaction status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// Handler for syncing transaction statuses with Pi Network
async function handleSyncTransactionStatuses(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Sync Transaction Statuses endpoint: Starting transaction status sync');
    
    // Only proceed if we have a real Pi Server API Key
    if (!isPiServerConfigured()) {
      console.log('Sync Transaction Statuses endpoint: Pi Server API Key not configured');
      return res.status(400).json({ message: "Pi Server API Key not configured" });
    }

    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();
    
    // Load Pi Network service dynamically
    const piNetworkModule = await import('../dist/server/services/pi-network.js');
    const piNetworkService = piNetworkModule.piNetworkService;

    // Get all pending transactions from database
    const pendingTransactions = await storage.getPendingTransactions();
    console.log('Sync Transaction Statuses endpoint: Found', pendingTransactions.length, 'pending transactions');
    
    let updatedCount = 0;
    
    // Check each pending transaction with Pi Network
    for (const transaction of pendingTransactions) {
      try {
        console.log('Sync Transaction Statuses endpoint: Checking status for transaction', transaction.id, transaction.paymentId);
        
        // Get payment details from Pi Network
        const paymentDetails = await piNetworkService.getPayment(transaction.paymentId);
        
        if (!paymentDetails) {
          console.log('Sync Transaction Statuses endpoint: Could not fetch payment details for', transaction.paymentId);
          continue;
        }
        
        console.log('Sync Transaction Statuses endpoint: Payment details for', transaction.paymentId, paymentDetails.status);
        
        // Determine the correct status based on Pi Network response
        let newStatus = transaction.status; // Default to current status
        let failureReason = null; // Default to no reason
        
        if (paymentDetails.status.cancelled || paymentDetails.status.user_cancelled) {
          newStatus = 'cancelled';
          if (paymentDetails.status.cancelled) {
            failureReason = 'Payment cancelled by system';
          } else if (paymentDetails.status.user_cancelled) {
            failureReason = 'Payment cancelled by user';
          }
        } else if (paymentDetails.status.developer_completed) {
          newStatus = 'completed';
        } else if (!paymentDetails.status.developer_approved) {
          const createdTime = new Date(transaction.createdAt || new Date()).getTime();
          const currentTime = Date.now();
          const timeDiffMinutes = (currentTime - createdTime) / (1000 * 60);

          if (timeDiffMinutes >= 5) {
            newStatus = 'failed';
            failureReason = 'Payment was not completed within 5 minutes. This can happen when the user leaves the Pi flow, funds are insufficient, or the network interrupted the purchase.';
          }
        }
        
        // Update database if status has changed
        if (newStatus !== transaction.status) {
          console.log('Sync Transaction Statuses endpoint: Updating transaction', transaction.id, 'from', transaction.status, 'to', newStatus);
          
          const updateData: any = { status: newStatus, updatedAt: new Date() };
          
          // If completed, also update txid and success reason
          if (newStatus === 'completed' && paymentDetails.transaction?.txid) {
            updateData.txid = paymentDetails.transaction.txid;
            updateData.successReason = 'Payment successfully completed and verified with Pi Network';
          }
          
          // If failed or cancelled, also update failure reason
          if ((newStatus === 'failed' || newStatus === 'cancelled') && failureReason) {
            updateData.failureReason = failureReason;
          }
          
          await storage.updateTransaction(transaction.id, updateData);
          updatedCount++;
          
          console.log('Sync Transaction Statuses endpoint: Transaction', transaction.id, 'updated to', newStatus);
          
          // Send transaction status emails for all statuses (failed, cancelled, completed)
          if ((newStatus === 'failed' || newStatus === 'cancelled' || newStatus === 'completed') && 
              (failureReason || newStatus === 'completed')) {
            try {
              // Get full transaction details with user and package info
              const fullTransaction = await storage.getTransaction(transaction.id);
              if (fullTransaction) {
                console.log('Sync Transaction Statuses endpoint: Attempting to send transaction status emails for:', newStatus);
                // Import and use the unified transaction email service
                // Pass null as the client since the email service will handle its own database connections
                const { sendTransactionStatusEmails } = await import('../dist/server/services/transaction-emails.js');
                const emailResult = await sendTransactionStatusEmails(fullTransaction, null, newStatus);
                
                if (emailResult) {
                  console.log('Sync Transaction Statuses endpoint: Transaction status emails sent successfully for:', newStatus);
                } else {
                  console.log('Sync Transaction Statuses endpoint: Failed to send transaction status emails for:', newStatus);
                }
              } else {
                console.log('Sync Transaction Statuses endpoint: Skipping transaction status emails - could not get transaction details');
              }
            } catch (emailError) {
              console.error('Sync Transaction Statuses endpoint: Transaction status email sending failed:', emailError);
            }
          }
        } else {
          console.log('Sync Transaction Statuses endpoint: Transaction', transaction.id, 'status unchanged');
        }
      } catch (error) {
        console.error('Sync Transaction Statuses endpoint: Error checking transaction', transaction.id, error);
        // Continue with next transaction
      }
    }
    
    console.log('Sync Transaction Statuses endpoint: Sync completed, updated', updatedCount, 'transactions');
    return res.status(200).json({ 
      message: "Transaction status sync completed",
      updatedCount,
      totalChecked: pendingTransactions.length
    });
  } catch (error) {
    console.error('Sync Transaction Statuses endpoint: Sync error:', error);
    return res.status(500).json({ 
      message: "Failed to sync transaction statuses",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// Handler for payment cancellation
async function handlePaymentCancel(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    console.log('Payment Cancel endpoint: Method not allowed', req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Payment Cancel endpoint: Payment cancellation request received', {
      body: req.body,
      headers: req.headers
    });
    
    const { paymentId } = req.body;
    if (!paymentId) {
      console.log('Payment Cancel endpoint: Payment ID missing in request body', req.body);
      return res.status(400).json({ message: 'Payment ID required' });
    }

    console.log('Payment Cancel endpoint: Cancelling payment', { paymentId });

    // Update transaction status in database and retrieve full transaction details
    const client = await pool.connect();
    try {
      // First, update the transaction status
      const updateResult = await client.query(
        'UPDATE app_transactions SET status = $1, failure_reason = $2, updated_at = NOW() WHERE payment_id = $3',
        ['cancelled', 'Payment cancelled by user', paymentId]
      );
      
      if (updateResult.rowCount === 0) {
        console.log('Payment Cancel endpoint: Transaction not found for paymentId', paymentId);
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      const result = await client.query(
        'SELECT t.*, u.email as user_email, u.username as user_username, u.wallet_address as user_wallet_address, u.phone as user_phone, u.game_accounts as user_game_accounts, u.social_accounts as user_social_accounts, p.name as package_name, p.game as package_game, p.in_game_amount as package_in_game_amount FROM app_transactions t JOIN app_users u ON t.user_id = u.id LEFT JOIN app_packages p ON t.package_id = p.id WHERE t.payment_id = $1',
        [paymentId]
      );
      
      if (result.rows.length === 0) {
        console.log('Payment Cancel endpoint: Transaction not found after update for paymentId', paymentId);
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      const transaction = result.rows[0];
      console.log('Payment Cancel endpoint: Transaction updated to cancelled in database', { transactionId: transaction.id });
      
      // Send cancellation notification email to user
      try {
        if (transaction.user_email && transaction.package_name) {
          // Use the robust email service like the payment completion handler does
          const { sendTransactionStatusEmails } = await import('../dist/server/services/transaction-emails.js');
          
          console.log('Payment Cancel endpoint: Attempting to send payment cancellation notification email to user:', transaction.user_email);
          const emailResult = await sendTransactionStatusEmails(transaction, client, 'cancelled');
          
          if (emailResult) {
            console.log('Payment Cancel endpoint: Payment cancellation notification email sent successfully to user:', transaction.user_email);
          } else {
            console.log('Payment Cancel endpoint: Failed to send payment cancellation notification email to user:', transaction.user_email);
          }
        } else {
          console.log('Payment Cancel endpoint: Skipping cancellation notification email - missing user email or package name');
        }
      } catch (emailError) {
        console.error('Payment Cancel endpoint: Payment cancellation notification email sending failed:', emailError);
      }
      
      return res.status(200).json({ success: true, message: 'Payment cancelled successfully' });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Payment Cancel endpoint: Cancellation error:', error);
    res.status(500).json({ 
      message: 'Payment cancellation failed', 
      error: error.message 
    });
  }
}

// Handler for syncing transaction statuses with Pi Network using ES module service
async function handleSyncTransactionStatusesES(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    const secretHeader = req.headers['x-secret-key'];
    const cronToken = process.env.CRON_AUTH_TOKEN;
    const marketingSecret = process.env.MARKETING_EMAIL_SECRET;
    const hasValidBearer = !!cronToken && authHeader === `Bearer ${cronToken}`;
    const hasValidSecret = !!secretHeader && (secretHeader === cronToken || secretHeader === marketingSecret);

    if (!hasValidBearer && !hasValidSecret) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log('Sync Transaction Statuses ES endpoint: Starting transaction status sync');
    
    // Check if this is a test request with a specific email
    const { testEmail } = req.body || {};
    
    if (testEmail) {
      console.log('Sync Transaction Statuses ES endpoint: Test request with email', testEmail);
      
      // Load email service dynamically
      const emailModule = await import('../server/services/email.js');
      
      // Send a test email
      const testResult = await emailModule.sendPurchaseConfirmationEmail({
        to: testEmail,
        username: 'Test User',
        packageName: 'Test Package',
        piAmount: '10.00',
        usdAmount: '2.50',
        gameAccount: 'Test Game Account',
        transactionId: 'test-transaction-id',
        paymentId: 'test-payment-id',
        isTestnet: false
      });
      
      if (testResult) {
        console.log('Sync Transaction Statuses ES endpoint: Test email sent successfully to', testEmail);
        return res.status(200).json({ 
          message: "Test email sent successfully",
          email: testEmail
        });
      } else {
        console.log('Sync Transaction Statuses ES endpoint: Failed to send test email to', testEmail);
        return res.status(500).json({ 
          message: "Failed to send test email",
          email: testEmail
        });
      }
    }
    
    // Load ES module service dynamically
    const transactionSyncModule = await import('./services/transaction-sync.js');
    
    // Run the sync service
    const result = await transactionSyncModule.syncTransactionStatuses();
    
    console.log('Sync Transaction Statuses ES endpoint: Sync completed', result);
    return res.status(200).json({ 
      message: "Transaction status sync completed successfully using ES module service",
      ...result
    });
  } catch (error) {
    console.error('Sync Transaction Statuses ES endpoint: Sync error:', error);
    return res.status(500).json({ 
      message: "Failed to sync transaction statuses using ES module service",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// Handler for Leaderboard endpoint
async function handleLeaderboard(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500); // Max 500
    console.log('Leaderboard endpoint: Fetching leaderboard with limit:', limit);

    const client = await pool.connect();
    try {
      // Get top users by ranking points
      const result = await client.query(`
        SELECT 
          ur.rank,
          ur.tier,
          ur.points,
          ur.total_points,
          ur.purchase_points,
          ur.referral_points,
          ur.monthly_purchase_count,
          ur.streak_days,
          u.id as user_id,
          u.username,
          u.profile_picture,
          u.successful_purchases_count
        FROM user_rankings ur
        INNER JOIN app_users u ON ur.user_id = u.id
        ORDER BY ur.points DESC
        LIMIT $1
      `, [limit]);

      // Update ranks
      for (let i = 0; i < result.rows.length; i++) {
        await client.query(
          'UPDATE user_rankings SET rank = $1 WHERE user_id = $2',
          [i + 1, result.rows[i].user_id]
        );
        result.rows[i].rank = i + 1;
      }

      console.log('Leaderboard endpoint: Found', result.rows.length, 'ranking records');

      return res.status(200).json({
        success: true,
        leaderboard: result.rows,
        totalRecords: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Leaderboard endpoint error:', error);
    return res.status(500).json({
      message: 'Failed to fetch leaderboard',
      error: error.message
    });
  }
}

// Handler for User Ranking endpoint
async function handleUserRanking(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate JWT format before verification
    if (token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (verifyError: any) {
      console.error('JWT verification error:', verifyError.message);
      return res.status(401).json({ message: 'Invalid token signature' });
    }

    const userId = decoded.userId;
    console.log('User Ranking endpoint: Fetching ranking for user:', userId);

    const client = await pool.connect();
    try {
      // Get user's ranking data
      const result = await client.query(`
        SELECT
          ur.rank,
          ur.tier,
          ur.points,
          ur.total_points,
          ur.purchase_points,
          ur.referral_points,
          ur.monthly_purchase_count,
          ur.streak_days,
          u.username,
          u.profile_picture,
          u.successful_purchases_count
        FROM user_rankings ur
        INNER JOIN app_users u ON ur.user_id = u.id
        WHERE ur.user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'User ranking not found',
          ranking: null
        });
      }

      const userRanking = result.rows[0];
      console.log('User Ranking endpoint: Found ranking data for user:', userId);

      return res.status(200).json({
        success: true,
        ranking: userRanking
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('User Ranking endpoint error:', error);
    return res.status(500).json({
      message: 'Failed to fetch user ranking',
      error: error.message
    });
  }
}

// Handler for Recent Purchases endpoint (for social proof on dashboard)
async function handleRecentPurchases(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  setShortCacheHeaders(res);

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50
    console.log('Recent Purchases endpoint: Fetching recent purchases with limit:', limit);

    const client = await pool.connect();
    try {
      // Public home feed: show recent purchases from all users, but keep wallet history private.
      const result = await client.query(`
        SELECT 
          t.id,
          t.created_at,
          u.username,
          COALESCE(pkg.name, CASE WHEN t.payment_type = 'TOURNAMENT_ENTRY' THEN 'Tournament Entry' ELSE 'Unknown' END) as package_name,
          COALESCE(pkg.game, CASE WHEN t.payment_type = 'TOURNAMENT_ENTRY' THEN 'PUBG' ELSE 'Unknown' END) as platform,
          t.pi_amount,
          t.status,
          u.username as display_name
        FROM app_transactions t
        INNER JOIN app_users u ON t.user_id = u.id
        LEFT JOIN app_packages pkg ON t.package_id = pkg.id
        WHERE (
          trim(lower(t.status)) IN ('completed', 'approved')
          OR (
            t.created_at > NOW() - INTERVAL '7 days'
            AND trim(lower(t.status)) NOT IN ('failed', 'cancelled')
          )
        )
        ORDER BY t.created_at DESC
        LIMIT $1
      `, [limit]);

      console.log('Recent Purchases endpoint: Found', result.rows.length, 'recent purchases');
      try {
        console.log('Recent Purchases endpoint: Sample IDs:', result.rows.slice(0, 5).map((r: any) => r.id));
      } catch (e) {
        console.log('Recent Purchases endpoint: Failed to log sample IDs', e);
      }

      const recentPurchasesList = result.rows.map((row: {
        id: string;
        display_name: string;
        package_name: string;
        platform: string;
        pi_amount: string;
        created_at: string | Date;
      }) => ({
        id: row.id,
        displayName: row.display_name,
        packageName: row.package_name,
        platform: row.platform,
        piAmount: row.pi_amount,
        createdAt: row.created_at,
        timeAgo: getTimeAgo(new Date(row.created_at))
      }));

      return res.status(200).json({
        success: true,
        recentPurchases: recentPurchasesList,
        totalCount: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Recent Purchases endpoint error:', error);
    return res.status(500).json({
      message: 'Failed to fetch recent purchases',
      error: error.message
    });
  }
}

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  return date.toLocaleDateString();
}

let tournamentTablesReady: Promise<void> | null = null;
const TOURNAMENT_PLATFORM_FEE_RATE = 0.05;

function slugifyTournamentTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `tournament-${Date.now()}`;
}

function mapTournament(row: any) {
  const computedPrizePool = row.computed_prize_pool_pi ?? row.prize_pool_pi;
  
  let mappedStatus = row.status;
  const now = new Date();
  const rawStatus = String(row.status || '').toLowerCase();
  
  if (!['completed', 'cancelled', 'ended'].includes(rawStatus)) {
    if (row.starts_at && new Date(row.starts_at) <= now) {
      mappedStatus = 'in_progress';
    } else if (row.registration_closes_at && new Date(row.registration_closes_at) <= now) {
      mappedStatus = 'registration_closed';
    }
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    game: row.game,
    mode: row.mode,
    teamSize: row.team_size,
    registrationFeePi: row.registration_fee_pi,
    prizePoolPi: computedPrizePool,
    platformFeeRate: TOURNAMENT_PLATFORM_FEE_RATE,
    platformFeePi: row.platform_fee_pi,
    paidEntries: row.paid_entries,
    status: mappedStatus,
    maxParticipants: row.max_participants,
    startsAt: row.starts_at,
    registrationClosesAt: row.registration_closes_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureTournamentStatusIsCurrentPg(row: any, client?: PoolClient) {
  if (!row) return row;
  const status = String(row.status || '').toLowerCase();
  const now = new Date();
  const startsAt = row.starts_at ? new Date(row.starts_at) : null;
  const registrationClosesAt = row.registration_closes_at ? new Date(row.registration_closes_at) : null;

  let newStatus = row.status;

  if (startsAt && startsAt <= now) {
    if (!['in_progress', 'completed', 'ended', 'cancelled'].includes(status)) {
      newStatus = 'in_progress';
    }
  } else if (registrationClosesAt && registrationClosesAt <= now) {
    if (['registration_open', 'published'].includes(status)) {
      newStatus = 'registration_closed';
    }
  }

  if (newStatus !== row.status) {
    try {
      const executor = client ?? pool;
      await executor.query(
        `UPDATE tournaments SET status = $1, updated_at = now() WHERE id = $2`,
        [newStatus, row.id]
      );
      row.status = newStatus;
    } catch (err) {
      console.error('Failed to auto-update tournament status in db:', err);
    }
  }
  return row;
}

async function deleteIfTournamentTableExists(client: any, table: string, condition: string, tournamentId: string) {
  const exists = await client.query(`SELECT to_regclass($1) AS table_name`, [`public.${table}`]);
  if (!exists.rows[0]?.table_name) return;
  await client.query(`DELETE FROM ${table} WHERE ${condition}`, [tournamentId]);
}

function mapMatch(row: any) {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    lobbyId: row.lobby_id,
    matchNumber: row.match_number,
    status: row.status,
    mapName: row.map_name,
    roomCode: row.room_code,
    roomPassword: row.room_password,
    scheduledAt: row.scheduled_at,
  };
}

function mapLobby(row: any) {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    mapName: row.map_name,
    roomCode: row.room_code,
    roomPassword: row.room_password,
    status: row.status,
    createdAt: row.created_at,
  };
}

function isMissingTournamentTableError(error: any) {
  return error?.code === '42P01' && /tournament/i.test(String(error?.message || ''));
}

async function ensureTournamentTables(client?: PoolClient) {
  if (!tournamentTablesReady) {
    tournamentTablesReady = (async () => {
      // Always use pool directly to prevent connection leaks
      // Never hold a passed client during schema initialization
      const executor = pool;
      await executor.query(`
        CREATE TABLE IF NOT EXISTS tournaments (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL,
          slug text NOT NULL UNIQUE,
          description text NOT NULL,
          game text NOT NULL,
          mode text NOT NULL CHECK (mode IN ('solo', 'duo', 'squad')),
          format text NOT NULL DEFAULT 'elimination',
          skill_level text NOT NULL DEFAULT 'open',
          status text NOT NULL DEFAULT 'draft',
          visibility text NOT NULL DEFAULT 'public',
          max_participants integer NOT NULL,
          min_participants integer NOT NULL DEFAULT 2,
          team_size integer NOT NULL DEFAULT 1,
          registration_fee_pi numeric(18,8) NOT NULL DEFAULT 0,
          prize_pool_pi numeric(18,8) NOT NULL DEFAULT 0,
          currency text NOT NULL DEFAULT 'PI',
          rules text,
          region text NOT NULL DEFAULT 'global',
          platform text NOT NULL DEFAULT 'mobile',
          room_settings jsonb DEFAULT '{}'::jsonb,
          stream_settings jsonb DEFAULT '{}'::jsonb,
          metadata jsonb DEFAULT '{}'::jsonb,
          registration_opens_at timestamp,
          registration_closes_at timestamp,
          check_in_opens_at timestamp,
          starts_at timestamp NOT NULL DEFAULT now(),
          ends_at timestamp,
          created_by varchar REFERENCES app_users(id),
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS tournament_teams (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          name text NOT NULL,
          captain_user_id varchar NOT NULL REFERENCES app_users(id),
          invite_code text NOT NULL UNIQUE,
          status text NOT NULL DEFAULT 'forming',
          seed integer,
          average_elo integer NOT NULL DEFAULT 1000,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS tournament_team_members (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          team_id varchar NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
          user_id varchar NOT NULL REFERENCES app_users(id),
          role text NOT NULL DEFAULT 'member',
          status text NOT NULL DEFAULT 'active',
          joined_at timestamp DEFAULT now(),
          UNIQUE (team_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS tournament_registrations (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          user_id varchar NOT NULL REFERENCES app_users(id),
          team_id varchar REFERENCES tournament_teams(id),
          status text NOT NULL DEFAULT 'pending_payment',
          payment_status text NOT NULL DEFAULT 'unpaid',
          payment_id text,
          transaction_id varchar REFERENCES app_transactions(id),
          paid_amount_pi numeric(18,8) NOT NULL DEFAULT 0,
          registered_at timestamp DEFAULT now(),
          cancelled_at timestamp,
          metadata jsonb DEFAULT '{}'::jsonb,
          UNIQUE (tournament_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS tournament_lobbies (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          match_id varchar,
          name text NOT NULL,
          map_name text,
          room_code text,
          room_password text,
          status text NOT NULL DEFAULT 'waiting',
          capacity integer NOT NULL DEFAULT 100,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS tournament_matches (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          lobby_id varchar REFERENCES tournament_lobbies(id),
          round integer NOT NULL DEFAULT 1,
          match_number integer NOT NULL DEFAULT 1,
          status text NOT NULL DEFAULT 'scheduled',
          room_code text,
          room_password text,
          map_name text,
          scheduled_at timestamp,
          started_at timestamp,
          completed_at timestamp,
          stream_url text,
          vod_url text,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS tournament_match_results (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          match_id varchar NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
          team_id varchar REFERENCES tournament_teams(id),
          placement integer,
          kills integer NOT NULL DEFAULT 0,
          wwcd integer NOT NULL DEFAULT 0,
          placement_points integer NOT NULL DEFAULT 0,
          points_awarded integer NOT NULL DEFAULT 0,
          prize_pi numeric(18,8) NOT NULL DEFAULT 0,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp DEFAULT now()
        );

        -- Migrate wwcd column from boolean to integer if needed
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tournament_match_results'
              AND column_name = 'wwcd'
              AND data_type = 'boolean'
          ) THEN
            ALTER TABLE tournament_match_results ALTER COLUMN wwcd TYPE integer USING (CASE WHEN wwcd THEN 1 ELSE 0 END);
            ALTER TABLE tournament_match_results ALTER COLUMN wwcd SET DEFAULT 0;
          END IF;
        END $$;

        -- Add prize_pi column if missing
        ALTER TABLE tournament_match_results ADD COLUMN IF NOT EXISTS prize_pi numeric(18,8) NOT NULL DEFAULT 0;

        CREATE TABLE IF NOT EXISTS tournament_leaderboards (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          team_id varchar REFERENCES tournament_teams(id),
          rank integer NOT NULL,
          total_points integer NOT NULL DEFAULT 0,
          total_kills integer NOT NULL DEFAULT 0,
          matches_played integer NOT NULL DEFAULT 0,
          wwcd_count integer NOT NULL DEFAULT 0,
          updated_at timestamp DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS tournament_scoring_rules (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          placement integer NOT NULL,
          placement_points integer NOT NULL DEFAULT 0,
          kill_points integer NOT NULL DEFAULT 1,
          mvp_bonus_points integer NOT NULL DEFAULT 0,
          created_at timestamp DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
        CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game);
        CREATE INDEX IF NOT EXISTS idx_tournament_lobbies_tournament ON tournament_lobbies(tournament_id);
        CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_round ON tournament_matches(tournament_id, round);
        CREATE INDEX IF NOT EXISTS idx_tournament_match_results_match ON tournament_match_results(match_id);
        CREATE INDEX IF NOT EXISTS idx_tournament_leaderboards_tournament ON tournament_leaderboards(tournament_id);

        ALTER TABLE tournament_lobbies ADD COLUMN IF NOT EXISTS map_name text;
        ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS map_name text;
      `);
    })();
  }

  // Add timeout to prevent indefinite waits - schemas should be created quickly
  return Promise.race([
    tournamentTablesReady,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Tournament table initialization timeout')), 10000)
    )
  ]);
}

async function handleTournaments(req: VercelRequest, res: VercelResponse) {
  setNoStoreHeaders(res);

  if (!['GET', 'POST'].includes(req.method || '')) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (req.method === 'POST') {
      await ensureTournamentTables();

      const auth = await verifyAdminRequest(req);
      if (!auth.ok) {
        return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
      }

      const body = (req.body || {}) as any;
      const title = String(body.title || '').trim();
      const description = String(body.description || '').trim();
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      const mode = ['solo', 'duo', 'squad'].includes(String(body.mode)) ? String(body.mode) : 'squad';
      const teamSize = Number(body.teamSize || (mode === 'solo' ? 1 : mode === 'duo' ? 2 : 4));
      const maxParticipants = Number(body.maxParticipants || 50);
      const registrationFeePi = Number(body.registrationFeePi || 0);
      const startsAt = body.startsAt ? new Date(String(body.startsAt)) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (Number.isNaN(startsAt.getTime())) {
        return res.status(400).json({ error: 'Valid tournament date and time are required' });
      }
      const registrationClosesAt = body.registrationClosesAt
        ? new Date(String(body.registrationClosesAt))
        : new Date(startsAt.getTime() - 60 * 60 * 1000);
      if (Number.isNaN(registrationClosesAt.getTime())) {
        return res.status(400).json({ error: 'Valid registration close date and time are required' });
      }
      const projectedPrizePoolPi = Number((maxParticipants * registrationFeePi * (1 - TOURNAMENT_PLATFORM_FEE_RATE)).toFixed(8));
      const id = randomUUID();
      const slug = `${slugifyTournamentTitle(title)}-${id.slice(0, 8)}`;

      const insertResult = await pool.query(
        `INSERT INTO tournaments (
          id, title, slug, description, game, mode, status, max_participants,
          team_size, registration_fee_pi, prize_pool_pi, starts_at, registration_closes_at,
          created_by, metadata, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'registration_open', $7,
          $8, $9, $10, $11, $12,
          $13, $14::jsonb, now(), now()
        ) RETURNING *`,
        [
          id,
          title,
          slug,
          description,
          String(body.game || 'PUBG'),
          mode,
          maxParticipants,
          teamSize,
          registrationFeePi,
          projectedPrizePoolPi,
          startsAt,
          registrationClosesAt,
          auth.userId || null,
          JSON.stringify({ source: 'admin-panel', platformFeeRate: TOURNAMENT_PLATFORM_FEE_RATE }),
        ],
      );

      return res.status(201).json({ success: true, tournament: mapTournament(insertResult.rows[0]) });
    }

    let result;
    try {
      result = await pool.query(
        `SELECT t.*,
                COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) AS collected_entry_pi,
                COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') AS paid_entries,
                CASE
                  WHEN COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') > 0
                  THEN ROUND((COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) * ${1 - TOURNAMENT_PLATFORM_FEE_RATE})::numeric, 8)
                  ELSE t.prize_pool_pi
                END AS computed_prize_pool_pi,
                ROUND((COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) * ${TOURNAMENT_PLATFORM_FEE_RATE})::numeric, 8) AS platform_fee_pi
         FROM tournaments t
         LEFT JOIN tournament_registrations r ON r.tournament_id = t.id
         GROUP BY t.id
         ORDER BY t.starts_at DESC NULLS LAST, t.created_at DESC`
      );
    } catch (error: any) {
      if (!isMissingTournamentTableError(error)) {
        throw error;
      }

      await ensureTournamentTables();
      result = await pool.query(
        `SELECT t.*,
                COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) AS collected_entry_pi,
                COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') AS paid_entries,
                CASE
                  WHEN COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') > 0
                  THEN ROUND((COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) * ${1 - TOURNAMENT_PLATFORM_FEE_RATE})::numeric, 8)
                  ELSE t.prize_pool_pi
                END AS computed_prize_pool_pi,
                ROUND((COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) * ${TOURNAMENT_PLATFORM_FEE_RATE})::numeric, 8) AS platform_fee_pi
         FROM tournaments t
         LEFT JOIN tournament_registrations r ON r.tournament_id = t.id
         GROUP BY t.id
         ORDER BY t.starts_at DESC NULLS LAST, t.created_at DESC`
      );
    }

    const updatedRows = await Promise.all(result.rows.map((row) => ensureTournamentStatusIsCurrentPg(row)));
    return res.status(200).json(updatedRows.map(mapTournament));
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch tournaments', details: error.message });
  }
}

async function resolveTournamentId(idOrSlug: string, client?: PoolClient) {
  if (!idOrSlug) {
    return null;
  }
  await ensureTournamentTables();
  const executor = client ?? pool;
  const result = await executor.query(
    `SELECT id FROM tournaments WHERE id = $1::text OR lower(slug) = lower($1::text) OR lower(slug) LIKE lower($1::text) || '-%' ORDER BY created_at DESC LIMIT 1`,
    [idOrSlug]
  );
  return result.rows[0]?.id ?? null;
}

async function handleTournamentById(req: VercelRequest, res: VercelResponse, tournamentId: string, providedClient?: PoolClient) {
  if (req.method === 'GET') {
    setShortCacheHeaders(res);
  } else {
    setNoStoreHeaders(res);
  }

  if (!['GET', 'PATCH', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const client = providedClient ?? await pool.connect();
  const releaseClient = !providedClient;

  try {
    if (req.method === 'DELETE') {
      const auth = await verifyAdminRequest(req);
      if (!auth.ok) {
        return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
      }
      await ensureTournamentTables(client);
      try {
        await client.query('BEGIN');
        await deleteIfTournamentTableExists(client, 'tournament_room_access_logs', 'room_id IN (SELECT id FROM tournament_match_rooms WHERE tournament_id = $1::text::text::text)', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_match_participants', 'match_id IN (SELECT id FROM tournament_matches WHERE tournament_id = $1::text::text::text)', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_match_results', 'match_id IN (SELECT id FROM tournament_matches WHERE tournament_id = $1::text::text::text)', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_team_members', 'team_id IN (SELECT id FROM tournament_teams WHERE tournament_id = $1::text::text::text)', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_prize_distributions', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_payments', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_refunds', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_check_ins', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_matches', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_lobbies', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_leaderboards', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_streams', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_media', 'tournament_id = $1::text::text', tournamentId);
        // tournament chat messages table removed; skipping deletion step
        await deleteIfTournamentTableExists(client, 'tournament_notifications', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_invites', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_analytics', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_roster_players', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_match_rooms', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_scoring_rules', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_mvp_awards', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_history', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_registrations', 'tournament_id = $1::text::text', tournamentId);
        await deleteIfTournamentTableExists(client, 'tournament_teams', 'tournament_id = $1::text::text', tournamentId);
        const deleted = await client.query(`DELETE FROM tournaments WHERE id = $1 RETURNING id`, [tournamentId]);
        if (deleted.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Tournament not found' });
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      return res.status(200).json({ success: true, deletedId: tournamentId });
    }

    if (req.method === 'PATCH') {
      const auth = await verifyAdminRequest(req);
      if (!auth.ok) {
        return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
      }

      await ensureTournamentTables(client);
      const body = (req.body || {}) as any;
      const mode = ['solo', 'duo', 'squad'].includes(String(body.mode)) ? String(body.mode) : undefined;
      const teamSize = mode ? (mode === 'solo' ? 1 : mode === 'duo' ? 2 : 4) : undefined;
      const startsAt = body.startsAt ? new Date(String(body.startsAt)) : undefined;
      if (startsAt && Number.isNaN(startsAt.getTime())) {
        return res.status(400).json({ error: 'Valid tournament date and time are required' });
      }
      const fields: string[] = [];
      const values: any[] = [];
      const addField = (column: string, value: any) => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
      };

      if (body.title) addField('title', String(body.title).trim());
      if (body.description) addField('description', String(body.description).trim());
      if (mode) {
        addField('mode', mode);
        addField('team_size', teamSize);
      }
      if (body.registrationFeePi !== undefined) addField('registration_fee_pi', Number(body.registrationFeePi));
      if (body.maxParticipants !== undefined) addField('max_participants', Number(body.maxParticipants));
      if (startsAt) {
        addField('starts_at', startsAt);
        addField('registration_closes_at', new Date(startsAt.getTime() - 60 * 60 * 1000));
      }
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No tournament changes provided' });
      }

      values.push(tournamentId);
      const updateResult = await client.query(
        `UPDATE tournaments SET ${fields.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
        values,
      );
      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      return res.status(200).json({ success: true, tournament: mapTournament(updateResult.rows[0]) });
    }

    let tournamentResult;
    try {
      tournamentResult = await client.query(
        `SELECT t.*,
                COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) AS collected_entry_pi,
                COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') AS paid_entries,
                CASE
                  WHEN COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') > 0
                  THEN ROUND((COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) * ${1 - TOURNAMENT_PLATFORM_FEE_RATE})::numeric, 8)
                  ELSE t.prize_pool_pi
                END AS computed_prize_pool_pi,
                ROUND((COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) * ${TOURNAMENT_PLATFORM_FEE_RATE})::numeric, 8) AS platform_fee_pi
         FROM tournaments t
         LEFT JOIN tournament_registrations r ON r.tournament_id = t.id
         WHERE t.id = $1
         GROUP BY t.id
         LIMIT 1`,
        [tournamentId],
      );
    } catch (error: any) {
      if (!isMissingTournamentTableError(error)) {
        throw error;
      }

      await ensureTournamentTables(client);
      tournamentResult = await client.query(
        `SELECT t.*,
                COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) AS collected_entry_pi,
                COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') AS paid_entries,
                CASE
                  WHEN COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') > 0
                  THEN ROUND((COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) * ${1 - TOURNAMENT_PLATFORM_FEE_RATE})::numeric, 8)
                  ELSE t.prize_pool_pi
                END AS computed_prize_pool_pi,
                ROUND((COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.paid_amount_pi ELSE 0 END), 0) * ${TOURNAMENT_PLATFORM_FEE_RATE})::numeric, 8) AS platform_fee_pi
         FROM tournaments t
         LEFT JOIN tournament_registrations r ON r.tournament_id = t.id
         WHERE t.id = $1
         GROUP BY t.id
         LIMIT 1`,
        [tournamentId],
      );
    }

    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const freshRow = await ensureTournamentStatusIsCurrentPg(tournamentResult.rows[0], client);

    let matchesResult;
    let lobbiesResult;
    let teamsResult;
    let leaderboardResult;
    try {
      matchesResult = await client.query(
        `SELECT id, tournament_id, lobby_id, match_number, status, map_name, room_code, room_password, scheduled_at
         FROM tournament_matches WHERE tournament_id = $1::text::text::text ORDER BY round, match_number`,
        [tournamentId]
      );
      lobbiesResult = await client.query(
        `SELECT id, tournament_id, name, map_name, room_code, room_password, status, created_at
         FROM tournament_lobbies WHERE tournament_id = $1::text::text::text ORDER BY created_at DESC`,
        [tournamentId]
      );
      teamsResult = await client.query(
        `SELECT t.id, t.name, t.captain_user_id AS "captainUserId", t.status,
                COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') AS paid_registrations,
                COUNT(r.id) AS total_registrations
         FROM tournament_teams t
         LEFT JOIN tournament_registrations r ON r.team_id = t.id AND r.tournament_id = $1::text::text
         WHERE t.tournament_id = $1::text::text
         GROUP BY t.id, t.name, t.captain_user_id, t.status
         ORDER BY t.name`,
        [tournamentId],
      );
      leaderboardResult = await client.query(
        `SELECT team_id AS "teamId", rank, total_points AS "totalPoints", total_kills AS "totalKills", matches_played AS "matchesPlayed", wwcd_count AS "wwcdCount"
         FROM tournament_leaderboards
         WHERE tournament_id = $1::text::text::text
         ORDER BY rank`,
        [tournamentId],
      );
    } catch (error: any) {
      if (!isMissingTournamentTableError(error)) {
        throw error;
      }

      await ensureTournamentTables(client);
      matchesResult = await client.query(
        `SELECT id, tournament_id, lobby_id, match_number, status, map_name, room_code, room_password, scheduled_at
         FROM tournament_matches WHERE tournament_id = $1::text::text::text ORDER BY round, match_number`,
        [tournamentId]
      );
      lobbiesResult = await client.query(
        `SELECT id, tournament_id, name, map_name, room_code, room_password, status, created_at
         FROM tournament_lobbies WHERE tournament_id = $1::text::text::text ORDER BY created_at DESC`,
        [tournamentId]
      );
      teamsResult = await client.query(
        `SELECT t.id, t.name, t.captain_user_id AS "captainUserId", t.status,
                COUNT(r.id) FILTER (WHERE r.payment_status = 'paid') AS paid_registrations,
                COUNT(r.id) AS total_registrations
         FROM tournament_teams t
         LEFT JOIN tournament_registrations r ON r.team_id = t.id AND r.tournament_id = $1::text::text
         WHERE t.tournament_id = $1::text::text
         GROUP BY t.id, t.name, t.captain_user_id, t.status
         ORDER BY t.name`,
        [tournamentId],
      );
      leaderboardResult = await client.query(
        `SELECT team_id AS "teamId", rank, total_points AS "totalPoints", total_kills AS "totalKills", matches_played AS "matchesPlayed", wwcd_count AS "wwcdCount"
         FROM tournament_leaderboards
         WHERE tournament_id = $1::text::text::text
         ORDER BY rank`,
        [tournamentId],
      );
    }

    let matchResultsResult;
    try {
      matchResultsResult = await client.query(
        `SELECT id, match_id AS "matchId", team_id AS "teamId", placement, kills, wwcd,
                placement_points AS "placementPoints", points_awarded AS "pointsAwarded",
                prize_pi AS "prizePi", metadata, created_at AS "createdAt"
         FROM tournament_match_results
         WHERE match_id IN (SELECT id FROM tournament_matches WHERE tournament_id = $1::text::text::text)
         ORDER BY match_id, placement ASC NULLS LAST, kills DESC`,
        [tournamentId],
      );
    } catch (error: any) {
      if (!isMissingTournamentTableError(error)) {
        throw error;
      }
      await ensureTournamentTables(client);
      matchResultsResult = await client.query(
        `SELECT id, match_id AS "matchId", team_id AS "teamId", placement, kills, wwcd,
                placement_points AS "placementPoints", points_awarded AS "pointsAwarded",
                prize_pi AS "prizePi", metadata, created_at AS "createdAt"
         FROM tournament_match_results
         WHERE match_id IN (SELECT id FROM tournament_matches WHERE tournament_id = $1::text::text::text)
         ORDER BY match_id, placement ASC NULLS LAST, kills DESC`,
        [tournamentId],
      );
    }

    const matchResultsByMatch: Record<string, any[]> = {};
    (matchResultsResult.rows || []).forEach((row: any) => {
      if (!matchResultsByMatch[row.matchId]) {
        matchResultsByMatch[row.matchId] = [];
      }
      matchResultsByMatch[row.matchId].push(row);
    });

    return res.status(200).json({
      success: true,
      tournament: mapTournament(freshRow),
      matches: matchesResult.rows.map(mapMatch),
      lobbies: lobbiesResult.rows.map(mapLobby),
      teams: teamsResult.rows,
      leaderboard: leaderboardResult.rows,
      matchResults: matchResultsByMatch,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get tournament', details: error.message });
  } finally {
    if (releaseClient) {
      client.release();
    }
  }
}

async function handleTournamentRegister(req: VercelRequest, res: VercelResponse, tournamentId: string, providedClient?: PoolClient) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const client = providedClient ?? await pool.connect();
  const releaseClient = !providedClient;

  try {
    await ensureTournamentTables(client);

    const { teamName, players, mode, teamLogo, teamLeaderEmail } = (req.body || {}) as any;
    const normalizedLeaderEmail = String(teamLeaderEmail || '').trim().toLowerCase();
    const requiredPlayers = mode === 'solo' ? 1 : mode === 'duo' ? 2 : 4;

    if (!['solo', 'duo', 'squad'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be solo, duo, or squad' });
    }
    if (!teamName || !String(teamName).trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    if (!teamLogo || !String(teamLogo).trim()) {
      return res.status(400).json({ error: 'Team logo is required' });
    }
    if (!normalizedLeaderEmail) {
      return res.status(400).json({ error: 'Team leader email is required' });
    }
    if (!Array.isArray(players) || players.length !== requiredPlayers) {
      return res.status(400).json({ error: `Exactly ${requiredPlayers} players required for ${mode} mode` });
    }
    for (const player of players) {
      if (!player?.email || !player?.phone || !player?.pubgIgn || !player?.pubgUid) {
        return res.status(400).json({ error: 'All players must provide email, phone, PUBG IGN, and PUBG UID' });
      }
    }

    const leaderPlayer = players.find((player: any) => String(player.email).trim().toLowerCase() === normalizedLeaderEmail);
    if (!leaderPlayer) {
      return res.status(400).json({ error: 'Team leader email must match one of the registered player emails' });
    }

    await client.query('BEGIN');
    const tournamentResult = await client.query(`SELECT * FROM tournaments WHERE id = $1 LIMIT 1`, [tournamentId]);
    if (tournamentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const tournament = tournamentResult.rows[0];

    const now = new Date();
    const tournamentStatus = String(tournament.status || '').toLowerCase();
    if (['registration_closed', 'in_progress', 'completed', 'ended', 'cancelled'].includes(tournamentStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Registration has closed for this tournament.' });
    }
    if (tournament.registration_closes_at && new Date(tournament.registration_closes_at) <= now) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Registration has closed for this tournament.' });
    }
    if (tournament.starts_at && new Date(tournament.starts_at) <= now) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Registration has closed because the tournament has already started.' });
    }

    if (String(tournament.mode).toLowerCase() !== String(mode).toLowerCase()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `This tournament is ${tournament.mode} only` });
    }

    let captainUserId = leaderPlayer.userId || players[0].userId;
    if (!captainUserId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'You must be logged in with a verified profile to register for a tournament.',
      });
    }

    const captainResult = await client.query(
      `SELECT id, email, phone, is_profile_verified FROM app_users WHERE id = $1`,
      [captainUserId]
    );
    if (captainResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'User not found. Only registered users can join tournaments.' });
    }
    const captainUser = captainResult.rows[0];
    if (!captainUser.is_profile_verified) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Please complete your profile verification before registering for a tournament.' });
    }
    const captainEmailInForm = String(leaderPlayer.email || '').trim().toLowerCase();
    const captainPhoneInForm = String(leaderPlayer.phone || '').trim();
    const profileEmail = String(captainUser.email || '').trim().toLowerCase();
    const profilePhone = String(captainUser.phone || '').trim();
    if (captainEmailInForm !== profileEmail) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Captain email must match the email on your verified profile (${profileEmail}).` });
    }
    if (profilePhone && captainPhoneInForm !== profilePhone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Captain phone number must match the phone number on your verified profile.' });
    }

    const teamId = randomUUID();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const teamMeta = { mode, teamLogo, teamLeaderEmail: normalizedLeaderEmail };

    const teamResult = await client.query(
      `INSERT INTO tournament_teams (id, tournament_id, name, captain_user_id, invite_code, status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'forming', $6::jsonb, now(), now())
       RETURNING *`,
      [teamId, tournamentId, String(teamName).trim(), captainUserId, inviteCode, JSON.stringify(teamMeta)]
    );

    await client.query(
      `INSERT INTO tournament_team_members (id, team_id, user_id, role, status, joined_at)
       VALUES ($1, $2, $3, 'captain', 'active', now())
       ON CONFLICT (team_id, user_id) DO NOTHING`,
      [randomUUID(), teamId, captainUserId]
    );

    const registrationMeta = { players, mode, teamName: String(teamName).trim(), teamLogo, teamLeaderEmail: normalizedLeaderEmail };
    const registrationResult = await client.query(
      `INSERT INTO tournament_registrations (id, tournament_id, user_id, team_id, status, payment_status, paid_amount_pi, registered_at, metadata)
       VALUES ($1, $2, $3, $4, 'pending_payment', 'unpaid', 0, now(), $5::jsonb)
       RETURNING *`,
      [randomUUID(), tournamentId, captainUserId, teamId, JSON.stringify(registrationMeta)]
    );

    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      team: teamResult.rows[0],
      registration: registrationResult.rows[0],
      entryFee: tournament.registration_fee_pi,
      message: `Team registered successfully. Please pay ${tournament.registration_fee_pi} PI to complete registration.`,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to register team', details: error.message });
  } finally {
    if (releaseClient) {
      client.release();
    }
  }
}

const VALID_TOURNAMENT_MODES = new Set(['solo', 'duo', 'squad']);
function normalizeTournamentMode(value: any): string | null {
  const mode = String(value || '').trim().toLowerCase();
  return VALID_TOURNAMENT_MODES.has(mode) ? mode : null;
}

function inferTournamentModeFromPlayers(players: any[] | undefined | null): string | null {
  if (!Array.isArray(players)) {
    return null;
  }
  const count = players.filter(Boolean).length;
  if (count === 1) return 'solo';
  if (count === 2) return 'duo';
  if (count >= 3) return 'squad';
  return null;
}

async function handleTournamentTeams(req: VercelRequest, res: VercelResponse, tournamentId: string, providedClient?: PoolClient) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  setShortCacheHeaders(res);
  const client = providedClient ?? await pool.connect();
  const releaseClient = !providedClient;
  try {
    await ensureTournamentTables(client);
    const result = await client.query(
      `SELECT
         COALESCE(t.id, r.team_id, r.id) AS id,
         COALESCE(t.name, (r.metadata->>'teamName'), 'Registered Team') AS name,
         COALESCE(t.tournament_id, r.tournament_id) AS tournament_id,
         COALESCE(t.status, 'active') AS status,
         COALESCE(t.created_at, r.registered_at) AS created_at,
         COALESCE(t.updated_at, r.registered_at) AS updated_at,
         r.status AS registration_status,
         r.payment_status,
         COALESCE(r.metadata, t.metadata) AS registration_metadata
       FROM tournament_registrations r
       FULL OUTER JOIN tournament_teams t
         ON t.id = r.team_id AND t.tournament_id = r.tournament_id
       WHERE COALESCE(r.tournament_id, t.tournament_id) = $1::text
       ORDER BY COALESCE(t.created_at, r.registered_at) DESC`,
      [tournamentId]
    );

    let teams = result.rows.map((row: any) => {
      const metadata = row.registration_metadata || {};
      const players = Array.isArray(metadata.players) ? metadata.players : [];
      const normalizedMode = normalizeTournamentMode(metadata.mode);
      const inferredMode = normalizedMode || inferTournamentModeFromPlayers(players);
      return {
        id: row.id,
        tournamentId: row.tournament_id,
        name: row.name,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        players,
        teamLogo: metadata.teamLogo || null,
        teamLeaderEmail: metadata.teamLeaderEmail || null,
        mode: inferredMode || null,
        registration: {
          status: row.registration_status || 'pending',
          paymentStatus: row.payment_status || 'unpaid',
        },
      };
    });

    const teamIdsWithoutPlayers = teams
      .filter((team) => team.id && (!Array.isArray(team.players) || team.players.length === 0))
      .map((team) => team.id);

    if (teamIdsWithoutPlayers.length > 0) {
      const memberResult = await client.query(
        `SELECT tm.team_id, u.email, u.phone, u.username, u.pi_uid
         FROM tournament_team_members tm
         LEFT JOIN app_users u ON u.id = tm.user_id
         WHERE tm.team_id = ANY($1)`,
        [teamIdsWithoutPlayers]
      );

      const membersByTeam: Record<string, Array<any>> = {};
      memberResult.rows.forEach((row: any) => {
        if (!row.team_id) return;
        membersByTeam[row.team_id] = membersByTeam[row.team_id] || [];
        membersByTeam[row.team_id].push(row);
      });

      teams = teams.map((team) => {
        if (!team.id || (Array.isArray(team.players) && team.players.length > 0)) {
          return team;
        }
        const teamMembers = membersByTeam[team.id] || [];
        if (teamMembers.length === 0) {
          return team;
        }
        const players = teamMembers.map((member) => ({
          email: member.email || '',
          phone: member.phone || '',
          ign: member.username || '',
          uid: member.pi_uid || '',
        }));
        const inferredMode = normalizeTournamentMode(team.mode) || inferTournamentModeFromPlayers(players);
        return {
          ...team,
          players,
          mode: inferredMode || team.mode || null,
        };
      });
    }

    return res.status(200).json({ success: true, teams });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get tournament teams', details: error.message });
  } finally {
    if (releaseClient) {
      client.release();
    }
  }
}

async function handleTournamentLobbyAccess(req: VercelRequest, res: VercelResponse, tournamentId: string, providedClient?: PoolClient) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const client = providedClient ?? await pool.connect();
  const releaseClient = !providedClient;

  try {
    await ensureTournamentTables(client);
    const teamLeaderEmail = String((req.body as any)?.teamLeaderEmail || '').trim().toLowerCase();
    if (!teamLeaderEmail) {
      return res.status(400).json({ error: 'Team leader email is required' });
    }

    const teamResult = await client.query(
      `SELECT
         r.id AS registration_id,
         COALESCE(t.id, r.team_id, r.id) AS team_id,
         COALESCE(t.name, (r.metadata->>'teamName')) AS name,
         COALESCE(t.metadata, r.metadata) AS metadata
       FROM tournament_registrations r
       FULL OUTER JOIN tournament_teams t
         ON t.id = r.team_id AND t.tournament_id = r.tournament_id
       WHERE COALESCE(r.tournament_id, t.tournament_id) = $1`,
      [tournamentId]
    );

    const matched = teamResult.rows.find((row: any) => {
      const metadata = row.metadata || {};
      const candidateEmails = new Set<string>();
      if (metadata.teamLeaderEmail) {
        candidateEmails.add(String(metadata.teamLeaderEmail).trim().toLowerCase());
      }
      if (Array.isArray(metadata.players)) {
        metadata.players.forEach((player: any) => {
          if (player?.email) {
            candidateEmails.add(String(player.email).trim().toLowerCase());
          }
        });
      }
      return candidateEmails.has(teamLeaderEmail);
    });

    if (!matched) {
      return res.status(403).json({ error: 'No team found for this leader email' });
    }

    const lobbiesResult = await client.query(
      `SELECT id, name, map_name AS "mapName", status, room_code AS "roomCode", room_password AS "roomPassword", created_at AS "createdAt"
       FROM tournament_lobbies
       WHERE tournament_id = $1::text::text::text
       ORDER BY created_at DESC`,
      [tournamentId]
    );

    return res.status(200).json({
      success: true,
      team: {
        id: matched.team_id || matched.registration_id,
        name: matched.name,
        logo: (matched.metadata || {}).teamLogo || null,
      },
      lobbies: lobbiesResult.rows,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get lobby access', details: error.message });
  } finally {
    if (releaseClient) {
      client.release();
    }
  }
}

async function handleTournamentLobbyCreate(req: VercelRequest, res: VercelResponse, tournamentId: string, providedClient?: PoolClient) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const client = providedClient ?? await pool.connect();
  const releaseClient = !providedClient;
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
  }

  const { matchNumber, roomCode, roomPassword, scheduledAt } = (req.body || {}) as any;
  const allowedMaps = new Set(['Erangle', 'Rondo', 'Miramar', 'Livik', 'Shanhok', 'Warehouse', 'Ruins', 'Hangar', 'Santorini']);
  const mapName = allowedMaps.has(String((req.body as any)?.mapName || '')) ? String((req.body as any).mapName) : 'Erangle';
  const parsedScheduledAt = scheduledAt ? new Date(String(scheduledAt)) : new Date();
  if (!roomCode || !roomPassword) {
    return res.status(400).json({ error: 'Room code and room password are required' });
  }

  try {
    await ensureTournamentTables(client);
    await client.query('BEGIN');

    const tournamentResult = await client.query(`SELECT id FROM tournaments WHERE id = $1 LIMIT 1`, [tournamentId]);
    if (tournamentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const lobbyResult = await client.query(
      `INSERT INTO tournament_lobbies (
        id, tournament_id, name, map_name, room_code, room_password, status, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'waiting', $7::jsonb, now(), now())
      RETURNING *`,
      [
        randomUUID(),
        tournamentId,
        `Match ${Number(matchNumber || 1)} Lobby`,
        mapName,
        String(roomCode).trim(),
        String(roomPassword).trim(),
        JSON.stringify({ createdBy: auth.userId || null, mapName }),
      ],
    );

    const matchResult = await client.query(
      `INSERT INTO tournament_matches (
        id, tournament_id, lobby_id, round, match_number, status, room_code, room_password,
        map_name, scheduled_at, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, 1, $4, 'scheduled', $5, $6, $7, $8, $9::jsonb, now(), now())
      RETURNING *`,
      [
        randomUUID(),
        tournamentId,
        lobbyResult.rows[0].id,
        Number(matchNumber || 1),
        String(roomCode).trim(),
        String(roomPassword).trim(),
        mapName,
        Number.isNaN(parsedScheduledAt.getTime()) ? new Date() : parsedScheduledAt,
        JSON.stringify({ createdBy: auth.userId || null, mapName }),
      ],
    );

    await client.query(
      `UPDATE tournament_lobbies SET match_id = $1, updated_at = now() WHERE id = $2`,
      [matchResult.rows[0].id, lobbyResult.rows[0].id],
    );

    await client.query('COMMIT');

    // Non-blocking: Notify registered captains & players that room credentials are live!
    (async () => {
      try {
        const notifClient = await pool.connect();
        try {
          const tournamentRow = await notifClient.query('SELECT title FROM tournaments WHERE id = $1', [tournamentId]);
          const tournamentTitle = tournamentRow.rows[0]?.title || 'Tournament';

          const regUsers = await notifClient.query(`
            SELECT DISTINCT u.pi_uid
            FROM tournament_registrations r
            JOIN app_users u ON r.user_id = u.id
            WHERE r.tournament_id = $1 AND (r.payment_status = 'paid' OR r.payment_status = 'waived')
              AND u.pi_uid IS NOT NULL AND u.pi_uid != ''
          `, [tournamentId]);

          for (const row of regUsers.rows) {
            sendPiInAppNotification({
              title: '🎮 Tournament Match Room Ready!',
              body: `Match ${Number(matchNumber || 1)} room credentials for "${tournamentTitle}" are published! Check your Lobby tab now.`,
              user_uid: row.pi_uid,
              subroute: '/dashboard',
            }).catch(() => {});
          }
        } finally {
          notifClient.release();
        }
      } catch (err: any) {
        console.warn('Lobby notification dispatch error:', err?.message);
      }
    })();

    return res.status(201).json({
      success: true,
      lobby: mapLobby({ ...lobbyResult.rows[0], match_id: matchResult.rows[0].id }),
      match: mapMatch(matchResult.rows[0]),
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to create lobby', details: error.message });
  } finally {
    if (releaseClient) {
      client.release();
    }
  }
}

function defaultPlacementPoints(placement: number) {
  const pointsMap: Record<number, number> = {
    1: 20,
    2: 14,
    3: 10,
    4: 8,
    5: 6,
    6: 4,
    7: 3,
    8: 2,
    9: 1,
  };
  return pointsMap[placement] ?? 0;
}

async function rebuildTournamentLeaderboard(tournamentId: string, client?: PoolClient) {
  const executor = client ?? pool;
  await executor.query(`DELETE FROM tournament_leaderboards WHERE tournament_id = $1::text::text::text`, [tournamentId]);

  await executor.query(
    `INSERT INTO tournament_leaderboards (
       id, tournament_id, team_id, rank, total_points, total_kills, matches_played, wwcd_count, updated_at
     )
     SELECT
       gen_random_uuid(),
       $1,
       team_id,
       RANK() OVER (ORDER BY SUM(placement_points + kills) DESC, SUM(kills) DESC, SUM(CASE WHEN placement = 1 THEN 1 ELSE 0 END) DESC),
       SUM(placement_points + kills) AS total_points,
       SUM(kills) AS total_kills,
       COUNT(*) AS matches_played,
       SUM(CASE WHEN wwcd > 0 THEN 1 ELSE 0 END) AS wwcd_count,
       now()
     FROM tournament_match_results mr
     JOIN tournament_matches m ON m.id = mr.match_id AND m.tournament_id = $1::text::text
     WHERE mr.team_id IS NOT NULL
     GROUP BY mr.team_id
     ORDER BY rank;
    `,
    [tournamentId],
  );
}

async function handleTournamentMatchComplete(req: VercelRequest, res: VercelResponse, tournamentId: string, matchId: string, providedClient?: PoolClient) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
  }

  const client = providedClient ?? await pool.connect();
  const releaseClient = !providedClient;

  try {
    await ensureTournamentTables(client);

    if (req.method === 'PATCH') {
      const body = (req.body || {}) as any;
      const allowedMaps = new Set(['Erangle', 'Rondo', 'Miramar', 'Livik', 'Shanhok', 'Warehouse', 'Ruins', 'Hangar', 'Santorini']);
      const mapName = allowedMaps.has(String(body.mapName || '')) ? String(body.mapName) : 'Erangle';
      const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
      const roomCode = String(body.roomCode || '').trim();
      const roomPassword = String(body.roomPassword || '').trim();
      if (!roomCode || !roomPassword) {
        return res.status(400).json({ error: 'Room code and room password are required' });
      }

      const result = await client.query(
        `UPDATE tournament_matches
         SET map_name = $1, room_code = $2, room_password = $3,
             scheduled_at = COALESCE($4, scheduled_at), updated_at = now()
         WHERE id = $5::text AND tournament_id = $6::text
         RETURNING *`,
        [mapName, roomCode, roomPassword, scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null, matchId, tournamentId],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' });
      }

      await client.query(
        `UPDATE tournament_lobbies
         SET map_name = $1, room_code = $2, room_password = $3, updated_at = now()
         WHERE id = $4::text AND tournament_id = $5::text`,
        [mapName, roomCode, roomPassword, result.rows[0].lobby_id, tournamentId],
      );

      return res.status(200).json({ success: true, match: mapMatch(result.rows[0]) });
    }

    if (req.method === 'DELETE') {
      const matchResult = await client.query(
        `DELETE FROM tournament_matches WHERE id = $1::text AND tournament_id = $2::text RETURNING *`,
        [matchId, tournamentId],
      );
      if (matchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' });
      }
      if (matchResult.rows[0].lobby_id) {
        await client.query(`DELETE FROM tournament_lobbies WHERE id = $1::text AND tournament_id = $2::text`, [matchResult.rows[0].lobby_id, tournamentId]);
      }
      return res.status(200).json({ success: true, deletedId: matchId });
    }

    if (req.method === 'POST') {
      const body = (req.body || {}) as any;
      const results = Array.isArray(body.results) ? body.results : [];
      if (results.length > 0) {
        const matchCheck = await client.query(
          `SELECT id, lobby_id FROM tournament_matches WHERE id = $1::text AND tournament_id = $2::text`,
          [matchId, tournamentId],
        );
        if (matchCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Match not found' });
        }

        try {
          await client.query('BEGIN');
          await client.query(`DELETE FROM tournament_match_results WHERE match_id = $1`, [matchId]);

          for (const row of results) {
            const teamId = String(row.teamId || '').trim();
            const placement = row.placement != null ? Number(row.placement) : null;
            const kills = Math.max(0, Number(row.kills) || 0);

            if (!teamId) {
              await client.query('ROLLBACK');
              return res.status(400).json({ error: 'Each result row must include a teamId' });
            }

            const placementPoints = row.placementPoints != null
              ? Math.max(0, Number(row.placementPoints))
              : (placement && placement > 0 ? defaultPlacementPoints(placement) : 0);
            const pointsAwarded = placementPoints + kills;
            const wwcd = Math.max(0, Number(row.wwcd) || 0);
            const prizePi = row.prize ? String(row.prize) : '0';

            await client.query(
              `INSERT INTO tournament_match_results (
                 id, match_id, team_id, placement, kills, wwcd, placement_points, points_awarded, prize_pi, metadata, created_at
               ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,now())`,
              [
                randomUUID(),
                matchId,
                teamId,
                placement,
                kills,
                wwcd,
                placementPoints,
                pointsAwarded,
                prizePi,
                JSON.stringify({ wwcd, enteredBy: auth.userId || null, playerKills: row.playerKills || {}, playerRows: row.playerRows || [] }),
              ],
            );
          }

          await client.query(
            `UPDATE tournament_matches
             SET status = 'completed', completed_at = now(), updated_at = now()
             WHERE id = $1::text AND tournament_id = $2::text`,
            [matchId, tournamentId],
          );

          await client.query(
            `UPDATE tournament_lobbies
             SET status = 'completed', updated_at = now()
             WHERE tournament_id = $1::text::text::text AND match_id = $2`,
            [tournamentId, matchId],
          );

          await client.query('COMMIT');
        } catch (error: any) {
          await client.query('ROLLBACK');
          throw error;
        }

        await rebuildTournamentLeaderboard(tournamentId, client);
        const leaderboardRows = await client.query(
          `SELECT team_id AS "teamId", rank, total_points AS "totalPoints", total_kills AS "totalKills", matches_played AS "matchesPlayed", wwcd_count AS "wwcdCount"
           FROM tournament_leaderboards
           WHERE tournament_id = $1::text::text::text
           ORDER BY rank`,
          [tournamentId],
        );

        const completedMatch = await client.query(
          `SELECT * FROM tournament_matches WHERE id = $1::text AND tournament_id = $2::text`,
          [matchId, tournamentId],
        );

        return res.status(200).json({
          success: true,
          match: mapMatch(completedMatch.rows[0]),
          leaderboard: leaderboardRows.rows,
        });
      }
    }

    const result = await client.query(
      `UPDATE tournament_matches
       SET status = 'completed', completed_at = now(), updated_at = now()
       WHERE id = $1::text AND tournament_id = $2::text
       RETURNING *`,
      [matchId, tournamentId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    await client.query(
      `UPDATE tournament_lobbies
       SET status = 'completed', updated_at = now()
       WHERE tournament_id = $1::text::text::text AND match_id = $2`,
      [tournamentId, matchId],
    );

    return res.status(200).json({ success: true, match: mapMatch(result.rows[0]) });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to complete match', details: error.message });
  } finally {
    if (releaseClient) {
      client.release();
    }
  }
}

async function handleTournamentMatchResults(req: VercelRequest, res: VercelResponse, tournamentId: string, matchId: string, providedClient?: PoolClient) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
  }

  const client = providedClient ?? await pool.connect();
  const releaseClient = !providedClient;

  try {
    await ensureTournamentTables(client);
    const matchCheck = await client.query(
      `SELECT id FROM tournament_matches WHERE id = $1::text AND tournament_id = $2::text`,
      [matchId, tournamentId],
    );
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const results = await client.query(
      `SELECT id, match_id AS "matchId", team_id AS "teamId", placement, kills, wwcd,
              placement_points AS "placementPoints", points_awarded AS "pointsAwarded",
              prize_pi AS "prizePi", metadata, created_at AS "createdAt"
       FROM tournament_match_results
       WHERE match_id = $1
       ORDER BY placement ASC NULLS LAST, kills DESC`,
      [matchId],
    );

    return res.status(200).json({ success: true, results: results.rows });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get match results', details: error.message });
  } finally {
    if (releaseClient) {
      client.release();
    }
  }
}

let redemptionTablesReady: Promise<void> | null = null;
const B4U_TOKEN_NAME = 'B4U Esports Token';
const B4U_TOKEN_SYMBOL = 'B4UT';
const B4U_TO_PI_RATE = 10000;
const FEEDBACK_REWARD_TOKENS = 10;

const TOKEN_REWARD_OFFERS = [
  { key: 'daily_reward', title: 'Daily Reward Token', value: '+10 B4U Esports Token', description: 'Claim once every 24 hours from the dashboard.' },
  { key: 'referral_reward', title: 'Referral Token', value: '+25 B4U Esports Token', description: 'Invite a real user and earn when the referral is verified.' },
  { key: 'purchase_bonus', title: 'Purchase Bonus Token', value: 'Bonus B4U Esports Token on completed purchases', description: 'Purchase milestones and cashback rewards are added after Pi payment completion.' },
  { key: 'watch_ad', title: 'Watch Ad and Earn Token', value: '+10 B4U Esports Token', description: 'Rewarded ads must be verified before tokens are issued.' },
  { key: 'tournament_reward', title: 'Tournament Rewards', value: 'B4U Esports Token prizes', description: 'Admins can award tournament winners and MVPs from the tournament system.' },
  { key: 'achievement_reward', title: 'Achievement Rewards', value: 'B4U Esports Token milestones', description: 'Achievement campaigns can reward profile, purchase, and gameplay milestones.' },
  { key: 'loyalty_reward', title: 'Loyalty Rewards', value: 'B4U Esports Token loyalty drops', description: 'Long-term users can earn periodic loyalty bonuses.' },
  { key: 'feedback_reward', title: 'Feedback Reward', value: '+10 B4U Esports Token', description: 'Users receive tokens when they leave app feedback.' },
];

async function ensureRedemptionTables() {
  if (!redemptionTablesReady) {
    redemptionTablesReady = pool.query(`
      CREATE TABLE IF NOT EXISTS token_transactions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES app_users(id),
        amount integer NOT NULL,
        type varchar(50) NOT NULL,
        description text,
        reference_id varchar,
        created_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS redemption_requests (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES app_users(id),
        b4ut_amount integer NOT NULL,
        pi_amount numeric(10,4) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending',
        pi_uid text,
        wallet_address text,
        txid text,
        admin_notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      ALTER TABLE redemption_requests ADD COLUMN IF NOT EXISTS pi_uid text;
      ALTER TABLE redemption_requests ALTER COLUMN wallet_address DROP NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_redemption_requests_status ON redemption_requests(status);
      CREATE INDEX IF NOT EXISTS idx_redemption_requests_user ON redemption_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_redemption_requests_pi_uid ON redemption_requests(pi_uid);
      CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_token_transactions_reference_id
        ON token_transactions(reference_id)
        WHERE reference_id IS NOT NULL;
    `).then(() => undefined);
  }

  return redemptionTablesReady;
}

function getJwtUserId(req: VercelRequest) {
  const token = req.headers.authorization?.toString().replace('Bearer ', '');
  if (!token || token.split('.').length !== 3) {
    throw new Error('Unauthorized');
  }
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
  return String(decoded.userId || '');
}

async function grantB4uTokens(userId: string, amount: number, type: string, description: string, referenceId?: string, client?: any) {
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid token reward');
  }

  await ensureRedemptionTables();
  const runner = client || pool;
  if (referenceId) {
    const existing = await runner.query(
      `INSERT INTO token_transactions (id, user_id, amount, type, description, reference_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (reference_id) DO NOTHING
       RETURNING id`,
      [randomUUID(), userId, amount, type, description, referenceId],
    );
    if (existing.rows.length > 0) {
      await runner.query(
        `UPDATE app_users SET tokens = COALESCE(tokens, 0) + $1, updated_at = now() WHERE id = $2`,
        [amount, userId],
      );
    }
    else {
      const balance = await runner.query(`SELECT tokens FROM app_users WHERE id = $1`, [userId]);
      return Number(balance.rows[0]?.tokens || 0);
    }
  } else {
    await runner.query(
      `UPDATE app_users SET tokens = COALESCE(tokens, 0) + $1, updated_at = now() WHERE id = $2`,
      [amount, userId],
    );
    await runner.query(
      `INSERT INTO token_transactions (id, user_id, amount, type, description, reference_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [randomUUID(), userId, amount, type, description, null],
    );
  }
  const result = await runner.query(`SELECT tokens FROM app_users WHERE id = $1`, [userId]);
  return Number(result.rows[0]?.tokens || 0);
}

async function handleTokenRewards(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  return res.status(200).json({
    tokenName: B4U_TOKEN_NAME,
    tokenSymbol: B4U_TOKEN_SYMBOL,
    conversion: {
      rate: `${B4U_TO_PI_RATE} ${B4U_TOKEN_SYMBOL} = 1 Pi`,
      automaticRequiresTreasuryWallet: true,
      note: `${B4U_TOKEN_SYMBOL} is an in-app reward token, not real Pi. Pi App-to-User redemption is available only in Pi Testnet until Pi enables the A2U API for Mainnet.`,
    },
    offers: TOKEN_REWARD_OFFERS,
  });
}

async function handleTokenBalance(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const userId = getJwtUserId(req);
    await ensureRedemptionTables();
    const [userResult, totalsResult, lockedResult, rewardsResult] = await Promise.all([
      pool.query(`SELECT tokens FROM app_users WHERE id = $1`, [userId]),
      pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS earned,
           COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS spent
         FROM token_transactions
         WHERE user_id = $1`,
        [userId],
      ),
      pool.query(
        `SELECT COALESCE(SUM(b4ut_amount), 0) AS locked
         FROM redemption_requests
         WHERE user_id = $1 AND status IN ('pending', 'approved')`,
        [userId],
      ),
      pool.query(
        `SELECT id, type AS event_type, amount, description AS source, created_at
         FROM token_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [userId],
      ),
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      tokenName: B4U_TOKEN_NAME,
      tokenSymbol: B4U_TOKEN_SYMBOL,
      conversionRate: B4U_TO_PI_RATE,
      balance: {
        total: Number(userResult.rows[0].tokens || 0),
        locked: Number(lockedResult.rows[0]?.locked || 0),
        earned: Number(totalsResult.rows[0]?.earned || 0),
        spent: Number(totalsResult.rows[0]?.spent || 0),
      },
      recentRewards: rewardsResult.rows.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        amount: Number(row.amount || 0),
        source: row.source || row.event_type,
        createdAt: row.created_at,
      })),
      rewardSources: TOKEN_REWARD_OFFERS,
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return res.status(status).json({ message: status === 401 ? 'Unauthorized' : 'Failed to fetch token balance', error: error.message });
  }
}

function mapRedemption(row: any) {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    username: row.username || 'Unknown',
    b4utAmount: Number(row.b4utAmount ?? row.b4ut_amount ?? 0),
    piAmount: String(row.piAmount ?? row.pi_amount ?? '0'),
    status: row.status,
    piUID: row.piUID ?? row.pi_uid,
    walletAddress: row.walletAddress ?? row.wallet_address,
    createdAt: row.createdAt ?? row.created_at,
  };
}

async function handleAdminRedemptions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
  }

  try {
    await ensureRedemptionTables();
    const result = await pool.query(`
      SELECT
        rr.id,
        rr.user_id AS "userId",
        COALESCE(u.username, 'Unknown') AS username,
        rr.b4ut_amount AS "b4utAmount",
        rr.pi_amount AS "piAmount",
        rr.status,
        COALESCE(rr.pi_uid, u.pi_uid) AS "piUID",
        COALESCE(rr.wallet_address, u.wallet_address) AS "walletAddress",
        rr.created_at AS "createdAt"
      FROM redemption_requests rr
      LEFT JOIN app_users u ON u.id = rr.user_id
      ORDER BY rr.created_at DESC
    `);

    return res.status(200).json(result.rows.map(mapRedemption));
  } catch (error: any) {
    console.error('Admin redemptions fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch redemptions', error: error.message });
  }
}

async function handleAdminRedemptionAction(req: VercelRequest, res: VercelResponse, requestId: string, action: 'approve' | 'reject') {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
  }

  const notes = String((req.body as any)?.notes || `${action === 'approve' ? 'Approved' : 'Rejected'} via Admin Panel`);
  const client = await pool.connect();

  try {
    await ensureRedemptionTables();
    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT * FROM redemption_requests WHERE id = $1 FOR UPDATE`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Redemption request not found' });
    }

    const request = requestResult.rows[0];
    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Redemption request has already been processed' });
    }

    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    const updatedResult = await client.query(
      `UPDATE redemption_requests
       SET status = $1, admin_notes = $2, updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [nextStatus, notes, requestId],
    );

    if (action === 'reject') {
      // Refund tokens back to user
      await client.query(
        `UPDATE app_users SET tokens = COALESCE(tokens, 0) + $1, updated_at = now() WHERE id = $2`,
        [request.b4ut_amount, request.user_id],
      );
      await client.query(
        `INSERT INTO token_transactions (id, user_id, amount, type, description, reference_id, created_at)
         VALUES ($1, $2, $3, 'redemption_refund', 'Refund for rejected redemption request', $4, now())`,
        [randomUUID(), request.user_id, request.b4ut_amount, requestId],
      );
    }

    if (action === 'approve') {
      // Trigger actual A2U Pi payment to user's verified Pi UID
      const userResult = await client.query(
        `SELECT id, pi_uid, wallet_address, username, email FROM app_users WHERE id = $1`,
        [request.user_id],
      );
      const user = userResult.rows[0];
      const piUID = request.pi_uid || user?.pi_uid;

      // Backfill wallet_address on the redemption request if it was missing when submitted
      if (!request.wallet_address && user?.wallet_address) {
        await client.query(
          `UPDATE redemption_requests SET wallet_address = $1, updated_at = now() WHERE id = $2`,
          [user.wallet_address, requestId],
        );
        console.log(`Backfilled wallet_address for redemption ${requestId}: ${user.wallet_address}`);
      }

      if (piUID && Number(request.pi_amount) > 0) {
        try {
          const { piNetworkService } = await import('../server/services/pi-network.js');
          const a2uResult = await piNetworkService.processFullA2UPayment({
            amount: Number(request.pi_amount),
            memo: `B4U Esports Token Redemption — ${request.b4ut_amount} B4UT`,
            metadata: {
              type: 'token_redemption',
              redemptionId: requestId,
              b4utAmount: request.b4ut_amount,
              userId: request.user_id,
            },
            uid: piUID,
          });

          if (a2uResult) {
            // Mark as completed with txid
            await client.query(
              `UPDATE redemption_requests
               SET status = 'completed', txid = $1, admin_notes = $2, updated_at = now()
               WHERE id = $3`,
              [a2uResult.txid, `A2U payment sent. TxID: ${a2uResult.txid}`, requestId],
            );
            console.log(`✅ A2U redemption payment sent to ${piUID}: ${request.pi_amount} Pi, txid: ${a2uResult.txid}`);
          } else {
            console.error(`❌ A2U payment failed for redemption ${requestId}`);
            // Keep as approved — admin can retry manually
          }
        } catch (a2uError: any) {
          console.error('A2U payment error for redemption:', a2uError.message);
          // Keep as approved — payment can be retried
        }
      } else {
        console.warn(`Redemption ${requestId}: no piUID or zero amount — skipping A2U payment`);
      }
    }

    await client.query('COMMIT');
    return res.status(200).json({ success: true, request: mapRedemption(updatedResult.rows[0]) });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(`Admin redemption ${action} error:`, error);
    return res.status(500).json({ message: `Failed to ${action} redemption`, error: error.message });
  } finally {
    client.release();
  }
}

async function handleTournamentRegistrationSave(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, teamName, players, mode, paymentId, txid, tournamentId } = req.body;

    if (!userId || !teamName || !players || !mode) {
      return res.status(400).json({ message: 'Missing required fields: userId, teamName, players, mode' });
    }

    console.log('Saving tournament registration for user:', userId, 'team:', teamName, 'mode:', mode);
    await ensureTournamentTables();
    const normalizedMode = String(mode).trim().toLowerCase();
    const targetTournamentId = String(tournamentId || '').trim();
    if (!targetTournamentId) {
      return res.status(400).json({ message: 'Tournament ID is required' });
    }
    if (!['solo', 'duo', 'squad'].includes(normalizedMode)) {
      return res.status(400).json({ message: 'Mode must be solo, duo, or squad' });
    }
    const requiredPlayers = normalizedMode === 'solo' ? 1 : normalizedMode === 'duo' ? 2 : 4;
    if (!Array.isArray(players) || players.length !== requiredPlayers) {
      return res.status(400).json({ message: `Exactly ${requiredPlayers} players required for ${normalizedMode} mode` });
    }
    const tournamentResult = await pool.query(`SELECT id, mode, registration_fee_pi FROM tournaments WHERE id = $1 LIMIT 1`, [targetTournamentId]);
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    const tournament = tournamentResult.rows[0];
    if (String(tournament.mode).toLowerCase() !== normalizedMode) {
      return res.status(400).json({ message: `This tournament is ${tournament.mode} only` });
    }

    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();

    // Check if this payment has already been recorded for the user.
    // Users may enter the tournament again on subsequent days, so we do not block by previous tournament registration alone.
    const existingRegistration = await storage.getUserTournamentRegistrations(userId);
    if (existingRegistration.length > 0) {
      const duplicatePayment = existingRegistration.find((r: any) => (
        (paymentId && r.metadata?.paymentId === paymentId) ||
        (txid && r.metadata?.txid === txid)
      ));

      if (duplicatePayment) {
        console.log('Duplicate tournament payment detected for user:', userId, 'paymentId:', paymentId, 'txid:', txid);
        return res.status(409).json({
          message: 'This tournament payment has already been processed.',
          registrationId: duplicatePayment.id,
          status: duplicatePayment.status,
          paymentStatus: duplicatePayment.paymentStatus,
        });
      }
    }

    const captainPlayer = players[0] || {};
    const teamLogo = req.body?.teamLogoName || req.body?.teamLogo || null;
    let teamId: string | null = null;
    try {
      const team = await storage.createTournamentTeam({
        tournamentId: targetTournamentId,
        name: String(teamName).trim(),
        captainUserId: userId,
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: 'complete',
        metadata: {
          mode: normalizedMode,
          teamLogo,
          teamLeaderEmail: String(captainPlayer.email || '').trim().toLowerCase(),
        },
      });
      teamId = team.id;
    } catch (teamError) {
      console.warn('Tournament registration save: team creation skipped', teamError);
      const existingTeamResult = await pool.query(
        `SELECT id FROM tournament_teams WHERE tournament_id = $1::text::text::text AND captain_user_id = $2::text LIMIT 1`,
        [targetTournamentId, userId]
      );
      if (existingTeamResult.rows.length > 0) {
        teamId = existingTeamResult.rows[0].id;
      }
    }

    // Create tournament registration in database
    const registrationData = {
      userId,
      tournamentId: targetTournamentId,
      teamId,
      status: 'registered',
      paymentStatus: 'paid', // Payment is already completed
      paidAmountPi: String(tournament.registration_fee_pi || '0'),
      metadata: {
        teamName: String(teamName).trim(),
        players: Array.isArray(players) ? players : [],
        mode: normalizedMode,
        teamLogo,
        teamLeaderEmail: String(captainPlayer.email || '').trim().toLowerCase(),
        paymentId,
        txid,
      },
    };

    const registration = await storage.registerForTournament(registrationData);
    await pool.query(
      `UPDATE tournaments t
       SET prize_pool_pi = COALESCE((
         SELECT ROUND((SUM(paid_amount_pi) * $2)::numeric, 8)
         FROM tournament_registrations
         WHERE tournament_id = $1::text::text::text AND payment_status = 'paid'
       ), t.prize_pool_pi),
       updated_at = now()
       WHERE id = $1`,
      [targetTournamentId, 1 - TOURNAMENT_PLATFORM_FEE_RATE],
    );
    console.log('Tournament registration saved to database:', registration.id);

    res.json({
      success: true,
      message: 'Tournament registration saved successfully',
      registration: registration
    });
  } catch (error: any) {
    console.error('Tournament registration save error:', error.message);
    console.error('Full error:', error);
    
    // Check for constraint violations
    if (error.message && error.message.includes('duplicate') && error.message.includes('key')) {
      return res.status(409).json({ 
        message: 'You have already registered for this tournament',
        error: error.message 
      });
    }
    
    res.status(500).json({ message: 'Failed to save tournament registration', error: error.message });
  }
}

async function handleChatGet(req: VercelRequest, res: VercelResponse, roomId: string) {
  try {
    const result = await pool.query(`
      SELECT 
        m.id, m.content, m.created_at as "createdAt", 
        u.id as "userId", u.username, r.name as role, r.color,
        m.reply_to_id as "replyToId",
        rm.content as "replyToContent",
        ru.username as "replyToUsername"
      FROM app_messages m
      LEFT JOIN app_users u ON m.user_id = u.id
      LEFT JOIN app_roles r ON u.role_id = r.id
      LEFT JOIN app_messages rm ON m.reply_to_id = rm.id
      LEFT JOIN app_users ru ON rm.user_id = ru.id
      WHERE m.room_id = $1
      ORDER BY m.created_at DESC
      LIMIT 50
    `, [roomId]);

    const formattedMessages = result.rows.map(m => ({
      ...m,
      role: m.role || "Member",
      color: m.color || "#94a3b8"
    }));

    return res.json(formattedMessages.reverse());
  } catch (error) {
    console.error('Chat GET error:', error);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
}

async function handleChatPost(req: VercelRequest, res: VercelResponse, roomId: string) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret') as any;
    
    const userResult = await pool.query(`
      SELECT u.id, u.username, r.name as role, r.color
      FROM app_users u
      LEFT JOIN app_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [decoded.userId]);
    
    if (userResult.rowCount === 0) return res.status(401).json({ message: 'User not found' });
    const user = userResult.rows[0];
    
    const { content, replyToId } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Message empty' });
    
    const insertResult = await pool.query(`
      INSERT INTO app_messages (room_id, user_id, content, reply_to_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, content, created_at as "createdAt", reply_to_id as "replyToId"
    `, [roomId, user.id, content.trim(), replyToId || null]);
    
    const newMsg = insertResult.rows[0];
    
    // If there's a replyToId, fetch the reply content and username to return to the client
    let replyToContent = null;
    let replyToUsername = null;
    if (replyToId) {
      const replyQuery = await pool.query(`
        SELECT m.content, u.username
        FROM app_messages m
        LEFT JOIN app_users u ON m.user_id = u.id
        WHERE m.id = $1
      `, [replyToId]);
      if ((replyQuery.rowCount ?? 0) > 0) {
        replyToContent = replyQuery.rows[0].content;
        replyToUsername = replyQuery.rows[0].username;
      }
    }
    
    return res.status(201).json({
      id: newMsg.id,
      content: newMsg.content,
      createdAt: newMsg.createdAt,
      userId: user.id,
      username: user.username,
      role: user.role || "Member",
      color: user.color || "#94a3b8",
      replyToId: newMsg.replyToId,
      replyToContent,
      replyToUsername
    });
  } catch (error) {
    console.error('Chat POST error:', error);
    return res.status(500).json({ message: 'Failed to send message' });
  }
}

async function handleChatAssignRole(req: VercelRequest, res: VercelResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret') as any;

    const userResult = await pool.query(`
      SELECT u.id, u.username, r.name as role
      FROM app_users u
      LEFT JOIN app_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [decoded.userId]);

    if (userResult.rowCount === 0) return res.status(401).json({ message: 'User not found' });
    const chatUser = userResult.rows[0];

    const { userId, roleName } = req.body || {};
    if (!roleName || typeof roleName !== 'string') {
      return res.status(400).json({ message: 'roleName is required' });
    }

    const targetUserId = userId || chatUser.id;

    if (userId && userId !== chatUser.id) {
      const allowed = ['Owner', 'Admin', 'Moderator', 'Leader'];
      if (!allowed.includes(chatUser.role)) {
        return res.status(403).json({ message: 'Insufficient permissions to assign roles' });
      }
    }

    const roleResult = await pool.query(`
      SELECT id, name, color
      FROM app_roles
      WHERE name = $1
      LIMIT 1
    `, [roleName]);

    if (roleResult.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const role = roleResult.rows[0];
    await pool.query(`
      UPDATE app_users
      SET role_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [role.id, targetUserId]);

    return res.json({ id: role.id, name: role.name, color: role.color });
  } catch (error) {
    console.error('Chat assign role error:', error);
    return res.status(500).json({ message: 'Failed to assign role' });
  }
}

// ── A2U Payment Handlers ────────────────────────────────────────────────────
async function handleA2URefund(req: VercelRequest, res: VercelResponse) {
  if (!PI_SANDBOX_MODE) {
    return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
  }
  if (!PI_SANDBOX_MODE) {
    return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
  }
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
  try {
    const { userId, piUID, amount, reason, transactionId } = req.body || {};
    if (!amount || (!userId && !piUID && !transactionId)) {
      return res.status(400).json({ error: 'amount and userId/piUID or transactionId required' });
    }
    let resolvedPiUID = piUID;
    let resolvedUserId = userId;
    if (transactionId && !resolvedUserId) {
      const tx = await pool.query('SELECT user_id FROM app_transactions WHERE id = $1', [transactionId]);
      if (tx.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
      resolvedUserId = tx.rows[0].user_id;
    }
    if (!resolvedPiUID && resolvedUserId) {
      const u = await pool.query('SELECT pi_uid FROM app_users WHERE id = $1', [resolvedUserId]);
      if (u.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      resolvedPiUID = u.rows[0].pi_uid;
    }
    if (!resolvedPiUID) return res.status(400).json({ error: 'Could not resolve Pi UID for user' });

    const { piNetworkService } = await import('../server/services/pi-network.js');
    const result = await piNetworkService.processFullA2UPayment({
      amount: Number(amount),
      memo: reason || 'B4U Esports Refund',
      metadata: { type: 'refund', transactionId, reason, userId: resolvedUserId },
      uid: resolvedPiUID,
    });
    if (!result) return res.status(500).json({ error: 'A2U refund failed', hint: 'Check Vercel logs for Pi API error details' });
    if (transactionId) {
      await pool.query("UPDATE app_transactions SET status='refunded', success_reason=$1, updated_at=NOW() WHERE id=$2", [`Refunded via A2U. TxID: ${result.txid}`, transactionId]);
    }
    console.log(`✅ Refund A2U: ${amount} Pi → ${resolvedPiUID}, txid: ${result.txid}`);
    return res.status(200).json({ success: true, paymentId: result.paymentId, txid: result.txid, amount, piUID: resolvedPiUID });
  } catch (e: any) {
    console.error('A2U refund error:', e.message);
    const piError = e.response?.data || e.cause?.message || e.message;
    return res.status(500).json({ error: 'Refund failed', details: e.message, piError });
  }
}

async function handleA2UGiveaway(req: VercelRequest, res: VercelResponse) {
  if (!PI_SANDBOX_MODE) {
    return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
  }
  if (!PI_SANDBOX_MODE) {
    return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
  }
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
  try {
    const { userId, piUID, amount, reason } = req.body || {};
    if (!amount || (!userId && !piUID)) return res.status(400).json({ error: 'amount and userId or piUID required' });
    let resolvedPiUID = piUID;
    if (!resolvedPiUID && userId) {
      const u = await pool.query('SELECT pi_uid FROM app_users WHERE id = $1', [userId]);
      if (u.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      resolvedPiUID = u.rows[0].pi_uid;
    }
    if (!resolvedPiUID) return res.status(400).json({ error: 'Could not resolve Pi UID' });
    const { piNetworkService } = await import('../server/services/pi-network.js');
    const result = await piNetworkService.processFullA2UPayment({
      amount: Number(amount), memo: reason || 'B4U Esports Giveaway Reward',
      metadata: { type: 'giveaway', reason, userId }, uid: resolvedPiUID,
    });
    if (!result) return res.status(500).json({ error: 'A2U giveaway failed' });
    return res.status(200).json({ success: true, paymentId: result.paymentId, txid: result.txid, amount, piUID: resolvedPiUID });
  } catch (e: any) { return res.status(500).json({ error: 'Giveaway failed', details: e.message }); }
}

async function handleA2UTournamentPrize(req: VercelRequest, res: VercelResponse) {
  if (!PI_SANDBOX_MODE) {
    return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
  }
  if (!PI_SANDBOX_MODE) {
    return res.status(503).json({ error: 'Pi App-to-User payments are currently supported only in Pi Testnet.' });
  }
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return res.status(auth.error === 'Forbidden' ? 403 : 401).json({ message: auth.error });
  try {
    const { userId, piUID, amount, tournamentId, rank, memo } = req.body || {};
    if (!amount || (!userId && !piUID)) return res.status(400).json({ error: 'amount and userId or piUID required' });
    let resolvedPiUID = piUID;
    if (!resolvedPiUID && userId) {
      const u = await pool.query('SELECT pi_uid FROM app_users WHERE id = $1', [userId]);
      if (u.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      resolvedPiUID = u.rows[0].pi_uid;
    }
    if (!resolvedPiUID) return res.status(400).json({ error: 'Could not resolve Pi UID' });
    const { piNetworkService } = await import('../server/services/pi-network.js');
    const result = await piNetworkService.processFullA2UPayment({
      amount: Number(amount), memo: memo || `B4U Esports Tournament Prize — Rank #${rank || '?'}`,
      metadata: { type: 'tournament_prize', tournamentId, rank, userId }, uid: resolvedPiUID,
    });
    if (!result) return res.status(500).json({ error: 'A2U tournament prize failed' });
    return res.status(200).json({ success: true, paymentId: result.paymentId, txid: result.txid, amount, piUID: resolvedPiUID });
  } catch (e: any) { return res.status(500).json({ error: 'Tournament prize failed', details: e.message }); }
}

// Update the main handler to include the new endpoint
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS and CSP headers for Pi Browser and PiNet compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.minepi.com https://*.pinet.com minepi.com pinet.com;");
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Log all incoming requests for debugging
  console.log('API Handler: Incoming request', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: redactHeaders(req.headers),
    body: getPublicBodyLog(req.body)
  });
  
  // Extract endpoint from URL
  const url = req.url || '';
  console.log('API Handler: Processing URL:', url);
  
  // Remove query parameters if present and extract path
  const fullPath = url.split('?')[0] || '';
  console.log('API Handler: Full path without query params:', fullPath);
  
  // Log the request method specifically for auth endpoint
  if (fullPath === '/api/auth/pi') {
    console.log('API Handler: Request method for /api/auth/pi:', req.method);
    console.log('API Handler: Request body for /api/auth/pi:', req.body);
  }
  
  // Handle different endpoints based on URL path
  if (fullPath === '/api/tournaments') {
    return handleTournaments(req, res);
  }
  if (fullPath.startsWith('/api/tournaments/')) {
    const parts = fullPath.split('/').filter(Boolean);
    const tournamentId = parts[2] || '';
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }

    let tournamentClient: PoolClient | undefined;
    try {
      tournamentClient = await pool.connect();
      const resolvedTournamentId = await resolveTournamentId(tournamentId, tournamentClient);
      if (!resolvedTournamentId) {
        tournamentClient?.release();
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (parts.length === 3) {
        return await handleTournamentById(req, res, resolvedTournamentId, tournamentClient);
      }
      if (parts.length === 4 && parts[3] === 'register') {
        return await handleTournamentRegister(req, res, resolvedTournamentId, tournamentClient);
      }
      if (parts.length === 4 && parts[3] === 'teams') {
        return await handleTournamentTeams(req, res, resolvedTournamentId, tournamentClient);
      }
      if (parts.length === 4 && parts[3] === 'lobby-access') {
        return await handleTournamentLobbyAccess(req, res, resolvedTournamentId, tournamentClient);
      }
      if (parts.length === 4 && parts[3] === 'lobby') {
        return await handleTournamentLobbyCreate(req, res, resolvedTournamentId, tournamentClient);
      }
      if (parts.length === 5 && parts[3] === 'matches') {
        return await handleTournamentMatchComplete(req, res, resolvedTournamentId, parts[4], tournamentClient);
      }
      if (parts.length === 6 && parts[3] === 'matches' && parts[5] === 'complete') {
        return await handleTournamentMatchComplete(req, res, resolvedTournamentId, parts[4], tournamentClient);
      }
      if (parts.length === 6 && parts[3] === 'matches' && parts[5] === 'results') {
        return await handleTournamentMatchResults(req, res, resolvedTournamentId, parts[4], tournamentClient);
      }
    } catch (error: any) {
      console.error('Tournament handler error:', error.message);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Tournament request failed', details: error.message });
      }
    } finally {
      if (tournamentClient) {
        try {
          tournamentClient.release();
        } catch (releaseError) {
          console.error('Failed to release tournament client:', releaseError);
        }
      }
    }
  }

  if (fullPath === '/api/tournament-registration/save') {
    console.log('API Handler: Routing to handleTournamentRegistrationSave');
    return handleTournamentRegistrationSave(req, res);
  }

  if (fullPath === '/api/tournament-registration/update-squad') {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ message: 'No token provided' });
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      const { userId, tournamentId, players, teamName, mode } = req.body;
      if (!userId || !tournamentId || !players || !Array.isArray(players)) {
        return res.status(400).json({ message: 'userId, tournamentId, and players are required' });
      }
      if (decoded.userId !== userId) return res.status(403).json({ message: 'Forbidden' });

      const storageModule = await import('../dist/server/storage.js');
      const storage = new storageModule.DatabaseStorage();

      const existingRegs = await storage.getUserTournamentRegistrations(userId);
      const reg = existingRegs.find((r: any) => r.tournamentId === tournamentId && r.paymentStatus === 'paid');
      if (!reg) return res.status(404).json({ message: 'No paid registration found for this tournament' });

      const updatedMetadata = {
        ...(reg.metadata || {}),
        players: players.map((p: any, i: number) => ({
          ign: String(p.pubgIgn || p.ign || '').trim(),
          uid: String(p.pubgUid || p.uid || '').trim(),
          email: String(p.email || '').trim(),
          phone: String(p.phone || '').trim(),
          mugshotName: p.mugshotName || '',
          isCaptain: i === 0,
        })),
        teamName: teamName ? String(teamName).trim() : (reg.metadata as any)?.teamName,
        mode: mode || (reg.metadata as any)?.mode,
        updatedAt: new Date().toISOString(),
      } as Record<string, any>;

      await storage.updateTournamentRegistration(reg.id, { metadata: updatedMetadata } as any);

      // Also update team name if changed
      if (reg.teamId && teamName) {
        await pool.query(
          `UPDATE tournament_teams SET name = $1, metadata = metadata || $2::jsonb, updated_at = NOW() WHERE id = $3`,
          [String(teamName).trim(), JSON.stringify({ players: updatedMetadata.players }), reg.teamId]
        );
      }

      return res.json({ success: true, message: 'Squad updated successfully', registrationId: reg.id });
    } catch (error: any) {
      console.error('Update squad error:', error.message);
      return res.status(500).json({ message: 'Failed to update squad', error: error.message });
    }
  }

  if (fullPath.startsWith('/api/chat')) {
    return res.status(410).json({ error: 'Chat feature has been removed' });
  }

  if (fullPath === '/api/packages') {
    console.log('API Handler: Routing to handlePackages');
    return handlePackages(req, res);
  }
  
  if (fullPath === '/api/pi-price') {
    console.log('API Handler: Routing to handlePiPrice');
    return handlePiPrice(req, res);
  }
  
  if (fullPath === '/api/profile') {
    console.log('API Handler: Routing to handleProfile');
    // Implementation would go here
  }

  if (fullPath === '/api/translation/ollama') {
    return res.status(404).json({ message: 'Endpoint removed' });
  }

  if (fullPath === '/api/transactions') {
    console.log('API Handler: Routing to handleTransactions');
    return handleTransactions(req, res);
  }
  
  if (fullPath === '/api/auth/pi') {
    console.log('API Handler: Routing to handlePiAuth for path:', fullPath);
    console.log('API Handler: Method for handlePiAuth:', req.method);
    return handlePiAuth(req, res);
  }
  
  if (fullPath === '/api/payment/approve') {
    console.log('API Handler: Routing to handlePaymentApprove');
    return handlePaymentApprove(req, res);
  }
  
  if (fullPath === '/api/payment/complete') {
    console.log('API Handler: Routing to handlePaymentComplete');
    return handlePaymentComplete(req, res);
  }
  
  if (fullPath === '/api/payment/incomplete') {
    console.log('API Handler: Routing to handleIncompletePayment');
    return handleIncompletePaymentV2(req, res);
  }

  if (fullPath === '/api/payment/create') {
    console.log('API Handler: Routing to handlePaymentCreate');
    console.log('API Handler: Payment create request details', {
      method: req.method,
      body: req.body,
      headers: req.headers
    });
    return handlePaymentCreate(req, res);
  }
  
  if (fullPath === '/api/payment/cancel') {
    console.log('API Handler: Routing to handlePaymentCancel');
    return handlePaymentCancel(req, res);
  }
  
  if (fullPath === '/api/user/balance') {
    console.log('API Handler: Routing to handleUserBalance');
    return handleUserBalance(req, res);
  }
  
  if (fullPath === '/api/user/connect-wallet') {
    console.log('API Handler: Routing to handleConnectWallet');
    return handleConnectWallet(req, res);
  }
  
  if (fullPath === '/api/user/refresh-balance') {
    console.log('API Handler: Routing to handleRefreshPiBalance');
    return handleRefreshPiBalance(req, res);
  }

  if (fullPath === '/api/user/subscriptions') {
    console.log('API Handler: Routing to handleUserSubscriptions');
    return handleUserSubscriptions(req, res);
  }

  if (fullPath === '/api/user/staking') {
    console.log('API Handler: Routing to handleUserStaking');
    return handleUserStaking(req, res);
  }
  
  if (fullPath === '/api/profile') {
    console.log('API Handler: Routing to handleProfile');
    return handleProfile(req, res);
  }
  
  if (fullPath === '/api/user/tokens/add') {
    console.log('API Handler: Routing to handleAddUserTokens');
    return handleAddUserTokens(req, res);
  }

  if (fullPath === '/api/token/claim/daily') {
    console.log('API Handler: Routing to handleDailyClaimReward');
    return handleDailyClaimReward(req, res);
  }

  if (fullPath === '/api/token/claim/daily/status') {
    console.log('API Handler: Routing to handleDailyClaimStatus');
    return handleDailyClaimStatus(req, res);
  }

  if (fullPath === '/api/token/balance') {
    console.log('API Handler: Routing to handleTokenBalance');
    return handleTokenBalance(req, res);
  }

  if (fullPath === '/api/token/rewards') {
    console.log('API Handler: Routing to handleTokenRewards');
    return handleTokenRewards(req, res);
  }
  
  if (fullPath === '/api/user/referral/reward') {
    console.log('API Handler: Routing to handleReferralReward');
    return handleReferralReward(req, res);
  }

  if (fullPath === '/api/user/redeem-tokens') {
    console.log('API Handler: Routing to handleRedeemTokens');
    return handleRedeemTokens(req, res);
  }

  if (fullPath === '/api/admin/redemptions') {
    console.log('API Handler: Routing to handleAdminRedemptions');
    return handleAdminRedemptions(req, res);
  }

  if (fullPath.startsWith('/api/admin/redemptions/')) {
    const parts = fullPath.split('/').filter(Boolean);
    const redemptionId = parts[3] || '';
    const action = parts[4] || '';
    if (!redemptionId || !['approve', 'reject'].includes(action)) {
      return res.status(404).json({ message: 'Admin redemption route not found' });
    }
    console.log('API Handler: Routing to handleAdminRedemptionAction');
    return handleAdminRedemptionAction(req, res, redemptionId, action as 'approve' | 'reject');
  }

  if (fullPath === '/api/leaderboard') {
    console.log('API Handler: Routing to handleLeaderboard');
    return handleLeaderboard(req, res);
  }

  if (fullPath === '/api/user/ranking') {
    console.log('API Handler: Routing to handleUserRanking');
    return handleUserRanking(req, res);
  }

  if (fullPath === '/api/recent-purchases') {
    console.log('API Handler: Routing to handleRecentPurchases');
    return handleRecentPurchases(req, res);
  }

  if (fullPath === '/api/feedback') {
    console.log('API Handler: Routing to handleFeedback');
    return handleFeedback(req, res);
  }

  if (fullPath === '/api/notifications') {
    console.log('API Handler: Routing to handleNotifications');
    return handleNotifications(req, res);
  }

  if (fullPath.match(/^\/api\/notifications\/[^\/]+\/read$/)) {
    console.log('API Handler: Routing to handleNotificationRead');
    return handleNotificationRead(req, res);
  }

  if (fullPath === '/api/feedback/reply') {
    console.log('API Handler: Routing to handleFeedbackReply');
    return handleFeedbackReply(req, res);
  }

  if (fullPath === '/api/marketing/coupon/validate') {
    console.log('API Handler: Routing to handleMarketingCouponValidate');
    return handleMarketingCouponValidate(req, res);
  }

  if (fullPath === '/api/marketing/track/open') {
    console.log('API Handler: Routing to handleMarketingOpen');
    return handleMarketingOpen(req, res);
  }

  if (fullPath === '/api/marketing/track/click') {
    console.log('API Handler: Routing to handleMarketingClick');
    return handleMarketingClick(req, res);
  }

  // Handle PiNet metadata requests - also handle malformed paths
  if (fullPath === '/api/pinet/meta' || fullPath.startsWith('/api/pinet/meta/')) {
    console.log('API Handler: Routing to handlePiNetMeta for path:', fullPath);
    return handlePiNetMeta(req, res);
  }
  
  // Handle duplicated path requests (common misconfiguration in Pi Developer Portal)
  if (fullPath === '/api/pinet/meta/pinet/meta') {
    console.log('API Handler: Routing duplicated path /api/pinet/meta/pinet/meta to handlePiNetMeta');
    return handlePiNetMeta(req, res);
  }
  
  if (fullPath === '/api/admin/login') {
    console.log('API Handler: Routing to handleAdminLogin');
    return handleAdminLogin(req, res);
  }

  if (fullPath === '/api/admin/analytics') {
    return handleAdminAnalytics(req, res);
  }

  if (fullPath === '/api/admin/users') {
    return handleAdminUsers(req, res);
  }

  if (fullPath === '/api/admin/transactions') {
    return handleAdminTransactions(req, res);
  }

  if (fullPath === '/api/admin/packages') {
    return handleAdminPackages(req, res);
  }

  // ── A2U Payment endpoints (admin only) ──────────────────────────────────
  if (fullPath === '/api/payments/a2u/refund') {
    return handleA2URefund(req, res);
  }
  if (fullPath === '/api/payments/a2u/giveaway') {
    return handleA2UGiveaway(req, res);
  }
  if (fullPath === '/api/payments/a2u/tournament-prize') {
    return handleA2UTournamentPrize(req, res);
  }
  if (fullPath === '/api/payments/a2u/status') {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(401).json({ message: auth.error });
    const hasSeed = !!(process.env.WALLET_PRIVATE_SEED);
    const hasApiKey = !!(process.env.PI_SERVER_API_KEY);
    return res.status(200).json({
      WALLET_PRIVATE_SEED: hasSeed ? `SET (length: ${process.env.WALLET_PRIVATE_SEED!.length})` : 'NOT SET',
      PI_SERVER_API_KEY: hasApiKey ? `SET (${process.env.PI_SERVER_API_KEY!.substring(0,8)}...)` : 'NOT SET',
    });
  }

  if (fullPath.startsWith('/api/admin/packages/') && req.method === 'PUT') {
    return handleAdminPackageUpdate(req, res);
  }
  
  // Temporary debug endpoint to check transactions
  if (fullPath === '/api/debug/transactions') {
    console.log('API Handler: Routing to handleDebugTransactions');
    return handleDebugTransactions(req, res);
  }

  // Endpoint to check today's purchases
  if (fullPath === '/api/debug/today-purchases') {
    console.log('API Handler: Routing to handleTodayPurchases');
    return handleTodayPurchases(req, res);
  }
  
  // Temporary debug endpoint to check database connectivity and table existence
  if (fullPath === '/api/debug/database') {
    console.log('API Handler: Routing to handleDebugDatabase');
    return handleDebugDatabase(req, res);
  }
  
  // Endpoint to sync transaction statuses with Pi Network
  if (fullPath === '/api/sync-transactions') {
    console.log('API Handler: Routing to handleSyncTransactionStatuses');
    return handleSyncTransactionStatuses(req, res);
  }
  
  // New endpoint to sync transaction statuses using ES module service
  if (fullPath === '/api/sync-transactions-es') {
    console.log('API Handler: Routing to handleSyncTransactionStatusesES');
    return handleSyncTransactionStatusesES(req, res);
  }
  
  // Public analytics endpoint
  if (fullPath === '/api/analytics') {
    console.log('API Handler: Routing to handleAnalytics');
    return handleAnalytics(req, res);
  }
  
  // Default for unmatched endpoints
  console.log('API Handler: Endpoint not found for path:', fullPath);
  return res.status(404).json({ message: 'Endpoint not found' });
}

async function handleNotifications(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing or invalid token' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token signature' });
    }

    const result = await pool.query(
      'SELECT id, user_id AS "userId", title, message, type, status, metadata, read_at AS "readAt", created_at AS "createdAt" FROM app_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [decoded.userId]
    );

    console.log(`API Handler: Successfully fetched ${result.rows.length} notifications, sending response...`);
    return res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
  }
}

async function handleNotificationRead(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing or invalid token' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token signature' });
    }

    const pathParts = (req.url || '').split('?')[0].split('/');
    const notificationId = pathParts[3];

    if (!notificationId) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const result = await pool.query(
      'UPDATE app_notifications SET status = $1, read_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, user_id AS "userId", title, message, type, status, metadata, read_at AS "readAt", created_at AS "createdAt"',
      ['read', notificationId, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to mark notification as read:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read', details: error.message });
  }
}


// Handler for Adding User Tokens
async function handleAddUserTokens(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided. Please log in again.' });
    }

    // Validate JWT format before verification
    if (token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (verifyError: any) {
      console.error('JWT verification error:', verifyError.message);
      return res.status(401).json({ message: 'Invalid token signature. Please log in again.' });
    }
    
    const userId = decoded.userId;

    const { amount, adId } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid token amount. Amount must be a positive number.' });
    }

    if (!adId || typeof adId !== 'string' || !adId.trim()) {
      return res.status(400).json({ message: 'Ad verification is required before rewarding tokens.' });
    }

    // Verify the ad status with Pi Platform API before rewarding tokens
    if (adId) {
      console.log('Add User Tokens endpoint: Verifying ad status for adId:', adId);
      
      try {
        // Load Pi Network service dynamically
        const piNetworkModule = await import('../dist/server/services/pi-network.js');
        const piNetworkService = piNetworkModule.piNetworkService;
        
        // Verify the ad status with Pi Platform API
        const ad = await piNetworkService.verifyAdStatus(adId);
        
        if (!ad) {
          console.log('Add User Tokens endpoint: Ad not found or verification failed for adId:', adId);
          return res.status(404).json({ message: 'Ad not found or verification failed.' });
        }
        
        // According to Pi Platform documentation, we should only reward users
        // if mediator_ack_status for given ad is "granted"
        if (ad.mediator_ack_status !== 'granted') {
          console.log('Add User Tokens endpoint: Ad reward not granted for adId:', adId);
          return res.status(403).json({ message: 'Ad verification failed. Reward not granted.' });
        }
        
        console.log('Add User Tokens endpoint: Ad reward verified for adId:', adId);
      } catch (adError: any) {
        console.error('Add User Tokens endpoint: Ad verification failed:', adError.message);
        return res.status(500).json({ message: `Ad verification failed: ${adError.message}` });
      }
    }

    const tokenAmount = Number(amount);
    if (tokenAmount !== 10) {
      return res.status(400).json({ message: 'Invalid rewarded ad amount.' });
    }
    const updatedTokens = await grantB4uTokens(
      userId,
      tokenAmount,
      'watch_ad',
      `Watch ad reward: ${tokenAmount} ${B4U_TOKEN_NAME}`,
      adId,
    );

    res.json({ 
      message: `${B4U_TOKEN_NAME} added successfully`,
      tokenName: B4U_TOKEN_NAME,
      tokenSymbol: B4U_TOKEN_SYMBOL,
      tokensAwarded: tokenAmount,
      tokens: updatedTokens,
    });
  } catch (error: any) {
    console.error('Add tokens error:', error);
    // Handle JWT errors specifically
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
    } else {
      const errorMessage = (error as Error).message || 'Unknown error occurred';
      res.status(500).json({ message: `Failed to add tokens: ${errorMessage}` });
    }
  }
}

// Handler for Daily Login Reward Claim
async function handleDailyClaimReward(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken || authToken.split('.').length !== 3) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(authToken, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }

    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();
    const user = await storage.getUser(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // 24-hour cooldown check
    const now = new Date();
    if (user.lastDailyClaimAt) {
      const hoursSince = (now.getTime() - new Date(user.lastDailyClaimAt).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        const nextClaimAt = new Date(new Date(user.lastDailyClaimAt).getTime() + 24 * 60 * 60 * 1000);
        return res.status(429).json({
          message: `Daily reward already claimed. Come back in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.`,
          nextClaimAt: nextClaimAt.toISOString(),
          hoursLeft,
        });
      }
    }

    const DAILY_REWARD = 10;

    const updatedTokens = await grantB4uTokens(
      decoded.userId,
      DAILY_REWARD,
      'daily_reward',
      `Daily reward: ${DAILY_REWARD} ${B4U_TOKEN_NAME}`,
    );

    // Update lastDailyClaimAt
    await storage.updateUser(decoded.userId, { lastDailyClaimAt: now } as any);

    const userPiUid = user.piUID || (user as any).pi_uid;
    if (userPiUid) {
      sendPiInAppNotification({
        title: '🎁 Daily Reward Claimed!',
        body: `+${DAILY_REWARD} ${B4U_TOKEN_NAME} added! Come back in 24 hours to collect your next daily bonus.`,
        user_uid: userPiUid,
        subroute: '/dashboard',
      }).catch(() => {});
    }

    return res.json({
      message: `You claimed ${DAILY_REWARD} ${B4U_TOKEN_NAME}!`,
      tokenName: B4U_TOKEN_NAME,
      tokenSymbol: B4U_TOKEN_SYMBOL,
      tokensAwarded: DAILY_REWARD,
      tokens: updatedTokens,
      nextClaimAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Daily claim error:', error);
    return res.status(500).json({ message: 'Failed to claim daily reward. Please try again.' });
  }
}

// Handler for Daily Login Reward Status
async function handleDailyClaimStatus(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken || authToken.split('.').length !== 3) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(authToken, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();
    const user = await storage.getUser(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    let canClaim = true;
    let hoursLeft = 0;
    let nextClaimAt: string | null = null;

    if (user.lastDailyClaimAt) {
      const hoursSince = (now.getTime() - new Date(user.lastDailyClaimAt).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        canClaim = false;
        hoursLeft = Math.ceil(24 - hoursSince);
        nextClaimAt = new Date(new Date(user.lastDailyClaimAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
      }
    }

    return res.json({
      canClaim,
      hoursLeft,
      nextClaimAt,
      lastClaimedAt: user.lastDailyClaimAt ? new Date(user.lastDailyClaimAt).toISOString() : null,
      dailyRewardAmount: 10,
      tokenName: B4U_TOKEN_NAME,
      tokenSymbol: B4U_TOKEN_SYMBOL,
    });
  } catch (error: any) {
    console.error('Daily claim status error:', error);
    return res.status(500).json({ message: 'Failed to fetch claim status.' });
  }
}

// Handler for User Profile
async function handleProfile(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Validate JWT format before verification
      if (token.split('.').length !== 3) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch (verifyError: any) {
        console.error('JWT verification error:', verifyError.message);
        return res.status(401).json({ message: 'Invalid token signature' });
      }
      
      const userId = decoded.userId;

      // Load storage service dynamically
      const storageModule = await import('../dist/server/storage.js');
      const storage = new storageModule.DatabaseStorage();

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get user's referral code from the referral_codes table
      let userReferralCode = null;
      try {
        userReferralCode = await storage.getUserReferralCode(user.id);
        console.log('Retrieved referral code for user in profile endpoint:', user.id, userReferralCode);
      } catch (referralError) {
        console.error('Error fetching referral code in profile endpoint:', referralError);
        // Don't fail the profile fetch if we can't get the referral code
      }

      // Owner/admin visibility is keyed only by the verified Pi UID.
      const isAdmin = isOwnerPiUID(user.piUID);

      console.log('🔐 Profile endpoint Admin check — user.piUID:', user.piUID);
      console.log('🔐 Profile endpoint Admin check — OWNER_PI_UID:', OWNER_PI_UID);
      console.log('🔐 Profile endpoint Admin check — isAdmin:', isAdmin);

      // Return user data with referral code and admin status
      // Add cache control headers to prevent 304 Not Modified responses
      // Ensure fresh profile data is always returned
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({
        ...user,
        referralCode: userReferralCode,
        isAdmin,
        piUID: user.piUID
      });
    } catch (error: any) {
      console.error('Profile fetch error:', error);
      // Handle JWT errors specifically
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired. Please log in again.' });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
      } else {
        res.status(500).json({ message: 'Failed to fetch profile' });
      }
    }
  } else if (req.method === 'PUT') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Validate JWT format before verification
      if (token.split('.').length !== 3) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      } catch (verifyError: any) {
        console.error('JWT verification error:', verifyError.message);
        return res.status(401).json({ message: 'Invalid token signature' });
      }
      
      const userId = decoded.userId;

      const updateData = req.body;
      
      // Load storage service dynamically
      const storageModule = await import('../dist/server/storage.js');
      const storage = new storageModule.DatabaseStorage();

      // Deep-merge metadata so lastTeamRoster and other keys aren't overwritten
      if (updateData.metadata && typeof updateData.metadata === 'object') {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.metadata) {
          updateData.metadata = { ...(currentUser.metadata as any), ...updateData.metadata };
        }
      }

      // Validate required fields
      if (updateData.email && !updateData.email.endsWith('@gmail.com')) {
        return res.status(400).json({ message: 'Email must be a Gmail address' });
      }

      const contactConflict = await validateUniqueProfileContact(userId, updateData.email, updateData.phone);
      if (contactConflict) {
        return res.status(contactConflict.status).json({
          success: false,
          code: contactConflict.code,
          message: contactConflict.message,
        });
      }

      // Check if required fields are provided to set profile as verified
      if (updateData.email && updateData.phone) {
        updateData.isProfileVerified = true;
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if profile should be marked as verified
      // Profile is verified when both email and phone are provided (not empty strings)
      const shouldMarkAsVerified = updatedUser.email && updatedUser.phone && 
                                   updatedUser.email.trim() !== '' && updatedUser.phone.trim() !== '';
      
      // Update the verification status if needed
      if (shouldMarkAsVerified && !updatedUser.isProfileVerified) {
        try {
          const verifiedUser = await storage.updateUser(userId, { isProfileVerified: true });
          if (verifiedUser) {
            updatedUser.isProfileVerified = verifiedUser.isProfileVerified;
          }
        } catch (verificationError) {
          console.error('Error updating profile verification status:', verificationError);
        }
      } else if (!shouldMarkAsVerified && updatedUser.isProfileVerified) {
        // In case somehow the profile was verified but now missing required fields
        try {
          const unverifiedUser = await storage.updateUser(userId, { isProfileVerified: false });
          if (unverifiedUser) {
            updatedUser.isProfileVerified = unverifiedUser.isProfileVerified;
          }
        } catch (verificationError) {
          console.error('Error updating profile verification status:', verificationError);
        }
      }

      // Send profile update email notification if user has an email address
      // Modified to send email on any profile update, not just when verified
      if (updatedUser.email) {
        console.log('DEBUG: Sending profile update email to', updatedUser.email);
        try {
          // Load email service dynamically
          const emailModule = await import('../dist/server/services/email.js');
          
          // Fetch the complete user data to ensure all information is included in the email
          const completeUser = await storage.getUser(userId);
          console.log('DEBUG: Fetched complete user data for email:', completeUser ? 'SUCCESS' : 'FAILED');
          
          if (completeUser && completeUser.email) {
            const emailResult = await emailModule.sendProfileUpdateEmail({
              to: completeUser.email,
              username: completeUser.username,
              profileData: completeUser
            });
            
            console.log('DEBUG: Email result:', emailResult); // true/false
            
            if (emailResult) {
              console.log('DEBUG: Profile update email sent successfully to', completeUser.email);
            } else {
              console.log('DEBUG: Profile update email failed to send to', completeUser.email);
            }
          } else {
            console.log('DEBUG: No valid email address found for user, skipping email notification');
          }
        } catch (emailError: any) {
          console.error('ERROR: Email failed', emailError);
        }
      } else {
        console.log('DEBUG: Email not sent - no email address provided');
      }

      res.json(updatedUser);
    } catch (error: any) {
      console.error('Profile update error:', error);
      // Handle JWT errors specifically
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired. Please log in again.' });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
      } else {
        res.status(500).json({ message: 'Profile update failed' });
      }
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function ensureDefaultPackageCatalog(storage: any) {
  const existingPackages = await storage.getPackages();
  const existingByIdentity = new Map(
    existingPackages.map((pkg: any) => [`${pkg.game}::${pkg.name}`, pkg])
  );

  const packageDefinitions = [
    { game: 'PUBG', name: 'PUBG Tournament Entry', inGameAmount: 0, usdtValue: '5.0000', image: '', isActive: true },
    { game: 'PUBG', name: '60 UC', inGameAmount: 60, usdtValue: '1.5000', image: '', isActive: true },
    { game: 'PUBG', name: '325 UC', inGameAmount: 325, usdtValue: '6.5000', image: '', isActive: true },
    { game: 'PUBG', name: '660 UC', inGameAmount: 660, usdtValue: '12.0000', image: '', isActive: true },
    { game: 'PUBG', name: '1800 UC', inGameAmount: 1800, usdtValue: '25.0000', image: '', isActive: true },
    { game: 'PUBG', name: '3850 UC', inGameAmount: 3850, usdtValue: '49.0000', image: '', isActive: true },
    { game: 'PUBG', name: '8100 UC', inGameAmount: 8100, usdtValue: '96.0000', image: '', isActive: true },
    { game: 'PUBG', name: '16200 UC', inGameAmount: 16200, usdtValue: '186.0000', image: '', isActive: true },
    { game: 'PUBG', name: '24300 UC', inGameAmount: 24300, usdtValue: '278.0000', image: '', isActive: true },
    { game: 'PUBG', name: '32400 UC', inGameAmount: 32400, usdtValue: '369.0000', image: '', isActive: true },
    { game: 'PUBG', name: '40500 UC', inGameAmount: 40500, usdtValue: '459.0000', image: '', isActive: true },
    { game: 'MLBB', name: '56 Diamonds', inGameAmount: 56, usdtValue: '3.0000', image: '', isActive: true },
    { game: 'MLBB', name: '278 Diamonds', inGameAmount: 278, usdtValue: '6.0000', image: '', isActive: true },
    { game: 'MLBB', name: '571 Diamonds', inGameAmount: 571, usdtValue: '11.0000', image: '', isActive: true },
    { game: 'MLBB', name: '1783 Diamonds', inGameAmount: 1783, usdtValue: '33.0000', image: '', isActive: true },
    { game: 'MLBB', name: '3005 Diamonds', inGameAmount: 3005, usdtValue: '52.0000', image: '', isActive: true },
    { game: 'MLBB', name: '6012 Diamonds', inGameAmount: 6012, usdtValue: '99.0000', image: '', isActive: true },
    { game: 'MLBB', name: '12000 Diamonds', inGameAmount: 12000, usdtValue: '200.0000', image: '', isActive: true },
    { game: 'COC', name: 'Gold Pass', inGameAmount: 1, usdtValue: '9.0000', image: '', isActive: true },
    { game: 'ROBUX', name: '40 Robux', inGameAmount: 40, usdtValue: '1.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
    { game: 'ROBUX', name: '80 Robux', inGameAmount: 80, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png', isActive: true },
    { game: 'NEWSTATE', name: '300 NC', inGameAmount: 300, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg', isActive: true },
    { game: 'FREEFIRE', name: '110 Diamonds', inGameAmount: 110, usdtValue: '2.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg', isActive: true },
    { game: 'TIKTOK_COINS', name: '70 Coins', inGameAmount: 70, usdtValue: '1.5000', image: 'https://b4uesports.com/wp-content/uploads/2026/04/tiktok-coins-package.png-removebg-preview.png', isActive: true },
    { game: 'TIKTOK_FOLLOWERS', name: '100 Followers', inGameAmount: 100, usdtValue: '2.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png', isActive: true },
    { game: 'TIKTOK_VIEWS', name: '30000 Views', inGameAmount: 30000, usdtValue: '55.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
    { game: 'TIKTOK_VIEWS', name: '50000 Views', inGameAmount: 50000, usdtValue: '85.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
    { game: 'TIKTOK_VIEWS', name: '100000 Views', inGameAmount: 100000, usdtValue: '200.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png', isActive: true },
    { game: 'YOUTUBE_SUBS', name: '100 Subscribers', inGameAmount: 100, usdtValue: '6.0000', image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png', isActive: true },
    { game: 'YOUTUBE_WATCHTIME', name: '2000 WT', inGameAmount: 2000, usdtValue: '38.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true },
    { game: 'YOUTUBE_WATCHTIME', name: '4000 WT', inGameAmount: 4000, usdtValue: '69.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg', isActive: true },
    { game: 'FACEBOOK', name: '500 Likes + Followers', inGameAmount: 500, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-logo.avif', isActive: true },
    { game: 'INSTAGRAM', name: '100 Followers', inGameAmount: 100, usdtValue: '4.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg', isActive: true },
    { game: 'NETFLIX', name: '1 Month Subscription', inGameAmount: 1, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/netflix-logo.png', isActive: true },
    { game: 'CANVA', name: 'Lifetime Pro Subscription', inGameAmount: 1, usdtValue: '3.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/canva.jpg', isActive: true },
    { game: 'PUBG_SUBSCRIPTION', name: 'PUBG Weekly Tournament Pass', inGameAmount: 1, usdtValue: '10.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/pubg-weekly-pass.png', isActive: true },
    { game: 'PUBG_SUBSCRIPTION', name: 'PUBG Monthly Tournament Pass', inGameAmount: 1, usdtValue: '15.0000', image: 'https://b4uesports.com/wp-content/uploads/2026/03/pubg-monthly-pass.png', isActive: true },
  ];

  for (const pkg of packageDefinitions) {
    const existingPackage = existingByIdentity.get(`${pkg.game}::${pkg.name}`) as any;
    if (!existingPackage) {
      await storage.createPackage(pkg);
      console.log(`Seeded package: ${pkg.name} (${pkg.game})`);
    } else if (!existingPackage.isActive) {
      await storage.updatePackage(existingPackage.id, { isActive: true });
      console.log(`Reactivated package: ${pkg.name} (${pkg.game})`);
    }
  }
}

// Handler for Packages
async function handlePackages(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  setShortCacheHeaders(res);

  try {
    console.log('Packages endpoint: Fetching packages with Pi pricing');
    
    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();
    
    let packages = await storage.getActivePackages();
    console.log('Packages endpoint: Found', packages.length, 'active packages');

    if (packages.length === 0) {
      console.log('Packages endpoint: No active packages found; seeding default package catalog');
      await ensureDefaultPackageCatalog(storage);
      packages = await storage.getActivePackages();
      console.log('Packages endpoint: Active packages after seeding', packages.length);
    }
    
    // Load pricing service dynamically
    const pricingModule = await import('../dist/server/services/pricing.js');
    const pricingService = pricingModule.pricingService;
    
    const currentPiPrice = await pricingService.getCurrentPiPrice();

    const packagesWithPiPricing = packages.map((pkg: any) => {
      if (pkg.game === 'PUBG_SUBSCRIPTION') {
        return {
          ...pkg,
          piPrice: pkg.name?.toLowerCase().includes('monthly') ? 30 : 20,
          currentPiPrice,
        };
      }

      // Special case for 0.06 UC package - use fixed Pi value if CoinGecko is not fetching small amounts
      if (pkg.name === '0.06 UC') {
        return {
          ...pkg,
          piPrice: 0.0001, // Fixed Pi value for 0.06 UC package
          currentPiPrice,
        };
      }
      
      // Regular calculation for all other packages
      return {
        ...pkg,
        piPrice: pricingService.calculatePiAmount(parseFloat(pkg.usdtValue)),
        currentPiPrice,
      };
    });

    console.log('Packages endpoint: Returning', packagesWithPiPricing.length, 'packages');
    const limit = req.query.limit !== undefined ? Math.min(50, Math.max(1, Number(req.query.limit) || 20)) : packagesWithPiPricing.length;
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const paginatedPackages = packagesWithPiPricing.slice((page - 1) * limit, page * limit);
    res.setHeader('X-Total-Count', String(packagesWithPiPricing.length));
    res.setHeader('X-Page', String(page));
    res.setHeader('X-Limit', String(limit));
    res.json(paginatedPackages);
  } catch (error) {
    console.error('Packages fetch error:', error);
    // Return empty array instead of error to prevent UI issues
    res.json([]);
  }
}

// Handler for User Subscriptions - returns active subscriptions with dates
async function handleUserSubscriptions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    if (token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (verifyError: any) {
      console.error('JWT verification error:', verifyError.message);
      return res.status(401).json({ message: 'Invalid token signature' });
    }

    const userId = decoded.userId;

    const client = await pool.connect();
    try {
      // Get all subscriptions for this user, with active ones first
      const result = await client.query(
        `SELECT 
          id,
          user_id,
          sub_id,
          status,
          subscription_type,
          subscription_name,
          subscription_duration,
          amount_pi,
          expires_at,
          last_processed_at,
          created_at,
          updated_at,
          user_name,
          user_email,
          user_game_ign,
          user_game_uid,
          user_team_name,
          CASE 
            WHEN status = 'active' AND expires_at > NOW() THEN true
            ELSE false
          END as is_currently_active,
          CASE 
            WHEN status = 'active' AND expires_at > NOW() 
            THEN expires_at - NOW()
            ELSE NULL
          END as remaining_duration
        FROM pi_subscriptions
        WHERE user_id = $1
        ORDER BY 
          CASE WHEN status = 'active' AND expires_at > NOW() THEN 0 ELSE 1 END,
          created_at DESC`,
        [userId]
      );

      const subscriptions = result.rows.map((row: any) => ({
        id: row.id,
        subscriptionType: row.subscription_type,
        subscriptionName: row.subscription_name,
        subscriptionDuration: row.subscription_duration,
        status: row.is_currently_active ? 'active' : (row.status === 'active' ? 'expired' : row.status),
        amountPi: row.amount_pi,
        activeSince: (row.last_processed_at || row.created_at) ? new Date(row.last_processed_at || row.created_at).toISOString() : null,
        activeUntil: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        isCurrentlyActive: row.is_currently_active,
        remainingDuration: row.remaining_duration ? {
          days: Math.floor(row.remaining_duration.days || 0),
          hours: Math.floor(row.remaining_duration.hours || 0),
        } : null,
        userName: row.user_name,
        userEmail: row.user_email,
        userGameIgn: row.user_game_ign,
        userGameUid: row.user_game_uid,
        userTeamName: row.user_team_name,
        createdAt: row.created_at,
      }));

      res.json({ subscriptions });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fetch subscriptions error:', error);
    res.status(500).json({
      message: 'Failed to fetch subscriptions',
      subscriptions: [],
    });
  }
}

// Handler for Ecosystem Directory Staking Status (September 2026 Developer Capability)
async function handleUserStaking(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const piUID = decoded?.piUID;
    if (!piUID) {
      return res.status(400).json({ message: 'Pi UID not found in session' });
    }

    let effectiveStake = 0;
    let baseStake = 0;
    let boostMultiplier = 1.0;
    let stakedAt: string | null = null;

    try {
      const piRes = await axios.get(`https://api.minepi.com/v2/staking/app/users/${piUID}`, {
        headers: { 'Authorization': `Key ${PI_SERVER_API_KEY}` },
        timeout: 5000,
      });
      if (piRes.data) {
        effectiveStake = piRes.data.effective_stake || 0;
        baseStake = piRes.data.base_stake || 0;
        boostMultiplier = piRes.data.boost_multiplier || 1.0;
        stakedAt = piRes.data.staked_at || null;
      }
    } catch {
      // User not staked or app awaiting whitelisting
    }

    let supporterTier = 'None';
    let discountPercent = 0;
    let tokenBonusPercent = 0;

    if (effectiveStake >= 100) {
      supporterTier = 'Diamond Ambassador';
      discountPercent = 10;
      tokenBonusPercent = 25;
    } else if (effectiveStake >= 25) {
      supporterTier = 'Gold Booster';
      discountPercent = 5;
      tokenBonusPercent = 15;
    } else if (effectiveStake >= 5) {
      supporterTier = 'Silver Supporter';
      discountPercent = 2;
      tokenBonusPercent = 10;
    }

    return res.status(200).json({
      success: true,
      isStaker: effectiveStake > 0,
      effectiveStake,
      baseStake,
      boostMultiplier,
      stakedAt,
      supporterTier,
      perks: {
        discountPercent,
        tokenBonusPercent,
        badge: supporterTier !== 'None' ? `${supporterTier} (Ecosystem Directory)` : null,
      },
      info: {
        title: "Pi Ecosystem Directory Staking",
        description: "Stake Pi in the Pi Browser Ecosystem Directory to boost B4U Esports ranking and unlock VIP gaming discounts and rewards."
      }
    });
  } catch (error: any) {
    console.error('Error fetching user staking status:', error);
    return res.status(500).json({ message: 'Failed to fetch staking status', error: error.message });
  }
}

// Handler for User Balance
async function handleUserBalance(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate JWT format before verification
    if (token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (verifyError: any) {
      console.error('JWT verification error:', verifyError.message);
      return res.status(401).json({ message: 'Invalid token signature' });
    }
    
    const userId = decoded.userId;

    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();

    // Get user to fetch wallet address
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a wallet address; if not, attempt auto-resolution from completed purchases
    if (!user.walletAddress) {
      try {
        const client = await pool.connect();
        try {
          const txRes = await client.query(
            "SELECT txid, payment_id FROM app_transactions WHERE user_id = $1 AND status = 'completed' AND txid IS NOT NULL AND txid NOT LIKE 'manual_%' ORDER BY created_at DESC LIMIT 1",
            [userId]
          );
          if (txRes.rows.length > 0 && txRes.rows[0].txid) {
            const resolvedWallet = await extractWalletAddressFromStellarTx(txRes.rows[0].txid);
            if (resolvedWallet) {
              const dupCheck = await client.query(
                "SELECT id FROM app_users WHERE wallet_address = $1 AND wallet_address IS NOT NULL AND TRIM(wallet_address) != '' AND id <> $2 LIMIT 1",
                [resolvedWallet, userId]
              );
              const decision = evaluateWalletBinding({
                incomingWalletAddress: resolvedWallet,
                currentWalletAddress: user.walletAddress,
                duplicateOwnerUserId: dupCheck.rows[0]?.id,
                authenticatedUserId: userId,
                isAdminUser: isOwnerPiUID(user.piUID),
                allowWalletUpdate: true,
              });
              if (decision.allowed) {
                await client.query(
                  "UPDATE app_users SET wallet_address = $1, wallet_verified_at = NOW(), wallet_verified_txid = $2, wallet_verified_payment_id = $3, updated_at = NOW() WHERE id = $4",
                  [resolvedWallet, txRes.rows[0].txid, txRes.rows[0].payment_id, userId]
                );
                user.walletAddress = resolvedWallet;
                console.log('handleUserBalance: Auto-resolved and bound wallet for user:', userId, resolvedWallet);
              }
            }
          }
        } finally {
          client.release();
        }
      } catch (autoErr: any) {
        console.warn('handleUserBalance: Auto-resolve error:', autoErr?.message || autoErr);
      }
    }

    if (!user.walletAddress) {
      return res.status(404).json({ 
        message: 'No wallet address found. Please complete a transaction first to connect your wallet.',
        balance: null
      });
    }

    // Fetch native Pi balance from Stellar Horizon API
    let piBalance = '0';
    try {
      const balanceResponse = await fetch(`https://api.mainnet.minepi.com/accounts/${user.walletAddress}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (balanceResponse.ok) {
        const accountData = await balanceResponse.json() as any;
        const nativeBalance = accountData.balances?.find((b: any) => b.asset_type === 'native');
        if (nativeBalance) {
          piBalance = nativeBalance.balance;
        }
      }
    } catch (balanceErr: any) {
      console.error('Balance fetch error:', balanceErr.message);
    }
    
    // Update user's Pi balance in the database
    const updatedUser = await storage.updateUser(userId, { piBalance });
    
    if (!updatedUser) {
      return res.status(500).json({ 
        message: 'Failed to update user Pi balance.',
        balance: null
      });
    }

    res.json({ 
      message: 'Pi balance fetched and updated successfully',
      balance: parseFloat(piBalance),
      walletAddress: user.walletAddress
    });
  } catch (error) {
    console.error('Fetch balance error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch Pi balance',
      balance: null
    });
  }
}

// Handler for Pi Network Authentication
async function handlePiAuth(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { accessToken, referralCode } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: 'Access token required' });
    }

    // Load Pi Network service dynamically
    const piNetworkModule = await import('../dist/server/services/pi-network.js');
    const piNetworkService = piNetworkModule.piNetworkService;

    // Log the authentication attempt
    console.log('Pi authentication attempt with access token:', accessToken ? 'PROVIDED' : 'MISSING');
    
    const piUser = await piNetworkService.verifyAccessToken(accessToken);
    if (!piUser) {
      console.log('Pi Network token verification failed');
      return res.status(401).json({ message: 'Invalid Pi Network token' });
    }

    console.log('Pi Network user verified:', piUser.uid);
    
    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();
    
    // Check if user exists, if not create new user
    let user = await storage.getUserByPiUID(piUser.uid);
    console.log('User lookup result:', user ? 'FOUND' : 'NOT FOUND');
    
    if (!user) {
      console.log('Creating new user for Pi UID:', piUser.uid);
      // Create minimal user profile with real Pi Network data
      let validReferralCode: string | undefined;
      if (referralCode) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer) {
          validReferralCode = referralCode;
        } else {
          console.warn('Invalid referral code provided during signup:', referralCode);
        }
      }

      const newUser = {
        piUID: piUser.uid,
        username: piUser.username, // Use real Pi Network username
        email: '',
        phone: '',
        country: 'Bhutan',
        language: 'en',
        walletAddress: '', // Will be updated after first purchase via from_address
        // Add referral information only when the code is valid
        referredBy: validReferralCode
      };
      
      try {
        user = await storage.createUser(newUser);
        console.log('New user created:', user.id);
        
        // If the user was referred, reward both users and record the referral
        if (validReferralCode && user.id) {
          try {
            await storage.rewardReferrer(user.id);
            console.log('Referral reward processed for new user:', user.id);
          } catch (rewardError) {
            console.error('Error processing referral reward:', rewardError);
          }
        }
      } catch (createError) {
        console.error('Error creating user:', createError);
        // If we can't create a user due to database issues, return an error
        return res.status(500).json({ 
          message: 'Failed to create user due to database issues', 
          error: createError instanceof Error ? createError.message : 'Unknown error'
        });
      }
    } else {
      // Update username if it has changed
      if (user.username !== piUser.username) {
        try {
          const updatedUser = await storage.updateUser(user.id, { username: piUser.username });
          if (updatedUser) {
            user = updatedUser;
            console.log('User username updated:', user.id, piUser.username);
          }
        } catch (updateError) {
          console.error('Error updating user username:', updateError);
        }
      }
    }

    // Ensure we have a user before proceeding
    if (!user) {
      return res.status(500).json({ message: 'Failed to retrieve or create user' });
    }

    // Auto-link user wallet address using granted wallet_address scope from Pi Network
    try {
      if (user && !user.walletAddress) {
        const walletAddr = await piNetworkService.getUserWalletAddress(accessToken);
        if (walletAddr) {
          console.log('✅ Auto-linking Pioneer wallet address from Pi Network authentication:', walletAddr);
          const updated = await storage.updateUser(user.id, { 
            walletAddress: walletAddr,
            walletVerifiedAt: new Date(),
          });
          if (updated) user = updated;
        }
      }
    } catch (walletErr: any) {
      console.warn('Could not auto-link wallet address during login:', walletErr?.message);
    }

    const SUPER_ADMIN_SECRET = (process.env.SUPER_ADMIN_SECRET || '').trim();

    // Use piUser.uid from Pi Network directly; admin ownership is keyed by Pi UID.
    const isAdmin = isOwnerPiUID(piUser.uid);

    console.log('🔐 Admin check — piUser.uid:', piUser.uid);
    console.log('🔐 Admin check — OWNER_PI_UID:', OWNER_PI_UID);
    console.log('🔐 Admin check — isAdmin:', isAdmin);
    console.log('🔐 Admin check — SUPER_ADMIN_SECRET configured:', !!SUPER_ADMIN_SECRET);

    // Generate JWT token for session with real user data
    const token = jwt.sign(
      { userId: user.id, piUID: piUser.uid, username: piUser.username, walletAddress: user.walletAddress || '', isAdmin },
      JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    // Get user's referral code from the referral_codes table
    let userReferralCode = null;
    try {
      // Load storage service dynamically
      const storageModule = await import('../dist/server/storage.js');
      const storage = new storageModule.DatabaseStorage();
      userReferralCode = await storage.getUserReferralCode(user.id);
      console.log('Retrieved referral code for user:', user.id, userReferralCode);
    } catch (referralError) {
      console.error('Error fetching referral code:', referralError);
      // Don't fail the authentication if we can't get the referral code
    }

    res.json({
      user: {
        id: user.id,
        username: piUser.username,
        email: user.email,
        phone: user.phone,
        country: user.country,
        language: user.language,
        gameAccounts: user.gameAccounts,
        walletAddress: user.walletAddress,
        referralCode: userReferralCode,
        totalSpent: user.totalSpent || 0,
        piUID: piUser.uid,
        isAdmin,
      },
      token,
    });
  } catch (error) {
    console.error('Pi authentication error:', error);
    // Provide more detailed error information
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Authentication failed', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ 
        message: 'Authentication failed', 
        error: 'Unknown error occurred'
      });
    }
  }
}

// Async function to load the pricing service dynamically
async function loadPricingService() {
  try {
    const pricingModule = await import('../dist/server/services/pricing.js');
    return pricingModule.pricingService;
  } catch (error) {
    console.error('Failed to load pricing service:', error);
    // Return a fallback pricing service
    return {
      getCurrentPiPrice: async () => 0.21,
      getLastPrice: () => ({ price: 0.21, lastUpdated: new Date() })
    };
  }
}

// Handler for transactions endpoint
async function handleTransactions(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log('Transactions endpoint: Fetching user transactions');
    
    // Extract token from authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate JWT format
    if (token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (verifyError: any) {
      console.error('JWT verification error:', verifyError.message);
      // Handle different types of JWT errors
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired. Please log in again.' });
      } else if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
      } else {
        return res.status(401).json({ message: 'Invalid token signature. Please log in again.' });
      }
    }
    
    const userId = decoded?.userId;
    if (!userId || typeof userId !== 'string') {
      console.error('Transactions endpoint: Missing or invalid userId in token', { decoded });
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    const status = String(req.query.status || '').toLowerCase();
    const sortParam = String(req.query.sort || 'date').toLowerCase();
    const sort = sortParam === 'amount' ? 'amount' : 'date';
    const filterStatus = status === 'all' ? 'all' : status || undefined;
    const requestedUserId = String(req.query.userId || '').trim();
    const isAdmin = Boolean(decoded?.isAdmin);
    const walletAccess = (await import('../server/wallet-access.js')).enforceWalletTransactionAccess({
      currentUserId: userId,
      requestedUserId,
      isAdmin,
    });
    if (!walletAccess.allowed) {
      console.warn('Transactions endpoint: wallet access denied', { requestedUserId, userId, reason: walletAccess.reason });
      return res.status(403).json({ message: walletAccess.reason || 'Forbidden: transaction history is scoped to the authenticated user' });
    }

    // Reuse the shared app pool instead of loading a second dist-based storage instance.
    // Importing from dist creates a duplicate DB pool in serverless environments and exhausts
    // the connection limit, which caused the EMAXCONNSESSION error on /api/transactions.
    const { DatabaseStorage } = await import('../server/storage.js');
    const storage = new DatabaseStorage();
    
    // Get user transactions, supporting completed and approved status filters
    const transactions = await storage.getUserTransactions(userId, filterStatus, sort);
    
    console.log('Transactions endpoint: Returning', transactions.length, 'transactions');
    return res.status(200).json(transactions);
  } catch (error: any) {
    console.error('Transactions fetch error:', error);
    // Handle JWT errors specifically
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
    } else if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Database connection unavailable. Please try again shortly.' });
    } else {
      return res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  }
}

// Handler for Pi price endpoint
async function handlePiPrice(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  setShortCacheHeaders(res);

  try {
    console.log('Pi Price endpoint: Fetching current price');
    
    // Load the pricing service dynamically
    const service = await loadPricingService();
    
    // Use the pricing service to get the current Pi price
    const price = await service.getCurrentPiPrice();
    const lastPrice = service.getLastPrice();
    
    const response = {
      price,
      lastUpdated: lastPrice?.lastUpdated || new Date(),
    };
    
    console.log('Pi Price endpoint: Returning price', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Pi price fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch Pi price' });
  }
}

// Handler for Connect Wallet
async function handleConnectWallet(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate JWT format before verification
    if (token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (verifyError: any) {
      console.error('JWT verification error:', verifyError.message);
      return res.status(401).json({ message: 'Invalid token signature' });
    }
    
    const userId = decoded.userId;

    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();

    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user already has a verified wallet address connected, return it immediately
    if (currentUser.walletAddress && currentUser.walletAddress.trim().length > 0) {
      const connectedWallet = currentUser.walletAddress.trim();
      console.log(`Connect Wallet: User ${userId} already has connected wallet: ${connectedWallet}`);
      let piBalance = currentUser.piBalance || '0';
      try {
        const balanceResponse = await fetch(`https://api.mainnet.minepi.com/accounts/${connectedWallet}`, {
          headers: { 'Accept': 'application/json' }
        });
        if (balanceResponse.ok) {
          const accountData = await balanceResponse.json() as any;
          const nativeBalance = accountData.balances?.find((b: any) => b.asset_type === 'native');
          if (nativeBalance && nativeBalance.balance) {
            piBalance = nativeBalance.balance;
            await storage.updateUser(userId, { piBalance });
          }
        }
      } catch (balanceErr: any) {
        console.warn('Connect Wallet: Could not refresh balance for existing wallet:', balanceErr?.message);
      }

      return res.status(200).json({
        message: 'Wallet address connected successfully',
        walletAddress: connectedWallet,
        piBalance: parseFloat(piBalance || '0'),
        alreadyConnected: true
      });
    }

    // Get user's recent transactions to extract wallet address (newest first)
    const userTransactions = await storage.getUserTransactions(userId);
    const completedTransactions = (userTransactions || [])
      .filter((tx: any) => ['completed', 'approved'].includes(String(tx.status || '').toLowerCase()))
      .sort((a: any, b: any) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime());
    const hasCompletedPurchase = completedTransactions.length > 0;
    let walletAddress = '';

    if (hasCompletedPurchase) {
      for (const transaction of completedTransactions) {
        if (!transaction.txid || transaction.txid.length <= 10) {
          continue;
        }

        const extracted = await extractWalletAddressFromStellarTx(transaction.txid);
        if (extracted && !isAdminWalletAddress(extracted)) {
          walletAddress = extracted;
          console.log(`Connect Wallet: Wallet extracted from transaction ${transaction.id || transaction.txid}: ${walletAddress}`);
          break;
        }
      }
    }

    if (!walletAddress && hasCompletedPurchase) {
      for (const transaction of completedTransactions) {
        const paymentId = (transaction as any).paymentId || (transaction as any).payment_id;
        if (!paymentId) continue;

        const extracted = await extractWalletAddressFromPiPaymentDetails(paymentId);
        if (extracted && !isAdminWalletAddress(extracted)) {
          walletAddress = extracted;
          console.log(`Connect Wallet: Wallet extracted from Pi payment details for payment ${paymentId}: ${walletAddress}`);
          break;
        }
      }
    }

    if (!hasCompletedPurchase) {
      return res.status(404).json({ message: 'No wallet address found. You must complete at least one purchase before you can connect your wallet. After making a purchase, your wallet address will be automatically extracted from the blockchain transaction.' });
    }

    if (!walletAddress) {
      return res.status(404).json({ message: 'No wallet address found. You must complete at least one purchase before you can connect your wallet. After making a purchase, your wallet address will be automatically extracted from the blockchain transaction.' });
    }

    // Fetch only the native Pi balance from Stellar Horizon
    let piBalance = '0';
    try {
      const balanceResponse = await fetch(`https://api.mainnet.minepi.com/accounts/${walletAddress}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (balanceResponse.ok) {
        const accountData = await balanceResponse.json() as any;
        const nativeBalance = accountData.balances?.find((b: any) => b.asset_type === 'native');
        if (nativeBalance) {
          piBalance = nativeBalance.balance;
        }
      }
    } catch (balanceErr: any) {
      console.error('Connect Wallet: Failed to fetch balance from Stellar Horizon:', balanceErr.message);
    }

    // Only check for wallet duplicates if the wallet address is valid and non-empty
    let duplicateOwnerUserId: string | undefined;
    if (walletAddress && walletAddress.trim().length > 0) {
      const duplicateOwnerResult = await pool.query(
        'SELECT id, username FROM app_users WHERE wallet_address = $1 AND wallet_address IS NOT NULL AND TRIM(wallet_address) != \'\' AND id <> $2 LIMIT 1',
        [walletAddress, userId]
      );
      duplicateOwnerUserId = duplicateOwnerResult.rows[0]?.id;
    }
    
    const decision = evaluateWalletBinding({
      incomingWalletAddress: walletAddress,
      currentWalletAddress: currentUser.walletAddress,
      duplicateOwnerUserId,
      authenticatedUserId: userId,
      isAdminUser: currentUser && isOwnerPiUID(currentUser.piUID),
      allowWalletUpdate: true,
    });
    if (!decision.allowed) {
      console.warn('Connect Wallet: Rejected wallet binding', {
        userId,
        incomingWalletAddress: walletAddress,
        reason: decision.reason,
      });
      return res.status(409).json({ message: decision.reason || 'Wallet binding rejected.' });
    }

    // Update user's wallet address and Pi balance
    const updatedUser = await storage.updateUser(userId, { walletAddress, piBalance });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure response is sent as valid JSON
    if (!res.headersSent) {
      res.json({ 
        message: 'Wallet address connected successfully',
        walletAddress: updatedUser.walletAddress,
        piBalance: parseFloat(piBalance)
      });
    }
  } catch (error: any) {
    console.error('Connect wallet error:', error);
    // Handle JWT errors specifically
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
    } else {
      // Ensure we always return valid JSON
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to connect wallet: ' + (error instanceof Error ? error.message : 'Unknown error') });
      }
    }
  }
}

// Handler for Referral Reward
async function handleReferralReward(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate JWT format before verification
    if (token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (verifyError: any) {
      console.error('JWT verification error:', verifyError.message);
      return res.status(401).json({ message: 'Invalid token signature' });
    }
    
    const userId = decoded.userId;

    const { referralCode } = req.body;
    if (!referralCode) {
      return res.status(400).json({ message: 'Referral code required' });
    }

    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();

    // Validate referral code
    const referrer = await storage.getUserByReferralCode(referralCode);
    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }

    // Prevent self-referral
    if (referrer.id === userId) {
      return res.status(400).json({ message: 'You cannot use your own referral code' });
    }

    // Check if this user already used a code
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.referredBy) {
      return res.status(400).json({ message: 'Referral already used' });
    }

    // Update user with referral code
    const updatedUser = await storage.updateUser(userId, { referredBy: referralCode });
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update user with referral code' });
    }

    // Reward both users and record the referral
    await storage.rewardReferrer(userId);

    res.json({ 
      message: `Referral processed successfully. Both accounts earned ${B4U_TOKEN_NAME}.`,
      tokenName: B4U_TOKEN_NAME,
      tokenSymbol: B4U_TOKEN_SYMBOL,
      tokensAwarded: 25
    });
  } catch (error: any) {
    console.error('Referral reward error:', error);
    // Handle JWT errors specifically
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format. Please log in again.' });
    } else {
      res.status(500).json({ message: 'Failed to process referral reward' });
    }
  }
}

// Handler for Redeem Tokens
async function handleRedeemTokens(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate JWT format before verification
    if (token.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    let decoded;
    try {
      // Explicitly specify the algorithm to prevent "invalid algorithm" errors
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (verifyError: any) {
      console.error('JWT verification error:', verifyError.message);
      return res.status(401).json({ message: 'Invalid token signature' });
    }

    const userId = decoded.userId;
    const tokensToRedeem = Number(req.body.tokensToRedeem ?? req.body.amount);

    console.log('Token redemption request:', { userId, tokensToRedeem });

    // Validate input
    if (!Number.isFinite(tokensToRedeem) || tokensToRedeem < 1000) {
      return res.status(400).json({
        message: 'Minimum 1000 tokens required for redemption (0.1 Pi)'
      });
    }

    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();

    // Get user data
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check eligibility: minimum 10 Pi in purchases
    const totalSpent = user.totalSpent ? parseFloat(user.totalSpent.toString()) : 0;
    if (totalSpent < 10) {
      return res.status(403).json({
        message: 'You must complete a minimum purchase of 10 Pi to qualify for token redemption'
      });
    }

    // Pi UID is the verified identity from Pi authentication and the payout target for official A2U flow.
    if (!user.piUID) {
      return res.status(403).json({
        message: 'Please log in with Pi Network again so your verified Pi UID can be used for redemption'
      });
    }

    // Check if user has enough tokens
    if ((user.tokens || 0) < tokensToRedeem) {
      return res.status(400).json({
        message: 'Insufficient tokens'
      });
    }

    // B4UT is an in-app reward token, not Pi. Redemption burns B4UT and queues real Pi payout from treasury.
    const piAmount = tokensToRedeem / B4U_TO_PI_RATE;

    await ensureRedemptionTables();

    // Deduct tokens from user
    await storage.addUserTokens(userId, -tokensToRedeem);

    // Re-fetch user to get the most up-to-date wallet address snapshot before storing
    const freshUser = await storage.getUser(userId);

    // Create a real pending redemption request for the admin payout panel
    const redemptionResult = await pool.query(
      `INSERT INTO redemption_requests (
        id, user_id, b4ut_amount, pi_amount, status, pi_uid, wallet_address, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, now(), now())
      RETURNING id`,
      [randomUUID(), userId, tokensToRedeem, piAmount, user.piUID, freshUser?.walletAddress || user.walletAddress || null],
    );
    const redemptionId = redemptionResult.rows[0].id;

    await pool.query(
      `INSERT INTO token_transactions (id, user_id, amount, type, description, reference_id, created_at)
       VALUES ($1, $2, $3, 'redemption', $4, $5, now())`,
      [
        randomUUID(),
        userId,
        -tokensToRedeem,
        `Burned ${tokensToRedeem} ${B4U_TOKEN_SYMBOL} for ${piAmount} Pi treasury payout`,
        redemptionId,
      ],
    );

    // Send confirmation emails
    const emailModule = await import('../dist/server/services/email.js');
    if (typeof (emailModule as any).sendRedemptionConfirmationEmails === 'function') {
      await (emailModule as any).sendRedemptionConfirmationEmails(user, tokensToRedeem, piAmount, user.walletAddress || user.piUID);
    }

    // Fetch updated user data
    const updatedUser = await storage.getUser(userId);

    console.log('Token redemption success:', {
      userId,
      piUID: user.piUID,
      tokensRedeemed: tokensToRedeem,
      piAmount,
      newBalance: updatedUser?.tokens
    });

    res.json({
      success: true,
      user: updatedUser,
      tokenName: B4U_TOKEN_NAME,
      tokenSymbol: B4U_TOKEN_SYMBOL,
      tokensRedeemed: tokensToRedeem,
      piAmount: piAmount,
      redemptionId,
      conversion: {
        burned: true,
        treasuryPayoutStatus: 'pending',
        message: `${B4U_TOKEN_SYMBOL} is not real Pi. Mainnet Pi payouts are unavailable because Pi currently documents App-to-User payments as Testnet-only.`,
      },
    });
  } catch (error: any) {
    console.error('Token redemption error:', error);
    res.status(500).json({
      message: 'Failed to process token redemption',
      error: (error as Error).message
    });
  }
}

// Handler for Payment Creation
async function handlePaymentCreate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    console.log('Payment Create endpoint: Method not allowed', req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Payment Create endpoint: Payment creation request received', {
      body: req.body,
      headers: req.headers
    });
    
    const { paymentId, paymentData } = req.body;
    if (!paymentId || !paymentData) {
      console.log('Payment Create endpoint: Payment ID or data missing in request body', req.body);
      return res.status(400).json({ message: 'Payment ID and data required' });
    }

    // Validate required fields in paymentData
    if (!paymentData.userId) {
      console.log('Payment Create endpoint: User ID missing in payment data', paymentData);
      return res.status(400).json({ message: 'User ID required in payment data' });
    }

    if (!paymentData.piAmount) {
      console.log('Payment Create endpoint: Pi amount missing in payment data', paymentData);
      return res.status(400).json({ message: 'Pi amount required in payment data' });
    }

    if (!paymentData.usdAmount) {
      console.log('Payment Create endpoint: USD amount missing in payment data', paymentData);
      return res.status(400).json({ message: 'USD amount required in payment data' });
    }

    // Determine payment type (default to TOKEN_PURCHASE for backwards compatibility)
    const paymentType = paymentData.paymentType || 'TOKEN_PURCHASE';
    console.log('Payment Create endpoint: Payment type:', paymentType);

    // Validate payment type-specific requirements
    switch (paymentType) {
      case 'TOKEN_PURCHASE':
        if (!paymentData.packageId) {
          console.log('Payment Create endpoint: Package ID missing for TOKEN_PURCHASE', paymentData);
          return res.status(400).json({ message: 'Package ID required for token purchase' });
        }
        break;

      case 'SUBSCRIPTION':
        if (!paymentData.subscriptionDetails) {
          console.log('Payment Create endpoint: subscriptionDetails missing for SUBSCRIPTION', paymentData);
          return res.status(400).json({ message: 'Subscription details required' });
        }
        {
          const details = paymentData.subscriptionDetails;
          const missingField = [
            ['userName', 'subscriber name'],
            ['userEmail', 'subscriber email'],
            ['userPhone', 'subscriber contact number'],
            ['userGameIgn', 'PUBG in-game name'],
            ['userGameUid', 'PUBG UID'],
            ['userTeamName', 'team name'],
          ].find(([field]) => !String((details as any)[field] || '').trim());

          if (missingField) {
            const fieldLabel = missingField[1];
            console.log('Payment Create endpoint: Missing subscription field for SUBSCRIPTION', fieldLabel, paymentData);
            return res.status(400).json({ message: `Subscription ${fieldLabel} is required` });
          }

          const subscriptionType = details.subscriptionType;
          const expectedPiAmount = subscriptionType === 'monthly' ? 30 : subscriptionType === 'weekly' ? 20 : null;
          if (expectedPiAmount !== null && Number(paymentData.piAmount) !== expectedPiAmount) {
            console.log('Payment Create endpoint: Invalid subscription amount', {
              submittedAmount: paymentData.piAmount,
              expectedPiAmount,
              subscriptionType,
            });
            return res.status(400).json({
              message: `${subscriptionType === 'monthly' ? 'Monthly' : 'Weekly'} subscription amount must be ${expectedPiAmount} Pi`,
            });
          }
        }
        break;

      case 'TOURNAMENT_ENTRY':
        if (!paymentData.tournamentId) {
          console.log('Payment Create endpoint: Tournament ID missing for TOURNAMENT_ENTRY', paymentData);
          return res.status(400).json({ message: 'Tournament ID required for tournament entry' });
        }
        break;

      case 'WALLET_TOPUP':
        // Wallet topups don't require specific IDs beyond user ID and amount
        break;

      case 'SERVICE_PAYMENT':
        // Service payments can have flexible requirements
        break;

      default:
        console.log('Payment Create endpoint: Unknown payment type:', paymentType);
        return res.status(400).json({ message: 'Invalid payment type' });
    }

    // Log userId for debugging
    console.log('Payment Create endpoint: Creating transaction for userId:', paymentData.userId);

    // Always create the transaction in our database, regardless of Pi Server API Key configuration
    try {
      console.log('Payment Create endpoint: Creating payment in database');
      
      // Load storage service dynamically
      const storageModule = await import('../dist/server/storage.js');
      const storage = new storageModule.DatabaseStorage();

      let transactionMetadata: Record<string, any> = {
        memo: paymentData.memo || null,
        paymentType: paymentType,
      };

      if (paymentData.couponCode && paymentType === 'TOKEN_PURCHASE') {
        const validatedCoupon = await validateCouponForUser(
          paymentData.userId,
          String(paymentData.couponCode),
          paymentData.packageId
        );

        const submittedAmount = parseFloat(String(paymentData.piAmount));
        const expectedAmount = validatedCoupon.discountedPiAmount;
        const tolerance = Math.max(0.0001, expectedAmount * 0.03);

        if (Math.abs(submittedAmount - expectedAmount) > tolerance) {
          return res.status(400).json({
            message: 'Coupon validation failed because the checkout amount does not match the discounted total.',
          });
        }

        paymentData.piAmount = validatedCoupon.discountedPiAmount;
        paymentData.usdAmount = validatedCoupon.discountedUsdAmount.toFixed(4);
        transactionMetadata = {
          ...transactionMetadata,
          marketingCouponCode: validatedCoupon.code,
          marketingCouponId: validatedCoupon.couponId,
          marketingCampaignType: validatedCoupon.campaignType,
          marketingBonusTokens: validatedCoupon.bonusTokens,
          marketingDiscountPercent: validatedCoupon.discountPercent,
          originalPiAmount: validatedCoupon.originalPiAmount,
          originalUsdAmount: validatedCoupon.originalUsdAmount,
        };
      }
      
      // Create transaction in database
      console.log('Payment Create endpoint: Creating transaction in database', { paymentId, paymentData, paymentType });
      
      const subscriptionDetails = paymentType === 'SUBSCRIPTION'
        ? paymentData.subscriptionDetails
        : null;

      const transaction = await storage.createTransaction({
        userId: paymentData.userId,
        packageId: paymentType === 'TOKEN_PURCHASE' || paymentType === 'SUBSCRIPTION' ? paymentData.packageId || null : null,
        paymentId: paymentId,
        piAmount: paymentData.piAmount,
        usdAmount: paymentData.usdAmount,
        piPriceAtTime: paymentData.piPriceAtTime,
        gameAccount: paymentType === 'SUBSCRIPTION' ? undefined : paymentData.gameAccount,
        status: 'pending',
        metadata: {
          ...transactionMetadata,
          ...(paymentType === 'SUBSCRIPTION' && subscriptionDetails ? {
            type: 'subscription',
            subscriptionDetails,
            userName: subscriptionDetails.userName || null,
            userEmail: subscriptionDetails.userEmail || null,
            userPhone: subscriptionDetails.userPhone || subscriptionDetails.contactNumber || null,
            userGameIgn: subscriptionDetails.userGameIgn || null,
            userGameUid: subscriptionDetails.userGameUid || null,
            userTeamName: subscriptionDetails.userTeamName || null,
            subscriptionType: subscriptionDetails.subscriptionType || null,
            subscriptionDuration: subscriptionDetails.subscriptionDuration || null,
            subscriptionName: subscriptionDetails.subscriptionName || null,
          } : {}),
        },
        paymentType: paymentType,
        tournamentId: paymentType === 'TOURNAMENT_ENTRY' ? paymentData.tournamentId : null,
      });
      
      console.log('Payment Create endpoint: Transaction created successfully', { transactionId: transaction.id });
      
      // Check if we have a real Pi Server API Key for Pi Network integration
      if (isPiServerConfigured()) {
        console.log('Payment Create endpoint: Pi Server API Key configured, will integrate with Pi Network');
        // In a future enhancement, we could create the payment with Pi Network here
        // For now, we're just logging that we could do it
      } else {
        console.log('Payment Create endpoint: Pi Server API Key not configured, skipping Pi Network integration');
      }
      
      // Return success response
      return res.status(200).json({ 
        message: 'Payment created successfully',
        paymentId,
        transactionId: transaction.id
      });
    } catch (serverError: any) {
      console.error('Payment Create endpoint: Payment creation error:', serverError.message);
      return res.status(500).json({ 
        message: 'Failed to create payment', 
        error: serverError.message 
      });
    }
  } catch (error: any) {
    console.error('Payment Create endpoint: Creation error:', error);
    res.status(500).json({ 
      message: 'Payment creation failed', 
      error: error.message
    });
  }
}

// Handler for Refresh Pi Balance
async function handleRefreshPiBalance(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address required' });
    }

    // Load Pi Network service dynamically
    const piNetworkModule = await import('../dist/server/services/pi-network.js');
    const piNetworkService = piNetworkModule.piNetworkService;

    // Fetch only the native Pi balance
    const piBalance = await piNetworkService.getPiBalance(walletAddress);

    // Load storage service dynamically
    const storageModule = await import('../dist/server/storage.js');
    const storage = new storageModule.DatabaseStorage();

    // Update user's Pi balance in the database
    // Note: We're updating based on wallet address since we don't have user ID in this endpoint
    // In a production environment, you might want to add authentication
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE app_users SET pi_balance = $1, updated_at = NOW() WHERE wallet_address = $2',
        [piBalance, walletAddress]
      );
    } finally {
      client.release();
    }

    return res.status(200).json({ success: true, pi_balance: piBalance });
  } catch (err: any) {
    console.error('refresh-balance error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Handler for Payment Approval
async function handlePaymentApprove(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    console.log('Payment Approve endpoint: Method not allowed', req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Payment Approve endpoint: Function called with:', {
      method: req.method,
      body: req.body,
      headers: req.headers
    });

    const { paymentId } = req.body;
    if (!paymentId) {
      console.log('Payment Approve endpoint: Payment ID missing in request body', req.body);
      return res.status(400).json({ message: 'Payment ID required' });
    }

    console.log('Payment Approve endpoint: Approving payment', { paymentId });

    // Debug logging for payment approval
    console.log('Payment approval debug', {
      paymentId,
      apiUrl: `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      headers: {
        Authorization: `Key ${PI_SERVER_API_KEY ? '***' : 'MISSING'}`,
        'Content-Type': 'application/json'
      }
    });

    // Load storage service dynamically
    console.log('Payment Approve endpoint: Attempting to import storage module');
    const storageModule = await import('../dist/server/storage.js');
    console.log('Payment Approve endpoint: Storage module imported successfully');
    
    const storage = new storageModule.DatabaseStorage();
    console.log('Payment Approve endpoint: Storage service initialized');

    // Get transaction by paymentId with enhanced error handling
    console.log('Payment Approve endpoint: Attempting to get transaction by paymentId', paymentId);
    const transaction = await storage.getTransactionByPaymentId(paymentId);
    console.log('Payment Approve endpoint: Transaction retrieval result', { transaction: transaction ? 'found' : 'undefined' });
    
    // Add safeguard: return clear error if transaction doesn't exist
    if (!transaction) {
      console.log('Payment Approve endpoint: Transaction not found for paymentId', paymentId);
      return res.status(404).json({ 
        error: "Transaction not found. Make sure you created the payment first.",
        paymentId: paymentId,
        solution: "Call /api/payment/create endpoint before calling /api/payment/approve"
      });
    }

    // Check if we have a real Pi Server API Key
    if (isPiServerConfigured()) {
      // Approve payment with Pi Network
      try {
        console.log('Payment Approve endpoint: Approving payment with Pi Network');
        const response = await axios.post(
          `https://api.minepi.com/v2/payments/${paymentId}/approve`,
          {},
          {
            headers: {
              'Authorization': `Key ${PI_SERVER_API_KEY}`,
              'Content-Type': 'application/json',
            }
          }
        );

        if (response.status === 200) {
          console.log('Payment Approve endpoint: Pi Network approval successful');
          
          // Update transaction status in database
          const client = await pool.connect();
          try {
            await client.query(
              'UPDATE transactions SET status = $1, updated_at = NOW() WHERE payment_id = $2',
              ['approved', paymentId]
            );
            console.log('Payment Approve endpoint: Transaction updated to approved in database');
          } finally {
            client.release();
          }

          return res.status(200).json({ success: true, message: 'Payment approved successfully' });
        } else {
          console.error('Payment Approve endpoint: Pi Network approval failed:', response.status);
          const errorData = await response.data;
          console.error('Payment Approve endpoint: Pi Network error data:', errorData);
          return res.status(500).json({ message: 'Pi Network approval failed', error: errorData });
        }
      } catch (error: any) {
        console.error('Payment Approve endpoint: Pi Network approval error:', error.message);
        return res.status(500).json({ 
          message: 'Failed to approve payment with Pi Network', 
          error: error.message 
        });
      }
    } else {
      console.log('Payment Approve endpoint: Pi Server API Key not configured, skipping Pi Network approval');
      console.log('Payment Approve endpoint: PI_SERVER_API_KEY value:', PI_SERVER_API_KEY);
      console.log('Payment Approve endpoint: isPiServerConfigured result:', isPiServerConfigured());
      
      // Update transaction status in database even without Pi Network integration
      const client = await pool.connect();
      try {
        await client.query(
          'UPDATE transactions SET status = $1, updated_at = NOW() WHERE payment_id = $2',
          ['approved', paymentId]
        );
        console.log('Payment Approve endpoint: Transaction updated to approved in database (no Pi Network)');
      } finally {
        client.release();
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Payment approved successfully (no Pi Network integration)' 
      });
    }
  } catch (error: any) {
    console.error('Payment Approve endpoint: Approval error:', error);
    res.status(500).json({ 
      message: 'Payment approval failed', 
      error: error.message 
    });
  }
}

// Handler for Analytics endpoint
async function handleAnalytics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Analytics endpoint: Fetching platform analytics');

    const client = await pool.connect();
    try {
      // Get total users
      const totalUsersResult = await client.query('SELECT COUNT(*) FROM app_users');
      const totalUsers = parseInt(totalUsersResult.rows[0].count);

      // Get lifetime logged in users (users with last_login not null)
      const lifetimeLoggedInResult = await client.query(
        'SELECT COUNT(*) FROM app_users WHERE last_login IS NOT NULL'
      );
      const lifetimeLoggedInUsers = parseInt(lifetimeLoggedInResult.rows[0].count);

      // Get total transactions
      const totalTransactionsResult = await client.query('SELECT COUNT(*) FROM app_transactions');
      const totalTransactions = parseInt(totalTransactionsResult.rows[0].count);

      // Get total revenue
      const totalRevenueResult = await client.query(`
        SELECT COALESCE(SUM(pi_amount), 0) as total_revenue 
        FROM app_transactions 
        WHERE status = 'completed'
      `);
      const totalRevenue = parseFloat(totalRevenueResult.rows[0].total_revenue) || 0;

      console.log('Analytics endpoint: Fetched analytics data:', {
        totalUsers,
        lifetimeLoggedInUsers,
        totalTransactions,
        totalRevenue
      });

      return res.status(200).json({
        totalUsers,
        lifetimeLoggedInUsers,
        totalTransactions,
        totalRevenue
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Analytics endpoint: Error fetching analytics:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch analytics', 
      error: error.message 
    });
  }
}

// Admin endpoint to backfill purchase rewards for existing users
async function handleBackfillPurchaseRewards(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, allUsers } = req.body;
    
    // Verify admin authentication
    const adminToken = req.headers.authorization?.replace('Bearer ', '');
    if (!adminToken) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate JWT format
    if (adminToken.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Import and verify admin token
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      if (!isOwnerPiUID(decoded.piUID)) {
        return res.status(403).json({ message: 'Admin privileges required' });
      }
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const client = await pool.connect();
    try {
      let results: any[] = [];

      if (allUsers) {
        // Process all users in the database
        console.log('Backfill Rewards: Processing all users...');
        
        const allUsersResult = await client.query(
          'SELECT id, username, email FROM app_users WHERE is_active = true'
        );

        const { PurchaseRewardService } = await import('../server/services/purchase-reward.js');

        for (const userRow of allUsersResult.rows) {
          try {
            const result = await PurchaseRewardService.backfillRewardsForUser(userRow.id);
            results.push({
              userId: userRow.id,
              username: userRow.username,
              ...result
            });
            
            // Add small delay to prevent database overload
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (userError) {
            console.error(`Backfill Rewards: Error processing user ${userRow.id}:`, userError);
            results.push({
              userId: userRow.id,
              username: userRow.username,
              success: false,
              message: (userError as Error).message
            });
          }
        }

        return res.status(200).json({
          success: true,
          message: `Processed ${allUsersResult.rows.length} users`,
          results,
          totalProcessed: results.filter(r => r.success).length,
          totalFailed: results.filter(r => !r.success).length
        });

      } else if (userId) {
        // Process specific user
        console.log('Backfill Rewards: Processing user', userId);
        
        const { PurchaseRewardService } = await import('../server/services/purchase-reward.js');
        
        const result = await PurchaseRewardService.backfillRewardsForUser(userId);
        
        return res.status(200).json({
          success: result.success,
          message: result.message,
          tokensAwarded: result.tokensAwarded,
          newMilestone: result.newMilestone
        });

      } else {
        return res.status(400).json({
          message: 'Either userId or allUsers parameter is required'
        });
      }

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Backfill Rewards endpoint: Error:', error);
    return res.status(500).json({
      message: 'Failed to backfill rewards',
      error: error.message
    });
  }
}

// Admin endpoint to get purchase reward statistics
async function handleGetPurchaseRewardStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const adminToken = req.headers.authorization?.replace('Bearer ', '');
    if (!adminToken) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate JWT format
    if (adminToken.split('.').length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Import and verify admin token
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET, { algorithms: ['HS256'] }) as any;
      if (!isOwnerPiUID(decoded.piUID)) {
        return res.status(403).json({ message: 'Admin privileges required' });
      }
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const client = await pool.connect();
    try {
      // Get total rewards issued
      const { PurchaseRewardService } = await import('../server/services/purchase-reward.js');
      const totalStats = await PurchaseRewardService.getTotalRewardsIssued();

      // Get milestone breakdown
      const milestoneBreakdown = await client.query(`
        SELECT 
          milestone,
          COUNT(*) as count,
          SUM(tokens_awarded) as total_tokens
        FROM purchase_rewards
        GROUP BY milestone
        ORDER BY milestone
      `);

      // Get top reward earners
      const topEarners = await client.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.tokens,
          u.successful_purchases_count,
          COUNT(pr.id) as rewards_count,
          SUM(pr.tokens_awarded) as total_reward_tokens
        FROM app_users u
        LEFT JOIN purchase_rewards pr ON u.id = pr.user_id
        WHERE pr.tokens_awarded > 0
        GROUP BY u.id, u.username, u.email, u.tokens, u.successful_purchases_count
        ORDER BY total_reward_tokens DESC
        LIMIT 20
      `);

      return res.status(200).json({
        success: true,
        stats: {
          totalUsers: totalStats.totalUsers,
          totalTokens: totalStats.totalTokens,
          totalRewards: totalStats.totalRewards,
          milestoneBreakdown: milestoneBreakdown.rows,
          topEarners: topEarners.rows
        }
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Purchase Reward Stats endpoint: Error:', error);
    return res.status(500).json({
      message: 'Failed to fetch purchase reward statistics',
      error: error.message
    });
  }
}
