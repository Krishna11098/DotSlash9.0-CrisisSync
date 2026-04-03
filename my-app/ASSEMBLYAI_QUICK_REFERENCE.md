# AssemblyAI Quick Reference

## 🎙️ Audio Support - Cheat Sheet

### Quick Setup

1. **Add to `.env.local`**:
   ```bash
   ASSEMBLYAI_API_KEY=##########################
   ```

2. **Restart server**:
   ```bash
   npm run dev
   ```

3. **Use from frontend**:
   - Upload image (required)
   - Add text description (required)
   - Upload audio (optional) ← NEW
   - Submit report

---

## 📊 Processing Flow

```
Audio File
    ↓
Base64 Encode
    ↓
AssemblyAI Upload API
    ↓
Get Audio URL + ID
    ↓
Request Transcription
    ↓
Poll for Completion (max 60s)
    ↓
Get Text
    ↓
Merge with Description
    ↓
Continue Pipeline
```

---

## 💻 Code Changes

### Types Added
```typescript
audio?: string;  // Optional base64 audio in SubmissionRequest
```

### Function Added
```typescript
convertAudioToText(audioBase64: string): Promise<string>
```

### Frontend Field Added
```jsx
<input type="file" accept="audio/*" onChange={handleAudioUpload} />
```

---

## 🎯 Usage Examples

### Example 1: Report with Audio
```json
POST /api/verify-report
{
  "image": "base64_image...",
  "text_description": "Fire downtown",
  "audio": "base64_audio...",
  "location": "Main Street"
}
```

### Example 2: Text Only (Audio Optional)
```json
POST /api/verify-report
{
  "image": "base64_image...",
  "text_description": "Building fire"
}
```

---

## 📁 Files Changed

| File | Change |
|------|--------|
| `.env.local` | Added ASSEMBLYAI_API_KEY |
| `.env.example` | Added example ASSEMBLYAI_API_KEY |
| `src/lib/types.ts` | Added `audio?` field |
| `src/lib/pipeline.ts` | Added `convertAudioToText()` function |
| `src/app/api/verify-report/route.ts` | Updated to handle audio |
| `src/components/ReportSubmissionForm.tsx` | Added audio upload UI |

---

## 🔧 Configuration

### Environment Variable
```bash
ASSEMBLYAI_API_KEY=#############################3
```

### Supported Formats
- WAV, MP3, M4A, OGG, FLAC, OPUS
- Max 25 MB per file

### Languages
- Default: English (`en`)
- Changeable in `pipeline.ts` line 65

---

## ⚡ Key Features

✅ **Optional Audio** - Text required, audio optional  
✅ **Auto Transcription** - Speech-to-text conversion  
✅ **Text Merging** - Audio text combined with user text  
✅ **Error Handling** - Graceful fallback if audio fails  
✅ **Polling** - Waits up to 60 seconds for transcription  
✅ **No Blocking** - Report proceeds even if audio times out  

---

## ⏱️ Performance

| Task | Time |
|------|------|
| Audio upload | 1-3 seconds |
| Transcription request | <1 second |
| Polling/completion | 3-15 seconds |
| Total wait | 5-20 seconds |

---

## 🚨 Error Scenarios

| Error | Handling |
|-------|----------|
| Upload fails | Uses text only, continues |
| Invalid format | Uses text only, continues |
| Timeout (>60s) | Uses text only, continues |
| Bad API key | Logs error, uses text only |

---

## 🎓 Example Transcript Merge

**Before**:
- Text: "Fire on Main Street"
- Audio: [user speaks additional details]

**After Transcription**:
- Combined: "Fire on Main Street. Audio input: Multiple floors affected, fire trucks already present"

**Keyword Matching**:
- Extracted: "fire", "floors", "trucks", "present"
- Confidence: Higher due to additional details

---

## 📞 Support

- **Setup Guide**: See `ASSEMBLYAI_SETUP.md`
- **AssemblyAI Docs**: https://www.assemblyai.com/docs
- **Your API Key**: `###########################`

---

## ✅ Checklist

- [ ] API key added to `.env.local`
- [ ] Server restarted (`npm run dev`)
- [ ] Audio field visible on form
- [ ] Can select audio file
- [ ] Form accepts audio input
- [ ] Audio merges with text description
- [ ] Keyword matching works with audio text

---

## 🔗 Related Docs

- [Full Setup Guide](ASSEMBLYAI_SETUP.md)
- [Gemini Integration](GEMINI_INTEGRATION.md)
- [Sightengine Setup](SIGHTENGINE_SETUP.md)
- [Architecture](ARCHITECTURE.md)
