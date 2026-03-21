import { NextRequest, NextResponse } from "next/server";

/**
 * 🎙️ API Route: /api/transcribe-audio
 * 
 * POST endpoint for transcribing audio to text using AssemblyAI
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
    console.log("🎙️ Transcribing audio...");
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

    // Step 1: Upload audio to AssemblyAI
    console.log("📤 Uploading audio to AssemblyAI...");
    
    const assemblyAIKey = process.env.ASSEMBLYAI_API_KEY || "";

    if (!assemblyAIKey) {
      console.error("❌ ASSEMBLYAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "AssemblyAI API key not configured" },
        { status: 500 }
      );
    }

    console.log("🔑 API Key (first 10 chars):", assemblyAIKey.substring(0, 10) + "...");
    console.log("🔑 API Key length:", assemblyAIKey.length);

    // Send binary audio data directly to AssemblyAI upload endpoint
    const uploadResponse = await fetch(
      "https://api.assemblyai.com/v2/upload",
      {
        method: "POST",
        headers: {
          Authorization: assemblyAIKey,
          "Content-Type": "application/octet-stream",
        },
        body: audioBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`❌ AssemblyAI upload error: ${uploadResponse.status}`);
      console.error("Error response:", errorText);
      
      // Try to parse as JSON
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = JSON.stringify(errorJson);
      } catch (e) {
        // Keep as text
      }
      
      return NextResponse.json(
        { error: `Upload failed: ${uploadResponse.status} - ${errorMessage}` },
        { status: 500 }
      );
    }

    const uploadData = await uploadResponse.json() as { upload_url: string };
    const audioUrl = uploadData.upload_url;

    console.log("✅ Audio uploaded. Requesting transcription...");
    console.log("Audio URL:", audioUrl);

    if (!audioUrl) {
      console.error("❌ No audio URL returned from AssemblyAI upload");
      return NextResponse.json(
        { error: "Upload succeeded but no URL returned" },
        { status: 500 }
      );
    }

    // Step 2: Request transcription
    const transcriptPayload = {
      audio_url: audioUrl,
    };

    console.log("📤 Sending transcription request with payload:", transcriptPayload);

    const transcriptResponse = await fetch(
      "https://api.assemblyai.com/v2/transcript",
      {
        method: "POST",
        headers: {
          Authorization: assemblyAIKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transcriptPayload),
      }
    );

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error(`❌ AssemblyAI transcription error: ${transcriptResponse.status}`);
      console.error("Error details:", errorText);
      
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        console.error("Parsed error JSON:", errorJson);
        errorMessage = JSON.stringify(errorJson);
      } catch (e) {
        // Keep as text
      }
      
      return NextResponse.json(
        { error: `Transcription request failed: ${transcriptResponse.status} - ${errorMessage}` },
        { status: 500 }
      );
    }

    const transcriptData = await transcriptResponse.json() as { id: string };
    const transcriptId = transcriptData.id;

    console.log(`📝 Transcription requested (ID: ${transcriptId})`);

    // Step 3: Poll for transcription result
    let transcript = "";
    let attempts = 0;
    const maxAttempts = 120; // Max 2 minutes (1 second per poll)

    while (attempts < maxAttempts) {
      const pollResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          method: "GET",
          headers: {
            Authorization: assemblyAIKey,
          },
        }
      );

      if (!pollResponse.ok) {
        console.error(`❌ Poll error: ${pollResponse.status}`);
        break;
      }

      const pollData = await pollResponse.json() as {
        status: string;
        text?: string;
      };

      if (pollData.status === "completed") {
        transcript = pollData.text || "";
        console.log(`✅ Transcription complete: "${transcript.substring(0, 100)}..."`);
        break;
      }

      if (pollData.status === "error") {
        console.error("❌ Transcription failed");
        break;
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      // Log progress every 10 attempts
      if (attempts % 10 === 0) {
        console.log(`⏳ Still transcribing... (${attempts}s)`);
      }
    }

    if (attempts >= maxAttempts) {
      console.warn("⚠️ Transcription polling timeout");
      transcript = "Transcription timeout - audio may be too long";
    }

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
