/**
 * 🔥 Multimodal Truth + Priority Engine
 * Combines deepfake detection, NLP validation, image-text consistency,
 * and intelligent priority ranking
 */

import { VerificationResult, PrioritizationInput, PrioritizationOutput, SubmissionRequest, FinalResponse } from "./types";

// ============================================================================
// 🧠 STEP 1: FAKE DETECTION MODELS
// ============================================================================

/**
 * Image Fake Detection
 * Uses umm-maybe/AI-image-detector (specialized model)
 * Trust the model completely - if it says AI generated, we flag it
 * Returns: 0 (real) to 1 (fake/AI-generated)
 */
/**
 * Image Fake Detection
 * Uses Organizzazione/RealorFake - Binary classifier for real vs fake/AI images
 * More reliable than single-task models
 * Returns: 0 (real) to 1 (fake/AI-generated)
 */
export async function detectImageFake(imageBase64: string): Promise<number> {
  try {
    // Using Organizzazione/RealorFake model - specifically trained for real/fake detection
    const imageBuffer = Buffer.from(imageBase64.split(",")[1] || imageBase64, "base64");
    
    const response = await fetch(
      "https://api-inference.huggingface.co/models/Organizzazione/RealorFake",
      {
        headers: { Authorization: `Bearer ${process.env.HF_API_KEY || ""}` },
        method: "POST",
        body: imageBuffer,
      }
    );

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return 0.5;
    }

    const result = await response.json();
    
    console.log("🔍 Raw model response:", JSON.stringify(result, null, 2));
    
    if (!result || !Array.isArray(result)) {
      console.warn("⚠️ Unexpected response format");
      return 0.5;
    }

    // Parse RealorFake model output
    let fakeScore = 0;
    let realScore = 0;
    const allLabels: Array<{label: string; score: number}> = [];
    
    result.forEach((item: {label: string; score: number}) => {
      const label = item.label.toLowerCase().trim();
      allLabels.push({ label, score: item.score });
      
      // RealorFake returns "REAL" or "FAKE" labels
      if (label === "real") {
        realScore = item.score;
      } else if (label === "fake") {
        fakeScore = item.score;
      }
    });

    // Use FAKE score (if real = 0.95, then fake = 0.05)
    const finalScore = fakeScore;
    
    console.log(`✅ RealorFake Detection: Real=${(realScore * 100).toFixed(1)}% | Fake=${(fakeScore * 100).toFixed(1)}%`);
    
    return finalScore;
  } catch (error) {
    console.error("❌ RealorFake error:", error);
    return 0.5;
  }
}

/**
 * Text Fake/Spam Detection
 * Uses RoBERTa to detect AI-generated, spam, or irrelevant content
 * Returns: 0 (clean) to 1 (spam/AI-generated)
 */
export async function detectTextFake(text: string): Promise<number> {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/roberta-base-openai-detector",
      {
        headers: { Authorization: `Bearer ${process.env.HF_API_KEY || ""}` },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      }
    );

    const result = await response.json() as Array<{label: string; score: number}[]>;
    
    // Find AI-generated/fake score
    const fakeScore = result[0]?.find(r => r.label.toLowerCase().includes("fake"));
    return fakeScore ? fakeScore.score : 0;
  } catch (error) {
    console.error("Text fake detection error:", error);
    return 0.3;  // Neutral fallback
  }
}

// ============================================================================
// 🧩 STEP 2: IMAGE-TEXT CONSISTENCY (CLIP)
// ============================================================================

/**
 * CLIP: Image-Text Matching
 * Validates image and text are actually describing the same thing
 * High mismatch = suspicious report
 *
 * e.g., Image shows "fire" but text says "broken streetlight" → suspicious
 * Returns: 0 (mismatch) to 1 (perfect match)
 */
export async function clipImageTextMatch(
  imageBase64: string,
  text: string
): Promise<number> {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32",
      {
        headers: { Authorization: `Bearer ${process.env.HF_API_KEY || ""}` },
        method: "POST",
        body: JSON.stringify({
          image: imageBase64,
          candidate_labels: [text],
        }),
      }
    );

    const result = await response.json() as {scores: number[]};
    return result.scores[0] || 0.5;
  } catch (error) {
    console.error("CLIP matching error:", error);
    return 0.6; // Neutral fallback
  }
}

// ============================================================================
// 🔍 STEP 3: SCENE UNDERSTANDING (Object Detection)
// ============================================================================

/**
 * Detect objects in image (fire, water, crowd, debris, etc.)
 * Uses DETR (Detection Transformer) for robust object detection
 * Returns: array of detected object labels
 */
export async function detectSceneObjects(imageBase64: string): Promise<string[]> {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/detr-resnet-50",
      {
        headers: { Authorization: `Bearer ${process.env.HF_API_KEY || ""}` },
        method: "POST",
        body: Buffer.from(imageBase64.split(",")[1] || imageBase64, "base64"),
      }
    );

    const result = await response.json() as Array<{label: string; score: number}>;
    
    // Filter high-confidence detections
    const objects = result
      .filter((r: {score: number}) => r.score > 0.5)
      .map((r: {label: string}) => r.label)
      .slice(0, 10); // Top 10 objects

    return objects;
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
  const severityScores = {
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

  // Step 1: Fake Detection
  console.log("📸 Detecting image deepfakes...");
  const imageFakeScore = await detectImageFake(request.image);

  console.log("📝 Detecting text spam/AI-generated...");
  const textFakeScore = await detectTextFake(request.text_description);

  // Step 2: Image-Text Consistency
  console.log("🧠 Matching image with text description (CLIP)...");
  const clipSimilarity = await clipImageTextMatch(request.image, request.text_description);

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
  const severity = analyzeSeverity(detectedObjects, request.text_description);

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
      ? `🚨 REJECTED - AI-GENERATED IMAGE DETECTED: ${(imageFakeScore * 100).toFixed(0)}% probability of artificial/manipulated content. ${
          isImageHighlyFake ? "Strong AI generation indicators present. " : ""
        }Image authenticity is critical for emergency response. Genuine visual evidence required.`
      : `✅ Verified report with ${severity} severity. Image authenticity: ${(
          (1 - imageFakeScore) * 100
        ).toFixed(0)}%. ${detectedObjects.length} hazards detected.`,
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
