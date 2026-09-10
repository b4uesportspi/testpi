# EmailJS All Templates Configuration Guide

## Issue Description

The EmailJS templates for purchase confirmation, profile update, and admin notification emails were showing test data instead of actual user information. This happened because the EmailJS templates were not properly configured to use the dynamic parameters sent from the application.

## Solution

The fix involved updating all email service functions to send individual parameters for each piece of data and properly configuring the EmailJS templates to use these parameters.

## Email Service Updates

### 1. Purchase Confirmation Email ([sendPurchaseConfirmationEmail](file:///c:/Users/HP/B4U%20Esports/server/services/email.ts#L44-L206))

Updated to send individual parameters:

```javascript
const templateParams = {
  to_email: params.to,
  from_name: 'B4U Esports',
  subject: `Purchase Confirmation - ${params.packageName} - B4U Esports`,
  username: params.username,
  package_name: params.packageName,
  pi_amount: params.piAmount,
  usd_amount: params.usdAmount,
  game_account: params.gameAccount,
  transaction_id: params.transactionId,
  payment_id: params.paymentId,
  is_testnet: false,
  testnet_warning: '',
  html_content: emailHTML,
  // Add individual parameters for EmailJS template
  user_email: params.to,
  user_username: params.username,
  user_package_name: params.packageName,
  user_pi_amount: params.piAmount,
  user_usd_amount: params.usdAmount,
  user_game_account: params.gameAccount,
  user_transaction_id: params.transactionId,
  user_payment_id: params.paymentId
};
```

### 2. Profile Update Email ([sendProfileUpdateEmail](file:///c:/Users/HP/B4U%20Esports/server/services/email.ts#L209-L300))

Updated to send individual parameters:

```javascript
const templateParams = {
  to_email: params.to,
  from_name: 'B4U Esports',
  subject: `Profile Updated - ${params.username} - B4U Esports`,
  username: params.username,
  profile_data: JSON.stringify(params.profileData, null, 2),
  html_content: emailHTML,
  // Add individual parameters for EmailJS template
  user_email: params.to,
  user_username: params.username,
  user_phone: params.profileData.phone || 'Not provided',
  user_country: params.profileData.country || 'Not provided',
  pubg_ign: params.profileData.gameAccounts?.pubg?.ign || 'Not provided',
  pubg_uid: params.profileData.gameAccounts?.pubg?.uid || 'Not provided',
  mlbb_user_id: params.profileData.gameAccounts?.mlbb?.userId || 'Not provided',
  mlbb_zone_id: params.profileData.gameAccounts?.mlbb?.zoneId || 'Not provided',
  coc_email: params.profileData.gameAccounts?.coc?.email || 'Not provided',
  referral_code: params.profileData.referralCode || 'Not provided'
};
```

### 3. Admin Purchase Notification ([sendAdminPurchaseNotification](file:///c:/Users/HP/B4U%20Esports/server/services/email.ts#L303-L474))

Updated to send individual parameters:

```javascript
const templateParams = {
  to_email: params.adminEmail,
  from_name: 'B4U Esports',
  subject: `New Purchase - ${params.username} - ${params.packageName} - B4U Esports`,
  username: params.username,
  user_email: params.userEmail,
  user_phone: params.userPhone,
  package_name: params.packageName,
  game: params.game,
  in_game_amount: params.inGameAmount.toString(),
  pi_amount: params.piAmount,
  usd_amount: params.usdAmount,
  game_account: params.gameAccount,
  transaction_id: params.transactionId,
  payment_id: params.paymentId,
  txid: params.txid,
  html_content: emailHTML,
  // Add individual parameters for EmailJS template
  admin_email: params.adminEmail,
  customer_username: params.username,
  customer_email: params.userEmail,
  customer_phone: params.userPhone,
  purchased_package_name: params.packageName,
  purchased_game: params.game,
  in_game_amount_value: params.inGameAmount.toString(),
  paid_pi_amount: params.piAmount,
  paid_usd_amount: params.usdAmount,
  customer_game_account: params.gameAccount,
  transaction_identifier: params.transactionId,
  payment_identifier: params.paymentId,
  blockchain_txid: params.txid
};
```

## EmailJS Template Configuration

To properly configure all EmailJS templates, follow these steps for each template:

### Template 1: Purchase Confirmation (template_3m30srh)

1. Log in to your EmailJS dashboard at https://dashboard.emailjs.com/
2. Navigate to the "Email Templates" section
3. Find the template with ID `template_3m30srh` (Purchase Confirmation template)
4. Edit the template HTML to use the dynamic parameters:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Confirmation - {{user_package_name}} - B4U Esports</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <img src="" alt="B4U Esports" style="height: 60px; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Purchase Confirmed!</h1>
    <p style="color: #e5e7eb; margin: 10px 0 0 0;">Your gaming currency has been processed</p>
  </div>

  <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
    <h2 style="color: #1f2937; margin-top: 0;">Transaction Details</h2>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{user_username}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Package:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{user_package_name}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Game Account:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace;">{{user_game_account}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount Paid:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: bold;">{{user_pi_amount}} π (≈ ${{user_usd_amount}})</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Transaction ID:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">{{user_transaction_id}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0;"><strong>Payment ID:</strong></td>
        <td style="padding: 12px 0; font-family: monospace; font-size: 12px;">{{user_payment_id}}</td>
      </tr>
    </table>
  </div>

  <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="color: #065f46; margin: 0; font-weight: bold;">
      ✅ Your gaming currency will be delivered to your account within 5-10 minutes.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px;">
    <p style="color: #6b7280;">Need help? Contact our support team:</p>
    <p style="margin: 10px 0;">
      <a href="mailto:info@b4uesports.com" style="color: #3b82f6; text-decoration: none;">info@b4uesports.com</a> | 
      <a href="tel:+97517875099" style="color: #3b82f6; text-decoration: none;">+975 17875099</a>
    </p>
    
    <div style="margin: 20px 0;">
      <a href="https://www.facebook.com/b4uesports" style="margin: 0 10px; color: #3b82f6; text-decoration: none;">Facebook</a>
      <a href="https://youtube.com/@b4uesports" style="margin: 0 10px; color: #3b82f6; text-decoration: none;">YouTube</a>
      <a href="https://www.instagram.com/b4uesports" style="margin: 0 10px; color: #3b82f6; text-decoration: none;">Instagram</a>
    </div>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
    <p>© 2025 B4U Esports. All Rights Reserved.</p>
    <p style="margin: 5px 0;">Powered by <img src="" alt="Pi Network" style="height: 16px; vertical-align: middle; border-radius: 50%;"> Pi Network</p> <!-- TODO: Replace with official Pi Network logo URL -->
    <p style="margin: 5px 0; font-size: 12px;">PI NETWORK™ is a trademark of PI Community Company.</p>
  </div>
</body>
</html>
```

### Template 2: Profile Update (template_bbgjisn)

(Already covered in previous documentation)

### Template 3: Admin Purchase Notification (template for admin emails)

Follow the same pattern as the purchase confirmation template, but using the admin-specific parameters:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Purchase - {{customer_username}} - B4U Esports</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <img src="" alt="B4U Esports" style="height: 60px; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">New Purchase Completed!</h1>
    <p style="color: #e5e7eb; margin: 10px 0 0 0;">A customer has made a new purchase</p>
  </div>

  <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
    <h2 style="color: #1f2937; margin-top: 0;">Purchase Details</h2>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer Username:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{customer_username}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer Email:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{customer_email}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer Phone:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{customer_phone}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Package:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{purchased_package_name}} ({{purchased_game}})</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>In-Game Amount:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{in_game_amount_value}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Game Account:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace;">{{customer_game_account}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount Paid:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: bold;">{{paid_pi_amount}} π (≈ ${{paid_usd_amount}})</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Transaction ID:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">{{transaction_identifier}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Payment ID:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">{{payment_identifier}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0;"><strong>Blockchain TXID:</strong></td>
        <td style="padding: 12px 0; font-family: monospace; font-size: 12px;">{{blockchain_txid}}</td>
      </tr>
    </table>
  </div>

  <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="color: #065f46; margin: 0; font-weight: bold;">
      ✅ A new purchase has been successfully completed.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px;">
    <p style="color: #6b7280;">Need to view more details? Log in to the admin panel:</p>
    <p style="margin: 10px 0;">
      <a href="" style="color: #3b82f6; text-decoration: none; font-weight: bold;">Go to Admin Panel</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
    <p>© 2025 B4U Esports. All Rights Reserved.</p>
    <p style="margin: 5px 0;">Powered by <img src="" alt="Pi Network" style="height: 16px; vertical-align: middle; border-radius: 50%;"> Pi Network</p> <!-- TODO: Replace with official Pi Network logo URL -->
    <p style="margin: 5px 0; font-size: 12px;">PI NETWORK™ is a trademark of PI Community Company.</p>
  </div>
</body>
</html>
```

### EmailJS Template Settings (All Templates)

In the EmailJS template settings for all templates, make sure to:

1. Set the "To email" field to `{{to_email}}`
2. Set the "From name" field to `{{from_name}}`
3. Set the "Subject" field to use the appropriate subject parameter

## Verification

After making these changes, all email notifications (purchase confirmation, profile update, and admin notifications) should correctly display the actual user information instead of test data.