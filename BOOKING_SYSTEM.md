# TeenOp Booking System

This document describes the booking system implementation for the TeenOp platform.

## Overview

The booking system allows users to request services from teen providers and enables providers to manage their booking requests.

## Features

### For Service Requesters (Users)
- View detailed service information
- Request services with preferred date/time
- Add special instructions
- Cancel pending requests
- View booking status updates

### For Service Providers (Teens)
- Receive booking requests
- Confirm or reject requests
- Mark services as in progress
- Complete services
- View all their booking requests

## Database Schema

### Bookings Table
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  service_id UUID REFERENCES services(id),
  user_id UUID REFERENCES profiles(id),
  status booking_status DEFAULT 'pending',
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  duration INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Booking Status Enum
- `pending` - Initial status when booking is created
- `confirmed` - Provider has confirmed the booking
- `in_progress` - Service is currently being performed
- `completed` - Service has been completed
- `cancelled` - Booking was cancelled by the requester
- `rejected` - Booking was rejected by the provider

## API Endpoints

### POST /api/bookings
Create a new booking request.

**Request Body:**
```json
{
  "service_id": "uuid",
  "requested_date": "2024-01-15",
  "requested_time": "14:30",
  "special_instructions": "Optional instructions"
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "service_id": "uuid",
    "user_id": "uuid",
    "status": "pending",
    "requested_date": "2024-01-15",
    "requested_time": "14:30",
    "duration": 60,
    "total_price": 25.00,
    "special_instructions": "Optional instructions",
    "created_at": "2024-01-10T10:00:00Z",
    "updated_at": "2024-01-10T10:00:00Z",
    "service": { ... },
    "user": { ... }
  }
}
```

### GET /api/bookings
Get all bookings for the current user.

**Query Parameters:**
- `type` (optional): "requested" or "received"

### GET /api/bookings/[id]
Get a specific booking by ID.

### PATCH /api/bookings/[id]
Update a booking (status changes, special instructions).

**Request Body:**
```json
{
  "status": "confirmed",
  "special_instructions": "Updated instructions"
}
```

### DELETE /api/bookings/[id]
Delete a pending booking.

## Frontend Pages

### Service Details Page (`/services/[id]`)
- Displays comprehensive service information
- Shows provider details and qualifications
- Booking form with date/time selection
- Special instructions input
- Real-time availability checking

### My Bookings Page (`/my-bookings`)
- Tabbed interface for requested vs received bookings
- Status management for providers
- Booking history and details
- Action buttons based on booking status

## Security Features

### Row Level Security (RLS)
- Users can only view their own bookings
- Service providers can view bookings for their services
- Prevents users from booking their own services
- Secure status updates with proper permissions

### Validation
- Date/time validation (no past dates)
- Duplicate booking prevention
- Price and duration validation
- Required field validation

### Constraints
- Unique booking slots (no double booking)
- Future date requirement
- Positive price and duration values

## Usage Flow

1. **User browses services** → Clicks "View Details"
2. **Service details page** → User fills booking form
3. **Booking created** → Status: "pending"
4. **Provider receives notification** → Reviews request
5. **Provider confirms/rejects** → Status: "confirmed" or "rejected"
6. **Service execution** → Status: "in_progress"
7. **Service completion** → Status: "completed"

## Future Enhancements

- Email notifications for status changes
- Push notifications for mobile app
- Payment integration
- Rating and review system
- Calendar integration
- Recurring bookings
- Booking modifications
- Cancellation policies
