# EmailJS Template Configuration Guide

## Issue Description

The EmailJS template for profile update emails was showing test data instead of actual user information. This happened because the EmailJS template was not properly configured to use the dynamic parameters sent from the application.

## Solution

The fix involved two parts:

1. **Updated the email service** to send individual parameters for each piece of user data
2. **Properly configure the EmailJS template** to use these parameters

## Email Service Updates

The [sendProfileUpdateEmail](file:///c:/Users/HP/B4U%20Esports/server/services/email.ts#L223-L313) function in [server/services/email.ts](file:///c:/Users/HP/B4U%20Esports/server/services/email.ts) was updated to send individual parameters:

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

## EmailJS Template Configuration

To properly configure the EmailJS template, follow these steps:

1. Log in to your EmailJS dashboard at https://dashboard.emailjs.com/
2. Navigate to the "Email Templates" section
3. Find the template with ID `template_bbgjisn` (Profile Update template)
4. Edit the template HTML to use the dynamic parameters:

### Template Configuration Example

Replace the static content in your EmailJS template with dynamic placeholders:

```
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

### EmailJS Template Settings

In the EmailJS template settings, make sure to:

1. Set the "To email" field to `{{to_email}}`
2. Set the "From name" field to `{{from_name}}`
3. Set the "Subject" field to `{{subject}}`

## Verification

After making these changes, the profile update emails should correctly display the actual user information instead of test data.