# Withdraw Function Guide

## How the Withdraw Function Works

### Overview
The withdraw function allows service providers (teens) to transfer their pending earnings from the platform to their connected bank account via Stripe Connect.

### Flow Diagram

```
1. User clicks "Withdraw Money"
   ↓
2. Frontend calls POST /api/earnings/withdraw
   ↓
3. Backend validates:
   - User is authenticated
   - User has Stripe Connect account set up
   - User has pending earnings
   - Minimum withdrawal amount ($0.50)
   ↓
4. Calculate amounts:
   - Total pending earnings
   - Platform fee (10%)
   - Payout amount (total - fee)
   ↓
5. Create Stripe Transfer to user's Connect account
   ↓
6. Create withdrawal record in database
   ↓
7. Update earnings status to 'withdrawn'
   ↓
8. Return success response
```

### Step-by-Step Process

#### 1. **Validation Phase**
```typescript
// Checks performed:
- User authentication
- Stripe Connect account exists (stripe_connect_account_id in profiles table)
- Pending earnings exist (status = 'pending' in earnings table)
- Minimum withdrawal: $0.50
```

#### 2. **Amount Calculation**
```typescript
totalAmount = sum of all pending earnings
platformFee = totalAmount * 0.10  // 10% platform fee
payoutAmount = (totalAmount - platformFee) * 100  // Convert to cents
```

#### 3. **Stripe Transfer**
```typescript
stripe.transfers.create({
  amount: payoutAmount,  // in cents
  currency: 'usd',
  destination: stripe_connect_account_id,  // User's Connect account
  transfer_group: `withdrawal_${user.id}_${timestamp}`,
  metadata: {
    user_id: user.id,
    withdrawal_type: 'earnings',
    platform_fee: platformFee,
    total_earnings: totalAmount
  }
})
```

#### 4. **Database Updates**
- Creates a record in `withdrawals` table
- Updates all pending `earnings` records to status `'withdrawn'`
- Links earnings to withdrawal via `withdrawal_id`

### Database Schema

#### Earnings Table
- `status`: 'pending' → 'withdrawn' (after withdrawal)
- `withdrawal_id`: Links to withdrawal record
- `withdrawn_at`: Timestamp of withdrawal

#### Withdrawals Table
- `amount`: Payout amount (after platform fee)
- `platform_fee`: 10% fee deducted
- `total_earnings`: Original earnings before fee
- `stripe_transfer_id`: Stripe transfer ID for tracking
- `status`: 'processing' → 'completed' (via webhook)
- `stripe_connect_account_id`: Destination account

---

## What You Need on Stripe

### 1. **Stripe Account Setup**

#### Required:
- ✅ **Stripe Account** (Standard or Express)
- ✅ **Stripe Connect** enabled
- ✅ **API Keys** configured:
  - `STRIPE_SECRET_KEY` (server-side)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-side)
  - `STRIPE_CLIENT_ID` (for OAuth)

#### Environment Variables Needed:
```env
STRIPE_SECRET_KEY=sk_test_...  # or sk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # or pk_live_...
STRIPE_CLIENT_ID=ca_...  # From Connect → Settings → OAuth
```

### 2. **Stripe Connect Configuration**

#### In Stripe Dashboard:

1. **Enable Stripe Connect**
   - Go to: **Connect → Settings**
   - Enable Connect for your account

2. **OAuth Settings**
   - Go to: **Connect → Settings → OAuth**
   - Copy your **Client ID** (starts with `ca_`)
   - Add redirect URI: `https://yourdomain.com/api/stripe/connect/callback`
   - For local dev: Use a deployment URL (Vercel/Netlify) since Stripe requires HTTPS

3. **Account Types**
   - **Express Accounts**: Quick setup, Stripe handles most details
   - **Standard Accounts**: More control, users manage their own account

### 3. **Transfer Capabilities**

#### What Stripe Connect Provides:
- ✅ **Direct Transfers**: Transfer funds directly to connected accounts
- ✅ **Automatic Payouts**: Funds automatically sent to user's bank account
- ✅ **Payout Schedule**: Configurable (daily, weekly, monthly)
- ✅ **Bank Account Verification**: Stripe handles verification

#### Transfer Requirements:
- User's Connect account must have:
  - ✅ `charges_enabled: true` (can receive payments)
  - ✅ `payouts_enabled: true` (can receive payouts)
  - ✅ Bank account connected
  - ✅ Account details submitted

### 4. **Webhook Configuration** (Optional but Recommended)

#### Recommended Webhooks:
- `transfer.created` - Track when transfers are created
- `transfer.paid` - Track when transfers are completed
- `transfer.failed` - Handle failed transfers
- `account.updated` - Track account status changes

#### Webhook Endpoint:
```
POST /api/stripe/webhook
```

#### Webhook Events to Handle:
```typescript
// Update withdrawal status when transfer completes
if (event.type === 'transfer.paid') {
  // Update withdrawal status to 'completed'
}

if (event.type === 'transfer.failed') {
  // Update withdrawal status to 'failed'
  // Store failure reason
}
```

### 5. **Testing Withdrawals**

#### Test Mode:
- Use test API keys (`sk_test_...`)
- Create test Connect accounts
- Use test bank accounts (Stripe provides test account numbers)
- Test transfers are instant (no real money)

#### Test Bank Accounts (Stripe):
- **Success**: `000123456789` (routing), `000123456789` (account)
- **Failure**: Use any invalid account number

### 6. **Production Considerations**

#### Before Going Live:
1. ✅ Switch to live API keys
2. ✅ Verify webhook endpoint is accessible
3. ✅ Set up proper error handling
4. ✅ Configure payout schedule in Stripe Dashboard
5. ✅ Set up email notifications for failed transfers
6. ✅ Monitor transfer success rates
7. ✅ Implement retry logic for failed transfers

#### Payout Schedule:
- **Default**: Automatic (daily)
- **Configurable**: In Stripe Dashboard → Connect → Settings
- **Minimum**: $1.00 (Stripe's minimum)

#### Fees:
- **Platform Fee**: 10% (configured in code)
- **Stripe Fee**: 2.9% + $0.30 per transaction (charged on original payment)
- **Transfer Fee**: $0.25 per transfer (charged to platform account)

---

## Code Implementation Details

### Withdraw API Route
**File**: `src/app/api/earnings/withdraw/route.ts`

**Key Functions**:
- `POST`: Process withdrawal
- `GET`: Get withdrawal history

### Frontend Integration
**Files**:
- `src/app/earnings/page.tsx` - Earnings page with withdraw button
- `src/app/my-teen-hustle/page.tsx` - Alternative withdraw interface

### Error Handling
- Invalid account → Clears account ID, prompts reconnection
- Insufficient funds → Returns error message
- Transfer failure → Logs error, updates withdrawal status
- Network errors → Retries with exponential backoff

---

## Common Issues & Solutions

### Issue: "Stripe Connect account not set up"
**Solution**: User needs to complete OAuth flow via `/api/stripe/connect/setup`

### Issue: "Account invalid" error
**Solution**: Account was disconnected. System automatically clears it. User needs to reconnect.

### Issue: "Minimum withdrawal amount is $0.50"
**Solution**: User needs to accumulate more earnings before withdrawing.

### Issue: Transfer fails
**Solution**: 
- Check Stripe Dashboard for failure reason
- Verify user's bank account is valid
- Check account has `payouts_enabled: true`

---

## Security Considerations

1. **Authentication**: All endpoints require user authentication
2. **Authorization**: Users can only withdraw their own earnings
3. **Validation**: Minimum amounts, account verification
4. **Idempotency**: Transfer groups prevent duplicate withdrawals
5. **Audit Trail**: All withdrawals logged with Stripe transfer IDs

---

## Monitoring & Analytics

### Key Metrics to Track:
- Withdrawal success rate
- Average withdrawal amount
- Time to process withdrawals
- Failed transfer reasons
- Platform fee revenue

### Stripe Dashboard:
- **Connect → Transfers**: View all transfers
- **Connect → Accounts**: Monitor account statuses
- **Payments → Transfers**: Track transfer history

---

## Next Steps

1. ✅ Set up Stripe Connect in Dashboard
2. ✅ Configure OAuth redirect URI
3. ✅ Add environment variables
4. ✅ Test with test accounts
5. ✅ Set up webhooks (optional)
6. ✅ Deploy to production
7. ✅ Monitor transfer success rates

