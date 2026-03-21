// Core types for the multimodal truth + priority engine

export interface VerificationResult {
  image_fake_score: number; // 0 (real) to 1 (fake)
  text_spam_score: number; // 0 (clean) to 1 (spam/AI-generated)
  clip_similarity: number; // 0-1, how well image matches text description
  detected_objects: string[]; // Objects found in image (fire, water, crowd, etc.)
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number; // Overall confidence 0-1
  is_fake: boolean;
  reasoning: string;
}

export interface PrioritizationInput {
  issue_severity: string;
  crowd_count: number;
  location: string;
  is_critical_location: boolean;
  num_reports: number;
  fake_score: number;
  text_credibility: number;
  image_text_match: number;
  detected_hazards: string[];
}

export interface PrioritizationOutput {
  priority_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  priority_score: number; // 0-100
  recommendation: string;
  estimated_urgency_seconds: number; // How soon authorities should respond
  department: "Hospital" | "Fire" | "Municipal" | "Police"; // Routing department
  department_priority: string; // Category-specific priority
  department_confidence: number; // Base confidence for this department (0.98 Hospital, 0.87 Fire, etc.)
}

export interface SubmissionRequest {
  image: string; // base64 or URL
  text_description: string;
  audio?: string; // base64 audio file (optional - can be used to generate additional text)
  location?: string;
  report_count?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface FinalResponse extends VerificationResult {
  priority: PrioritizationOutput;
  approved: boolean;
}
