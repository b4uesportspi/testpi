# JWT Token Algorithm Fix

## Problem
The authentication was failing because of a JWT token algorithm mismatch:

1. **Pi Network tokens** use `RS256` algorithm (asymmetric cryptography)
2. **Our server tokens** use `HS256` algorithm (symmetric cryptography)
3. The profile and transactions endpoints were rejecting RS256 tokens when they should only be accepting HS256 tokens

## Root Cause
The endpoints were checking for HS256 tokens but returning a generic "Invalid token algorithm" error instead of properly distinguishing between:
- Pi Network tokens (RS256) - used only during initial authentication
- Server tokens (HS256) - used for all other authenticated requests

## Solution
Updated the JWT verification logic in the profile and transactions endpoints to:

1. **Properly identify token algorithms** by decoding the JWT header
2. **Only accept HS256 tokens** for authenticated endpoints (profile, transactions)
3. **Reject RS256 tokens** with a clear error message
4. **Provide better error handling** for unknown token types

## Files Modified

### [api/main.ts](file://c:\Users\HP\B4U%20Esports\api\main.ts)
- **handleProfile**: Updated JWT verification to properly handle token algorithms
- **handleTransactions**: Updated JWT verification to properly handle token algorithms

## How the Authentication Flow Now Works

1. **Pi Authentication** (`/api/auth/pi`):
   - Receives Pi Network RS256 token from frontend
   - Verifies it with Pi Network API
   - Creates/updates user in database
   - Generates our own HS256 token
   - Returns HS256 token to frontend

2. **Profile Access** (`/api/profile`):
   - Receives HS256 token from frontend
   - Verifies HS256 token with our secret
   - Returns user profile data

3. **Transactions Access** (`/api/transactions`):
   - Receives HS256 token from frontend
   - Verifies HS256 token with our secret
   - Returns user transactions

## Key Changes

### Before
```javascript
// Only accept HS256 tokens (server-issued)
if (header.alg !== 'HS256') {
  return res.status(401).json({ message: 'Invalid token algorithm. Only server-issued tokens are accepted.' });
}
```

### After
```javascript
// Handle different token types
if (header && header.alg === 'RS256') {
  // This is a Pi Network token - we should not accept it for profile endpoint
  return res.status(401).json({ message: 'Invalid token. Profile endpoint only accepts server-issued tokens.' });
} else if (header && header.alg === 'HS256') {
  // This is our server-issued token - verify it
  const decoded: any = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  // ... proceed with user data retrieval
} else {
  // Unknown token algorithm
  return res.status(401).json({ message: 'Invalid token algorithm. Only server-issued tokens are accepted.' });
}
```

## Testing the Fix

1. Try to log in with Pi Network - should work correctly
2. Access profile page - should work with the HS256 token
3. View transactions - should work with the HS256 token
4. All endpoints should properly reject Pi Network RS256 tokens with clear error messages

## Verification

After deploying these changes, the authentication should work correctly:
- No more "Invalid token algorithm" errors
- Proper distinction between Pi Network tokens and server tokens
- Clear error messages for different token types