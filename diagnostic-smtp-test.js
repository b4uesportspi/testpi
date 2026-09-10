import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || 'info@b4uesports.com';
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'info@b4uesports.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@b4uesports.com';

console.log('🔍 SMTP Diagnostic Test');
console.log('======================\n');

console.log('SMTP Configuration:');
console.log(`  Host: ${SMTP_HOST}`);
console.log(`  Port: ${SMTP_PORT}`);
console.log(`  User (AUTH): ${SMTP_USER}`);
console.log(`  From (Sender): ${SMTP_FROM}`);
console.log(`  Recipient: ${ADMIN_EMAIL}`);
console.log(`  Password: ${SMTP_PASS ? '***SET***' : '❌ NOT SET'}\n`);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // TLS
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  logger: true,
  debug: true,
});

async function runDiagnostics() {
  try {
    console.log('Step 1: Verifying SMTP connection...');
    const verified = await transporter.verify();
    if (verified) {
      console.log('✅ SMTP connection verified - transporter is ready to send emails\n');
    } else {
      console.log('❌ SMTP verification returned false\n');
    }

    console.log('Step 2: Checking sender/recipient configuration...');
    if (SMTP_FROM === ADMIN_EMAIL) {
      console.log('⚠️  WARNING: Sender and recipient are the SAME email address!');
      console.log('   This may cause relay rejections on some SMTP servers.');
      console.log('   Hostinger may reject emails where From == To\n');
    } else {
      console.log(`✅ Sender (${SMTP_FROM}) differs from recipient (${ADMIN_EMAIL})\n`);
    }

    console.log('Step 3: Sending test email...');
    const info = await transporter.sendMail({
      from: `B4U Esports <${SMTP_FROM}>`,
      to: ADMIN_EMAIL,
      subject: 'DIAGNOSTIC TEST - Admin Email Delivery',
      html: `
        <h2>Diagnostic Test Email</h2>
        <p>This is a test email to verify admin email delivery is working.</p>
        <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
        <p><strong>From:</strong> ${SMTP_FROM}</p>
        <p><strong>To:</strong> ${ADMIN_EMAIL}</p>
        <hr>
        <p>If you received this email, the SMTP relay is working correctly.</p>
      `,
    });

    console.log('✅ Email send operation completed\n');
    console.log('Response details:');
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`  Accepted: ${JSON.stringify(info.accepted)}`);
    console.log(`  Rejected: ${JSON.stringify(info.rejected)}`);
    console.log(`  Pending: ${JSON.stringify(info.pending)}`);
    console.log(`  Response: ${info.response}\n`);

    if (info.accepted && info.accepted.length > 0) {
      console.log('✅ Email was ACCEPTED by Hostinger SMTP server');
      console.log('   But it may not have been DELIVERED to the recipient yet.');
      console.log('   Check your inbox (and spam folder) for the test email.\n');
    }

    if (info.rejected && info.rejected.length > 0) {
      console.log('❌ Email was REJECTED by Hostinger SMTP server');
      console.log(`   Rejected recipients: ${info.rejected.join(', ')}\n`);
    }

    console.log('Troubleshooting checklist:');
    console.log('  [ ] Check info@b4uesports.com inbox (including spam/junk)');
    console.log('  [ ] Verify SPF/DKIM records are configured for b4uesports.com');
    console.log('  [ ] Confirm Hostinger allows relay FROM info@b4uesports.com');
    console.log('  [ ] Check if Hostinger requires domain verification');
    console.log('  [ ] Verify SMTP credentials are correct in Hostinger account');
    console.log('  [ ] Check if there are IP whitelist restrictions in Hostinger');
    console.log('  [ ] Check Hostinger mail server logs for rejection reasons\n');

  } catch (error) {
    console.error('❌ Error during diagnostic test:', error);
    console.error('\nFull error details:');
    console.error(error);
  } finally {
    transporter.close();
  }
}

runDiagnostics();
