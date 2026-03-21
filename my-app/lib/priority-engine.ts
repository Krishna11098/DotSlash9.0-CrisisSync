/**
 * PRIORITY ENGINE & EMERGENCY CLASSIFICATION
 * 
 * Multi-tier system:
 * 1. PRIMARY KEYWORDS (5x weight) - Definitive category indicators
 * 2. SECONDARY KEYWORDS (2x weight) - Supporting context
 * 3. Department base scores: Hospital(0.98), Fire(0.87), Police(0.75), Municipal(0.62)
 * 4. Confidence calculation based on keyword gap
 */

// ===== TYPES =====
export type EmergencyCategory = "Hospital" | "Fire" | "Municipal" | "Police";
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface PriorityResult {
  category: EmergencyCategory;
  priority_level: PriorityLevel;
  priority_score: number; // 0-100
  confidence: number; // 0-1
  department_confidence: number; // Base: 0.98, 0.87, 0.75, 0.62
  recommendation: string;
  estimated_urgency_seconds: number;
  reasoning: string;
}

// ===== BASE CATEGORY PRIORITY SCORES =====
const CATEGORY_BASE_SCORES = {
  Hospital: 0.98,  // Highest - Life safety critical
  Fire: 0.87,      // High - Immediate threat
  Police: 0.75,    // Medium-High - Public safety
  Municipal: 0.62, // Medium - Infrastructure
};

// ===== PRIMARY KEYWORDS (5x weight) =====
const PRIMARY_KEYWORDS = {
  Hospital: [
    "injured",
    "bleeding",
    "unconscious",
    "medical",
    "ambulance",
    "hospital",
    "accident",
    "trauma",
    "emergency",
  ],
  Fire: [
    "fire",
    "burning",
    "smoke",
    "blaze",
    "flames",
    "explosion",
    "gas leak",
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

// ===== SECONDARY KEYWORDS (2x weight) =====
const SECONDARY_KEYWORDS = {
  Hospital: [
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
    "choking",
    "critical",
    "emergency room",
    "ambulance needed",
    "first aid",
    "icu",
    "injured person",
    "severe pain",
    "blood",
  ],
  Fire: [
    "arson",
    "caught on fire",
    "in flames",
    "burning building",
    "electrical fire",
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
  ],
  Municipal: [
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
  ],
  Police: [
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
  ],
};

// ===== HELPER FUNCTIONS =====

/**
 * Match keyword with word boundaries (whole words only)
 */
function matchKeyword(text: string, keyword: string): number {
  try {
    const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Classify incident into emergency category
 * LOGIC: Two-tier keyword matching with confidence scoring
 */
export function classifyEmergencyCategory(
  description: string
): { category: EmergencyCategory; confidence: number; scores: Record<EmergencyCategory, number> } {
  const textLower = description.toLowerCase();
  
  console.log(`🔍 Classifying: "${textLower}"`);
  
  let categoryScores: Record<EmergencyCategory, number> = {
    Hospital: 0,
    Fire: 0,
    Municipal: 0,
    Police: 0,
  };

  // ===== PHASE 1: PRIMARY KEYWORDS (5x weight) =====
  console.log(`\n📋 Checking PRIMARY keywords:`);
  
  (Object.entries(PRIMARY_KEYWORDS) as Array<[EmergencyCategory, string[]]>).forEach(
    ([category, keywords]) => {
      keywords.forEach((kw) => {
        const matches = matchKeyword(textLower, kw);
        if (matches > 0) {
          console.log(`   ✓ ${category}: "${kw}" (${matches}x) = +${matches * 5}`);
          categoryScores[category] += matches * 5;
        }
      });
    }
  );

  // ===== PHASE 2: SECONDARY KEYWORDS (2x weight, only if low primary score) =====
  const totalPrimaryScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
  console.log(`\n📊 Primary score total: ${totalPrimaryScore}`);
  
  if (totalPrimaryScore < 10) {
    console.log(`\n📋 Primary score low, checking SECONDARY keywords:`);
    
    (Object.entries(SECONDARY_KEYWORDS) as Array<[EmergencyCategory, string[]]>).forEach(
      ([category, keywords]) => {
        keywords.forEach((kw) => {
          const matches = matchKeyword(textLower, kw);
          if (matches > 0) {
            console.log(`   ✓ ${category}: "${kw}" (${matches}x) = +${matches * 2}`);
            categoryScores[category] += matches * 2;
          }
        });
      }
    );
  }

  // ===== CALCULATE CONFIDENCE =====
  const entries = Object.entries(categoryScores).sort(([, a], [, b]) => b - a);
  const [winnerName, winnerScore] = entries[0];
  const [, runnerUpScore] = entries[1];

  let confidence = 0;
  if (winnerScore === 0) {
    confidence = 0.3; // Default low confidence
    console.log(`⚠️ No keywords matched, defaulting to Municipal`);
  } else {
    const gap = winnerScore - runnerUpScore;
    const gapRatio = gap / (winnerScore + 5);
    confidence = Math.min(0.5 + gapRatio * 0.5, 1.0); // Range 0.5-1.0
  }

  const category = (winnerScore === 0 ? "Municipal" : winnerName) as EmergencyCategory;
  
  console.log(`\n✅ CLASSIFICATION RESULT:`);
  console.log(`   Category: ${category}`);
  console.log(`   Scores: ${JSON.stringify(categoryScores)}`);
  console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);

  return { category, confidence, scores: categoryScores };
}

/**
 * Calculate priority score based on multiple factors
 */
export function calculatePriorityScore(
  description: string,
  urgencyLevel: "moderate" | "urgent" | "emergency",
  detectedObjects: string[] = []
): PriorityResult {
  console.log(`\n📈 Calculating priority score...`);

  // Step 1: Classify emergency
  const { category, confidence: classificationConfidence } = classifyEmergencyCategory(description);
  const categoryBaseScore = CATEGORY_BASE_SCORES[category];

  // Step 2: Map urgency to score
  const urgencyMap = {
    moderate: 30,
    urgent: 60,
    emergency: 100,
  };
  let baseScore = urgencyMap[urgencyLevel];

  // Step 3: Apply classification confidence
  baseScore = baseScore * classificationConfidence;

  // Step 4: Check for critical keywords
  const criticalKeywords = [
    "fire",
    "explosion",
    "unconscious",
    "bleeding",
    "weapon",
    "injured",
  ];
  const hasCritical = criticalKeywords.some((kw) =>
    matchKeyword(description.toLowerCase(), kw) > 0
  );
  if (hasCritical) {
    baseScore *= 1.3; // 30% boost for critical indicators
    console.log(`   🚨 Critical keyword detected, boosting score +30%`);
  }

  // Step 5: Cap at 100
  baseScore = Math.min(Math.max(baseScore, 0), 100);

  // Step 6: Determine priority level
  let priorityLevel: PriorityLevel;
  let urgencySeconds: number;

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

  // Step 7: Generate recommendation
  const departmentEmojis = {
    Hospital: "🏥",
    Fire: "🚒",
    Municipal: "🏗️",
    Police: "🚔",
  };

  const recommendations = {
    CRITICAL: `${departmentEmojis[category]} CRITICAL - IMMEDIATE DISPATCH to ${category} required. Response time: 1 minute.`,
    HIGH: `${departmentEmojis[category]} HIGH PRIORITY - Route to ${category} department. Response time: 5 minutes.`,
    MEDIUM: `${departmentEmojis[category]} MEDIUM - Route to ${category}. Response time: 15 minutes.`,
    LOW: `${departmentEmojis[category]} LOW - Report logged. Route to ${category} for follow-up.`,
  };

  console.log(`\n✅ PRIORITY RESULT:`);
  console.log(`   Category: ${category} (Base: ${(categoryBaseScore * 100).toFixed(0)}%)`);
  console.log(`   Urgency: ${urgencyLevel}`);
  console.log(`   Score: ${Math.round(baseScore)}/100`);
  console.log(`   Level: ${priorityLevel}`);
  console.log(`   Response Time: ${urgencySeconds}s`);

  return {
    category,
    priority_level: priorityLevel,
    priority_score: Math.round(baseScore),
    confidence: classificationConfidence,
    department_confidence: categoryBaseScore,
    recommendation: recommendations[priorityLevel],
    estimated_urgency_seconds: urgencySeconds,
    reasoning: `Classified as ${category} with ${(classificationConfidence * 100).toFixed(0)}% confidence based on keyword analysis. Priority score: ${Math.round(baseScore)}/100.`,
  };
}

/**
 * Get department from description for auto-routing
 */
export function autoDetectDepartment(
  description: string
): "hospital" | "fire" | "police" | "municipal corporation" {
  const { category } = classifyEmergencyCategory(description);
  
  const departmentMap = {
    Hospital: "hospital",
    Fire: "fire",
    Police: "police",
    Municipal: "municipal corporation",
  } as const;

  return departmentMap[category];
}

/**
 * Get urgency level from score
 */
export function getUrgencyFromScore(score: number): "moderate" | "urgent" | "emergency" {
  if (score >= 80) return "emergency";
  if (score >= 60) return "urgent";
  return "moderate";
}
