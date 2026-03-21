"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Calendar,
    Video,
    PhoneCall,
    User,
    CheckCircle,
    ExternalLink,
    ArrowRight,
    Send,
    Loader2,
} from "lucide-react";
import { sendMeetingWhatsApp } from "@/lib/whatsapp";
import { generateJitsiMeetingLinkWithConfig } from "@/lib/jitsi";

interface Lead {
    id?: string;
    name?: string | null;
    phone: string;
    stage?: string | null;
    meeting_date?: string | null;
    meeting_type?: string | null;
    meeting_link?: string | null;
    meeting_notes?: string | null;
}

interface LeadMeetingTabProps {
    lead: Lead;
    onUpdate: (updates: Partial<Lead>) => void;
}

export default function LeadMeetingTab({ lead, onUpdate }: LeadMeetingTabProps) {
    const [showForm, setShowForm] = useState(false);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

    const handleGenerateJitsiLink = () => {
        const jitsiMeeting = generateJitsiMeetingLinkWithConfig({
            leadName: lead.name || undefined,
            leadPhone: lead.phone,
            meetingDate: lead.meeting_date || undefined,
        });
        
        onUpdate({ meeting_link: jitsiMeeting.link });
    };

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

    const isMeetingRelevant = () => {
        const stage = lead.stage || "met";
        return !["lost", "converted"].includes(stage);
    };

    const handleMarkAsCompleted = () => {
        if (confirm("Mark this meeting as completed?")) {
            onUpdate({ stage: "meeting_completed" });
        }
    };

    const handleRemoveMeeting = () => {
        if (confirm("Remove this meeting schedule?")) {
            onUpdate({
                meeting_date: null,
                meeting_type: null,
                meeting_link: null,
                meeting_notes: null,
            });
        }
    };

    const getMeetingTypeIcon = (type: string | null) => {
        switch (type) {
            case "video":
                return <Video className="w-4 h-4 text-indigo-600" />;
            case "phone":
                return <PhoneCall className="w-4 h-4 text-indigo-600" />;
            case "in_person":
                return <User className="w-4 h-4 text-indigo-600" />;
            default:
                return <Calendar className="w-4 h-4 text-indigo-600" />;
        }
    };

    if (!isMeetingRelevant()) {
        return (
            <div className="p-8 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center">
                <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                    Meeting scheduling not applicable for leads in{" "}
                    <strong className="text-slate-900 dark:text-slate-100">
                        {(lead.stage || "met").replace("_", " ").toUpperCase()}
                    </strong>{" "}
                    stage.
                </p>
                <p className="text-sm text-slate-500 mt-2">
                    Meetings are typically scheduled for active leads still in the pipeline.
                </p>
            </div>
        );
    }

    // Show meeting details if scheduled and form is hidden
    if (lead.meeting_date && !showForm) {
        return (
            <div className="space-y-6">
                {/* Meeting Details Display */}
                <div className="p-6 bg-linear-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-l-4 border-indigo-500 rounded-lg shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                            <Calendar className="w-7 h-7 text-indigo-600 shrink-0 mt-1" />
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="font-bold text-indigo-900 dark:text-indigo-100 text-xl mb-1">
                                        Meeting Scheduled
                                    </p>
                                    <p className="text-base text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(lead.meeting_date)}
                                    </p>
                                </div>

                                {/* Meeting Type */}
                                {lead.meeting_type && (
                                    <div className="flex items-center gap-2">
                                        {getMeetingTypeIcon(lead.meeting_type)}
                                        <Badge variant="outline" className="bg-white dark:bg-slate-800">
                                            {lead.meeting_type.replace("_", " ").toUpperCase()}
                                        </Badge>
                                    </div>
                                )}

                                {/* Meeting Link */}
                                {lead.meeting_link && (
                                    <a
                                        href={lead.meeting_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Join Meeting
                                    </a>
                                )}

                                {/* Meeting Notes/Agenda */}
                                {lead.meeting_notes && (
                                    <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg border border-indigo-200 dark:border-indigo-700">
                                        <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                                            Meeting Agenda:
                                        </p>
                                        <p className="text-sm text-indigo-700 dark:text-indigo-300 whitespace-pre-line leading-relaxed">
                                            {lead.meeting_notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowForm(true)}
                                className="text-indigo-700 hover:text-indigo-900 border-indigo-300 hover:border-indigo-500"
                            >
                                Edit
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleRemoveMeeting}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Action: Mark as Completed */}
                {lead.stage === "meeting_scheduled" && (
                    <div className="p-5 bg-cyan-50 dark:bg-cyan-900/20 border-2 border-cyan-200 dark:border-cyan-700 rounded-lg">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <ArrowRight className="w-6 h-6 text-cyan-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-cyan-900 dark:text-cyan-100 text-lg">
                                        Meeting Completed?
                                    </p>
                                    <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-1">
                                        After the meeting is done, mark it as completed. You'll then be asked to specify if the lead was converted or not converted.
                                    </p>
                                    <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-2 font-medium">
                                        💡 This ensures every lead goes through: Met → Follow-up → Engaged → Meeting → Conversion Outcome
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="lg"
                                onClick={handleMarkAsCompleted}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 shrink-0"
                            >
                                Mark as Completed
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Show the form (either initial or edit mode)
    if (showForm || !lead.meeting_date) {
        return (
            <div className="space-y-6">
                {!lead.meeting_date && !showForm && (
                    <div className="text-center py-12 space-y-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                            <Calendar className="w-10 h-10 text-indigo-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                Ready to Schedule a Meeting?
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                                Set up a video call, phone call, or in-person meeting with this lead.
                            </p>
                        </div>
                        <Button
                            type="button"
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-6 text-lg h-auto"
                            onClick={() => setShowForm(true)}
                        >
                            <Calendar className="w-6 h-6 mr-3" />
                            Schedule Meeting
                        </Button>
                    </div>
                )}

                {showForm && (
                    <div className="space-y-5 bg-white dark:bg-slate-900 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                Schedule Meeting
                            </h3>
                            {lead.meeting_date && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>

                        {/* Meeting Type */}
                        <div className="space-y-2">
                            <Label htmlFor="meeting_type" className="text-sm font-medium">
                                Meeting Type *
                            </Label>
                            <Select
                                value={lead.meeting_type || ""}
                                onValueChange={(value) => onUpdate({ meeting_type: value })}
                            >
                                <SelectTrigger id="meeting_type">
                                    <SelectValue placeholder="Select meeting type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="video">
                                        <div className="flex items-center gap-2">
                                            <Video className="w-4 h-4" />
                                            Video Call
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="phone">
                                        <div className="flex items-center gap-2">
                                            <PhoneCall className="w-4 h-4" />
                                            Phone Call
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="in_person">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            In-Person
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Meeting Date/Time */}
                        <div className="space-y-2">
                            <Label htmlFor="meeting_date" className="text-sm font-medium">
                                Date & Time *
                            </Label>
                            <Input
                                id="meeting_date"
                                type="datetime-local"
                                value={
                                    lead.meeting_date
                                        ? new Date(lead.meeting_date).toISOString().slice(0, 16)
                                        : ""
                                }
                                onChange={(e) => {
                                    if (e.target.value) {
                                        onUpdate({
                                            meeting_date: new Date(e.target.value).toISOString(),
                                        });
                                    } else {
                                        onUpdate({ meeting_date: null });
                                    }
                                }}
                                className="text-base"
                            />
                        </div>

                        {/* Video Link (conditional) */}
                        {lead.meeting_type === "video" && (
                            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                <Label
                                    htmlFor="meeting_link"
                                    className="text-sm font-medium flex items-center gap-2"
                                >
                                    <Video className="w-4 h-4 text-blue-600" />
                                    Video Meeting Link
                                </Label>
                                
                                <div className="flex gap-2">
                                    <Input
                                        id="meeting_link"
                                        type="url"
                                        value={lead.meeting_link || ""}
                                        onChange={(e) => onUpdate({ meeting_link: e.target.value })}
                                        placeholder="https://meet.jit.si/xspark-meeting-..."
                                        className="bg-white dark:bg-slate-900 flex-1"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleGenerateJitsiLink}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 whitespace-nowrap"
                                        title="Generate Jitsi Meet link"
                                    >
                                        <Video className="w-4 h-4 mr-2" />
                                        Auto Generate
                                    </Button>
                                </div>
                                
                                <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
                                    <div className="flex-1">
                                        <p className="font-medium mb-1">💡 Quick Options:</p>
                                        <ul className="list-disc list-inside space-y-0.5 ml-2">
                                            <li>Click "Auto Generate" for instant Jitsi Meet link (free, no signup)</li>
                                            <li>Or paste your own Google Meet, Zoom, or MS Teams link</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Meeting Agenda */}
                        <div className="space-y-2">
                            <Label htmlFor="meeting_notes" className="text-sm font-medium">
                                Meeting Agenda & Preparation Notes
                            </Label>
                            <Textarea
                                id="meeting_notes"
                                value={lead.meeting_notes || ""}
                                onChange={(e) => onUpdate({ meeting_notes: e.target.value })}
                                rows={5}
                                placeholder="• Topics to discuss&#10;• Documents to review&#10;• Questions to address&#10;• Expected outcomes"
                                className="resize-none"
                            />
                        </div>

                        {/* Validation Warning */}
                        {(!lead.meeting_type || !lead.meeting_date) && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    ⚠️ Please select a <strong>meeting type</strong> and{" "}
                                    <strong>date/time</strong> to schedule the meeting.
                                </p>
                            </div>
                        )}

                        {/* Stage Update Notice */}
                        {lead.meeting_date &&
                            lead.meeting_type &&
                            lead.stage &&
                            ["met", "follow_up", "engaged"].includes(lead.stage) && (
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                                    <p className="text-sm text-indigo-800 dark:text-indigo-200">
                                        ✅ Stage will be updated to <strong>Meeting Scheduled</strong>
                                    </p>
                                </div>
                            )}

                        {/* Done Button */}
                        {lead.meeting_date && lead.meeting_type && (
                            <div className="space-y-3">
                                {/* WhatsApp Notification Option */}
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <Send className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-1">
                                                Send WhatsApp Invitation
                                            </p>
                                            <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                                {lead.name || 'The lead'} will receive a WhatsApp message with the meeting details{lead.meeting_link ? ' and link' : ''} to: <strong>{lead.phone}</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button
                                        type="button"
                                        size="lg"
                                        variant="outline"
                                        className="px-8"
                                        onClick={() => {
                                            if (
                                                lead.stage &&
                                                ["met", "follow_up", "engaged"].includes(lead.stage)
                                            ) {
                                                onUpdate({ stage: "meeting_scheduled" });
                                            }
                                            setShowForm(false);
                                        }}
                                        disabled={sendingWhatsApp}
                                    >
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        Save Only
                                    </Button>
                                    <Button
                                        type="button"
                                        size="lg"
                                        className="bg-indigo-600 hover:bg-indigo-700 px-8"
                                        onClick={async () => {
                                            setSendingWhatsApp(true);
                                            try {
                                                // Send WhatsApp notification
                                                const sent = await sendMeetingWhatsApp({
                                                    leadName: lead.name || 'Valued Customer',
                                                    leadPhone: lead.phone,
                                                    meetingDate: lead.meeting_date!,
                                                    meetingLink: lead.meeting_link || undefined,
                                                    meetingType: lead.meeting_type || undefined,
                                                    meetingNotes: lead.meeting_notes || undefined,
                                                });

                                                if (sent) {
                                                    console.log('✅ WhatsApp invitation sent successfully');
                                                } else {
                                                    console.warn('⚠️ WhatsApp invitation failed to send');
                                                }
                                            } catch (error) {
                                                console.error('❌ Error sending WhatsApp:', error);
                                            } finally {
                                                // Update stage and close form regardless of WhatsApp status
                                                if (
                                                    lead.stage &&
                                                    ["met", "follow_up", "engaged"].includes(lead.stage)
                                                ) {
                                                    onUpdate({ stage: "meeting_scheduled" });
                                                }
                                                setSendingWhatsApp(false);
                                                setShowForm(false);
                                            }
                                        }}
                                        disabled={sendingWhatsApp}
                                    >
                                        {sendingWhatsApp ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Sending WhatsApp...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5 mr-2" />
                                                Save & Send WhatsApp
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return null;
}
