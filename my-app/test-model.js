/**
 * Test script to see what umm-maybe/AI-image-detector actually returns
 * Usage: node test-model.js <path-to-image>
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function testModel(imagePath) {
  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  console.log("🔍 Testing umm-maybe/AI-image-detector model...");
  console.log(`📁 Image: ${imagePath}`);
  console.log(`📊 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/umm-maybe/AI-image-detector",
      {
        headers: { Authorization: `Bearer ${process.env.HF_API_KEY || ""}` },
        method: "POST",
        body: imageBuffer,
      }
    );

    console.log(`\n🌐 Response status: ${response.status}`);
    
    const result = await response.json();
    
    console.log("\n📋 Raw model output:");
    console.log(JSON.stringify(result, null, 2));

    // Parse like in pipeline.ts
    if (Array.isArray(result)) {
      console.log("\n✅ Parsed as array:");
      let aiScore = 0;
      let realScore = 0;

      result.forEach((item) => {
        const label = item.label.toLowerCase().trim();
        console.log(`  → Label: "${label}" | Score: ${item.score.toFixed(4)}`);
        
        if (label === "real" || label === "human") {
          realScore = item.score;
        } else if (label === "artificial" || label === "ai") {
          aiScore = item.score;
        }
      });

      console.log(`\n📊 Final Scores:`);
      console.log(`  Real: ${(realScore * 100).toFixed(1)}%`);
      console.log(`  AI: ${(aiScore * 100).toFixed(1)}%`);
      console.log(`  Using fakeScore: ${(aiScore * 100).toFixed(1)}%`);
      console.log(`\n🚨 Decision: ${aiScore > 0.5 ? "❌ FLAGGED AS FAKE" : "✅ PASSED (Real)"}`);
    } else {
      console.log("\n⚠️ Result is NOT an array! Direct response:");
      console.log(result);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

const imagePath = process.argv[2];
if (!imagePath) {
  console.log("Usage: node test-model.js <path-to-image>");
  console.log("Example: node test-model.js ./test-real.jpg");
  process.exit(1);
}

if (!fs.existsSync(imagePath)) {
  console.error(`❌ File not found: ${imagePath}`);
  process.exit(1);
}

testModel(imagePath);
