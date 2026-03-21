import { ReportSubmissionForm } from "@/components/ReportSubmissionForm";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full flex-col items-center justify-start py-8 px-4 bg-white dark:bg-black">
        {/* Header */}
        <div className="w-full max-w-4xl mb-8">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl font-bold text-zinc-900">
              🔥 Multimodal Truth + Priority Engine
            </h1>
          </div>
          <p className="text-lg text-zinc-600">
            Combine deepfake detection, NLP validation, image-text consistency, and
            intelligent prioritization to verify reports and route to authorities.
          </p>
        </div>

        {/* Main Form Component */}
        <ReportSubmissionForm />

        {/* Architecture Info */}
        <div className="w-full max-w-4xl mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ArchitectureCard
            title="🧠 Verification Layer"
            items={["Deepfake Detection (Image)", "AI-Generated Text Detection", "Image-Text Consistency (CLIP)", "Scene Object Detection"]}
          />
          <ArchitectureCard
            title="📊 Priority Engine"
            items={["Severity Analysis", "Crowd Counting", "Critical Location Detection", "Community Reports Validation"]}
          />
          <ArchitectureCard
            title="🏗️ Tech Stack"
            items={["Hugging Face Models", "Next.js + React", "TypeScript", "Tailwind CSS"]}
          />
          <ArchitectureCard
            title="🎯 Key Features"
            items={["Real-time Processing", "Multimodal Analysis", "Confidence Scoring", "Actionable Recommendations"]}
          />
        </div>

        {/* Flow Diagram */}
        <div className="w-full max-w-4xl mt-12 p-8 bg-zinc-50 rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900">⚙️ Processing Pipeline</h2>
          <div className="space-y-4 text-center">
            <PipelineStep step="1" title="User Submission" desc="Image + Description + Location" />
            <PipelineStep step="2" title="Fake Detection" desc="Image deepfakes & text spam check" />
            <PipelineStep step="3" title="Consistency" desc="CLIP image-text matching" />
            <PipelineStep step="4" title="Scene Analysis" desc="Object detection & hazard ID" />
            <PipelineStep step="5" title="Priority Ranking" desc="Rules-based + ML prioritization" />
            <PipelineStep step="🎯" title="Final Output" desc="Approved → Route to authorities" />
          </div>
        </div>

        {/* Results Table */}
        <div className="w-full max-w-4xl mt-12 p-8 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-2xl font-bold mb-4 text-zinc-900">📈 Output Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <MetricBox label="Image Authenticity" value="0-100%" />
            <MetricBox label="Text Credibility" value="0-100%" />
            <MetricBox label="Image-Text Match" value="0-100%" />
            <MetricBox label="Priority Score" value="0-100" />
          </div>
        </div>
      </main>
    </div>
  );
}

function ArchitectureCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
      <h3 className="text-lg font-bold text-zinc-900 mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm text-zinc-700 flex items-center gap-2">
            <span className="text-blue-600">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PipelineStep({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
        {step}
      </div>
      <div className="text-left">
        <p className="font-semibold text-zinc-900">{title}</p>
        <p className="text-sm text-zinc-600">{desc}</p>
      </div>
      {step !== "🎯" && <div className="ml-auto text-2xl">⬇️</div>}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-white rounded-lg border border-blue-200">
      <p className="text-xs text-zinc-600 mb-2">{label}</p>
      <p className="text-xl font-bold text-blue-600">{value}</p>
    </div>
  );
}
