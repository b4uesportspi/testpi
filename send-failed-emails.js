import dotenv from 'dotenv';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Logo URLs (same as email service)
const LOGO_URLS = {
  B4U: "https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png",
  PI: "https://b4uesports.com/wp-content/uploads/2025/04/PI.jpg"
};

// Game images mapping
const GAME_IMAGES = {
  'PUBG': 'https://b4uesports.com/wp-content/uploads/2024/12/pubg_logo.png',
  'PUBG-KR': 'https://b4uesports.com/wp-content/uploads/2024/12/pubg_kr_logo.png',
  'MLBB': 'https://b4uesports.com/wp-content/uploads/2024/12/mlbb_logo.png',
  'COC': 'https://b4uesports.com/wp-content/uploads/2024/12/coc_logo.png',
  'FREE FIRE': 'https://b4uesports.com/wp-content/uploads/2024/12/ff_logo.png'
};

function getGameImage(game) {
  return GAME_IMAGES[game] || GAME_IMAGES['PUBG'];
}

function generatePaymentFailureEmail(username, packageName, piAmount, failureReason, transactionId, paymentId, game) {
  const gameLogoUrl = getGameImage(game || 'PUBG');
  const cleanPackageName = packageName.replace(/\s*–\s*\d+\.\d+/, '').trim();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Failed - B4U Esports</title>
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
                  <img src="${LOGO_URLS.B4U}" alt="B4U Esports" width="120" height="40" style="display: block; margin: 0 auto 20px auto; width: 120px; height: auto; max-width: 120px;">
                  <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">Payment Failed!</h1>
                  <p style="color: #fecaca; margin: 0; font-size: 16px;">Your payment could not be processed</p>
                </td>
              </tr>
              
              <!-- Game Section -->
              <tr>
                <td style="padding: 30px 20px; text-align: center;">
                  <img src="${gameLogoUrl}" alt="${game}" width="80" height="80" style="display: block; margin: 0 auto 20px auto; width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                  <h2 style="color: #dc2626; margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">Hello ${username}!</h2>
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #4b5563;">We're sorry to inform you that your payment for the <strong>${cleanPackageName}</strong> package failed.</p>
                </td>
              </tr>
              
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
                      <td style="padding: 15px 0; color: #b91c1c; font-weight: bold;">${username}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Package:</td>
                      <td style="padding: 15px 0; color: #b91c1c; font-weight: bold;">${cleanPackageName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Amount:</td>
                      <td style="padding: 15px 0; color: #b91c1c; font-weight: bold; font-size: 18px;">${piAmount} π</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Reason:</td>
                      <td style="padding: 15px 0; color: #b91c1c; font-weight: bold;">${failureReason}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Transaction ID:</td>
                      <td style="padding: 15px 0; color: #6b7280; font-family: monospace; font-size: 13px;">${transactionId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 15px 0; font-weight: bold; color: #4b5563; width: 40%;">Payment ID:</td>
                      <td style="padding: 15px 0; color: #6b7280; font-family: monospace; font-size: 13px;">${paymentId}</td>
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
                        <div style="font-size: 32px; margin-bottom: 10px;">⚠️</div>
                        <p style="color: #92400e; margin: 0; font-weight: bold; font-size: 18px;">Your payment could not be completed due to the reason mentioned above.</p>
                        <p style="color: #92400e; margin: 10px 0 0 0; font-weight: bold;">Please try again or contact support if you need assistance.</p>
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
                        <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 16px;">Need help? Contact our support team:</p>
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center">
                              <a href="mailto:info@b4uesports.com" style="color: #3b82f6; text-decoration: none; margin: 0 10px; font-weight: bold; padding: 10px 15px; border-radius: 20px; background-color: #dbeafe; display: inline-block;">📧 info@b4uesports.com</a>
                              <a href="tel:+97517875099" style="color: #3b82f6; text-decoration: none; margin: 0 10px; font-weight: bold; padding: 10px 15px; border-radius: 20px; background-color: #dbeafe; display: inline-block;">📞 +975 17875099</a>
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
                    This email and any accompanying attachments are confidential and intended exclusively for the recipient(s) named above. If you have received this message in error, please notify the sender immediately, delete it from your system, and refrain from copying, distributing, or disclosing its contents to any third party.
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
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 10px 0; display: inline-table;">
                          <tr>
                            <td style="vertical-align: middle;">
                              <span style="color: #6b7280; font-size: 14px;">Powered by</span>
                            </td>
                            <td style="vertical-align: middle; padding: 0 5px;">
                              <img src="${LOGO_URLS.PI}" alt="Pi Network" width="16" height="16" style="height:16px; width:16px; display:inline-block; vertical-align:middle; border-radius: 50%;">
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
}

async function sendFailedTransactionEmails() {
  try {
    console.log('\n📧 Sending Failed Transaction Notification Emails\n');

    // Get failed transactions with no email sent
    const result = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.failure_reason,
        u.id as user_id,
        u.username,
        u.email,
        p.name as package_name,
        p.game,
        t.pi_amount,
        t.usd_amount,
        t.created_at,
        t.updated_at
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'failed' 
        AND t.email_sent = false
        AND (t.failure_reason LIKE '%timeout%' OR t.failure_reason LIKE '%pending%')
      ORDER BY t.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('✅ All failed transaction emails have already been sent!\n');
      await pool.end();
      return;
    }

    console.log(`📊 Found ${result.rows.length} users to notify about failed payments:\n`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const tx of result.rows) {
      // Skip if no email
      if (!tx.email) {
        console.log(`\n⏭️  SKIP: ${tx.username} - No email address on file`);
        continue;
      }

      try {
        console.log(`\n📧 Sending to: ${tx.username} (${tx.email})`);
        console.log(`   Transaction: ${tx.id}`);
        console.log(`   Package: ${tx.package_name}`);
        console.log(`   Amount: ${tx.pi_amount} π (${tx.usd_amount} USD)`);
        console.log(`   Reason: ${tx.failure_reason}`);

        // Generate email using the professional template
        const emailHtml = generatePaymentFailureEmail(
          tx.username,
          tx.package_name,
          tx.pi_amount,
          tx.failure_reason,
          tx.id,
          tx.payment_id,
          tx.game
        );

        // Send email
        const mailOptions = {
          from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
          to: tx.email,
          subject: `Payment Failed - ${tx.package_name.replace(/\s*–\s*\d+\.\d+/, '').trim()} - B4U Esports`,
          html: emailHtml,
          headers: {
            'X-Mailer': 'Node.js/Nodemailer',
            'X-Priority': '3',
            'MIME-Version': '1.0',
            'Reply-To': process.env.SMTP_FROM || 'info@b4uesports.com'
          }
        };

        const info = await transporter.sendMail(mailOptions);

        if (info.messageId) {
          // Update database - mark email as sent
          await pool.query(
            `UPDATE app_transactions SET email_sent = true, updated_at = NOW() WHERE id = $1`,
            [tx.id]
          );
          
          console.log(`   ✅ Email sent successfully (ID: ${info.messageId})`);
          emailsSent++;
        } else {
          console.log(`   ❌ Email send failed - no message ID returned`);
          emailsFailed++;
        }
      } catch (error) {
        console.error(`   ❌ Error sending email:`, error.message);
        emailsFailed++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Email Summary:');
    console.log(`   ✅ Successfully Sent: ${emailsSent}`);
    console.log(`   ❌ Failed to Send: ${emailsFailed}`);
    console.log(`   ⏭️  Skipped (No Email): ${result.rows.length - emailsSent - emailsFailed}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('Error sending failed transaction emails:', error);
  } finally {
    await pool.end();
  }
}

sendFailedTransactionEmails();
