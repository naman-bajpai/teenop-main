# TeenOp Payment Flow

This document describes how payments currently work in TeenOp across booking payments, tips, earnings creation, withdrawal requests, admin payout processing, and Stripe Connect.

## 1. High-Level Overview

There are two separate money flows in the app:

1. Booking payment
   The customer pays for a confirmed booking through Stripe before the service happens.
2. Tip payment
   After a booking is completed, the customer can optionally send a tip through Stripe.

Teen earnings are not created at booking creation time. They are created after a booking has been paid and then synced into the `earnings` table. Payouts are currently handled through a withdrawal-request workflow that is approved by an admin, even though some older automatic Stripe transfer code still exists in the codebase.

## 2. Main Actors

- Customer
  The person booking and paying for the service.
- Teen provider
  The person offering the service and eventually receiving earnings.
- Admin
  The person reviewing and approving withdrawal requests.
- Stripe
  Handles card payments, payment intents, webhooks, and some Connect account features.
- Supabase
  Stores bookings, earnings, withdrawal requests, profiles, and payment metadata.

## 3. Core Tables and Important Fields

### `bookings`

Used to track the service request and payment state.

Important fields:

- `status`
- `total_price`
- `service_price`
- `payment_intent_id`
- `payment_completed_at`

Observed booking statuses relevant to payments:

- `pending`
- `confirmed`
- `alternative_proposed`
- `paid`
- `completed`
- `cancelled`
- `rejected`

### `earnings`

Used to track money owed to the teen provider.

Important fields:

- `user_id`
- `booking_id`
- `amount`
- `status`
- `earned_at`
- `withdrawal_id`
- `withdrawn_at`

Observed earnings statuses:

- `pending`
- `completed`

Note: in current logic, `completed` effectively means "withdrawn / paid out", not "service completed".

### `withdrawal_requests`

Used for the current payout workflow.

Important fields:

- `user_id`
- `amount`
- `platform_fee`
- `total_earnings`
- `status`
- `notes`
- `processed_at`
- `processed_by`

`notes` is currently used to store JSON like:

```json
{ "earnings_ids": ["..."] }
```

Observed withdrawal request statuses:

- `processing`
- `approved`
- `failed`
- sometimes logic also checks `pending`

### `profiles`

Important payment-related field:

- `stripe_connect_account_id`

## 4. Booking Payment Flow

### 4.1 When payment becomes available

The booking payment is only allowed after the provider confirms the booking.

Backend rule from `src/app/api/payments/create-intent/route.ts`:

- Payment is allowed only when booking status is:
  - `confirmed`, or
  - `alternative_proposed`

The route also verifies:

- the current user is authenticated
- the current user is the booking customer

### 4.2 Frontend entry points

Booking payment is triggered from Stripe-based UI components:

- `src/components/payments/PaymentModal.tsx`
- `src/components/payments/PaymentButton.tsx`

These are used from pages such as:

- `src/app/my-requests/page.tsx`
- `src/app/my-bookings/page.tsx`
- `src/app/booking/[id]/page.tsx`

### 4.3 Payment intent creation

`POST /api/payments/create-intent`

This route:

1. fetches the booking
2. verifies the customer owns it
3. checks that the booking is confirmed and ready for payment
4. creates a Stripe PaymentIntent for `total_price`

Stripe metadata added:

- `bookingId`
- `serviceTitle`
- `customerId`
- `providerId`

Important note:

- The booking payment intent does not currently use Stripe Connect transfer data.
- The customer pays TeenOp's Stripe account directly.

### 4.4 Card confirmation in the client

In `PaymentModal.tsx` and `PaymentButton.tsx`:

1. client requests `/api/payments/create-intent`
2. client uses Stripe Elements `CardElement`
3. client calls `stripe.confirmCardPayment(clientSecret, ...)`
4. if Stripe says `succeeded`, the client calls `/api/payments/confirm`

### 4.5 Payment confirmation on the backend

`POST /api/payments/confirm`

This route:

1. retrieves the payment intent from Stripe
2. checks `paymentIntent.status === "succeeded"`
3. reads `bookingId` from metadata
4. verifies the authenticated user is still the booking customer
5. updates the booking:
   - `status = "paid"`
   - `payment_intent_id = paymentIntentId`
   - `payment_completed_at = now`

It also sends an email to the provider telling them the service is booked and paid.

### 4.6 Webhook handling

`POST /api/payments/webhook`

Stripe webhook events currently handled:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`

For `payment_intent.succeeded`, the webhook also:

1. reads `bookingId` from metadata
2. fetches the booking
3. updates the booking to:
   - `status = "paid"`
   - `payment_intent_id = paymentIntent.id`
   - `payment_completed_at = now`
4. sends the provider email

This means there are currently two paths that mark a booking paid:

- the client-driven `/api/payments/confirm` route
- the Stripe webhook

This is intentional in practice for reliability, but it does mean the same side effects exist in two places.

## 5. Tip Payment Flow

Tips are processed separately from booking payments.

### 5.1 When tipping is available

Tips are only allowed after the booking is completed.

Backend rule from `src/app/api/payments/tip-intent/route.ts`:

- booking status must be `completed`

### 5.2 Frontend entry point

Tips are initiated from:

- `src/components/reviews/ReviewForm.tsx`

The review form opens:

- `src/components/payments/TipPaymentModal.tsx`

If the user enters a tip amount but has not paid it yet, the review flow pauses and opens the tip payment modal first.

### 5.3 Tip payment intent creation

`POST /api/payments/tip-intent`

This route:

1. validates `bookingId` and `tipAmount`
2. checks the booking exists
3. verifies the current user is the booking customer
4. requires the booking status to be `completed`
5. fetches the provider profile
6. creates a Stripe PaymentIntent for the tip amount

Tip metadata:

- `type = "tip"`
- `bookingId`
- `serviceTitle`
- `customerId`
- `providerId`

Important note:

- If the provider has `stripe_connect_account_id`, the tip intent includes:
  - `transfer_data.destination`
  - `application_fee_amount`
- But `platformFeePercent` is currently set to `0.0`
- So tips effectively go straight through with no platform fee

### 5.4 Tip confirmation

`POST /api/payments/tip-confirm`

This route:

1. retrieves the Stripe payment intent
2. confirms the status is `succeeded`
3. checks `metadata.type === "tip"`
4. verifies the current user is the booking customer
5. returns success and the tip amount

Important note:

- Unlike booking payments, tip confirmation does not update a database table directly here.
- The paid tip amount is later included in review submission through `/api/reviews`.

## 6. Earnings Creation Flow

### 6.1 When earnings are created

Teen earnings are not inserted immediately when payment succeeds.

Instead, earnings are created by:

- `POST /api/earnings/sync`

This route:

1. finds bookings where:
   - `status = "paid"`
   - the service belongs to the current user
   - `payment_completed_at` is not null
2. checks which of those bookings already have an earnings row
3. inserts missing earnings rows

Inserted earnings values:

- `user_id = provider user id`
- `booking_id = booking.id`
- `amount = booking.service_price`
- `status = "pending"`
- `earned_at = booking.payment_completed_at`

Important note:

- `service_price` is used for earnings, not `total_price`
- so any difference between total customer charge and provider earnings is encoded outside this route

### 6.2 Earnings dashboard aggregation

`GET /api/earnings`

This route calculates:

- `totalEarned`
  only earnings with `status = "completed"`
- `thisWeekEarned`
  only completed earnings within the current week
- `thisMonthEarned`
  only completed earnings within the current month
- `pendingEarnings`
  only earnings with `status = "pending"` that are not already locked inside a pending withdrawal request

The route also returns `recentEarnings`.

Important interpretation:

- `pending` means available to be withdrawn
- `completed` means already paid out / finalized

## 7. Withdrawal and Payout Flow

There are two payout paths in the codebase:

1. a direct Stripe transfer route
2. the newer withdrawal-request workflow

The newer withdrawal-request workflow appears to be the active one.

### 7.1 Current active flow: withdrawal requests

`POST /api/withdrawal-requests`

This route:

1. verifies the user is authenticated
2. fetches the user's profile
3. fetches all `earnings` with:
   - `user_id = current user`
   - `status = "pending"`
4. checks there is not already a `withdrawal_requests` row in:
   - `pending`
   - `processing`
5. sums the pending earnings
6. creates a withdrawal request

The created request stores:

- `amount`
- `platform_fee`
- `total_earnings`
- `status = "processing"`
- `notes = {"earnings_ids":[...]}`

Important note:

- even though the code checks for an existing `pending` or `processing` request, new requests are currently inserted as `processing`
- comments mention that admin handles payments manually now

### 7.2 Admin review

Admin lists requests via:

- `GET /api/admin/withdrawal-requests`

This returns withdrawal requests plus attached profile information.

### 7.3 Admin processing

`POST /api/admin/withdrawal-requests/[id]/process`

This route:

1. verifies the current user is an admin
2. fetches the withdrawal request
3. requires request status to be `processing`
4. loads the earnings IDs from `withdrawal_requests.notes`
5. fetches the referenced earnings
6. performs validation around already-processed earnings
7. updates the withdrawal request to:
   - `status = "approved"`
   - `processed_at = now`
   - `processed_by = admin user id`
8. updates associated earnings to:
   - `status = "completed"`
   - `withdrawn_at = now`

Important operational detail:

- The admin route does not create a Stripe payout or transfer.
- The route explicitly tells the admin to manually pay the student.
- So approval in the database and the real-world payout are currently separate steps.

### 7.4 Older / legacy direct Stripe transfer flow

There is still another route:

- `POST /api/earnings/withdraw`

This route:

1. requires `stripe_connect_account_id`
2. finds pending earnings
3. creates a Stripe `transfer`
4. creates a row in `withdrawals`
5. updates earnings to `status = "withdrawn"`

This is different from the admin request workflow.

Important note:

- This route appears older or partially superseded.
- It conflicts with the newer withdrawal-request/admin-approval flow.
- The rest of the app currently appears centered around `withdrawal_requests`, not direct transfers.

## 8. Stripe Connect Flow

Stripe Connect is still part of the system, especially around provider payout setup and tip routing.

### 8.1 Setup

`POST /api/stripe/connect/setup`

This route:

1. verifies the user
2. checks whether `profiles.stripe_connect_account_id` already exists
3. normalizes the app base URL
4. requires HTTPS
5. builds an OAuth URL for Stripe Connect
6. returns that URL to the frontend

The user is then redirected to Stripe.

### 8.2 Callback

`GET /api/stripe/connect/callback`

This route:

1. receives the OAuth `code` and `state`
2. exchanges the code for a Stripe account token
3. retrieves the Stripe account
4. stores `stripe_user_id` into `profiles.stripe_connect_account_id`
5. redirects back to `/earnings?stripe_success=true`

### 8.3 Status check

`GET /api/stripe/connect/setup`

This route also doubles as a status endpoint.

It returns:

- whether the user has a Stripe account
- whether account details are submitted
- whether charges and payouts are enabled
- a login link for Express accounts when available

Important note:

- comments in the withdrawal-request route say students do not need Stripe Connect anymore because admin handles payments
- but tip payments still use Stripe Connect destination transfers when available
- so Stripe Connect is still partially relevant

## 9. End-to-End Status Timeline

### Booking payment lifecycle

1. booking is created
   status starts in a pre-payment state like `pending`
2. provider confirms booking
   booking becomes `confirmed` or `alternative_proposed`
3. customer opens payment modal
4. Stripe PaymentIntent is created
5. customer enters card details and pays
6. booking becomes `paid`
   via confirm route and/or webhook
7. earnings are later synced
   `earnings.status = pending`
8. provider completes the service
   booking may later become `completed`
9. customer may leave a review and optionally pay a tip
10. provider requests withdrawal
11. admin approves request
12. linked earnings become `completed`

### Tip lifecycle

1. booking status becomes `completed`
2. customer opens review form
3. optional tip amount entered
4. Stripe tip PaymentIntent created
5. customer pays tip
6. tip confirmation route validates success
7. review submission persists the tip amount with the review flow

## 10. Frontend Components Involved

### Booking payment

- `src/components/payments/PaymentModal.tsx`
- `src/components/payments/PaymentButton.tsx`

### Tip payment

- `src/components/reviews/ReviewForm.tsx`
- `src/components/payments/TipPaymentModal.tsx`

### Earnings and payout management

- `src/app/earnings/page.tsx`

### Payment entry pages

- `src/app/my-requests/page.tsx`
- `src/app/my-bookings/page.tsx`
- `src/app/booking/[id]/page.tsx`

## 11. Current Gaps and Important Quirks

These are important for anyone changing payment behavior:

### 1. Booking payment is confirmed in two places

Both of these mark the booking as paid:

- `/api/payments/confirm`
- `/api/payments/webhook`

This helps with resilience, but it also duplicates side effects like booking updates and provider email sends.

### 2. Earnings are not created directly inside payment confirmation

After a booking is paid, earnings still depend on the sync process:

- `/api/earnings/sync`

If sync does not run, the provider may have a paid booking but no corresponding earnings row yet.

### 3. Withdrawal architecture is mixed

The codebase currently contains:

- a manual admin approval flow using `withdrawal_requests`
- an older direct Stripe transfer flow using `withdrawals`

These two models do not fully match each other.

### 4. Stripe Connect is partly active, partly optional

- Tip payments can use Connect destination transfers
- Withdrawal-request comments say Connect is no longer required because admin pays manually

This means payout strategy is currently hybrid, not fully unified.

### 5. Earnings status naming is overloaded

In `earnings`, `completed` really means "finalized / withdrawn", not "service completed".

That can be confusing if someone assumes it matches booking status language.

## 12. Recommended Mental Model for the Current System

If you need the simplest way to think about the system today:

- Customers pay TeenOp through Stripe when a booking is confirmed.
- Teen providers do not instantly receive money when that happens.
- A paid booking later becomes a pending earning for the provider.
- Providers request withdrawal of pending earnings.
- Admin approves the request and then manually pays the provider.
- Tips are separate Stripe payments and can route to a Stripe Connect account when one exists.

## 13. Files to Review When Changing Payments

If you need to modify the payment system, start here:

- `src/app/api/payments/create-intent/route.ts`
- `src/app/api/payments/confirm/route.ts`
- `src/app/api/payments/webhook/route.ts`
- `src/app/api/payments/tip-intent/route.ts`
- `src/app/api/payments/tip-confirm/route.ts`
- `src/app/api/earnings/route.ts`
- `src/app/api/earnings/sync/route.ts`
- `src/app/api/withdrawal-requests/route.ts`
- `src/app/api/admin/withdrawal-requests/[id]/process/route.ts`
- `src/app/api/stripe/connect/setup/route.ts`
- `src/app/api/stripe/connect/callback/route.ts`
- `src/components/payments/PaymentModal.tsx`
- `src/components/payments/TipPaymentModal.tsx`
- `src/components/reviews/ReviewForm.tsx`
- `src/app/earnings/page.tsx`

