/**
 * WhatsApp Business API Integration
 * 
 * Sends WhatsApp notifications to users for follow-ups and meetings
 * Using Twilio WhatsApp API / WhatsApp Business API
 */

interface WhatsAppMessage {
  to: string; // Phone number with country code (e.g., +919876543210)
  message: string;
  leadName?: string;
}

interface FollowUpNotification {
  leadName: string;
  leadPhone: string;
  followUpDate: string;
  followUpNotes?: string;
  companyName?: string;
}

interface MeetingNotification {
  leadName: string;
  leadPhone: string;
  meetingDate: string;
  meetingLink?: string;
  meetingType?: string;
  meetingNotes?: string;
}

/**
 * Format phone number to WhatsApp format (+countrycode without spaces)
 */
function formatPhoneNumber(phone: string): string {
  // Remove all spaces, hyphens, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If doesn't start with +, assume India (+91)
  if (!cleaned.startsWith('+')) {
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    cleaned = '+91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send WhatsApp message via API
 * This is a placeholder - you need to configure with your WhatsApp Business API
 */
async function sendWhatsAppMessage({ to, message, leadName }: WhatsAppMessage): Promise<boolean> {
  try {
    const formattedPhone = formatPhoneNumber(to);
    
    console.log('📱 Sending WhatsApp message to:', formattedPhone);
    console.log('Message:', message);

    // OPTION 1: Using Twilio WhatsApp API
    // Uncomment and configure with your Twilio credentials
    /*
    const twilioAccountSid = process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER; // e.g., whatsapp:+14155238886
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioWhatsAppNumber,
        To: `whatsapp:${formattedPhone}`,
        Body: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ WhatsApp message sent successfully:', data.sid);
    return true;
    */

    // OPTION 2: Using your own backend API endpoint
    // Create an API route in your Next.js app or use your backend
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message,
        leadName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send WhatsApp message');
    }

    const data = await response.json();
    console.log('✅ WhatsApp message sent:', data);
    return true;

  } catch (error) {
    console.error('❌ Failed to send WhatsApp message:', error);
    
    // For development: Show browser notification as fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('WhatsApp Message (Dev Mode)', {
        body: `Would send to ${to}: ${message.substring(0, 100)}...`,
        icon: '/icons/icon-192x192.png',
      });
    }
    
    return false;
  }
}

/**
 * Send follow-up reminder via WhatsApp
 */
export async function sendFollowUpWhatsApp({
  leadName,
  leadPhone,
  followUpDate,
  followUpNotes,
  companyName,
}: FollowUpNotification): Promise<boolean> {
  const date = new Date(followUpDate);
  const formattedDate = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const message = `
Hello ${leadName},

This is a follow-up reminder from ${companyName || 'our team'}.

📅 *Scheduled Follow-up:*
${formattedDate} at ${formattedTime}

${followUpNotes ? `📝 *Discussion Points:*\n${followUpNotes}\n\n` : ''}
We look forward to connecting with you!

If you have any questions or need to reschedule, please let us know.

Best regards,
HTT XSpark Team
`.trim();

  const success = await sendWhatsAppMessage({
    to: leadPhone,
    message,
    leadName,
  });

  if (success) {
    console.log(`✅ Follow-up WhatsApp sent to ${leadPhone}`);
    console.log(`⚠️ REMINDER: ${leadPhone} must join Twilio Sandbox to receive messages!`);
    console.log(`   Steps: Send "join <sandbox-code>" to +1 415 523 8886 via WhatsApp`);
    console.log(`   Get code: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn`);
  }

  return success;
}

/**
 * Send meeting invitation via WhatsApp
 */
export async function sendMeetingWhatsApp({
  leadName,
  leadPhone,
  meetingDate,
  meetingLink,
  meetingType,
  meetingNotes,
}: MeetingNotification): Promise<boolean> {
  const date = new Date(meetingDate);
  const formattedDate = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const meetingTypeText = meetingType === 'virtual' ? '💻 Virtual Meeting' : 
                          meetingType === 'in_person' ? '🤝 In-Person Meeting' : 
                          meetingType === 'phone' ? '📞 Phone Call' : '📅 Meeting';

  const message = `
Hello ${leadName},

${meetingTypeText} scheduled!

📅 *Date & Time:*
${formattedDate} at ${formattedTime}

${meetingLink ? `🔗 *Meeting Link:*\n${meetingLink}\n\n` : ''}${meetingNotes ? `📝 *Agenda:*\n${meetingNotes}\n\n` : ''}
Please confirm your availability or let us know if you need to reschedule.

Looking forward to our discussion!

Best regards,
HTT XSpark Team
`.trim();

  const success = await sendWhatsAppMessage({
    to: leadPhone,
    message,
    leadName,
  });

  if (success) {
    console.log(`✅ Meeting WhatsApp sent to ${leadPhone}`);
    console.log(`⚠️ REMINDER: ${leadPhone} must join Twilio Sandbox to receive messages!`);
    console.log(`   Steps: Send "join <sandbox-code>" to +1 415 523 8886 via WhatsApp`);
    console.log(`   Get code: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn`);
  }

  return success;
}

/**
 * Request notification permission (call this on app initialization)
 */
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
