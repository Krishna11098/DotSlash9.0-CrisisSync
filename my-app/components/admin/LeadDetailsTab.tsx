"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, Building2, MessageSquare, TrendingUp, AlertCircle, Sparkles, Loader2, CheckCircle, XCircle } from "lucide-react";
import { generateAISummaryForLead } from "@/lib/admin-api";
import { getAudioBlobByRef } from "@/lib/audio-storage";

interface Lead {
    id?: string;
    local_id?: number;
    lead_number?: number;
    name?: string | null;
    email: string;
    phone: string;
    company?: string | null;
    designation?: string | null;
    stage?: string | null;
    priority?: number | null;
    query_type?: string | null;
    entry_type?: string | null;
    capture_mode?: string | null;
    remark?: string | null;
    audio_file_url?: string | null;
    audio_file_text?: string | null;
    transcribed_text?: string | null;
    ai_summary?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

interface LeadDetailsTabProps {
    lead: Lead;
    onUpdate: (updates: Partial<Lead>) => void;
}

export default function LeadDetailsTab({ lead, onUpdate }: LeadDetailsTabProps) {
    const [generatingAI, setGeneratingAI] = useState(false);
    const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [playableAudioUrl, setPlayableAudioUrl] = useState<string | null>(lead.audio_file_url || null);
    const transcriptionText = lead.audio_file_text || lead.transcribed_text;

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;

        const resolveAudioUrl = async () => {
            const sourceUrl = lead.audio_file_url;

            if (!sourceUrl) {
                if (!cancelled) setPlayableAudioUrl(null);
                return;
            }

            if (!sourceUrl.startsWith("offline-audio://")) {
                if (!cancelled) setPlayableAudioUrl(sourceUrl);
                return;
            }

            const localBlob = await getAudioBlobByRef(sourceUrl);
            if (!localBlob) {
                if (!cancelled) setPlayableAudioUrl(null);
                return;
            }

            objectUrl = URL.createObjectURL(localBlob);
            if (!cancelled) {
                setPlayableAudioUrl(objectUrl);
            }
        };

        resolveAudioUrl().catch(() => {
            if (!cancelled) {
                setPlayableAudioUrl(null);
            }
        });

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [lead.audio_file_url]);

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "Not set";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="space-y-6">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                        id="name"
                        value={lead.name || ""}
                        onChange={(e) => onUpdate({ name: e.target.value })}
                        className="text-base"
                        placeholder="Enter full name"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        value={lead.email}
                        onChange={(e) => onUpdate({ email: e.target.value })}
                        className="text-base"
                        placeholder="email@example.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone
                    </Label>
                    <Input
                        id="phone"
                        type="tel"
                        value={lead.phone}
                        onChange={(e) => onUpdate({ phone: e.target.value })}
                        className="text-base"
                        placeholder="+91 98765 43210"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="company" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Company
                    </Label>
                    <Input
                        id="company"
                        value={lead.company || ""}
                        onChange={(e) => onUpdate({ company: e.target.value })}
                        className="text-base"
                        placeholder="Company name"
                    />
                </div>
            </div>

            {/* Professional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                        id="designation"
                        value={lead.designation || ""}
                        onChange={(e) => onUpdate({ designation: e.target.value })}
                        className="text-base"
                        placeholder="Job title"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="query_type" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Query Type
                    </Label>
                    <Select
                        value={lead.query_type || "general"}
                        onValueChange={(value) => onUpdate({ query_type: value })}
                    >
                        <SelectTrigger id="query_type">
                            <SelectValue placeholder="Select query type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="product">Product Interest</SelectItem>
                            <SelectItem value="service">Service Request</SelectItem>
                            <SelectItem value="pricing">Pricing Information</SelectItem>
                            <SelectItem value="demo">Demo Request</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stage and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="stage">Lead Stage</Label>
                    <Select value={lead.stage || "met"} onValueChange={(value) => onUpdate({ stage: value })}>
                        <SelectTrigger id="stage" className="bg-white">
                            <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="met">Met</SelectItem>
                            <SelectItem value="follow_up">Follow-up</SelectItem>
                            <SelectItem value="engaged">Engaged</SelectItem>
                            <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                            <SelectItem value="meeting_completed">Meeting Completed</SelectItem>
                            <SelectItem value="converted">✓ Converted</SelectItem>
                            <SelectItem value="lost">✗ Rejected/Lost</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="priority" className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Priority (0-10)
                    </Label>
                    <Input
                        id="priority"
                        type="number"
                        min="0"
                        max="10"
                        value={lead.priority || 0}
                        onChange={(e) =>
                            onUpdate({ priority: parseInt(e.target.value) || 0 })
                        }
                        className="text-base"
                    />
                </div>
            </div>

            {/* Query Type Display Badge */}
            {lead.query_type && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Lead Query Type
                            </p>
                            <Badge variant="outline" className="mt-1 bg-white">
                                {lead.query_type.replace("_", " ").toUpperCase()}
                            </Badge>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Summary Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        AI-Generated Summary
                    </Label>
                    <Button
                        type="button"
                        variant={aiStatus === 'success' ? 'default' : aiStatus === 'error' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={async () => {
                            setGeneratingAI(true);
                            setAiStatus('idle');
                            try {
                                console.log('🚀 Starting AI summary generation...');
                                const summary = await generateAISummaryForLead(lead);
                                if (summary) {
                                    console.log('✅ Summary generated, updating lead...');
                                    onUpdate({ ai_summary: summary });
                                    setAiStatus('success');
                                    setTimeout(() => setAiStatus('idle'), 3000);
                                } else {
                                    console.error('❌ No summary returned');
                                    setAiStatus('error');
                                    setTimeout(() => setAiStatus('idle'), 3000);
                                }
                            } catch (error) {
                                console.error('❌ Error generating AI summary:', error);
                                setAiStatus('error');
                                setTimeout(() => setAiStatus('idle'), 3000);
                            } finally {
                                setGeneratingAI(false);
                            }
                        }}
                        disabled={generatingAI}
                        className="gap-2"
                    >
                        {generatingAI ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating with Gemini AI...
                            </>
                        ) : aiStatus === 'success' ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Summary Generated!
                            </>
                        ) : aiStatus === 'error' ? (
                            <>
                                <XCircle className="w-4 h-4" />
                                Generation Failed
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                {lead.ai_summary ? 'Regenerate' : 'Generate'} AI Summary
                            </>
                        )}
                    </Button>
                </div>

                {lead.ai_summary ? (
                    <div className="p-4 bg-linear-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-lg shadow-sm">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {lead.ai_summary}
                        </p>
                    </div>
                ) : (
                    <div className="p-5 bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                        <div className="text-center space-y-2">
                            <Sparkles className="w-10 h-10 mx-auto text-purple-400 dark:text-purple-500" />
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                No AI Summary Yet
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Click "Generate AI Summary" above to create a detailed, AI-powered analysis of this lead using Google Gemini.
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 pt-2">
                                💡 Tip: Check browser console for detailed logs if generation fails.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Audio File and Transcribed Text */}
            {(playableAudioUrl || transcriptionText) && (
                <div className="space-y-4 p-5 bg-linear-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Audio Recording & Transcription</h3>
                        </div>
                    </div>

                    {transcriptionText && (
                        <div className="space-y-2">
                            <Label className="text-indigo-900 dark:text-indigo-200 text-sm font-medium flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                📝 Transcribed Text
                            </Label>
                            <div className="p-4 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded-lg">
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                                    {transcriptionText}
                                </p>
                            </div>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">
                                ℹ️ Automatically transcribed using AI speech recognition
                            </p>
                        </div>
                    )}

                    {playableAudioUrl && (
                        <div className="space-y-2">
                            <Label className="text-indigo-900 dark:text-indigo-200 text-sm font-medium flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                                🎵 Audio Recording
                            </Label>
                            <div className="p-4 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded-lg">
                                <audio controls className="w-full" preload="metadata">
                                    <source src={playableAudioUrl} type="audio/webm" />
                                    <source src={playableAudioUrl} type="audio/mpeg" />
                                    <source src={playableAudioUrl} type="audio/wav" />
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">
                                🎤 Original audio recording from lead capture
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Remarks */}
            <div className="space-y-2">
                <Label htmlFor="remark">Remarks / Notes</Label>
                <Textarea
                    id="remark"
                    value={lead.remark || ""}
                    onChange={(e) => onUpdate({ remark: e.target.value })}
                    rows={4}
                    placeholder="Add any additional notes or remarks about this lead..."
                    className="resize-none"
                />
            </div>

            {/* Audio File */}
            {playableAudioUrl && (
                <div className="space-y-2">
                    <Label>Audio Recording</Label>
                    <audio controls className="w-full">
                        <source src={playableAudioUrl || undefined} />
                        Your browser does not support audio playback.
                    </audio>
                </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div>
                    <span className="font-medium">Entry Type:</span>{" "}
                    <Badge variant="outline" className="ml-2">
                        {lead.entry_type || "N/A"}
                    </Badge>
                </div>
                <div>
                    <span className="font-medium">Capture Mode:</span>{" "}
                    <Badge variant="outline" className="ml-2">
                        {lead.capture_mode || "N/A"}
                    </Badge>
                </div>
                <div>
                    <span className="font-medium">Created:</span> {formatDate(lead.created_at)}
                </div>
                <div>
                    <span className="font-medium">Updated:</span> {formatDate(lead.updated_at)}
                </div>
            </div>
        </div>
    );
}
