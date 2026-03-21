"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface ExtractedData {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  designation?: string | null;
  city?: string | null;
  state?: string | null;
  confidence?: string;
  raw_text?: string[];
}

interface CardScannerProps {
  onScanComplete: (data: ExtractedData) => void;
  onClose?: () => void;
}

export default function CardScanner({ onScanComplete, onClose }: CardScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagesProcessed, setImagesProcessed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validate max 2 files
    if (selectedFiles.length > 2) {
      setError('Maximum 2 images allowed (e.g., front and back of card)');
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Each image must be less than 10MB');
        return;
      }
      validFiles.push(file);
    }

    // Reset states
    setError(null);
    setResult(null);
    setFiles(validFiles);

    // Show previews for all files
    const previewPromises = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    const previewUrls = await Promise.all(previewPromises);
    setPreviews(previewUrls);

    // Upload and scan
    await scanCards(validFiles);
  };

  const scanCards = async (filesToScan: File[]) => {
    setScanning(true);
    setError(null);
    setImagesProcessed(0);

    try {
      const formData = new FormData();
      
      // Use correct field name based on endpoint
      if (filesToScan.length > 1) {
        filesToScan.forEach(file => {
          formData.append('files', file);
        });
      } else {
        formData.append('file', filesToScan[0]);
      }

      console.log(`📤 Uploading ${filesToScan.length} image(s) for OCR...`);

      // Use multi-image endpoint if more than 1 file, otherwise single
      const endpoint = filesToScan.length > 1 ? '/api/ocr/scan-multiple' : '/api/ocr/scan';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OCR processing failed');
      }

      if (data.success) {
        console.log('✅ OCR successful:', data.data);
        setResult(data.data);
        setImagesProcessed(data.images_processed || 1);
      } else {
        throw new Error(data.error || 'OCR failed');
      }
    } catch (err) {
      console.error('❌ OCR Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan card');
    } finally {
      setScanning(false);
    }
  };

  const handleUseScan = () => {
    if (result) {
      onScanComplete(result);
      if (onClose) onClose();
    }
  };

  const handleReset = () => {
    setPreviews([]);
    setFiles([]);
    setResult(null);
    setError(null);
    setImagesProcessed(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Scan Business Card</CardTitle>
            <CardDescription className="mt-2">
              Upload 1-2 images of business card (front and/or back) for faster, more accurate extraction.
              <span className="block mt-1 text-xs">✨ Multi-image support with intelligent merging • Latency optimized</span>
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Section */}
        {previews.length === 0 && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              multiple
              className="hidden"
              id="card-upload"
            />

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="h-32 flex-col gap-2"
                variant="outline"
              >
                <Camera className="h-8 w-8" />
                <span>Take Photo</span>
              </Button>

              <Button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="h-32 flex-col gap-2"
                variant="outline"
              >
                <Upload className="h-8 w-8" />
                <span>Upload Image</span>
              </Button>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-400 text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-semibold text-blue-700 dark:text-blue-300">📸 Multi-Image Support</p>
              <ul className="mt-2 space-y-1 text-xs text-blue-600 dark:text-blue-400">
                <li>✓ Select 1-2 photos (front and/or back)</li>
                <li>✓ Faster and more accurate extraction</li>
                <li>✓ Works with low-quality images</li>
                <li>✓ Data auto-merged for best results</li>
              </ul>
            </div>
          </div>
        )}

        {/* Preview and Result Section */}
        {previews.length > 0 && (
          <div className="space-y-4">
            {/* Image Previews with Selection Option */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  📸 Selected Images: {previews.length}/2
                </h4>
                {!scanning && !result && previews.length < 2 && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      + Add Another
                    </Button>
                  </div>
                )}
              </div>

              {/* Grid Layout for Previews */}
              <div className={`grid gap-3 ${previews.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                {previews.map((preview, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-slate-100 dark:bg-slate-800 relative">
                      <img
                        src={preview}
                        alt={`Business card ${index + 1}`}
                        className="w-full h-auto max-h-64 object-contain"
                      />
                    </div>

                    {/* Remove Button */}
                    {!scanning && !result && (
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md hover:shadow-lg transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Image Label */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent text-white text-xs font-medium">
                      {index === 0 ? '🃏 Front' : '🃏 Back/Detail'} {index === 0 && previews.length === 2 ? ' & Back' : ''}
                    </div>

                    {/* Processing Indicator */}
                    {scanning && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                          <p className="text-xs text-blue-700 font-medium">Processing...</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Image Count Info */}
              {previews.length === 2 && (
                <div className="text-xs text-slate-600 dark:text-slate-400 p-2 bg-green-50 dark:bg-green-900/20 rounded text-center">
                  ✅ Both front and back detected - will merge data for better accuracy
                </div>
              )}
            </div>

            {/* Scanning Status */}
            {scanning && (
              <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-blue-700 dark:text-blue-300 font-medium text-sm">
                    🔍 Processing {previews.length} image{previews.length > 1 ? 's' : ''}...
                  </p>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                    Optimizing quality • Extracting text • Analyzing data (est. 3-4 seconds)
                  </p>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-700 dark:text-red-300 font-medium text-sm">
                    ⚠️ Scan Failed
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Success Result */}
            {result && !scanning && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-green-700 dark:text-green-300 font-medium text-sm">
                      ✅ Scan Complete!
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Successfully extracted data from {imagesProcessed} image{imagesProcessed > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Extracted Data Display */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-4 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    📋 Extracted Information:
                  </h4>

                  {/* Data Grid */}
                  <div className="space-y-3">
                    {result.full_name && (
                      <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">👤 Name</span>
                        <p className="text-slate-900 dark:text-slate-100 font-semibold text-right flex-1">
                          {result.full_name}
                        </p>
                      </div>
                    )}
                    {result.email && (
                      <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">📧 Email</span>
                        <a href={`mailto:${result.email}`} className="text-blue-600 dark:text-blue-400 hover:underline text-right flex-1">
                          {result.email}
                        </a>
                      </div>
                    )}
                    {result.phone && (
                      <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">📱 Phone</span>
                        <a href={`tel:${result.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline text-right flex-1">
                          {result.phone}
                        </a>
                      </div>
                    )}
                    {result.company && (
                      <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">🏢 Company</span>
                        <p className="text-slate-900 dark:text-slate-100 text-right flex-1">
                          {result.company}
                        </p>
                      </div>
                    )}
                    {result.designation && (
                      <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">💼 Designation</span>
                        <p className="text-slate-900 dark:text-slate-100 text-right flex-1">
                          {result.designation}
                        </p>
                      </div>
                    )}
                    {result.city && (
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">📍 City</span>
                        <p className="text-slate-900 dark:text-slate-100 text-right flex-1">
                          {result.city}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Raw Text (for debugging) */}
                  {result.raw_text && result.raw_text.length > 0 && (
                    <details className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-300">
                        🔍 View raw OCR text ({result.raw_text.length} lines)
                      </summary>
                      <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 space-y-1 max-h-40 overflow-y-auto bg-slate-900/5 dark:bg-slate-950/30 p-3 rounded">
                        {result.raw_text.map((line, idx) => (
                          <div key={idx} className="font-mono">• {line}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                🔄 Scan Another Card
              </Button>
              {result && (
                <Button
                  onClick={handleUseScan}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  ✨ Use This Data
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
