# B4U Esports Email System Documentation

## Overview

The B4U Esports email system is responsible for sending automated emails to users and administrators for various events in the platform. The system is built using Node.js with Nodemailer and integrates with the SMTP service provided by Hostinger.

## Features

1. **Purchase Confirmation Emails** - Sent to users after completing a purchase
2. **Profile Update Emails** - Sent to users after updating their profile information
3. **Admin Purchase Notifications** - Sent to administrators when a new purchase is made
4. **Responsive HTML Templates** - Emails are designed to work on both desktop and mobile devices
5. **Branded Templates** - All emails use B4U Esports branding with logos and color schemes
6. **Legal Compliance** - Includes professional disclaimers in all emails

## Technical Implementation

### Email Service

The email service is implemented in `server/services/email.ts` and provides three main functions:

1. `sendPurchaseConfirmationEmail()` - Sends purchase confirmation to users
2. `sendProfileUpdateEmail()` - Sends profile update confirmation to users
3. `sendAdminPurchaseNotification()` - Sends purchase notifications to administrators

### Dependencies

- `nodemailer` - For sending emails
- `dotenv` - For environment variable management

### Configuration

The email service requires the following environment variables:

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=info@b4uesports.com
SMTP_PASS=your-password-here
SMTP_FROM=info@b4uesports.com
SMTP_FROM_NAME=B4U Esports
```

### Email Templates

All emails use responsive HTML templates with the following structure:

1. **Header Section** - Contains the B4U Esports logo and email title
2. **Content Section** - Contains the main email content specific to the email type
3. **Details Section** - Contains detailed information in a table format
4. **Call-to-Action Section** - Contains buttons or important messages
5. **Support Section** - Contains contact information and social media links
6. **Disclaimer Section** - Contains legal disclaimer text
7. **Footer Section** - Contains copyright information and Pi Network branding

## Recent Changes

### Logo Size Reduction

- **Before**: B4U Esports logo was 200x67 pixels
- **After**: B4U Esports logo is now 120x40 pixels
- **Reason**: The original logo was too large and dominated the email header

### Username and Package Highlighting

- **Username Color**: Changed from default color to purple (#7c3aed) with bold font weight
- **Package Color**: Changed from default color to blue (#1e3a8a) with bold font weight
- **Reason**: Improved visual distinction and branding consistency

### Professional Disclaimer

- **Added**: Professional legal disclaimer in italics to all email templates
- **Content**: Confidentiality notice, error handling instructions, liability limitation, and cooperation request
- **Reason**: Legal compliance and professional appearance

### Game Logos in Profile Update Emails

- **Added**: Game-specific logos (PUBG, MLBB, Clash of Clans) in profile update emails
- **Condition**: Only shown when users have game accounts configured
- **Reason**: Enhanced visual appeal and personalization

## Email Template Structure

### Purchase Confirmation Email

1. Header with B4U Esports logo
2. Game logo and purchase confirmation message
3. Transaction details table:
   - Customer name (highlighted in purple)
   - Package name (highlighted in blue)
   - Game account
   - Amount paid
   - Transaction ID
   - Payment ID
4. Success message with delivery time estimate
5. Support contact information
6. Social media links
7. Legal disclaimer
8. Footer with copyright and Pi Network branding

### Profile Update Email

1. Header with B4U Esports logo
2. Game logo (if user has game accounts configured)
3. Profile update confirmation message
4. Updated profile information table:
   - Username (highlighted in purple)
   - Email
   - Phone
   - Country
   - Game account details (if applicable)
   - Referral code (if applicable)
5. Success message
6. Support contact information
7. Social media links
8. Legal disclaimer
9. Footer with copyright and Pi Network branding

### Admin Purchase Notification Email

1. Header with B4U Esports logo
2. Game logo and new purchase alert
3. Purchase details table:
   - Customer username (highlighted in purple)
   - Customer email
   - Customer phone
   - Package name (highlighted in blue)
   - In-game amount
   - Game account
   - Amount paid
   - Transaction ID
   - Payment ID
   - Blockchain TXID
4. Success message
5. Admin panel link
6. Social media links
7. Legal disclaimer
8. Footer with copyright and Pi Network branding

## Branding Elements

### Colors

- Primary: #1e3a8a (Dark blue)
- Secondary: #7c3aed (Purple)
- Success: #059669 (Green)
- Warning: #f59e0b (Amber)
- Background: #f0f0f0 (Light gray)
- Card background: #ffffff (White)

### Logos

1. **B4U Esports Logo**
   - URL: https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png
   - Size: 120x40 pixels

2. **Pi Network Logo**
   - URL: https://b4uesports.com/wp-content/uploads/2025/04/PI.jpg
   - Size: 16x16 pixels

3. **Game Logos**
   - PUBG: https://b4uesports.com/wp-content/uploads/2025/10/pubgmoblielogob4uesports.webp
   - MLBB: https://b4uesports.com/wp-content/uploads/2025/10/mlbb-lgog.jpg
   - Clash of Clans: https://b4uesports.com/wp-content/uploads/2025/10/logo.985ee45d-removebg-preview.png

## Error Handling

The email service includes comprehensive error handling:

1. Environment variable validation
2. SMTP transporter verification
3. Detailed logging for sent and failed emails
4. Error reporting to Vercel Logger

## Testing

To test the email system:

1. Ensure all environment variables are properly configured
2. Verify SMTP credentials are correct
3. Test each email function with sample data
4. Check email delivery and rendering on different email clients

## Maintenance

Regular maintenance tasks:

1. Update logo URLs if they change
2. Review and update disclaimer text as needed
3. Monitor email delivery logs
4. Update game logos as new games are added