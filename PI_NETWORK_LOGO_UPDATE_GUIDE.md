# Pi Network Logo Update Guide

## Overview
This guide outlines the steps needed to update your B4U Esports application to use the official Pi Network logo for full trademark compliance.

## Files That Need Updates

### 1. Constants File
**File:** `client/src/lib/constants.ts`
**Current Line:**
```typescript
PI: "" // TODO: Replace with actual official Pi Network logo URL
```

**Action:** Replace the URL with the actual official Pi Network logo URL.

### 2. Email Service File
**File:** `server/services/email.ts`
**Instances:** 3 occurrences with TODO comments
**Action:** Replace all instances of the current URL with the official Pi Network logo URL.

### 3. HTML Template Files
**File:** `UNIFIED_ORDER_CONFIRMATION_TEMPLATE_COMPLETE.html`
**Line:** 146
**Action:** Replace the current URL with the official Pi Network logo URL.

### 4. EmailJS Template Documentation Files
**Files:**
- `EMAILJS_ALL_TEMPLATES_CONFIGURATION.md` (2 instances)
- `EMAILJS_TEMPLATE_CONFIGURATION.md` (1 instance)
- `EMAILJS_TEMPLATE_UPDATE_GUIDE.md` (3 instances)

**Action:** Replace all instances of the current URL with the official Pi Network logo URL.

## Official Pi Network Logo
To get the official Pi Network logo:

1. Visit the official Pi Network website or developer portal
2. Look for the official brand assets or logo kit
3. Download the appropriate logo format (typically PNG or SVG)
4. Upload it to your server or use the official CDN URL if available

## Implementation Steps

1. **Obtain the Official Logo:**
   - Download the official Pi Network logo from their official resources
   - Ensure you're using the correct version for your use case

2. **Upload to Your Server:**
   - Upload the logo to your server at an appropriate location
   - Or use the official CDN URL if available

3. **Update All References:**
   - Replace all instances of the current logo URL with the official one
   - Remove the TODO comments after updating

4. **Verify Implementation:**
   - Check all pages where the logo appears
   - Test email templates to ensure the logo displays correctly
   - Verify the logo appears correctly on all devices and screen sizes

## Compliance Notes

- Ensure the logo is used in its original form without modifications
- Follow Pi Network's brand guidelines for sizing and spacing
- Maintain proper attribution with the trademark symbol (™ or ®)
- Do not use the logo in a way that implies endorsement beyond your partnership

## Verification

After updating, verify that:

1. The landing page displays the official Pi Network logo correctly
2. The footer displays the official Pi Network logo correctly
3. All email templates display the official Pi Network logo correctly
4. The "About Us" and "Our History" pages display the official Pi Network logo correctly
5. All trademark attributions are still present and correct

This update will ensure your application is fully compliant with Pi Network's trademark guidelines.