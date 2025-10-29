# Withdrawal System Implementation Guide

## Overview

This guide explains how the withdrawal system works for paying student workers through Stripe Connect. The system allows students to withdraw their earnings directly to their bank accounts.

## Architecture

### 1. Database Schema

#### New Tables Added:
- **`withdrawals`**: Tracks all withdrawal requests and their status
- **`earnings`**: Updated to include withdrawal tracking fields

#### Key Fields:
```sql
-- withdrawals table
id: UUID (primary key)
user_id: UUID (foreign key to profiles)
amount: DECIMAL(10,2) (amount sent to user)
platform_fee: DECIMAL(10,2) (10% platform fee)
total_earnings: DECIMAL(10,2) (total earnings before fee)
stripe_transfer_id: TEXT (Stripe transfer ID)
stripe_connect_account_id: TEXT (user's Stripe Connect account)
status: TEXT (processing, completed, failed, cancelled)
failure_reason: TEXT (if withdrawal failed)
processed_at: TIMESTAMP (when withdrawal completed)
created_at: TIMESTAMP
updated_at: TIMESTAMP

-- earnings table (updated)
withdrawal_id: UUID (foreign key to withdrawals)
withdrawn_at: TIMESTAMP (when earnings were withdrawn)
```

### 2. Stripe Connect Integration

#### Setup Process:
1. Student clicks "Set Up Payments"
2. System creates Stripe Connect Express account
3. Student completes onboarding (bank account, tax info)
4. Account is verified by Stripe
5. Student can now receive payments

#### Withdrawal Process:
1. Student clicks "Withdraw Money"
2. System calculates total pending earnings
3. Applies 10% platform fee
4. Creates Stripe transfer to student's account
5. Updates earnings status to "withdrawn"
6. Records withdrawal in database

### 3. API Endpoints

#### `/api/stripe/connect/setup`
- **POST**: Creates Stripe Connect account and onboarding link
- **GET**: Returns account status and login link

#### `/api/earnings/withdraw`
- **POST**: Processes withdrawal request
- **GET**: Returns withdrawal history

## Implementation Details

### 1. Stripe Connect Setup

```typescript
// Create Express account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: profile.email,
  capabilities: {
    transfers: { requested: true },
    card_payments: { requested: true }
  },
  business_type: 'individual',
  individual: {
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
  },
  settings: {
    payouts: {
      schedule: {
        interval: 'daily' // Daily payouts
      }
    }
  }
});
```

### 2. Withdrawal Processing

```typescript
// Calculate amounts
const totalAmount = pendingEarnings.reduce((sum, earning) => sum + earning.amount, 0);
const platformFee = totalAmount * 0.1; // 10% platform fee
const payoutAmount = Math.round((totalAmount - platformFee) * 100); // Convert to cents

// Create transfer
const transfer = await stripe.transfers.create({
  amount: payoutAmount,
  currency: 'usd',
  destination: profile.stripe_connect_account_id,
  transfer_group: `withdrawal_${user.id}_${Date.now()}`,
  metadata: {
    user_id: user.id,
    withdrawal_type: 'earnings',
    platform_fee: platformFee.toString(),
    total_earnings: totalAmount.toString()
  }
});
```

### 3. UI States

The UI shows different states based on Stripe Connect account status:

1. **No Account**: Blue banner - "Set Up Payments"
2. **Account Pending**: Yellow banner - "Complete Payment Setup"
3. **Account Ready + Pending Earnings**: Green banner - "Withdraw Money"
4. **Account Ready + No Earnings**: Gray banner - "Payment Account Ready"

## Security Considerations

### 1. Authentication
- All endpoints require user authentication
- RLS policies protect user data
- Only users can access their own withdrawal data

### 2. Validation
- Minimum withdrawal amount: $0.50
- Only pending earnings can be withdrawn
- Platform fee is calculated server-side

### 3. Error Handling
- Stripe errors are caught and logged
- Failed withdrawals are marked in database
- User-friendly error messages

## Environment Variables Required

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Database Migration

Run the migration to set up the withdrawal system:

```bash
# Apply the migration
supabase db push

# Or run the SQL file directly
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20241204_create_withdrawals_table.sql
```

## Testing the System

### 1. Test Stripe Connect Setup
1. Create a test user account
2. Click "Set Up Payments"
3. Complete Stripe onboarding with test data
4. Verify account status updates

### 2. Test Withdrawal Process
1. Create some test earnings
2. Set up Stripe Connect account
3. Click "Withdraw Money"
4. Verify transfer is created in Stripe dashboard
5. Check database records

### 3. Test Error Scenarios
1. Try withdrawal without Stripe account
2. Try withdrawal with insufficient funds
3. Test with invalid Stripe account

## Monitoring and Maintenance

### 1. Database Queries
```sql
-- Check withdrawal status
SELECT * FROM withdrawals WHERE status = 'processing';

-- Check user earnings
SELECT * FROM earnings WHERE user_id = 'user-id' AND status = 'pending';

-- Platform revenue
SELECT SUM(platform_fee) FROM withdrawals WHERE status = 'completed';
```

### 2. Stripe Dashboard
- Monitor transfers in Stripe Connect dashboard
- Check for failed transfers
- Review account verification status

### 3. Error Handling
- Monitor failed withdrawals
- Set up alerts for Stripe errors
- Regular database cleanup of old records

## Future Enhancements

1. **Withdrawal Limits**: Daily/monthly withdrawal limits
2. **Tax Reporting**: Generate 1099 forms for students
3. **Batch Withdrawals**: Process multiple withdrawals at once
4. **Withdrawal Scheduling**: Allow scheduled withdrawals
5. **Multiple Payment Methods**: Support for different payout methods

## Troubleshooting

### Common Issues:

1. **"Stripe Connect account not set up"**
   - User needs to complete onboarding
   - Check if account creation succeeded

2. **"Minimum withdrawal amount is $0.50"**
   - User doesn't have enough pending earnings
   - Check earnings calculation

3. **"Payment processing failed"**
   - Check Stripe account status
   - Verify bank account is connected
   - Check Stripe logs for details

4. **Database errors**
   - Ensure migration was applied
   - Check RLS policies
   - Verify user permissions

## Support

For issues with the withdrawal system:
1. Check Stripe dashboard for transfer status
2. Review database logs for errors
3. Check user's Stripe Connect account status
4. Verify environment variables are set correctly
