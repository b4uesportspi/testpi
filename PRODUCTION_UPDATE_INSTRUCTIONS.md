# 🚀 Quick Production Database Update

## The Problem
The 0.06 UC package is still showing as `isActive: true` on your production site.

## ✅ Solution - Run This SQL in Vercel Dashboard

### Option 1: Via Vercel Storage UI (Easiest)

1. Go to **https://vercel.com/dashboard**
2. Click on your **B4U Esports** project
3. Click **"Storage"** tab
4. Click on your PostgreSQL database
5. Look for **"Query"** or **"SQL Editor"** button
6. Paste and run this SQL:

```sql
-- Deactivate 0.06 UC package
UPDATE packages 
SET "isActive" = false, "updatedAt" = NOW() 
WHERE name = '0.06 UC' AND game = 'PUBG';

-- Verify the change
SELECT id, name, game, "isActive", "updatedAt"
FROM packages
WHERE name = '0.06 UC' AND game = 'PUBG';
```

7. You should see the result showing `"isActive": false`
8. Done! The package will disappear from your website immediately.

---

### Option 2: Via Vercel CLI

If you have Vercel CLI installed:

```bash
# Login to Vercel
vercel login

# Link to your project
vercel link

# Pull environment variables
vercel env pull

# Now run the update script
node update-production-database.js
```

---

### Option 3: Manual Connection

If you have access to your Vercel PostgreSQL connection string:

1. Copy your `DATABASE_URL` from Vercel dashboard
2. Create a `.env` file:
   ```
   DATABASE_URL=your-database-url-here
   ```
3. Run:
   ```bash
   node update-production-database.js
   ```

---

## ✅ Expected Result

After running the update, check:
https://b4uesportstest.vercel.app/api/packages

You should see:
```json
{
  "name": "0.06 UC",
  "game": "PUBG",
  "isActive": false,  // ← Changed from true to false
  ...
}
```

The package will no longer appear in your shop!

---

## 📞 Need Help?

If you can't find the database access in Vercel:
1. Check Vercel docs: https://vercel.com/docs/storage
2. Or contact me with your Vercel project access and I'll do it directly

