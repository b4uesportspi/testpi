# Profile Editor & Social Media Services Analysis

## Overview
The codebase handles game accounts and social media services (like Netflix, Canva, YouTube, TikTok, etc.) through a unified profile edit modal. Here's what I found:

---

## 1. EDIT PROFILE COMPONENT

**File:** [client/src/components/profile-modal.tsx](client/src/components/profile-modal.tsx)

This is the main component for editing user profiles. It includes:
- Personal information (email, phone, country, language)
- Game account setup (PUBG, MLBB, COC, etc.)
- Social media services (YouTube, Facebook, Instagram, TikTok, Netflix, Canva)
- Profile picture upload

### Structure:
```tsx
const [formData, setFormData] = useState({
  email: '',
  country: 'BT',
  phone: '',
  language: 'en',
  gameAccounts: {
    pubg: { ign: '', uid: '' },
    pubgkr: { ign: '', uid: '' },
    mlbb: { userId: '', zoneId: '' },
    coc: { email: '' },
    robux: { email: '', whatsapp: '' },
    newstate: { email: '', whatsapp: '' },
    freefire: { playerId: '' }
  },
  socialAccounts: {
    tiktok: { email: '', password: '' },
    youtube: { link: '', email: '', password: '' },
    facebook: { link: '' },
    instagram: { link: '' },
    netflix: { email: '', whatsapp: '' },
    canva: { email: '', whatsapp: '' }
  },
  gamesPlayed: {
    pubg: false,
    pubgkr: false,
    mlbb: false,
    coc: false,
    robux: false,
    newstate: false,
    freefire: false,
    tiktok: false,
    youtube: false,
    facebook: false,
    instagram: false,
    netflix: false,
    canva: false
  }
});
```

---

## 2. GAME ACCOUNTS IMPLEMENTATION REFERENCE

### How Games Are Currently Handled

**Example: Mobile Legends (MLBB)**  
[profile-modal.tsx Lines 830-855](client/src/components/profile-modal.tsx#L830-L855)

```tsx
{formData.gamesPlayed.mlbb && (
  <div className="p-4 bg-muted rounded-lg border-2 border-blue-200 mb-4" data-testid="mlbb-account">
    <div className="flex items-center mb-4">
      <img src={GAME_LOGOS.MLBB} alt="Mobile Legends" className="w-8 h-8 mr-3" />
      <h4 className="text-lg font-semibold">Mobile Legends: Bang Bang</h4>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="mlbb-user-id-input">User ID</Label>
        <Input
          id="mlbb-user-id-input"
          value={formData.gameAccounts.mlbb.userId}
          onChange={(e) => handleGameAccountChange('mlbb', 'userId', e.target.value)}
          placeholder="Enter your User ID"
          className="font-mono"
          data-testid="mlbb-user-id"
          inputMode="numeric"
          pattern="[0-9]*"
        />
      </div>
      <div>
        <Label htmlFor="mlbb-zone-id-input">Zone ID</Label>
        <Input
          id="mlbb-zone-id-input"
          value={formData.gameAccounts.mlbb.zoneId}
          onChange={(e) => handleGameAccountChange('mlbb', 'zoneId', e.target.value)}
          placeholder="Enter your Zone ID"
          className="font-mono"
          data-testid="mlbb-zone-id"
          inputMode="numeric"
          pattern="[0-9]*"
        />
      </div>
    </div>
  </div>
)}
```

**Pattern:**
- Conditional rendering using `{formData.gamesPlayed.mlbb && ...}`
- Card with game logo and title
- Input fields for game-specific data
- Data-testid attributes for testing

### Other Game Examples:

**PUBG Mobile** [Lines 805-830](client/src/components/profile-modal.tsx#L805-L830)
- Fields: IGN (In-Game Name), UID (Player UID)
- Includes numeric validation

**Clash of Clans** [Lines 856-880](client/src/components/profile-modal.tsx#L856-L880)
- Field: Email (Supercell account email)
- Email validation included

**FREE FIRE** [Lines 926-950](client/src/components/profile-modal.tsx#L926-L950)
- Field: Player ID (numeric)

---

## 3. SOCIAL MEDIA SERVICES HANDLING

### Current Implementation

**Selection checkboxes for social services:**  
[Lines 699-745](client/src/components/profile-modal.tsx#L699-L745)

```tsx
<h4 className="text-sm font-semibold text-purple-700 mb-2">Social Media Services</h4>
<div className="flex items-center space-x-2 mt-2">
  <Checkbox
    id="tiktok-checkbox"
    checked={formData.gamesPlayed.tiktok}
    onCheckedChange={(checked) => handleGameSelectionChange('tiktok', !!checked)}
    data-testid="tiktok-checkbox"
  />
  <Label htmlFor="tiktok-checkbox" className="flex items-center">
    <img src={GAME_LOGOS.TIKTOK_COINS} alt="TikTok" className="w-6 h-6 mr-2" />
    TikTok
  </Label>
</div>
```

### Rendering Social Media Account Forms:

**TikTok** [Lines 969-987](client/src/components/profile-modal.tsx#L969-L987)
```tsx
{formData.gamesPlayed.tiktok && (
  <div className="p-4 bg-muted rounded-lg border-2 border-pink-200 mb-4" data-testid="tiktok-account">
    <div className="flex items-center mb-4">
      <img src={GAME_LOGOS.TIKTOK_COINS} alt="TikTok" className="w-8 h-8 mr-3" />
      <h4 className="text-lg font-semibold">TikTok</h4>
    </div>
    <div>
      <Label htmlFor="tiktok-username-input">Username</Label>
      <Input
        id="tiktok-username-input"
        value={formData.gameAccounts.tiktok.username}
        onChange={(e) => handleGameAccountChange('tiktok', 'username', e.target.value)}
        placeholder="@yourusername"
        data-testid="tiktok-username"
      />
    </div>
  </div>
)}
```

**YouTube** [Lines 989-1010](client/src/components/profile-modal.tsx#L989-L1010)
```tsx
{formData.gamesPlayed.youtube && (
  <div className="p-4 bg-muted rounded-lg border-2 border-red-200 mb-4" data-testid="youtube-account">
    <div className="flex items-center mb-4">
      <img src={GAME_LOGOS.YOUTUBE_SUBS} alt="YouTube" className="w-8 h-8 mr-3" />
      <h4 className="text-lg font-semibold">YouTube</h4>
    </div>
    <div>
      <Label htmlFor="youtube-channel-url-input">Channel URL or Handle</Label>
      <Input
        id="youtube-channel-url-input"
        value={formData.gameAccounts.youtube.channelUrl}
        onChange={(e) => handleGameAccountChange('youtube', 'channelUrl', e.target.value)}
        placeholder="youtube.com/@yourchannel or @yourchannel"
        data-testid="youtube-channel-url"
      />
    </div>
  </div>
)}
```

**Facebook** [Lines 1012-1032](client/src/components/profile-modal.tsx#L1012-L1032)
**Instagram** [Lines 1034-1053](client/src/components/profile-modal.tsx#L1034-L1053)

---

## 4. THE BLANK PAGE ISSUE - ROOT CAUSE FOUND ⚠️

### **NETFLIX & CANVA HAVE NO UI RENDERING**

**In Form State:** [Lines 48-62](client/src/components/profile-modal.tsx#L48-L62)
```tsx
socialAccounts: {
  tiktok: { email: '', password: '' },
  youtube: { link: '', email: '', password: '' },
  facebook: { link: '' },
  instagram: { link: '' },
  netflix: { email: '', whatsapp: '' },      // ← Defined in state
  canva: { email: '', whatsapp: '' }         // ← Defined in state
},
gamesPlayed: {
  // ... other games
  netflix: false,               // ← Defined in gamesPlayed
  canva: false                  // ← Defined in gamesPlayed
}
```

**In Checkbox Selection:** [Lines 75-76 (initialization)](client/src/components/profile-modal.tsx#L147-L148)
```tsx
netflix: !!(user.socialAccounts?.netflix?.email || user.socialAccounts?.netflix?.whatsapp),
canva: !!(user.socialAccounts?.canva?.email || user.socialAccounts?.canva?.whatsapp)
```

**BUT... NO CONDITIONAL RENDERING:**
- Netflix checkbox NOT shown in the "Social Media Services" section
- Canva checkbox NOT shown in the "Social Media Services" section
- NO `{formData.gamesPlayed.netflix && ...}` rendering block
- NO `{formData.gamesPlayed.canva && ...}` rendering block

### Consequence:
If Netflix or Canva were somehow selected, the form would show:
- ✅ The checkbox remains checked
- ✅ Form state is ready to save the data
- ✅ But NO INPUT FIELDS appear → **BLANK PAGE/SECTION**

---

## 5. HOW GAME SELECTION WORKS

**handleGameSelectionChange Function:** [Lines 374-428](client/src/components/profile-modal.tsx#L374-L428)

```tsx
const handleGameSelectionChange = (game: 'pubg' | 'pubgkr' | 'mlbb' | ... | 'instagram', checked: boolean) => {
  console.log(`Game selection changed: ${game} = ${checked}`);
  setFormData(prev => {
    const updatedData = {
      ...prev,
      gamesPlayed: {
        ...prev.gamesPlayed,
        [game]: checked
      }
    };
    
    // If game is unchecked, clear the game account data for that game
    if (!checked) {
      if (game === 'pubg') {
        updatedData.gameAccounts.pubg = { ign: '', uid: '' };
      } else if (game === 'tiktok') {
        updatedData.gameAccounts.tiktok = { username: '' };
      }
      // ... clears data for each game
    }
    
    return updatedData;
  });
};
```

**Missing in handleGameSelectionChange:**
- No clearance logic for Netflix
- No clearance logic for Canva

---

## 6. DASHBOARD INTEGRATION

**File:** [client/src/pages/dashboard.tsx](client/src/pages/dashboard.tsx)

### Opens profile modal:
[Lines 30-36](client/src/pages/dashboard.tsx#L30-L36)
```tsx
import ProfileModal from '@/components/profile-modal';
```

### Button to trigger edit:
[Dashboard shows "Edit Profile" button that opens ProfileModal](client/src/pages/dashboard.tsx)
```tsx
<Button 
  onClick={() => setIsProfileModalOpen(true)}
  className="w-full bg-gradient-to-r from-purple-600 to-pink-600..."
  data-testid="button-edit-profile"
>
  <i className="fas fa-user mr-2"></i>
  <span className="font-bold">Edit Profile</span>
</Button>
```

---

## 7. SUPPORTING SERVICES

### Email Service (sends profile update confirmations)
**File:** [server/services/email.ts](server/services/email.ts)

Shows how game/social account data is rendered in emails:
```ts
// Netflix rendering in emails [Lines 469-471]
${params.profileData.socialAccounts?.netflix && (params.profileData.socialAccounts.netflix.email || params.profileData.socialAccounts.netflix.whatsapp) ? `
<img src="${GAME_IMAGES.NETFLIX}" alt="Netflix" width="80" height="80" ...>
` : ''}
```

### Backend Profile Handler
**File:** [api/main.ts](api/main.ts#L1757) or [api/main-clean.ts](api/main-clean.ts#L392-L553)

Handles profile updates with gameAccounts and socialAccounts data.

---

## 8. KEY DATA STRUCTURES

### Form Data Flow:
```
User Component (user context)
    ↓
ProfileModal - Initialize from user data
    ↓
formData State (contains all game & social accounts)
    ↓
handleGameSelectionChange (toggle gamesPlayed)
    ↓
Conditional Rendering ({formData.gamesPlayed.game && ...})
    ↓
handleGameAccountChange (update specific account data)
    ↓
handleSubmit (validate & send PUT /api/profile)
```

### Validation in handleSubmit:
[Lines 264-360](client/src/components/profile-modal.tsx#L264-L360)
- Email must be Gmail address
- Game UIDs must be numeric
- MLBB Zone ID must be numeric
- COC Email must be valid email format

---

## 9. SUMMARY TABLE

| Component | Status | Location | Has UI? | Notes |
|-----------|--------|----------|---------|-------|
| PUBG Mobile | ✅ Complete | profile-modal.tsx #805-830 | Yes | IGN + UID |
| PUBG KR | ✅ Complete | profile-modal.tsx #832-855 | Yes | IGN + UID |
| Mobile Legends | ✅ Complete | profile-modal.tsx #857-882 | Yes | UserID + ZoneID |
| Clash of Clans | ✅ Complete | profile-modal.tsx #884-905 | Yes | Email |
| Roblox | ✅ Complete | profile-modal.tsx #907-928 | Yes | Username |
| NEW STATE | ✅ Complete | profile-modal.tsx #930-949 | Yes | Character ID |
| FREE FIRE | ✅ Complete | profile-modal.tsx #951-968 | Yes | Player ID |
| TikTok | ✅ Complete | profile-modal.tsx #970-988 | Yes | Username |
| YouTube | ✅ Complete | profile-modal.tsx #990-1010 | Yes | Channel URL |
| Facebook | ✅ Complete | profile-modal.tsx #1012-1032 | Yes | Profile URL |
| Instagram | ✅ Complete | profile-modal.tsx #1034-1053 | Yes | Username |
| Netflix | ⚠️ Partial | socialAccounts state | **NO** | 🔴 **BLANK PAGE ISSUE** |
| Canva | ⚠️ Partial | socialAccounts state | **NO** | 🔴 **BLANK PAGE ISSUE** |

---

## 10. RECOMMENDATIONS

### Fix the Blank Page Issue:
Add checkbox + conditional rendering for Netflix and Canva in profile-modal.tsx:

1. **Add to checkbox section** (after Instagram checkbox)
2. **Add clearing logic** to handleGameSelectionChange for netflix/canva
3. **Add conditional rendering blocks** with input fields like other services

Example pattern:
```tsx
// Add checkbox
<div className="flex items-center space-x-2 mt-2">
  <Checkbox
    id="netflix-checkbox"
    checked={formData.gamesPlayed.netflix}
    onCheckedChange={(checked) => handleGameSelectionChange('netflix', !!checked)}
    data-testid="netflix-checkbox"
  />
  <Label htmlFor="netflix-checkbox" className="flex items-center">
    <img src={GAME_LOGOS.NETFLIX} alt="Netflix" className="w-6 h-6 mr-2" />
    Netflix
  </Label>
</div>

// Add rendering block in Game Accounts section
{formData.gamesPlayed.netflix && (
  <div className="p-4 bg-muted rounded-lg border-2 border-red-200 mb-4" data-testid="netflix-account">
    <div className="flex items-center mb-4">
      <img src={GAME_LOGOS.NETFLIX} alt="Netflix" className="w-8 h-8 mr-3" />
      <h4 className="text-lg font-semibold">Netflix</h4>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="netflix-email-input">Email</Label>
        <Input
          id="netflix-email-input"
          value={formData.socialAccounts.netflix.email}
          onChange={(e) => handleGameAccountChange('netflix', 'email', e.target.value)}
          placeholder="your-email@gmail.com"
          data-testid="netflix-email"
        />
      </div>
      <div>
        <Label htmlFor="netflix-whatsapp-input">WhatsApp (Optional)</Label>
        <Input
          id="netflix-whatsapp-input"
          value={formData.socialAccounts.netflix.whatsapp}
          onChange={(e) => handleGameAccountChange('netflix', 'whatsapp', e.target.value)}
          placeholder="+92 XXX XXXXXXX"
          data-testid="netflix-whatsapp"
        />
      </div>
    </div>
  </div>
)}
```
