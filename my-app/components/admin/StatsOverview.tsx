"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, TrendingUp, Activity, Target, CheckCircle2, ArrowUpRight, ArrowDownRight, CircleDot, Sparkles } from "lucide-react";
import { fetchAllLeads, fetchAllEvents } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";

interface Stats {
    totalEvents: number;
    activeEvents: number;
    upcomingEvents: number;
    completedEvents: number;
    totalLeads: number;
    convertedLeads: number;
    averageLeadsPerEvent: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    followUpsPending: number;
    meetingsScheduled: number;
}

export default function StatsOverview() {
    const [stats, setStats] = useState<Stats>({
        totalEvents: 0,
        activeEvents: 0,
        upcomingEvents: 0,
        completedEvents: 0,
        totalLeads: 0,
        convertedLeads: 0,
        averageLeadsPerEvent: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        followUpsPending: 0,
        meetingsScheduled: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [events, leads] = await Promise.all([
                    fetchAllEvents(),
                    fetchAllLeads(),
                ]);

                const activeEvents = events.filter((e: any) => e.status === "active").length;
                const upcomingEvents = events.filter((e: any) => e.status === "upcoming").length;
                const completedEvents = events.filter((e: any) => e.status === "completed").length;
                const convertedLeads = leads.filter((l: any) => l.stage === "converted").length;
                
                const hotLeads = leads.filter((l: any) => (l.priority || 0) >= 8).length;
                const warmLeads = leads.filter((l: any) => {
                    const priority = l.priority || 0;
                    return priority >= 5 && priority < 8;
                }).length;
                const coldLeads = leads.filter((l: any) => (l.priority || 0) < 5).length;
                
                const followUpsPending = leads.filter((l: any) => l.stage === "follow_up").length;
                const meetingsScheduled = leads.filter((l: any) => l.stage === "meeting_scheduled").length;

                setStats({
                    totalEvents: events.length,
                    activeEvents,
                    upcomingEvents,
                    completedEvents,
                    totalLeads: leads.length,
                    convertedLeads,
                    averageLeadsPerEvent: events.length > 0 ? Math.round(leads.length / events.length) : 0,
                    hotLeads,
                    warmLeads,
                    coldLeads,
                    followUpsPending,
                    meetingsScheduled,
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        {
            title: "Total Events",
            value: stats.totalEvents,
            description: "All events in the system",
            icon: Calendar,
            gradient: "from-blue-500 to-blue-600",
            bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
        },
        {
            title: "Active Events",
            value: stats.activeEvents,
            description: "Currently running events",
            icon: Activity,
            gradient: "from-green-500 to-green-600",
            bgGradient: "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
        },
        {
            title: "Upcoming Events",
            value: stats.upcomingEvents,
            description: "Events scheduled for future",
            icon: Target,
            gradient: "from-purple-500 to-purple-600",
            bgGradient: "from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
        },
        {
            title: "Completed Events",
            value: stats.completedEvents,
            description: "Successfully finished events",
            icon: CheckCircle2,
            gradient: "from-slate-500 to-slate-600",
            bgGradient: "from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900",
        },
        {
            title: "Total Leads",
            value: stats.totalLeads,
            description: "All leads captured",
            icon: Users,
            gradient: "from-orange-500 to-orange-600",
            bgGradient: "from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900",
        },
        {
            title: "Converted Leads",
            value: stats.convertedLeads,
            description: "Successfully converted",
            icon: TrendingUp,
            gradient: "from-emerald-500 to-emerald-600",
            bgGradient: "from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900",
        },
    ];

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="shadow-lg">
                            <CardHeader className="pb-3">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const conversionRate = stats.totalLeads > 0 ? (stats.convertedLeads / stats.totalLeads) * 100 : 0;

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-purple-600" />
                        Dashboard Overview
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                        Real-time insights and performance metrics for your CRM
                    </p>
                </div>
                <Badge variant="outline" className="px-4 py-2 text-sm">
                    <CircleDot className="w-4 h-4 mr-2 text-green-500 animate-pulse" />
                    Live Data
                </Badge>
            </div>

            {/* Primary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Events Card */}
                <Card className="border-2 border-blue-100 dark:border-blue-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Events
                            </CardTitle>
                            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                            {stats.totalEvents}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
                                {stats.activeEvents} Active
                            </Badge>
                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20">
                                {stats.upcomingEvents} Upcoming
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Leads Card */}
                <Card className="border-2 border-orange-100 dark:border-orange-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Total Leads
                            </CardTitle>
                            <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                                <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                            {stats.totalLeads}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="font-medium">{stats.averageLeadsPerEvent} avg per event</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Conversion Card */}
                <Card className="border-2 border-emerald-100 dark:border-emerald-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Conversion Rate
                            </CardTitle>
                            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                            {conversionRate.toFixed(1)}%
                        </div>
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-medium">{stats.convertedLeads} converted</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Items Card */}
                <Card className="border-2 border-purple-100 dark:border-purple-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Action Items
                            </CardTitle>
                            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                            {stats.followUpsPending + stats.meetingsScheduled}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                            <Target className="w-4 h-4" />
                            <span className="font-medium">Follow-ups & meetings</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lead Priority Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Priority Distribution */}
                <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                    <CardHeader className="border-b bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            Lead Priority Distribution
                        </CardTitle>
                        <CardDescription>
                            Segmentation based on priority scoring
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                        {/* Hot Leads */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Hot Leads (8-10)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {stats.hotLeads}
                                    </span>
                                    <span className="text-sm text-slate-500">
                                        ({stats.totalLeads > 0 ? ((stats.hotLeads / stats.totalLeads) * 100).toFixed(0) : 0}%)
                                    </span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div
                                    className="bg-linear-to-r from-red-500 to-red-600 h-2.5 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${stats.totalLeads > 0 ? (stats.hotLeads / stats.totalLeads) * 100 : 0}%`,
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Warm Leads */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Warm Leads (5-7)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {stats.warmLeads}
                                    </span>
                                    <span className="text-sm text-slate-500">
                                        ({stats.totalLeads > 0 ? ((stats.warmLeads / stats.totalLeads) * 100).toFixed(0) : 0}%)
                                    </span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div
                                    className="bg-linear-to-r from-yellow-500 to-yellow-600 h-2.5 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${stats.totalLeads > 0 ? (stats.warmLeads / stats.totalLeads) * 100 : 0}%`,
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Cold Leads */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Cold Leads (0-4)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {stats.coldLeads}
                                    </span>
                                    <span className="text-sm text-slate-500">
                                        ({stats.totalLeads > 0 ? ((stats.coldLeads / stats.totalLeads) * 100).toFixed(0) : 0}%)
                                    </span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div
                                    className="bg-linear-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${stats.totalLeads > 0 ? (stats.coldLeads / stats.totalLeads) * 100 : 0}%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Pipeline */}
                <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                    <CardHeader className="border-b bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Target className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            Action Pipeline
                        </CardTitle>
                        <CardDescription>
                            Active follow-ups and scheduled meetings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {/* Follow-ups Pending */}
                        <div className="p-5 border-2 border-yellow-200 dark:border-yellow-900/30 rounded-xl bg-yellow-50/50 dark:bg-yellow-900/10">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                                        Follow-ups Pending
                                    </p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                        Leads awaiting follow-up contact
                                    </p>
                                </div>
                                <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                                    {stats.followUpsPending}
                                </div>
                            </div>
                        </div>

                        {/* Meetings Scheduled */}
                        <div className="p-5 border-2 border-indigo-200 dark:border-indigo-900/30 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                                        Meetings Scheduled
                                    </p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400">
                                        Upcoming client meetings
                                    </p>
                                </div>
                                <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                                    {stats.meetingsScheduled}
                                </div>
                            </div>
                        </div>

                        {/* Completion Stats */}
                        <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {stats.completedEvents}
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        Completed Events
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {stats.convertedLeads}
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        Successful Conversions
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Insights */}
            <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Quick Insights
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-2">
                                AVERAGE LEADS/EVENT
                            </p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {stats.averageLeadsPerEvent}
                            </p>
                        </div>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200 mb-2">
                                SUCCESS RATE
                            </p>
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                {conversionRate.toFixed(1)}%
                            </p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="text-xs font-medium text-purple-900 dark:text-purple-200 mb-2">
                                ACTIVE PIPELINE
                            </p>
                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                {stats.followUpsPending + stats.meetingsScheduled}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
