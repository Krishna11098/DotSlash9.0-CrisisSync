"use client";

import { useState, useEffect, useRef } from "react";
import { VerificationResult, PrioritizationOutput, FinalResponse } from "@/lib/report-types";

interface SubmissionState {
  loading: boolean;
  submitted: boolean;
  result?: FinalResponse;
  error?: string;
}

export function ReportSubmissionForm() {
  const [hydrated, setHydrated] = useState(false);
  const [formData, setFormData] = useState({
    image: "",
    text_description: "",
    audio: "",
    location: "",
    report_count: 1,
    departments: [] as string[], // Selected departments
  });

  const departments = ["hospital", "fire", "police", "municipal corporation"];
  
  // Calculate how many input fields are filled (must be 1-3)
  const filledFieldCount = [
    !!formData.image,
    !!formData.text_description,
    !!formData.audio,
  ].filter(Boolean).length;

  const [state, setState] = useState<SubmissionState>({
    loading: false,
    submitted: false,
  });

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioTranscription, setAudioTranscription] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setHydrated(true);

    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Auto-transcribe when audio is recorded and set
  useEffect(() => {
    if (formData.audio && !audioTranscription && !isTranscribing) {
      console.log("📝 Audio detected. Starting transcription...");
      transcribeAudio();
    }
  }, [formData.audio]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({
          ...formData,
          image: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      setRecordingTime(0);
      setAudioTranscription("");

      // Use the best supported audio format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      console.log("📢 Using MIME type:", mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log("🎵 Audio blob created. Size:", audioBlob.size, "bytes");
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const audioBase64 = e.target?.result as string;
          console.log("📝 Audio converted to base64. Length:", audioBase64.length);
          setFormData({
            ...formData,
            audio: audioBase64,
          });
          // Audio is now set, useEffect will trigger transcription
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone access denied:", error);
      setState((prev) => ({
        ...prev,
        error: "Microphone access denied. Please allow microphone permissions.",
      }));
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Transcribe the recorded audio
  const transcribeAudio = async () => {
    if (!formData.audio) {
      console.log("No audio to transcribe");
      return;
    }

    setIsTranscribing(true);
    console.log("🎙️ Sending audio for transcription...");
    console.log("Audio data size:", formData.audio.length, "characters");

    try {
      const response = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: formData.audio,
        }),
      });

      const result = await response.json();

      console.log("📨 Response status:", response.status);
      console.log("📨 Response data:", result);

      if (!response.ok) {
        const errorMsg = result.error || `Server error: ${response.status}`;
        console.error("❌ Backend error:", errorMsg);
        throw new Error(errorMsg);
      }

      if (!result.text) {
        throw new Error("No transcription text in response");
      }

      console.log("✅ Transcription complete:", result.text);
      setAudioTranscription(result.text);
    } catch (error) {
      console.error("Transcription error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setAudioTranscription(`Error: ${errorMsg}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Delete recording
  const deleteRecording = () => {
    setFormData({ ...formData, audio: "" });
    setAudioTranscription("");
    setRecordingTime(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ loading: true, submitted: false });

    try {
      const clientReportId = crypto.randomUUID();
      const clientCreatedAt = new Date().toISOString();

      const response = await fetch("/api/submit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          client_report_id: clientReportId,
          client_created_at: clientCreatedAt,
          // Map department UI names to database values
          departments: formData.departments.map(dept => 
            dept === "municipal corporation" ? "municipal corporation" : dept
          ),
        }),
      });

      const apiResult = await response.json();

      if (!response.ok) {
        throw new Error(apiResult.error || "Failed to process report");
      }

      setState({
        loading: false,
        submitted: true,
        result: apiResult.data,
      });

      // Reset form
      setFormData({
        image: "",
        text_description: "",
        audio: "",
        location: "",
        report_count: 1,
        departments: [],
      });
      setAudioTranscription("");
      setRecordingTime(0);
    } catch (error) {
      setState({
        loading: false,
        submitted: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (state.submitted && state.result) {
    return <ResultScreen result={state.result} onReset={() => setState({ loading: false, submitted: false })} />;
  }

  if (!hydrated) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg" suppressHydrationWarning>
      <h1 className="text-3xl font-bold mb-2 text-zinc-900">🚨 Report Verification System</h1>
      <p className="text-zinc-600 mb-6">
        Upload image + description. Record audio for additional details. Our AI will verify authenticity and prioritize response.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            📸 Image Upload
          </label>
          <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center">
            {formData.image ? (
              <div className="space-y-3">
                <img
                  src={formData.image}
                  alt="Preview"
                  className="h-32 w-32 object-cover rounded mx-auto"
                />
                <p className="text-sm text-zinc-600">Preview loaded ✓</p>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image: "" })}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-input"
                  required
                />
                <label htmlFor="image-input" className="cursor-pointer">
                  <p className="text-zinc-600">Click to upload or drag and drop</p>
                  <p className="text-sm text-zinc-500">PNG, JPG, GIF up to 10MB</p>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 mb-2">
            📝 Issue Description
          </label>
          <textarea
            id="description"
            value={formData.text_description}
            onChange={(e) => setFormData({ ...formData, text_description: e.target.value })}
            placeholder="Describe what's happening in the image (e.g., 'Building on fire on Main Street, 5th floor window left side')"
            rows={4}
            className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Live Audio Recording (Similar to WhatsApp) */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            🎙️ Audio Description (Optional - Live Recording)
          </label>
          
          {!formData.audio ? (
            // Recording interface
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 text-center">
              <button
                type="button"
                onClick={!isRecording ? startRecording : stopRecording}
                className={`mx-auto mb-4 px-6 py-3 rounded-full font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isRecording ? (
                  <>
                    <span className="animate-pulse">●</span>
                    Stop Recording ({formatTime(recordingTime)})
                  </>
                ) : (
                  <>
                    🎤 Start Recording
                  </>
                )}
              </button>
              <p className="text-xs text-zinc-600 mt-3">
                {isRecording
                  ? "Recording... Speak now"
                  : "Click to start recording audio description (like WhatsApp voice message)"}
              </p>
            </div>
          ) : (
            // Recording completed with transcription
            <div className="border-2 border-green-300 rounded-lg p-6 bg-green-50 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-green-700">✓ Audio recorded ({formatTime(recordingTime)})</p>
                <button
                  type="button"
                  onClick={deleteRecording}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Delete & Re-record
                </button>
              </div>

              {/* Transcription Display */}
              <div className="bg-white rounded-lg p-4 border border-green-200">
                {isTranscribing ? (
                  <div className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    <p className="text-sm text-zinc-600">Converting speech to text...</p>
                  </div>
                ) : audioTranscription ? (
                  <div>
                    <p className="text-xs font-semibold text-zinc-700 mb-2">📄 Transcription:</p>
                    <p className="text-sm text-zinc-800 bg-zinc-50 p-3 rounded border-l-4 border-blue-500">
                      "{audioTranscription}"
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">No transcription available</p>
                )}
              </div>

              <button
                type="button"
                onClick={transcribeAudio}
                disabled={isTranscribing}
                className="w-full py-2 px-3 text-sm font-medium bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isTranscribing ? "Transcribing..." : "🔄 Re-transcribe"}
              </button>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-zinc-700 mb-2">
            📍 Location (optional)
          </label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Street address or location name"
            className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Report Count */}
        <div>
          <label htmlFor="report_count" className="block text-sm font-medium text-zinc-700 mb-2">
            👥 Number of Reports (verification count)
          </label>
          <input
            id="report_count"
            type="number"
            value={formData.report_count}
            onChange={(e) => setFormData({ ...formData, report_count: parseInt(e.target.value) || 1 })}
            min="1"
            max="100"
            className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Department Selection */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-3">
            🏢 Select Department(s) to Route Request
          </label>
          <div className="grid grid-cols-2 gap-3">
            {departments.map((dept) => (
              <label key={dept} className="flex items-center gap-2 p-3 border border-zinc-300 rounded-lg hover:bg-blue-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={formData.departments.includes(dept)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        departments: [...formData.departments, dept],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        departments: formData.departments.filter((d) => d !== dept),
                      });
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-zinc-700 capitalize">{dept}</span>
              </label>
            ))}
          </div>
          {formData.departments.length === 0 && (
            <p className="text-sm text-red-600 mt-2">⚠️ Select at least one department</p>
          )}
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            ❌ {state.error}
          </div>
        )}

        {/* Validation Messages */}
        {filledFieldCount === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            ⚠️ Please fill at least one of: image, description, or audio
          </div>
        )}
        {filledFieldCount > 3 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            ⚠️ Please fill at most 3 of: image, description, or audio
          </div>
        )}
        {formData.departments.length === 0 && filledFieldCount > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            ⚠️ Please select at least one department for routing
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            state.loading ||
            filledFieldCount < 1 ||
            filledFieldCount > 3 ||
            formData.departments.length === 0
          }
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            state.loading
              ? "bg-zinc-400 cursor-not-allowed"
              : filledFieldCount < 1 || filledFieldCount > 3 || formData.departments.length === 0
              ? "bg-zinc-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          }`}
        >
          {state.loading ? "🔄 Processing..." : "🚀 Submit Report"}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-zinc-700">
        <p className="font-semibold mb-2">🔒 How it works:</p>
        <ul className="space-y-1 text-xs">
          <li>✅ Deepfake detection analyzes image authenticity</li>
          <li>✅ NLP validates description is genuine (not AI-generated spam)</li>
          <li>✅ CLIP ensures image matches description</li>
          <li>✅ 🎙️ Live audio recording converts speech to text (AssemblyAI)</li>
          <li>✅ AI detects hazards in scene</li>
          <li>✅ Priority engine routes to appropriate teams</li>
        </ul>
      </div>
    </div>
  );
}

// Result Display Component
function ResultScreen({
  result,
  onReset,
}: {
  result: FinalResponse;
  onReset: () => void;
}) {
  const priorityColors = {
    CRITICAL: "bg-red-100 border-red-500 text-red-900",
    HIGH: "bg-orange-100 border-orange-500 text-orange-900",
    MEDIUM: "bg-yellow-100 border-yellow-500 text-yellow-900",
    LOW: "bg-green-100 border-green-500 text-green-900",
    PENDING: "bg-zinc-100 border-zinc-500 text-zinc-900",
  };

  const priorityEmoji = {
    CRITICAL: "🚨",
    HIGH: "⚠️",
    MEDIUM: "📌",
    LOW: "✓",
    PENDING: "⏳",
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-zinc-900">✅ Report Processed</h2>

      {/* Priority Banner */}
      <div
        className={`border-2 rounded-lg p-6 mb-6 ${
          priorityColors[result.priority.priority_level]
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">
            {priorityEmoji[result.priority.priority_level]} {result.priority.priority_level} PRIORITY
          </h3>
          <span className="text-lg font-semibold bg-white/50 px-3 py-1 rounded">
            {result.priority.priority_score}/100
          </span>
        </div>
        <p className="text-sm">{result.priority.recommendation}</p>
        <p className="text-xs mt-2 opacity-80">
          Estimated response time: {Math.round(result.priority.estimated_urgency_seconds / 60)} minutes
        </p>
      </div>

      {/* Verification Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <DetailCard label="Image Authenticity" value={`${Math.round((1 - result.image_fake_score) * 100)}%`} />
        <DetailCard label="Text Credibility" value={`${Math.round((1 - result.text_spam_score) * 100)}%`} />
        <DetailCard label="Image-Text Match" value={`${Math.round(result.clip_similarity * 100)}%`} />
        <DetailCard label="Overall Confidence" value={`${Math.round(result.confidence * 100)}%`} />
      </div>

      {/* Detected Objects */}
      {result.detected_objects.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-zinc-900 mb-2">🔍 Detected Hazards:</h4>
          <div className="flex flex-wrap gap-2">
            {result.detected_objects.map((obj, idx) => (
              <span key={idx} className="bg-zinc-200 px-3 py-1 rounded-full text-sm">
                {obj}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mb-6 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
        <p className="text-sm">
          <span className="font-semibold">Status:</span>{" "}
          {result.approved ? (
            <span className="text-green-600 font-semibold">✅ APPROVED - Report forwarded to authorities</span>
          ) : (
            <span className="text-orange-600 font-semibold">⚠️ FLAGGED - Report needs review</span>
          )}
        </p>
        <p className="text-xs text-zinc-600 mt-2">{result.reasoning}</p>
      </div>

      {/* Summary Scores */}
      <div className="bg-zinc-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-zinc-900 mb-3">📊 Score Breakdown:</h4>
        <ScoreBar label="Image Fake Score" value={result.image_fake_score} />
        <ScoreBar label="Text Spam Score" value={result.text_spam_score} />
        <ScoreBar label="CLIP Similarity" value={result.clip_similarity} />
      </div>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
      >
        ↻ Submit Another Report
      </button>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
      <p className="text-xs text-zinc-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percentage = value * 100;
  const isGood = value < 0.5;
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-700">{label}</span>
        <span className={isGood ? "text-green-600" : "text-orange-600"}>
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="w-full bg-zinc-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${isGood ? "bg-green-500" : "bg-orange-500"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}