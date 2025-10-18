# Stripe Payment Integration Setup

This document explains how to set up Stripe payments for the TeenOps application.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

## Getting Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. For webhook secret, create a webhook endpoint in Stripe Dashboard pointing to:
   `https://yourdomain.com/api/payments/webhook`

## Payment Flow

1. **Service Completion**: When a service provider marks a booking as "completed"
2. **Payment Required**: The customer sees a "Pay Now" button
3. **Card Collection**: Customer enters their card details in the secure Stripe card element
4. **Payment Processing**: Customer clicks "Pay Now" → Payment is processed with Stripe
5. **Payment Success**: Booking status changes to "paid" and customer sees confirmation

### Card Collection
The payment components now include Stripe Elements for secure card collection:
- **CardElement**: Secure input field for card number, expiry, and CVC
- **PCI Compliant**: Card details never touch your servers
- **Real-time validation**: Immediate feedback on card format

## API Endpoints

- `POST /api/payments/create-intent` - Creates a Stripe payment intent
- `POST /api/payments/confirm` - Confirms payment completion
- `POST /api/payments/webhook` - Handles Stripe webhook events

## Components

- `PaymentButton` - Simple payment button component
- `PaymentModal` - Full payment modal with Stripe integration

## Database Changes

The booking status now includes a new "paid" status, and bookings can have:
- `payment_intent_id` - Stripe payment intent ID
- `payment_completed_at` - Timestamp when payment was completed

## Testing

Use Stripe's test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

## Common Issues

### Mode Mismatch Error
If you see an error like "No such payment_intent: 'pi_...'; a similar object exists in test mode, but a live mode key was used", this means you're mixing test and live mode keys.

**Solution**: Ensure both keys are from the same mode:
- **Test mode**: Both keys start with `pk_test_` and `sk_test_`
- **Live mode**: Both keys start with `pk_live_` and `sk_live_`

### Invalid API Key Error
If you see "Invalid API Key provided: pk_test_...", this means your Stripe publishable key is malformed or incorrect.

**Solution**: 
1. Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
2. Copy the **Publishable key** exactly as shown (it should start with `pk_test_` or `pk_live_`)
3. Make sure there are no extra spaces, quotes, or characters
4. Restart your development server after updating `.env.local`

### Key Format Validation
Valid Stripe keys should:
- **Publishable key**: Start with `pk_test_` (test) or `pk_live_` (live)
- **Secret key**: Start with `sk_test_` (test) or `sk_live_` (live)
- Be exactly as shown in your Stripe dashboard (no modifications)

## Security Notes

- Never expose secret keys in client-side code
- Always verify webhook signatures
- Use HTTPS in production
- Implement proper error handling and logging
- Use test mode keys for development, live mode keys for production
