import { createWorker } from "tesseract.js";

let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

export async function initOCR() {
  if (worker) return worker;

  worker = await createWorker("eng", 1, {
    logger: () => { },
  });

  return worker;
}

export async function extractText(image: File | string) {
  const ocrWorker = await initOCR();

  console.log("⏳ Tesseract recognizing image...");
  const startTime = performance.now();

  const { data } = await ocrWorker.recognize(image);

  const endTime = performance.now();
  console.log(`⏱️ OCR Recognition took ${(endTime - startTime).toFixed(2)}ms`);
  console.log("📝 Raw OCR confidence:", data.confidence);
  console.log("📋 === FULL TESSERACT EXTRACTED TEXT ===");
  console.log(data.text);
  console.log("📋 === END TESSERACT TEXT ===");

  return data.text;
}

// ============= GEMINI INTEGRATION FOR SMART EXTRACTION =============
interface GeminiExtractedData {
  name: string;
  phone: string;
  company: string;
}

export async function extractWithGemini(extractedText: string): Promise<GeminiExtractedData> {
  console.log("🤖 Using Gemini 2.5 Flash for intelligent extraction...");
  console.log("📤 Input text for Gemini:", extractedText.substring(0, 200) + "...");
  const startTime = performance.now();

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_GOOGLE_API_KEY not configured");
    }

    const prompt = `Extract NAME, PHONE, COMPANY from this business card text. Return ONLY a raw JSON object. Do not include markdown formatting like \`\`\`json. Do not include any explanations.

TEXT:
${extractedText}

JSON Output Format:
{"name": "...", "phone": "...", "company": "..."}

Rules: name=person, phone=mobile, company=brand or company. Use "" if not found.`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024, // Increased to prevent truncation
      },
    };

    console.log("📤 Sending request to Gemini API...");
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("📥 Received response from Gemini. Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Gemini API error response:", errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    console.log("📦 Full Gemini response:", JSON.stringify(data, null, 2));

    // Fix: Use 'candidates' path (not 'contents') for Gemini 2.5 Flash API
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("📝 Gemini response text:", responseText);

    if (!responseText) {
      console.warn("⚠️ Empty response from Gemini. This may happen if response was truncated.");
      console.warn("Available paths in response:", {
        hasCandidates: !!data.candidates,
        hasContent: !!data.candidates?.[0]?.content,
        hasParts: !!data.candidates?.[0]?.content?.parts,
        hasText: !!data.candidates?.[0]?.content?.parts?.[0]?.text,
      });
      throw new Error("Empty response from Gemini");
    }

    // Parse the JSON response - more robust extraction
    let parsed;
    try {
      // Try direct JSON parsing first
      parsed = JSON.parse(responseText);
    } catch (e) {
      // If that fails, try extracting JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("⚠️ No JSON found in Gemini response");
        throw new Error("No JSON found in Gemini response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    const endTime = performance.now();
    console.log(`⏱️ Gemini extraction took ${(endTime - startTime).toFixed(2)}ms`);
    console.log("✅ Parsed Gemini response:", parsed);

    return {
      name: parsed.name?.trim() || "",
      phone: parsed.phone?.trim() || "",
      company: parsed.company?.trim() || "",
    };
  } catch (error) {
    console.error("❌ Gemini extraction error:", error);
    throw error;
  }
}


function preprocessImage(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Apply grayscale and enhance contrast
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Convert to grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Enhance contrast using threshold
    const threshold = 128;
    const enhanced = gray > threshold ? 255 : 0;

    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Resize image for faster OCR processing (low latency optimization)
export function resizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxWidth = 2400; // Increased for better text recognition
        const scale = maxWidth / img.width;

        canvas.width = maxWidth;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Apply preprocessing to enhance OCR
        const processedCanvas = preprocessImage(canvas);

        processedCanvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          resolve(new File([blob], file.name, { type: "image/png" }));
        }, "image/png", 0.95);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    reader.readAsDataURL(file);
  });
}

// Extract structured data from OCR text with optimized patterns
export interface ExtractedCardData {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export function extractCardData(text: string): ExtractedCardData {
  console.log("=== OCR Extracted Text ===");
  console.log(text);
  console.log("==========================");

  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line);

  console.log("Parsed Lines:", lines);

  // Extract email - most reliable pattern
  const emailMatch = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
  );
  const email = emailMatch?.[0] || "";
  console.log("Email Match:", email);

  // ============= IMPROVED PHONE EXTRACTION =============
  let phone = "";

  // Pattern 1: Look for +91 with 10 digits
  let phoneMatch = text.match(/\+91\s*(\d{10})/);
  if (phoneMatch) {
    phone = "+91" + phoneMatch[1];
    console.log("✓ Found +91 format:", phone);
  } else {
    // Pattern 2: Look for any sequence of digits that looks like +91XXXXXXXXXX
    // This handles cases like "71 718354949854" where OCR might have separated digits
    phoneMatch = text.match(/(?:71\s*)?([6-9]\d{9})/);
    if (phoneMatch && phoneMatch[1]) {
      phone = phoneMatch[1];
      console.log("✓ Found 10-digit phone:", phone);

      // Check if there's +91 or +91 prefix in the full text
      const plusMatch = text.match(/\+91\s*[\d\s]*/);
      if (plusMatch && plusMatch[0].includes("91")) {
        phone = "+91" + phone;
        console.log("✓ Added +91 prefix:", phone);
      }
    }
  }

  // Pattern 3: Last resort - look for any 10-digit number starting with 6-9
  if (!phone) {
    phoneMatch = text.match(/\b[6-9]\d{9}\b/);
    if (phoneMatch) {
      phone = phoneMatch[0];
      console.log("✓ Found standalone 10-digit:", phone);
    }
  }

  console.log("Final Phone Match:", phone);
  console.log("Phone all attempts (with +91):", text.match(/\+91\s*(\d{10})/));
  console.log("Phone all attempts (10 digits):", text.match(/([6-9]\d{9})/));

  // ============= IMPROVED NAME EXTRACTION =============
  let name = "";

  // Blacklist of common non-name words/phrases
  const blacklistWords = [
    "department",
    "admission",
    "degree",
    "validity",
    "surat",
    "anand",
    "institute",
    "technology",
    "engineering",
    "national",
    "university",
    "college",
    "address",
    "founder",
    "ceo",
    "co",
    "and",
    "or",
    "tower",
    "apartment",
    "road",
    "street",
    "fax",
    "phone",
    "mobile",
    "whatsapp",
    "skype",
    "www",
    "http",
    "gujarat",
    "bakrol",
    "kush",
    "opp",
    "farm",
  ];

  // Strategy 1: Look for exactly 2 capitalized words (First Name Last Name)
  // This is a very strong indicator of a person's name
  console.log("🔍 Strategy 1: Looking for 'FirstName LastName' pattern...");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const words = line.split(/\s+/);

    // Exactly 2 words, both capitalized (typical name format)
    if (words.length === 2) {
      const [word1, word2] = words;

      // Check if both look like proper names (start with capital, mostly letters)
      const word1IsName = /^[A-Z][a-z]+$/.test(word1) || /^[A-Z][a-z]+-[A-Z][a-z]+$/.test(word1);
      const word2IsName = /^[A-Z][a-z]+$/.test(word2) || /^[A-Z][a-z]+-[A-Z][a-z]+$/.test(word2);

      if (word1IsName && word2IsName) {
        // Check against blacklist (case-insensitive)
        const fullLine = line.toLowerCase();
        if (!blacklistWords.some((word) => fullLine.includes(word))) {
          name = line;
          console.log("✓ Pattern 1 matched:", name);
          break;
        }
      }
    }
  }

  // Strategy 2: If not found, look for 3 words (FirstName MiddleName LastName)
  if (!name) {
    console.log("🔍 Strategy 2: Looking for 'FirstName MiddleName LastName' pattern...");
    for (const line of lines) {
      const words = line.split(/\s+/);

      if (words.length === 3) {
        const allCapitalized = words.every(
          (word) => /^[A-Z][a-z]+$/.test(word) || /^[A-Z][a-z]+-[A-Z][a-z]+$/.test(word)
        );

        if (allCapitalized) {
          const fullLine = line.toLowerCase();
          if (!blacklistWords.some((word) => fullLine.includes(word))) {
            name = line;
            console.log("✓ Pattern 2 matched:", name);
            break;
          }
        }
      }
    }
  }

  // Strategy 3: Look for lines with capitalized words + digits (common in OCR)
  if (!name) {
    console.log("🔍 Strategy 3: Looking for names with possible OCR artifacts...");
    for (const line of lines) {
      // Look for pattern like "FirstName LastName 1234567890" (name + phone on same line)
      const match = line.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)\s+\d+/);
      if (match) {
        name = match[1];
        console.log("✓ Pattern 3 matched:", name);
        break;
      }
    }
  }

  // Strategy 4: As last resort, look for first capitalized word if it's not in blacklist
  if (!name) {
    console.log("🔍 Strategy 4: Fallback to first capitalized word...");
    for (const line of lines) {
      const words = line.split(/\s+/);
      const firstWord = words[0];

      // Must be reasonably long (names aren't usually 1-2 chars)
      if (
        /^[A-Z][a-z]{3,}$/.test(firstWord) &&
        !blacklistWords.includes(firstWord.toLowerCase())
      ) {
        name = firstWord;
        console.log("⚠ Pattern 4 matched:", name);
        break;
      }
    }
  }

  console.log("Final Name Match:", name);

  // ============= COMPANY EXTRACTION =============
  let company = "";
  const companyBlacklist = [
    "founder",
    "ceo",
    "co",
    "director",
    "manager",
    "lead",
    "head",
    "engineer",
    "developer",
    "consultant",
    "analyst",
    "specialist",
    "officer",
    "executive",
    "president",
    "vice",
    "address",
    "phone",
    "mobile",
    "email",
    "fax",
    "website",
    "www",
    "http",
    "gmail",
    "yahoo",
    "outlook",
  ];

  console.log("🔍 Looking for company name...");

  // Find the index of the person's name to search after it
  let nameLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(name) && name.length > 0) {
      nameLineIndex = i;
      break;
    }
  }

  // Search for company in lines after the name
  const searchStartIndex = nameLineIndex >= 0 ? nameLineIndex + 1 : 0;

  // Strategy 1: Look for website domain name (www.companyname.com -> extract companyname)
  console.log("📍 Strategy 1: Extracting company from domain...");
  const domainMatch = text.match(/(?:www\.)?(\w+)\.(in|com|co|io|net|org|biz)/i);
  if (domainMatch && domainMatch[1]) {
    const domainName = domainMatch[1];
    // Only use if it's a good candidate (not blacklisted, reasonable length)
    if (
      !companyBlacklist.includes(domainName.toLowerCase()) &&
      domainName.length > 2 &&
      domainName.length < 30
    ) {
      company = domainName;
      console.log("✓ Strategy 1 matched (domain):", company);
    }
  }

  // Strategy 2: Look for all-caps brand names or large branded text
  if (!company) {
    console.log("📍 Strategy 2: Looking for all-caps brand names...");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Look for all-caps words that are brand-like (3-20 chars, no numbers)
      if (line.match(/^[A-Z]{3,20}$/) && !companyBlacklist.includes(lowerLine)) {
        company = line;
        console.log("✓ Strategy 2 matched (all-caps):", company);
        break;
      }
    }
  }

  // Strategy 3: Look for standalone capitalized brand names (not after title)
  if (!company) {
    console.log("📍 Strategy 3: Looking for standalone brand names...");
    for (let i = searchStartIndex; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Skip if line contains blacklist words (titles, contact info, etc.)
      if (companyBlacklist.some((word) => lowerLine.includes(word))) {
        continue;
      }

      // Skip if it's too long (likely address) or too short (likely single word)
      if (line.length > 80 || line.length < 3) {
        continue;
      }

      // Skip if it's just numbers or just address-like content
      if (
        line.match(/^\d+$/) ||
        lowerLine.includes("apartment") ||
        lowerLine.includes("tower") ||
        lowerLine.includes("road") ||
        lowerLine.includes("street") ||
        lowerLine.includes("lane") ||
        lowerLine.includes("pincode") ||
        lowerLine.includes("zip")
      ) {
        continue;
      }

      // Skip address-like lines (with commas separating multiple parts)
      if ((line.match(/,/g) || []).length >= 2) {
        continue;
      }

      // Look for company patterns:
      // 1. Lines with special symbols (®, ©, &) often indicate company names
      if (line.match(/[®©&]/)) {
        company = line;
        console.log("✓ Strategy 3 matched (symbol):", company);
        break;
      }

      // 2. Lines with multiple capitalized words (Brand Name, Company Ltd, etc.)
      const capitalizedWords = (line.match(/\b[A-Z][a-z]+\b/g) || []).length;
      const totalWords = (line.match(/\b\w+\b/g) || []).length;

      if (capitalizedWords >= 2 && capitalizedWords === totalWords && line.length > 5) {
        company = line;
        console.log("✓ Strategy 3 matched (multi-word):", company);
        break;
      }

      // 3. Single capitalized word with numbers or symbols (like startup names)
      if (line.match(/^[A-Z]\w+/) && (line.includes("Inc") || line.includes("Ltd") || line.includes("LLC"))) {
        company = line;
        console.log("✓ Strategy 3 matched (Inc/Ltd/LLC):", company);
        break;
      }
    }
  }

  // Strategy 4: Search entire text for known brand patterns (not just after name)
  if (!company) {
    console.log("📍 Strategy 4: Global brand pattern search...");

    // Look for standalone capitalized brand names anywhere in text
    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Skip blacklist
      if (companyBlacklist.some((word) => lowerLine.includes(word))) {
        continue;
      }

      // Single word brand names (3-20 chars, starts with capital)
      if (
        line.match(/^[A-Z][a-z]{2,19}$/) &&
        line.length > 2 &&
        !line.match(/^(And|The|With|From|For|Your)$/)
      ) {
        company = line;
        console.log("✓ Strategy 4 matched (single word brand):", company);
        break;
      }
    }
  }

  console.log("Final Company Match:", company);
  console.log("Extracted Data:", { name, email, phone, company });

  return {
    name: name.trim(),
    email,
    phone,
    company: company.trim(),
  };
}

// Main function: Scan business card with optimized low-latency processing using hybrid approach
export async function scanBusinessCard(file: File): Promise<ExtractedCardData> {
  const totalStartTime = performance.now();

  try {
    console.log("🔍 Starting business card scan (Hybrid: Tesseract + Gemini)...");
    console.log("File:", file.name, "- Size:", file.size, "bytes");

    // Step 1: Resize and preprocess image for faster processing
    console.log("📏 Resizing and preprocessing image...");
    const resizedFile = await resizeImage(file);
    console.log("✓ Image preprocessed - Size:", resizedFile.size, "bytes");

    // Step 2: Extract text using OCR (Tesseract)
    console.log("🔤 Running Tesseract OCR recognition...");
    const extractedText = await extractText(resizedFile);
    console.log("✓ Tesseract OCR Complete");

    // Step 3: Extract email using regex (fast)
    console.log("📧 Extracting email using regex...");
    const emailMatch = extractedText.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
    );
    const email = emailMatch?.[0] || "";
    console.log("✓ Email extracted:", email);

    // Step 4: intelligent extraction
    let cardData: ExtractedCardData = {
      name: "",
      email: email,
      phone: "",
      company: "",
    };

    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (isOnline) {
      try {
        console.log("🤖 Using Gemini 2.5 Flash for intelligent extraction...");
        const geminiData = await extractWithGemini(extractedText);

        cardData = {
          name: geminiData.name,
          email: email || "", // Keep regex email if Gemini doesn't find one, or prefer Gemini? usually regex for email is reliable.
          phone: geminiData.phone,
          company: geminiData.company,
        };
      } catch (err) {
        console.warn("⚠️ Gemini extraction failed, falling back to Regex:", err);
        // Fallback to local regex
        const regexData = extractCardData(extractedText);
        cardData = {
          ...regexData,
          email: email || regexData.email, // Prefer the one we found earlier or regexData's
        };
      }
    } else {
      console.log("🔌 Offline mode detected. Using local Regex extraction...");
      const regexData = extractCardData(extractedText);
      cardData = {
        ...regexData,
        email: email || regexData.email,
      };
    }

    // Final check for email if missing
    if (!cardData.email && email) cardData.email = email;

    const totalEndTime = performance.now();
    const totalTime = (totalEndTime - totalStartTime).toFixed(2);
    console.log(`⏱️ Total scan time: ${totalTime}ms`);
    console.log(`✓ Data extraction complete - Latency: ${totalTime}ms`);
    console.log("📊 === FINAL EXTRACTED DATA ===");
    console.log(JSON.stringify(cardData, null, 2));
    console.log("📊 === END FINAL DATA ===");

    return cardData;
  } catch (error) {
    console.error("❌ Error scanning business card:", error);
    throw error;
  }
}

// ============= MULTI-IMAGE SCANNING WITH PARALLEL PROCESSING =============
export async function scanMultipleBusinessCards(files: File[]): Promise<ExtractedCardData> {
  const totalStartTime = performance.now();

  try {
    console.log(`🔍 Starting multi-image business card scan...`);
    console.log(`📸 Processing ${files.length} image(s)...`);

    // Step 1: Parallel image preprocessing and OCR
    console.log("📏 Resizing and preprocessing all images in parallel...");
    const resizeStartTime = performance.now();

    const resizedFiles = await Promise.all(files.map((file) => resizeImage(file)));

    const resizeEndTime = performance.now();
    console.log(`✓ All images preprocessed in ${(resizeEndTime - resizeStartTime).toFixed(2)}ms`);

    // Step 2: Parallel Tesseract OCR for all images
    console.log("🔤 Running Tesseract OCR on all images in parallel...");
    const ocrStartTime = performance.now();

    const allExtractedTexts = await Promise.all(resizedFiles.map((file) => extractText(file)));

    const ocrEndTime = performance.now();
    console.log(`✓ OCR completed for all ${files.length} image(s) in ${(ocrEndTime - ocrStartTime).toFixed(2)}ms`);

    // Step 3: Combine all extracted text
    const combinedText = allExtractedTexts.join("\n\n--- IMAGE BOUNDARY ---\n\n");
    console.log("📋 === COMBINED TEXT FROM ALL IMAGES ===");
    console.log(combinedText);
    console.log("📋 === END COMBINED TEXT ===");

    // Step 4: Extract email using regex (fast)
    console.log("📧 Extracting email using regex...");
    const emailMatch = combinedText.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
    );
    const email = emailMatch?.[0] || "";
    console.log("✓ Email extracted:", email);

    // Step 5: Intelligent extraction (Gemini or Fallback)
    let cardData: ExtractedCardData = {
      name: "",
      email: email,
      phone: "",
      company: "",
    };

    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (isOnline) {
      try {
        console.log("🤖 Using Gemini 2.5 Flash for intelligent extraction (combined text)...");
        const geminiStartTime = performance.now();
        const geminiData = await extractWithGemini(combinedText);
        const geminiEndTime = performance.now();
        console.log(`✓ Gemini processing completed in ${(geminiEndTime - geminiStartTime).toFixed(2)}ms`);

        cardData = {
          name: geminiData.name,
          email: email || "",
          phone: geminiData.phone,
          company: geminiData.company,
        };
      } catch (err) {
        console.warn("⚠️ Gemini extraction failed/timed out, falling back to Regex:", err);
        const regexData = extractCardData(combinedText);
        cardData = {
          ...regexData,
          email: email || regexData.email,
        };
      }
    } else {
      console.log("🔌 Offline mode detected. Using local Regex extraction (Multi-File)...");
      const regexData = extractCardData(combinedText);
      cardData = {
        ...regexData,
        email: email || regexData.email,
      };
    }

    // Final check for email
    if (!cardData.email && email) cardData.email = email;

    const totalEndTime = performance.now();
    const totalTime = (totalEndTime - totalStartTime).toFixed(2);
    console.log(`⏱️ Total scan time for ${files.length} image(s): ${totalTime}ms`);
    console.log(`✓ Data extraction complete - Latency: ${totalTime}ms`);
    console.log("📊 === FINAL EXTRACTED DATA (MULTI-IMAGE) ===");
    console.log(JSON.stringify(cardData, null, 2));
    console.log("📊 === END FINAL DATA ===");

    return cardData;
  } catch (error) {
    console.error("❌ Error scanning multiple business cards:", error);
    throw error;
  }
}
