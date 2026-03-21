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
│              ML PIPELINE (pipeline.ts)                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. FAKE DETECTION                               │   │
│  │     ├─ detectImageFake()                          │   │
│  │     └─ detectTextFake()                           │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  2. CONSISTENCY CHECK                            │   │
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

**Image Deepfakes (`detectImageFake`)**

```
Image (base64)
    ↓
HuggingFace API
  dima806/deepfake_vs_real_image_detection
    ↓
Model: Xception (pretrained)
    ↓
Output: [
  { label: "real", score: 0.85 },
  { label: "fake", score: 0.15 }
]
    ↓
Return: fake_score (0-1)
```

**Why Xception?**
- ✅ Fast (good for real-time)
- ✅ 95%+ accuracy on deepfakes
- ✅ Trained on diverse datasets
- ✅ Works with HuggingFace API

**Text Fake Detection (`detectTextFake`)**

```
Text Description
    ↓
HuggingFace API
  roberta-base-openai-detector
    ↓
Model: RoBERTa (fine-tuned)
    ↓
Detects: AI-generated vs human text
    ↓
Output: [
  { label: "human", score: 0.92 },
  { label: "fake", score: 0.08 }
]
    ↓
Return: spam_score (0-1)
```

**Why RoBERTa?**
- ✅ Trained on GPT-2/3 vs human text
- ✅ 98% accuracy on AI detection
- ✅ Fast inference
- ✅ OpenAI detector (trusted)

#### Step 2: Consistency Check

**CLIP Image-Text Matching (`clipImageTextMatch`)**

```
Image + Text Description
    ↓
OpenAI CLIP ViT-B/32
    ↓
Process:
  1. Encode image to vector (512-dim)
  2. Encode text to vector (512-dim)
  3. Compute cosine similarity
    ↓
Output: similarity (0-1)
    ↓
Decision:
  > 0.7 → Good match ✓
  0.5-0.7 → Partial match ⚠️
  < 0.5 → Mismatch ❌
```

**Example:**
```
Image: [fire, building, smoke]
Text: "Fire on Main Street"
Similarity: 0.92 ✓ MATCH

Image: [fire, building, smoke]
Text: "Broken streetlight downtown"
Similarity: 0.35 ❌ MISMATCH → Suspicious!
```

**Why CLIP?**
- ✅ Zero-shot learning (no retraining needed)
- ✅ Robust cross-modal understanding
- ✅ 88%+ accuracy on matching tasks
- ✅ Works with real-world edge cases

#### Step 3: Scene Understanding

**Object Detection (`detectSceneObjects`)**

```
Image
    ↓
Facebook DETR ResNet-50
    ↓
Process:
  1. Encode image features
  2. Detect objects + positions
  3. Filter high-confidence (>0.5)
  4. Return top 10 objects
    ↓
Output: [
  { label: "fire", score: 0.95 },
  { label: "person", score: 0.87 },
  { label: "building", score: 0.92 }
]
    ↓
Extraction: ["fire", "person", "building"]
```

**Hazard Keywords:**
```
CRITICAL:
  - fire 🔥
  - collapse
  - explosion
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
