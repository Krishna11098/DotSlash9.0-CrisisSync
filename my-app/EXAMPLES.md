/**
 * 🔥 EXAMPLE: How to Use the Multimodal Truth + Priority Engine
 * 
 * Copy and adapt these examples for your own integration
 */

// ============================================================================
// EXAMPLE 1: JavaScript/Node.js
// ============================================================================

async function submitReportViaAPI() {
  const imageUrl = "https://example.com/fire-image.jpg";
  const description = "Building on fire, 5th floor, Main Street";
  const location = "Main Street, Downtown";

  const response = await fetch("/api/verify-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: imageUrl,
      text_description: description,
      location: location,
      report_count: 3, // 3 people reported same incident
      coordinates: {
        lat: 40.7128,
        lng: -74.006,
      },
    }),
  });

  const result = await response.json();

  if (result.success) {
    console.log("✅ Report Verified!");
    console.log(`Priority: ${result.data.priority.priority_level}`);
    console.log(`Score: ${result.data.priority.priority_score}/100`);
    console.log(`Recommendation: ${result.data.priority.recommendation}`);

    // Send to authorities if approved
    if (result.data.approved) {
      await notifyAuthorities(result.data);
    }
  } else {
    console.error("❌ Error:", result.error);
  }
}

// ============================================================================
// EXAMPLE 2: Process Image from File (Base64)
// ============================================================================

import * as fs from "fs";

async function submitWithBase64Image(imagePath: string) {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString("base64");
  const mimeType = "image/jpeg"; // or detect from file

  const response = await fetch("/api/verify-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: `data:${mimeType};base64,${base64Image}`,
      text_description: "Debris blocking main road",
      location: "Highway 101",
      report_count: 1,
    }),
  });

  return await response.json();
}

// ============================================================================
// EXAMPLE 3: Batch Process Multiple Reports
// ============================================================================

interface Report {
  imageUrl: string;
  description: string;
  location: string;
}

async function batchProcessReports(reports: Report[]) {
  const results = [];

  for (const report of reports) {
    console.log(`Processing: ${report.location}`);

    const response = await fetch("/api/verify-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: report.imageUrl,
        text_description: report.description,
        location: report.location,
        report_count: 1,
      }),
    });

    const result = await response.json();
    results.push({
      location: report.location,
      approved: result.data.approved,
      priority: result.data.priority.priority_level,
      score: result.data.priority.priority_score,
    });

    // Wait 1 second between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

// ============================================================================
// EXAMPLE 4: React Component (Event-Driven)
// ============================================================================

import React, { useState } from "react";

function EmergencyReportForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const imageFile = formData.get("image") as File;

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;

      const response = await fetch("/api/verify-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          text_description: formData.get("description"),
          location: formData.get("location"),
          report_count: 1,
        }),
      });

      const data = await response.json();
      setResult(data.data);
      setLoading(false);

      // Auto-dispatch if CRITICAL
      if (data.data.priority.priority_level === "CRITICAL") {
        dispatchEmergencyServices(data.data);
      }
    };

    reader.readAsDataURL(imageFile);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="file" name="image" required />
        <textarea name="description" placeholder="What's happening?" required />
        <input type="text" name="location" placeholder="Location" required />
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Submit Report"}
        </button>
      </form>

      {result && (
        <div className={`priority-${result.priority.priority_level}`}>
          <h3>Priority: {result.priority.priority_level}</h3>
          <p>Score: {result.priority.priority_score}/100</p>
          <p>{result.priority.recommendation}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Integrate with Authorities API
// ============================================================================

async function notifyAuthorities(verifiedReport: any) {
  // Only notify if approved and high priority
  if (!verifiedReport.approved) return;

  const AUTHORITY_ENDPOINTS = {
    CRITICAL: "https://emergency.dispatch.gov/api/critical",
    HIGH: "https://emergency.dispatch.gov/api/high-priority",
    MEDIUM: "https://city-services.gov/api/reports",
    LOW: "https://community.gov/api/suggestions",
  };

  const endpoint =
    AUTHORITY_ENDPOINTS[
      verifiedReport.priority.priority_level as keyof typeof AUTHORITY_ENDPOINTS
    ];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AUTHORITY_API_KEY}`,
    },
    body: JSON.stringify({
      priority: verifiedReport.priority.priority_level,
      score: verifiedReport.priority.priority_score,
      detected_hazards: verifiedReport.detected_objects,
      recommendation: verifiedReport.priority.recommendation,
      confidence: verifiedReport.confidence,
      detected_at: new Date().toISOString(),
      hazard_type: verifiedReport.severity,
    }),
  });

  if (response.ok) {
    console.log("✅ Authorities notified successfully");
    return await response.json();
  } else {
    console.error("❌ Failed to notify authorities");
  }
}

// ============================================================================
// EXAMPLE 6: Advanced - Error Handling & Retry Logic
// ============================================================================

async function submitWithRetry(
  image: string,
  description: string,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("/api/verify-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          text_description: description,
          location: "Unknown",
          report_count: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error(`Failed after ${maxRetries} attempts`);
      }
    }
  }
}

// ============================================================================
// EXAMPLE 7: Scoring Breakdown Analysis
// ============================================================================

function analyzeScores(result: any) {
  const {
    image_fake_score,
    text_spam_score,
    clip_similarity,
    confidence,
    priority,
  } = result;

  console.log("📊 Score Analysis:");
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Image Fake Score:  ${(image_fake_score * 100).toFixed(1)}% fake`);
  console.log(`  → Assessment: ${image_fake_score > 0.6 ? "⚠️ SUSPICIOUS" : "✅ LIKELY REAL"}`);

  console.log(`Text Spam Score:   ${(text_spam_score * 100).toFixed(1)}% spam`);
  console.log(`  → Assessment: ${text_spam_score > 0.6 ? "⚠️ SUSPICIOUS" : "✅ GENUINE"}`);

  console.log(`CLIP Similarity:   ${(clip_similarity * 100).toFixed(1)}% match`);
  console.log(
    `  → Assessment: ${clip_similarity > 0.7 ? "✅ MATCHES" : "⚠️ MISMATCH"}`
  );

  console.log(`Overall Confidence: ${(confidence * 100).toFixed(1)}%`);
  console.log(`Priority Score:     ${priority.priority_score}/100`);
  console.log(`Priority Level:     ${priority.priority_level}`);

  // Give recommendations
  if (image_fake_score > 0.6) {
    console.log("\n⚠️ RECOMMENDATION: Image appears manipulated. Review manually.");
  }
  if (clip_similarity < 0.5) {
    console.log("\n⚠️ RECOMMENDATION: Image and text don't match. Verify report.");
  }
  if (confidence > 0.9) {
    console.log("\n✅ RECOMMENDATION: High confidence report. Fast-track to authorities.");
  }
}

// ============================================================================
// EXAMPLE 8: Real-Time Monitoring Dashboard
// ============================================================================

class ReportMonitor {
  private reports: any[] = [];
  private criticalThreshold = 80;

  async monitorReports(reportStream: AsyncIterableIterator<Report>) {
    for await (const report of reportStream) {
      const result = await this.verifyReport(report);
      this.reports.push(result);

      if (result.priority.priority_score >= this.criticalThreshold) {
        console.log(
          `🚨 CRITICAL ALERT: ${result.priority.recommendation}`
        );
        this.triggerEmergencyProtocol(result);
      }
    }
  }

  async verifyReport(report: Report) {
    const response = await fetch("/api/verify-report", {
      method: "POST",
      body: JSON.stringify(report),
      headers: { "Content-Type": "application/json" },
    });
    return (await response.json()).data;
  }

  getStatistics() {
    return {
      total_reports: this.reports.length,
      critical: this.reports.filter((r) =>
        r.priority.priority_level === "CRITICAL"
      ).length,
      high: this.reports.filter((r) => r.priority.priority_level === "HIGH")
        .length,
      average_confidence: (
        this.reports.reduce((sum, r) => sum + r.confidence, 0) /
        this.reports.length
      ).toFixed(2),
    };
  }

  private triggerEmergencyProtocol(result: any) {
    // Call 911 API, send alerts, etc.
    console.log("🚑 Emergency protocol triggered!");
  }
}

// ============================================================================
// EXPORT FOR USE
// ============================================================================

export {
  submitReportViaAPI,
  submitWithBase64Image,
  batchProcessReports,
  EmergencyReportForm,
  notifyAuthorities,
  submitWithRetry,
  analyzeScores,
  ReportMonitor,
};
