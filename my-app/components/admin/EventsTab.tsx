"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MapPin, Calendar as CalendarIcon, Users } from "lucide-react";
import AddEventDialog from "@/components/admin/AddEventDialog";
import EditEventDialog from "@/components/admin/EditEventDialog";
import { fetchAllEvents, deleteEvent } from "@/lib/admin-api";

interface Event {
    id: string;
    event_code: string;
    name: string;
    description?: string | null;
    venue?: string | null;
    city?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: string | null;
    target_leads?: number | null;
    actual_leads?: number | null;
    stalls?: { stall_numbers: string[] };
    created_at?: string | null;
}

export default function EventsTab() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const fetchEvents = async () => {
        try {
            const data = await fetchAllEvents();
            setEvents(data);
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this event?")) return;

        try {
            await deleteEvent(id);
            fetchEvents();
        } catch (error) {
            console.error("Error deleting event:", error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "upcoming":
                return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
            case "active":
                return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
            case "completed":
                return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
            case "cancelled":
                return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
            default:
                return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Events Management
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Manage all events and track their performance
                    </p>
                </div>
                <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                </Button>
            </div>

            <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5" />
                        All Events
                    </CardTitle>
                    <CardDescription>
                        Total Events: {events.length}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">No events found</p>
                            <Button
                                onClick={() => setShowAddDialog(true)}
                                variant="outline"
                                className="mt-4"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Event
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                        <TableHead className="font-semibold">Event Code</TableHead>
                                        <TableHead className="font-semibold">Name</TableHead>
                                        <TableHead className="font-semibold">Venue</TableHead>
                                        <TableHead className="font-semibold">Date Range</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="font-semibold">Leads</TableHead>
                                        <TableHead className="font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {events.map((event) => (
                                        <TableRow
                                            key={event.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                        >
                                            <TableCell className="font-mono text-sm font-medium">
                                                {event.event_code}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-slate-100">
                                                        {event.name}
                                                    </div>
                                                    {event.description && (
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                                            {event.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                    <div>
                                                        <div className="text-sm">{event.venue}</div>
                                                        {event.city && (
                                                            <div className="text-xs text-slate-500">{event.city}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{formatDate(event.start_date || new Date().toISOString())}</div>
                                                    <div className="text-xs text-slate-500">
                                                        to {formatDate(event.end_date || event.start_date || new Date().toISOString())}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`${getStatusColor(event.status || 'upcoming')} capitalize`}
                                                >
                                                    {event.status || 'upcoming'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm">
                                                        {event.actual_leads ?? 0} / {event.target_leads ?? 0}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setEditingEvent(event)}
                                                        className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(event.id)}
                                                        className="hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

            <AddEventDialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                onSuccess={fetchEvents}
            />

            {editingEvent && (
                <EditEventDialog
                    event={editingEvent}
                    open={!!editingEvent}
                    onOpenChange={(open: boolean) => !open && setEditingEvent(null)}
                    onSuccess={fetchEvents}
                />
            )}
        </>
    );
}
