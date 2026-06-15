import { EmergencyCategory } from "./report-pipeline";

/**
 * Triggers an emergency automatic voice call via Twilio
 */
export async function makeEmergencyCall(
  department: string | EmergencyCategory,
  priorityScore: number,
  urgency: string,
  toNumber: string = "+919726059009",
  maxAttempts: number = 3
): Promise<boolean> {
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

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`📞 [Twilio] Call attempt ${attempt + 1}/${maxAttempts} to ${toNumber}...`);
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
        method: "POST",
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error(`❌ Twilio Voice API Error (Attempt ${attempt + 1}):`, errorData);
        throw new Error(errorData.message || "Twilio call request failed");
      } else {
        const data = await response.json();
        console.log(`✅ Twilio Emergency Call triggered successfully to ${toNumber} (SID: ${data.sid})`);
        return true;
      }
    } catch(e) {
      console.error(`❌ Twilio Call Attempt ${attempt + 1} failed:`, e);
      if (attempt < maxAttempts - 1) {
        const wait = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
        console.log(`⏳ [Twilio] Backing off. Waiting ${wait}ms before retry...`);
        await delay(wait);
      }
    }
  }

  console.error("🚨 [Twilio] All voice escalation attempts failed. Dashboard fallback will be the sole dispatch channel.");
  return false;
}
