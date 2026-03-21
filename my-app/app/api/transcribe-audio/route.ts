import { NextRequest, NextResponse } from "next/server";

function getEnvValue(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.audio) {
      return NextResponse.json({ error: "Missing audio data" }, { status: 400 });
    }

    const audio = body.audio as string;
    const base64Audio = audio.includes(",") ? audio.split(",")[1] : audio;
    const audioBuffer = Buffer.from(base64Audio, "base64");

    if (!audioBuffer.length) {
      return NextResponse.json({ error: "Audio buffer is empty" }, { status: 400 });
    }

    const deepgramKey = getEnvValue("DEEPGRAM_API_KEY", "NEXT_PUBLIC_DEEPGRAM_API_KEY");
    if (!deepgramKey) {
      return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
    }

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
      return NextResponse.json(
        { error: `Transcription failed: ${deepgramResponse.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const response = (await deepgramResponse.json()) as {
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
      return NextResponse.json({ error: "No transcript returned from Deepgram" }, { status: 500 });
    }

    return NextResponse.json({ success: true, text: transcript }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during transcription",
      },
      { status: 500 }
    );
  }
}
