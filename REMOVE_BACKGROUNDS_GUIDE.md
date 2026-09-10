# Remove Package Image Backgrounds - Quick Guide

## Images to Process

Remove backgrounds from these package images:
1. **TikTok Coins**: `client/public/images/tiktok-coins-package.png`
2. **Netflix**: `client/public/images/netflix-logo.png`
3. **Canva**: `client/public/images/canva-logo.png`

## Option 1: Using Automated Script (Recommended)

### Step 1: Install the background removal library

```bash
npm install @imgly/background-removal
```

### Step 2: Run the automated script

```bash
npm run remove-backgrounds
```

The script will:
- Process all 3 images automatically
- Create new files with `-nobg` suffix
- Show progress for each image
- Provide a summary when done

### Step 3: Review and Replace

After the script completes:
1. Check the new `-nobg.png` files
2. If satisfied, either:
   - Replace original files manually, OR
   - Update the code references to use the new files

### Step 4: Commit to GitHub

```bash
git add client/public/images/*.png
git commit -m "feat: Remove backgrounds from TikTok Coins, Netflix, and Canva package images"
git push origin main
```

---

## Option 2: Manual Removal (Free Online Tools)

### Using Remove.bg:

1. Go to https://www.remove.bg/
2. Upload each image one by one:
   - `tiktok-coins-package.png`
   - `netflix-logo.png`
   - `canva-logo.png`
3. Download the PNG versions with transparent backgrounds
4. Replace the original files in `client/public/images/`
5. Commit and push to GitHub

### Using Adobe Express:

1. Go to https://www.adobe.com/express/feature/image/remove-background
2. Upload each image
3. Download transparent PNG
4. Replace originals
5. Commit changes

---

## After Background Removal

### Update Image References in Code (if needed):

If you created new files (e.g., `tiktok-coins-package-nobg.png`), update the references:

**File**: `client/src/pages/dashboard.tsx` or wherever packages are defined

Change from:
```typescript
image: '/images/tiktok-coins-package.png'
```

To:
```typescript
image: '/images/tiktok-coins-package-nobg.png'
```

### Test in Development:

```bash
npm run dev
```

Check that the images display correctly with transparent backgrounds.

### Deploy to Production:

Once satisfied, the changes will automatically deploy when you push to GitHub main branch.

---

## Need Help?

If the automated script fails:
- Make sure you have Node.js 16+ installed
- Try the manual online tools (Option 2)
- Check that the image files exist in the correct path
