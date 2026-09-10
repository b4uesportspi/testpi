# Profile Update Email Configuration

This document explains how the profile update email functionality has been configured to use separate EmailJS credentials.

## Configuration Details

The profile update emails now use separate EmailJS credentials from the purchase confirmation emails:

- **Service ID**: `37252420_email_23005144`
- **Template ID**: `template_bbgjisn`
- **Public Key**: `HbJXpQWPUUo1O6bdF`
- **Private Key**: `_AoKoVd8oZgIDkwkSFv6u`

## Environment Variables

The following environment variables have been added to the [.env](file:///c:/Users/HP/B4U%20Esports/.env) file:

```env
# EmailJS for Profile Updates - Separate credentials for profile update emails
EMAILJS_PROFILE_SERVICE_ID=37252420_email_23005144
EMAILJS_PROFILE_TEMPLATE_ID=template_bbgjisn
EMAILJS_PROFILE_PRIVATE_KEY=_AoKoVd8oZgIDkwkSFv6u
EMAILJS_PROFILE_PUBLIC_KEY=HbJXpQWPUUo1O6bdF
```

## Implementation

The [sendProfileUpdateEmail](file:///c:/Users/HP/B4U%20Esports/server/services/email.ts#L223-L313) function in [server/services/email.ts](file:///c:/Users/HP/B4U%20Esports/server/services/email.ts) has been updated to use these separate credentials:

1. New constants were added for profile-specific EmailJS configuration:
   ```typescript
   const EMAILJS_PROFILE_SERVICE_ID = process.env.EMAILJS_PROFILE_SERVICE_ID || 'your-service-id';
   const EMAILJS_PROFILE_TEMPLATE_ID = process.env.EMAILJS_PROFILE_TEMPLATE_ID || 'your-template-id';
   const EMAILJS_PROFILE_PUBLIC_KEY = process.env.EMAILJS_PROFILE_PUBLIC_KEY || 'your-public-key';
   const EMAILJS_PROFILE_PRIVATE_KEY = process.env.EMAILJS_PROFILE_PRIVATE_KEY || undefined;
   ```

2. The function now checks for profile-specific environment variables:
   ```typescript
   if (!process.env.EMAILJS_PROFILE_SERVICE_ID || !process.env.EMAILJS_PROFILE_TEMPLATE_ID || !process.env.EMAILJS_PROFILE_PUBLIC_KEY) {
     // Handle missing configuration
   }
   ```

3. The EmailJS send function uses the profile-specific credentials:
   ```typescript
   await emailjs.send(
     EMAILJS_PROFILE_SERVICE_ID!,
     EMAILJS_PROFILE_TEMPLATE_ID!,
     templateParams,
     {
       publicKey: EMAILJS_PROFILE_PUBLIC_KEY!,
       privateKey: EMAILJS_PROFILE_PRIVATE_KEY // if available
     }
   );
   ```

## Testing

A test script [test-profile-email.ts](file:///c:/Users/HP/B4U%20Esports/test-profile-email.ts) has been created to verify the profile update email functionality.

## EmailJS Template Configuration

When configuring the EmailJS template (`template_bbgjisn`), ensure that:
1. The "To email" field is set to `{{to_email}}`
2. The template includes appropriate placeholders for the profile data
3. The subject line is properly configured

This configuration ensures that profile update confirmation emails are sent to users only, using the separate EmailJS service as requested.