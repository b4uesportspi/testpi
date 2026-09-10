# EmailJS Template Update Guide

## Issue
Your EmailJS templates are showing test data instead of actual user information because they use hardcoded values instead of dynamic placeholders.

## Solution
Replace the template HTML with the code below that uses dynamic placeholders like `{{customer_username}}`, `{{customer_email}}`, etc.

## EmailJS Template Code (Replace Your Current Template)

### For Admin Purchase Notification Template

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
  </div>
</body>
</html>
```

### For Purchase Confirmation Template (User Email)

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
  </div>
</body>
</html>
```

### For Profile Update Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Profile Updated - {{user_username}} - B4U Esports</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <img src="" alt="B4U Esports" style="height: 60px; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Profile Updated Successfully!</h1>
    <p style="color: #e5e7eb; margin: 10px 0 0 0;">Your account information has been updated</p>
  </div>

  <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
    <h2 style="color: #1f2937; margin-top: 0;">Updated Profile Information</h2>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Username:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{user_username}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{user_email}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{user_phone}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Country:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{user_country}}</td>
      </tr>
      {{#if pubg_ign}}
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>PUBG IGN:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{pubg_ign}}</td>
      </tr>
      {{/if}}
      {{#if pubg_uid}}
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>PUBG UID:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{pubg_uid}}</td>
      </tr>
      {{/if}}
      {{#if mlbb_user_id}}
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>MLBB User ID:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{mlbb_user_id}}</td>
      </tr>
      {{/if}}
      {{#if mlbb_zone_id}}
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>MLBB Zone ID:</strong></td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{mlbb_zone_id}}</td>
      </tr>
      {{/if}}
      {{#if referral_code}}
      <tr>
        <td style="padding: 12px 0;"><strong>Referral Code:</strong></td>
        <td style="padding: 12px 0;">{{referral_code}}</td>
      </tr>
      {{/if}}
    </table>
  </div>

  <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="color: #065f46; margin: 0; font-weight: bold;">
      ✅ Your profile has been successfully updated and verified.
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
  </div>
</body>
</html>
```

## EmailJS Template Settings

For all templates, make sure to set these in the EmailJS dashboard:

1. **To email**: `{{admin_email}}` (for admin notifications) or `{{user_email}}` (for user notifications)
2. **From name**: `{{from_name}}`
3. **Subject**: 
   - For admin notifications: `New Purchase - {{customer_username}} - {{purchased_package_name}} - B4U Esports`
   - For user notifications: `Purchase Confirmation - {{user_package_name}} - B4U Esports`
   - For profile updates: `Profile Updated - {{user_username}} - B4U Esports`

## Verification Steps

1. Log in to your EmailJS dashboard
2. Navigate to "Email Templates"
3. Select the appropriate template
4. Replace the entire HTML content with the code above
5. Update the template settings as specified
6. Save the template
7. Test by making a purchase or updating a profile
8. Verify that emails now show actual user data instead of test data