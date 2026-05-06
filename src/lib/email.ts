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
      const standardizedHtml = this.ensureStandardEmailTemplate(subject, html);
      const info = await this.transporter.sendMail({
        from: `"TeenOp" <${process.env.SMTP_FROM || 'noreply@teenop.com'}>`,
        to,
        subject,
        html: standardizedHtml,
        text: text || this.stripHtml(standardizedHtml),
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

  /**
   * Enforce a single visual template across all outbound emails.
   * If a caller passes a full TeenOp template already, keep it as-is.
   * Otherwise, wrap the content in the shared TeenOp layout.
   */
  private ensureStandardEmailTemplate(subject: string, html: string): string {
    const trimmed = html.trim();
    const alreadyStandardized =
      trimmed.includes('class="wrapper"') &&
      trimmed.includes('class="card"') &&
      trimmed.includes('Teen<span class="brand-dot">Op</span>');

    if (alreadyStandardized) return html;

    // Normalize callers that pass full HTML documents so we can still enforce
    // one shared TeenOp visual format.
    const normalizedBody = this.extractBodyContent(trimmed);
    const headerTitle = subject || 'TeenOp Update';
    const headerSubtitle = 'Important update from TeenOp';
    return buildEmail(subject || 'TeenOp Update', headerTitle, headerSubtitle, normalizedBody);
  }

  private extractBodyContent(html: string): string {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch?.[1]) return bodyMatch[1].trim();
    return html;
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
    const subject = `Action Needed: Service Request on TeenOp!`;
    const html = buildEmail(
      'Service Request on TeenOp',
      'Action Needed: Service Request on TeenOp!',
      'You received a new booking request from a community member.',
      `
      <p>Hi ${data.providerName},</p>
      <p>You’ve received a new service request from a community member.</p>
      <p>Review the details and choose to accept, propose a new time that works for you, or decline the service request.</p>

      <div class="details-box">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Requested by:</strong> ${data.buyerName}</p>
        <p><strong>Date & Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
        <p><strong>Location:</strong> ${data.location}</p>
      </div>

      <div class="btn-center">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com'}/my-teen-hustle" class="btn">View Request</a>
      </div>

      <p>Responding quickly helps you secure bookings and build trust.</p>
      <p>Best,<br>The TeenOp Team</p>
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
    const subject = 'Update on your service request';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const html = buildEmail(
      'Service Request Update',
      'Update on your service request',
      '',
      `
      <p>Hi ${data.buyerName},</p>
      <p>Your teen provider is unable to move forward with your request at this time.</p>
      <p>If you'd like, you can submit a new request with a different time or explore other teens available on TeenOp.</p>
      <div class="btn-center">
        <a href="${appUrl}/my-requests" class="btn">View My Requests</a>
      </div>
      <div class="btn-center">
        <a href="${appUrl}/neighborhood" class="btn">View Neighborhood</a>
      </div>
      <p>We appreciate your understanding and your support of the TeenOp community.</p>
      <p>Warmly,<br>The TeenOp Team</p>
      `
    );
    return this.sendEmail(data.buyerEmail, subject, html);
  }

  async sendParentRequestSent(data: {
    parentName: string;
    parentEmail: string;
  }) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const subject = 'Your request has been sent';
    const html = buildEmail(
      'Request Sent',
      'Your request has been sent',
      '',
      `
      <p>Hi ${data.parentName},</p>
      <p>Your booking request has been sent to your teen provider.</p>
      <p>You’ll be notified as soon as they respond. In the meantime, you can check the status anytime on your Requests page.</p>
      <div class="btn-center">
        <a href="${appUrl}/my-requests" class="btn">View Requests</a>
      </div>
      <p>We appreciate you choosing TeenOp and helping support the next generation of entrepreneurs.</p>
      <p>If you have any questions, feel free to contact TeenOp support.</p>
      <p>Best,<br>The TeenOp Team</p>
      `
    );
    return this.sendEmail(data.parentEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Parent — teen account signup notification
  // -------------------------------------------------------------------------
  async sendParentTeenSignupNotification(data: {
    parentEmail: string;
    parentName?: string;
    teenFirstName: string;
    teenLastName: string;
  }) {
    const subject = 'Your Teen Joined TeenOp';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const greetingName = data.parentName?.trim() || 'there';
    const html = buildEmail(
      'Your Teen Joined TeenOp',
      'Your Teen Joined TeenOp',
      '',
      `
      <p>Hi ${greetingName}!</p>
      <p>TeenOp is an online marketplace where teens can list services based on their skills and talents. It is currently offered to the St. Stephen's community as a part of its beta testing period, and requires an access code to join, keeping it a trusted and closed circle.</p>
      <p>Your teen recently created an account on TeenOp. Our goal is to give students a simple way to gain real experience, connect with families across the lower & upper school, and start building confidence and resumes through work they enjoy.</p>
      <p>TeenOp was created by a St. Stephen's student who had the idea in high school and is now studying Entrepreneurship as a sophomore at Florida State.</p>
      <p>This is the first version of TeenOp and we would love to hear your feedback! You can visit our site below. Sign up with the access code: <strong>teenopfalcons</strong></p>
      <div class="btn-center">
        <a href="${appUrl}" class="btn">View TeenOp</a>
      </div>
      <p>Please feel free to reach out with any questions!</p>
      <p>Best,<br>The TeenOp Team</p>
      `
    );
    return this.sendEmail(data.parentEmail, subject, html);
  }

  async sendBuyerPaymentConfirmed(data: {
    buyerName: string;
    buyerEmail: string;
  }) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const subject = "You're Booked - Your Service is Confirmed!";
    const html = buildEmail(
      'Service Confirmed',
      "You're Booked - Your Service is Confirmed!",
      '',
      `
      <p>Hi ${data.buyerName},</p>
      <p>Your service has been successfully scheduled and payment has been completed.</p>

      <p class="section-title">What to expect next</p>
      <ul>
        <li>You can message your teen provider anytime through TeenOp to coordinate details.</li>
        <li>You'll receive reminder emails 24 hours and 3 hours before your service.</li>
        <li>After the service, mark service completed under the Requests page to release payment to teen provider.</li>
      </ul>

      <div class="btn-center">
        <a href="${appUrl}/my-requests" class="btn">Mark Service Completed</a>
      </div>

      <p>Your payment is held securely through Stripe until you confirm the service has been completed. It is then transferred directly to the teen provider.</p>
      <p>We're excited to be part of this experience and appreciate your support in helping young entrepreneurs grow.</p>
      <p>Best,<br>The TeenOp Team</p>
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
    const subject = 'Reminder: Your TeenOp Service is Tomorrow';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const html = buildEmail(
      'Service Reminder',
      'Reminder: Your TeenOp Service is Tomorrow',
      '',
      `
      <p>Hi ${data.buyerName},</p>
      <p>This is a reminder that your TeenOp service is scheduled for tomorrow.</p>
      <p>You can message your teen provider anytime through TeenOp to confirm final details.</p>

      <div class="btn-center">
        <a href="${appUrl}/my-requests" class="btn">View My Requests</a>
      </div>

      <div class="btn-center">
        <a href="${appUrl}/messages?booking_id=${data.bookingId}" class="btn">Message Provider</a>
      </div>

      <p>We are excited for you to experience a TeenOp service!</p>
      <p>Best,<br>The TeenOp Team</p>
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
    const subject = 'Your TeenOp Service is Coming Up Soon';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const html = buildEmail(
      'Service Starting Soon',
      'Your TeenOp Service is Coming Up Soon',
      '',
      `
      <p>Hi ${data.buyerName},</p>
      <p>Your TeenOp service is scheduled to begin in 3 hours.</p>
      <p>If you need to reach your teen provider, you can message them through the platform.</p>

      <div class="btn-center">
        <a href="${appUrl}/my-requests" class="btn">View My Requests</a>
      </div>

      <div class="btn-center">
        <a href="${appUrl}/messages?booking_id=${data.bookingId}" class="btn">Message Provider</a>
      </div>

      <p>Thank you for being part of the TeenOp community. We hope you enjoy your service!</p>
      <p>Best,<br>The TeenOp Team</p>
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
    const subject = 'Reminder: Service Booking Tomorrow';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const locationDisplay = data.location === 'Online' ? 'Online' : data.location;
    const html = buildEmail(
      'Service Reminder',
      'Reminder: Service Booking Tomorrow',
      '',
      `
      <p>Hi ${data.providerName},</p>
      <p>This is a reminder that you have a service scheduled for tomorrow!</p>

      <div class="details-box">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Customer:</strong> ${data.buyerName}</p>
        <p><strong>Date & Time:</strong> ${data.date}, ${data.time} ${data.timeZone}</p>
        <p><strong>Location:</strong> ${locationDisplay}</p>
      </div>

      <div class="btn-center">
        <a href="${appUrl}/my-teen-hustle" class="btn">View Booking</a>
      </div>

      <p>You’re all set. You can remind your customer to confirm the service so payment can be released.</p>
      <p>Best,<br>The TeenOp Team</p>
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
    const subject = 'Your Service Starts in 3 Hours';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const html = buildEmail(
      'Service Starting Soon',
      'Your Service Starts in 3 Hours',
      '',
      `
      <p>Hi ${data.providerName},</p>
      <p>Your service is coming up soon!</p>

      <div class="details-box">
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Customer:</strong> ${data.buyerName}</p>
        <p><strong>Time:</strong> ${data.time}${data.timeZone ? ' ' + data.timeZone : ''}</p>
        <p><strong>Location:</strong> ${data.location}</p>
      </div>

      <p>Please make sure you arrive on time or message your customer through TeenOp if anything changes.</p>

      <div class="btn-center">
        <a href="${appUrl}/my-teen-hustle" class="btn">View Booking</a>
      </div>

      <p>You’ve got this. We hope you have a wonderful booking! Don’t forget to remind your buyer to mark the service as completed at the end of completed service to initiate your payment.</p>
      <p>Best,<br>The TeenOp Team</p>
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
    const subject = 'Nice Work — Next Step';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const html = buildEmail(
      'Nice Work — Next Step',
      'Nice Work — Next Step',
      '',
      `
      <p>Hi ${data.providerName},</p>
      <p>We hope your service went well!</p>
      <p>Your payment is held securely until your customer (the parent/buyer) marks the service as completed on their end. Once they do, your earnings will be released.</p>
      <p>We recommend sending them a quick message through TeenOp to remind them to mark it as completed so your payment can be released promptly.</p>

      <div class="btn-center">
        <a href="${appUrl}/my-teen-hustle" class="btn">View Bookings</a>
      </div>
      <p>Great work!</p>
      <p>Best,<br>The TeenOp Team</p>
      `
    );
    return this.sendEmail(data.providerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Service provider — after booking marked completed (earnings / withdrawal)
  // -------------------------------------------------------------------------
  async sendTeenEarningsAfterServiceCompleted(data: {
    teenFirstName: string;
    providerEmail: string;
  }) {
    const subject = 'Nice work! Get paid for your service';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const name = data.teenFirstName.trim() || 'there';
    const html = buildEmail(
      subject,
      'Nice work! Get paid for your service',
      'Great job completing your service!',
      `
      <p>Hi ${name},</p>
      <p>Great job completing your service!</p>
      <p class="section-title">To receive your earnings, follow these quick steps:</p>
      <ol style="padding-left: 20px; margin: 0 0 16px;">
        <li style="font-size: 14px; margin-bottom: 8px; color: #555;">First, mark the service as complete — this starts your earnings transfer to your TeenOp Cash account</li>
        <li style="font-size: 14px; margin-bottom: 8px; color: #555;">Go to your Earnings page</li>
        <li style="font-size: 14px; margin-bottom: 8px; color: #555;">Click <strong>Withdraw Cash</strong> to send money to your bank account</li>
      </ol>
      <div class="btn-center">
        <a href="${appUrl}/my-teen-hustle" class="btn">Mark Service Complete</a>
      </div>
      <p>Keep up the great work — we're excited to see you grow on TeenOp!</p>
      <p>If you have any questions, feel free to contact TeenOp support at <a href="mailto:teenop.co@gmail.com">teenop.co@gmail.com</a>.</p>
      <p>Best,<br>The TeenOp Team</p>
      `
    );
    return this.sendEmail(data.providerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Buyer — service marked complete notification (rate, tip, review)
  // -------------------------------------------------------------------------
  async sendBuyerServiceCompletedEmail(data: {
    buyerName: string;
    buyerEmail: string;
  }) {
    const subject = 'Your service has been marked as completed';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const name = data.buyerName.trim() || 'there';
    const html = buildEmail(
      subject,
      'Your Service is Complete!',
      '',
      `
      <p>Hi ${name},</p>
      <p>Your service has been marked as completed. We hope everything went great!</p>
      <p>You can now rate your experience, leave a review, and add a tip for your teen if you'd like. Your feedback helps young entrepreneurs improve as they build their service businesses.</p>
      <div class="btn-center">
        <a href="${appUrl}/my-requests" class="btn">Leave a Review &amp; Tip</a>
      </div>
      <p>Thank you for helping us generate a new wave of entrepreneurship. Your support means the world to us.</p>
      <p>If you have any questions, feel free to reach out to TeenOp support at <a href="mailto:teenop.co@gmail.com">teenop.co@gmail.com</a>.</p>
      <p>Best,<br>The TeenOp Team</p>
      `
    );
    return this.sendEmail(data.buyerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Buyer — reminder to mark service complete (sent by cron after service time)
  // -------------------------------------------------------------------------
  async sendBuyerMarkServiceCompleteReminder(data: {
    buyerName: string;
    buyerEmail: string;
    serviceName: string;
    bookingId: string;
  }) {
    const subject = 'Mark Service Complete + Rate, Tip, and Review Recent Teen Service!';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const name = data.buyerName.trim() || 'there';
    const html = buildEmail(
      subject,
      'Mark Service Complete + Rate, Tip, and Review!',
      '',
      `
      <p>Hi ${name},</p>
      <p>We hope everything went well with your recent service!</p>
      <p>To complete the process and send payment to your provider, please mark the service as complete:</p>
      <div class="btn-center">
        <a href="${appUrl}/my-requests" class="btn">Mark Service Complete</a>
      </div>
      <p class="section-title">Once you do this:</p>
      <ul>
        <li>Payment will be released to your provider</li>
        <li>You'll be able to rate, tip, and leave a review</li>
      </ul>
      <p>Your feedback helps our teen entrepreneurs grow and improve. Thank you for using TeenOp!</p>
      <p>Best,<br>The TeenOp Team</p>
      `
    );
    return this.sendEmail(data.buyerEmail, subject, html);
  }

  // -------------------------------------------------------------------------
  // Teen — new feedback received notification
  // -------------------------------------------------------------------------
  async sendTeenFeedbackReceivedEmail(data: {
    teenFirstName: string;
    providerEmail: string;
  }) {
    const subject = 'You received new feedback!';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com';
    const name = data.teenFirstName.trim() || 'there';
    const html = buildEmail(
      subject,
      'You Received New Feedback!',
      '',
      `
      <p>Hi ${name},</p>
      <p>You've received new feedback from your recent service, including a rating, review, or tip.</p>
      <p>Check it out to see how you did!</p>
      <div class="btn-center">
        <a href="${appUrl}/my-teen-hustle" class="btn">View Details</a>
      </div>
      <p>Best,<br>The TeenOp Team</p>
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
