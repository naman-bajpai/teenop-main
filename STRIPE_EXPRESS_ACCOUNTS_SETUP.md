# How to Enable Express Accounts on Stripe Connect

## Overview
Express accounts are the recommended account type for most platforms because:
- ✅ Stripe handles onboarding and compliance
- ✅ Users get a streamlined setup experience
- ✅ Login links work (unlike Standard accounts)
- ✅ Better user experience overall

## Method 1: Configure Stripe Dashboard (Easiest)

### Steps:
1. **Go to Stripe Dashboard**
   - Navigate to: **Connect → Settings**

2. **Set Default Account Type**
   - Under **Account types**, select **Express accounts** as the default
   - This ensures new OAuth connections create Express accounts

3. **Verify Settings**
   - Make sure **Express accounts** is enabled
   - The OAuth flow will automatically create Express accounts

### Note:
- This setting affects all new OAuth connections
- Existing accounts won't be affected
- This is the simplest method and requires no code changes

---

## Method 2: Create Express Accounts Directly via API (More Control)

This method gives you more control by creating Express accounts directly using the Stripe Accounts API, then redirecting users to complete onboarding.

### Implementation:

Instead of using OAuth, you can:
1. Create an Express account using `stripe.accounts.create({ type: 'express' })`
2. Create an account link for onboarding
3. Redirect user to complete onboarding

### Code Changes Needed:

Update `src/app/api/stripe/connect/setup/route.ts` to create Express accounts directly:

```typescript
// Option 1: Create Express account directly (recommended)
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US', // or get from user profile
  email: profile.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// Create account link for onboarding
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${baseUrl}/earnings?stripe_refresh=true`,
  return_url: `${baseUrl}/earnings?stripe_success=true`,
  type: 'account_onboarding',
});

// Store account ID and redirect to onboarding
// ... update profile with account.id
// ... redirect to accountLink.url
```

### Advantages:
- ✅ Guaranteed Express accounts
- ✅ More control over account creation
- ✅ Can pre-fill user information
- ✅ Better error handling

### Disadvantages:
- ⚠️ Requires more code changes
- ⚠️ Need to handle account link refresh/return flows
- ⚠️ More complex than OAuth

---

## Method 3: Hybrid Approach (Recommended)

Use OAuth but verify and convert accounts to Express if needed.

### Implementation:

1. Use OAuth as normal
2. After OAuth callback, check account type
3. If Standard, optionally create a new Express account and migrate

**Note**: This is complex and not recommended. Better to use Method 1 or 2.

---

## Recommended Solution: Method 1 + Code Update

### Step 1: Configure Stripe Dashboard
Follow Method 1 above to set Express as default.

### Step 2: Update Code to Verify Express Accounts

Add validation to ensure accounts are Express:

```typescript
// After OAuth callback, verify account type
const account = await stripe.accounts.retrieve(accountId);

if (account.type !== 'express') {
  console.warn('Account is not Express type:', account.type);
  // Optionally: Create new Express account or show error
}
```

### Step 3: Update OAuth URL (Optional)

While OAuth doesn't have a direct parameter to force Express, you can add a note in the authorization flow. However, the Dashboard setting (Method 1) is the primary way to control this.

---

## Current Code Status

Your current implementation uses OAuth flow. To ensure Express accounts:

1. **Immediate Fix**: Configure Stripe Dashboard (Method 1) - No code changes needed
2. **Long-term**: Consider Method 2 if you need more control

---

## Testing Express Accounts

### In Test Mode:
1. Create a test Express account via OAuth
2. Verify account type: `account.type === 'express'`
3. Test login link creation (should work for Express)
4. Test onboarding flow

### Test Account Verification:
```typescript
const account = await stripe.accounts.retrieve('acct_test_...');
console.log('Account type:', account.type); // Should be 'express'
console.log('Can create login link:', account.type === 'express');
```

---

## Troubleshooting

### Issue: Accounts are still Standard type
**Solution**: 
- Check Stripe Dashboard → Connect → Settings → Account types
- Ensure Express is selected as default
- Delete test accounts and recreate

### Issue: OAuth creates Standard accounts
**Solution**:
- Verify Dashboard settings
- Consider switching to Method 2 (direct API creation)

### Issue: Login links don't work
**Solution**:
- Verify account type is 'express'
- Check account has `details_submitted: true`
- Ensure `charges_enabled: true`

---

## Migration Path

If you have existing Standard accounts:

1. **Option A**: Let users keep Standard accounts (they work, just no login links)
2. **Option B**: Create new Express accounts for users and migrate data
3. **Option C**: Contact Stripe support to convert accounts (not always possible)

---

## Best Practices

1. ✅ Always verify account type after creation
2. ✅ Handle both Express and Standard gracefully (your code already does this)
3. ✅ Use Express accounts for new users
4. ✅ Document account type in your database if needed
5. ✅ Monitor account creation to ensure Express accounts are being created

---

## Next Steps

1. **Go to Stripe Dashboard** → Connect → Settings
2. **Set Express accounts as default**
3. **Test with a new account** to verify it's Express
4. **Monitor account creation** to ensure consistency

