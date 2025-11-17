# 🚀 Complete Stripe Connect Setup Guide - Step by Step

This guide will walk you through setting up Stripe Connect for TeenOps from scratch.

---

## 📋 Prerequisites

- A Stripe account (create one at [stripe.com](https://stripe.com) if you don't have one)
- Your TeenOps application running
- Access to your deployment platform (Vercel, Netlify, etc.) for HTTPS URLs

---

## Step 1: Create/Login to Stripe Account

1. **Go to Stripe Dashboard**
   - Visit: [https://dashboard.stripe.com](https://dashboard.stripe.com)
   - Sign up or log in

2. **Switch to Test Mode** (for development)
   - Look for the toggle in the top right that says "Test mode" or "Live mode"
   - Make sure it's set to **"Test mode"** (toggle should show "Test mode" in gray/blue)
   - ⚠️ **Always test in Test Mode first before going live!**

---

## Step 2: Get Your Basic Stripe API Keys

1. **Navigate to API Keys**
   - In the left sidebar, click **"Developers"**
   - Click **"API keys"** (or go directly to [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys))

2. **Copy Your Keys**
   - **Publishable key** (starts with `pk_test_`):
     - Click **"Reveal test key"** if needed
     - Copy the entire key (it looks like: `pk_test_51AbCdEf...`)
   
   - **Secret key** (starts with `sk_test_`):
     - Click **"Reveal test key"** if needed
     - Click **"Reveal"** to show the secret key
     - Copy the entire key (it looks like: `sk_test_51AbCdEf...`)
     - ⚠️ **Keep this secret! Never share it publicly.**

3. **Save These Keys**
   - You'll add them to your `.env.local` file in Step 5

---

## Step 3: Enable Stripe Connect

1. **Navigate to Connect**
   - In the left sidebar, click **"Connect"**
   - If you don't see "Connect" in the sidebar:
     - Click **"Get started"** or **"Activate Connect"**
     - Follow the prompts to enable Connect

2. **Complete Platform Setup**
   - You'll see a setup form. Fill in:
     - **Business type**: Select the appropriate type (e.g., "Corporation", "LLC", etc.)
     - **Business description**: 
       ```
       TeenOps - A platform connecting teen service providers with customers
       ```
     - **Website URL**: 
       - For development: Your Vercel/Netlify preview URL (e.g., `https://teenops.vercel.app`)
       - For production: Your actual domain (e.g., `https://teenops.com`)
     - **Support email**: Your support email address
     - **Business address**: Your business address
   - Click **"Save"** or **"Continue"**

3. **Wait for Approval** (if required)
   - Some business types require Stripe approval
   - This usually takes a few minutes to a few hours
   - You'll receive an email when approved

---

## Step 4: Get Your Stripe Connect Client ID

1. **Go to Connect Settings**
   - In the Connect section, click **"Settings"** (gear icon or in the sidebar)
   - Scroll down to find **"OAuth settings"** section

2. **Find Your Client ID**
   - Look for **"Client ID"** (starts with `ca_`)
   - It will look like: `ca_1234567890abcdef`
   - Click **"Reveal"** or **"Copy"** to copy it
   - ⚠️ **This is different from your API keys!**

3. **Save This Client ID**
   - You'll add it to your `.env.local` file in Step 5

---

## Step 5: Configure OAuth Redirect URIs

⚠️ **IMPORTANT**: Stripe requires HTTPS for redirect URIs, even in test mode!

### Option A: Using a Deployment URL (Recommended for Development)

1. **Deploy Your App** (if not already deployed)
   - Push your code to GitHub
   - Connect to Vercel/Netlify
   - Get your deployment URL (e.g., `https://teenops-abc123.vercel.app`)

2. **Add Redirect URI in Stripe**
   - In Stripe Dashboard → Connect → Settings → OAuth settings
   - Find **"Redirect URIs"** section
   - Click **"Add URI"** or **"+"**
   - Enter your callback URL:
     ```
     https://your-deployment-url.vercel.app/api/stripe/connect/callback
     ```
   - Replace `your-deployment-url.vercel.app` with your actual deployment URL
   - Click **"Add"** or **"Save"**

3. **Verify the URI**
   - Make sure there are no trailing slashes
   - Make sure it's exactly: `https://your-url.com/api/stripe/connect/callback`
   - The path must be exactly `/api/stripe/connect/callback`

### Option B: Using Localhost with ngrok (Alternative)

If you must test locally:

1. **Install ngrok**
   ```bash
   npm install -g ngrok
   # or
   brew install ngrok
   ```

2. **Start ngrok**
   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Add to Stripe**
   - Add redirect URI: `https://abc123.ngrok.io/api/stripe/connect/callback`
   - ⚠️ **Note**: ngrok URLs change each time you restart, so you'll need to update Stripe each time

---

## Step 6: Set Up Environment Variables

1. **Open/Create `.env.local` File**
   - In your project root directory, open or create `.env.local`
   - This file should be in: `/Users/namanbajpai/Desktop/beachbook/TeenOps/teenops/.env.local`

2. **Add All Stripe Variables**
   ```env
   # Basic Stripe Keys (from Step 2)
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

   # Stripe Connect Client ID (from Step 4)
   STRIPE_CLIENT_ID=ca_your_client_id_here

   # App URL - MUST be HTTPS! (from Step 5)
   # For development: Use your deployment URL
   NEXT_PUBLIC_APP_URL=https://your-deployment-url.vercel.app
   # For production: Use your actual domain
   # NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

3. **Replace the Placeholders**
   - Replace `sk_test_your_secret_key_here` with your actual secret key from Step 2
   - Replace `pk_test_your_publishable_key_here` with your actual publishable key from Step 2
   - Replace `ca_your_client_id_here` with your actual Client ID from Step 4
   - Replace `your-deployment-url.vercel.app` with your actual deployment URL

4. **Example of a Complete `.env.local`**
   ```env
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdefghijklmnopqrstuvwxyz
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdefghijklmnopqrstuvwxyz
   
   # Stripe Connect
   STRIPE_CLIENT_ID=ca_1234567890abcdefghijklmnopqrstuvwxyz
   
   # App URL (MUST be HTTPS!)
   NEXT_PUBLIC_APP_URL=https://teenops-abc123.vercel.app
   ```

5. **Save the File**
   - Make sure `.env.local` is in your `.gitignore` (it should be by default)
   - ⚠️ **Never commit this file to Git!**

6. **Restart Your Development Server**
   ```bash
   # Stop your server (Ctrl+C)
   # Then restart it
   npm run dev
   ```

---

## Step 7: Verify Your Setup

1. **Check Environment Variables are Loaded**
   - In your terminal, you should not see any errors about missing environment variables
   - If you see errors, double-check your `.env.local` file

2. **Test the Connection Flow**
   - Go to your app: `http://localhost:3000/earnings` (or your deployment URL)
   - Click **"Set Up Payment Account"** button
   - You should be redirected to Stripe's Connect onboarding page
   - If you see an error, check the troubleshooting section below

3. **Complete Test Onboarding**
   - Fill out the Stripe Connect form with test data:
     - Use test email: `test@example.com`
     - Use test phone: `+1 555-555-5555`
     - Use test SSN: `000-00-0000` (for US accounts)
   - Complete all required fields
   - Click **"Submit"** or **"Continue"**

4. **Verify Redirect Back**
   - After completing onboarding, you should be redirected back to your app
   - You should see a success message
   - The account status should now show as connected

5. **Check Stripe Dashboard**
   - Go to Stripe Dashboard → Connect → Accounts
   - You should see a new test account created
   - Click on it to see the account details

---

## Step 8: Configure Connect Settings (Optional but Recommended)

1. **Go to Connect Settings**
   - Stripe Dashboard → Connect → Settings

2. **Configure Account Types**
   - Make sure **"Express accounts"** is enabled (recommended)
   - This provides the simplest onboarding experience

3. **Configure Capabilities**
   - Enable **"Transfers"** (required for payouts)
   - Enable **"Card payments"** (if you want providers to accept cards)

4. **Set Up Branding** (Optional)
   - Upload your logo
   - Set brand colors
   - This appears in the Stripe onboarding flow

---

## Step 9: Test the Complete Flow

1. **Test Account Creation**
   - Go to `/earnings` page
   - Click "Set Up Payment Account"
   - Complete Stripe onboarding
   - Verify you're redirected back successfully

2. **Test Account Status**
   - After connecting, check that the account status shows correctly
   - Verify "Account Status", "Details Submitted", and "Payouts Enabled" are displayed

3. **Test Withdrawal** (if you have earnings)
   - If you have pending earnings, try the withdrawal flow
   - Note: In test mode, withdrawals won't actually transfer money

---

## 🔧 Troubleshooting

### Issue 1: "You can only create new accounts if you've signed up for Connect"

**Solution:**
- Make sure you completed Step 3 (Platform Setup)
- Go to Connect → Settings and verify all required fields are filled
- Wait a few minutes if you just enabled Connect (it may need to process)

### Issue 2: "Invalid client_id"

**Solution:**
- Double-check your `STRIPE_CLIENT_ID` in `.env.local`
- Make sure it starts with `ca_`
- Make sure you're using the Client ID from the same mode (test vs live)
- Restart your development server after updating `.env.local`

### Issue 3: "Invalid redirect_uri" or "Cannot add HTTP URLs"

**Solution:**
- Stripe requires HTTPS for redirect URIs
- Make sure your `NEXT_PUBLIC_APP_URL` starts with `https://`
- Make sure the redirect URI in Stripe Dashboard matches exactly:
  - Should be: `https://your-url.com/api/stripe/connect/callback`
  - No trailing slashes
  - Exact path match
- For local development, use a deployment URL or ngrok

### Issue 4: "OAuth token exchange failed"

**Solution:**
- Check that `STRIPE_SECRET_KEY` is correct in `.env.local`
- Make sure you're using the secret key (starts with `sk_`), not the publishable key
- Make sure both keys are from the same mode (test vs live)
- Verify the key hasn't been revoked in Stripe Dashboard

### Issue 5: Account created but not showing in app

**Solution:**
- Check browser console for errors
- Verify the callback route is working: `/api/stripe/connect/callback`
- Check your database to see if `stripe_connect_account_id` was saved to the profile
- Try clicking the refresh button (↻) next to "Set Up Payment Account"

### Issue 6: Environment variables not loading

**Solution:**
- Make sure `.env.local` is in the project root directory
- Make sure the file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- Restart your development server after changing `.env.local`
- Check that variables start with the correct prefixes:
  - `STRIPE_SECRET_KEY` (not `NEXT_PUBLIC_STRIPE_SECRET_KEY`)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (needs `NEXT_PUBLIC_` prefix)
  - `STRIPE_CLIENT_ID` (not `NEXT_PUBLIC_STRIPE_CLIENT_ID`)
  - `NEXT_PUBLIC_APP_URL` (needs `NEXT_PUBLIC_` prefix)

---

## 📝 Quick Reference Checklist

Use this checklist to ensure everything is set up:

- [ ] Stripe account created and logged in
- [ ] Test mode enabled in Stripe Dashboard
- [ ] API keys copied (Publishable and Secret)
- [ ] Connect enabled in Stripe Dashboard
- [ ] Platform setup completed (business info filled)
- [ ] Client ID copied from Connect Settings
- [ ] Redirect URI added to Stripe (HTTPS URL)
- [ ] All environment variables added to `.env.local`
- [ ] Development server restarted
- [ ] Test account creation successful
- [ ] Account appears in Stripe Dashboard → Connect → Accounts
- [ ] Account status shows correctly in app

---

## 🚀 Going to Production

When you're ready to go live:

1. **Switch to Live Mode in Stripe**
   - Toggle to "Live mode" in Stripe Dashboard

2. **Get Live Keys**
   - Go to Developers → API keys
   - Copy your **live** publishable key (`pk_live_...`)
   - Copy your **live** secret key (`sk_live_...`)

3. **Get Live Client ID**
   - Go to Connect → Settings → OAuth settings
   - Copy your **live** Client ID (`ca_...`)

4. **Update Environment Variables**
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_CLIENT_ID=ca_...
   NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
   ```

5. **Update Redirect URI in Stripe**
   - Add your production callback URL to Stripe Connect settings
   - `https://your-domain.com/api/stripe/connect/callback`

6. **Test in Production**
   - Test the complete flow with a real account
   - Verify everything works before launching

---

## 📚 Additional Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Connect OAuth Guide](https://stripe.com/docs/connect/oauth-accounts)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Dashboard](https://dashboard.stripe.com)

---

## 💡 Tips

1. **Always test in Test Mode first** - Never test with live keys in development
2. **Keep your secret keys secure** - Never commit them to Git
3. **Use deployment URLs for development** - Easier than ngrok for testing
4. **Monitor your Stripe Dashboard** - Check Connect → Accounts regularly
5. **Test the complete flow** - Don't just test account creation, test withdrawals too

---

## 🆘 Need Help?

If you're still having issues:

1. Check the browser console for errors
2. Check your server logs for errors
3. Verify all environment variables are set correctly
4. Make sure your Stripe account is fully set up
5. Check that your redirect URI matches exactly in Stripe Dashboard

Good luck! 🎉

