# A2U Testnet/Sandbox - Quick Reference

## 🔑 Key Information

**Network:** Pi Network MAINNET  
**API Base:** `https://api.minepi.com`  
**Status:** ✅ Production Ready

---

## 🚀 Quick Start

### 1. Send A2U Payment

```bash
curl -X POST https://your-domain.com/api/payments/a2u \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "USER_PI_UID",
    "amount": 5.0,
    "memo": "Tournament reward"
  }'
```

### 2. Process Refunds

```bash
# Production (REAL Pi)
npm run process:refund

# Test mode (Mock)
npm run process:refund:test
```

---

## 📋 Environment Variables

```env
PI_SERVER_API_KEY=your_mainnet_key
PI_SANDBOX_MODE=true  # A2U is currently supported only on Pi Testnet/Sandbox
```

---

## 🔄 3-Step A2U Flow

```typescript
// Step 1: Create
const paymentId = await piNetworkService.createA2UPayment({ amount, memo, uid });

// Step 2: Submit
const txid = await piNetworkService.submitPaymentToBlockchain(paymentId);

// Step 3: Complete
const payment = await piNetworkService.completePaymentInServer(paymentId, txid);
```

---

## ⚠️ Critical Notes

1. **Requires Pi UID** (not wallet address)
2. **User must authenticate** with `['username', 'payments', 'wallet_address']` scopes
3. **Amount range:** 0.001 to 1,000,000 Pi
4. **Always store paymentId** to prevent double-payments
5. **Mock mode** when `PI_SANDBOX_MODE=true`

---

## 🔍 Verify Transactions

**Blockchain Explorer:**
```
https://blockchain.minepi.com/transaction/{txid}
```

**Database Query:**
```sql
SELECT * FROM app_transactions 
WHERE metadata->>'type' = 'A2U' 
ORDER BY created_at DESC;
```

---

## 📁 Modified Files

- ✅ `server/services/pi-network.ts` - A2U methods
- ✅ `server/routes.ts` - `/api/payments/a2u` endpoint
- ✅ `scripts/process-a2u-refund-mainnet.ts` - Refund script
- ✅ `package.json` - Script commands

---

## 🎯 API Endpoint

**POST** `/api/payments/a2u`

```json
{
  "uid": "pi_user_uid",
  "amount": 5.0,
  "memo": "Payment memo",
  "metadata": {}
}
```

---

**For full documentation, see:** `A2U_MAINNET_INTEGRATION.md`
