# Stripe Connect Setup Guide

## 🚀 **Complete Setup Instructions**

### **Step 1: Enable Stripe Connect in Dashboard**

1. **Log into Stripe Dashboard**
   - Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
   - Make sure you're in **Test Mode** for development

2. **Navigate to Connect**
   - In the left sidebar, click **"Connect"**
   - If you don't see it, click **"Get started"** to enable Connect

3. **Complete Platform Setup**
   - Fill in your business information:
     - **Business type**: Choose appropriate type
     - **Business description**: "TeenOps - Platform for teen service providers"
     - **Website URL**: Your app's URL
     - **Support email**: Your support email
   - Click **"Save"**

### **Step 2: Get Your Connect Credentials**

1. **Go to Connect Settings**
   - In Connect section, click **"Settings"**
   - Scroll down to **"OAuth settings"**

2. **Note Your Client ID**
   - Copy the **Client ID** (starts with `ca_`)
   - This is different from your publishable key

3. **Set Redirect URIs**
   - Add these redirect URIs:
     ```
     http://localhost:3000/api/stripe/connect/callback
     https://your-domain.com/api/stripe/connect/callback
     ```

### **Step 3: Update Environment Variables**

Add these to your `.env.local` file:

```env
# Existing Stripe keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# New Connect credentials
STRIPE_CLIENT_ID=ca_...  # From Connect settings
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your app URL
```

### **Step 4: Configure Connect Settings (Optional)**

1. **Branding**
   - Upload your logo
   - Set brand colors
   - This appears in the onboarding flow

2. **Account Types**
   - Keep **Express accounts** enabled (recommended)
   - This provides the simplest onboarding experience

3. **Capabilities**
   - Enable **Transfers** (required for payouts)
   - Enable **Card payments** (if you want students to accept cards)

### **Step 5: Test the Integration**

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Test the flow**
   - Go to `/my-teen-hustle`
   - Click **"Set Up Payments"**
   - You should be redirected to Stripe Connect
   - Complete the test onboarding
   - You should be redirected back with success

3. **Verify in Stripe Dashboard**
   - Go to Connect → Accounts
   - You should see the test account created

### **Step 6: Production Setup**

1. **Switch to Live Mode**
   - In Stripe Dashboard, toggle to **Live mode**
   - Repeat steps 1-3 with live credentials

2. **Update Environment Variables**
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_CLIENT_ID=ca_live_...
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

3. **Update Redirect URIs**
   - Add your production callback URL to Stripe Connect settings

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **"You can only create new accounts if you've signed up for Connect"**
   - **Solution**: Complete the Connect platform setup in Stripe Dashboard
   - Make sure you've filled in all required business information

2. **"Invalid client_id"**
   - **Solution**: Check that `STRIPE_CLIENT_ID` is correct
   - Make sure you're using the right mode (test vs live)

3. **"Invalid redirect_uri"**
   - **Solution**: Add your callback URL to Stripe Connect OAuth settings
   - Make sure the URL matches exactly (including http vs https)

4. **"OAuth token exchange failed"**
   - **Solution**: Check that `STRIPE_SECRET_KEY` is correct
   - Make sure you're using the secret key, not the publishable key

### **Testing Checklist:**

- [ ] Connect is enabled in Stripe Dashboard
- [ ] Client ID is added to environment variables
- [ ] Redirect URIs are configured in Stripe
- [ ] Environment variables are loaded correctly
- [ ] OAuth flow redirects to Stripe
- [ ] Callback URL is accessible
- [ ] Account is created in Stripe Dashboard
- [ ] User profile is updated with account ID

## 📋 **Required Stripe Connect Features**

### **Minimum Required:**
- ✅ **Express accounts** (for simple onboarding)
- ✅ **Transfers** (for payouts to students)
- ✅ **OAuth** (for secure account creation)

### **Optional but Recommended:**
- ✅ **Card payments** (if students accept card payments)
- ✅ **Custom branding** (for better user experience)
- ✅ **Webhooks** (for real-time status updates)

## 🚨 **Important Notes**

1. **Test Mode First**: Always test in Stripe test mode before going live
2. **Webhook Security**: If you add webhooks, verify the signatures
3. **Account Verification**: Students need to complete identity verification
4. **Compliance**: Ensure you comply with Stripe's terms of service
5. **Fees**: Stripe charges fees on transfers (typically 0.5% + $0.30)

## 🔄 **OAuth Flow Explanation**

1. **User clicks "Set Up Payments"**
2. **App creates OAuth URL** with user ID as state
3. **User is redirected to Stripe** for account creation
4. **Stripe redirects back** with authorization code
5. **App exchanges code for access token**
6. **App retrieves account ID** from Stripe
7. **App saves account ID** to user profile
8. **User is redirected back** with success message

This OAuth flow is more secure and scalable than direct account creation, which is why Stripe requires it for production use.
