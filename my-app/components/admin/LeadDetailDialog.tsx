"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User, Clock, Calendar, Save, X, CheckCircle } from "lucide-react";
import { updateLead } from "@/lib/admin-api";
import LeadDetailsTab from "./LeadDetailsTab";
import LeadFollowUpTab from "./LeadFollowUpTab";
import LeadMeetingTab from "./LeadMeetingTab";

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
    ai_summary?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    follow_up_date?: string | null;
    follow_up_notes?: string | null;
    meeting_date?: string | null;
    meeting_link?: string | null;
    meeting_type?: string | null;
    meeting_notes?: string | null;
    outcome_notes?: string | null;
}

interface LeadDetailDialogProps {
    lead: Lead | null;
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function LeadDetailDialog({
    lead,
    open,
    onClose,
    onUpdate,
}: LeadDetailDialogProps) {
    const [editedLead, setEditedLead] = useState<Lead | null>(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"details" | "followup" | "meeting">("details");

    // Initialize lead state when dialog opens
    useEffect(() => {
        if (lead) {
            setEditedLead({ ...lead });
            setActiveTab("details");
        }
    }, [lead, open]);

    // Handle updates from child tab components
    const handleLeadUpdate = (updates: Partial<Lead>) => {
        const newLead = { ...editedLead!, ...updates };
        setEditedLead(newLead);
    };

    // Save lead changes to database
    const handleSave = async () => {
        if (!editedLead?.id) {
            alert("Cannot update lead without ID");
            return;
        }

        setSaving(true);
        try {
            const result = await updateLead(editedLead.id, {
                name: editedLead.name,
                email: editedLead.email,
                phone: editedLead.phone,
                company: editedLead.company,
                designation: editedLead.designation,
                query_type: editedLead.query_type,
                stage: editedLead.stage,
                priority: editedLead.priority,
                ai_summary: editedLead.ai_summary,
                follow_up_date: editedLead.follow_up_date,
                follow_up_notes: editedLead.follow_up_notes,
                meeting_date: editedLead.meeting_date,
                meeting_link: editedLead.meeting_link,
                meeting_type: editedLead.meeting_type,
                meeting_notes: editedLead.meeting_notes,
                outcome_notes: editedLead.outcome_notes,
            });

            if (result) {
                onUpdate();
                onClose();
            } else {
                alert("Failed to update lead");
            }
        } catch (error) {
            console.error("Error updating lead:", error);
            alert("Error updating lead");
        } finally {
            setSaving(false);
        }
    };

    // Handle stage change directly
    const handleStageChange = (newStage: string) => {
        setEditedLead({ ...editedLead!, stage: newStage });
    };

    // Helper functions for UI styling
    const getStageColor = (stage: string) => {
        const colors: Record<string, string> = {
            met: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
            follow_up: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
            engaged: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
            meeting_scheduled: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
            meeting_completed: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
            converted: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
            lost: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
        };
        return colors[stage] || "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    };

    const getPriorityLabel = (priority: number) => {
        if (priority >= 8) return { label: "Hot", color: "text-red-600 font-bold" };
        if (priority >= 5) return { label: "Warm", color: "text-yellow-600 font-semibold" };
        return { label: "Cold", color: "text-blue-600" };
    };

    const isFollowUpNeeded = () => {
        const stage = editedLead?.stage || "met";
        return ["met", "follow_up", "engaged"].includes(stage);
    };

    if (!lead || !editedLead) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto"
                    style={{ width: "70vw", maxWidth: "70vw" }}
                >
                {/* Header */}
                <DialogHeader className="space-y-3 pb-4 border-b">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-bold">
                                {editedLead.name || "Lead Details"}
                            </DialogTitle>
                            <DialogDescription className="text-base">
                                Lead #{lead.lead_number || lead.local_id} • {editedLead.email}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Stage Dropdown */}
                            <Select value={editedLead.stage || "met"} onValueChange={handleStageChange}>
                                <SelectTrigger className={`${getStageColor(editedLead.stage || "met")} w-auto px-3 py-1 text-xs font-semibold border cursor-pointer h-8`}>
                                    <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="met">Met</SelectItem>
                                    <SelectItem value="follow_up">Follow-up</SelectItem>
                                    <SelectItem value="engaged">Engaged</SelectItem>
                                    <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                                    <SelectItem value="meeting_completed">Meeting Completed</SelectItem>
                                    <SelectItem value="converted">✓ Converted</SelectItem>
                                    <SelectItem value="lost">✗ Rejected/Lost</SelectItem>
                                </SelectContent>
                            </Select>
                            <Badge
                                variant="outline"
                                className={`${
                                    getPriorityLabel(editedLead.priority || 0).color
                                } px-3 py-1 text-xs font-semibold`}
                            >
                                {getPriorityLabel(editedLead.priority || 0).label} Lead
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                {/* Tab Navigation */}
                <div className="flex gap-1 border-b pb-0 mb-6 -mx-6 px-6">
                    <Button
                        variant={activeTab === "details" ? "default" : "ghost"}
                        size="lg"
                        className={`flex-1 rounded-b-none border-b-2 ${
                            activeTab === "details"
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-transparent hover:bg-slate-50"
                        }`}
                        onClick={() => setActiveTab("details")}
                    >
                        <User className="w-5 h-5 mr-2" />
                        <span className="font-semibold">Details</span>
                    </Button>
                    <Button
                        variant={activeTab === "followup" ? "default" : "ghost"}
                        size="lg"
                        className={`flex-1 rounded-b-none border-b-2 ${
                            activeTab === "followup"
                                ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                                : "border-transparent hover:bg-slate-50"
                        }`}
                        onClick={() => setActiveTab("followup")}
                    >
                        <Clock className="w-5 h-5 mr-2" />
                        <span className="font-semibold">Follow-up</span>
                        {isFollowUpNeeded() && !editedLead.follow_up_date && (
                            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-xs">
                                !
                            </span>
                        )}
                    </Button>
                    <Button
                        variant={activeTab === "meeting" ? "default" : "ghost"}
                        size="lg"
                        className={`flex-1 rounded-b-none border-b-2 ${
                            activeTab === "meeting"
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-transparent hover:bg-slate-50"
                        }`}
                        onClick={() => setActiveTab("meeting")}
                    >
                        <Calendar className="w-5 h-5 mr-2" />
                        <span className="font-semibold">Meeting</span>
                        {editedLead.meeting_date && (
                            <CheckCircle className="w-4 h-4 ml-2 text-green-600" />
                        )}
                    </Button>
                </div>

                {/* Tab Content */}
                {activeTab === "details" && (
                    <LeadDetailsTab lead={editedLead} onUpdate={handleLeadUpdate} />
                )}

                {activeTab === "followup" && (
                    <LeadFollowUpTab lead={editedLead} onUpdate={handleLeadUpdate} />
                )}

                {activeTab === "meeting" && (
                    <LeadMeetingTab lead={editedLead} onUpdate={handleLeadUpdate} />
                )}

                {/* Footer Actions */}
                <div className="flex justify-between items-center gap-4 pt-6 mt-6 border-t-2">
                    <p className="text-sm text-slate-500">
                        Changes will be saved to the database
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={saving}
                            size="lg"
                            className="min-w-30"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="lg"
                            className="min-w-40 bg-blue-600 hover:bg-blue-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}

