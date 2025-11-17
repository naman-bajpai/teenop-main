# Quote-Based Services Flow Design

## Overview
This document outlines the complete flow for quote-based services, where customers request quotes and teens provide pricing before booking.

## Database Schema

### New Table: `quote_requests`
```sql
CREATE TABLE quote_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, quoted, accepted, rejected, expired
  requested_date DATE,
  requested_time TIME,
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quote_requests_service_id ON quote_requests(service_id);
CREATE INDEX idx_quote_requests_customer_id ON quote_requests(customer_id);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
```

### New Table: `quotes`
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  estimated_duration INTEGER, -- in minutes
  notes TEXT, -- Additional details about the quote
  valid_until DATE, -- Quote expiration date
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quotes_quote_request_id ON quotes(quote_request_id);
CREATE INDEX idx_quotes_provider_id ON quotes(provider_id);
CREATE INDEX idx_quotes_status ON quotes(status);
```

### Update `bookings` table
```sql
-- Add quote_id to link booking to accepted quote
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id);
```

## Flow Diagrams

### Customer Side Flow

```
1. Browse Services
   └─> See service with "Quote Based" badge
       └─> Click "Request Quote" button

2. Request Quote Form
   ├─> Select preferred date/time
   ├─> Add special instructions
   ├─> Submit quote request
   └─> Status: "Quote Requested"

3. View Quote Requests Page
   ├─> See all quote requests
   ├─> Status indicators:
   │   ├─> Pending (waiting for teen to respond)
   │   ├─> Quoted (teen provided quote)
   │   ├─> Accepted (quote accepted, booking created)
   │   └─> Rejected/Expired
   └─> Actions:
       ├─> View quote details
       ├─> Accept quote → Create booking
       ├─> Reject quote
       └─> Cancel request

4. Quote Details View
   ├─> See quote price
   ├─> See estimated duration
   ├─> See provider notes
   ├─> See expiration date
   └─> Actions:
       ├─> Accept Quote
       │   └─> Redirect to payment
       │       └─> Create booking with quote price
       └─> Reject Quote
           └─> Status: "Rejected"
```

### Teen/Provider Side Flow

```
1. My Services Dashboard
   └─> See quote requests count badge
       └─> Click to view quote requests

2. Quote Requests Page
   ├─> Filter by status (pending, quoted, accepted)
   ├─> See customer details
   ├─> See requested date/time
   └─> Actions:
       ├─> View request details
       ├─> Submit Quote
       └─> Decline Request

3. Submit Quote Form
   ├─> Enter price
   ├─> Enter estimated duration
   ├─> Add notes/terms
   ├─> Set expiration date (optional)
   └─> Submit
       └─> Status: "Quoted"
           └─> Customer notified

4. Quote Management
   ├─> View all quotes sent
   ├─> See quote status
   ├─> Edit quote (if not accepted)
   └─> When customer accepts:
       └─> Booking automatically created
           └─> Status: "Confirmed"
```

## API Endpoints

### Quote Requests

#### POST `/api/quotes/request`
Create a new quote request
```typescript
Request: {
  service_id: string;
  requested_date: string;
  requested_time: string;
  special_instructions?: string;
}

Response: {
  success: boolean;
  quote_request?: QuoteRequest;
  error?: string;
}
```

#### GET `/api/quotes/requests`
Get quote requests (filtered by user role)
- Customer: Gets their quote requests
- Provider: Gets quote requests for their services
```typescript
Query params:
  - status?: 'pending' | 'quoted' | 'accepted' | 'rejected'
  - service_id?: string

Response: {
  success: boolean;
  quote_requests: QuoteRequest[];
}
```

#### GET `/api/quotes/requests/[id]`
Get specific quote request details
```typescript
Response: {
  success: boolean;
  quote_request: QuoteRequest & {
    service: Service;
    customer: Profile;
    quotes?: Quote[];
  };
}
```

#### PATCH `/api/quotes/requests/[id]`
Update quote request (cancel, etc.)
```typescript
Request: {
  status?: 'cancelled' | 'rejected';
}
```

### Quotes

#### POST `/api/quotes`
Submit a quote for a quote request
```typescript
Request: {
  quote_request_id: string;
  price: number;
  estimated_duration?: number;
  notes?: string;
  valid_until?: string;
}

Response: {
  success: boolean;
  quote?: Quote;
  error?: string;
}
```

#### GET `/api/quotes/[id]`
Get specific quote details
```typescript
Response: {
  success: boolean;
  quote: Quote & {
    quote_request: QuoteRequest;
    provider: Profile;
  };
}
```

#### PATCH `/api/quotes/[id]`
Update quote (edit if not accepted)
```typescript
Request: {
  price?: number;
  estimated_duration?: number;
  notes?: string;
  valid_until?: string;
}
```

#### POST `/api/quotes/[id]/accept`
Customer accepts a quote
```typescript
Response: {
  success: boolean;
  booking?: Booking;
  error?: string;
}
// Creates booking with quote price
// Updates quote status to 'accepted'
// Updates quote_request status to 'accepted'
```

#### POST `/api/quotes/[id]/reject`
Customer rejects a quote
```typescript
Response: {
  success: boolean;
}
// Updates quote status to 'rejected'
```

## UI Components Needed

### Customer Side

1. **Service Details Page Updates**
   - Show "Request Quote" button instead of "Book Now" for quote-based services
   - Display quote request form modal

2. **Quote Request Form**
   - Date/time picker
   - Special instructions textarea
   - Submit button

3. **My Quote Requests Page** (`/my-quote-requests`)
   - List of all quote requests
   - Status badges
   - Quick actions (view, cancel)
   - Filter by status

4. **Quote Request Details Page** (`/quote-requests/[id]`)
   - Request details
   - Quote(s) received
   - Accept/Reject quote buttons
   - Quote comparison (if multiple quotes)

5. **Quote Card Component**
   - Price display
   - Duration
   - Provider info
   - Expiration date
   - Accept/Reject buttons

### Provider/Teen Side

1. **My Quote Requests Page** (`/provider/quote-requests`)
   - List of quote requests for their services
   - Status indicators
   - Quick actions (quote, decline)

2. **Quote Request Details Page**
   - Customer info
   - Request details
   - Submit quote form
   - View existing quotes (if any)

3. **Submit Quote Form**
   - Price input
   - Duration input
   - Notes textarea
   - Expiration date picker
   - Submit button

4. **Quote Management Dashboard**
   - All quotes sent
   - Acceptance rate
   - Pending quotes count
   - Recent activity

## Status Flow

### Quote Request Statuses
```
pending → quoted → accepted → (booking created)
       ↘ rejected
       ↘ cancelled (by customer)
       ↘ expired (if no quote after X days)
```

### Quote Statuses
```
pending → accepted → (booking created)
       ↘ rejected (by customer)
       ↘ expired (past valid_until date)
```

## Business Rules

1. **Quote Request**
   - Customer can only have one active quote request per service at a time
   - Customer can cancel their own quote request if status is 'pending' or 'quoted'
   - Quote requests expire after 7 days if no quote is provided

2. **Quote Submission**
   - Provider can submit multiple quotes for the same request (revised quotes)
   - Only the latest quote is shown as active
   - Provider can edit quote if status is 'pending'
   - Quote expires based on `valid_until` date

3. **Quote Acceptance**
   - Customer can only accept one quote per request
   - Accepting a quote automatically creates a booking
   - Booking uses the quote price (not service price)
   - Booking status starts as 'pending' (provider still needs to confirm)

4. **Notifications**
   - Customer: Notified when quote is submitted
   - Provider: Notified when quote request is created
   - Provider: Notified when quote is accepted/rejected
   - Customer: Reminder if quote is about to expire

## Implementation Priority

### Phase 1: Core Functionality
1. Database migrations (quote_requests, quotes tables)
2. API endpoints for quote requests
3. API endpoints for quotes
4. Basic UI for requesting quotes (customer)
5. Basic UI for submitting quotes (provider)

### Phase 2: Enhanced Features
1. Quote acceptance flow
2. Booking creation from accepted quote
3. Quote management dashboard
4. Notifications

### Phase 3: Advanced Features
1. Quote expiration handling
2. Multiple quote revisions
3. Quote comparison UI
4. Analytics and reporting

## Edge Cases to Handle

1. **Multiple Quotes**: Provider submits revised quote before customer accepts first one
2. **Expired Quotes**: Auto-expire quotes past valid_until date
3. **Service Deactivation**: What happens to pending quote requests if service is paused?
4. **Concurrent Acceptances**: Prevent double-booking if customer accepts quote while provider confirms another booking
5. **Price Changes**: Handle if service price changes while quote request is pending
6. **Payment**: Ensure quote price is used for payment, not service price

## Security Considerations

1. **Authorization**
   - Customers can only view/modify their own quote requests
   - Providers can only view/modify quote requests for their services
   - Providers can only submit quotes for their own services

2. **Validation**
   - Quote price must be positive
   - Quote expiration must be in the future
   - Quote request date/time must be in the future

3. **Rate Limiting**
   - Limit quote requests per customer per service
   - Limit quote submissions per provider per request

