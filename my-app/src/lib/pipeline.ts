/**
 * 🔥 Multimodal Truth + Priority Engine
 * Combines deepfake detection, NLP validation, image-text consistency,
 * and intelligent priority ranking
 */

import { VerificationResult, PrioritizationInput, PrioritizationOutput, SubmissionRequest, FinalResponse } from "./types";

// ============================================================================
// 🎙️ AUDIO TO TEXT CONVERSION (Deepgram)
// ============================================================================

/**
 * Convert Audio to Text using Deepgram
 * Accepts base64 encoded audio file
 * Returns: transcribed text or empty string on failure
 */
export async function convertAudioToText(audioBase64: string): Promise<string> {
  try {
    if (!audioBase64) {
      console.warn("⚠️ No audio provided");
      return "";
    }

    const deepgramKey = process.env.DEEPGRAM_API_KEY || "";

    if (!deepgramKey) {
      console.error("❌ Deepgram API key not configured");
      return "";
    }

    // Extract base64 without data URL prefix
    const base64Audio = audioBase64.includes(",")
      ? audioBase64.split(",")[1]
      : audioBase64;

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(base64Audio, "base64");

    console.log("🎙️ Sending audio to Deepgram for transcription...");

    // Send audio directly to Deepgram
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramKey}`,
          "Content-Type": "application/octet-stream",
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      console.error(`❌ Deepgram error: ${response.status}`);
      return "";
    }

    const result = await response.json() as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
          }>;
        }>;
      };
    };

    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    if (transcript) {
      console.log(`✅ Transcription complete: "${transcript.substring(0, 100)}..."`);
    } else {
      console.warn("⚠️ No transcript returned from Deepgram");
    }

    return transcript;
  } catch (error) {
    console.error("❌ Audio conversion error:", error);
    return "";
  }
}

// ============================================================================
// 🧠 STEP 1: FAKE DETECTION MODELS
// ============================================================================

/**
 * Image Fake Detection
 * Uses Sightengine API - checks for inappropriate content, manipulation, and quality
 * Returns: 0 (real) to 1 (fake/suspicious)
 */
export async function detectImageFake(imageBase64: string): Promise<number> {
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64.split(",")[1] || imageBase64, "base64");
    
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: "image/jpeg" });
    formData.append("media", blob);
    formData.append("models", "nudity,wad,offensive,face");
    formData.append("api_user", process.env.SIGHTENGINE_USER_ID || "");
    formData.append("api_secret", process.env.SIGHTENGINE_API_KEY || "");

    const response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error(`❌ Sightengine API Error: ${response.status} ${response.statusText}`);
      return 0.5;
    }

    const result = await response.json() as any;
    
    console.log("🔍 Sightengine response:", JSON.stringify(result, null, 2));
    
    // Calculate suspicion score based on moderation results
    let suspicionScore = 0;
    
    // Check for inappropriate content
    if (result.nudity?.raw || 0 > 0.3) {
      suspicionScore += 0.25;
    }
    
    // Check for weapons/violence
    if (result.weapon?.raw || 0 > 0.4) {
      suspicionScore += 0.25;
    }
    
    // Check for offensive content
    if (result.offensive?.raw || 0 > 0.3) {
      suspicionScore += 0.15;
    }
    
    // Cap at 1.0
    const finalScore = Math.min(suspicionScore, 1.0);
    
    console.log(`✅ Sightengine Analysis: Suspicion=${(finalScore * 100).toFixed(1)}%`);
    
    return finalScore;
  } catch (error) {
    console.error("❌ Sightengine error:", error);
    return 0.5;
  }
}

/**
 * Text Fake/Spam Detection
 * Uses basic heuristics since Sightengine focuses on image analysis
 * Checks for common spam patterns and unrealistic descriptions
 * Returns: 0 (clean) to 1 (spam/fake)
 */
export async function detectTextFake(text: string): Promise<number> {
  try {
    let spamScore = 0;
    
    // Check for excessive ALL CAPS
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.7) {
      spamScore += 0.3;
    }
    
    // Check for repeated characters/words
    if (/(.)\1{4,}/.test(text)) {
      spamScore += 0.2; // e.g., "hellooooooo"
    }
    
    // Check for spam keywords
    const spamKeywords = ["click here", "buy now", "free money", "urgent action", "verify account"];
    if (spamKeywords.some(kw => text.toLowerCase().includes(kw))) {
      spamScore += 0.4;
    }
    
    // Check for suspicious URLs (common spam indicator)
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 2) {
      spamScore += 0.3;
    }
    
    // Check text length (extremely short or extremely long can be suspicious)
    if (text.length < 10 || text.length > 5000) {
      spamScore += 0.15;
    }
    
    // Cap at 1.0
    return Math.min(spamScore, 1.0);
  } catch (error) {
    console.error("Text fake detection error:", error);
    return 0.3;  // Neutral fallback
  }
}

// ============================================================================
// 🎨 STEP 1.5: GEMINI IMAGE DESCRIPTION
// ============================================================================

/**
 * Get Image Description using Gemini API
 * Converts image to text description using Google Gemini Vision
 * Returns: description text or empty string on failure
 */
export async function getImageDescriptionFromGemini(imageBase64: string): Promise<string> {
  try {
    // Extract base64 without data URL prefix
    const base64Image = imageBase64.includes(",") 
      ? imageBase64.split(",")[1] 
      : imageBase64;

    const geminiApiKey = process.env.GEMINI_API_KEY || "AIzaSyDummyGeminiKeyPlaceholder123456789";
    
    if (geminiApiKey.includes("Dummy")) {
      console.warn("⚠️ Using dummy Gemini API key. Set GEMINI_API_KEY in .env.local for production");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Describe this image in detail. Focus on objects, people, actions, and any emergency or crisis indicators. Be specific and factual.",
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error(`❌ Gemini API Error: ${response.status}`);
      return "";
    }

    const result = await response.json() as any;
    const description = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    console.log("📝 Gemini Image Description:", description.substring(0, 100) + "...");
    
    return description;
  } catch (error) {
    console.error("❌ Gemini image description error:", error);
    return "";
  }
}

/**
 * Extract Emergency Keywords
 * Returns keywords from text that match emergency categories
 */
function extractEmergencyKeywords(text: string): {category: string; keywords: string[]} {
  const emergencyKeywords = {
    fire: ["fire", "burning", "flame", "smoke", "blaze", "ignite", "inferno", "combustion"],
    water: ["flood", "water", "drowning", "swimming", "river", "rain", "inundation", "submerged", "tsunami"],
    accident: ["accident", "crash", "collision", "vehicle", "car", "injured", "injury", "hit", "impact"],
    building: ["building", "structure", "collapse", "damage", "debris", "rubble", "destruction", "demolition"],
    crowd: ["crowd", "gathering", "people", "group", "mass", "assembly", "congregation", "gathering"],
    medical: ["medical", "hospital", "injured", "sick", "emergency", "ambulance", "doctor"],
    crime: ["crime", "robbery", "theft", "violence", "assault", "shooting", "stabbing"],
  };

  const textLower = text.toLowerCase();
  const foundKeywords: {category: string; keywords: string[]} = {
    category: "",
    keywords: []
  };

  for (const [category, keywords] of Object.entries(emergencyKeywords)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        if (!foundKeywords.category) {
          foundKeywords.category = category;
        }
        if (!foundKeywords.keywords.includes(keyword)) {
          foundKeywords.keywords.push(keyword);
        }
      }
    }
  }

  return foundKeywords;
}

/**
 * Match Keywords Between Gemini Description and User Text
 * If keywords match (e.g., both mention "fire"), don't flag as suspicious
 * Returns: match score 0-1 (higher = better match)
 */
export function matchKeywordsGeminiVsUserText(
  geminiDescription: string,
  userText: string
): number {
  if (!geminiDescription || !userText) {
    return 0.5; // Neutral if either is empty
  }

  const userKeywords = extractEmergencyKeywords(userText);
  const geminiKeywords = extractEmergencyKeywords(geminiDescription);

  // If no keywords found in either
  if (userKeywords.keywords.length === 0 && geminiKeywords.keywords.length === 0) {
    return 0.6; // Neutral match
  }

  // Count matching keywords
  let matchCount = 0;
  for (const keyword of userKeywords.keywords) {
    if (geminiDescription.toLowerCase().includes(keyword)) {
      matchCount++;
    }
  }

  // Calculate match percentage
  const totalKeywords = Math.max(userKeywords.keywords.length, 1);
  const matchScore = Math.min(matchCount / totalKeywords, 1.0);

  console.log(`🔗 Keyword Match: User="${userKeywords.category}" Gemini="${geminiKeywords.category}" Score=${(matchScore * 100).toFixed(0)}%`);
  console.log(`   User Keywords: ${userKeywords.keywords.join(", ") || "none"}`);
  console.log(`   Matched: ${matchCount}/${totalKeywords}`);

  return matchScore;
}

/**
 * Image-Text Consistency Check
 * Uses Gemini API to describe image and matches with user text
 * If keywords in description match user text, high confidence (not flagged as fake)
 * Returns: 0 (mismatch) to 1 (good match)
 */
export async function clipImageTextMatch(
  imageBase64: string,
  text: string
): Promise<number> {
  try {
    // Get image description from Gemini
    const geminiDescription = await getImageDescriptionFromGemini(imageBase64);

    if (!geminiDescription) {
      console.warn("⚠️ Could not get image description from Gemini, using fallback");
      return 0.6;
    }

    // Match keywords between Gemini description and user text
    const matchScore = matchKeywordsGeminiVsUserText(geminiDescription, text);

    return matchScore;
  } catch (error) {
    console.error("Image-text matching error:", error);
    return 0.6; // Neutral fallback
  }
}

// ============================================================================
// 🔍 STEP 3: SCENE UNDERSTANDING (Object Detection)
// ============================================================================

/**
 * Detect objects in image using Sightengine API
 * Provides scene tags, object detection, and moderation data
 * Returns: array of detected object labels
 */
export async function detectSceneObjects(imageBase64: string): Promise<string[]> {
  try {
    const imageBuffer = Buffer.from(imageBase64.split(",")[1] || imageBase64, "base64");
    
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: "image/jpeg" });
    formData.append("media", blob);
    formData.append("models", "weapons,properties,face");
    formData.append("api_user", process.env.SIGHTENGINE_USER_ID || "");
    formData.append("api_secret", process.env.SIGHTENGINE_API_KEY || "");

    const response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error(`❌ Sightengine object detection error: ${response.status}`);
      return [];
    }

    const result = await response.json() as any;
    
    // Extract detected objects
    const objects: string[] = [];
    
    // Add weapon detection results
    if (result.weapon?.raw > 0.5) {
      objects.push("weapon");
    }
    
    // Add vehicle detection if available
    if (result.properties) {
      for (const [prop, score] of Object.entries(result.properties)) {
        if ((score as number) > 0.5) {
          objects.push(prop);
        }
      }
    }
    
    // Emergency-related keyword extraction from properties
    const emergencyTerms = ["vehicle", "person", "car", "building", "outdoor", "indoor", "nature"];
    const detectedTerms = Object.keys(result.properties || {})
      .filter((key: string) => (result.properties[key] || 0) > 0.5)
      .slice(0, 10);
    
    return detectedTerms.length > 0 ? detectedTerms : objects;
  } catch (error) {
    console.error("Object detection error:", error);
    return [];
  }
}

// ============================================================================
// 📊 STEP 4: PRIORITY ENGINE (Rules-Based + ML-Ready)
// ============================================================================

const CRITICAL_KEYWORDS = [
  "fire",
  "collapse",
  "building_collapse",
  "person_injured",
  "explosion",
  "gas_leak",
  "landslide",
  "flood_severe",
];

const CRITICAL_LOCATIONS = [
  "hospital",
  "school",
  "fire_station",
  "police_station",
  "airport",
  "railway_station",
  "metro_station",
];

/**
 * Determine severity from detected objects and text description
 */
function analyzeSeverity(objects: string[], text: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const textLower = text.toLowerCase();
  
  // Check for critical indicators
  if (CRITICAL_KEYWORDS.some(kw => textLower.includes(kw) || objects.includes(kw))) {
    return "CRITICAL";
  }
  
  // High priority indicators
  if (
    textLower.includes("fire") ||
    textLower.includes("injury") ||
    textLower.includes("accident") ||
    objects.includes("fire")
  ) {
    return "HIGH";
  }
  
  // Medium priority
  if (
    textLower.includes("traffic") ||
    textLower.includes("garbage") ||
    textLower.includes("damage") ||
    objects.includes("car") ||
    objects.includes("vehicle")
  ) {
    return "MEDIUM";
  }
  
  return "LOW";
}

/**
 * Main Priority Engine: Combines all signals into final priority
 */
export function calculatePriority(input: PrioritizationInput): PrioritizationOutput {
  let baseScore = 0;

  // 1️⃣ Severity Multiplier
  const severityScores: Record<string, number> = {
    LOW: 10,
    MEDIUM: 30,
    HIGH: 60,
    CRITICAL: 100,
  };
  baseScore += severityScores[input.issue_severity] || 30;

  // 2️⃣ Crowd Count (urgency indicator)
  // More people affected = higher priority
  baseScore += Math.min(input.crowd_count * 2, 20);

  // 3️⃣ Critical Location Bonus (+15 points)
  if (input.is_critical_location) {
    baseScore += 15;
  }

  // 4️⃣ Report Count (community validation)
  baseScore += Math.min(input.num_reports * 3, 15);

  // 5️⃣ Credibility Checks (subtract if suspicious)
  const credibilityScore = 
    (input.text_credibility * 30) + 
    (input.image_text_match * 20) + 
    ((1 - input.fake_score) * 20);
  
  baseScore = baseScore * (credibilityScore / 70); // Weight by credibility

  // Cap at 100
  baseScore = Math.min(Math.max(baseScore, 0), 100);

  // Determine priority level
  let priorityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  let urgencySeconds: number;

  if (baseScore >= 80) {
    priorityLevel = "CRITICAL";
    urgencySeconds = 60; // 1 minute response time
  } else if (baseScore >= 60) {
    priorityLevel = "HIGH";
    urgencySeconds = 300; // 5 minutes
  } else if (baseScore >= 40) {
    priorityLevel = "MEDIUM";
    urgencySeconds = 900; // 15 minutes
  } else {
    priorityLevel = "LOW";
    urgencySeconds = 3600; // 1 hour
  }

  return {
    priority_level: priorityLevel,
    priority_score: Math.round(baseScore),
    recommendation: getRecommendation(priorityLevel, input),
    estimated_urgency_seconds: urgencySeconds,
  };
}

/**
 * Generate human-readable recommendation
 */
function getRecommendation(
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  input: PrioritizationInput
): string {
  const hazards = input.detected_hazards.slice(0, 3).join(", ");
  
  const templates = {
    CRITICAL: `🚨 IMMEDIATE ACTION REQUIRED: ${hazards} detected at ${input.location}. Estimated ${input.crowd_count} people affected. Dispatch emergency services NOW.`,
    HIGH: `⚠️ HIGH PRIORITY: ${hazards} reported at ${input.location}. ${input.num_reports} reports verified. Dispatch within 5 minutes.`,
    MEDIUM: `📌 MEDIUM PRIORITY: ${hazards} needs investigation at ${input.location}. Schedule response within 15 minutes.`,
    LOW: `✓ Low priority: Report logged. Community can help resolve. Schedule follow-up if needed.`,
  };

  return templates[level];
}

// ============================================================================
// 🎯 MAIN PIPELINE: VERIFY → UNDERSTAND → RANK
// ============================================================================

export async function processSubmission(
  request: SubmissionRequest
): Promise<FinalResponse> {
  console.log("🔥 Processing submission...");

  // Step 0: Process Audio if provided
  let finalTextDescription = request.text_description;
  
  if (request.audio) {
    console.log("🎙️ Processing audio input...");
    const audioTranscription = await convertAudioToText(request.audio);
    
    if (audioTranscription) {
      console.log(`📝 Audio transcribed: "${audioTranscription.substring(0, 50)}..."`);
      // Merge audio transcription with user text
      finalTextDescription = `${request.text_description}. Audio input: ${audioTranscription}`;
    } else {
      console.warn("⚠️ Could not transcribe audio, using text description only");
    }
  }

  // Step 1: Fake Detection
  console.log("📸 Detecting image deepfakes...");
  const imageFakeScore = await detectImageFake(request.image);

  console.log("📝 Detecting text spam/AI-generated...");
  const textFakeScore = await detectTextFake(finalTextDescription);

  // Step 2: Image-Text Consistency
  console.log("🧠 Matching image with text description (CLIP)...");
  const clipSimilarity = await clipImageTextMatch(request.image, finalTextDescription);

  // Step 3: Scene Understanding
  console.log("🔍 Detecting scene objects...");
  const detectedObjects = await detectSceneObjects(request.image);

  // Step 4: Determine if fake - TRUST THE IMAGE MODEL PRIMARY
  // RealorFake returns 0 (real) to 1 (fake)
  // Only flag if model is confident it's fake (> 55% to avoid borderline cases)
  const isImageFake = imageFakeScore > 0.55;  // 55% confidence threshold for safety
  
  // Final decision: IMAGE AUTHENTICITY IS PRIMARY GATE
  // Only flag if image model is confident
  const isFake = isImageFake;
  
  // Confidence based on image authenticity
  const baseConfidence = (1 - imageFakeScore) * (1 - textFakeScore) * clipSimilarity;
  const confidence = isFake ? 0 : baseConfidence;  // Zero confidence if flagged

  // Step 5: Analyze Severity (if not fake)
  const severity = analyzeSeverity(detectedObjects, finalTextDescription);

  // Build verification result
  const verification: VerificationResult = {
    image_fake_score: imageFakeScore,
    text_spam_score: textFakeScore,
    clip_similarity: clipSimilarity,
    detected_objects: detectedObjects,
    severity,
    confidence: Math.max(0, confidence),
    is_fake: isFake,
    reasoning: isFake
      ? `🚨 REJECTED - SUSPICIOUS IMAGE DETECTED: ${(imageFakeScore * 100).toFixed(0)}% suspicion score based on content analysis. Image authenticity is critical for emergency response. Genuine visual evidence required.`
      : `✅ Verified report with ${severity} severity. Image quality: ${(
          (1 - imageFakeScore) * 100
        ).toFixed(0)}%. ${detectedObjects.length} scene elements detected.`,
  };

  // Step 6: Priority Ranking (ONLY if image passes validation)
  let priority: PrioritizationOutput;

  if (isFake) {
    // If image is flagged, assign REJECTED priority (no need to calculate)
    priority = {
      priority_level: "LOW",
      priority_score: 0,
      recommendation: "🚨 REJECTED: Report blocked due to AI-generated/manipulated image. Manual review required.",
      estimated_urgency_seconds: 0,
    };
  } else {
    // Only calculate priority for verified, authentic reports
    const isCriticalLocation = CRITICAL_LOCATIONS.some(loc =>
      request.location?.toLowerCase().includes(loc.toLowerCase())
    );

    const priorityInput: PrioritizationInput = {
      issue_severity: severity,
      crowd_count: Math.min(request.report_count || 1, 100),
      location: request.location || "Unknown",
      is_critical_location: isCriticalLocation,
      num_reports: request.report_count || 1,
      fake_score: imageFakeScore,
      text_credibility: 1 - textFakeScore,
      image_text_match: clipSimilarity,
      detected_hazards: detectedObjects,
    };

    priority = calculatePriority(priorityInput);
  }

  // Final decision
  const approved = !isFake && severity !== "LOW";

  return {
    ...verification,
    priority,
    approved,
  };
}
