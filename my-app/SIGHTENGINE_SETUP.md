# Sightengine API Integration Guide

## Overview

The XORcists application has been updated to use **Sightengine** for content moderation and image analysis instead of HuggingFace models. This guide explains the changes and how to set up Sightengine API credentials.

---

## What Changed?

### Before (HuggingFace)
- **Image Analysis**: `Organizzazione/RealorFake` model
- **Text Analysis**: `roberta-base-openai-detector` model
- **Image-Text Matching**: OpenAI `CLIP ViT-B/32` model
- **Object Detection**: Facebook `DETR ResNet-50` model

### After (Sightengine)
- **Image Analysis**: Sightengine content moderation API
  - Nudity detection
  - Weapon/violence detection
  - Offensive content detection
  - Face detection
- **Text Analysis**: Heuristic-based spam detection
- **Image-Text Matching**: Keyword-based emergency type matching
- **Scene Analysis**: Sightengine property tagging

---

## Benefits of Sightengine

✅ **Single API Integration** - All image analysis in one call
✅ **Content Moderation** - Designed for inappropriate content filtering
✅ **Fast Processing** - Real-time inference
✅ **Reliable** - Enterprise-grade service
✅ **Cost Effective** - Pay-as-you-go pricing

---

## Setup Instructions

### Step 1: Create Sightengine Account

1. Visit https://sightengine.com/
2. Sign up for a free account
3. Create an API key (found in Account Settings)
4. Note your **User ID** and **API Secret**

### Step 2: Add Environment Variables

Create a `.env.local` file in the `my-app` directory:

```bash
SIGHTENGINE_USER_ID=your_user_id_here
SIGHTENGINE_API_KEY=your_api_secret_here
```

**DO NOT** commit this file to Git. It's in `.gitignore` by default.

### Step 3: Install Dependencies (if needed)

The app uses Next.js built-in `fetch` API, so no additional packages are required.

```bash
npm install
```

### Step 4: Start Development Server

```bash
npm run dev
```

The API endpoint will be available at `http://localhost:3000/api/verify-report`

---

## API Endpoints

### POST /api/verify-report

Submit a report for verification.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "text_description": "Fire on Main Street near the library",
  "location": "Downtown District",
  "report_count": 3,
  "coordinates": {
    "lat": 40.7128,
    "lng": -74.0060
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "image_fake_score": 0.15,
    "text_spam_score": 0.05,
    "clip_similarity": 0.85,
    "detected_objects": ["vehicle", "person", "outdoor"],
    "severity": "HIGH",
    "confidence": 0.78,
    "is_fake": false,
    "reasoning": "✅ Verified report with HIGH severity...",
    "priority": {
      "priority_level": "HIGH",
      "priority_score": 72,
      "recommendation": "⚠️ HIGH PRIORITY: fire reported at Downtown District...",
      "estimated_urgency_seconds": 300
    },
    "approved": true
  },
  "metadata": {
    "processed_at": "2026-03-21T10:30:00.000Z",
    "processing_version": "1.0.0-multimodal"
  }
}
```

### GET /api/verify-report

Health check endpoint.

**Response:**
```json
{
  "status": "🟢 Multimodal Truth + Priority Engine is running",
  "version": "1.0.0",
  "capabilities": [
    "✅ Image Content Moderation",
    "✅ Spam Detection (Text)",
    "✅ Image-Text Consistency",
    "✅ Scene Analysis",
    "✅ Intelligent Priority Ranking"
  ],
  "endpoints": {
    "submit_report": "POST /api/verify-report",
    "get_status": "GET /api/verify-report"
  }
}
```

---

## Scoring Explanation

### Image Fake Score (0-1)
- **0.0-0.3**: Safe ✅ (Real image, no concerning content)
- **0.3-0.6**: Caution ⚠️ (Some concerning elements)
- **0.6-1.0**: Suspicious ❌ (Significant content warnings)

Calculated from:
- Nudity detection
- Weapon/violence detection  
- Offensive content detection

### Text Spam Score (0-1)
- **0.0-0.3**: Legit ✅
- **0.3-0.6**: Questionable ⚠️
- **0.6-1.0**: Spam ❌

Detected patterns:
- Excessive CAPS
- Repeated characters
- Spam keywords
- Suspicious URLs
- Invalid text length

### CLIP Similarity (0-1)
- **>0.7**: Good match ✅
- **0.5-0.7**: Partial match ⚠️
- **<0.5**: Mismatch ❌

Based on emergency keyword matching (fire, flood, accident, etc.)

### Priority Score (0-100)
- **0-25**: LOW - Non-urgent issues
- **26-50**: MEDIUM - Needs investigation
- **51-75**: HIGH - Urgent response needed
- **76-100**: CRITICAL - Immediate action required

---

## Sightengine API Models

The app uses these Sightengine detection models:

| Model | Purpose | Output |
|-------|---------|--------|
| nudity | Detect nudity/explicit content | 0-1 score |
| wad | Weapon/alcohol/drug detection | 0-1 score |
| offensive | Offensive content detection | 0-1 score |
| face | Face detection | Confidence scores |
| properties | Scene/object tagging | Tag scores |

---

## Troubleshooting

### Issue: "401 Unauthorized" from Sightengine

**Solution:**
- Verify `SIGHTENGINE_USER_ID` is correct
- Verify `SIGHTENGINE_API_KEY` is correct
- Ensure variables are in `.env.local` (not `.env`)
- Restart dev server after changing environment variables

### Issue: "ECONNREFUSED" or network errors

**Solution:**
- Check internet connection
- Verify Sightengine API is accessible: `https://api.sightengine.com`
- Check if VPN/proxy is blocking API calls

### Issue: "Request timeout"

**Solution:**
- Images >10MB may timeout
- Compress images before upload
- Increase timeout in code if needed

### Getting Fallback Scores

If Sightengine API fails, the system returns neutral fallback scores:
- `image_fake_score`: 0.5
- `text_spam_score`: 0.3
- `clip_similarity`: 0.6
- `detected_objects`: []

This allows the system to continue functioning with degraded accuracy.

---

## API Rate Limits

Sightengine free tier:
- 50 requests/day
- Non-commercial use only

Paid plans:
- Unlimited requests
- Commercial use allowed
- Custom rate limits available

Check https://sightengine.com/pricing for details.

---

## Performance Tips

1. **Compress Images**: Reduce image size before upload
2. **Batch Requests**: If processing multiple reports, space them out to avoid rate limits
3. **Cache Results**: Consider caching Sightengine responses for identical images
4. **Monitor Usage**: Track API calls in Sightengine dashboard

---

## Migration from HuggingFace

If you had existing code using HuggingFace:

### Old Implementation
```typescript
const response = await fetch(
  "https://api-inference.huggingface.co/models/Organizzazione/RealorFake",
  {
    headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
    method: "POST",
    body: imageBuffer,
  }
);
```

### New Implementation
```typescript
const formData = new FormData();
const blob = new Blob([imageBuffer], { type: "image/jpeg" });
formData.append("media", blob);
formData.append("models", "nudity,wad,offensive,face");
formData.append("api_user", process.env.SIGHTENGINE_USER_ID);
formData.append("api_secret", process.env.SIGHTENGINE_API_KEY);

const response = await fetch("https://api.sightengine.com/1.0/check.json", {
  method: "POST",
  body: formData,
});
```

---

## Next Steps

1. ✅ Create Sightengine account
2. ✅ Add environment variables to `.env.local`
3. ✅ Test with `npm run dev`
4. ✅ Submit a test report
5. ✅ Monitor Sightengine dashboard for API usage
6. ✅ Deploy to production with environment variables

---

## Support

- **Sightengine Docs**: https://sightengine.com/documentation
- **Sightengine Support**: https://sightengine.com/support
- **This Project**: See ARCHITECTURE.md for technical details
