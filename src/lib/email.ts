import nodemailer from 'nodemailer';
import { PARENT_APPROVAL_TEMPLATES } from '@/lib/parent-approval-templates';

// Email service for sending notifications
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"TeenOp" <${process.env.SMTP_FROM || 'noreply@teenop.com'}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });
      
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Service provider confirmation email
  async sendServiceProviderConfirmation(data: {
    providerName: string;
    providerEmail: string;
    serviceName: string;
    buyerName: string;
    date: string;
    time: string;
    timeZone: string;
    location: string;
    duration: number;
    totalPrice: number;
  }) {
    const subject = `Your TeenOp booking is confirmed: ${data.serviceName} on ${data.date}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .booking-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Great news—your service has been confirmed!</h1>
            <p>Here are the details:</p>
          </div>
          
          <div class="content">
            <div class="booking-details">
              <h3>Booking Details</h3>
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Buyer:</strong> ${data.buyerName}</p>
              <p><strong>Date & Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
              <p><strong>Location:</strong> ${data.location}</p>
              <p><strong>Duration:</strong> ${data.duration} minutes</p>
              <p><strong>Price:</strong> $${data.totalPrice}</p>
            </div>

            <h3>Next steps</h3>
            <ul>
              <li>Review the details and message the buyer in TeenOp if you have questions.</li>
              <li>Bring any required materials and arrive a few minutes early (or join the call on time).</li>
              <li>If something changes, cancel the service immediately and message your buyer on TeenOp messages to inform them of the cancellation. If they want to rebook with you, they will have to do so by booking another session.</li>
            </ul>

            <h3>Safety & payments</h3>
            <ul>
              <li>Communicate and get paid only through TeenOp.</li>
              <li>For in-person sessions, choose a safe, appropriate location and make sure a parent/guardian is aware.</li>
            </ul>

            <p>Thanks for using TeenOp! We hope you have a successful service!</p>
          </div>

          <div class="footer">
            <p>Best,<br>The TeenOp Team</p>
            <p>teenop.co@gmail.com | www.teenop.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.providerEmail, subject, html);
  }

  // Service provider request notification (when a booking is requested)
  async sendServiceProviderRequest(data: {
    providerName: string;
    providerEmail: string;
    serviceName: string;
    buyerName: string;
    date: string;
    time: string;
    timeZone: string;
    location: string;
    duration: number;
    totalPrice: number;
    bookingId: string;
    specialInstructions?: string;
  }) {
    const subject = `New booking request for ${data.serviceName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Booking Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .booking-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #434c9d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You have a new booking request!</h1>
            <p>Someone wants to book your service. Review the details below.</p>
          </div>
          
          <div class="content">
            <div class="booking-details">
              <h3>Booking Request Details</h3>
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Requested by:</strong> ${data.buyerName}</p>
              <p><strong>Date & Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
              <p><strong>Location:</strong> ${data.location}</p>
              <p><strong>Duration:</strong> ${data.duration} minutes</p>
              <p><strong>Total Price:</strong> $${data.totalPrice}</p>
              <p><strong>Booking ID:</strong> #${data.bookingId}</p>
              ${data.specialInstructions ? `<p><strong>Special Instructions:</strong> ${data.specialInstructions}</p>` : ''}
            </div>

            <h3>What's next?</h3>
            <ul>
              <li>Log in to your TeenOp account to review and respond to this booking request.</li>
              <li>You can accept or reject the request based on your availability.</li>
              <li>If you accept, the booking will be confirmed and you'll receive payment details.</li>
              <li>If you need to discuss details with the buyer, use TeenOp messages to communicate.</li>
            </ul>

            <p><strong>Important:</strong> Please respond to this request as soon as possible so the buyer knows if their booking is confirmed.</p>
            
            <p>Thanks for being part of TeenOp!</p>
          </div>

          <div class="footer">
            <p>Best,<br>The TeenOp Team</p>
            <p>teenop.co@gmail.com | www.teenop.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.providerEmail, subject, html);
  }

  // Buyer rejection email
  async sendBuyerRejection(data: {
    buyerName: string;
    buyerEmail: string;
    serviceName: string;
  }) {
    const subject = 'Update on Your TeenOp Booking Request';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Update on Your TeenOp Booking Request</h1>
          </div>
          
          <div class="content">
            <p>Hi ${data.buyerName},</p>
            
            <p>Unfortunately, the teen provider wasn't able to accept the proposed time slot for your booking. You can still book the service by returning to the service listing and selecting another available time that works for you.</p>
            
            <p>Thank you for understanding, and we hope you find a time that works soon!</p>
          </div>

          <div class="footer">
            <p>Best,<br>The TeenOp Team</p>
            <p>teenop.co@gmail.com | www.teenop.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.buyerEmail, subject, html);
  }

  // Buyer 24-hour reminder email
  async sendBuyer24HourReminder(data: {
    buyerName: string;
    buyerEmail: string;
    serviceName: string;
    teenName: string;
    date: string;
    time: string;
    timeZone: string;
    location: string;
    bookingId: string;
  }) {
    const subject = 'Reminder: Scheduled Service Tomorrow';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .booking-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #434c9d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reminder: Scheduled Service Tomorrow</h1>
          </div>

          <div class="content">
            <p>Hello,</p>

            <p>You have an upcoming service with TeenOp scheduled for tomorrow!</p>

            <div class="booking-details">
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
              <p><strong>Teen Provider:</strong> ${data.teenName}</p>
            </div>

            <p>If you would like to review the details or send a message to your teen provider, you can do so below.</p>

            <p style="text-align: center;">
              <a href="${appUrl}/my-bookings" class="button">View Booking</a>
            </p>

            <p>Thank you for supporting local teen entrepreneurs on TeenOp!</p>
          </div>

          <div class="footer">
            <p>Best,<br>The TeenOp Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.buyerEmail, subject, html);
  }

  // Buyer 3-hour reminder email
  async sendBuyer3HourReminder(data: {
    buyerName: string;
    buyerEmail: string;
    serviceName: string;
    teenName: string;
    time: string;
    timeZone: string;
    location: string;
    bookingId: string;
  }) {
    const subject = 'Your service starts in 3 hours';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your service starts in 3 hours</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .booking-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #434c9d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your service starts in 3 hours</h1>
          </div>

          <div class="content">
            <p>Hello,</p>

            <p>Your scheduled TeenOp service will begin soon!</p>

            <div class="booking-details">
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Time:</strong> ${data.time} ${data.timeZone}</p>
              <p><strong>Teen Helper:</strong> ${data.teenName}</p>
            </div>

            <p>You can review your booking or send a message to your teen provider through TeenOp.</p>

            <p style="text-align: center;">
              <a href="${appUrl}/my-bookings" class="button">View Booking</a>
            </p>

            <p>Thank you for using TeenOp. We hope you enjoy your service!</p>
          </div>

          <div class="footer">
            <p>Best,<br>The TeenOp Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.buyerEmail, subject, html);
  }

  // Service provider 24-hour reminder email
  async sendServiceProvider24HourReminder(data: {
    providerName: string;
    providerEmail: string;
    serviceName: string;
    buyerName: string;
    date: string;
    time: string;
    timeZone: string;
    location: string;
    bookingId: string;
  }) {
    const subject = 'REMINDER: Scheduled Service Tomorrow!';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const locationDisplay = data.location === 'Online' ? 'Online' : data.location;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>REMINDER: Scheduled Service Tomorrow!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .booking-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #434c9d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>REMINDER: Scheduled Service Tomorrow!</h1>
          </div>

          <div class="content">
            <p>Hello,</p>

            <p>This is a reminder that you have an upcoming service scheduled for tomorrow!</p>

            <div class="booking-details">
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Customer:</strong> ${data.buyerName}</p>
              <p><strong>Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
              <p><strong>Location:</strong> ${locationDisplay}</p>
            </div>

            <p>Take a moment to review the details and prepare.</p>

            <p style="text-align: center;">
              <a href="${appUrl}/my-teen-hustle" class="button">View Booking</a>
            </p>

            <p>We hope everything goes great!</p>
          </div>

          <div class="footer">
            <p>Best,<br>The TeenOp Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.providerEmail, subject, html);
  }

  // Service provider 3-hour reminder email
  async sendServiceProvider3HourReminder(data: {
    providerName: string;
    providerEmail: string;
    serviceName: string;
    buyerName: string;
    time: string;
    timeZone?: string;
    location: string;
    bookingId: string;
  }) {
    const subject = 'Your service starts in 3 hours!';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your service starts in 3 hours!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .booking-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #434c9d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your service starts in 3 hours!</h1>
          </div>

          <div class="content">
            <p>Hi,</p>

            <p>Your service is coming up soon!</p>

            <div class="booking-details">
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Time:</strong> ${data.time}${data.timeZone ? ' ' + data.timeZone : ''}</p>
              <p><strong>Customer:</strong> ${data.buyerName}</p>
            </div>

            <p>Please make sure you arrive on time or message your customer on TeenOp if anything changes.</p>

            <p style="text-align: center;">
              <a href="${appUrl}/my-teen-hustle" class="button">View Booking</a>
            </p>

            <p>Good luck!</p>
          </div>

          <div class="footer">
            <p>Best,<br>The TeenOp Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.providerEmail, subject, html);
  }

  // Service provider completion reminder email
  async sendServiceProviderCompletionReminder(data: {
    providerName: string;
    providerEmail: string;
    serviceName: string;
    bookingId: string;
  }) {
    const subject = 'Action Needed: Mark your service complete';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Action Needed: Mark your service complete</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .booking-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #434c9d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Action Needed: Mark your service complete</h1>
            <p>It's time to mark your service as completed so your customer is able to tip you and leave a rating and review!</p>
          </div>
          
          <div class="content">
            <div class="booking-details">
              <h3>Service Details</h3>
              <p><strong>Service:</strong> ${data.serviceName}</p>
            </div>

            <h3>What's next?</h3>
            <ul>
              <li>Click the button below to mark your service as complete.</li>
              <li>It only takes a moment and helps you get credit for your work!</li>
              <li>Once marked complete, your customer will be able to tip you and leave a rating and review.</li>
            </ul>

            <p style="text-align: center; margin: 20px 0;">
              <a href="${appUrl}/my-teen-hustle" class="button">Click here to mark your service complete</a>
            </p>
          </div>

          <div class="footer">
            <p>Best,<br>The TeenOp Team</p>
            <p><a href="${appUrl}" style="color: #434c9d; text-decoration: none;">www.teenop.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.providerEmail, subject, html);
  }

  // Parent/guardian verification email when a teen signs up
  async sendParentVerificationEmail(data: {
    parentEmail: string;
    childFirstName: string;
    childLastName: string;
    verifyLink: string;
  }) {
    const subject = PARENT_APPROVAL_TEMPLATES.parentEmail.subject;
    const childName = `${data.childFirstName} ${data.childLastName}`;
    const body = PARENT_APPROVAL_TEMPLATES.parentEmail.body;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify your child's account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .button { display: inline-block; background: #434c9d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: bold; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
          .highlight { color: #434c9d; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${PARENT_APPROVAL_TEMPLATES.parentEmail.heading}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p><span class="highlight">${childName}</span> has created a TeenOp account and listed you as their parent or guardian.</p>
            <p>${body[0]}</p>
            <p>${body[1]}</p>
            <p><a href="${data.verifyLink}" class="button">${PARENT_APPROVAL_TEMPLATES.parentEmail.ctaLabel}</a></p>
            <p>${body[2]}</p>
          </div>
          <div class="footer">
            <p>This link expires in 7 days. If it has expired, your child can sign up again and you will receive a new email.</p>
            <p>— The TeenOp Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail(data.parentEmail, subject, html);
  }

  async sendTeenApprovalEmail(data: {
    teenEmail: string;
    teenFirstName: string;
    loginLink: string;
  }) {
    const template = PARENT_APPROVAL_TEMPLATES.teenApprovedEmail;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${template.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .button { display: inline-block; background: #434c9d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: bold; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${template.heading}</h1>
          </div>
          <div class="content">
            <p>Hi ${data.teenFirstName},</p>
            ${template.body.map((paragraph) => `<p>${paragraph}</p>`).join("")}
            <p><a href="${data.loginLink}" class="button">${template.ctaLabel}</a></p>
          </div>
          <div class="footer">
            <p>— The TeenOp Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.teenEmail, template.subject || "Your TeenOp account has been approved", html);
  }
}

export const emailService = new EmailService();
