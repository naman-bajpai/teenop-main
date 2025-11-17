# Quote-Based Services Flow - Implementation Summary

## Current State
- Services support `pricing_model: "quote"` 
- Basic quote request exists but creates a booking (not ideal)
- Need proper quote request/quote system

## Recommended Flow

### Customer Journey

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Browse Services                                          │
│    - See "Quote Based" badge on service card                 │
│    - Click "Request Quote" button                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Request Quote Modal                                       │
│    - Select preferred date/time                              │
│    - Add special instructions                                │
│    - Submit → Creates quote_request                         │
│    - Status: "pending"                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. My Quote Requests Page                                    │
│    - View all quote requests                                 │
│    - See status: pending/quoted/accepted                     │
│    - Click to view details                                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Quote Received (Notification)                           │
│    - Teen submitted quote                                    │
│    - View quote details                                      │
│    - See price, duration, notes, expiration                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Accept Quote                                             │
│    - Click "Accept Quote"                                    │
│    - Creates booking with quote price                       │
│    - Redirects to payment                                   │
│    - Booking status: "pending" (awaiting provider confirm)  │
└─────────────────────────────────────────────────────────────┘
```

### Teen/Provider Journey

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Dashboard / My Services                                  │
│    - See "Quote Requests" badge with count                  │
│    - Click to view quote requests                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Quote Requests Page                                      │
│    - List of pending quote requests                         │
│    - Customer name, date/time, instructions                │
│    - Click to view details                                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Submit Quote Form                                        │
│    - Enter price                                            │
│    - Enter estimated duration                               │
│    - Add notes/terms                                        │
│    - Set expiration date (optional)                         │
│    - Submit → Creates quote                                │
│    - Customer notified                                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Quote Accepted (Notification)                           │
│    - Customer accepted quote                                │
│    - Booking automatically created                          │
│    - Booking status: "pending"                              │
│    - Confirm booking as usual                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Differences from Current Implementation

### Current (Not Ideal)
- Quote request creates a booking immediately
- Uses messaging to communicate price
- No structured quote system

### Recommended (Better)
- Quote request is separate entity
- Structured quote submission with price, duration, notes
- Quote acceptance creates booking
- Better tracking and management

## Database Schema (Quick Reference)

```sql
-- Quote Requests
quote_requests
  - id
  - service_id
  - customer_id
  - status (pending, quoted, accepted, rejected, expired)
  - requested_date
  - requested_time
  - special_instructions
  - created_at, updated_at

-- Quotes
quotes
  - id
  - quote_request_id
  - provider_id
  - price
  - estimated_duration
  - notes
  - valid_until
  - status (pending, accepted, rejected, expired)
  - created_at, updated_at

-- Update bookings
bookings
  - quote_id (new field, links to accepted quote)
```

## API Endpoints Needed

### Quote Requests
- `POST /api/quotes/request` - Create quote request
- `GET /api/quotes/requests` - List quote requests (filtered by role)
- `GET /api/quotes/requests/[id]` - Get quote request details
- `PATCH /api/quotes/requests/[id]` - Update/cancel quote request

### Quotes
- `POST /api/quotes` - Submit quote
- `GET /api/quotes/[id]` - Get quote details
- `PATCH /api/quotes/[id]` - Edit quote
- `POST /api/quotes/[id]/accept` - Accept quote (creates booking)
- `POST /api/quotes/[id]/reject` - Reject quote

## UI Pages Needed

### Customer
1. `/my-quote-requests` - List all quote requests
2. `/quote-requests/[id]` - Quote request details with quotes

### Provider
1. `/provider/quote-requests` - List quote requests for their services
2. `/quote-requests/[id]` - View request and submit quote

## Status Flow

```
Quote Request:
pending → quoted → accepted → (booking created)
       ↘ rejected
       ↘ cancelled
       ↘ expired

Quote:
pending → accepted → (booking created)
       ↘ rejected
       ↘ expired
```

## Key Features

1. **Quote Request Management**
   - Customer can request quotes for quote-based services
   - Provider sees all quote requests for their services
   - Status tracking throughout the process

2. **Quote Submission**
   - Provider submits structured quote with price, duration, notes
   - Can set expiration date
   - Can revise quotes (submit new quote for same request)

3. **Quote Acceptance**
   - Customer views quote details
   - Accepts quote → Creates booking automatically
   - Booking uses quote price (not service price)
   - Payment flow uses quote price

4. **Notifications**
   - Customer: Quote received
   - Provider: Quote request received
   - Provider: Quote accepted/rejected
   - Both: Quote expiration reminders

## Implementation Steps

1. **Database Setup**
   - Create migrations for quote_requests and quotes tables
   - Add quote_id to bookings table
   - Run migrations

2. **Backend APIs**
   - Implement quote request endpoints
   - Implement quote endpoints
   - Update booking creation to handle quote_id

3. **Frontend - Customer**
   - Update service details page (quote request button)
   - Create quote request form
   - Create my-quote-requests page
   - Create quote request details page
   - Quote acceptance flow

4. **Frontend - Provider**
   - Create provider quote requests page
   - Create submit quote form
   - Quote management dashboard

5. **Integration**
   - Update booking flow to use quote price
   - Add notifications
   - Add status badges and indicators

## Benefits of This Approach

1. **Better UX**: Clear separation between quote request and booking
2. **Better Tracking**: Can see quote acceptance rates, average quote times
3. **Flexibility**: Provider can revise quotes, set expiration dates
4. **Transparency**: Customer sees all quote details before accepting
5. **Scalability**: Easy to add features like quote comparison, auto-expiration

