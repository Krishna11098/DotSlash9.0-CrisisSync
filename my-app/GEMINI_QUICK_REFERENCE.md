# Gemini Integration - Quick Reference

## 🔄 How Image Description & Keyword Matching Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER SUBMITS REPORT                      │
│  Image (base64) + Text: "Major fire downtown building"      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              GEMINI API: Image Description                  │
│  Input: Image (converted to Gemini format)                  │
│  Prompt: "Describe this image focusing on emergency..."     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          OUTPUT: "Building with fire blazes visible,        │
│  thick smoke, emergency vehicles on scene..."               │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────────┐    ┌──────────────────────┐
│  Extract Keywords    │    │  Extract Keywords    │
│  From User Text      │    │  From Gemini Text    │
└──────────────┬───────┘    └──────────┬───────────┘
               │                       │
               │ ["fire", "building"]  │ ["fire", "smoke", "building"]
               │                       │
               └───────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │   KEYWORD MATCHING       │
            │  Match Score Calculation │
            │  2 matching / 2 user = 100%
            └──────────────┬───────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │   Match Score: 0.85 (85%) ✅     │
        │   Result: NOT FLAGGED (APPROVED) │
        └──────────────────────────────────┘
```

---

## 📊 Keyword Matching Decision Tree

```
Does user text have emergency keywords?
│
├─ NO → Score: 0.6 (neutral)
│       └─ Rely on other signals (Sightengine, severity)
│
└─ YES → Extract them
         │
         Does Gemini description mention same keywords?
         │
         ├─ YES (>70% match) → Score: High (>0.7) ✅
         │                     Don't flag as suspicious
         │                     APPROVED
         │
         └─ NO (<30% match) → Score: Low (<0.5) ❌
                              FLAG AS SUSPICIOUS
                              Possible fake/misleading image
```

---

## 🎯 Emergency Keywords by Category

### Fire 🔥
- fire, burning, flame, smoke, blaze, ignite, inferno, combustion

### Water 💧
- flood, water, drowning, swimming, river, rain, inundation, submerged, tsunami

### Accident 🚗
- accident, crash, collision, vehicle, car, injured, injury, hit, impact

### Building 🏢
- building, structure, collapse, damage, debris, rubble, destruction, demolition

### Crowd 👥
- crowd, gathering, people, group, mass, assembly, congregation

### Medical 🏥
- medical, hospital, injured, sick, emergency, ambulance, doctor

### Crime ⚖️
- crime, robbery, theft, violence, assault, shooting, stabbing

---

## 💻 Code Example

### Getting Image Description

```typescript
// Get Gemini description of image
const description = await getImageDescriptionFromGemini(imageBase64);
// Returns: "Building with flames and smoke visible..."
```

### Matching Keywords

```typescript
// Match Gemini description with user text
const matchScore = matchKeywordsGeminiVsUserText(
  "Building with flames visible, emergency vehicles...",
  "Fire at downtown building"
);
// Returns: 0.85 (85% match - GOOD!)
```

### Usage in Pipeline

```typescript
// In processSubmission():
const geminiDescription = await getImageDescriptionFromGemini(request.image);
const clipSimilarity = await clipImageTextMatch(
  request.image, 
  request.text_description
);
// clipSimilarity uses Gemini + keyword matching internally
```

---

## 🔑 Required Environment Variables

### Development
```bash
# Dummy key (for testing without real API calls)
GEMINI_API_KEY=AIzaSyDummyGeminiKeyPlaceholder123456789
SIGHTENGINE_USER_ID=your_sightengine_user_id
SIGHTENGINE_API_KEY=your_sightengine_api_key
```

### Production
```bash
# Real Gemini key from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=AIzaSyYourRealKeyFrom_Google_Here_1234567
SIGHTENGINE_USER_ID=production_sightengine_id
SIGHTENGINE_API_KEY=production_sightengine_key
```

---

## 🎨 Gemini API Models Used

| Model | Purpose | Input | Output |
|-------|---------|-------|--------|
| gemini-pro-vision | Image description | Base64 image | Text description |
| gemini-pro | Future: Text analysis | Text | Analysis |

---

## 📈 Scoring Breakdown

### Match Score Calculation

```
Match Score = (Keywords Found in Gemini) / (Total User Keywords)

Example:
User: "fire and building collapse"
Keywords: ["fire", "building", "collapse"]

Gemini: "Building on fire, flames visible"
Keywords Found: ["fire", "building"]

Match = 2 / 3 = 0.67 (67%) ⚠️
```

### Final Confidence Calculation

```
confidence = (1 - image_fake_score) × 
             (1 - text_spam_score) × 
             clip_similarity

If confidence > 0.7: APPROVED ✅
If confidence 0.5-0.7: REVIEW ⚠️
If confidence < 0.5: REJECTED ❌
```

---

## ⚡ Performance Tips

1. **Image Size**: Keep images < 5MB for faster processing
2. **API Calls**: Gemini takes 1-2 seconds, plan accordingly
3. **Caching**: Consider caching descriptions for identical images
4. **Batch Processing**: Spread requests over time to avoid rate limits

---

## 🛑 Common Mistakes to Avoid

| ❌ Don't | ✅ Do |
|---------|-------|
| Leave dummy API key in production | Use real Gemini key in production |
| Ignore Gemini errors | Implement fallback logic (score=0.6) |
| Require 100% keyword match | Accept 70%+ keyword match |
| Make Gemini calls synchronously in loop | Make parallel fetch calls |
| Commit API keys to Git | Use `.env.local` or environment variables |

---

## 🧪 Testing the Integration

### Test Case 1: Perfect Match
```bash
curl -X POST http://localhost:3000/api/verify-report \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_fire_image",
    "text_description": "Major fire on Main Street"
  }'
```
**Expected**: `"is_fake": false`, high `clip_similarity`

### Test Case 2: Mismatch
```bash
curl -X POST http://localhost:3000/api/verify-report \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_fire_image",
    "text_description": "Broken streetlight here"
  }'
```
**Expected**: `"is_fake": true`, low `clip_similarity`

### Test Case 3: Partial Match
```bash
curl -X POST http://localhost:3000/api/verify-report \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_accident_image",
    "text_description": "Car accident with slight injuries"
  }'
```
**Expected**: Medium confidence, review flag

---

## 📋 Checklist Before Going Live

- [ ] Gemini API key obtained from makersuite.google.com
- [ ] `.env.local` configured with real API key
- [ ] Tested with dummy key (development)
- [ ] Tested with real key (staging)
- [ ] Keyword list covers your use cases
- [ ] Error handling tested (network failures, timeouts)
- [ ] Rate limits understood and planned for
- [ ] Monitoring/logging in place
- [ ] Team trained on keyword matching behavior

---

## Resources

- **Setup**: See [GEMINI_INTEGRATION.md](./GEMINI_INTEGRATION.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Sightengine**: See [SIGHTENGINE_SETUP.md](./SIGHTENGINE_SETUP.md)
- **Google Gemini**: https://ai.google.dev/
