# Wallet Integration Documentation

This document provides detailed information about the wallet integration feature in the B4U Esports marketplace.

## Overview

The wallet integration feature allows users to view their actual Pi wallet balances directly in the dashboard. This is achieved by integrating with the Stellar Horizon API, which Pi Network is built on.

## How It Works

### 1. Wallet Address Extraction
- After a user completes their first purchase, the wallet address is automatically extracted from the payment details
- The wallet address is stored in the user's profile in the database
- Users can also manually connect their wallet using the "Connect Wallet" button

### 2. Balance Fetching
- The system uses the Stellar Horizon API endpoint `https://api.mainnet.minepi.com/accounts/{walletAddress}` to fetch account details
- The native Pi balance is extracted from the account's balance array where `asset_type` is 'native'
- The balance is displayed in the dashboard UI in real-time

### 3. UI Integration
- Wallet balance is displayed in the dashboard header notification
- Wallet balance is shown in the user statistics card
- Loading states and error handling are implemented for a smooth user experience

## API Endpoints

### GET `/api/user/balance`
Fetches the user's Pi wallet balance from the Stellar Horizon API.

**Authentication**: Required (JWT token in Authorization header)

**Response**:
```json
{
  "message": "Wallet balance fetched successfully",
  "balance": 125.50,
  "walletAddress": "GABC123..."
}
```

**Error Responses**:
- 401: No token provided or invalid token
- 404: User not found or no wallet address found
- 500: Failed to fetch wallet balance

### POST `/api/user/connect-wallet`
Manually connects the user's wallet address by extracting it from their transaction history.

**Authentication**: Required (JWT token in Authorization header)

**Response**:
```json
{
  "message": "Wallet address connected successfully",
  "walletAddress": "GABC123..."
}
```

**Error Responses**:
- 401: No token provided or invalid token
- 404: User not found or no wallet address found in transaction history
- 500: Failed to connect wallet

## Implementation Details

### Server-Side Implementation

#### Pi Network Service (`server/services/pi-network.ts`)
```typescript
async getWalletBalance(walletAddress: string): Promise<number | null> {
  try {
    // Pi Network uses the Stellar Horizon API for balance fetching
    const HORIZON_API_BASE = 'https://api.mainnet.minepi.com';
    
    const response = await axios.get(`${HORIZON_API_BASE}/accounts/${walletAddress}`);
    const accountData = response.data;
    
    // Find the native Pi balance (Pi is the native asset on Stellar)
    const nativeBalance = accountData.balances.find((balance: any) => balance.asset_type === 'native');
    
    if (nativeBalance) {
      return parseFloat(nativeBalance.balance);
    }
    
    return 0; // If no native balance found, return 0
  } catch (error) {
    console.error('Failed to fetch wallet balance:', error);
    return null; // Return null to indicate failure
  }
}
```

#### Route Implementation (`server/routes.ts`)
```typescript
// New endpoint to fetch user's Pi wallet balance
app.get('/api/user/balance', async (req, res) => {
  // Authentication and validation logic
  // Fetch user wallet address from database
  // Call piNetworkService.getWalletBalance()
  // Return balance to client
});
```

### Client-Side Implementation

#### Dashboard Component (`client/src/pages/dashboard.tsx`)
- Added state variables for wallet balance and fetching status
- Implemented useEffect hook to automatically fetch balance on component mount
- Enhanced UI to display wallet balance in header and statistics card
- Added "Connect Wallet" button with appropriate event handlers

## Security Considerations

1. **Authentication**: All wallet-related endpoints require JWT authentication
2. **Rate Limiting**: API calls to the Stellar Horizon API are managed to prevent abuse
3. **Error Handling**: Proper error handling prevents information leakage
4. **Data Validation**: Wallet addresses are validated before making API calls

## Testing

### Manual Testing
1. Complete a purchase to trigger wallet address extraction
2. Navigate to the dashboard and verify wallet balance is displayed
3. Test the "Connect Wallet" button functionality
4. Verify error handling when no wallet address is available

### Automated Testing
```bash
# Test wallet balance endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5001/api/user/balance

# Test connect wallet endpoint
curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5001/api/user/connect-wallet
```

## Troubleshooting

### Common Issues

1. **Balance Not Displaying**
   - Ensure the user has completed at least one transaction
   - Check that the wallet address was properly extracted and stored
   - Verify the Stellar Horizon API is accessible

2. **Connection Errors**
   - Check network connectivity to `api.mainnet.minepi.com`
   - Verify the wallet address format is correct
   - Ensure the user has a valid JWT token

3. **Incorrect Balance**
   - Confirm the wallet address is correct
   - Check if there are any pending transactions
   - Verify the balance on the Pi Network app as a reference

## Future Enhancements

1. **Balance Caching**: Implement caching to reduce API calls to Stellar Horizon
2. **Transaction History**: Display recent wallet transactions
3. **Balance Alerts**: Notify users of significant balance changes
4. **Multi-Currency Support**: Display balances of other assets in the wallet