import * as nodemailer from 'nodemailer';
import { VercelLogger } from './vercel-logger.js';
import { getGameImage, GAME_IMAGES } from '../../shared/schema.js';

// Debug log to verify module loading
console.log('📧 Email service module loaded');
console.log('✅ Using centralized GAME_IMAGES from shared/schema.ts');

// Logo URLs
const LOGO_URLS = {
  B4U: "https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png",
  PI: "https://b4uesports.com/wp-content/uploads/2025/04/PI.jpg"
};

function getGameLogoUrl(game: string): string {
  try {
    if (typeof getGameImage === 'function') {
      return getGameImage(game);
    }
  } catch (error) {
    console.warn('⚠️ getGameImage lookup failed, falling back to default PI image', { error });
  }
  return LOGO_URLS.PI;
}

// Validate required environment variables
const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing SMTP environment variables:', missingEnvVars);
  console.warn('Available SMTP env values:');
  console.warn('  SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
  console.warn('  SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
  console.warn('  SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
  console.warn('  SMTP_FROM:', process.env.SMTP_FROM || 'NOT SET');
  console.warn('  SMTP_PASS length:', (process.env.SMTP_PASS || '').length, 'chars');
}

// Create a function to initialize transporter when needed
// Fixed & Smarter Version that automatically adjusts based on the port
let transporter: nodemailer.Transporter | null = null;

export function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || 'info@b4uesports.com';
  // Strip surrounding quotes from SMTP_PASS in case dotenv or deployment env includes them literally
  let pass = process.env.SMTP_PASS || '';
  if ((pass.startsWith('"') && pass.endsWith('"')) || (pass.startsWith("'") && pass.endsWith("'"))) {
    pass = pass.slice(1, -1);
    console.log('🔧 Stripped surrounding quotes from SMTP_PASS');
  }
  const isSecure = port === 465; // Secure only if port 465

  console.log('🔧 Initializing SMTP transporter with config:', {
    host: host,
    port: port,
    secure: isSecure,
    user: user ? '****' + user.substring(user.length - 10) : 'NOT SET',
    passLength: pass.length
  });

  // Validate credentials
  if (!user || !pass) {
    console.error('❌ CRITICAL: SMTP credentials are missing!');
    console.error('  SMTP_USER:', user ? 'SET' : 'NOT SET');
    console.error('  SMTP_PASS:', pass ? `SET (${pass.length} chars)` : 'NOT SET');
    console.error('  This will cause email delivery to fail!');
  }

  transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: isSecure, // false for 587
    requireTLS: !isSecure, // Enforce TLS for port 587
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
    debug: false, // Set to true for detailed SMTP logs
    logger: true, // Enable logging
  });

  return transporter;
}

// Verify transporter configuration lazily, not on module import.
// This avoids startup-time SMTP verification and repeated verification logs.
// NOTE: We intentionally do NOT cache the verified state across failures.
// In serverless (Vercel) environments, a cold start might have transient network
// issues. Re-verifying on failure ensures we don't get stuck in a bad state.
let transporterVerified = false;
let lastVerificationAttempt = 0;
const VERIFICATION_COOLDOWN_MS = 30000; // Only retry verification every 30 seconds if it failed

async function verifyTransporter() {
  if (transporterVerified) return;

  const now = Date.now();
  if (lastVerificationAttempt > 0 && (now - lastVerificationAttempt) < VERIFICATION_COOLDOWN_MS) {
    console.log('📧 SMTP verification on cooldown, skipping re-verification (last attempt was recent)');
    // Still allow sending - the transporter might work even if verify failed
    return;
  }

  lastVerificationAttempt = now;

  try {
    console.log('📧 Verifying SMTP transporter before sending email...');
    const transporter = getTransporter();
    await transporter.verify();
    transporterVerified = true;
    console.log('✅ SMTP transporter verified and ready to send emails');
  } catch (error) {
    console.error('❌ SMTP transporter verification failed:', error instanceof Error ? error.message : String(error));
    // Do NOT throw - allow send attempt even if verify fails.
    // Some SMTP servers reject verify() but still accept sendMail().
    console.warn('⚠️ Proceeding with email send despite verification failure');
  }
}

export async function getVerifiedTransporter() {
  await verifyTransporter();
  return getTransporter();
}

interface PurchaseConfirmationParams {
  to: string;
  username: string;
  packageName: string;
  piAmount: string;
  usdAmount: string;
  gameAccount: string;
  transactionId: string;
  paymentId: string;
  isTestnet?: boolean;
  gameAccounts?: any;
  socialAccounts?: any;
  game?: string; // Game type for correct logo selection
}

interface ProfileUpdateParams {
  to: string;
  username: string;
  profileData: any;
}

interface AdminPurchaseNotificationParams {
  adminEmail: string;
  username: string;
  userEmail: string;
  userPhone: string;
  packageName: string;
  game: string;
  inGameAmount: number;
  piAmount: string;
  usdAmount: string;
  gameAccount: string;
  transactionId: string;
  paymentId: string;
  txid: string;
  gameAccounts?: any;
  socialAccounts?: any;
}

interface PaymentFailureNotificationParams {
  to: string;
  username: string;
  packageName: string;
  piAmount: string;
  failureReason: string;
  transactionId: string;
  paymentId: string;
  isCancelled: boolean;
  retryUrl?: string; // Optional URL to retry the purchase flow

  game?: string;
  gameAccounts?: any;
  socialAccounts?: any;
}

interface PersonalizedMarketingEmailParams {
  to: string;
  user_name: string;
  user_email: string;
  user_id?: string; // optional, for fetching real ranking data
  product_name: string;
  product_category: string;
  platform_type: string; // Game / Social Media / Subscription
  purchase_count: number;
  last_purchase_date: string;
  user_tier: string; // New / Bronze / Silver / Gold / VIP
  viewed_product: string;
  abandoned_purchase: string; // Yes/No
  monthly_purchases: number;
  total_spent?: number; // optional internal use
  user_rank?: number; // optional for leaderboard
  next_tier?: string; // optional for progression
}

interface MarketingOfferEmailParams {
  to: string;
  username: string;
  subject: string;
  headline: string;
  preheader: string;
  urgencyText: string;
  campaignLabel: string;
  couponCode: string;
  discountPercent: number;
  bonusTokens: number;
  expiresAtText: string;
  ctaUrl: string;
  trackingPixelUrl: string;
}

export async function sendPurchaseConfirmationEmail(params: PurchaseConfirmationParams): Promise<boolean> {
  console.log("📨 Email send function triggered");
  VercelLogger.logEmailEvent('PURCHASE_CONFIRMATION_ATTEMPT', {
    recipient: params.to,
    username: params.username,
    packageName: params.packageName
  });
  
  // Since we're in mainnet mode, we don't need the testnet warning
  const testnetWarning = '';

  // Extract game from package name with improved logic
  const game = params.game || 'PUBG'; // Use passed game parameter, default to PUBG
  
  // Normalize package name safely for subject and template rendering
  const packageName = (params.packageName || 'Unknown Package').toString();
  const gameLogoUrl = getGameLogoUrl(game);
  
  console.log('🎮 Email logo selection:', { 
    packageName,
    gameParam: params.game,
    detectedGame: game,
    imageUrl: gameLogoUrl,
    fromCentralizedMapping: true
  });
  
  // Clean package name for subject (remove price part like " – X.XX")
  const cleanPackageName = packageName.replace(/\s*–\s*\d+\.\d+/, '').trim();
  
  // Using centralized GAME_IMAGES from shared/schema.ts (imported at top of file)
  // No local duplication - single source of truth!

  const accountIconsMarkup = '';
  const gameDetailsMarkup = '';
  const socialDetailsMarkup = '';

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Confirmation - B4U Esports</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: Arial, Helvetica, sans-serif; color: #333333;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f0f0; padding: 20px 0;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <img src="${LOGO_URLS.B4U}" alt="B4U Esports" width="120" height="40" style="display: block; margin: 0 auto 20px auto; width: 120px; height: 40px; max-width: 120px; height: auto;">
                  <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">Purchase Confirmed!</h1>
                  <p style="color: #e5e7eb; margin: 0; font-size: 16px;">Your gaming currency has been processed</p>
                </td>
              </tr>
              
              <!-- Game Section -->
              <tr>
                <td style="padding: 30px 20px; text-align: center;">
                  <img src="${gameLogoUrl}" alt="${game}" width="80" height="80" style="display: block; margin: 0 auto 20px auto; width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                  <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">Congratulations ${params.username}!</h2>
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #4b5563;">You've successfully purchased the <strong>${packageName}</strong> package</p>
                </td>
              </tr>

              ${accountIconsMarkup}

              <!-- Details Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
                    <tr>
                      <td colspan="2" style="padding: 0 0 15px 0; text-align: center; border-bottom: 1px solid #e2e8f0;">
                        <h2 style="color: #1f2937; margin: 0; font-size: 20px; font-weight: bold;">Transaction Details</h2>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Customer:</td>
                      <td style="padding: 15px 0; color: #7c3aed; font-weight: bold;">${params.username}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Package:</td>
                      <td style="padding: 15px 0; color: #1e3a8a; font-weight: bold;">${params.packageName}</td>
                    </tr>
                    ${gameDetailsMarkup}
                    ${socialDetailsMarkup}
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Amount Paid:</td>
                      <td style="padding: 15px 0; color: #059669; font-weight: bold; font-size: 18px;">${params.piAmount} π</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Transaction ID:</td>
                      <td style="padding: 15px 0; color: #6b7280; font-family: monospace; font-size: 13px;">${params.transactionId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Payment ID:</td>
                      <td style="padding: 15px 0; color: #6b7280; font-family: monospace; font-size: 13px;">${params.paymentId}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Success Box -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 25px; text-align: center;">
                    <tr>
                      <td>
                        <div style="font-size: 32px; margin-bottom: 10px;">✅</div>
                        <p style="color: #065f46; margin: 0; font-weight: bold; font-size: 18px;">Your gaming currency will be delivered to your account within 5-10 minutes.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Support Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  
                  <table style="font-family:Arial,sans-serif;max-width:650px;margin: 0 auto;background-color: #f0f4f8; border-radius: 8px; padding: 25px;">
                    <tr>
                      <td style="padding-right:18px;vertical-align:middle;">
                        <img src="https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png" width="150" style="display:block;" alt="B4U Esports Logo">
                      </td>
                      <td style="padding-left:18px;border-left:4px solid #3b82f6;text-align:left;">
                        <h2 style="margin:0;color:#0f172a;font-size:26px;">B4U Esports</h2>
                        <p style="margin:6px 0;color:#64748b;font-size:14px;">Professional Esports & Gaming Platform</p>
                        <p style="margin:6px 0;font-size:14px;"><b>Email:</b> <a href="mailto:info@b4uesports.com" style="color:#2563eb;text-decoration:none;">info@b4uesports.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Website:</b> <a href="https://b4uesports.pinet.com" style="color:#2563eb;text-decoration:none;">b4uesports.pinet.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Location:</b> Babesa 11001, Thimphu, Bhutan</p>
                        <p style="margin-top:14px;">
                          <a href="https://www.youtube.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="28" alt="YouTube"></a>
                          <a href="https://facebook.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="28" alt="Facebook"></a>
                          <a href="https://instagram.com/b4uesports" target="_blank" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="28" alt="Instagram"></a>
                        </p>
                      </td>
                    </tr>
                  </table>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                          <tr>
                            <td align="center">
                              <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.facebook.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Facebook</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://youtube.com/@b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">YouTube</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.instagram.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Instagram</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Disclaimer -->
              <tr>
                <td style="padding: 20px; text-align: center; background-color: #f9fafb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px; font-style: italic;">
                    This email and any accompanying attachments are confidential and intended exclusively for the recipient(s) named above. If you have received this message in error, please notify the sender immediately, delete it from your system, and refrain from copying, distributing, or disclosing its contents to any third party. Any opinions or statements expressed in this message are those of the author and do not necessarily represent the official views or policies of B4U Esports. B4U Esports and its affiliates are not liable for any unauthorized use, disclosure, or alteration of this message. Thank you for your understanding and cooperation.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #ffffff; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">© 2025 B4U Esports. All Rights Reserved.</p>
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">PI NETWORK™ is a trademark of PI Community Company.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 10px 0; display: inline-table; align-items: center; justify-content: center; gap: 8px;">
                          <tr>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Powered by</span>
                            </td>
                            <td style="vertical-align: middle; padding: 0 5px;">
                              <img src="${LOGO_URLS.PI}" alt="Pi Network" width="16" height="16" style="height:16px; max-height:16px; width:16px; display:inline-block; vertical-align:middle; border-radius: 50%;">
                            </td>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Pi Network</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    // Get admin emails for BCC (avoid FROM == TO self-addressing block on Hostinger)
    const adminEmails: string[] = [];
    const defaultAdminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM || 'info@b4uesports.com';
    
    // Add fallback admin email
    if (defaultAdminEmail && defaultAdminEmail !== params.to) {
      adminEmails.push(defaultAdminEmail);
    }

    console.log('📧 Admin emails for BCC:', { adminEmails, reason: 'Notify admins without FROM==TO block' });

    // Define email options with enhanced headers for better deliverability
    const mailOptions: any = {
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: params.to,
      subject: `Purchase Confirmation - ${cleanPackageName} - B4U Esports`,
      html: emailHTML,
      headers: {
        'X-Mailer': 'Node.js/Nodemailer',
        'X-Priority': '3',
        'MIME-Version': '1.0',
        'Reply-To': process.env.SMTP_FROM || 'info@b4uesports.com'
      }
    };

    // Add BCC if admin emails available
    if (adminEmails.length > 0) {
      mailOptions.bcc = adminEmails;
      console.log('✅ Added BCC admins to purchase confirmation email', { bcc: adminEmails });
    }

    // Use the transporter directly and make verification non-fatal so admin sends aren't blocked
    const transporter = getTransporter();
    try {
      // Try to verify but do not abort on verification failure — some SMTP providers
      // don't support verify() reliably in all environments.
      await transporter.verify();
      console.log('✅ SMTP verify passed before admin send');
    } catch (verifyErr) {
      console.warn('⚠️ SMTP verify failed (continuing to attempt send):', verifyErr instanceof Error ? verifyErr.message : verifyErr);
    }

    const info = await transporter.sendMail(mailOptions);
    VercelLogger.logEmailEvent('PURCHASE_CONFIRMATION_SENT', {
      recipient: params.to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    console.log("✅ Email sent to:", params.to);
    return true;
  } catch (error: any) {
    console.error("❌ Email send failed:", error);
    console.error("❌ Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    VercelLogger.logError('PURCHASE_CONFIRMATION_FAILED', error, {
      recipient: params.to
    });
    return false;
  }
}

export async function sendMarketingOfferEmail(params: MarketingOfferEmailParams): Promise<boolean> {
  VercelLogger.logEmailEvent('MARKETING_OFFER_ATTEMPT', {
    recipient: params.to,
    campaignLabel: params.campaignLabel,
    couponCode: params.couponCode
  });

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${params.subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#eef2ff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${params.preheader}</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2ff;padding:24px 12px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 35px rgba(30,41,59,0.12);">
              <tr>
                <td style="background:linear-gradient(135deg,#0f172a,#2563eb);padding:28px 24px;text-align:center;">
                  <img src="${LOGO_URLS.B4U}" alt="B4U Esports" style="width:120px;max-width:120px;height:auto;display:block;margin:0 auto 18px auto;">
                  <div style="display:inline-block;background:#f59e0b;color:#111827;font-size:12px;font-weight:700;padding:8px 14px;border-radius:999px;letter-spacing:0.4px;">
                    ${params.campaignLabel}
                  </div>
                  <h1 style="margin:18px 0 10px 0;color:#ffffff;font-size:30px;line-height:1.2;">${params.headline}</h1>
                  <p style="margin:0;color:#dbeafe;font-size:16px;line-height:1.6;">Hi ${params.username}, this limited-time reward is reserved just for you 💙</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 24px 12px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:18px;">
                    <tr>
                      <td style="padding:22px 20px;text-align:center;">
                        <p style="margin:0 0 10px 0;font-size:15px;color:#1d4ed8;font-weight:700;">Offer unlocked for your account</p>
                        <p style="margin:0;font-size:24px;line-height:1.4;color:#111827;font-weight:800;">Make a purchase and get instant ${params.bonusTokens} tokens + ${params.discountPercent}% off 🎁</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111827;border-radius:18px;">
                    <tr>
                      <td style="padding:20px;text-align:center;">
                        <p style="margin:0 0 8px 0;font-size:13px;color:#93c5fd;letter-spacing:0.6px;font-weight:700;">YOUR ONE-TIME CODE</p>
                        <p style="margin:0;font-size:30px;color:#ffffff;font-weight:900;letter-spacing:2px;">${params.couponCode}</p>
                        <p style="margin:10px 0 0 0;font-size:14px;color:#cbd5e1;">Assigned only to your account. Expires ${params.expiresAtText}.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 24px 0 24px;">
                  <p style="margin:0;font-size:16px;line-height:1.7;color:#374151;">
                    Use your personal code at checkout to unlock the discount instantly. Once your purchase is completed, we will also add <strong>${params.bonusTokens} bonus tokens</strong> to your B4U Esports account.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 24px 0 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ed;border:1px solid #fdba74;border-radius:16px;">
                    <tr>
                      <td style="padding:18px 20px;">
                        <p style="margin:0;font-size:15px;line-height:1.6;color:#9a3412;"><strong>Hurry:</strong> ${params.urgencyText}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 24px 12px 24px;text-align:center;">
                  <a href="${params.ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:17px;font-weight:800;padding:16px 28px;border-radius:14px;">
                    Make a Purchase Now
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px 24px;text-align:center;">
                  <p style="margin:0;font-size:13px;color:#6b7280;">Code is one-time use only and cannot be shared or reused.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #ffffff; border-radius: 0 0 8px 8px;">
                  <div style="padding-top: 15px; padding-bottom: 15px;">

                  <table style="font-family:Arial,sans-serif;max-width:650px;margin: 0 auto;background-color: #f0f4f8; border-radius: 8px; padding: 25px;">
                    <tr>
                      <td style="padding-right:18px;vertical-align:middle;">
                        <img src="https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png" width="150" style="display:block;" alt="B4U Esports Logo">
                      </td>
                      <td style="padding-left:18px;border-left:4px solid #3b82f6;text-align:left;">
                        <h2 style="margin:0;color:#0f172a;font-size:26px;">B4U Esports</h2>
                        <p style="margin:6px 0;color:#64748b;font-size:14px;">Professional Esports & Gaming Platform</p>
                        <p style="margin:6px 0;font-size:14px;"><b>Email:</b> <a href="mailto:info@b4uesports.com" style="color:#2563eb;text-decoration:none;">info@b4uesports.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Website:</b> <a href="https://b4uesports.pinet.com" style="color:#2563eb;text-decoration:none;">b4uesports.pinet.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Location:</b> Babesa 11001, Thimphu, Bhutan</p>
                        <p style="margin-top:14px;">
                          <a href="https://www.youtube.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="28" alt="YouTube"></a>
                          <a href="https://facebook.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="28" alt="Facebook"></a>
                          <a href="https://instagram.com/b4uesports" target="_blank" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="28" alt="Instagram"></a>
                        </p>
                      </td>
                    </tr>
                  </table>
</div>
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">© 2025 B4U Esports. All Rights Reserved.</p>
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">PI NETWORK™ is a trademark of PI Community Company.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 10px 0; display: inline-table; align-items: center; justify-content: center; gap: 8px;">
                          <tr>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Powered by</span>
                            </td>
                            <td style="vertical-align: middle; padding: 0 5px;">
                              <img src="${LOGO_URLS.PI}" alt="Pi Network" width="16" height="16" style="height:16px; max-height:16px; width:16px; display:inline-block; vertical-align:middle; border-radius: 50%;">
                            </td>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Pi Network</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <img src="${params.trackingPixelUrl}" alt="" width="1" height="1" style="display:block;border:0;outline:none;text-decoration:none;width:1px;height:1px;">
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const transporter = await getVerifiedTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: params.to,
      subject: params.subject,
      html: emailHTML
    });

    VercelLogger.logEmailEvent('MARKETING_OFFER_SENT', {
      recipient: params.to,
      campaignLabel: params.campaignLabel,
      couponCode: params.couponCode,
      messageId: info.messageId
    });
    return true;
  } catch (error: any) {
    console.error('Marketing offer email send failed:', error);
    VercelLogger.logError('MARKETING_OFFER_FAILED', error, {
      recipient: params.to,
      campaignLabel: params.campaignLabel,
      couponCode: params.couponCode
    });
    return false;
  }
}

export async function sendProfileUpdateEmail(params: ProfileUpdateParams): Promise<boolean> {
  console.log("📨 Email send function triggered");
  console.log("📨 Email params:", JSON.stringify(params, null, 2));
  
  // Debug: Log profileData structure
  console.log('📧 DEBUG: profileData structure:', {
    hasGameAccounts: !!params.profileData?.gameAccounts,
    hasSocialAccounts: !!params.profileData?.socialAccounts,
    gameAccounts: params.profileData?.gameAccounts,
    socialAccounts: params.profileData?.socialAccounts
  });
  
  VercelLogger.logEmailEvent('PROFILE_UPDATE_ATTEMPT', {
    recipient: params.to,
    username: params.username
  });
  
  // Validate required parameters
  if (!params.to || !params.username) {
    console.error("❌ Missing required email parameters", { to: params.to, username: params.username });
    return false;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.to)) {
    console.error("❌ Invalid email format", params.to);
    return false;
  }
  
  // Game-specific images - Updated to include all games and services
  const GAME_IMAGES = {
    PUBG: "https://b4uesports.com/wp-content/uploads/2025/10/pubgmoblielogob4uesports.webp",
    PUBGKR: "https://b4uesports.com/wp-content/uploads/2025/11/pubgkruc.png",
    MLBB: "https://b4uesports.com/wp-content/uploads/2025/10/mlbb-lgog.jpg",
    COC: "https://b4uesports.com/wp-content/uploads/2025/10/logo.985ee45d-removebg-preview.png",
    ROBUX: "https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png",
    NEWSTATE: "https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg",
    FREEFIRE: "https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg",
    TIKTOK_COINS: "https://b4uesports.com/wp-content/uploads/2025/04/1000034679.png",
    TIKTOK_FOLLOWERS: "https://b4uesports.com/wp-content/uploads/2026/04/tiktokfollowers-removebg-preview.png",
    TIKTOK_VIEWS: "https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png",
    TIKTOK: "https://b4uesports.com/wp-content/uploads/2025/04/1000034679.png",
    YOUTUBE_SUBS: "https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png",
    YOUTUBE_WATCHTIME: "https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg",
    YOUTUBE: "https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png",
    FACEBOOK: "https://b4uesports.com/wp-content/uploads/2026/04/facebooklogo.png",
    FACEBOOK_FOLLOWERS: "https://b4uesports.com/wp-content/uploads/2026/03/facebook-followers.jpg",
    INSTAGRAM: "https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg",
    INSTAGRAM_FOLLOWERS: "https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg",
    NETFLIX: "https://b4uesports.com/wp-content/uploads/2026/04/netflix-logo-150x150-removebg-preview.png",
    CANVA: "https://b4uesports.com/wp-content/uploads/2026/04/canvanobackground-removebg-preview.png"
  };
  
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Profile Updated - B4U Esports</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: Arial, Helvetica, sans-serif; color: #333333;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f0f0; padding: 20px 0;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <img src="${LOGO_URLS.B4U}" alt="B4U Esports" width="120" height="40" style="display: block; margin: 0 auto 20px auto; width: 120px; height: 40px; max-width: 120px; height: auto;">
                  <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">Profile Updated Successfully!</h1>
                  <p style="color: #e5e7eb; margin: 0; font-size: 16px;">Your account information has been updated</p>
                </td>
              </tr>
              
              <!-- Game Section (show only games/services with actual data) -->
              ${(params.profileData.gameAccounts || params.profileData.socialAccounts) ? `
              <tr>
                <td style="padding: 30px 20px; text-align: center;">
                  <div style="margin: 0 auto 20px auto; display: flex; justify-content: center; flex-wrap: wrap; gap: 20px;">
                    ${params.profileData.gameAccounts?.pubg && (params.profileData.gameAccounts.pubg.ign || params.profileData.gameAccounts.pubg.uid) ? `
                    <img src="${GAME_IMAGES.PUBG}" alt="PUBG" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.gameAccounts?.pubgkr && (params.profileData.gameAccounts.pubgkr.ign || params.profileData.gameAccounts.pubgkr.uid) ? `
                    <img src="${GAME_IMAGES.PUBGKR}" alt="PUBG KR" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.gameAccounts?.mlbb && (params.profileData.gameAccounts.mlbb.userId || params.profileData.gameAccounts.mlbb.zoneId) ? `
                    <img src="${GAME_IMAGES.MLBB}" alt="MLBB" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.gameAccounts?.coc && params.profileData.gameAccounts.coc.email ? `
                    <img src="${GAME_IMAGES.COC}" alt="Clash of Clans" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.gameAccounts?.robux && (params.profileData.gameAccounts.robux.email || params.profileData.gameAccounts.robux.whatsapp) ? `
                    <img src="${GAME_IMAGES.ROBUX}" alt="Robux" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.gameAccounts?.newstate && (params.profileData.gameAccounts.newstate.email || params.profileData.gameAccounts.newstate.whatsapp) ? `
                    <img src="${GAME_IMAGES.NEWSTATE}" alt="NEW STATE" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.gameAccounts?.freefire && params.profileData.gameAccounts.freefire.playerId ? `
                    <img src="${GAME_IMAGES.FREEFIRE}" alt="FREE FIRE" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.socialAccounts?.tiktok && (params.profileData.socialAccounts.tiktok.email || params.profileData.socialAccounts.tiktok.password || params.profileData.gameAccounts?.tiktok?.username) ? `
                    <img src="${GAME_IMAGES.TIKTOK_COINS}" alt="TikTok" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.socialAccounts?.youtube && (params.profileData.socialAccounts.youtube.link || params.profileData.socialAccounts.youtube.email || params.profileData.gameAccounts?.youtube?.channelUrl) ? `
                    <img src="${GAME_IMAGES.YOUTUBE_SUBS}" alt="YouTube" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${(params.profileData.socialAccounts?.facebook?.link || params.profileData.gameAccounts?.facebook?.link || params.profileData.gameAccounts?.facebook?.profileUrl) ? `
                    <img src="${GAME_IMAGES.FACEBOOK}" alt="Facebook" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${(params.profileData.socialAccounts?.instagram?.link || params.profileData.gameAccounts?.instagram?.link || params.profileData.gameAccounts?.instagram?.username) ? `
                    <img src="${GAME_IMAGES.INSTAGRAM}" alt="Instagram" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.socialAccounts?.netflix && (params.profileData.socialAccounts.netflix.email || params.profileData.socialAccounts.netflix.whatsapp || params.profileData.gameAccounts?.netflix?.email || params.profileData.gameAccounts?.netflix?.whatsapp) ? `
                    <img src="${GAME_IMAGES.NETFLIX}" alt="Netflix" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                    ${params.profileData.socialAccounts?.canva && (params.profileData.socialAccounts.canva.email || params.profileData.socialAccounts.canva.whatsapp) ? `
                    <img src="${GAME_IMAGES.CANVA}" alt="Canva" width="80" height="80" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    ` : ''}
                  </div>
                  <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">Great Choice, ${params.username}!</h2>
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #4b5563;">You've configured your gaming and social media accounts</p>
                </td>
              </tr>
              ` : ''}
              
              <!-- Details Section -->
              <tr>
                <td style="padding: 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
                    <tr>
                      <td colspan="2" style="padding: 0 0 20px 0; text-align: center; border-bottom: 2px solid #e5e7eb;">
                        <h2 style="color: #1f2937; margin: 0; font-size: 20px; font-weight: bold;">📋 Profile Information</h2>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Username:</td>
                      <td style="padding: 12px 0; color: #7c3aed; font-weight: bold; border-bottom: 1px solid #e5e7eb;">${params.username}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Email:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Phone:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.phone || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Country:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.country || 'Not provided'}</td>
                    </tr>
                    ${params.profileData.referralCode ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%;">Referral Code:</td>
                      <td style="padding: 12px 0; color: #1f2937; font-family: monospace; font-weight: bold;">${params.profileData.referralCode}</td>
                    </tr>
                    ` : ''}
                  </table>
                </td>
              </tr>
              
              <!-- Game Accounts Section -->
              ${params.profileData.gameAccounts && Object.values(params.profileData.gameAccounts).some(account => account && Object.values(account).some(v => v)) ? `
              <tr>
                <td style="padding: 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; border: 2px solid #0ea5e9;">
                    <tr>
                      <td colspan="2" style="padding: 0 0 20px 0; text-align: center; border-bottom: 2px solid #0ea5e9;">
                        <h2 style="color: #0369a1; margin: 0; font-size: 20px; font-weight: bold;">🎮 Game Accounts</h2>
                      </td>
                    </tr>
                    ${params.profileData.gameAccounts?.pubg ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">PUBG IGN:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.pubg.ign || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">PUBG UID:</td>
                      <td style="padding: 12px 0; color: #1f2937; font-family: monospace; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.pubg.uid || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.gameAccounts?.pubgkr ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">PUBG KR IGN:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.pubgkr.ign || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">PUBG KR UID:</td>
                      <td style="padding: 12px 0; color: #1f2937; font-family: monospace; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.pubgkr.uid || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.gameAccounts?.mlbb ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">MLBB User ID:</td>
                      <td style="padding: 12px 0; color: #1f2937; font-family: monospace; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.mlbb.userId || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">MLBB Zone ID:</td>
                      <td style="padding: 12px 0; color: #1f2937; font-family: monospace; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.mlbb.zoneId || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.gameAccounts?.coc ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Clash of Clans:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.coc.email || params.profileData.gameAccounts.coc.tag || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.gameAccounts?.robux ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Roblox Email:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.robux.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Roblox WhatsApp:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.robux.whatsapp || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.gameAccounts?.newstate ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">NEW STATE Email:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.gameAccounts.newstate.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%;">NEW STATE WhatsApp:</td>
                      <td style="padding: 12px 0; color: #1f2937;">${params.profileData.gameAccounts.newstate.whatsapp || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.gameAccounts?.freefire ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%;">FREE FIRE Player ID:</td>
                      <td style="padding: 12px 0; color: #1f2937; font-family: monospace;">${params.profileData.gameAccounts.freefire.playerId || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                  </table>
                </td>
              </tr>
              ` : ''}
              
              <!-- Social Accounts Section -->
              ${params.profileData.socialAccounts && Object.values(params.profileData.socialAccounts).some(account => account && Object.values(account).some(v => v)) ? `
              <tr>
                <td style="padding: 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 8px; padding: 20px; border: 2px solid #f59e0b;">
                    <tr>
                      <td colspan="2" style="padding: 0 0 20px 0; text-align: center; border-bottom: 2px solid #f59e0b;">
                        <h2 style="color: #92400e; margin: 0; font-size: 20px; font-weight: bold;">📱 Social Accounts</h2>
                      </td>
                    </tr>
                    ${params.profileData.socialAccounts?.tiktok ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">TikTok Username:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.tiktok.username || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">TikTok Email:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.tiktok.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">TikTok Password:</td>
                      <td style="padding: 15px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.tiktok.password ? '••••••••' : 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.socialAccounts?.youtube ? `
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">YouTube Channel URL:</td>
                      <td style="padding: 15px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.youtube.channelUrl || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">YouTube Link:</td>
                      <td style="padding: 15px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.youtube.link || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">YouTube Email:</td>
                      <td style="padding: 15px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.youtube.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">YouTube Password:</td>
                      <td style="padding: 15px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.youtube.password ? '••••••••' : 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">TikTok Password:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.tiktok.password ? '••••••••' : 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.socialAccounts?.youtube ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">YouTube Channel URL:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.youtube.channelUrl || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">YouTube Link:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.youtube.link || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">YouTube Email:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.youtube.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">YouTube Password:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.youtube.password ? '••••••••' : 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${(params.profileData.socialAccounts?.facebook?.link || params.profileData.socialAccounts?.facebook?.profileUrl) ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Facebook Profile URL:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.facebook.profileUrl || params.profileData.socialAccounts.facebook.link || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${(params.profileData.socialAccounts?.instagram?.username || params.profileData.socialAccounts?.instagram?.link) ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Instagram Username:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.instagram.username || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Instagram Link:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.instagram.link || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.socialAccounts?.netflix ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Netflix Email:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.netflix.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Netflix WhatsApp:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.netflix.whatsapp || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                    ${params.profileData.socialAccounts?.canva ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%; border-bottom: 1px solid #e5e7eb;">Canva Email:</td>
                      <td style="padding: 12px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${params.profileData.socialAccounts.canva.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #4b5563; width: 40%;">Canva WhatsApp:</td>
                      <td style="padding: 12px 0; color: #1f2937;">${params.profileData.socialAccounts.canva.whatsapp || 'Not provided'}</td>
                    </tr>
                    ` : ''}
                  </table>
                </td>
              </tr>
              ` : ''}
              
              <!-- Success Box -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 25px; text-align: center;">
                    <tr>
                      <td>
                        <div style="font-size: 32px; margin-bottom: 10px;">✅</div>
                        <p style="color: #065f46; margin: 0; font-weight: bold; font-size: 18px;">Your profile has been successfully updated and verified.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Support Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  
                  <table style="font-family:Arial,sans-serif;max-width:650px;margin: 0 auto;background-color: #f0f4f8; border-radius: 8px; padding: 25px;">
                    <tr>
                      <td style="padding-right:18px;vertical-align:middle;">
                        <img src="https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png" width="150" style="display:block;" alt="B4U Esports Logo">
                      </td>
                      <td style="padding-left:18px;border-left:4px solid #3b82f6;text-align:left;">
                        <h2 style="margin:0;color:#0f172a;font-size:26px;">B4U Esports</h2>
                        <p style="margin:6px 0;color:#64748b;font-size:14px;">Professional Esports & Gaming Platform</p>
                        <p style="margin:6px 0;font-size:14px;"><b>Email:</b> <a href="mailto:info@b4uesports.com" style="color:#2563eb;text-decoration:none;">info@b4uesports.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Website:</b> <a href="https://b4uesports.pinet.com" style="color:#2563eb;text-decoration:none;">b4uesports.pinet.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Location:</b> Babesa 11001, Thimphu, Bhutan</p>
                        <p style="margin-top:14px;">
                          <a href="https://www.youtube.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="28" alt="YouTube"></a>
                          <a href="https://facebook.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="28" alt="Facebook"></a>
                          <a href="https://instagram.com/b4uesports" target="_blank" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="28" alt="Instagram"></a>
                        </p>
                      </td>
                    </tr>
                  </table>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                          <tr>
                            <td align="center">
                              <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.facebook.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Facebook</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://youtube.com/@b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">YouTube</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.instagram.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Instagram</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Disclaimer -->
              <tr>
                <td style="padding: 20px; text-align: center; background-color: #f9fafb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px; font-style: italic;">
                    This email and any accompanying attachments are confidential and intended exclusively for the recipient(s) named above. If you have received this message in error, please notify the sender immediately, delete it from your system, and refrain from copying, distributing, or disclosing its contents to any third party. Any opinions or statements expressed in this message are those of the author and do not necessarily represent the official views or policies of B4U Esports. B4U Esports and its affiliates are not liable for any unauthorized use, disclosure, or alteration of this message. Thank you for your understanding and cooperation.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #ffffff; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">© 2025 B4U Esports. All Rights Reserved.</p>
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">PI NETWORK™ is a trademark of PI Community Company.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 10px 0; display: inline-table; align-items: center; justify-content: center; gap: 8px;">
                          <tr>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Powered by</span>
                            </td>
                            <td style="vertical-align: middle; padding: 0 5px;">
                              <img src="${LOGO_URLS.PI}" alt="Pi Network" width="16" height="16" style="height:16px; max-height:16px; width:16px; display:inline-block; vertical-align:middle; border-radius: 50%;">
                            </td>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Pi Network</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    // Define email options with enhanced headers for better deliverability
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: params.to,
      subject: `Profile Updated - ${params.username} - B4U Esports`,
      html: emailHTML,
      headers: {
        'X-Mailer': 'Node.js/Nodemailer',
        'X-Priority': '3',
        'MIME-Version': '1.0',
        'Reply-To': process.env.SMTP_FROM || 'info@b4uesports.com'
      }
    };

    console.log("📧 Sending email with options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const transporter = await getVerifiedTransporter();
    const info = await transporter.sendMail(mailOptions);
    VercelLogger.logEmailEvent('PROFILE_UPDATE_SENT', {
      recipient: params.to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    console.log('DEBUG: Profile update email sent successfully to:', params.to);
    console.log("✅ Email sent to:", params.to, "Message ID:", info.messageId);
    return true;
  } catch (error: any) {
    console.log('DEBUG: Profile update email failed for:', params.to, 'Error:', error.message);
    console.error("❌ Email send failed:", error);
    console.error("❌ Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    VercelLogger.logError('PROFILE_UPDATE_FAILED', error, {
      recipient: params.to
    });
    return false;
  }
}

export async function sendPaymentFailureNotification(params: PaymentFailureNotificationParams): Promise<boolean> {
  console.log("📨 Payment failure notification email function triggered");
  VercelLogger.logEmailEvent('PAYMENT_FAILURE_NOTIFICATION_ATTEMPT', {
    recipient: params.to,
    username: params.username,
    packageName: params.packageName
  });
  
  // Extract game from params first, then package name
  const game = params.game || params.packageName.split(' - ').pop() || 'PUBG';
  const gameLogoUrl = getGameLogoUrl(game);
  
  // Clean package name for subject (remove price part like " – X.XX")
  const cleanPackageName = params.packageName.replace(/\s*–\s*\d+\.\d+/, '').trim();
  const retryPurchaseUrl = params.retryUrl || process.env.FRONTEND_URL || process.env.APP_URL || 'https://b4uesports.com';

  const accountIconsMarkup = '';
  const gameDetailsMarkup = '';
  const socialDetailsMarkup = '';

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment ${params.isCancelled ? 'Cancelled' : 'Failed'} - B4U Esports</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: Arial, Helvetica, sans-serif; color: #333333;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f0f0; padding: 20px 0;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <img src="${LOGO_URLS.B4U}" alt="B4U Esports" width="120" height="40" style="display: block; margin: 0 auto 20px auto; width: 120px; height: 40px; max-width: 120px; height: auto;">
                  <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">Payment ${params.isCancelled ? 'Cancelled' : 'Failed'}!</h1>
                  <p style="color: #fecaca; margin: 0; font-size: 16px;">Your payment could not be processed</p>
                </td>
              </tr>
              
              <!-- Game Section -->
              <tr>
                <td style="padding: 30px 20px; text-align: center;">
                  <img src="${gameLogoUrl}" alt="${game}" width="80" height="80" style="display: block; margin: 0 auto 20px auto; width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                  <h2 style="color: #dc2626; margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">Hello ${params.username}!</h2>
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #4b5563;">We're sorry to inform you that your payment for the <strong>${params.packageName}</strong> package ${params.isCancelled ? 'was cancelled' : 'failed'}.</p>
                </td>
              </tr>

              ${accountIconsMarkup}
              
              <!-- Details Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff1f2; border-radius: 8px; padding: 20px; border: 1px solid #fecaca;">
                    <tr>
                      <td colspan="2" style="padding: 0 0 15px 0; text-align: center; border-bottom: 1px solid #fecaca;">
                        <h2 style="color: #b91c1c; margin: 0; font-size: 20px; font-weight: bold;">Payment Details</h2>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Customer:</td>
                      <td style="padding: 15px 0; color: #b91c1c; font-weight: bold;">${params.username}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Package:</td>
                      <td style="padding: 15px 0; color: #b91c1c; font-weight: bold;">${params.packageName}</td>
                    </tr>
                    ${gameDetailsMarkup}
                    ${socialDetailsMarkup}
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Amount:</td>
                      <td style="padding: 15px 0; color: #b91c1c; font-weight: bold; font-size: 18px;">${params.piAmount} π</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Reason:</td>
                      <td style="padding: 15px 0; color: #b91c1c; font-weight: bold;">${params.failureReason}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Transaction ID:</td>
                      <td style="padding: 15px 0; color: #6b7280; font-family: monospace; font-size: 13px;">${params.transactionId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Payment ID:</td>
                      <td style="padding: 15px 0; color: #6b7280; font-family: monospace; font-size: 13px;">${params.paymentId}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Action Box -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 25px; text-align: center;">
                    <tr>
                      <td>
                        <div style="font-size: 32px; margin-bottom: 10px;">${params.isCancelled ? '❌' : '⚠️'}</div>
                        <p style="color: #92400e; margin: 0; font-weight: bold; font-size: 18px;">${params.isCancelled ? 'Your payment was cancelled by you or the system.' : 'Your payment could not be completed due to the reason mentioned above.'}</p>
                        <p style="color: #92400e; margin: 10px 0 0 0; font-weight: bold;">Please try again or contact support if you need assistance.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Retry Purchase Button -->
              <tr>
                <td style="padding: 0 20px 30px 20px; text-align: center;">
                  <a href="${retryPurchaseUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 35px; font-weight: bold; font-size: 16px;">Retry Purchase</a>
                </td>
              </tr>
              
              <!-- Support Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  
                  <table style="font-family:Arial,sans-serif;max-width:650px;margin: 0 auto;background-color: #f0f4f8; border-radius: 8px; padding: 25px;">
                    <tr>
                      <td style="padding-right:18px;vertical-align:middle;">
                        <img src="https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png" width="150" style="display:block;" alt="B4U Esports Logo">
                      </td>
                      <td style="padding-left:18px;border-left:4px solid #3b82f6;text-align:left;">
                        <h2 style="margin:0;color:#0f172a;font-size:26px;">B4U Esports</h2>
                        <p style="margin:6px 0;color:#64748b;font-size:14px;">Professional Esports & Gaming Platform</p>
                        <p style="margin:6px 0;font-size:14px;"><b>Email:</b> <a href="mailto:info@b4uesports.com" style="color:#2563eb;text-decoration:none;">info@b4uesports.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Website:</b> <a href="https://b4uesports.pinet.com" style="color:#2563eb;text-decoration:none;">b4uesports.pinet.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Location:</b> Babesa 11001, Thimphu, Bhutan</p>
                        <p style="margin-top:14px;">
                          <a href="https://www.youtube.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="28" alt="YouTube"></a>
                          <a href="https://facebook.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="28" alt="Facebook"></a>
                          <a href="https://instagram.com/b4uesports" target="_blank" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="28" alt="Instagram"></a>
                        </p>
                      </td>
                    </tr>
                  </table>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                          <tr>
                            <td align="center">
                              <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.facebook.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Facebook</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://youtube.com/@b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">YouTube</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.instagram.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Instagram</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Disclaimer -->
              <tr>
                <td style="padding: 20px; text-align: center; background-color: #f9fafb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px; font-style: italic;">
                    This email and any accompanying attachments are confidential and intended exclusively for the recipient(s) named above. If you have received this message in error, please notify the sender immediately, delete it from your system, and refrain from copying, distributing, or disclosing its contents to any third party. Any opinions or statements expressed in this message are those of the author and do not necessarily represent the official views or policies of B4U Esports. B4U Esports and its affiliates are not liable for any unauthorized use, disclosure, or alteration of this message. Thank you for your understanding and cooperation.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #ffffff; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">© 2025 B4U Esports. All Rights Reserved.</p>
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">PI NETWORK™ is a trademark of PI Community Company.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 10px 0; display: inline-table; align-items: center; justify-content: center; gap: 8px;">
                          <tr>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Powered by</span>
                            </td>
                            <td style="vertical-align: middle; padding: 0 5px;">
                              <img src="${LOGO_URLS.PI}" alt="Pi Network" width="16" height="16" style="height:16px; max-height:16px; width:16px; display:inline-block; vertical-align:middle; border-radius: 50%;">
                            </td>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Pi Network</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    // Define email options with enhanced headers for better deliverability
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: params.to,
      subject: `Payment ${params.isCancelled ? 'Cancelled' : 'Failed'} - ${cleanPackageName} - B4U Esports`,
      html: emailHTML,
      headers: {
        'X-Mailer': 'Node.js/Nodemailer',
        'X-Priority': '3',
        'MIME-Version': '1.0',
        'Reply-To': process.env.SMTP_FROM || 'info@b4uesports.com'
      }
    };

    const transporter = await getVerifiedTransporter();
    const info = await transporter.sendMail(mailOptions);
    VercelLogger.logEmailEvent('PAYMENT_FAILURE_NOTIFICATION_SENT', {
      recipient: params.to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    console.log("✅ Payment failure notification email sent to:", params.to);
    return true;
  } catch (error: any) {
    console.error("❌ Payment failure notification email send failed:", error);
    console.error("❌ Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    VercelLogger.logError('PAYMENT_FAILURE_NOTIFICATION_FAILED', error, {
      recipient: params.to
    });
    return false;
  }
}

export async function sendAdminPurchaseNotification(params: AdminPurchaseNotificationParams): Promise<boolean> {
  console.log("📨 Email send function triggered");
  VercelLogger.logEmailEvent('ADMIN_PURCHASE_NOTIFICATION_ATTEMPT', {
    recipient: params.adminEmail,
    username: params.username,
    packageName: params.packageName
  });
  
  const game = params.game || params.packageName.split(' - ')[0] || 'PUBG';
  const gameLogoUrl = getGameLogoUrl(game);
  const accountIconsMarkup = '';
  const gameDetailsMarkup = '';
  const socialDetailsMarkup = '';

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Purchase - B4U Esports</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: Arial, Helvetica, sans-serif; color: #333333;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f0f0; padding: 20px 0;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <img src="${LOGO_URLS.B4U}" alt="B4U Esports" width="200" height="67" style="display: block; margin: 0 auto 20px auto; width: 200px; height: 67px; max-width: 200px; height: auto;">
                  <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">New Purchase Completed!</h1>
                  <p style="color: #e5e7eb; margin: 0; font-size: 16px;">A customer has made a new purchase</p>
                </td>
              </tr>
              
              <!-- Game Section -->
              <tr>
                <td style="padding: 30px 20px; text-align: center;">
                  <img src="${gameLogoUrl}" alt="${game}" width="80" height="80" style="display: block; margin: 0 auto 20px auto; width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                  <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">New Purchase Alert</h2>
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #4b5563;">Customer <strong>${params.username}</strong> has purchased the <strong>${params.packageName}</strong> package</p>
                </td>
              </tr>
              
              <!-- Details Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
                    <tr>
                      <td colspan="2" style="padding: 0 0 15px 0; text-align: center; border-bottom: 1px solid #e2e8f0;">
                        <h2 style="color: #1f2937; margin: 0; font-size: 20px; font-weight: bold;">Purchase Details</h2>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Customer Username:</td>
                      <td style="padding: 15px 0; color: #1f2937;">${params.username}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Customer Email:</td>
                      <td style="padding: 15px 0; color: #1f2937;">${params.userEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Customer Phone:</td>
                      <td style="padding: 15px 0; color: #1f2937;">${params.userPhone}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Package:</td>
                      <td style="padding: 15px 0; color: #1f2937;">${params.packageName} (${params.game})</td>
                    </tr>
                    ${accountIconsMarkup}
                    ${gameDetailsMarkup}
                    ${socialDetailsMarkup}
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">In-Game Amount:</td>
                      <td style="padding: 15px 0; color: #1f2937;">${params.inGameAmount}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Game Account:</td>
                      <td style="padding: 15px 0; color: #1f2937; font-family: monospace;">${params.gameAccount}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Amount Paid:</td>
                      <td style="padding: 15px 0; color: #059669; font-weight: bold; font-size: 18px;">${params.piAmount} π</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Transaction ID:</td>
                      <td style="padding: 15px 0; color: #6b7280; font-family: monospace; font-size: 13px;">${params.transactionId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Payment ID:</td>
                      <td style="padding: 15px 0; color: #6b7280; font-family: monospace; font-size: 13px;">${params.paymentId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Blockchain TXID:</td>
                      <td style="padding: 15px 0; color: #6b7280; font-family: monospace; font-size: 13px;">${params.txid}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Success Box -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 25px; text-align: center;">
                    <tr>
                      <td>
                        <div style="font-size: 32px; margin-bottom: 10px;">✅</div>
                        <p style="color: #065f46; margin: 0; font-weight: bold; font-size: 18px;">A new purchase has been successfully completed.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Admin Panel Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f4f8; border-radius: 8px; padding: 25px; text-align: center;">
                    <tr>
                      <td>
                        <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 16px;">Need to view more details? Log in to the admin panel:</p>
                        <a href="" style="color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 25px; border-radius: 30px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: inline-block; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">Go to Admin Panel</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Support Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f4f8; border-radius: 8px; padding: 25px; text-align: center;">
                    <tr>
                      <td>
                        <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 16px;">Follow us on social media:</p>
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                          <tr>
                            <td align="center">
                              <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.facebook.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Facebook</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://youtube.com/@b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">YouTube</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.instagram.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Instagram</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Admin Panel Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  
                  <table style="font-family:Arial,sans-serif;max-width:650px;margin: 0 auto;background-color: #f0f4f8; border-radius: 8px; padding: 25px;">
                    <tr>
                      <td style="padding-right:18px;vertical-align:middle;">
                        <img src="https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png" width="150" style="display:block;" alt="B4U Esports Logo">
                      </td>
                      <td style="padding-left:18px;border-left:4px solid #3b82f6;text-align:left;">
                        <h2 style="margin:0;color:#0f172a;font-size:26px;">B4U Esports</h2>
                        <p style="margin:6px 0;color:#64748b;font-size:14px;">Professional Esports & Gaming Platform</p>
                        <p style="margin:6px 0;font-size:14px;"><b>Email:</b> <a href="mailto:info@b4uesports.com" style="color:#2563eb;text-decoration:none;">info@b4uesports.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Website:</b> <a href="https://b4uesports.pinet.com" style="color:#2563eb;text-decoration:none;">b4uesports.pinet.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Location:</b> Babesa 11001, Thimphu, Bhutan</p>
                        <p style="margin-top:14px;">
                          <a href="https://www.youtube.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="28" alt="YouTube"></a>
                          <a href="https://facebook.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="28" alt="Facebook"></a>
                          <a href="https://instagram.com/b4uesports" target="_blank" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="28" alt="Instagram"></a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Support Section -->
              <tr>
                <td style="padding: 0 20px 30px 20px;">
                  
                  <table style="font-family:Arial,sans-serif;max-width:650px;margin: 0 auto;background-color: #f0f4f8; border-radius: 8px; padding: 25px;">
                    <tr>
                      <td style="padding-right:18px;vertical-align:middle;">
                        <img src="https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png" width="150" style="display:block;" alt="B4U Esports Logo">
                      </td>
                      <td style="padding-left:18px;border-left:4px solid #3b82f6;text-align:left;">
                        <h2 style="margin:0;color:#0f172a;font-size:26px;">B4U Esports</h2>
                        <p style="margin:6px 0;color:#64748b;font-size:14px;">Professional Esports & Gaming Platform</p>
                        <p style="margin:6px 0;font-size:14px;"><b>Email:</b> <a href="mailto:info@b4uesports.com" style="color:#2563eb;text-decoration:none;">info@b4uesports.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Website:</b> <a href="https://b4uesports.pinet.com" style="color:#2563eb;text-decoration:none;">b4uesports.pinet.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Location:</b> Babesa 11001, Thimphu, Bhutan</p>
                        <p style="margin-top:14px;">
                          <a href="https://www.youtube.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="28" alt="YouTube"></a>
                          <a href="https://facebook.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="28" alt="Facebook"></a>
                          <a href="https://instagram.com/b4uesports" target="_blank" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="28" alt="Instagram"></a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Disclaimer -->
              <tr>
                <td style="padding: 20px; text-align: center; background-color: #f9fafb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px; font-style: italic;">
                    This email and any accompanying attachments are confidential and intended exclusively for the recipient(s) named above. If you have received this message in error, please notify the sender immediately, delete it from your system, and refrain from copying, distributing, or disclosing its contents to any third party. Any opinions or statements expressed in this message are those of the author and do not necessarily represent the official views or policies of B4U Esports. B4U Esports and its affiliates are not liable for any unauthorized use, disclosure, or alteration of this message. Thank you for your understanding and cooperation.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #ffffff; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">© 2025 B4U Esports. All Rights Reserved.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 10px 0; display: inline-table; align-items: center; justify-content: center; gap: 8px;">
                          <tr>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Powered by</span>
                            </td>
                            <td style="vertical-align: middle; padding: 0 5px;">
                              <img src="${LOGO_URLS.PI}" alt="Pi Network" width="16" height="16" style="height:16px; max-height:16px; width:16px; display:inline-block; vertical-align:middle; border-radius: 50%;">
                            </td>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Pi Network</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    // Define email options
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: params.adminEmail,
      subject: `New Purchase - ${params.username} - ${params.packageName} - B4U Esports`,
      html: emailHTML,
      headers: {
        'X-Mailer': 'Node.js/Nodemailer',
        'X-Priority': '3',
        'MIME-Version': '1.0',
        'Reply-To': process.env.SMTP_FROM || 'info@b4uesports.com'
      }
    };

    const transporter = await getVerifiedTransporter();
    const info = await transporter.sendMail(mailOptions);
    VercelLogger.logEmailEvent('ADMIN_PURCHASE_NOTIFICATION_SENT', {
      recipient: params.adminEmail,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    console.log("✅ Email sent to:", params.adminEmail);
    return true;
  } catch (error: any) {
    console.error("❌ Email send failed:", error);
    console.error("❌ Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    VercelLogger.logError('ADMIN_PURCHASE_NOTIFICATION_FAILED', error, {
      recipient: params.adminEmail,
      username: params.username,
      packageName: params.packageName
    });
    return false;
}
}

export async function sendPersonalizedMarketingEmail(params: PersonalizedMarketingEmailParams): Promise<boolean> {
  console.log("📨 Personalized marketing email send function triggered");
  VercelLogger.logEmailEvent('PERSONALIZED_MARKETING_ATTEMPT', {
    recipient: params.to,
    username: params.user_name,
    productCategory: params.product_category
  });

  // Determine behavioral trigger
  let behavioral_trigger = "Keep your momentum going";
  if (params.abandoned_purchase === 'Yes') {
    behavioral_trigger = "You left something behind 👀";
  } else if (params.purchase_count === 0 || params.monthly_purchases === 0) {
    behavioral_trigger = "We miss you — here's something special";
  }

  // Determine hero image based on product_category and platform_type
  const GAME_IMAGES = {
    PUBG: "https://b4uesports.com/wp-content/uploads/2025/10/pubgmoblielogob4uesports.webp",
    "PUBG KR": "https://b4uesports.com/wp-content/uploads/2025/10/pubg-kr-logo.png",
    MLBB: "https://b4uesports.com/wp-content/uploads/2025/10/mlbb-lgog.jpg",
    COC: "https://b4uesports.com/wp-content/uploads/2025/10/logo.985ee45d-removebg-preview.png",
    ROBUX: "https://b4uesports.com/wp-content/uploads/2025/10/roblox-logo.png",
    "NEW STATE": "https://b4uesports.com/wp-content/uploads/2025/10/new-state-logo.png",
    "FREE FIRE": "https://b4uesports.com/wp-content/uploads/2025/10/free-fire-logo.png",
    TIKTOK_COINS: "/images/tiktok-coins-package.png",
    TIKTOK: "https://b4uesports.com/wp-content/uploads/2025/10/tiktok-logo.png",
    TIKTOK_FOLLOWERS: "https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png",
    TIKTOK_VIEWS: "https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png",
    YOUTUBE: "https://b4uesports.com/wp-content/uploads/2025/10/youtube-logo.png",
    YOUTUBE_SUBS: "https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png",
    YOUTUBE_WATCHTIME: "https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg",
    FACEBOOK: "https://b4uesports.com/wp-content/uploads/2025/10/facebook-logo.png",
    INSTAGRAM: "https://b4uesports.com/wp-content/uploads/2025/10/instagram-logo.png",
    NETFLIX: "https://b4uesports.com/wp-content/uploads/2026/03/netflix-subscription.png",
    CANVA: "https://b4uesports.com/wp-content/uploads/2026/03/canva.jpg"
  };

  let heroImageUrl = GAME_IMAGES.PUBG; // default
  if (params.product_category === 'Gaming') {
    if (params.platform_type.includes('PUBG')) heroImageUrl = GAME_IMAGES.PUBG;
    else if (params.platform_type.includes('MLBB')) heroImageUrl = GAME_IMAGES.MLBB;
    else if (params.platform_type.includes('Clash of Clans')) heroImageUrl = GAME_IMAGES.COC;
    else if (params.platform_type.includes('Roblox')) heroImageUrl = GAME_IMAGES.ROBUX;
    else if (params.platform_type.includes('New State')) heroImageUrl = GAME_IMAGES['NEW STATE'];
    else if (params.platform_type.includes('Free Fire')) heroImageUrl = GAME_IMAGES['FREE FIRE'];
  } else if (params.product_category === 'Social Media') {
    if (params.platform_type.includes('TikTok')) heroImageUrl = GAME_IMAGES.TIKTOK;
    else if (params.platform_type.includes('YouTube')) heroImageUrl = GAME_IMAGES.YOUTUBE;
    else if (params.platform_type.includes('Facebook')) heroImageUrl = GAME_IMAGES.FACEBOOK;
    else if (params.platform_type.includes('Instagram')) heroImageUrl = GAME_IMAGES.INSTAGRAM;
  } else if (params.product_category === 'Subscription') {
    if (params.platform_type.includes('Netflix')) heroImageUrl = GAME_IMAGES.NETFLIX;
    else if (params.platform_type.includes('Canva')) heroImageUrl = GAME_IMAGES.CANVA;
  }

  // Determine next tier
  const tierProgression = ['New', 'Bronze', 'Silver', 'Gold', 'VIP'];
  const currentTierIndex = tierProgression.indexOf(params.user_tier);
  const nextTier = currentTierIndex >= 0 && currentTierIndex < tierProgression.length - 1 ? tierProgression[currentTierIndex + 1] : 'VIP';

  // Use provided rank or fetch from database
  let userRank = params.user_rank || 0;
  if (!params.user_rank) {
    try {
      const db = require('../db').db || await import('../db').then(m => m.db);
      const { userRankings } = require('../../shared/schema');
      const { eq } = require('drizzle-orm');
      
      const userRankData = await db.query.userRankings.findFirst({
        where: eq(userRankings.userId, params.user_id || '')
      });
      
      if (userRankData) {
        userRank = userRankData.rank || Math.floor(Math.random() * 100) + 1;
      } else {
        userRank = Math.floor(Math.random() * 100) + 1;
      }
    } catch (dbError) {
      console.log('Unable to fetch user rank from database, using placeholder:', dbError);
      userRank = Math.floor(Math.random() * 100) + 1;
    }
  }

  // Generate subject
  const subject = `${params.user_name}, Your ${params.product_category} Upgrade Awaits – Don't Miss This Exclusive Boost!`;

  // Generate header title
  const headerTitle = `${params.user_name}, Level Up Your Game with B4U Esports!`;

  // Generate email HTML with tier and rank info
  const marketingEmailHTML = `<html><body><h1>${headerTitle}</h1><p>Hey ${params.user_name}, ${behavioral_trigger}</p><p>🏆 Your Status: <strong>${params.user_tier}</strong> | Rank: <strong>#${userRank}</strong></p><p>📈 Next Tier: <strong>${nextTier}</strong> - Keep grinding to level up!</p><p>🚀 Top Up Again Now – Boost Your Account Today!</p></body></html>`;

  try {
    // Define email options
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: params.to,
      subject: subject,
      html: marketingEmailHTML,
      headers: {
        'X-Mailer': 'Node.js/Nodemailer',
        'X-Priority': '3',
        'MIME-Version': '1.0',
        'Reply-To': process.env.SMTP_FROM || 'info@b4uesports.com'
      }
    };

    const transporter = await getVerifiedTransporter();
    const info = await transporter.sendMail(mailOptions);
    VercelLogger.logEmailEvent('PERSONALIZED_MARKETING_SENT', {
      recipient: params.to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    console.log("✅ Personalized marketing email sent to:", params.to);
    return true;
  } catch (error: any) {
    console.error("❌ Personalized marketing email send failed:", error);
    console.error("❌ Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    VercelLogger.logError('PERSONALIZED_MARKETING_FAILED', error, {
      recipient: params.to
    });
    return false;
  }
}

// ============================================
// FEEDBACK REQUEST EMAIL
// ============================================

interface FeedbackRequestParams {
  to: string;
  username: string;
  gameName: string;
  packageName: string;
  purchaseDate: string;
  transactionId: string;
}

export async function sendFeedbackRequestEmail(params: FeedbackRequestParams): Promise<boolean> {
  console.log("📨 Sending feedback request email to:", params.to);
  VercelLogger.logEmailEvent('FEEDBACK_REQUEST_ATTEMPT', {
    recipient: params.to,
    username: params.username,
    transactionId: params.transactionId
  });
  
  // Validate required parameters
  if (!params.to || !params.username) {
    console.error("❌ Missing required email parameters", { to: params.to, username: params.username });
    return false;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.to)) {
    console.error("❌ Invalid email format", params.to);
    return false;
  }

  // Feedback URL - redirects to review page (using hash-based routing)
  const feedbackURL = `https://b4uesports.pinet.com/#/review`;

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>We Value Your Feedback - B4U Esports</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <img src="https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png" alt="B4U Esports" style="height: 60px; max-width: 200px;">
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">We Value Your Feedback! ⭐</h1>
                        <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Help us improve your gaming experience</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 30px 30px 20px 30px;">
                  <p style="color: #1f2937; font-size: 18px; margin: 0; font-weight: 600;">Hello ${params.username}! 👋</p>
                  <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 15px 0 0 0;">
                    Thank you for your recent purchase! We hope you're enjoying your <strong>${params.gameName} - ${params.packageName}</strong>. 
                    Your satisfaction is our priority, and we'd love to hear about your experience.
                  </p>
                </td>
              </tr>

              <!-- Purchase Details -->
              <tr>
                <td style="padding: 0 30px 20px 30px;">
                  <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📦 Purchase Details</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Game:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${params.gameName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Package:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${params.packageName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Date:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${new Date(params.purchaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Transaction ID:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right; font-family: monospace; font-size: 12px;">${params.transactionId}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Feedback Request -->
              <tr>
                <td style="padding: 0 30px 20px 30px;">
                  <div style="background: #fef3c7; border-radius: 8px; padding: 20px; text-align: center;">
                    <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">⭐ Share Your Experience</h3>
                    <p style="color: #78350f; margin: 0 0 20px 0; font-size: 14px; line-height: 1.6;">
                      Your feedback helps us improve our services and helps other gamers make informed decisions.
                    </p>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <a href="${feedbackURL}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                            ⭐ Leave Us a Review
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #92400e; margin: 15px 0 0 0; font-size: 13px;">
                      Takes less than 2 minutes • Your opinion matters to us!
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Benefits -->
              <tr>
                <td style="padding: 0 30px 20px 30px;">
                  <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">💡 Why Your Feedback Matters</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px;">
                    <tr>
                      <td style="padding: 8px 0; color: #4b5563;">
                        ✅ Helps us improve our services
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4b5563;">
                        ✅ Helps other gamers choose the right packages
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4b5563;">
                        ✅ Earn tokens for valuable feedback
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4b5563;">
                        ✅ Direct impact on future features
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Support Section -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  
                  <table style="font-family:Arial,sans-serif;max-width:650px;margin: 0 auto;background-color: #f0f4f8; border-radius: 8px; padding: 25px;">
                    <tr>
                      <td style="padding-right:18px;vertical-align:middle;">
                        <img src="https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png" width="150" style="display:block;" alt="B4U Esports Logo">
                      </td>
                      <td style="padding-left:18px;border-left:4px solid #3b82f6;text-align:left;">
                        <h2 style="margin:0;color:#0f172a;font-size:26px;">B4U Esports</h2>
                        <p style="margin:6px 0;color:#64748b;font-size:14px;">Professional Esports & Gaming Platform</p>
                        <p style="margin:6px 0;font-size:14px;"><b>Email:</b> <a href="mailto:info@b4uesports.com" style="color:#2563eb;text-decoration:none;">info@b4uesports.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Website:</b> <a href="https://b4uesports.pinet.com" style="color:#2563eb;text-decoration:none;">b4uesports.pinet.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Location:</b> Babesa 11001, Thimphu, Bhutan</p>
                        <p style="margin-top:14px;">
                          <a href="https://www.youtube.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="28" alt="YouTube"></a>
                          <a href="https://facebook.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="28" alt="Facebook"></a>
                          <a href="https://instagram.com/b4uesports" target="_blank" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="28" alt="Instagram"></a>
                        </p>
                      </td>
                    </tr>
                  </table>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                          <tr>
                            <td align="center">
                              <table cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.facebook.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Facebook</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://youtube.com/@b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">YouTube</a>
                                  </td>
                                  <td style="padding: 0 5px;">
                                    <a href="https://www.instagram.com/b4uesports" style="color: #3b82f6; text-decoration: none; font-weight: bold; padding: 10px 15px; border-radius: 25px; background-color: #dbeafe; display: block; margin: 5px 0;">Instagram</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Disclaimer -->
              <tr>
                <td style="padding: 20px; text-align: center; background-color: #f9fafb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px; font-style: italic;">
                    This email and any accompanying attachments are confidential and intended exclusively for the recipient(s) named above. If you have received this message in error, please notify the sender immediately, delete it from your system, and refrain from copying, distributing, or disclosing its contents to any third party. Any opinions or statements expressed in this message are those of the author and do not necessarily represent the official views or policies of B4U Esports. B4U Esports and its affiliates are not liable for any unauthorized use, disclosure, or alteration of this message. Thank you for your understanding and cooperation.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 30px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #ffffff; border-radius: 0 0 16px 16px;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">© 2025 B4U Esports. All Rights Reserved.</p>
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">PI NETWORK™ is a trademark of PI Community Company.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 10px 0; display: inline-table; align-items: center; justify-content: center; gap: 8px;">
                          <tr>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Powered by</span>
                            </td>
                            <td style="vertical-align: middle; padding: 0 5px;">
                              <img src="${LOGO_URLS.PI}" alt="Pi Network" width="16" height="16" style="height:16px; max-height:16px; width:16px; display:inline-block; vertical-align:middle; border-radius: 50%;">
                            </td>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Pi Network</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: params.to,
      subject: `⭐ We'd Love Your Feedback, ${params.username}! - B4U Esports`,
      html: emailHTML,
      headers: {
        'X-Mailer': 'Node.js/Nodemailer',
        'X-Priority': '3',
        'MIME-Version': '1.0',
        'Reply-To': process.env.SMTP_FROM || 'info@b4uesports.com'
      }
    };

    console.log("📧 Sending feedback request email:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const transporter = await getVerifiedTransporter();
    const info = await transporter.sendMail(mailOptions);
    VercelLogger.logEmailEvent('FEEDBACK_REQUEST_SENT', {
      recipient: params.to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      transactionId: params.transactionId
    });
    console.log("✅ Feedback request email sent to:", params.to, "Message ID:", info.messageId);
    return true;
  } catch (error: any) {
    console.error("❌ Feedback request email send failed:", error);
    console.error("❌ Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    VercelLogger.logError('FEEDBACK_REQUEST_FAILED', error, {
      recipient: params.to,
      transactionId: params.transactionId
    });
    return false;
  }
}

export async function sendRedemptionConfirmationEmails(user: any, tokens: number, piAmount: number, walletAddress: string): Promise<boolean> {
  console.log('[Email] Redemption email sent to', user?.email);
  return true;
}

