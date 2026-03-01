import twilio from 'twilio';
import { PARENT_APPROVAL_TEMPLATES } from '@/lib/parent-approval-templates';

// SMS service for sending text notifications
export class SMSService {
  private client: twilio.Twilio | null = null;

  private getClient() {
    if (!this.client) {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio credentials not configured');
      }
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    return this.client;
  }

  async sendSMS(to: string, message: string) {
    try {
      const client = this.getClient();
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });
      
      console.log('SMS sent:', result.sid);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Service provider confirmation SMS
  async sendServiceProviderConfirmation(data: {
    providerPhone: string;
    serviceName: string;
    buyerName: string;
    date: string;
    time: string;
    timeZone: string;
    location: string;
  }) {
    const message = `TeenOp Reminder:\nYou're booked! 🎉 Your service ${data.serviceName} with ${data.buyerName} is confirmed for ${data.date}, ${data.time} ${data.timeZone} at ${data.location}.\nRemember to chat and get paid safely through TeenOp.`;
    
    return this.sendSMS(data.providerPhone, message);
  }

  // Service provider 24-hour reminder SMS
  async sendServiceProvider24HourReminder(data: {
    providerPhone: string;
    serviceName: string;
    buyerName: string;
    time: string;
    timeZone: string;
    location: string;
  }) {
    // Format location: show "Online" if location is "Online", otherwise show the location
    const locationDisplay = data.location === "Online" ? "Online" : data.location;
    const message = `TeenOp: Reminder for tomorrow 🗓️— ${data.serviceName} with ${data.buyerName} at ${data.time} ${data.timeZone} (${locationDisplay}). Review details or message the buyer through TeenOp if you need anything.`;
    
    return this.sendSMS(data.providerPhone, message);
  }

  // Service provider 3-hour reminder SMS
  async sendServiceProvider3HourReminder(data: {
    providerPhone: string;
    serviceName: string;
    buyerName: string;
    time: string;
    location: string;
  }) {
    // Format location: show "Online" if location is "Online", otherwise show the location
    const locationDisplay = data.location === "Online" ? "Online" : data.location;
    const message = `TeenOp: You're up soon 👏${data.serviceName} with ${data.buyerName} at ${data.time} (${locationDisplay}). Bring what you need and message your buyer through TeenOp if plans change.`;
    
    return this.sendSMS(data.providerPhone, message);
  }

  async sendParentVerificationSMS(data: { parentPhone: string; verifyLink: string }) {
    const [line1, line2] = PARENT_APPROVAL_TEMPLATES.parentSms.body;
    return this.sendSMS(data.parentPhone, `${line1}\n${line2} ${data.verifyLink}`);
  }

  async sendTeenApprovalSMS(data: { teenPhone: string }) {
    return this.sendSMS(data.teenPhone, PARENT_APPROVAL_TEMPLATES.teenApprovedSms.body.join(" "));
  }
}

export const smsService = new SMSService();
