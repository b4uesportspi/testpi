# EmailJS Template Fix Instructions

## Issue Description

The EmailJS templates are showing test data instead of actual user information because they are not properly configured to use the dynamic parameters sent from the application.

## Root Cause

The EmailJS templates contain hardcoded test values instead of dynamic placeholders that use the parameters sent from the application.

## Solution

You need to update your EmailJS templates in the EmailJS dashboard to use dynamic placeholders instead of hardcoded test data.

## EmailJS Template Update Instructions

### 1. Admin Purchase Notification Template

1. Log in to your EmailJS dashboard at https://dashboard.emailjs.com/
2. Navigate to the "Email Templates" section
3. Find the template used for admin purchase notifications
4. Replace the static HTML content with dynamic placeholders:

Instead of hardcoded values like:
```html
<tr>
  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer Username:</strong></td>
  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">Test User</td>
</tr>
```

Use dynamic placeholders like:
```html
<tr>
  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer Username:</strong></td>
  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{customer_username}}</td>
</tr>
```

### 2. Complete Template Parameters

The application sends the following parameters for admin purchase notifications:
- `{{admin_email}}` - Admin's email address
- `{{customer_username}}` - Customer's username
- `{{customer_email}}` - Customer's email address
- `{{customer_phone}}` - Customer's phone number
- `{{purchased_package_name}}` - Name of the purchased package
- `{{purchased_game}}` - Game name
- `{{in_game_amount_value}}` - In-game amount
- `{{paid_pi_amount}}` - Amount paid in Pi
- `{{paid_usd_amount}}` - Amount paid in USD
- `{{customer_game_account}}` - Customer's game account
- `{{transaction_identifier}}` - Transaction ID
- `{{payment_identifier}}` - Payment ID
- `{{blockchain_txid}}` - Blockchain transaction ID

### 3. Template Settings

In the EmailJS template settings, make sure to:
1. Set the "To email" field to `{{admin_email}}`
2. Set the "From name" field to `{{from_name}}`
3. Set the "Subject" field to something like `New Purchase - {{customer_username}} - {{purchased_package_name}} - B4U Esports`

## Verification

After updating the EmailJS template:
1. Make a test purchase
2. Check that the admin receives an email with actual user data instead of test data
3. Verify all fields show the correct information

## Additional Notes

- The same principle applies to all EmailJS templates (purchase confirmation, profile update, etc.)
- Always use the double curly brace syntax `{{parameter_name}}` for dynamic placeholders
- Never use hardcoded test values in production EmailJS templates
- The application is already sending the correct parameters; the issue is solely with the EmailJS template configuration