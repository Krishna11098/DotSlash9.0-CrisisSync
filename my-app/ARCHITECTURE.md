# 🏗️ Architecture Deep Dive

Technical implementation details of the Multimodal Truth + Priority Engine.

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                       │
│         ReportSubmissionForm.tsx + page.tsx             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Image + Text Description
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   API ROUTE                              │
│         /api/verify-report (route.ts)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│      UNIFIED MULTIMODAL PIPELINE (report-pipeline.ts)     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. FAKE DETECTION                               │   │
│  │     ├─ detectImageFake()                          │   │
│  │     └─ detectTextFake()                           │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  2. SEMANTIC CONSISTENCY (Gemini + Zod)          │   │
│  │     └─ clipImageTextMatch()                       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  3. SCENE UNDERSTANDING                          │   │
│  │     └─ detectSceneObjects()                       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  4. PRIORITY RANKING                             │   │
│  │     └─ calculatePriority()                        │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼ JSON Response
┌─────────────────────────────────────────────────────────┐
│              API RESPONSE (FinalResponse)                │
│  {                                                      │
│    verified: boolean,                                   │
│    priority_level: CRITICAL|HIGH|MEDIUM|LOW,           │
│    priority_score: 0-100,                              │
│    confidence: 0-1,                                     │
│    recommendation: string                              │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Component Deep Dive

### 1. Frontend Layer (`ReportSubmissionForm.tsx`)

**Responsibilities:**
- Image upload
- Form validation
- API communication
- Result visualization

**Key Functions:**

```typescript
handleImageUpload()        // Convert file to base64
handleSubmit()             // Validate & send to API
<ResultScreen />           // Display verification results

// Scores displayed
- Image Authenticity (%)
- Text Credibility (%)
- Image-Text Match (%)
- Overall Confidence (%)
```

**State Management:**
```typescript
state = {
  loading: boolean,      // Processing status
  submitted: boolean,    // Form submission state
  result?: FinalResponse, // API response
  error?: string         // Error messages
}
```

---

### 2. API Route (`/api/verify-report/route.ts`)

**Responsibilities:**
- Request validation
- Pipeline orchestration
- Error handling
- Response formatting

**Endpoint Handlers:**

```typescript
POST /api/verify-report
  ├─ Validate input
  ├─ Call processSubmission()
  ├─ Return results
  └─ Log processing

GET /api/verify-report
  └─ Health check + capabilities
```

**Error Handling:**
```typescript
- Missing fields → 400 Bad Request
- Processing error → 500 Internal Server Error
- Timeout → Graceful fallback with neutral scores
```

---

### 3. ML Pipeline (`pipeline.ts`)

#### Step 1: Fake Detection

**Image Content Analysis (`detectImageFake`)**

```
Image (base64)
    ↓
Sightengine API
  ├─ Nudity Detection
  ├─ Weapon Detection
  ├─ Offensive Content Detection
  └─ Face Detection
    ↓
Suspicion Score Calculation:
  - Inappropriate content → +0.25
  - Weapons/Violence → +0.25
  - Offensive content → +0.15
    ↓
Output: suspicion_score (0-1)
    ↓
Return: fake_score (0-1)
```

**Why Sightengine?**
- ✅ Content moderation expertise
- ✅ Real-time processing
- ✅ Multiple detection models in one API
- ✅ Works with HuggingFace API

**Text Fake Detection (`detectTextFake`)**

```
Text Description
    ↓
Heuristic Analysis
    ├─ Excessive CAPS detection
    ├─ Character repetition check
    ├─ Spam keyword matching
    ├─ Suspicious URL count
    └─ Text length validation
    ↓
Spam Score Calculation:
  - Excessive caps (>70%) → +0.3
  - Repeated chars (4+) → +0.2
  - Spam keywords → +0.4
  - Multiple URLs (>2) → +0.3
  - Invalid length → +0.15
    ↓
Return: spam_score (0-1)
```

**Why Heuristics?**
- ✅ Fast and lightweight
- ✅ No external API calls for text
- ✅ Complements Sightengine image analysis
- ✅ Catches obvious spam patterns

#### Step 2: Consistency Check

**Multimodal Visual-Semantic Consistency (`clipImageTextMatch`)**

```
Image + Text Claim
    ↓
Gemini Vision Model
    ├─ Analyze scene strictly
    ├─ Detect controlled fire/water situations
    ├─ Assess actual emergency confidence
    └─ Return structured JSON
    ↓
Zod Schema Verification
    ├─ Type-safe properties parse
    ├─ Fallback on validation failure
    ↓
Output: match_score (0-1)
```

**Why Gemini Multimodal instead of local models?**
- ✅ **One Unified API Call:** Consolidates deepfake, text classification, and scene consistency checks into a single backend API call, reducing latency and pipeline complexity.
- ✅ **Structured Output Schema:** Natively uses Gemini's structured response schema to guarantee type-safe responses.
- ✅ **Double-Layer Validation:** Backed by Zod schema parsing on the server to prevent malicious/malformed JSON ingestion.

#### Step 3: Scene Understanding

**Content-based Scene Analysis (`detectSceneObjects`)**

```
Image
    ↓
Sightengine API
    ├─ Weapon Detection
    ├─ Property Tags
    └─ Face Detection
    ↓
Extract Detected Properties
    (threshold: >0.5 confidence)
    ↓
Output: [
  "vehicle",
  "person",
  "outdoor",
  "building"
]
    ↓
Top 10 properties returned
```

**Sightengine Tags:**
```
- weapon
- vehicle (cars, trucks)
- person (faces, people)
- outdoor/indoor
- nature
- building
```

**Why Sightengine Tags?**
- ✅ Integrated with moderation API
- ✅ Fast multi-model inference
- ✅ Content-aware detection
- ✅ Single API for all image analysis
  - person_injured
  - landslide

HIGH:
  - vehicle (accident)
  - smoke
  - damage

MEDIUM:
  - garbage
  - traffic_sign
  - vehicle
```

**Why DETR?**
- ✅ End-to-end detection
- ✅ No NMS needed (fewer hyperparams)
- ✅ Good at detecting multiple objects
- ✅ mAP 42.0 on COCO

#### Step 4: Priority Ranking

**Severity Analysis (`analyzeSeverity`)**

```
Input:
  - detected_objects: ["fire", "person"]
  - text: "Building on fire, people inside"

Process:
  1. Search for critical keywords
  2. Check for hazard combinations
  3. Analyze severity indicators
    
Output: Severity level
```

**Priority Calculation (`calculatePriority`)**

```
score = 0

// 1. Severity multiplier (10-100)
severity_score = {
  LOW: 10,
  MEDIUM: 30,
  HIGH: 60,
  CRITICAL: 100
}
score += severity_score[severity]

// 2. Crowd effects (×2 multiplier)
score += min(crowd_count * 2, 20)

// 3. Critical location bonus
if (is_critical_location) {
  score += 15
}

// 4. Community validation
score += min(num_reports * 3, 15)

// 5. Credibility weighting
credibility = (
  text_credibility * 30 +
  image_text_match * 20 +
  (1 - fake_score) * 20
) / 70

score *= credibility

// Final decision
if (score >= 80) → CRITICAL (1 min)
else if (score >= 60) → HIGH (5 min)
else if (score >= 40) → MEDIUM (15 min)
else → LOW (1 hour)
```

**Formula Breakdown:**

```
Score = Base(30) + (Crowd(0-20) + Location(0-15))
         × Credibility(0-1) + Reports(0-15)

Example 1: Active Fire
  Severity: 100 (CRITICAL)
  Crowd: 10 people → +20
  Location: Hospital → +15
  Reports: 5 → +15
  Credibility: 0.9
  Score = (100 + 20 + 15 + 15) × 0.9 = 126 → 100 (capped)
  Result: 🚨 CRITICAL (100/100)

Example 2: Maintenance Issue  
  Severity: 10
  Crowd: 0
  Location: Regular street
  Reports: 1
  Credibility: 0.8
  Score = (10 + 0 + 0 + 3) × 0.8 = 10.4
  Result: ✓ LOW (10/100)
```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│ SUBMISSION (SubmissionRequest)                           │
│ {                                                        │
│   image: base64,                                         │
│   text_description: string,                              │
│   location?: string,                                     │
│   report_count?: number,                                 │
│   coordinates?: { lat, lng }                             │
│ }                                                        │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Fake Detection                                   │
│ ├─ imageFakeScore = detectImageFake(image)              │
│ ├─ textSpamScore = detectTextFake(text)                 │
│ └─ clipSimilarity = clipImageTextMatch(image, text)     │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 2: Verification Result (VerificationResult)         │
│ {                                                        │
│   image_fake_score,                                      │
│   text_spam_score,                                       │
│   clip_similarity,                                       │
│   is_fake: bool,                                         │
│   confidence: 0-1,                                       │
│   reasoning: string                                      │
│ }                                                        │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 3: Scene Analysis                                   │
│ ├─ detectedObjects = detectSceneObjects(image)          │
│ ├─ severity = analyzeSeverity(objects, text)            │
│ └─ isCriticalLocation = check(location)                 │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 4: Priority Input (PrioritizationInput)             │
│ {                                                        │
│   issue_severity,                                        │
│   crowd_count,                                           │
│   location,                                              │
│   is_critical_location,                                  │
│   num_reports,                                           │
│   fake_score,                                            │
│   text_credibility,                                      │
│   image_text_match,                                      │
│   detected_hazards                                       │
│ }                                                        │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 5: Priority Ranking                                 │
│ priority = calculatePriority(prioritizationInput)        │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ FINAL RESPONSE (FinalResponse)                           │
│ {                                                        │
│   ...verificationResult,                                 │
│   priority: PrioritizationOutput,                        │
│   approved: bool                                         │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
```

---

## Type System

### Core Types (`types.ts`)

```typescript
// Input
interface SubmissionRequest {
  image: string;               // base64 or URL
  text_description: string;
  location?: string;
  report_count?: number;
  coordinates?: { lat, lng };
}

// Output - Verification
interface VerificationResult {
  image_fake_score: number;    // 0-1
  text_spam_score: number;     // 0-1
  clip_similarity: number;     // 0-1
  detected_objects: string[];
  severity: "LOW"|"HIGH"|"MEDIUM"|"CRITICAL";
  confidence: number;          // 0-1
  is_fake: boolean;
  reasoning: string;
}

// Output - Priority
interface PrioritizationOutput {
  priority_level: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
  priority_score: number;      // 0-100
  recommendation: string;
  estimated_urgency_seconds: number;
}

// Final API Response
interface FinalResponse extends VerificationResult {
  priority: PrioritizationOutput;
  approved: boolean;
}
```

---

## Error Handling Strategy

### Graceful Degradation

```
✅ All models succeed → Full analysis
⚠️ One model fails → Use neutral score + continue
❌ Multiple failures → Return partial results
🚨 All fail → Return error with retry logic

Examples:

API Failure
  Image model timeout
  → imageScore = 0.3 (neutral, assume real)
  → Continue with other models
  
Text Model Overload
  → textScore = 0.2 (neutral)
  → Continue
  
CLIP Timeout
  → clipSimilarity = 0.6 (neutral match)
  → Continue
```

### Timeout Fallbacks

```typescript
try {
  result = await callModel(input, timeout: 10000);
} catch (error) {
  if (error.timeout) {
    result = neutralScore; // Safe neutral value
  }
}
```

---

## Performance Characteristics

### Latency Breakdown

```
Request arrival
    ↓ (5ms)
Validation
    ↓ (1000-1500ms each, parallel)
Image model → 1200ms
Text model → 800ms
CLIP model → 1100ms
Object detection → 900ms
    ↓ (50ms aggregate)
Priority calculation
    ↓ (10ms)
Response serialization
    │
Total: 2000-3500ms depending on model speeds
```

### Model Inference Times (approximate)

```
Image Deepfake:    800-1200ms
Text Classification: 300-800ms
CLIP Matching:     1000-1500ms
DETR Detection:    600-1200ms
```

### Optimization Opportunities

```
1. Parallel execution (already done)
2. Result caching (implement hash-based)
3. Async processing (queue-based)
4. Model quantization (faster inference)
5. Edge deployment (reduce latency)
```

---

## Monitoring & Logging

### Logging Points

```typescript
console.log("📨 New report submission received");
console.log("   Description: ...");
console.log("   Location: ...");

console.log("📸 Detecting image deepfakes...");
console.log("📝 Detecting text spam/AI-generated...");
console.log("🧠 Matching image with text description...");
console.log("🔍 Detecting scene objects...");

console.log("✅ Processing complete");
console.log("   Priority: ...");
console.log("   Score: ...");
```

### Metrics to Track

```
- Average response time
- Model success rate
- False positive rate
- Priority distribution
- API uptime
- Error frequency
```

---

## Future Extensibility

### Adding New Models

```typescript
// 1. Create new detection function
export async function detectNewHazard(image: string): Promise<Score> {
  const response = await fetch("https://api.huggingface.co/models/...", {
    headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
    method: "POST",
    body: Buffer.from(image, "base64"),
  });
  return parseResponse(await response.json());
}

// 2. Integrate into pipeline
const hazardScore = await detectNewHazard(image);

// 3. Use in priority calculation
score += hazardScore * weight;
```

### Database Integration

```typescript
// Save to database
const report = await db.reports.create({
  data: {
    image_hash: hash(image),
    priority_level: result.priority.priority_level,
    approved: result.approved,
    verified_at: new Date(),
  },
});
```

### Webhook Integration

```typescript
if (result.approved) {
  await fetch(`${process.env.AUTHORITY_WEBHOOK}`, {
    method: "POST",
    body: JSON.stringify(result),
    headers: { "X-API-Key": process.env.WEBHOOK_KEY },
  });
}
```

---

**Architecture documented. Ready to scale! 🚀**
