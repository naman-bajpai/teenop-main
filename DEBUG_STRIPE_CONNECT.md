# Stripe Connect Debugging Guide

## Step 1: Get Your User ID

1. Open your app and go to the `/earnings` page
2. Open browser console (F12)
3. Look for: `🔍 Current User ID: <your-uuid>`
4. Copy that UUID

## Step 2: Check Current Profile State

Open in browser:
```
/api/stripe/connect/debug?userId=YOUR_USER_ID_HERE
```

**Expected Response:**
```json
{
  "success": true,
  "profile": {
    "id": "...",
    "email": "...",
    "stripe_connect_account_id": null,  // or "acct_xxx"
    "hasAccount": false  // or true
  },
  "environment": {
    "hasServiceRoleKey": true,
    "hasSupabaseUrl": true,
    "hasStripeClientId": true,
    "hasStripeSecretKey": true,
    "appUrl": "https://...",
    "expectedCallbackUrl": "https://.../api/stripe/connect/callback"
  }
}
```

## Step 3: Test Manual Update (Prove Frontend Works)

If `stripe_connect_account_id` is `null`, test if the update mechanism works:

```bash
curl -X POST http://localhost:3000/api/stripe/connect/test-update \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "accountId": "acct_TEST_123"
  }'
```

**If this succeeds:**
1. Reload `/earnings` page
2. You should now see "Account Status" instead of "Set up account"
3. This proves the frontend/GET endpoint works
4. The issue is in the callback route

## Step 4: Check Callback Logs

After going through Stripe Connect flow, check your **server terminal** for:

### ✅ Success Path:
```
🔔 Stripe Connect callback received: { hasCode: true, hasState: true, ... }
Service role client created successfully
Profile found before update: { userId: ..., existingAccountId: null, newAccountId: acct_xxx }
Attempting to update profile...
Update result: { hasData: true, hasError: false, updatedAccountId: acct_xxx }
✅✅✅ SUCCESS - Stripe Connect account linked: { userId: ..., accountId: acct_xxx, ... }
```

### ❌ Failure Paths:

**Profile not found:**
```
Profile not found: { userId: ... }
→ Redirects with: stripe_error=profile_not_found
```

**Update failed:**
```
Error updating profile with Stripe account ID: { error: ..., errorCode: ..., ... }
→ Redirects with: stripe_error=profile_update_failed
```

**Service role client failed:**
```
Failed to create service role client: ...
→ Redirects with: stripe_error=service_client_failed
```

## Step 5: Check Browser URL After Redirect

After Stripe redirects you back, check the URL:

- ✅ `?stripe_success=true` → Callback thinks it succeeded
- ❌ `?stripe_error=...` → Callback hit an error (check value)
- ⚠️ `?code=...&state=...` → Callback wasn't called (redirect URI mismatch)

## Common Issues & Fixes

### Issue 1: `stripe_connect_account_id` is null after callback

**Check:**
- Server logs show "✅✅✅ SUCCESS" → Update succeeded but maybe wrong user ID
- Server logs show error → Fix that specific error
- No callback logs at all → Callback URL mismatch

**Fix:**
- Verify `NEXT_PUBLIC_APP_URL` matches your actual domain
- Verify callback URL in Stripe Dashboard matches exactly
- Check if `state` (user ID) matches your actual user ID

### Issue 2: Profile not found

**Check:**
- Does profile exist? Run debug endpoint
- Is the user ID correct? Check `state` parameter in callback logs

**Fix:**
- Ensure profile is created on signup with `id = auth.user.id`
- Or modify callback to create profile if missing

### Issue 3: Service role key not working

**Check:**
- Debug endpoint shows `hasServiceRoleKey: false`
- Server logs show "Failed to create service role client"

**Fix:**
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- Restart dev server
- For production, add to Vercel environment variables

### Issue 4: Wrong Supabase project

**Check:**
- Debug endpoint shows different Supabase URL than expected
- Callback updates one DB, app reads from another

**Fix:**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` is same everywhere
- Check Vercel env vars match local `.env.local`

## Quick Verification Checklist

- [ ] User ID logged in browser console
- [ ] Debug endpoint shows current state
- [ ] Test update endpoint works
- [ ] Callback logs show in server terminal
- [ ] Browser URL shows `stripe_success=true` or specific error
- [ ] Profile has `stripe_connect_account_id` after callback
- [ ] `/earnings` page shows account status (not "Set up account")

