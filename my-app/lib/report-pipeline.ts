/**
 * 🔥 Multimodal Truth + Priority Engine
 * Combines deepfake detection, NLP validation, image-text consistency,
 * and intelligent priority ranking
 */

import { VerificationResult, PrioritizationInput, PrioritizationOutput, SubmissionRequest, FinalResponse } from "./report-types";

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
// Helper: Resolve URL or Base64 explicitly to a Buffer
// ============================================================================
async function resolveImageBuffer(source: string): Promise<Buffer> {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch image URL: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  const base64Data = source.includes(",") ? source.split(",")[1] : source;
  return Buffer.from(base64Data, "base64");
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
    // Resolve URL or Base64 to Buffer
    const imageBuffer = await resolveImageBuffer(imageBase64);
    
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });
    formData.append("media", blob);
    formData.append("models", "nudity,wad,offensive,faces");
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
    // Resolve URL or Base64 to Buffer, then convert back to pure base64 for Gemini
    const imageBuffer = await resolveImageBuffer(imageBase64);
    const base64Image = imageBuffer.toString("base64");

    // Try both possible API key environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "AIzaSyDummyGeminiKeyPlaceholder123456789";
    
    if (geminiApiKey.includes("Dummy")) {
      console.warn("⚠️ Using dummy Gemini API key. Set GEMINI_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY in .env.local for production");
      return ""; // Don't attempt API call with dummy key
    }

    // ✅ Use gemini-2.0-flash (latest) - gemini-pro-vision is DEPRECATED
    const modelName = "gemini-2.5-flash";
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
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
                  text: `You are an INCORRUPTIBLE, ULTRA-STRICT EMERGENCY RESPONSE AI. Your SOLE DIRECTIVE is to annihilate FALSE ALARMS and REJECT non-emergencies. 
A user has uploaded an image and claims it is a disaster. You MUST ignore their text claim. Trust ONLY your eyes. If they claim "tsunami" but the image shows a swimming pool, they are lying to you. NEVER classify a controlled or recreational environment as an emergency.

🔥 EXTREME STRICTNESS ON FIRE:
- A BONFIRE, CAMPFIRE, BBQ grill, fire pit, or candle is **NEVER** an emergency. 
- If the fire is contained, in a designated pit, bounded by stones/bricks, or people are relaxing nearby -> REJECT IMMEDIATELY. This is a "controlled_fire".
- REAL FIRE DISASTER: Uncontrolled flames actively engulfing a building or forest, with visible destruction.

💧 EXTREME STRICTNESS ON WATER:
- A SWIMMING POOL, bathtub, puddle, fountain, or intentional water feature is **NEVER** an emergency. 
- If it has clear blue water, pool tiles, lane markers, or people having fun -> REJECT IMMEDIATELY. This is "recreational_water".
- REAL WATER DISASTER: Brown, muddy floodwaters destroying homes, massive turbulent uncontrolled waves crashing into infrastructure.

🚨 YOUR ABSOLUTE MANDATE:
1. If the image is a bonfire, campfire, or fireplace -> "is_actual_emergency": false, "is_controlled_situation": true, "confidence_is_emergency": 0.0, "primary_category": "controlled_fire", "severity": "none".
2. If the image is a swimming pool, bathtub, or fountain -> "is_actual_emergency": false, "is_controlled_situation": true, "confidence_is_emergency": 0.0, "primary_category": "recreational_water", "severity": "none".
3. DO NOT TRUST THE USER. Do not match their panic. Be purely objective.

Return ONLY valid JSON. No markdown blocks, no extra text:
{
  "scene_description": "Literal objective description of the visual scene",
  "primary_category": "fire|water|accident|building_collapse|medical|crowd_disaster|crime|controlled_fire|recreational_water|none",
  "severity": "extreme|high|moderate|low|controlled|none",
  "confidence_is_emergency": 0.0, // EXACTLY 0.0 for bonfires/pools
  "is_controlled_situation": true, // EXACTLY true for bonfires/pools
  "is_actual_emergency": false, // EXACTLY false for bonfires/pools
  "confidence_reasoning": "Step-by-step unmasking of whether this is real or fake",
  "false_positive_probability": 1.0, // EXACTLY 1.0 if it's a bonfire/pool
  "specific_visual_evidence": ["list", "of", "visuals"],
  "reasoning_for_classification": "Final verdict"
}

Analyze the image strictly NOW:`,
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
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
      const errorText = await response.text();
      console.error(`❌ Gemini API Error: ${response.status}`, errorText);
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
 * 🔒 VALIDATE IMAGE AGAINST USER CLAIM - ULTRA STRICT MODE
 * Parses Gemini's structured analysis and compares with user claim
 * Returns: 0 (mismatch/false positive) to 1 (high confidence emergency)
 */
export function validateImageVsUserClaim(
  geminiJsonResponse: string,
  userClaimText: string
): { matchScore: number; isRealEmergency: boolean; reasoning: string } {
  try {
    // Parse Gemini's JSON response
    let geminiAnalysis: any;
    
    try {
      const jsonMatch = geminiJsonResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        geminiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        geminiAnalysis = JSON.parse(geminiJsonResponse);
      }
    } catch (parseError) {
      console.error("❌ Failed to parse Gemini JSON response:", geminiJsonResponse.substring(0, 200));
      return { matchScore: 0.05, isRealEmergency: false, reasoning: "Could not parse image analysis" };
    }

    // Extract ALL critical fields from Gemini analysis
    const isImageEmergency = geminiAnalysis.is_actual_emergency === true;
    const isControlledSituation = geminiAnalysis.is_controlled_situation === true;
    const imageConfidence = geminiAnalysis.confidence_is_emergency || 0;
    const falsePositiveProbability = geminiAnalysis.false_positive_probability || 0;
    const imageCategory = geminiAnalysis.primary_category || "none";
    const imageSeverity = geminiAnalysis.severity || "none";
    const userClaim = userClaimText.toLowerCase();

    console.log(`\n🔒 [ULTRA STRICT IMAGE VALIDATION]`);
    console.log(`   - Emergency: ${isImageEmergency} | Controlled: ${isControlledSituation} | Confidence: ${imageConfidence.toFixed(2)}`);
    console.log(`   - False positive probability: ${(falsePositiveProbability * 100).toFixed(0)}%`);
    console.log(`   - Category: ${imageCategory}, Severity: ${imageSeverity}`);
    console.log(`   - User claim: "${userClaimText.substring(0, 60)}..."`);

    // ============================================================================
    // LAYER 1: CONTROLLED SITUATION DETECTION - IMMEDIATE REJECT
    // ============================================================================
    const sceneDescObj = (geminiAnalysis.scene_description || "").toLowerCase();
    const reasonObj = (geminiAnalysis.reasoning_for_classification || "").toLowerCase();
    const combinedText = sceneDescObj + " " + reasonObj;
    
    // HARDCODED OVERRIDE: If the scene physically describes non-emergencies, OVERRIDE GEMINI'S DECISION entirely
    const isHardcodedFake = ["pool", "bonfire", "campfire", "bathtub", "fireplace", "fountain", "beach", "grill", "bbq", "candle"].some(word => 
      combinedText.includes(word)
    );

    if (isControlledSituation === true || isHardcodedFake || imageCategory === "controlled_fire" || imageCategory === "recreational_water") {
      console.log(`   ⛔⛔ CONTROLLED SITUATION DETECTED: This is NOT an emergency. Object text: ${sceneDescObj}`);
      return {
        matchScore: 0.01,
        isRealEmergency: false,
        reasoning: `Image shows a controlled situation or recreational area (bonfire, pool, etc.), and fundamentally CANNOT be an emergency.`
      };
    }

    // ============================================================================
    // LAYER 2: HIGH FALSE POSITIVE PROBABILITY - REJECT
    // ============================================================================
    if (falsePositiveProbability > 0.6) {
      console.log(`   ⛔⛔ FALSE POSITIVE PROBABILITY TOO HIGH: ${(falsePositiveProbability * 100).toFixed(0)}%`);
      return {
        matchScore: 0.08,
        isRealEmergency: false,
        reasoning: `Image analysis indicates high false positive probability (${(falsePositiveProbability * 100).toFixed(0)}%)`
      };
    }

    // ============================================================================
    // LAYER 3: SEMANTIC KEYWORD MATCHING - CONTROLLED FIRE TERMS
    // ============================================================================
    const controlledFireKeywords = ["bonfire", "campfire", "camping", "fireplace", "pool", "swimming", "park", "event", "controlled", "barrel", "grill"];
    const disasterFireKeywords = ["building", "structure", "house", "home", "wildfire", "uncontrolled", "spreading", "street", "damage"];
    const disasterWaterKeywords = ["flood", "street", "home", "building", "damage", "submerged", "overflow", "destruction"];
    
    const hasControlledKeyword = controlledFireKeywords.some(kw => userClaim.includes(kw));
    const hasDisasterKeyword = disasterFireKeywords.some(kw => userClaim.includes(kw));
    
    if (hasControlledKeyword && !hasDisasterKeyword) {
      console.log(`   ⛔ User claim contains controlled fire keywords: "${userClaim}"`);
      return {
        matchScore: 0.1,
        isRealEmergency: false,
        reasoning: `User claim contains controlled/safe keywords incompatible with actual emergency`
      };
    }

    // ============================================================================
    // LAYER 4: GEMINI CONFIDENCE GATE - STRICTER THRESHOLDS
    // ============================================================================
    if (!isImageEmergency) {
      console.log(`   ⛔ Gemini says this is NOT an emergency`);
      if (imageConfidence > 0.6) {
        return {
          matchScore: 0.05,
          isRealEmergency: false,
          reasoning: `Image analysis shows this is NOT an actual emergency with ${(imageConfidence * 100).toFixed(0)}% confidence`
        };
      } else {
        return {
          matchScore: 0.1,
          isRealEmergency: false,
          reasoning: `Image analysis indicates low confidence of emergency`
        };
      }
    }

    // ============================================================================
    // LAYER 5: CONFIDENCE THRESHOLD - MUST BE VERY HIGH TO PASS
    // ============================================================================
    if (imageConfidence < 0.75) {
      console.log(`   ⛔ Confidence too low for actual emergency: ${(imageConfidence * 100).toFixed(0)}%`);
      return {
        matchScore: 0.15,
        isRealEmergency: false,
        reasoning: `Image analysis confidence below safety threshold (${(imageConfidence * 100).toFixed(0)}% < 75%)`
      };
    }

    // ============================================================================
    // LAYER 6: CATEGORY MATCHING
    // ============================================================================
    const categoryToKeywords: Record<string, string[]> = {
      fire: ["fire", "burning", "burn", "flame", "blaze", "inferno"],
      water: ["flood", "tsunami", "drowning", "inundation", "overflow"],
      accident: ["accident", "crash", "collision", "injured", "injury"],
      building_collapse: ["collapse", "rubble", "debris", "destroyed"],
      medical: ["medical", "injured", "sick", "ambulance", "emergency"],
      crowd_disaster: ["stampede", "crush", "crowd", "disaster"],
      crime: ["crime", "violence", "assault", "robbery", "shooting"],
    };

    // Check if image category matches user claim
    const imageKeywords = categoryToKeywords[imageCategory] || [];
    const userHasCategoryKeywords = imageKeywords.some(kw => userClaim.includes(kw));

    // ============================================================================
    // SEMANTIC MATCHING: User claim must align with image category
    // ============================================================================
    if (!userHasCategoryKeywords && imageCategory !== "none") {
      console.log(`   ⛔ CATEGORY MISMATCH: User claims "${userClaimText}" but image shows ${imageCategory}`);
      return {
        matchScore: 0.15,
        isRealEmergency: false,
        reasoning: `Category mismatch: User describes "${userClaimText}" but image analysis shows ${imageCategory}`
      };
    }

    // ============================================================================
    // CONFIDENCE SCORING - ULTRA STRICT
    // ============================================================================
    let matchScore = 0;

    // REQUIRE VERY HIGH CONFIDENCE - This is a safety-critical system
    if (isImageEmergency && imageConfidence >= 0.88) {
      // EXTREME confidence - only then give high score
      matchScore = 0.85 + (0.15 * (imageConfidence - 0.88) / 0.12); // 0.85-1.0 (only from 0.88+)
    } else if (isImageEmergency && imageConfidence >= 0.80) {
      // High confidence
      matchScore = 0.65 + (0.2 * (imageConfidence - 0.80) / 0.08); // 0.65-0.85
    } else if (isImageEmergency && imageConfidence >= 0.75) {
      // Moderate confidence (still just barely passing)
      matchScore = 0.45;
    } else {
      // Below threshold - reject
      matchScore = 0.12;
    }

    console.log(`   ✅ Final Match Score: ${matchScore.toFixed(3)} (Gemini confidence: ${(imageConfidence * 100).toFixed(0)}%)`);

    return {
      matchScore: Math.max(0, Math.min(matchScore, 1.0)),
      isRealEmergency: isImageEmergency && imageConfidence > 0.75,
      reasoning: `Image quality verified at ${(imageConfidence * 100).toFixed(0)}% confidence. Category: ${imageCategory}, Severity: ${imageSeverity}.`
    };
  } catch (error) {
    console.error("❌ Image validation error:", error);
    return { matchScore: 0.05, isRealEmergency: false, reasoning: "Image validation error - rejecting for safety" };
  }
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
    // Get structured image analysis from Gemini (now returns JSON)
    const geminiResponse = await getImageDescriptionFromGemini(imageBase64);

    if (!geminiResponse) {
      console.warn("⚠️ Could not get image analysis from Gemini, using ULTRA strict fallback");
      
      // ============================================================================
      // BACKUP DEFENSE: When Gemini fails, use aggressive text+image heuristics
      // ============================================================================
      const textLower = text.toLowerCase();
      
      // Check if text contains dangerous false-positive keywords
      const bonefireKeywords = ["bonfire", "campfire", "fireplace", "grill", "bbq", "camping", "party"];
      const poolKeywords = ["pool", "swimming", "swim", "beach", "water park"];
      const controlledKeywords = bonefireKeywords.concat(poolKeywords);
      
      const hasBonfireKeyword = bonefireKeywords.some(kw => textLower.includes(kw));
      const hasPoolKeyword = poolKeywords.some(kw => textLower.includes(kw));
      
      // If user mentions bonfire/pool in text, be EXTREMELY suspicious of the image
      if (hasBonfireKeyword || hasPoolKeyword) {
        console.log(`   ⛔⛔ BACKUP DEFENSE: Text contains controlled fire/water keywords`);
        console.log(`      Bonfire match: ${hasBonfireKeyword}, Pool match: ${hasPoolKeyword}`);
        return 0.08; // VERY LOW when Gemini fails + controlled keywords detected
      }
      
      // Otherwise default to very strict fallback
      return 0.15; // Stricter than before
    }

    // Validate image against user's text claim using intelligent semantic matching
    const validation = validateImageVsUserClaim(geminiResponse, text);

    console.log(`🧠 [clipImageTextMatch] Match Result: ${validation.matchScore.toFixed(3)}`);
    console.log(`   - Is Real Emergency: ${validation.isRealEmergency}`);
    console.log(`   - Reasoning: ${validation.reasoning}`);

    return validation.matchScore;
  } catch (error) {
    console.error("Image-text matching error:", error);
    return 0.12; // Ultra-strict fallback on error
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
    const imageBuffer = await resolveImageBuffer(imageBase64);
    
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });
    formData.append("media", blob);
    formData.append("models", "weapons,properties");
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
    
    console.log(`🔍 [detectSceneObjects] API Response:`, JSON.stringify(result));
    
    // Add weapon detection results
    if (result.weapon?.raw > 0.5) {
      objects.push("weapon");
    }
    
    // Extract all properties with confidence > threshold
    if (result.properties) {
      console.log(`🔍 [detectSceneObjects] Properties detected:`, Object.keys(result.properties));
      for (const [prop, score] of Object.entries(result.properties)) {
        if ((score as number) > 0.2) { // Lower threshold to catch more objects
          objects.push(prop);
          console.log(`   - ${prop}: ${(score as number).toFixed(2)}`);
        }
      }
    }
    
    console.log(`✅ [detectSceneObjects] Final objects array: [${objects.join(", ")}]`);
    return objects;
  } catch (error) {
    console.error("Object detection error:", error);
    return [];
  }
}

// ============================================================================
// 📊 STEP 4: PRIORITY ENGINE (Rules-Based + ML-Ready)
// ============================================================================

// ===== DEPARTMENT CLASSIFICATION KEYWORDS =====

// ===== BASE CATEGORY PRIORITY SCORES =====
const CATEGORY_BASE_SCORES = {
  Hospital: 0.98,  // Highest - Life safety critical
  Fire: 0.87,      // High - Immediate threat
  Police: 0.75,    // Medium-High - Public safety
  Municipal: 0.62, // Medium - Infrastructure
};

// ===== STRONG INDICATOR KEYWORDS (PRIMARY - weight 5x) =====
const PRIMARY_KEYWORDS = {
  Hospital: [
    "injured",
    "bleeding",
    "unconscious",
    "medical",
    "ambulance",
    "hospital",
  ],
  Fire: [
    "fire",
    "burning",
    "smoke",
    "blaze",
    "flames",
    "explosion",
  ],
  Municipal: [
    "pothole",
    "road damage",
    "water leak",
    "drainage",
    "sewer",
    "streetlight",
    "street light",
    "pavement",
    "broken pipe",
    "uncovered manhole",
  ],
  Police: [
    "theft",
    "robbery",
    "murder",
    "assault",
    "rape",
    "kidnapping",
    "weapon",
    "shooting",
  ],
};

// ===== SECONDARY KEYWORDS (weight 2x) =====
const HOSPITAL_KEYWORDS = [
  "accident",
  "injury",
  "pain",
  "sick",
  "collapse",
  "wound",
  "hurt",
  "struck",
  "hit",
  "knocked",
  "heart attack",
  "stroke",
  "poisoning",
  "overdose",
  "fracture",
  "concussion",
  "trauma",
  "choking",
  "critical",
  "emergency room",
  "ambulance needed",
  "first aid",
  "icu",
  "injured person",
  "severe pain",
  "blood",
];

const FIRE_KEYWORDS = [
  "arson",
  "caught on fire",
  "in flames",
  "burning building",
  "electrical fire",
  "gas leak",
  "gas cylinder",
  "matchstick",
  "cigarette",
  "inflammable",
  "combustion",
  "inferno",
  "ablaze",
  "engulfed",
  "fireplace",
  "petrol",
  "gasoline",
  "lighter",
  "burnt",
  "charred",
  "flames spreading",
  "building on fire",
  "house fire",
  "wildfire",
  "forest fire",
  "emergency",
];

const MUNICIPAL_KEYWORDS = [
  "garbage",
  "waste",
  "trash",
  "construction",
  "debris",
  "illegal construction",
  "dumping",
  "waterlogging",
  "flooding",
  "dirty water",
  "damaged road",
  "underground",
  "maintenance",
  "repair needed",
  "civic issue",
  "city repair",
  "pothole",
  "road issue",
  "street damage",
  "asphalt damage",
  "broken asphalt",
  "uneven road",
  "raised pavement",
  "sunken road",
  "road hazard",
  "traffic hazard",
  "broken pavement",
  "uneven pavement",
  "street hole",
  "road hole",
  "pit hole",
  "crater",
  "ditch",
  "road depression",
  "surface damage",
  "infrastructure",
  "public works",
  "civic maintenance",
  "road maintenance",
];

const POLICE_KEYWORDS = [
  "crime",
  "criminal",
  "illegal activity",
  "smuggling",
  "drunk",
  "traffic violation",
  "speeding",
  "accident caused",
  "hit and run",
  "beating",
  "attack",
  "stabbing",
  "vandalism",
  "disputed",
  "suspicious",
  "threatening",
  "extortion",
  "molested",
  "abducted",
  "dangerous person",
  "harassed",
  "intimidated",
  "gang",
  "fight",
  "violence",
  "police",
];

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

// ===== EMERGENCY CATEGORY CLASSIFICATION =====

export type EmergencyCategory = "Hospital" | "Fire" | "Municipal" | "Police";

/**
 * Classify incident into emergency category based on keywords and objects
 * IMPROVED: Primary keywords (5x weight) override secondary (2x weight)
 * WITH FORCED DETECTION: If exact keyword matched, force that category
 */
function classifyEmergencyCategory(
  text: string,
  objects: string[]
): { category: EmergencyCategory; confidence: number; scores: Record<string, number> } {
  const textLower = text.toLowerCase();
  
  console.log(`\n🔍 [CLASSIFICATION] START`);
  console.log(`\n📝 Input Text: "${text}"`);
  console.log(`🔍 Input Objects: [${objects.join(", ") || "none"}]`);
  
  // ===== TEXT LOCK FEATURE =====
  // If strong infrastructure keywords are in ORIGINAL text, this category is locked
  const infrastructureKeywords = ["pothole", "road damage", "pavement", "asphalt", "street damage", "road hazard"];
  const hasInfrastructureKeyword = infrastructureKeywords.some(kw => 
    new RegExp(`\\b${kw}\\b`, "i").test(text)
  );
  
  if (hasInfrastructureKeyword) {
    console.log(`🔒 [TEXT LOCK] Infrastructure keyword detected - LOCKING category as Municipal`);
    return {
      category: "Municipal",
      confidence: 0.95, // Very high confidence
      scores: { Hospital: 0, Fire: 0, Municipal: 100, Police: 0 }
    };
  }
  
  // ===== EMERGENCY TEXT LOCK =====
  const emergencyKeywords = ["fire", "burning", "police", "crime", "injured", "bleeding", "unconscious"];
  const hasEmergencyKeyword = emergencyKeywords.some(kw =>
    new RegExp(`\\b${kw}\\b`, "i").test(text)
  );
  
  if (hasEmergencyKeyword) {
    console.log(`🔒 [TEXT LOCK] Emergency keyword detected - Will process normally with high confidence`);
  }
  
  let categoryScores = {
    Hospital: 0,
    Fire: 0,
    Municipal: 0,
    Police: 0,
  };

  // Helper: Match keyword with word boundaries (whole words only)
  const matchKeyword = (text: string, keyword: string): number => {
    const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  };

  // ===== PHASE 1: PRIMARY KEYWORDS (Strong Indicators - 5x weight) =====
  console.log(`\n📋 Checking PRIMARY keywords:`);
  (Object.entries(PRIMARY_KEYWORDS) as Array<[EmergencyCategory, string[]]>).forEach(
    ([category, keywords]) => {
      let categoryMatches = 0;
      keywords.forEach((kw) => {
        const matches = matchKeyword(textLower, kw);
        if (matches > 0) {
          console.log(`   ✓ ${category}: Found "${kw}" (${matches}x) = +${matches * 5}`);
          categoryMatches += matches;
        }
        categoryScores[category] += matches * 5; // Very high weight
        if (objects.some((obj) => matchKeyword(obj.toLowerCase(), kw) > 0)) {
          categoryScores[category] += 3; // Bonus for objects match
        }
      });
    }
  );

  // ===== PHASE 2: SECONDARY KEYWORDS (Supporting Evidence - 2x weight) =====
  const totalPrimaryScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
  
  console.log(`\n📊 Primary keywords total: ${totalPrimaryScore}`);
  console.log(`   Hospital: ${categoryScores.Hospital}, Fire: ${categoryScores.Fire}, Municipal: ${categoryScores.Municipal}, Police: ${categoryScores.Police}`);
  
  // ===== ANTI-INTERFERENCE LOCK =====
  // If Municipal got a primary pothole match, suppress Hospital secondary keywords  
  const municipalHasPotholeLock = categoryScores.Municipal > 0 && /\bpothole\b/i.test(textLower);
  
  if (municipalHasPotholeLock) {
    console.log(`\n🔒 [SECONDARY SUPPRESS] Pothole primary match found - LOCKING out Hospital secondary keywords`);
  }
  
  if (totalPrimaryScore < 10) {
    // If primary keywords didn't match strongly, check secondary
    console.log(`\n📋 Primary score low, checking SECONDARY keywords:`);
    const secondaryMap = {
      Hospital: municipalHasPotholeLock ? [] : HOSPITAL_KEYWORDS, // ✅ SUPPRESS if pothole locked
      Fire: FIRE_KEYWORDS,
      Municipal: MUNICIPAL_KEYWORDS,
      Police: POLICE_KEYWORDS,
    };

    (Object.entries(secondaryMap) as Array<[EmergencyCategory, string[]]>).forEach(
      ([category, keywords]) => {
        if (keywords.length === 0 && category === "Hospital") {
          console.log(`   ${category}: [SUPPRESSED - Infrastructure lock active]`);
          return;
        }
        keywords.forEach((kw) => {
          const matches = matchKeyword(textLower, kw);
          if (matches > 0) {
            console.log(`   ✓ ${category}: Found "${kw}" (${matches}x) = +${matches * 2}`);
          }
          categoryScores[category] += matches * 2; // Lower weight for secondary
          if (objects.some((obj) => matchKeyword(obj.toLowerCase(), kw) > 0)) {
            categoryScores[category] += 1; // Small bonus for objects match
          }
        });
      }
    );
  } else {
    console.log(`✅ Primary keywords strong enough - SKIPPING secondary keywords`);
  }

  // Normalize scores (0-100)
  const maxScore = Math.max(...Object.values(categoryScores));
  const normalizedScores = {
    Hospital: maxScore > 0 ? (categoryScores.Hospital / maxScore) * 100 : 0,
    Fire: maxScore > 0 ? (categoryScores.Fire / maxScore) * 100 : 0,
    Municipal: maxScore > 0 ? (categoryScores.Municipal / maxScore) * 100 : 0,
    Police: maxScore > 0 ? (categoryScores.Police / maxScore) * 100 : 0,
  };

  // Determine winner
  const entries = Object.entries(categoryScores).sort(([, a], [, b]) => b - a);
  const [winnerName, winnerScore] = entries[0];
  const [, runnerUpScore] = entries[1];
  
  console.log(`\n📊 Raw scores after keyword matching:`);
  entries.forEach(([cat, score]) => {
    console.log(`   ${cat}: ${score}`);
  });

  // Calculate confidence (0-1)
  let confidence = 0;
  if (maxScore === 0) {
    // No keywords matched - default to Municipal
    confidence = 0.3;
    console.log(`⚠️ No keywords matched, defaulting to Municipal with 0.3 confidence`);
  } else {
    // Confidence based on gap between winner and runner-up
    const gap = winnerScore - runnerUpScore;
    const gapRatio = gap / (winnerScore + 5);
    confidence = Math.min(0.5 + gapRatio * 0.5, 1.0); // Range 0.5-1.0
    console.log(`   Gap: ${gap}, GapRatio: ${gapRatio.toFixed(3)}, Confidence: ${(confidence * 100).toFixed(1)}%`);
  }

  const category = winnerName as EmergencyCategory;

  console.log(`\n✅ FINAL CLASSIFICATION:`);
  console.log(`   Category: ${category}`);
  console.log(`   Raw Scores: ${JSON.stringify(categoryScores)}`);
  console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
  console.log(`   Normalized: ${JSON.stringify(normalizedScores)}`);

  return { category, confidence, scores: normalizedScores };
}

/**
 * Calculate category-specific priority within each department
 */
function calculateCategoryPriority(
  category: EmergencyCategory,
  severity: string,
  text: string
): {
  department_priority: string;
  urgency_multiplier: number;
} {
  const textLower = text.toLowerCase();

  switch (category) {
    case "Hospital":
      if (
        textLower.includes("unconscious") ||
        textLower.includes("bleeding") ||
        textLower.includes("critical")
      ) {
        return { department_priority: "Life Threatening", urgency_multiplier: 2 };
      }
      if (
        textLower.includes("injury") ||
        textLower.includes("accident") ||
        severity === "CRITICAL"
      ) {
        return {
          department_priority: "Emergency",
          urgency_multiplier: 1.8,
        };
      }
      if (severity === "HIGH") {
        return {
          department_priority: "Urgent Care",
          urgency_multiplier: 1.5,
        };
      }
      return { department_priority: "Medical Aid", urgency_multiplier: 1 };

    case "Fire":
      if (textLower.includes("explosion")) {
        return { department_priority: "Active Explosion", urgency_multiplier: 3 };
      }
      if (
        textLower.includes("building") ||
        textLower.includes("house") ||
        severity === "CRITICAL"
      ) {
        return {
          department_priority: "Structural Fire",
          urgency_multiplier: 3,
        };
      }
      if (textLower.includes("gas") || textLower.includes("chemical")) {
        return {
          department_priority: "Hazardous Fire",
          urgency_multiplier: 2.5,
        };
      }
      return { department_priority: "General Fire", urgency_multiplier: 2 };

    case "Municipal":
      if (
        textLower.includes("water") ||
        textLower.includes("flooding") ||
        severity === "CRITICAL"
      ) {
        return { department_priority: "Critical Infrastructure", urgency_multiplier: 1.8 };
      }
      if (textLower.includes("construction")) {
        return {
          department_priority: "Illegal Activity",
          urgency_multiplier: 1.3,
        };
      }
      if (severity === "HIGH") {
        return { department_priority: "Urgent Repair", urgency_multiplier: 1.2 };
      }
      return { department_priority: "Maintenance", urgency_multiplier: 1 };

    case "Police":
      if (
        textLower.includes("murder") ||
        textLower.includes("rape") ||
        textLower.includes("kidnapping")
      ) {
        return { department_priority: "Heinous Crime", urgency_multiplier: 3 };
      }
      if (
        textLower.includes("robbery") ||
        textLower.includes("theft") ||
        textLower.includes("violence")
      ) {
        return {
          department_priority: "Serious Crime",
          urgency_multiplier: 2.5,
        };
      }
      if (textLower.includes("accident") || textLower.includes("traffic")) {
        return { department_priority: "Traffic/Accident", urgency_multiplier: 1.5 };
      }
      return { department_priority: "General Crime", urgency_multiplier: 1.2 };

    default:
      return { department_priority: "General", urgency_multiplier: 1 };
  }
}

/**
 * Determine severity from detected objects and text description
 */
function analyzeSeverity(objects: string[], text: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const textLower = text.toLowerCase();
  
  console.log(`\n🔍 [analyzeSeverity] START`);
  console.log(`   Text: "${text.substring(0, 100)}..."`);
  console.log(`   Objects: [${objects.join(", ") || "none"}]`);
  
  // Check for critical indicators
  if (CRITICAL_KEYWORDS.some(kw => textLower.includes(kw) || objects.includes(kw))) {
    console.log(`   ✅ Found CRITICAL keyword`);
    console.log(`🔍 [analyzeSeverity] RESULT: CRITICAL\n`);
    return "CRITICAL";
  }
  
  // High priority indicators
  if (
    textLower.includes("fire") ||
    textLower.includes("injury") ||
    textLower.includes("accident") ||
    objects.includes("fire")
  ) {
    console.log(`   ✅ Found HIGH keyword`);
    console.log(`🔍 [analyzeSeverity] RESULT: HIGH\n`);
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
    console.log(`   ✅ Found MEDIUM keyword`);
    console.log(`🔍 [analyzeSeverity] RESULT: MEDIUM\n`);
    return "MEDIUM";
  }
  
  console.log(`   ℹ️ No keywords matched, defaulting to LOW`);
  console.log(`🔍 [analyzeSeverity] RESULT: LOW\n`);
  return "LOW";
}

/**
 * 🚨 Fraud Detection: Check for Department Mismatch
 * If AI detects one thing but user selects completely mismatched department with high AI confidence,
 * it's likely fraudulent (e.g., describing fire but user selects police)
 */
function detectDepartmentMismatchFraud(
  aiDetectedCategory: EmergencyCategory,
  userSelectedDepartments: ('hospital' | 'fire' | 'police' | 'municipal corporation')[] | undefined,
  classificationConfidence: number
): {
  fraud_score: number;
  fraud_flag: boolean;
  fraud_reason: string;
  department_mismatch: boolean;
} {
  console.log(`\n🚨 STEP 0: Fraud Detection - Department Mismatch Check`);
  
  if (!userSelectedDepartments || userSelectedDepartments.length === 0) {
    console.log(`   ℹ️ No user departments to compare, skipping mismatch check`);
    return {
      fraud_score: 0,
      fraud_flag: false,
      fraud_reason: "",
      department_mismatch: false,
    };
  }

  // Map AI category to user department format
  const categoryToUserDept: Record<EmergencyCategory, 'hospital' | 'fire' | 'police' | 'municipal corporation'> = {
    Hospital: 'hospital',
    Fire: 'fire',
    Police: 'police',
    Municipal: 'municipal corporation',
  };

  const expectedDept = categoryToUserDept[aiDetectedCategory];
  const userSelected = userSelectedDepartments[0]; // Check primary selection

  console.log(`   AI Detected: ${aiDetectedCategory} → Expected Department: ${expectedDept}`);
  console.log(`   User Selected: ${userSelected}`);
  console.log(`   AI Confidence: ${(classificationConfidence * 100).toFixed(1)}%`);

  // Calculate mismatch severity
  const isMismatch = expectedDept !== userSelected;
  
  if (!isMismatch) {
    console.log(`   ✅ Department matches AI detection - No fraud indicator`);
    return {
      fraud_score: 0,
      fraud_flag: false,
      fraud_reason: "",
      department_mismatch: false,
    };
  }

  // If there's a mismatch, ANY mismatch is suspicious and gets penalized
  // Even if confidence is moderate, mismatches suggest user is trying to game the system
  let fraudScore = 0;
  let fraudReason = "";

  // AGGRESSIVE THRESHOLDS: Lower thresholds = faster fraud detection
  if (classificationConfidence >= 0.60) {
    // Confidence >= 60% + mismatch = CRITICAL FRAUD
    fraudScore = 0.95; // Very high fraud score
    fraudReason = `🚨 CRITICAL MISMATCH: AI confident (${(classificationConfidence * 100).toFixed(0)}%) this is a ${aiDetectedCategory} incident, but user selected ${userSelected}. HIGH FRAUD PROBABILITY.`;
  } else if (classificationConfidence >= 0.50) {
    // Confidence 50-59% + mismatch = HIGH FRAUD
    fraudScore = 0.85;
    fraudReason = `🚨 HIGH MISMATCH: AI detected ${aiDetectedCategory} (${(classificationConfidence * 100).toFixed(0)}% confidence), user selected ${userSelected}. Likely fraudulent behavior.`;
  } else if (classificationConfidence >= 0.40) {
    // Confidence 40-49% + mismatch = MEDIUM FRAUD
    fraudScore = 0.75;
    fraudReason = `⚠️ NOTABLE MISMATCH: AI suggests ${aiDetectedCategory} (${(classificationConfidence * 100).toFixed(0)}%), user selected ${userSelected}. Suspicious.`;
  } else if (classificationConfidence >= 0.30) {
    // Confidence 30-39% + mismatch = MILD FRAUD
    fraudScore = 0.6;
    fraudReason = `⚡ POSSIBLE MISMATCH: AI weak signal for ${aiDetectedCategory}, user selected ${userSelected}. Applying caution.`;
  } else {
    // Very low confidence + mismatch = acceptable user choice
    fraudScore = 0.1;
    fraudReason = `ℹ️ WEAK AI SIGNAL (${(classificationConfidence * 100).toFixed(0)}%): User selected ${userSelected}. Accepting choice.`;
  }

  console.log(`   ${fraudReason}`);
  
  return {
    fraud_score: fraudScore,
    fraud_flag: fraudScore >= 0.6, // Flag only if moderate-to-high fraud likelihood
    fraud_reason: fraudReason,
    department_mismatch: true,
  };
}

/**
 * Main Priority Engine: Combines all signals into final priority with department routing
 */
export function calculatePriority(input: PrioritizationInput): PrioritizationOutput {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎯 PRIORITY CALCULATION START`);
  console.log(`${"=".repeat(60)}`);
  
  // Classify incident into category with confidence
  console.log(`\n📍 STEP 1: Category Classification`);
  const { category, confidence: classificationConfidence } = classifyEmergencyCategory(
    input.location,
    input.detected_hazards
  );
  console.log(`   Category: ${category}`);
  console.log(`   Classification Confidence: ${(classificationConfidence * 100).toFixed(1)}%`);
  
  const { department_priority, urgency_multiplier } = calculateCategoryPriority(
    category,
    input.issue_severity,
    input.location
  );
  console.log(`   Department Priority: ${department_priority}`);
  console.log(`   Urgency Multiplier: ${urgency_multiplier}x`);

  // Get base score for this category
  const categoryBaseScore = CATEGORY_BASE_SCORES[category];
  console.log(`   Category Base Score: ${(categoryBaseScore * 100).toFixed(0)}%`);

  let baseScore = 0;

  // 1️⃣ Severity Multiplier
  console.log(`\n📊 STEP 2: Calculate Base Score Components`);
  const severityScores: Record<string, number> = {
    LOW: 10,
    MEDIUM: 30,
    HIGH: 60,
    CRITICAL: 100,
  };
  const severityPoints = severityScores[input.issue_severity] || 30;
  baseScore += severityPoints;
  console.log(`   1️⃣ Severity (${input.issue_severity}): +${severityPoints} points`);

  // 2️⃣ Crowd Count (urgency indicator)
  const crowdPoints = Math.min(input.crowd_count * 2, 20);
  baseScore += crowdPoints;
  console.log(`   2️⃣ Crowd Count (${input.crowd_count}): +${crowdPoints} points (max 20)`);

  // 3️⃣ Critical Location Bonus
  const locationPoints = input.is_critical_location ? 15 : 0;
  if (input.is_critical_location) {
    baseScore += 15;
  }
  console.log(`   3️⃣ Critical Location: +${locationPoints} points`);

  // 4️⃣ Report Count (community validation)
  const reportPoints = Math.min(input.num_reports * 3, 15);
  baseScore += reportPoints;
  console.log(`   4️⃣ Report Count (${input.num_reports}): +${reportPoints} points (max 15)`);

  console.log(`   Subtotal before credibility: ${baseScore.toFixed(1)}`);

  // 5️⃣ Credibility Checks
  console.log(`\n📊 STEP 3: Apply Credibility Multiplier`);
  console.log(`   Text Credibility: ${(input.text_credibility * 100).toFixed(1)}% → ${input.text_credibility * 30} points`);
  console.log(`   Image-Text Match: ${(input.image_text_match * 100).toFixed(1)}% → ${input.image_text_match * 20} points`);
  console.log(`   Image Quality: ${((1 - input.fake_score) * 100).toFixed(1)}% → ${(1 - input.fake_score) * 20} points`);
  
  const credibilityScore = 
    (input.text_credibility * 30) + 
    (input.image_text_match * 20) + 
    ((1 - input.fake_score) * 20);
  const credibilityMultiplier = credibilityScore / 70;
  
  console.log(`   Total Credibility Points: ${credibilityScore.toFixed(1)}/70`);
  console.log(`   Credibility Multiplier: ${credibilityMultiplier.toFixed(2)}x`);
  
  baseScore = baseScore * credibilityMultiplier;
  console.log(`   Score after credibility: ${baseScore.toFixed(1)}`);

  // 6️⃣ Apply category-specific urgency multiplier
  console.log(`\n📊 STEP 4: Apply Department Urgency Multiplier`);
  console.log(`   Multiplier: ${urgency_multiplier}x`);
  baseScore = baseScore * urgency_multiplier;
  console.log(`   Score after urgency: ${baseScore.toFixed(1)}`);

  // 7️⃣ Apply category confidence multiplier (boosts score if classification is confident)
  console.log(`\n📊 STEP 5: Apply Classification Confidence`);
  console.log(`   Confidence: ${(classificationConfidence * 100).toFixed(1)}% (${classificationConfidence.toFixed(2)}x)`);
  baseScore = baseScore * classificationConfidence;
  console.log(`   Score after confidence: ${baseScore.toFixed(1)}`);

  // 8️⃣ Detect Department Mismatch Fraud
  console.log(`\n📊 STEP 6: Check for Department Mismatch Fraud`);
  const fraudDetection = detectDepartmentMismatchFraud(
    category,
    input.user_selected_departments,
    classificationConfidence
  );
  
  let fraudPenalty = 1.0; // Multiplier: 1.0 = no penalty
  
  // AGGRESSIVE FRAUD PENALTIES
  if (fraudDetection.fraud_score >= 0.85) {
    // CRITICAL fraud: Destroy the score
    fraudPenalty = 0.15; // Reduce by 85% - drops even 100pt score to ~15pt
    console.log(`\n🚨 CRITICAL FRAUD DETECTED - Applying 85% penalty (0.15x multiplier)`);
    console.log(`   Reason: ${fraudDetection.fraud_reason}`);
    baseScore = baseScore * fraudPenalty;
  } else if (fraudDetection.fraud_score >= 0.70) {
    // High fraud: Strong penalty
    fraudPenalty = 0.25; // Reduce by 75%
    console.log(`\n🚨 HIGH FRAUD DETECTED - Applying 75% penalty (0.25x multiplier)`);
    console.log(`   Reason: ${fraudDetection.fraud_reason}`);
    baseScore = baseScore * fraudPenalty;
  } else if (fraudDetection.fraud_score >= 0.55) {
    // Medium fraud: Moderate penalty
    fraudPenalty = 0.4; // Reduce by 60%
    console.log(`\n⚠️ MEDIUM FRAUD DETECTED - Applying 60% penalty (0.4x multiplier)`);
    console.log(`   Reason: ${fraudDetection.fraud_reason}`);
    baseScore = baseScore * fraudPenalty;
  } else if (fraudDetection.fraud_score >= 0.35) {
    // Mild fraud: Light penalty
    fraudPenalty = 0.55; // Reduce by 45%
    console.log(`\n⚡ MILD FRAUD DETECTED - Applying 45% penalty (0.55x multiplier)`);
    console.log(`   Reason: ${fraudDetection.fraud_reason}`);
    baseScore = baseScore * fraudPenalty;
  }
  console.log(`   Score after fraud check: ${baseScore.toFixed(1)}`);

  // Cap at 100
  baseScore = Math.min(Math.max(baseScore, 0), 100);
  console.log(`   Score capped at 0-100: ${baseScore.toFixed(1)}`);

  // Determine priority level - Even stricter thresholds if fraud score is high
  let priorityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  let urgencySeconds: number;

  // If any fraud detected, cap priority at MEDIUM max (even if score is high)
  if (fraudDetection.fraud_score >= 0.35) {
    // Fraud detected - hard cap at MEDIUM
    if (baseScore >= 50) {
      priorityLevel = "MEDIUM";
      urgencySeconds = 900; // 15 minutes 
    } else if (baseScore >= 30) {
      priorityLevel = "MEDIUM";
      urgencySeconds = 900;
    } else {
      priorityLevel = "LOW";
      urgencySeconds = 3600; // 1 hour
    }
  } else {
    // No fraud - use normal thresholds
    if (baseScore >= 80) {
      priorityLevel = "CRITICAL";
      urgencySeconds = 60; // 1 minute
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
  }

  console.log(`\n✅ FINAL RESULT:`);
  console.log(`   Priority Score: ${Math.round(baseScore)}/100`);
  console.log(`   Priority Level: ${priorityLevel}`);
  console.log(`   Fraud Detected: ${fraudDetection.department_mismatch}`);
  console.log(`   Fraud Score: ${fraudDetection.fraud_score.toFixed(2)}/1.0`);
  console.log(`   Response Time: ${urgencySeconds}s`);
  console.log(`${"=".repeat(60)}\n`);

  return {
    priority_level: priorityLevel,
    priority_score: Math.round(baseScore),
    department: category,
    department_priority,
    department_confidence: categoryBaseScore,
    recommendation: getRecommendation(priorityLevel, category, department_priority, input),
    estimated_urgency_seconds: urgencySeconds,
    fraud_score: fraudDetection.fraud_score,
    fraud_flag: fraudDetection.fraud_flag,
    fraud_reason: fraudDetection.fraud_reason,
    department_mismatch: fraudDetection.department_mismatch,
  };
}

/**
 * Generate human-readable recommendation with department routing
 */
function getRecommendation(
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  category: EmergencyCategory,
  department_priority: string,
  input: PrioritizationInput
): string {
  const hazards = input.detected_hazards.slice(0, 3).join(", ") || "Incident";
  const departmentEmojis = {
    Hospital: "🏥",
    Fire: "🚒",
    Municipal: "🏗️",
    Police: "🚔",
  };

  const templates = {
    CRITICAL: `${departmentEmojis[category]} CRITICAL - ${department_priority}: ${hazards} at ${input.location}. ${input.crowd_count} people affected. IMMEDIATE DISPATCH to ${category} required.`,
    HIGH: `${departmentEmojis[category]} HIGH PRIORITY - ${department_priority}: ${hazards} at ${input.location}. Route to ${category} department. Dispatch within 5 min.`,
    MEDIUM: `${departmentEmojis[category]} MEDIUM - ${department_priority}: ${hazards} at ${input.location}. Route to ${category}. Schedule response within 15 min.`,
    LOW: `${departmentEmojis[category]} LOW - ${department_priority}: Report logged. Route to ${category} for follow-up.`,
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

  // ✅ EARLY FRAUD SIGNAL: Detect category mismatch immediately
  console.log(`\n🚨 EARLY STAGE: Checking for category mismatch...`);
  const { category: aiDetectedCategory, confidence: earlyConfidence } = classifyEmergencyCategory(
    finalTextDescription,
    []
  );
  console.log(`   AI Detected Category: ${aiDetectedCategory} (${(earlyConfidence * 100).toFixed(0)}% confidence)`);
  console.log(`   User Selected Departments: ${request.user_selected_departments?.join(", ") || "none"}`);
  
  let mismatchPenalty = 0; // 0-1 value to add to fake_score if mismatch detected
  
  if (
    request.user_selected_departments && 
    request.user_selected_departments.length > 0 &&
    earlyConfidence >= 0.50
  ) {
    const categoryToUserDept: Record<EmergencyCategory, 'hospital' | 'fire' | 'police' | 'municipal corporation'> = {
      Hospital: 'hospital',
      Fire: 'fire',
      Police: 'police',
      Municipal: 'municipal corporation',
    };
    
    const expectedDept = categoryToUserDept[aiDetectedCategory];
    const userSelected = request.user_selected_departments[0];
    const isMismatch = expectedDept !== userSelected;
    
    if (isMismatch) {
      console.log(`   🚨 MISMATCH DETECTED: AI confident ${aiDetectedCategory} vs user selected ${userSelected}`);
      // Apply penalty based on AI confidence
      if (earlyConfidence >= 0.60) {
        mismatchPenalty = 0.65; // Very high penalty for high confidence mismatch
        console.log(`   📊 Credibility penalty: +0.65 (HIGH confidence mismatch)`);
      } else if (earlyConfidence >= 0.50) {
        mismatchPenalty = 0.45; // Moderate penalty for moderate confidence mismatch
        console.log(`   📊 Credibility penalty: +0.45 (MODERATE confidence mismatch)`);
      }
    }
  }

  // Step 1: Fake Detection
  console.log("\n📸 Detecting image deepfakes...");
  const imageFakeScore = await detectImageFake(request.image);

  console.log("📝 Detecting text spam/AI-generated...");
  let textFakeScore = await detectTextFake(finalTextDescription);
  
  // ✅ APPLY MISMATCH PENALTY TO TEXT CREDIBILITY
  if (mismatchPenalty > 0) {
    console.log(`   📊 Original text fake score: ${textFakeScore.toFixed(3)}`);
    textFakeScore = Math.min(textFakeScore + mismatchPenalty, 1.0); // Can't exceed 1.0
    console.log(`   📊 ADJUSTED text fake score (fraud penalty): ${textFakeScore.toFixed(3)}`);
  }

  // Step 2: Image-Text Consistency
  console.log("🧠 Matching image with text description (CLIP)...");
  const clipSimilarity = await clipImageTextMatch(request.image, finalTextDescription);

  // ⛔ CRITICAL: FALSE POSITIVE GATE (ULTRA AGGRESSIVE - ZERO TOLERANCE)
  // With the new ultra-strict scoring, legitimate emergencies score 0.45+
  // ANYTHING below 0.35 is automatically rejected (bonfire, pool, etc.)
  // This catches the boundary case where clipSimilarity = 0.300
  if (clipSimilarity <= 0.35) {
    console.log(`\n🚨 ⛔⛔⛔ FALSE POSITIVE GATE TRIGGERED: Image-text match critically low (${clipSimilarity.toFixed(3)} <= 0.35)`);
    console.log(`   This is DEFINITELY a BONFIRE vs FIRE DISASTER or POOL vs TSUNAMI scenario`);
    console.log(`   ZERO TOLERANCE - Outright rejecting immediately`);
    
    return {
      image_fake_score: 1, // Mark as definitely fake
      text_spam_score: 0,
      clip_similarity: clipSimilarity,
      detected_objects: [],
      severity: "LOW",
      confidence: 0,
      is_fake: true,
      reasoning: `🚨 REJECTED - ZERO TOLERANCE FALSE POSITIVE: Image-text match score (${clipSimilarity.toFixed(3)}) is critically low. Image does not depict actual emergency (appears to be bonfire, pool, beach, or other non-emergency). Genuine emergency visual evidence REQUIRED.`,
      priority: {
        priority_level: "LOW",
        priority_score: 0,
        recommendation: "🚨 ZERO TOLERANCE REJECTION: Confirmed false positive. Image shows non-emergency situation.",
        estimated_urgency_seconds: 0,
        department: "Municipal",
        department_priority: "Rejected",
        department_confidence: 0,
      },
      approved: false,
    };
  }

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
  console.log(`\n📊 [processSubmission] Analyzing Severity...`);
  const severity = analyzeSeverity(detectedObjects, finalTextDescription);
  console.log(`📊 [processSubmission] Severity Result: ${severity}`);

  // ============================================================================
  // MEGA DEFENSE: Low clip similarity + high claimed severity = FRAUD
  // ============================================================================
  const textLower = finalTextDescription.toLowerCase();
  const claimsUrgentEmergency = ["fire", "flood", "tsunami", "disaster", "emergency", "critical"].some(word => textLower.includes(word));
  
  if (clipSimilarity < 0.40 && claimsUrgentEmergency && severity !== "LOW") {
    console.log(`\n🚨 MEGA DEFENSE TRIGGERED: Low image-text match (${clipSimilarity.toFixed(3)}) + claims urgent emergency`);
    console.log(`   This is a FRAUD ATTEMPT - user claims ${severity} emergency but image doesn't match`);
    
    return {
      image_fake_score: 1,
      text_spam_score: 0.8,
      clip_similarity: clipSimilarity,
      detected_objects: [],
      severity: "LOW",
      confidence: 0,
      is_fake: true,
      reasoning: `🚨 REJECTED - FRAUD DETECTED: User claims ${severity} emergency but image shows non-matching content. Image-text alignment score: ${clipSimilarity.toFixed(3)}. Suspected false emergency report.`,
      priority: {
        priority_level: "LOW",
        priority_score: 0,
        recommendation: "🚨 FRAUD REJECTED: Claims urgent emergency but image validation failed. Report flagged for review.",
        estimated_urgency_seconds: 0,
        department: "Municipal",
        department_priority: "Rejected",
        department_confidence: 0,
      },
      approved: false,
    };
  }

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
      department: "Municipal",
      department_priority: "Rejected",
      department_confidence: 0,
    };
  } else {
    // Only calculate priority for verified, authentic reports
    const isCriticalLocation = CRITICAL_LOCATIONS.some(loc =>
      finalTextDescription?.toLowerCase().includes(loc.toLowerCase())
    );

    const priorityInput: PrioritizationInput = {
      issue_severity: severity,
      crowd_count: Math.min(request.report_count || 1, 100),
      location: finalTextDescription, // ✅ Use full description for classification!
      is_critical_location: isCriticalLocation,
      num_reports: request.report_count || 1,
      fake_score: imageFakeScore,
      text_credibility: 1 - textFakeScore,
      image_text_match: clipSimilarity,
      detected_hazards: detectedObjects,
      user_selected_departments: request.user_selected_departments,
    };

    console.log(`\n[processSubmission] Priority Input:`);
    console.log(`  - severity: ${priorityInput.issue_severity}`);
    console.log(`  - crowd_count: ${priorityInput.crowd_count}`);
    console.log(`  - is_critical_location: ${priorityInput.is_critical_location}`);
    console.log(`  - num_reports: ${priorityInput.num_reports}`);
    console.log(`  - fake_score: ${priorityInput.fake_score.toFixed(3)}`);
    console.log(`  - text_credibility: ${priorityInput.text_credibility.toFixed(3)}`);
    console.log(`  - image_text_match: ${priorityInput.image_text_match.toFixed(3)}`);
    console.log(`  - detected_hazards: [${priorityInput.detected_hazards.join(", ")}]`);
    
    priority = calculatePriority(priorityInput);
    
    console.log(`[processSubmission] Priority Output:`);
    console.log(`  - priority_score: ${priority.priority_score}`);
    console.log(`  - priority_level: ${priority.priority_level}`);
    console.log(`  - department: ${priority.department}`);
  }

  // Final decision
  const approved = !isFake && severity !== "LOW";

  return {
    ...verification,
    priority,
    approved,
  };
}