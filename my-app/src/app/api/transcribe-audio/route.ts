import { NextRequest, NextResponse } from "next/server";

/**
 * 🎙️ API Route: /api/transcribe-audio
 * 
 * POST endpoint for transcribing audio to text using Deepgram
 * Takes base64-encoded audio and returns transcribed text
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.audio) {
      return NextResponse.json(
        { error: "Missing audio data" },
        { status: 400 }
      );
    }

    const audio = body.audio;
    console.log("🎙️ Transcribing audio with Deepgram...");
    console.log("Audio data length:", audio?.length || 0);

    // Extract base64 without data URL prefix
    const base64Audio = audio.includes(",")
      ? audio.split(",")[1]
      : audio;

    console.log("Base64 audio length:", base64Audio.length);

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(base64Audio, "base64");
    
    console.log("Audio buffer size:", audioBuffer.length, "bytes");

    if (audioBuffer.length === 0) {
      return NextResponse.json(
        { error: "Audio buffer is empty" },
        { status: 400 }
      );
    }

    // Get Deepgram API key
    const deepgramKey = process.env.DEEPGRAM_API_KEY || "";

    if (!deepgramKey) {
      console.error("❌ DEEPGRAM_API_KEY is not configured");
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 }
      );
    }

    console.log("🔑 API Key (first 10 chars):", deepgramKey.substring(0, 10) + "...");

    // Send audio directly to Deepgram
    console.log("📤 Sending audio to Deepgram for transcription...");
    
    const deepgramResponse = await fetch(
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

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error(`❌ Deepgram error: ${deepgramResponse.status}`);
      console.error("Error response:", errorText);
      
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = JSON.stringify(errorJson);
      } catch (e) {
        // Keep as text
      }
      
      return NextResponse.json(
        { error: `Transcription failed: ${deepgramResponse.status} - ${errorMessage}` },
        { status: 500 }
      );
    }

    const response = await deepgramResponse.json() as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
          }>;
        }>;
      };
    };

    const transcript = response.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    if (!transcript) {
      console.warn("⚠️ No transcript returned from Deepgram");
      return NextResponse.json(
        { error: "No transcript returned from Deepgram" },
        { status: 500 }
      );
    }

    console.log(`✅ Transcription complete: "${transcript.substring(0, 100)}..."`);

    return NextResponse.json(
      {
        success: true,
        text: transcript,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Transcription error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during transcription",
      },
      { status: 500 }
    );
  }
}
