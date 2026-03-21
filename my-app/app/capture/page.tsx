"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, User, CheckCircle2, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { isValidEmail, isValidPhone, validateMaxLength, validateRequiredText } from "@/lib/validation";
import { scanBusinessCard } from "@/lib/ocr";

// Regex patterns for data extraction from OCR
const REGEX_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+91[-.\s]?)?(?:[0-9]{2,4}[-.\s]?)*[0-9]{7,10}/g,
};

// Validate extracted data quality
const isValidExtraction = (data: { [key: string]: string }): boolean => {
  // Valid name should have 2+ words or be long enough
  if (data.name) {
    const nameWords = data.name.trim().split(/\s+/).length
    const nameLength = data.name.trim().length
    if (nameWords < 2 || nameLength > 60 || nameLength < 3) {
      return false
    }
  }

  // Valid company should not be too long and not contain email patterns
  if (data.company) {
    const companyLength = data.company.trim().length
    if (companyLength > 100 || companyLength < 2) {
      return false
    }
    // Company shouldn't contain common email patterns or too many special chars
    if (data.company.includes('@') && data.company.includes('/')) {
      return false
    }
  }

  // Valid phone should be numeric only (8-13 digits)
  if (data.phone) {
    const phoneDigits = data.phone.replace(/\D/g, '')
    if (phoneDigits.length < 8 || phoneDigits.length > 13) {
      return false
    }
  }

  return true
}

// Check if browser is online
const isOnline = (): boolean => {
  if (typeof window === 'undefined') return false
  return navigator.onLine
}

// Extract data using regex patterns
const extractWithRegex = (text: string) => {
  const startTime = performance.now()
  const extractedData: { [key: string]: string } = {}

  // Extract email
  const emailMatch = text.match(REGEX_PATTERNS.email)
  if (emailMatch) {
    extractedData.email = emailMatch[0]
  }

  // Extract phone
  const phoneMatch = text.match(REGEX_PATTERNS.phone)
  if (phoneMatch) {
    extractedData.phone = phoneMatch[0].replace(/[^\d+]/g, "")
  }

  // Extract name - look for names with at least 2 words
  const lines = text.split("\n").filter((line) => line.trim().length > 0)
  for (const line of lines) {
    const trimmed = line.trim()
    const words = trimmed.split(/\s+/)
    // Look for lines with 2+ words that are mostly letters
    if (words.length >= 2 && /^[A-Za-z\s]{3,}$/.test(trimmed) && trimmed.length < 50) {
      extractedData.name = trimmed
      break
    }
  }

  // Extract company (look for common company indicators)
  const companyMatch = text.match(REGEX_PATTERNS.company)
  if (companyMatch) {
    let company = companyMatch[0].trim()
    // Clean up company name - remove common junk
    company = company.replace(/\(.*?\)/g, '').trim()
    if (company.length < 100) {
      extractedData.company = company
    }
  }

  const latency = (performance.now() - startTime).toFixed(2)
  console.log(
    '%c🔍 REGEX EXTRACTION RESULTS',
    'color: #FF6B6B; font-weight: bold; font-size: 14px;',
    {
      results: extractedData,
      isValid: isValidExtraction(extractedData),
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    }
  )

  return extractedData
}

// Use Gemini 2.5 Flash to extract name and company
const extractWithGemini = async (text: string): Promise<{ [key: string]: string } | null> => {
  try {
    const startTime = performance.now()
    const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!GOOGLE_API_KEY) {
      console.warn('Google API key not configured, Gemini disabled')
      return null
    }

    // Optimized prompt for better extraction
    const prompt = `You are an OCR data extraction expert. Extract ONLY the following information from this business card text:
1. FULL NAME - The person's complete name (should have first and last name)
2. COMPANY NAME - Only the company/business name, nothing else
3. PHONE - Any phone number found

IMPORTANT RULES:
- For name: Extract only the actual person's name. If you see location names (like "Gujarat"), ignore them.
- For company: Return only the company name, not titles or descriptions.
- For phone: Return only numeric and + characters.
- If you cannot find something, return empty string.
- Return ONLY valid JSON, no markdown or extra text.

Text:
"""
${text}
"""

Return this exact JSON format:
{"name": "First Last", "company": "Company Name", "phone": "+91XXXXXXXXXX"}`

    // Implement timeout for < 5s latency
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4500) // 4.5s timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
            temperature: 0.2,
            maxOutputTokens: 150,
          },
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn('Gemini API request failed:', response.statusText)
      return null
    }

    const data = await response.json()
    const latency = (performance.now() - startTime).toFixed(2)

    // Parse Gemini response
    let geminiData: { [key: string]: string } = {}
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      try {
        const responseText = data.candidates[0].content.parts[0].text
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          geminiData = JSON.parse(jsonMatch[0])
        }
      } catch (parseError) {
        console.warn('Failed to parse Gemini response:', parseError)
        return null
      }
    }

    console.log(
      '%c🤖 GEMINI 2.5 FLASH EXTRACTION RESULTS',
      'color: #4ECDC4; font-weight: bold; font-size: 14px;',
      {
        results: geminiData,
        isValid: isValidExtraction(geminiData),
        latency: `${latency}ms`,
        timestamp: new Date().toISOString(),
        rawResponse: data.candidates?.[0]?.content?.parts?.[0]?.text,
      }
    )

    return Object.keys(geminiData).length > 0 ? geminiData : null
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (errorMsg.includes('abort')) {
      console.warn('Gemini API request timeout (> 4.5s), using regex fallback')
    } else {
      console.warn('Gemini API error, falling back to regex:', error)
    }
    return null
  }
};

export default function LeadCapturePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("scan");
  const [loading, setLoading] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [eventId, setEventId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    event_id: "",
    full_name: "",
    email: "",
    phone: "",
    company: "",
    designation: "",
    city: "",
    state: "",
    query_type: "",
    notes: "",
    stage: "new",
    priority: 5,
    source: "event_capture",
    imageFile: null as File | null,
    ocrText: "",
    extractionMethod: "none" as "gemini" | "regex" | "none",
  });

  // Get event ID from URL or use default
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get('event');
    if (eventParam) {
      setEventId(eventParam);
      setFormData(prev => ({ ...prev, event_id: eventParam }));
    }
  }, []);

  // Extract structured data from OCR text using regex patterns and Gemini API
  
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (!selectedFile.type.startsWith("image/")) {
        setErrorMessage("Please upload a valid image file format");
        return;
      }

      const maxImageFileSize = 10 * 1024 * 1024;
      if (selectedFile.size > maxImageFileSize) {
        setErrorMessage("Image file size must be 10 MB or less");
        return;
      }

      if (errorMessage) {
        setErrorMessage("");
      }
      setFormData((prev) => ({
        ...prev,
        imageFile: selectedFile,
        ocrText: "", // Reset OCR text when a new file is selected
      }));
    }
  };

  const handleProcessOCR = async () => {
    if (!formData.imageFile) {
      setErrorMessage("Please select an image file first");
      return;
    }

    setOcrProcessing(true);
    setErrorMessage("");

    try {
      console.log("📸 Starting business card OCR processing with optimized extraction...");
      const scanStartTime = performance.now();

      // Use optimized scanBusinessCard from lib/ocr
      // This handles: image preprocessing, Tesseract OCR, sophisticated multi-strategy extraction, and Gemini API
      const cardData = await scanBusinessCard(formData.imageFile);

      const scanEndTime = performance.now();
      const totalLatency = (scanEndTime - scanStartTime).toFixed(2);

      console.log(
        "%c📊 OCR PROCESSING COMPLETE",
        "color: #00C851; font-weight: bold; font-size: 14px;",
        {
          totalLatency: `${totalLatency}ms`,
          extractedData: cardData,
          timestamp: new Date().toISOString(),
        }
      );

      // Pre-fill form with extracted data
      setFormData((prev) => ({
        ...prev,
        full_name: cardData.name || prev.full_name,
        email: cardData.email || prev.email,
        phone: cardData.phone || prev.phone,
        company: cardData.company || prev.company,
      }));

      setErrorMessage(""); // Clear any prior errors
      console.log(`✓ Business card scanned successfully! Latency: ${totalLatency}ms`);
    } catch (err) {
      let message = "Unknown error";
      if (err instanceof Error) message = err.message;
      setErrorMessage(`OCR error: ${message}`);
      console.error("❌ OCR Processing Error:", err);
    } finally {
      setOcrProcessing(false);
    }
  };
      if (err instanceof Error) message = err.message;
      setErrorMessage(`Error: ${message}`);
      setOcrProcessing(false);
    }
  };

  // Get event ID from URL or use default
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get('event');
    if (eventParam) {
      setEventId(eventParam);
      setFormData(prev => ({ ...prev, event_id: eventParam }));
    }
  }, []);

  const handleScanComplete = (ocrData: any) => {
    // Pre-fill form with OCR data
    setFormData((prev) => ({
      ...prev,
      full_name: ocrData.full_name || prev.full_name,
      email: ocrData.email || prev.email,
      phone: ocrData.phone || prev.phone,
      company: ocrData.company || prev.company,
      designation: ocrData.designation || prev.designation,
      city: ocrData.city || prev.city,
      state: ocrData.state || prev.state,
    }));

    // Automatically switch to manual tab to show pre-filled form
    setActiveTab("manual");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      if (!formData.event_id.trim()) {
        setErrorMessage("Event ID is required to submit this form.");
        return;
      }

      const nameError = validateRequiredText("Full name", formData.full_name);
      if (nameError) {
        setErrorMessage(nameError);
        return;
      }

      if (!isValidEmail(formData.email)) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }

      if (!isValidPhone(formData.phone)) {
        setErrorMessage("Please enter a valid phone number.");
        return;
      }

      const companyError = validateMaxLength("Company", formData.company, 120);
      if (companyError) {
        setErrorMessage(companyError);
        return;
      }

      const designationError = validateMaxLength("Designation", formData.designation, 100);
      if (designationError) {
        setErrorMessage(designationError);
        return;
      }

      const cityError = validateMaxLength("City", formData.city, 100);
      if (cityError) {
        setErrorMessage(cityError);
        return;
      }

      const stateError = validateMaxLength("State", formData.state, 100);
      if (stateError) {
        setErrorMessage(stateError);
        return;
      }

      const notesError = validateMaxLength("Additional notes", formData.notes, 1000);
      if (notesError) {
        setErrorMessage(notesError);
        return;
      }

      setLoading(true);

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        // Reset form after 2 seconds
        setTimeout(() => {
          setFormData({
            event_id: eventId,
            full_name: "",
            email: "",
            phone: "",
            company: "",
            designation: "",
            city: "",
            state: "",
            query_type: "",
            notes: "",
            stage: "new",
            priority: 5,
            source: "event_capture",
            imageFile: null,
            ocrText: "",
            extractionMethod: "none",
          });
          setSuccess(false);
          setActiveTab("scan");
        }, 2000);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || "Failed to submit information");
      }
    } catch (error) {
      console.error("Error submitting lead:", error);
      setErrorMessage("Failed to submit information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-2xl">
          <CardContent className="pt-16 pb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              Thank You!
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Your information has been submitted successfully. We'll get in touch with you soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                HTT XSpark
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Event Lead Capture
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-2xl border-2">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b">
            <CardTitle className="text-2xl">Share Your Details</CardTitle>
            <CardDescription className="text-base">
              Scan your business card or manually enter your information
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 h-12 mb-6">
                <TabsTrigger value="scan" className="gap-2 text-base">
                  <Camera className="w-5 h-5" />
                  Scan Business Card
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2 text-base">
                  <User className="w-5 h-5" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan">
                <CardScanner onScanComplete={handleScanComplete} />
              </TabsContent>

              <TabsContent value="manual">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b">
                      Personal Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => {
                            setFormData({ ...formData, full_name: e.target.value });
                            if (errorMessage) setErrorMessage("");
                          }}
                          required
                          placeholder="John Doe"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (errorMessage) setErrorMessage("");
                          }}
                          required
                          placeholder="john@example.com"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData({ ...formData, phone: e.target.value });
                            if (errorMessage) setErrorMessage("");
                          }}
                          required
                          placeholder="+91 98765 43210"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => {
                            setFormData({ ...formData, company: e.target.value });
                            if (errorMessage) setErrorMessage("");
                          }}
                          placeholder="Your Company Name"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input
                          id="designation"
                          value={formData.designation}
                          onChange={(e) => {
                            setFormData({ ...formData, designation: e.target.value });
                            if (errorMessage) setErrorMessage("");
                          }}
                          placeholder="Manager, Director, etc."
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => {
                            setFormData({ ...formData, city: e.target.value });
                            if (errorMessage) setErrorMessage("");
                          }}
                          placeholder="Mumbai"
                          className="h-11"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Image/Business Card OCR Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b">
                      Scan Image with OCR (Optional)
                    </h3>
                    
                    {/* Image Upload Area */}
                    <div className="mb-4">
                      <Label htmlFor="image-upload" className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4" />
                        Upload Business Card or Document
                      </Label>
                      <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer hover:border-indigo-600 hover:bg-indigo-50 transition bg-indigo-50/30">
                        <div className="text-center">
                          {formData.imageFile ? (
                            <div className="space-y-2">
                              <ImageIcon className="w-8 h-8 mx-auto text-green-600" />
                              <p className="text-sm font-semibold text-green-700">File Selected:</p>
                              <p className="text-sm text-slate-700 break-words max-w-xs">
                                {formData.imageFile.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                ({(formData.imageFile.size / 1024 / 1024).toFixed(2)} MB)
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <ImageIcon className="w-8 h-8 mx-auto text-slate-400" />
                              <p className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</p>
                              <p className="text-xs text-slate-500">JPG, PNG, WEBP or other image formats (max 10 MB)</p>
                            </div>
                          )}
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Process OCR Button */}
                    {formData.imageFile && (
                      <div className="space-y-2 mb-4">
                        <Button
                          type="button"
                          onClick={handleProcessOCR}
                          disabled={ocrProcessing}
                          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-lg"
                        >
                          {ocrProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Processing Image...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="mr-2 h-4 w-4" />
                              Extract Text from Image (OCR)
                            </>
                          )}
                        </Button>
                        {ocrProcessing && (
                          <p className="text-xs text-slate-600 text-center">This may take a few moments for Tesseract processing...</p>
                        )}
                        {formData.imageFile && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFormData((prev) => ({ ...prev, imageFile: null, ocrText: "" }))}
                            disabled={ocrProcessing}
                            className="w-full"
                          >
                            Change File
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Display OCR Text */}
                    {formData.ocrText && (
                      <div className="mt-4 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-indigo-900 flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                            OCR Extraction Complete
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded border border-indigo-100 max-h-40 overflow-y-auto">
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {formData.ocrText}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(formData.ocrText);
                            }}
                            className="flex-1 text-xs"
                          >
                            📋 Copy Text
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData((prev) => ({ ...prev, ocrText: "" }))}
                            className="flex-1 text-xs"
                          >
                            ✕ Clear
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Query Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b">
                      Your Interest
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="query_type">I'm interested in</Label>
                      <Select
                        value={formData.query_type}
                        onValueChange={(value) => {
                          setFormData({ ...formData, query_type: value });
                          if (errorMessage) setErrorMessage("");
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select your area of interest" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investment">Investment Solutions</SelectItem>
                          <SelectItem value="insurance">Insurance Products</SelectItem>
                          <SelectItem value="loan">Loan Services</SelectItem>
                          <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
                          <SelectItem value="wealth">Wealth Management</SelectItem>
                          <SelectItem value="tax">Tax Planning</SelectItem>
                          <SelectItem value="retirement">Retirement Planning</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => {
                          setFormData({ ...formData, notes: e.target.value });
                          if (errorMessage) setErrorMessage("");
                        }}
                        placeholder="Any specific questions or requirements..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  {errorMessage && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Submit Information
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-slate-600 dark:text-slate-400">
                    By submitting, you agree to be contacted by our team regarding your query.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
