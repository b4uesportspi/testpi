# Quick Debugging Reference

## If Packages Still Don't Show

### 1. Check Browser Console
Open DevTools (F12) → Console tab

You should see:
```
=== PACKAGE FILTERING DEBUG START ===
All packages: [Array of 53 packages]
Total packages count: 53
Package details:
  [0] ID: ..., Game: "PUBG", Name: "...", isActive: true
  [1] ID: ..., Game: "MLBB", Name: "...", isActive: true
  ...
  [15] ID: ..., Game: "TIKTOK_COINS", Name: "100 TikTok Coins", isActive: true
  [16] ID: ..., Game: "TIKTOK_COINS", Name: "500 TikTok Coins", isActive: true
  [17] ID: ..., Game: "TIKTOK_COINS", Name: "1000 TikTok Coins", isActive: true

Normalize function debug:
[
  {original: "PUBG", normalized: "PUBG", isNull: false, isEmpty: false},
  ...
  {original: "TIKTOK_COINS", normalized: "TIKTOK_COINS", isNull: false, isEmpty: false},
]

TikTok Coins packages: [Array of 3]
TikTok Followers packages: [Array of 3]
TikTok Views packages: [Array of 3]
...
```

### 2. Check Server Logs
You should see:
```
Packages endpoint: Found 53 active packages
Package: ID=..., Name=100 TikTok Coins, Game="TIKTOK_COINS", Active=true, Type=string
Packages endpoint: TikTok Coins=3, TikTok Followers=3, TikTok Views=3
Packages endpoint: Returning 53 packages
Packages endpoint: TikTok Coins in response: 3
```

### 3. Run Diagnostic
```bash
node diagnose-packages.cjs
```

Should show all 13 game types including TIKTOK_COINS, TIKTOK_FOLLOWERS, TIKTOK_VIEWS

### 4. Check Database Directly (if needed)
```bash
# Login to your database with psql or your DB client
SELECT game, COUNT(*) FROM app_packages GROUP BY game ORDER BY game;

# Should include:
TIKTOK_COINS | 3
TIKTOK_FOLLOWERS | 3
TIKTOK_VIEWS | 3
```

## Common Issues and Solutions

### "Still showing blank TikTok section"
- ✅ Refresh browser (Ctrl+Shift+R for hard refresh)
- ✅ Clear browser cache
- ✅ Check browser console for errors
- ✅ Verify server is running and responsive
- ✅ Run `diagnose-packages.cjs` to confirm DB has packages

### "Console shows 0 TikTok packages"
- Run `node diagnose-packages.cjs` to verify DB
- If DB shows 0: Run `node insert-tiktok-packages.cjs` again
- Check that `is_active = true` in database

### "Packages load but no TikTok section visible"
- Check that game field exactly matches: `TIKTOK_COINS` (all caps, with underscore)
- Verify `isActive: true` in API response
- Check browser console for any JavaScript errors

## Verification Checklist

- [ ] Run `node diagnose-packages.cjs` shows 13 game types
- [ ] TIKTOK_COINS count shows 3 packages
- [ ] Browser console shows packages array with 53+ items
- [ ] Browser console shows TikTok Coins packages: [Array(3)]
- [ ] TikTok Services section visible on dashboard
- [ ] Can see all 3 TikTok Coins packages displayed
- [ ] Can click "Purchase" on TikTok packages

## Files to Run

### Insert/Verify Data
```bash
# Insert TikTok packages
node insert-tiktok-packages.cjs

# Insert all social media packages
node insert-social-media-packages.cjs

# Verify all packages are in database
node diagnose-packages.cjs
```

### Debug Logs Location
- **Browser Console**: Shows package filtering details
- **Server Console**: Shows API endpoint logs
- Look for: `=== PACKAGE FILTERING DEBUG START ===`
- Look for: `Packages endpoint: Found X active packages`

---

**Quick Fix:** If something breaks, always:
1. Check browser console (F12)
2. Check server logs
3. Run `node diagnose-packages.cjs`
4. Verify package counts match
