import { NextRequest, NextResponse } from 'next/server';

/**
 * WhatsApp API Route
 * 
 * This endpoint sends WhatsApp messages via Twilio or another WhatsApp Business API provider
 * 
 * SETUP INSTRUCTIONS:
 * 1. Sign up for Twilio WhatsApp API: https://www.twilio.com/whatsapp
 * 2. Get your Account SID, Auth Token, and WhatsApp-enabled phone number
 * 3. Add to your .env.local file:
 *    TWILIO_ACCOUNT_SID=your_account_sid 
 *    TWILIO_AUTH_TOKEN=your_auth_token
 *    TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
 * 4. Restart your Next.js dev server
 */

interface WhatsAppRequest {
  phone: string;
  message: string;
  leadName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppRequest = await request.json();
    const { phone, message, leadName } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, message: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Check if Twilio credentials are configured
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      console.warn('⚠️ Twilio credentials not configured. WhatsApp message not sent.');
      console.log('📱 Would send to:', phone);
      console.log('📝 Message:', message);
      
      // In development, just log and return success
      return NextResponse.json({
        success: true,
        message: 'WhatsApp credentials not configured (dev mode)',
        dev: true,
        recipient: phone,
        preview: message.substring(0, 100),
      });
    }

    // Send via Twilio WhatsApp API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', twilioWhatsAppNumber);
    formData.append('To', `whatsapp:${phone}`);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Twilio API Error:', errorData);
      
      // Provide specific guidance for common errors
      if (errorData.message && errorData.message.includes('Channel')) {
        console.error('\n🔧 SETUP REQUIRED:');
        console.error('1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
        console.error('2. Join the Twilio Sandbox by sending a WhatsApp message');
        console.error('3. Send "join <your-sandbox-code>" to +1 415 523 8886');
        console.error('4. Then test your recipient phone by having them join too\n');
      }
      
      throw new Error(errorData.message || 'Failed to send WhatsApp message');
    }

    const data = await response.json();
    
    console.log('✅ WhatsApp message sent successfully');
    console.log('Message SID:', data.sid);
    console.log('To:', phone);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      messageSid: data.sid,
      status: data.status,
    });

  } catch (error: any) {
    console.error('❌ WhatsApp API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to send WhatsApp message',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}
