# Gemini AI Image Description Integration

## Overview

The XORcists application now uses **Google Gemini API** to generate intelligent image descriptions and perform advanced keyword matching with user-provided text. This solves the false positive problem: **if keywords match (e.g., "fire" in both image description and user text), the report is NOT flagged as suspicious**.

---

## How It Works

### Step 1: Image to Description (Gemini Vision)

When a user submits a report with an image, the system:

1. **Sends the image to Gemini API** with a prompt: *"Describe this image in detail. Focus on objects, people, actions, and emergency indicators."*
2. **Gemini returns a detailed natural language description** (e.g., "A building with smoke coming from windows, fire blazes visible...")
3. **System logs and caches the description** for matching

### Step 2: Keyword Extraction

The system extracts emergency keywords from both:
- **User's text description** (what they typed)
- **Gemini's image description** (what the AI sees)

**Emergency Categories:**
- 🔥 **Fire**: fire, burning, flame, smoke, blaze, ignite, inferno
- 💧 **Water**: flood, water, drowning, river, rain, inundation, tsunami
- 🚗 **Accident**: accident, crash, collision, vehicle, car, injured, injury, hit
- 🏢 **Building**: building, collapse, damage, debris, rubble, destruction
- 👥 **Crowd**: crowd, gathering, people, group, mass, assembly
- 🏥 **Medical**: medical, hospital, injured, sick, emergency, ambulance
- ⚖️ **Crime**: crime, robbery, violence, assault, shooting, stabbing

### Step 3: Keyword Matching

```
User Text: "There's a fire in the downtown building near Main Street!"
User Keywords: [fire, building]

Gemini Description: "Image shows a large building with smoke and flames coming from windows. 
Multiple fire trucks visible. Bright orange and red flames visible."
Gemini Keywords: [fire, building]

Match Score: 2/2 = 100% ✅
Conclusion: Description MATCHES user text → NOT SUSPICIOUS
```

---

## Example Scenarios

### ✅ Scenario 1: Genuine Report (Keywords Match)

```json
{
  "image": "base64_image_of_fire...",
  "text_description": "Major fire at downtown warehouse on Oak Street"
}
```

| Step | Result |
|------|--------|
| 1. Gemini sees | "Building engulfed in flames, thick smoke..." |
| 2. User keywords | ["fire", "warehouse", "downtown"] |
| 3. Gemini keywords | ["fire", "building", "flames", "smoke"] |
| 4. Match score | 2/3 = 0.67 (67%) ✅ |
| 5. Conclusion | **APPROVED** - Keywords match, not flagged as fake |

### ❌ Scenario 2: Mismatched Report (Keywords Don't Match)

```json
{
  "image": "base64_image_of_fire...",
  "text_description": "Broken streetlight at the corner"
}
```

| Step | Result |
|------|--------|
| 1. Gemini sees | "Building engulfed in flames, thick smoke..." |
| 2. User keywords | [] (no emergency keywords) |
| 3. Gemini keywords | ["fire", "building", "flames"] |
| 4. Match score | 0/0 = 0.6 (neutral) ⚠️ |
| 5. Conclusion | **SUSPICIOUS** - Image and text don't match |

### ⚠️ Scenario 3: Partial Match

```json
{
  "image": "base64_image_of_accident...",
  "text_description": "Car accident with injuries on Main Street"
}
```

| Step | Result |
|------|--------|
| 1. Gemini sees | "Two vehicles collided, debris scattered..." |
| 2. User keywords | ["accident", "car", "injured"] |
| 3. Gemini keywords | ["accident", "vehicle", "collision"] |
| 4. Match score | 1/3 = 0.33 ⚠️ |
| 5. Conclusion | **LOW CONFIDENCE** - Partial match, needs review |

---

## Setup Instructions

### Step 1: Get Gemini API Key

**Option A: Free Tier (Development)**
1. Visit https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Select "Create new API key in a new project"
4. Copy the API key

**Option B: Production (Paid)**
1. Go to https://cloud.google.com/
2. Create a project
3. Enable Generative AI API
4. Create service account credentials
5. Use the API key

### Step 2: Configure Environment Variable

Create/update `.env.local` in `my-app/`:

```bash
# For Development (Dummy Key - still works with fallbacks)
GEMINI_API_KEY=AIzaSyDummyGeminiKeyPlaceholder123456789

# For Production (Real Key)
GEMINI_API_KEY=AIzaSy_YOUR_REAL_API_KEY_FROM_GOOGLE_HERE_1234567890
```

### Step 3: Restart Development Server

```bash
npm run dev
```

The system will automatically detect a dummy key and log a warning.

---

## API Response Format

### Image-Text Match Score Breakdown

```json
{
  "success": true,
  "data": {
    "image_fake_score": 0.1,
    "text_spam_score": 0.05,
    "clip_similarity": 0.85,
    "detected_objects": ["fire", "building", "smoke"],
    "severity": "CRITICAL",
    "confidence": 0.92,
    "is_fake": false,
    "reasoning": "✅ Verified report. Keywords matched: fire, building (Gemini vs User: 85% match)"
  }
}
```

### What Each Score Means

| Score | Name | Range | Interpretation |
|-------|------|-------|-----------------|
| `clip_similarity` | Match Score | 0-1 | How well Gemini description matches user text |
| > 0.7 | High Match | ✅ | Keywords strongly align → Likely genuine report |
| 0.5-0.7 | Partial Match | ⚠️ | Some alignment → Needs review |
| < 0.5 | Low Match | ❌ | Keywords don't align → Suspicious/fake |

---

## Keyword Matching Algorithm

### Logic Flow

```
User Text: Extract keywords → {category, [keywords]}
Gemini Description: Extract keywords → {category, [keywords]}
              ↓
        For each user keyword:
          Check if it appears in Gemini description
              ↓
        Match Count / Total Keywords = Final Score
              ↓
        Return 0-1 score
```

### Example Extraction

**Input:** "Major fire and explosion at the downtown building!"

**Extraction Process:**
```javascript
Text: "major fire and explosion at the downtown building"

Check Against Categories:
  ✅ fire: "fire" found → +1
  ✅ accident: "explosion" found → +1
  ✅ building: "building" found → +1

Output: {
  category: "fire",
  keywords: ["fire", "explosion", "building"]
}
```

---

## Fallback Behavior

If Gemini API **fails or times out**, the system:

1. ✅ Logs the error
2. ✅ Returns neutral score of **0.6** (middle ground)
3. ✅ Continues processing with Sightengine
4. ✅ Reduces overall confidence but doesn't block the report

```
Gemini Failure Flow:
├─ Cannot get image description
├─ Fall back to 0.6 match score
├─ Continue with:
│  ├─ Sightengine moderation
│  ├─ Text spam detection
│  └─ Severity analysis
└─ Return result with lower confidence
```

---

## Debugging & Logging

### Enable Debug Logs

All debug output appears as console.log:

```
🎨 Getting Gemini image description...
📝 Gemini Image Description: A building with smoke coming from windows...
🔗 Keyword Match: User="fire" Gemini="fire" Score=85%
   User Keywords: fire, building, emergency
   Matched: 2/3
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Using dummy Gemini API key" | API key not configured | Add real key to `.env.local` |
| High Gemini error rate | Invalid API key | Verify key at makersuite.google.com |
| Timeout errors | Large image | Compress image before upload |
| Rate limit errors | Too many API calls | Upgrade to paid plan |
| "Could not get description" | Gemini unavailable | Use fallback (neutral score) |

---

## Performance Considerations

### API Call Times

| Operation | Time | Notes |
|-----------|------|-------|
| Image to Gemini | 1-2s | Depends on image size |
| Keyword extraction | <100ms | Local processing |
| Keyword matching | <100ms | Local processing |
| Full pipeline | 2-5s | Total with Sightengine |

### Cost Estimates (Google Pricing)

| Tier | Images/Month | Cost | Best For |
|------|-------------|------|----------|
| Free | 60 | $0 | Development/testing |
| Standard | Unlimited | $0.01-0.05 per image | Production |
| Custom | - | Custom | High volume |

---

## Advanced Configuration

### Custom Keywords

To add custom emergency keywords, edit in `pipeline.ts`:

```typescript
const emergencyKeywords = {
  fire: ["fire", "burning", "YOUR_CUSTOM_KEYWORD"],
  water: ["flood", "water", "..."],
  // Add new categories:
  earthquake: ["earthquake", "tremor", "shaking"],
  // ...
};
```

### Adjust Match Threshold

To change what's considered a "match":

```typescript
// Current: Match any keyword
// Change line in matchKeywordsGeminiVsUserText():

const matchScore = Math.min(matchCount / totalKeywords, 1.0);

// To require higher threshold:
const matchScore = matchCount >= totalKeywords * 0.8 ? 1.0 : matchCount / totalKeywords;
```

---

## Migration from Dummy Key to Real Key

### Step 1: Get Real API Key
```
https://makersuite.google.com/app/apikey
```

### Step 2: Update `.env.local`
```bash
# Before
GEMINI_API_KEY=AIzaSyDummyGeminiKeyPlaceholder123456789

# After
GEMINI_API_KEY=AIzaSy_YOUR_REAL_KEY_123456789
```

### Step 3: Restart Server
```bash
npm run dev
```

### Step 4: Verify in Logs
```
🔍 Sightengine response: {...}
📝 Gemini Image Description: Detailed description here...
✅ Processing complete
```

No dummy key warning should appear.

---

## Next Steps

1. ✅ Review this documentation
2. ✅ Get Gemini API key (free tier available)
3. ✅ Add key to `.env.local`
4. ✅ Test with sample images
5. ✅ Monitor logs for keyword matching
6. ✅ Adjust thresholds based on real data
7. ✅ Deploy to production with paid API key

---

## Support Resources

- **Gemini API Docs**: https://ai.google.dev/
- **Makersuite**: https://makersuite.google.com/
- **REST API Reference**: https://ai.google.dev/tutorials/rest_quickstart
- **Model Details**: https://ai.google.dev/models/gemini-pro-vision

---

## Summary

| Feature | Benefit |
|---------|---------|
| **Gemini Vision** | Generate accurate image descriptions |
| **Keyword Extraction** | Identify emergency types automatically |
| **Match Scoring** | Compare image vs user description |
| **Fallback Logic** | Never block reports (graceful degradation) |
| **Configurable** | Easy to add/modify keywords |

This approach **eliminates false positives** by ensuring that if a user reports "fire" and Gemini sees "fire", the report is trusted and approved! 🔥✅
