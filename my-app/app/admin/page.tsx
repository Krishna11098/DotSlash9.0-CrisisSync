"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, TrendingUp, Activity, BarChart3, LogOut } from "lucide-react";
import EventsTab from "../../components/admin/EventsTab";
import LeadsTab from "../../components/admin/LeadsTab";
import StatsOverview from "../../components/admin/StatsOverview";
import AnalyticsTab from "../../components/admin/AnalyticsTab";
import SyncStatusIndicator from "@/app/components/SyncStatusIndicator";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const router = useRouter();

    const adminNavItems = [
        {
            id: "overview",
            label: "Overview",
            icon: TrendingUp,
            description: "Key metrics & stats",
        },
        {
            id: "analytics",
            label: "Analytics",
            icon: BarChart3,
            description: "Comprehensive insights",
        },
        {
            id: "events",
            label: "Events",
            icon: Calendar,
            description: "Manage events",
        },
        {
            id: "leads",
            label: "Leads",
            icon: Users,
            description: "Contact management",
        },
    ];

    const handleAdminLogout = async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/admin/login");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold bg-linear-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                                HTT XSpark Admin
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                CRM Management Dashboard
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <SyncStatusIndicator compact />
                            <Badge variant="outline" className="px-4 py-2">
                                <Activity className="w-4 h-4 mr-2" />
                                System Active
                            </Badge>
                            <Button variant="outline" onClick={handleAdminLogout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Admin Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="container mx-auto px-6">
                    <nav className="flex items-center gap-2 py-3 overflow-x-auto">
                        {adminNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                                        isActive
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-md'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <div className="text-left">
                                        <div className="font-semibold">{item.label}</div>
                                        <div className={`text-xs ${isActive ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {item.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="hidden">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="events">Events</TabsTrigger>
                        <TabsTrigger value="leads">Leads</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <StatsOverview />
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6">
                        <AnalyticsTab />
                    </TabsContent>

                    <TabsContent value="events" className="space-y-6">
                        <EventsTab />
                    </TabsContent>

                    <TabsContent value="leads" className="space-y-6">
                        <LeadsTab />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
