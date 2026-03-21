import { ReportSubmissionForm } from "@/components/ReportSubmissionForm";

export default function SubmitRequestPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto mb-8 w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-zinc-900">Submit Request</h1>
        <p className="mt-2 text-zinc-600">
          Submit incident details with image and optional audio for automated verification and routing.
        </p>
      </div>
      <ReportSubmissionForm />
    </div>
  );
}
