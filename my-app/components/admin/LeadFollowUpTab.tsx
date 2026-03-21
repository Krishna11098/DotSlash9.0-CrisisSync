"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, Calendar, ArrowRight, Send, Loader2 } from "lucide-react";
import { sendFollowUpWhatsApp } from "@/lib/whatsapp";

interface Lead {
    id?: string;
    name?: string | null;
    phone: string;
    company?: string | null;
    stage?: string | null;
    follow_up_date?: string | null;
    follow_up_notes?: string | null;
}

interface LeadFollowUpTabProps {
    lead: Lead;
    onUpdate: (updates: Partial<Lead>) => void;
}

export default function LeadFollowUpTab({ lead, onUpdate }: LeadFollowUpTabProps) {
    const [showForm, setShowForm] = useState(false);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

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

    const addDays = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
    };

    const isFollowUpNeeded = () => {
        const stage = lead.stage || "met";
        return ["met", "follow_up", "engaged"].includes(stage);
    };

    const handleMarkAsEngaged = () => {
        if (confirm("Mark this follow-up as completed and move lead to Engaged stage?")) {
            onUpdate({ stage: "engaged" });
        }
    };

    const handleRemoveFollowUp = () => {
        if (confirm("Remove this follow-up schedule?")) {
            onUpdate({
                follow_up_date: null,
                follow_up_notes: null,
            });
        }
    };

    if (!isFollowUpNeeded()) {
        return (
            <div className="p-8 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center">
                <Clock className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                    Follow-up not needed for leads in{" "}
                    <strong className="text-slate-900 dark:text-slate-100">
                        {(lead.stage || "met").replace("_", " ").toUpperCase()}
                    </strong>{" "}
                    stage.
                </p>
                <p className="text-sm text-slate-500 mt-2">
                    This stage doesn't typically require follow-up actions.
                </p>
            </div>
        );
    }

    // Show follow-up details if scheduled and form is hidden
    if (lead.follow_up_date && !showForm) {
        return (
            <div className="space-y-6">
                {/* Follow-up Details Display */}
                <div className="p-6 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-500 rounded-lg shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                            <CheckCircle className="w-7 h-7 text-green-600 shrink-0 mt-1" />
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="font-bold text-green-900 dark:text-green-100 text-xl mb-1">
                                        Follow-up Scheduled
                                    </p>
                                    <p className="text-base text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(lead.follow_up_date)}
                                    </p>
                                </div>

                                {lead.follow_up_notes && (
                                    <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg border border-green-200 dark:border-green-700">
                                        <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2">
                                            Discussion Points:
                                        </p>
                                        <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-line leading-relaxed">
                                            {lead.follow_up_notes}
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
                                className="text-green-700 hover:text-green-900 border-green-300 hover:border-green-500"
                            >
                                Edit
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleRemoveFollowUp}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Action: Mark as Engaged */}
                {lead.stage === "follow_up" && (
                    <div className="p-5 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <ArrowRight className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-purple-900 dark:text-purple-100 text-lg">
                                        Follow-up Completed?
                                    </p>
                                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                        If you've successfully connected with this lead, mark them as
                                        Engaged to move forward.
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="lg"
                                onClick={handleMarkAsEngaged}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 shrink-0"
                            >
                                Mark as Engaged
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Show the form (either initial or edit mode)
    if (showForm || !lead.follow_up_date) {
        return (
            <div className="space-y-6">
                {!lead.follow_up_date && !showForm && (
                    <div className="text-center py-12 space-y-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
                            <Clock className="w-10 h-10 text-yellow-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                Schedule a Follow-up
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                                Plan when to reconnect with this lead and what to discuss.
                            </p>
                        </div>
                        <Button
                            type="button"
                            size="lg"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-12 py-6 text-lg h-auto"
                            onClick={() => setShowForm(true)}
                        >
                            <Clock className="w-6 h-6 mr-3" />
                            Schedule Follow-up
                        </Button>
                    </div>
                )}

                {showForm && (
                    <div className="space-y-5 bg-white dark:bg-slate-900 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-yellow-600" />
                                Schedule Follow-up
                            </h3>
                            {lead.follow_up_date && (
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

                        {/* Quick Date Buttons */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Quick Schedule</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onUpdate({ follow_up_date: addDays(1) })}
                                    className="text-sm"
                                >
                                    Tomorrow
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onUpdate({ follow_up_date: addDays(3) })}
                                    className="text-sm"
                                >
                                    In 3 Days
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onUpdate({ follow_up_date: addDays(7) })}
                                    className="text-sm"
                                >
                                    In 1 Week
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onUpdate({ follow_up_date: addDays(14) })}
                                    className="text-sm"
                                >
                                    In 2 Weeks
                                </Button>
                            </div>
                        </div>

                        {/* Custom Date/Time Picker */}
                        <div className="space-y-2">
                            <Label htmlFor="follow_up_date" className="text-sm font-medium">
                                Or Pick Custom Date & Time
                            </Label>
                            <Input
                                id="follow_up_date"
                                type="datetime-local"
                                value={
                                    lead.follow_up_date
                                        ? new Date(lead.follow_up_date).toISOString().slice(0, 16)
                                        : ""
                                }
                                onChange={(e) => {
                                    if (e.target.value) {
                                        onUpdate({
                                            follow_up_date: new Date(e.target.value).toISOString(),
                                        });
                                    } else {
                                        onUpdate({ follow_up_date: null });
                                    }
                                }}
                                className="text-base"
                            />
                        </div>

                        {/* Follow-up Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="follow_up_notes" className="text-sm font-medium">
                                What to Discuss in Follow-up?
                            </Label>
                            <Textarea
                                id="follow_up_notes"
                                value={lead.follow_up_notes || ""}
                                onChange={(e) =>
                                    onUpdate({ follow_up_notes: e.target.value })
                                }
                                rows={5}
                                placeholder="• Topics to discuss&#10;• Questions to ask&#10;• Information to share&#10;• Documents to prepare"
                                className="resize-none"
                            />
                        </div>

                        {/* Stage Update Notice */}
                        {lead.follow_up_date && lead.stage === "met" && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                                <p className="text-sm text-green-800 dark:text-green-200">
                                    ✅ Stage will be updated to <strong>Follow-up</strong>
                                </p>
                            </div>
                        )}

                        {/* Done Button */}
                        {lead.follow_up_date && (
                            <div className="space-y-3">
                                {/* WhatsApp Notification Option */}
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <Send className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                                                Send WhatsApp Notification
                                            </p>
                                            <p className="text-xs text-green-700 dark:text-green-300">
                                                {lead.name || 'The lead'} will receive a WhatsApp message with the follow-up details to: <strong>{lead.phone}</strong>
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
                                            if (lead.stage === "met") {
                                                onUpdate({ stage: "follow_up" });
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
                                        className="bg-green-600 hover:bg-green-700 px-8"
                                        onClick={async () => {
                                            setSendingWhatsApp(true);
                                            try {
                                                // Send WhatsApp notification
                                                const sent = await sendFollowUpWhatsApp({
                                                    leadName: lead.name || 'Valued Customer',
                                                    leadPhone: lead.phone,
                                                    followUpDate: lead.follow_up_date!,
                                                    followUpNotes: lead.follow_up_notes || undefined,
                                                    companyName: lead.company || undefined,
                                                });

                                                if (sent) {
                                                    console.log('✅ WhatsApp notification sent successfully');
                                                } else {
                                                    console.warn('⚠️ WhatsApp notification failed to send');
                                                }
                                            } catch (error) {
                                                console.error('❌ Error sending WhatsApp:', error);
                                            } finally {
                                                // Update stage and close form regardless of WhatsApp status
                                                if (lead.stage === "met") {
                                                    onUpdate({ stage: "follow_up" });
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
