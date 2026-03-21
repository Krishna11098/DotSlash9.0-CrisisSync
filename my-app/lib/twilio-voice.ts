import { EmergencyCategory } from "./report-pipeline";

/**
 * Triggers an emergency automatic voice call via Twilio
 */
export async function makeEmergencyCall(
  department: string | EmergencyCategory,
  priorityScore: number,
  urgency: string,
  toNumber: string = "+919726059009"
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("⚠️ Twilio credentials missing for voice call.");
    return false;
  }

  // Use TwiML (Twilio Markup Language) to use Text-to-Speech
  const twiml = `<Response>
    <Say voice="alice">Emergency Alert. A critical incident has been reported for the ${department} department. The priority score is ${priorityScore} out of 100. Urgency level is ${urgency}. Please check the XORcists dashboard immediately for details and location.</Say>
  </Response>`;
  
  const formData = new URLSearchParams();
  formData.append('To', toNumber);
  formData.append('From', fromNumber);
  formData.append('Twiml', twiml);

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Twilio Voice API Error:', errorData);
      return false;
    } else {
      const data = await response.json();
      console.log(`✅ Twilio Emergency Call triggered successfully to ${toNumber} (SID: ${data.sid})`);
      return true;
    }
  } catch(e) {
    console.error('❌ Error triggering Twilio Voice call:', e);
    return false;
  }
}
