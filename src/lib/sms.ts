import twilio from 'twilio';

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
    const message = `TeenOp: Reminder for tomorrow 🗓️— ${data.serviceName} with ${data.buyerName} at ${data.time} ${data.timeZone} (${data.location}). Review details or message the buyer through TeenOp if you need anything.`;
    
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
    const message = `TeenOp: You're up soon 👏${data.serviceName} with ${data.buyerName} at ${data.time} (${data.location}). Bring what you need and message your buyer through TeenOp if plans change.`;
    
    return this.sendSMS(data.providerPhone, message);
  }
}

export const smsService = new SMSService();
