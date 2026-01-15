# Testing Plan

## Goals
- Validate core user flows (auth, services, quotes, bookings, payments, messaging).
- Protect data integrity (Supabase, role access, status transitions).
- Ensure UI correctness across roles (customer/parent, provider, admin).
- Catch regressions with automated tests and fast manual checks.

## Test Levels
- Unit: utilities, hooks, pure UI logic.
- Integration: API routes + Supabase interactions (mock or test DB).
- E2E: full flows in browser.
- Manual smoke: quick UI validation before deploy.

## Core Functional Areas & Coverage

### 1) Authentication & Profiles
- Signup, login, forgot password, logout.
- Role-specific navigation and access control.
- Profile updates and availability settings.

Tests
- Unit: `useUser`, auth state handling.
- Integration: auth/profile API routes.
- E2E: signup -> onboarding -> dashboard.

### 2) Services
- Create, edit, deactivate/activate service.
- Pricing models (fixed vs quote).
- Service list + detail pages.

Tests
- Unit: service form validation.
- Integration: service CRUD API routes.
- E2E: provider creates service -> customer sees it.

### 3) Quote Requests
- Customer creates request (appears in `my-quote-requests`).
- Provider views incoming requests and sends a quote.
- Customer accepts or declines; status updates correctly.

Tests
- Integration: `/api/quotes/request`, `/api/quotes/[id]/accept`, `/api/quotes/[id]/reject`.
- E2E: request -> quote -> accept -> booking created.
- E2E: request -> quote -> decline -> request status cancelled.

### 4) Bookings
- Booking creation and status transitions.
- Accept/decline by provider or customer.
- Reschedule flow (if applicable).

Tests
- Integration: booking API routes.
- E2E: accepted quote -> booking -> payment flow.

### 5) Payments & Payouts
- Stripe Connect onboarding.
- Payment checkout, success/failure states.
- Provider earnings and withdrawal requests.

Tests
- Integration: Stripe API wrapper functions.
- E2E: mock Stripe checkout using test keys.

### 6) Messaging
- Message thread creation for quote requests.
- Booking-based messaging.
- Unread/read status (if tracked).

Tests
- Integration: messaging API routes.
- E2E: customer/provider chat post-quote.

### 7) Admin
- Admin login and dashboard access.
- View/manage users, services, bookings.

Tests
- E2E: admin login -> dashboard -> view data.

## Permissions Matrix (Expected)
- Customer: create requests, accept/decline quotes, pay, message.
- Provider: quote, message, manage services.
- Admin: view all.
- Enforce role-based access in API routes and UI.

## Test Tooling (Recommended)
- Unit/Integration: `vitest`, `@testing-library/react`, `msw`.
- API integration: `vitest` + Supabase client mocks or test schema.
- E2E: `Playwright` (chromium + webkit) with seeded DB.

## Test Data Strategy
Seed test DB with:
- 1 admin, 1 customer, 1 provider.
- 2 services (fixed + quote).
- 2 quote requests (pending, quoted).
- 1 booking (pending), 1 booking (accepted).

Use a Supabase test project or local emulator if available.

## CI Checklist
- Lint + typecheck
- Unit + integration tests
- E2E smoke (limited flows)

## Manual Smoke Checklist (Pre-Deploy)
- Login as customer + provider.
- Create quote request -> provider quotes -> customer accepts.
- Customer declines quote and sees Cancelled.
- Verify message thread link works.
- Verify payments checkout opens.
