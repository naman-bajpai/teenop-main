import nodemailer from 'nodemailer';
import { PARENT_APPROVAL_TEMPLATES } from '@/lib/parent-approval-templates';

// ---------------------------------------------------------------------------
// Shared design helpers
// ---------------------------------------------------------------------------

const BASE_STYLES = `
  body { margin: 0; padding: 0; background: #f4f4f7; font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
  .wrapper { background: #f4f4f7; padding: 40px 16px; }
  .container { max-width: 600px; margin: 0 auto; }
  .brand { text-align: center; margin-bottom: 24px; }
  .brand-name { font-size: 24px; font-weight: 800; color: #434c9d; letter-spacing: -0.5px; }
  .brand-dot { color: #ff725a; }
  .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .card-header { background: linear-gradient(135deg, #434c9d 0%, #5a6bc4 100%); padding: 28px 32px; }
  .card-header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3; }
  .card-header p { margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8); }
  .card-body { padding: 28px 32px; }
  .card-body p { margin: 0 0 14px; font-size: 15px; }
  .details-box { background: #f8f9fc; border: 1px solid #e8eaf0; border-radius: 10px; padding: 18px 20px; margin: 20px 0; }
  .details-box p { margin: 0 0 8px; font-size: 14px; }
  .details-box p:last-child { margin: 0; }
  .details-box strong { color: #434c9d; }
  .section-title { font-size: 15px; font-weight: 700; color: #434c9d; margin: 20px 0 8px; }
  ul { padding-left: 20px; margin: 0 0 16px; }
  ul li { font-size: 14px; margin-bottom: 6px; color: #555; }
  .btn { display: inline-block; background: linear-gradient(135deg, #434c9d 0%, #5a6bc4 100%); color: #ffffff !important; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 8px 0; }
  .btn-center { text-align: center; margin: 24px 0; }
  .divider { border: none; border-top: 1px solid #e8eaf0; margin: 20px 0; }
  .footer { text-align: center; padding: 24px 16px 8px; font-size: 13px; color: #999; }
  .footer a { color: #434c9d; text-decoration: none; }
  .accent { color: #ff725a; font-weight: 700; }
`;

function buildEmail(title: string, headerTitle: string, headerSubtitle: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand">
        <span class="brand-name">Teen<span class="brand-dot">Op</span></span>
      </div>
      <div class="card">
        <div class="card-header">
          <h1>${headerTitle}</h1>
          ${headerSubtitle ? `<p>${headerSubtitle}</p>` : ''}
        </div>
        <div class="card-body">
          ${body}
        </div>
      </div>
      <div class="footer">
        <p>Questions? Reach us at <a href="mailto:teenop.co@gmail.com">teenop.co@gmail.com</a></p>
        <p>© ${new Date().getFullYear()} TeenOp &nbsp;·&nbsp; <a href="https://www.teenop.com">www.teenop.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Email service
// ---------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Service provider — booking confirmed
  // -------------------------------------------------------------------------
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
    const subject = `Booking confirmed: ${data.serviceName} on ${data.date}`;
    const html = buildEmail(
      'Booking Confirmed',
      'Your booking is confirmed!',
      'Here are the details for your upcoming service.',
      `
      <div class="details-box">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Buyer:</strong> ${data.buyerName}</p>
        <p><strong>Date & Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
        <p><strong>Location:</strong> ${data.location}</p>
        <p><strong>Duration:</strong> ${data.duration} minutes</p>
        <p><strong>Price:</strong> $${data.totalPrice}</p>
      </div>

      <p class="section-title">Next steps</p>
      <ul>
        <li>Message the buyer in TeenOp if you have any questions.</li>
        <li>Bring any required materials and arrive a few minutes early.</li>
        <li>If something changes, cancel immediately and message your buyer through TeenOp.</li>
      </ul>

      <p class="section-title">Safety & payments</p>
      <ul>
        <li>Communicate and get paid only through TeenOp.</li>
        <li>For in-person sessions, choose a safe location and make sure a parent/guardian is aware.</li>
      </ul>

      <p>Thanks for using TeenOp! We hope you have a great service.</p>
      `
    );
    return this.sendEmail(data.providerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Service provider — new booking request
  // -------------------------------------------------------------------------
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
    const subject = `New booking request: ${data.serviceName}`;
    const html = buildEmail(
      'New Booking Request',
      'You have a new booking request!',
      'Someone wants to book your service — review the details below.',
      `
      <div class="details-box">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Requested by:</strong> ${data.buyerName}</p>
        <p><strong>Date & Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
        <p><strong>Location:</strong> ${data.location}</p>
        <p><strong>Duration:</strong> ${data.duration} minutes</p>
        <p><strong>Total Price:</strong> $${data.totalPrice}</p>
        <p><strong>Booking ID:</strong> #${data.bookingId}</p>
        ${data.specialInstructions ? `<p><strong>Special Instructions:</strong> ${data.specialInstructions}</p>` : ''}
      </div>

      <p class="section-title">What's next?</p>
      <ul>
        <li>Log in to your TeenOp account to accept or decline this request.</li>
        <li>If you accept, the booking will be confirmed and you'll receive payment details.</li>
        <li>Use TeenOp messages to communicate with the buyer if needed.</li>
      </ul>

      <p><strong>Please respond as soon as possible</strong> so the buyer knows whether their booking is confirmed.</p>
      `
    );
    return this.sendEmail(data.providerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Buyer — booking rejected
  // -------------------------------------------------------------------------
  async sendBuyerRejection(data: {
    buyerName: string;
    buyerEmail: string;
    serviceName: string;
  }) {
    const subject = 'Update on your TeenOp booking request';
    const html = buildEmail(
      'Booking Update',
      'Update on your booking request',
      '',
      `
      <p>Hi ${data.buyerName},</p>
      <p>Unfortunately, the teen provider wasn't able to accept the proposed time slot for <strong>${data.serviceName}</strong>.</p>
      <p>You can still book this service by returning to the listing and selecting another available time that works for you.</p>
      <p>Thank you for your understanding — we hope you find a time that works soon!</p>
      `
    );
    return this.sendEmail(data.buyerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Buyer — 24-hour reminder
  // -------------------------------------------------------------------------
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
    const subject = 'Reminder: Your service is tomorrow';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const html = buildEmail(
      'Service Reminder',
      'Your service is tomorrow!',
      "Here's a quick reminder of what's coming up.",
      `
      <p>Hi ${data.buyerName},</p>
      <p>You have an upcoming service with TeenOp scheduled for tomorrow.</p>

      <div class="details-box">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Teen Provider:</strong> ${data.teenName}</p>
        <p><strong>Date & Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
        <p><strong>Location:</strong> ${data.location}</p>
      </div>

      <p>You can review the details or send a message to your teen provider through TeenOp.</p>

      <div class="btn-center">
        <a href="${appUrl}/my-bookings" class="btn">View Booking</a>
      </div>

      <p>Thank you for supporting local teen entrepreneurs!</p>
      `
    );
    return this.sendEmail(data.buyerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Buyer — 3-hour reminder
  // -------------------------------------------------------------------------
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
    const html = buildEmail(
      'Service Starting Soon',
      'Your service starts in 3 hours',
      "Make sure you're ready!",
      `
      <p>Hi ${data.buyerName},</p>
      <p>Your TeenOp service is coming up very soon.</p>

      <div class="details-box">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Teen Provider:</strong> ${data.teenName}</p>
        <p><strong>Time:</strong> ${data.time} ${data.timeZone}</p>
        <p><strong>Location:</strong> ${data.location}</p>
      </div>

      <p>You can review your booking or send a message to your teen provider through TeenOp.</p>

      <div class="btn-center">
        <a href="${appUrl}/my-bookings" class="btn">View Booking</a>
      </div>

      <p>We hope you enjoy your service!</p>
      `
    );
    return this.sendEmail(data.buyerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Service provider — 24-hour reminder
  // -------------------------------------------------------------------------
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
    const subject = 'Reminder: Your service is tomorrow';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const locationDisplay = data.location === 'Online' ? 'Online' : data.location;
    const html = buildEmail(
      'Service Reminder',
      'Your service is tomorrow!',
      'Take a moment to review the details and prepare.',
      `
      <p>Hi ${data.providerName},</p>
      <p>This is a reminder that you have an upcoming service scheduled for tomorrow.</p>

      <div class="details-box">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Customer:</strong> ${data.buyerName}</p>
        <p><strong>Date & Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
        <p><strong>Location:</strong> ${locationDisplay}</p>
      </div>

      <div class="btn-center">
        <a href="${appUrl}/my-teen-hustle" class="btn">View Booking</a>
      </div>

      <p>We hope everything goes great!</p>
      `
    );
    return this.sendEmail(data.providerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Service provider — 3-hour reminder
  // -------------------------------------------------------------------------
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
    const html = buildEmail(
      'Service Starting Soon',
      'Your service starts in 3 hours!',
      "Make sure you're ready to go.",
      `
      <p>Hi ${data.providerName},</p>
      <p>Your TeenOp service is coming up soon — here are the details.</p>

      <div class="details-box">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Customer:</strong> ${data.buyerName}</p>
        <p><strong>Time:</strong> ${data.time}${data.timeZone ? ' ' + data.timeZone : ''}</p>
        <p><strong>Location:</strong> ${data.location}</p>
      </div>

      <p>Please arrive on time or message your customer through TeenOp if anything changes.</p>

      <div class="btn-center">
        <a href="${appUrl}/my-teen-hustle" class="btn">View Booking</a>
      </div>

      <p>Good luck!</p>
      `
    );
    return this.sendEmail(data.providerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Service provider — completion reminder
  // -------------------------------------------------------------------------
  async sendServiceProviderCompletionReminder(data: {
    providerName: string;
    providerEmail: string;
    serviceName: string;
    bookingId: string;
  }) {
    const subject = 'Action needed: Mark your service complete';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const html = buildEmail(
      'Mark Service Complete',
      'Action needed: Mark your service complete',
      'It only takes a moment — and unlocks tips and reviews!',
      `
      <p>Hi ${data.providerName},</p>
      <p>Your service <strong>${data.serviceName}</strong> should be wrapping up. Mark it complete so your customer can tip you and leave a review.</p>

      <ul>
        <li>Click the button below to mark your service as complete.</li>
        <li>Once marked, your customer will be able to tip you and leave a rating.</li>
      </ul>

      <div class="btn-center">
        <a href="${appUrl}/my-teen-hustle" class="btn">Mark Service Complete</a>
      </div>
      `
    );
    return this.sendEmail(data.providerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Parent verification email
  // -------------------------------------------------------------------------
  async sendParentVerificationEmail(data: {
    parentEmail: string;
    childFirstName: string;
    childLastName: string;
    verifyLink: string;
  }) {
    const subject = PARENT_APPROVAL_TEMPLATES.parentEmail.subject;
    const childName = `${data.childFirstName} ${data.childLastName}`;
    const body = PARENT_APPROVAL_TEMPLATES.parentEmail.body;
    const html = buildEmail(
      'Verify your child\'s account',
      PARENT_APPROVAL_TEMPLATES.parentEmail.heading,
      '',
      `
      <p>Hello,</p>
      <p><strong>${childName}</strong> has created a TeenOp account and listed you as their parent or guardian.</p>
      <p>${body[0]}</p>
      <p>${body[1]}</p>

      <div class="btn-center">
        <a href="${data.verifyLink}" class="btn">${PARENT_APPROVAL_TEMPLATES.parentEmail.ctaLabel}</a>
      </div>

      <p>${body[2]}</p>

      <hr class="divider">
      <p style="font-size:13px; color:#999;">This link expires in 7 days. If it has expired, your child can sign up again and you will receive a new email.</p>
      `
    );
    return this.sendEmail(data.parentEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Teen approval email
  // -------------------------------------------------------------------------
  async sendTeenApprovalEmail(data: {
    teenEmail: string;
    teenFirstName: string;
    loginLink: string;
  }) {
    const template = PARENT_APPROVAL_TEMPLATES.teenApprovedEmail;
    const html = buildEmail(
      template.subject,
      template.heading,
      '',
      `
      <p>Hi ${data.teenFirstName},</p>
      ${template.body.map((paragraph) => `<p>${paragraph}</p>`).join('')}

      <div class="btn-center">
        <a href="${data.loginLink}" class="btn">${template.ctaLabel}</a>
      </div>
      `
    );
    return this.sendEmail(data.teenEmail, template.subject || 'Your TeenOp account has been approved', html);
  }
}

export const emailService = new EmailService();
