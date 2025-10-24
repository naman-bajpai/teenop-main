# Notification System Setup Guide

This guide explains how to set up the automatic email and SMS notifications for the TeenOp platform.

## Overview

The notification system includes:
- **Email notifications** for service confirmations, rejections, and reminders
- **SMS notifications** for service providers
- **Automatic reminders** sent 24 hours and 3 hours before scheduled services
- **Cron job** for processing reminder notifications

## Required Environment Variables

Copy the `env.example` file to `.env.local` and fill in the following variables:

### Database (Already configured)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Email Configuration (SMTP)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@teenop.com
```

**Gmail Setup:**
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: Google Account → Security → 2-Step Verification → App passwords
3. Use the App Password as `SMTP_PASS`

### SMS Configuration (Twilio)
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Twilio Setup:**
1. Sign up for a Twilio account
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number from Twilio Console → Phone Numbers → Manage → Buy a number

### App Configuration
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
INTERNAL_API_SECRET=your_internal_api_secret
CRON_SECRET=your_cron_secret
```

## Installation

1. Install the required dependencies:
```bash
npm install nodemailer twilio
npm install --save-dev @types/nodemailer
```

## Notification Types

### Service Provider Notifications

#### 1. Service Confirmation (Email + SMS)
- **Triggered when:** Service provider accepts a booking
- **Email:** Detailed confirmation with booking details and next steps
- **SMS:** Short confirmation message

#### 2. 24-Hour Reminder (SMS)
- **Triggered:** 24 hours before scheduled service
- **Content:** Reminder about tomorrow's service

#### 3. 3-Hour Reminder (SMS)
- **Triggered:** 3 hours before scheduled service
- **Content:** Final reminder about upcoming service

### Buyer Notifications

#### 1. Service Rejection (Email)
- **Triggered when:** Service provider rejects a booking
- **Content:** Notification that the time slot wasn't available

#### 2. 24-Hour Reminder (Email)
- **Triggered:** 24 hours before scheduled service
- **Content:** Detailed reminder with booking information

#### 3. 3-Hour Reminder (Email)
- **Triggered:** 3 hours before scheduled service
- **Content:** Final reminder about upcoming service

## API Endpoints

### Send Notification
```
POST /api/notifications/send
```

**Body:**
```json
{
  "type": "service_provider_confirmation",
  "bookingId": "booking-id"
}
```

**Available types:**
- `service_provider_confirmation`
- `buyer_rejection`
- `buyer_24_hour_reminder`
- `buyer_3_hour_reminder`
- `service_provider_24_hour_reminder`
- `service_provider_3_hour_reminder`

### Cron Job for Reminders
```
GET /api/cron/reminders
```

**Headers:**
```
Authorization: Bearer your_cron_secret
```

## Setting Up Cron Jobs

### Option 1: Vercel Cron Jobs (Recommended)
1. Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Option 2: External Cron Service
Use services like:
- **cron-job.org**
- **EasyCron**
- **SetCronJob**

Set up to call: `https://your-domain.com/api/cron/reminders` every 6 hours.

### Option 3: Server Cron (Self-hosted)
Add to your server's crontab:
```bash
0 */6 * * * curl -H "Authorization: Bearer your_cron_secret" https://your-domain.com/api/cron/reminders
```

## Database Requirements

The notification system requires the following database structure (already exists):

### Tables Used:
- `bookings` - Main booking information
- `services` - Service details
- `profiles` - User profile information

### Required Fields:
- `profiles.email` - For email notifications
- `profiles.phone` - For SMS notifications
- `bookings.status` - To determine which notifications to send
- `bookings.requested_date` and `bookings.requested_time` - For reminder scheduling

## Testing

### Test Email Notifications
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_internal_api_secret" \
  -d '{
    "type": "service_provider_confirmation",
    "bookingId": "your-booking-id"
  }'
```

### Test SMS Notifications
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_internal_api_secret" \
  -d '{
    "type": "service_provider_24_hour_reminder",
    "bookingId": "your-booking-id"
  }'
```

### Test Cron Job
```bash
curl -H "Authorization: Bearer your_cron_secret" \
  http://localhost:3000/api/cron/reminders
```

## Troubleshooting

### Email Issues
- Check SMTP credentials
- Verify Gmail App Password is correct
- Check firewall/network restrictions
- Review email provider limits

### SMS Issues
- Verify Twilio credentials
- Check phone number format (+1234567890)
- Ensure sufficient Twilio account balance
- Check Twilio phone number is verified

### Cron Job Issues
- Verify CRON_SECRET matches
- Check external cron service configuration
- Review server logs for errors
- Ensure NEXT_PUBLIC_APP_URL is correct

## Security Notes

- Keep all API secrets secure
- Use environment variables for all sensitive data
- Implement rate limiting for notification endpoints
- Monitor notification usage to prevent abuse
- Consider implementing notification preferences for users

## Monitoring

- Monitor email delivery rates
- Track SMS delivery success
- Log failed notifications
- Set up alerts for cron job failures
- Monitor Twilio account balance
