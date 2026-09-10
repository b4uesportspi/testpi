# How to Call the Auth Endpoint

Based on your `main.ts` and `vercel.json` files, here's how to call the authentication endpoint:

## Endpoint Configuration

In your `vercel.json`, the auth endpoint is configured as:
```json
{
  "source": "/api/auth/pi",
  "destination": "/api/main.ts?path=auth/pi"
}
```

This means requests to `/api/auth/pi` are routed to the `handlePiAuth` function in `main.ts`.

## How to Call the Auth Endpoint

### From a Client Application

To authenticate with Pi Network, make a POST request to `/api/auth/pi`:

```javascript
// Example client-side code
async function authenticateWithPi(accessToken) {
  try {
    const response = await fetch('/api/auth/pi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken })
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    const data = await response.json();
    
    // Store the returned JWT token for future authenticated requests
    localStorage.setItem('authToken', data.token);
    
    return data.user;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

// Usage with Pi Network SDK
// After getting the access token from Pi Network SDK
const accessToken = "user_access_token_from_pi_network";
authenticateWithPi(accessToken)
  .then(user => {
    console.log('Authenticated user:', user);
  })
  .catch(error => {
    console.error('Authentication failed:', error);
  });
```

### Request Details

- **URL**: `/api/auth/pi`
- **Method**: POST
- **Headers**: 
  - `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "accessToken": "pi_network_access_token"
  }
  ```

### Response

The endpoint returns a JSON object with:

```json
{
  "user": {
    "id": "user_id",
    "piUID": "pi_network_uid",
    "username": "username",
    "email": "email@example.com",
    "phone": "phone_number",
    "country": "country_code",
    "language": "language_code",
    "walletAddress": "wallet_address",
    "gameAccounts": {},
    "referralCode": "referral_code",
    "isActive": true,
    "isProfileVerified": false,
    "tokens": 0,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  },
  "token": "jwt_token_for_session"
}
```

## Using the Auth Token

Once you have the JWT token, include it in the Authorization header for subsequent authenticated requests:

```javascript
// Example of making an authenticated request
async function getProfile() {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('/api/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get profile');
  }
  
  return await response.json();
}
```

## Authentication Flow

1. User authenticates with Pi Network SDK in your frontend
2. You receive an access token from Pi Network
3. Send this access token to `/api/auth/pi`
4. Server verifies the token with Pi Network API
5. Server creates/updates user in database
6. Server returns user data and a JWT token
7. Store the JWT token for future authenticated requests

This authentication flow allows your users to authenticate using their Pi Network credentials while maintaining a secure session with your server using JWT tokens.