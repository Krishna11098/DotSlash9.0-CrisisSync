"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Users,
    Search,
    Mail,
    Phone,
    Building2,
    TrendingUp,
    Calendar,
    Clock,
    Eye,
    ArrowUpDown,
    Filter,
} from "lucide-react";
import { fetchAllLeads, Lead as AdminLead } from "@/lib/admin-api";
import LeadDetailDialog from "./LeadDetailDialog";

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
    audio_file_url?: string | null;
    audio_file_text?: string | null;
    created_at?: string | null;
    follow_up_date?: string | null;
    follow_up_notes?: string | null;
    meeting_date?: string | null;
    meeting_link?: string | null;
    meeting_type?: string | null;
    meeting_notes?: string | null;
    outcome_notes?: string | null;
}

type PriorityFilter = "all" | "hot" | "warm" | "cold";
type StageFilter = "all" | "met" | "follow_up" | "engaged" | "meeting_scheduled" | "meeting_completed" | "converted" | "lost";

export default function LeadsTab() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
    const [stageFilter, setStageFilter] = useState<StageFilter>("all");
    const [sortBy, setSortBy] = useState<"priority" | "created" | "follow_up">("priority");
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const fetchLeads = async () => {
        try {
            const data = await fetchAllLeads();
            setLeads(data);
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const getStageColor = (stage: string) => {
        switch (stage) {
            case "met":
                return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
            case "follow_up":
                return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
            case "engaged":
                return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
            case "meeting_scheduled":
                return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
            case "meeting_completed":
                return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20";
            case "converted":
                return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
            case "lost":
                return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
            default:
                return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
        }
    };

    const getPriorityColor = (priority: number) => {
        if (priority >= 8) return "text-red-600 dark:text-red-400 font-bold";
        if (priority >= 5) return "text-yellow-600 dark:text-yellow-400 font-semibold";
        return "text-green-600 dark:text-green-400";
    };

    const getPriorityCategory = (priority: number): PriorityFilter => {
        if (priority >= 8) return "hot";
        if (priority >= 5) return "warm";
        return "cold";
    };

    const filteredLeads = leads
        .filter((lead) => {
            // Search filter
            const searchMatch =
                (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.phone.includes(searchTerm) ||
                (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));

            if (!searchMatch) return false;

            // Priority filter
            if (priorityFilter !== "all") {
                const category = getPriorityCategory(lead.priority || 0);
                if (category !== priorityFilter) return false;
            }

            // Stage filter
            if (stageFilter !== "all" && lead.stage !== stageFilter) {
                return false;
            }

            return true;
        })
        .sort((a, b) => {
            if (sortBy === "priority") {
                return (b.priority || 0) - (a.priority || 0);
            } else if (sortBy === "follow_up") {
                const aDate = a.follow_up_date ? new Date(a.follow_up_date).getTime() : 0;
                const bDate = b.follow_up_date ? new Date(b.follow_up_date).getTime() : 0;
                return aDate - bDate;
            } else {
                const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
                const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
                return bDate - aDate;
            }
        });

    const handleLeadClick = (lead: Lead) => {
        setSelectedLead(lead);
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setSelectedLead(null);
    };

    const handleLeadUpdate = () => {
        fetchLeads();
    };

    const needsFollowUpCount = leads.filter((lead) =>
        ["met", "follow_up", "engaged"].includes(lead.stage || "met")
    ).length;

    const upcomingMeetingsCount = leads.filter((lead) => lead.meeting_date).length;

    return (
        <>
            {/* Lead Detail Dialog */}
            <LeadDetailDialog
                lead={selectedLead}
                open={dialogOpen}
                onClose={handleDialogClose}
                onUpdate={handleLeadUpdate}
            />

            {/* Header with Quick Stats */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Leads Management
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Track and manage leads with priority-based workflow
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                            Needs Follow-up
                        </div>
                        <div className="text-2xl font-bold text-yellow-600">
                            {needsFollowUpCount}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                            Meetings Scheduled
                        </div>
                        <div className="text-2xl font-bold text-indigo-600">
                            {upcomingMeetingsCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-slate-300 focus:border-blue-500"
                    />
                </div>

                <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                    <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="hot">🔥 Hot (8-10)</SelectItem>
                        <SelectItem value="warm">⚡ Warm (5-7)</SelectItem>
                        <SelectItem value="cold">❄️ Cold (0-4)</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={stageFilter} onValueChange={(value: any) => setStageFilter(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Stage" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        <SelectItem value="met">Met</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="engaged">Engaged</SelectItem>
                        <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                        <SelectItem value="meeting_completed">Meeting Completed</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger>
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="created">Recently Created</SelectItem>
                        <SelectItem value="follow_up">Follow-up Date</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Active Filters Display */}
            {(priorityFilter !== "all" || stageFilter !== "all" || searchTerm) && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-600">Active filters:</span>
                    {priorityFilter !== "all" && (
                        <Badge variant="outline" className="capitalize">
                            Priority: {priorityFilter}
                        </Badge>
                    )}
                    {stageFilter !== "all" && (
                        <Badge variant="outline" className="capitalize">
                            Stage: {stageFilter.replace("_", " ")}
                        </Badge>
                    )}
                    {searchTerm && (
                        <Badge variant="outline">Search: {searchTerm}</Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setPriorityFilter("all");
                            setStageFilter("all");
                            setSearchTerm("");
                        }}
                    >
                        Clear All
                    </Button>
                </div>
            )}

            <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        All Leads
                    </CardTitle>
                    <CardDescription>
                        Showing {filteredLeads.length} of {leads.length} leads
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">
                                {searchTerm || priorityFilter !== "all" || stageFilter !== "all"
                                    ? "No leads found matching your filters"
                                    : "No leads found"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                        <TableHead className="font-semibold">Lead #</TableHead>
                                        <TableHead className="font-semibold">Contact Info</TableHead>
                                        <TableHead className="font-semibold">Company</TableHead>
                                        <TableHead className="font-semibold">Query Type</TableHead>
                                        <TableHead className="font-semibold">Stage</TableHead>
                                        <TableHead className="font-semibold">Priority</TableHead>
                                        <TableHead className="font-semibold">Next Action</TableHead>
                                        <TableHead className="font-semibold text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeads.map((lead, index) => (
                                        <TableRow
                                            key={
                                                lead.local_id
                                                    ? `local-${lead.local_id}`
                                                    : lead.id
                                                        ? `remote-${lead.id}-${index}`
                                                        : `lead-row-${index}`
                                            }
                                            className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                        >
                                            <TableCell className="font-mono text-sm font-medium">
                                                #{lead.lead_number ?? "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="font-medium text-slate-900 dark:text-slate-100">
                                                        {lead.name || "-"}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Mail className="w-3 h-3" />
                                                        {lead.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Phone className="w-3 h-3" />
                                                        {lead.phone}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {lead.company ? (
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-slate-400" />
                                                        <div>
                                                            <div className="text-sm font-medium">
                                                                {lead.company}
                                                            </div>
                                                            {lead.designation && (
                                                                <div className="text-xs text-slate-500">
                                                                    {lead.designation}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {lead.query_type ? (
                                                    <Badge variant="outline" className="capitalize">
                                                        {lead.query_type.replace("_", " ")}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`${getStageColor(
                                                        lead.stage || "met"
                                                    )} capitalize`}
                                                >
                                                    {(lead.stage || "met").replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-slate-400" />
                                                    <span
                                                        className={getPriorityColor(lead.priority ?? 0)}
                                                    >
                                                        {lead.priority ?? "-"}
                                                        {lead.priority != null ? "/10" : ""}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {lead.follow_up_date ? (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Clock className="w-3 h-3 text-yellow-600" />
                                                        <span className="text-yellow-700">
                                                            {new Date(
                                                                lead.follow_up_date
                                                            ).toLocaleDateString("en-IN", {
                                                                day: "numeric",
                                                                month: "short",
                                                            })}
                                                        </span>
                                                    </div>
                                                ) : lead.meeting_date ? (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Calendar className="w-3 h-3 text-indigo-600" />
                                                        <span className="text-indigo-700">
                                                            {new Date(
                                                                lead.meeting_date
                                                            ).toLocaleDateString("en-IN", {
                                                                day: "numeric",
                                                                month: "short",
                                                            })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">
                                                        No action set
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLeadClick(lead);
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
