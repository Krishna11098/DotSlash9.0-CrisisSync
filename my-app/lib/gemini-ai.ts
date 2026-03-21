/**
 * Gemini AI Service for Lead Intelligence
 * 
 * Uses Google Gemini API to generate comprehensive summaries and insights
 * for captured leads, helping sales teams prioritize and personalize follow-ups.
 */

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash-latest'; // Updated to latest model
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface LeadData {
  name?: string | null;
  email: string;
  phone: string;
  company?: string | null;
  designation?: string | null;
  query_type?: string | null;
  priority?: number | null;
  remark?: string | null;
  capture_mode?: string | null;
  created_at?: string | null;
}

export interface AIInsights {
  summary: string;
  keyPoints: string[];
  recommendedActions: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface RemarkModerationResult {
  isDerogatory: boolean;
  reason: string;
}

export async function moderateRemarkForAbuse(remark: string): Promise<RemarkModerationResult> {
  const text = remark.trim();
  if (!text) {
    return { isDerogatory: false, reason: 'empty-remark' };
  }

  if (!GEMINI_API_KEY) {
    return { isDerogatory: true, reason: 'Gemini API key not configured' };
  }

  try {
    const prompt = `You are a strict content moderation classifier for CRM lead remarks.
Classify the following text as DEROGATORY if it contains abusive, insulting, harassing, hateful, demeaning, profane, or threatening language toward any person/group.

Return ONLY valid JSON in this exact format:
{"isDerogatory":true|false,"reason":"short reason"}

Text:
"""${text}"""`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          topK: 1,
          topP: 0.1,
          maxOutputTokens: 128,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'moderation-failed');
      return { isDerogatory: true, reason: `Moderation request failed: ${errorText}` };
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') {
      return { isDerogatory: true, reason: 'Moderation response was empty' };
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as Partial<RemarkModerationResult>;

    return {
      isDerogatory: Boolean(parsed.isDerogatory),
      reason: typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason : 'classified',
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Moderation parsing failed';
    return { isDerogatory: true, reason };
  }
}

/**
 * Generate AI-powered lead summary using Google Gemini
 * @param lead - Lead data to analyze
 * @returns Structured AI insights and summary
 */
export async function generateLeadSummary(lead: LeadData): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error('❌ Gemini API key not configured in environment variables');
    return generateFallbackSummary(lead);
  }

  try {
    const prompt = constructLeadPrompt(lead);
    
    console.log('🤖 Calling Gemini API for lead summary...');
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('❌ Gemini API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return generateFallbackSummary(lead);
    }

    const data = await response.json();
    console.log('✅ Gemini API response received');
    
    // Extract text from Gemini response
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const summary = data.candidates[0].content.parts[0].text;
      console.log('✅ AI Summary generated successfully');
      return summary;
    }

    // Check if content was blocked
    if (data.candidates && data.candidates[0]?.finishReason === 'SAFETY') {
      console.warn('⚠️ Content was blocked by safety filters');
      return generateFallbackSummary(lead);
    }

    console.warn('⚠️ Unexpected API response structure:', data);
    return generateFallbackSummary(lead);
  } catch (error) {
    console.error('❌ Error generating AI summary:', error);
    return generateFallbackSummary(lead);
  }
}

/**
 * Generate detailed AI insights with structured data
 * @param lead - Lead data to analyze
 * @returns Structured insights object
 */
export async function generateLeadInsights(lead: LeadData): Promise<AIInsights> {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API key not configured, using fallback insights');
    return generateFallbackInsights(lead);
  }

  try {
    const prompt = `Analyze this business lead and provide structured insights in JSON format:

Lead Information:
- Name: ${lead.name || 'Not provided'}
- Email: ${lead.email}
- Phone: ${lead.phone}
- Company: ${lead.company || 'Not provided'}
- Designation: ${lead.designation || 'Not provided'}
- Query Type: ${lead.query_type || 'General inquiry'}
- Priority Score: ${lead.priority || 0}/10
- Remarks: ${lead.remark || 'None'}
- Capture Method: ${lead.capture_mode || 'Unknown'}

Provide response in this exact JSON format:
{
  "summary": "A comprehensive 2-3 sentence summary of this lead",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "recommendedActions": ["Action 1", "Action 2", "Action 3"],
  "priority": "high|medium|low"
}`;

    console.log('🤖 Calling Gemini API for structured insights...');

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.5,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error for insights:', {
        status: response.status,
        error: errorText
      });
      return generateFallbackInsights(lead);
    }

    const data = await response.json();
    console.log('✅ Gemini insights response received');
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      // Try to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        return {
          summary: insights.summary || '',
          keyPoints: insights.keyPoints || [],
          recommendedActions: insights.recommendedActions || [],
          priority: insights.priority || 'medium'
        };
      }
    }

    return generateFallbackInsights(lead);
  } catch (error) {
    console.error('❌ Error generating AI insights:', error);
    return generateFallbackInsights(lead); 
  }
}

/**
 * Construct optimized prompt for lead analysis
 */
function constructLeadPrompt(lead: LeadData): string {
  const captureDate = lead.created_at 
    ? new Date(lead.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Unknown';

  const priorityLevel = (lead.priority || 0) >= 8 ? 'HIGH' : (lead.priority || 0) >= 5 ? 'MEDIUM' : 'STANDARD';

  return `You are an expert CRM analyst specializing in B2B lead qualification and sales intelligence. Analyze this business lead captured at a conference/event and create a comprehensive, actionable summary.

LEAD PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 CONTACT INFORMATION
• Name: ${lead.name || 'Name not captured'}
• Email: ${lead.email}
• Phone: ${lead.phone}

🏢 PROFE SSIONAL BACKGROUND
• Company: ${lead.company || 'Company not disclosed'}
• Position/Title: ${lead.designation || 'Position not specified'}

🎯 ENGAGEMENT CONTEXT
• Interest Area: ${lead.query_type || 'General inquiry'}
• Priority Rating: ${lead.priority || 0}/10 (${priorityLevel} PRIORITY)
• Capture Method: ${getCaptureMethodDescription(lead.capture_mode)}
• Date Captured: ${captureDate}

💬 ADDITIONAL CONTEXT
${lead.remark ? `Notes: ${lead.remark}` : 'No additional notes provided'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED ANALYSIS (Write 4-5 detailed sentences covering):

1. LEAD QUALIFICATION: Assess this lead's potential value based on their role, company, and expressed interest. What makes them a valuable prospect?

2. BUSINESS INTELLIGENCE: What can we infer about their needs, pain points, or objectives based on their query type and any remarks? What specific challenges might they be facing?

3. ENGAGEMENT STRATEGY: Provide specific, actionable recommendations for the follow-up approach. What topics should be discussed? What value proposition should be emphasized?

4. URGENCY & TIMING: Based on the priority score and context, recommend optimal timing for outreach and explain why this lead should be prioritized (or deprioritized).

5. PERSONALIZATION NOTES: Suggest specific talking points or references that would resonate with this contact based on their professional background.

Write in a professional, executive-summary style. Be specific and data-driven. Focus on actionable intelligence that helps close deals.`;
}

/**
 * Get human-readable capture method description
 */
function getCaptureMethodDescription(mode?: string | null): string {
  const descriptions: Record<string, string> = {
    'manual': 'Manual entry by staff',
    'card_scan': 'Business card OCR scan',
    'qr_code': 'QR code scan',
    'audio': 'Voice note transcription',
    'quick_capture': 'Quick capture mode'
  };

  return descriptions[mode || ''] || 'Standard capture';
}

/**
 * Generate fallback summary when API is unavailable
 */
function generateFallbackSummary(lead: LeadData): string {
  const parts: string[] = [];
  
  // Professional introduction
  if (lead.name && lead.company && lead.designation) {
    parts.push(`📊 LEAD PROFILE: ${lead.name}, ${lead.designation} at ${lead.company}, was captured as a ${(lead.priority || 0) >= 7 ? 'high-priority' : 'standard'} lead.`);
  } else if (lead.name && lead.company) {
    parts.push(`📊 LEAD PROFILE: ${lead.name} from ${lead.company} was captured with contact information.`);
  } else if (lead.name) {
    parts.push(`📊 LEAD PROFILE: ${lead.name} was captured as a potential business contact.`);
  } else {
    parts.push(`📊 LEAD PROFILE: New business contact captured with verified contact information.`);
  }

  // Interest and qualification
  if (lead.query_type) {
    const queryDisplay = lead.query_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    parts.push(`🎯 INTEREST: Expressed interest in ${queryDisplay}.`);
  }

  // Priority and urgency
  const priority = lead.priority || 0;
  if (priority >= 8) {
    parts.push(`⚠️ HIGH PRIORITY (${priority}/10): Immediate follow-up recommended within 24 hours. This lead shows strong engagement indicators and should be contacted by a senior team member with tailored value proposition.`);
  } else if (priority >= 5) {
    parts.push(`📌 MEDIUM PRIORITY (${priority}/10): Follow-up within 48-72 hours recommended. Standard qualification process should be applied with focus on understanding specific needs and pain points.`);
  } else {
    parts.push(`📋 STANDARD PRIORITY (${priority}/10): Nurture sequence recommended. Add to email campaign and follow up within one week to assess fit and interest level.`);
  }

  // Specific notes
  if (lead.remark && lead.remark.trim().length > 0) {
    parts.push(`💡 CONTEXT NOTES: ${lead.remark}`);
  }

  // Recommended actions
  const actions = [];
  if (lead.email) actions.push('personalized email introduction');
  if (lead.phone) actions.push('discovery call');
  if (lead.company) actions.push('company research');
  
  if (actions.length > 0) {
    parts.push(`🚀 RECOMMENDED ACTIONS: Schedule ${actions.join(', ')} to understand specific requirements and demonstrate relevant solutions.`);
  }

  return parts.join(' ');
}

/**
 * Generate fallback insights structure
 */
function generateFallbackInsights(lead: LeadData): AIInsights {
  const keyPoints: string[] = [];
  
  if (lead.company) keyPoints.push(`Works at ${lead.company}`);
  if (lead.designation) keyPoints.push(`Position: ${lead.designation}`);
  if (lead.query_type) keyPoints.push(`Interest: ${lead.query_type}`);

  const actions: string[] = [
    'Send personalized follow-up email within 24-48 hours',
    'Schedule discovery call to understand specific needs',
    'Share relevant product/service information'
  ];

  const priority: 'high' | 'medium' | 'low' = 
    (lead.priority || 0) >= 7 ? 'high' :
    (lead.priority || 0) >= 4 ? 'medium' : 'low';

  return {
    summary: generateFallbackSummary(lead),
    keyPoints,
    recommendedActions: actions,
    priority
  };
}

/**
 * Batch generate summaries for multiple leads
 * @param leads - Array of leads to analyze
 * @returns Array of summaries in same order
 */
export async function batchGenerateLeadSummaries(leads: LeadData[]): Promise<string[]> {
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  const results: string[] = [];

  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    const batchPromises = batch.map(lead => generateLeadSummary(lead));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to respect rate limits
    if (i + batchSize < leads.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
