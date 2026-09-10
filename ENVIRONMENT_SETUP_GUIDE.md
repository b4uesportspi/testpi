# Environment Setup Guide - Sandbox/Testnet Deployment

## 🚨 CRITICAL ISSUES FIXED

This guide addresses the root causes of the authentication and email delivery failures in **Pi Testnet (Sandbox)** environment:

### Issue 1: SMTP Credentials Not Loaded
- **Problem**: SMTP showing `user: 'NOT SET'` and `pass: 'NOT SET'` causing email delivery failure
- **Root Cause**: `dotenv.config()` called in `server/services/email.ts` BEFORE environment variables are set
- **Fix**: Removed duplicate `dotenv.config()` - relies on main API to load environment first

### Issue 2: dotenv Loading Order Conflicts
- **Problem**: Multiple files calling `dotenv.config()` causing race conditions
- **Root Cause**: Both `api/main.ts` and `server/services/email.ts` loading dotenv independently
- **Fix**: Single `dotenv.config()` in `api/main.ts` only; email service uses already-loaded variables

### Issue 3: Missing Environment Variable Validation
- **Problem**: No visibility into which environment is loaded or which variables are missing
- **Fix**: Enhanced logging to show environment status and missing variables

---

## ✅ SETUP INSTRUCTIONS FOR PI TESTNET (SANDBOX)

### Step 1: Use Sandbox Environment Configuration

Use `.env.sandbox` for Pi testnet:

```bash
# Copy sandbox config
cp .env.sandbox .env
```

Or manually set these in `.env`:

#### Database Configuration (Sandbox)
```
DATABASE_URL=postgresql://user:password@host:6543/database?sslmode=require
```

#### SMTP Email Configuration
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=info@b4uesports.com
SMTP_PASS="your-password-here"
SMTP_FROM=info@b4uesports.com
SMTP_FROM_NAME=B4U Esports
```

#### Pi Network Configuration (Sandbox/Testnet)
```
PI_SERVER_API_KEY=your-pi-server-api-key-here
PI_SANDBOX_MODE=true
```

#### Authentication Keys
```
JWT_SECRET=esports-pi-market-jwt-secret-key-2026-production
SESSION_SECRET=esports-pi-market-session-secret-key-2026-production
MARKETING_EMAIL_SECRET=your-marketing-email-secret-here
```

#### Other Configuration
```
ADMIN_EMAIL=info@b4uesports.com
NETWORK=TESTNET
APP_URL=http://localhost:3000
NODE_ENV=development
```

### Step 2: Verify .env File Is Loaded

Run the diagnostic command:

```bash
npm run diagnose:env
```

You should see:
```
✅ All critical environment variables are set!
📍 Current Environment: development
✅ DATABASE_URL - 🔵 SANDBOX
✅ SMTP_HOST - SET
✅ SMTP_USER - SET
✅ SMTP_PASS - SET (XX chars)
```

### Step 3: Start the Development Server

```bash
npm run dev
```

Monitor the logs for:
```
🚀 API Initializing - Database Environment Check:
  DATABASE_URL Status: ✅ SET
  Database Host: aws-1-ap-southeast-2.pooler.supabase.com
  Environment Detected: 🔵 SANDBOX (thrdctlweqztqjbtdirj)
  Node Environment: development

✅ API Database pool created
🔐 Configuring SSL for PostgreSQL connection
✅ SMTP transporter is ready to send emails
```

---

## 🔍 TROUBLESHOOTING

### ❌ "Error: authentication failed: (reason unavailable)"
**SMTP Authentication Error**

**Solution**:
1. Verify `SMTP_PASS` is exactly correct (special characters matter!)
2. Check `.env` file has `SMTP_USER` and `SMTP_PASS` set
3. Run diagnostic:
   ```bash
   npm run diagnose:env
   ```
4. If still failing, test SMTP directly:
   ```bash
   npm run test:smtp-config
   ```

### ❌ "(ENOTFOUND) tenant/user postgres.thrdctlweqztqjbtdirj"
**Database Connection Error**

**Solution**:
1. Verify DATABASE_URL in `.env` includes sandbox credentials
2. Check `.env` has `DATABASE_URL` set
3. Verify Supabase database is running:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Check database status
4. Test connection:
   ```bash
   npm run test:db
   ```

### ❌ "dotenv module not found"
**Module Loading Error**

**Solution**:
```bash
# Install dependencies
npm install

# Or if using yarn
yarn install
```

### ❌ Environment variables showing as "NOT SET"
**Variables Not Loading**

**Solution**:
1. Verify `.env` file exists in project root:
   ```bash
   ls -la | grep .env
   ```
2. Verify format (no quotes around values):
   ```
   # ✅ CORRECT
   SMTP_USER=info@b4uesports.com
   
   # ❌ WRONG
   SMTP_USER="info@b4uesports.com"
   ```
3. Restart dev server after changing `.env`

---

## 📋 QUICK VERIFICATION CHECKLIST

```bash
# 1. Check all environment variables are loaded
npm run diagnose:env

# 2. Test SMTP connectivity
npm run test:smtp-simple

# 3. Test database connectivity
npm run test:db

# 4. Test Pi authentication
npm run test:pi-config

# 5. Test email sending
npm run test:email-service
```

---

## 📁 File Structure

- `.env.sandbox` - Sandbox environment template
- `.env.production` - Production environment template  
- `.env` - Local environment (created from template, git-ignored)
- `api/main.ts` - Main API handler with dotenv.config() call
- `server/services/email.ts` - Email service using pre-loaded env vars
- `scripts/diagnose-environment.cjs` - Environment diagnostic tool

---

## 🔐 Important Notes

- **.env files are git-ignored** - Never commit credentials
- **dotenv.config() should only be called once** - in the main entry point
- **All modules share the same process.env** - Once loaded, all files have access
- **Order matters** - Load environment BEFORE importing modules that use it

---

## 🚀 DEPLOYMENT FLOW

```
1. .env.sandbox copied to .env
   ↓
2. npm run dev started
   ↓
3. api/main.ts calls dotenv.config()
   ↓
4. Environment variables loaded into process.env
   ↓
5. Database pool created with correct credentials
   ↓
6. Email service uses process.env (already loaded)
   ↓
7. All services work with correct environment
```

---

## 📚 Related Files

- [api/main.ts](api/main.ts) - API endpoint with environment initialization
- [server/services/email.ts](server/services/email.ts) - Email service
- [.env.sandbox](.env.sandbox) - Sandbox environment template
- [scripts/diagnose-environment.cjs](scripts/diagnose-environment.cjs) - Diagnostic tool

---

**Last Updated**: 2026-05-07  
**Target Environment**: Pi Testnet (Sandbox)  
**Status**: Active Development Guide

