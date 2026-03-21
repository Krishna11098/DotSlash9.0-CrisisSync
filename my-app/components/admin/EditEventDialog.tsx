"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { updateEvent } from "@/lib/admin-api";

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
}

interface EditEventDialogProps {
    event: Event;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function EditEventDialog({
    event,
    open,
    onOpenChange,
    onSuccess,
}: EditEventDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        event_code: "",
        name: "",
        description: "",
        venue: "",
        city: "",
        start_date: "",
        end_date: "",
        status: "upcoming",
        target_leads: 0,
        actual_leads: 0,
    });

    useEffect(() => {
        if (event) {
            setFormData({
                event_code: event.event_code,
                name: event.name,
                description: event.description || "",
                venue: event.venue || "",
                city: event.city || "",
                start_date: event.start_date || "",
                end_date: event.end_date || "",
                status: event.status || "upcoming",
                target_leads: event.target_leads ?? 0,
                actual_leads: event.actual_leads ?? 0,
            });
        }
    }, [event]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await updateEvent(event.id, formData);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error updating event:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Edit Event</DialogTitle>
                    <DialogDescription>
                        Update the event details. All changes will be saved immediately.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="event_code" className="text-sm font-medium">
                                Event Code *
                            </Label>
                            <Input
                                id="event_code"
                                placeholder="e.g., EVT-2026-001"
                                value={formData.event_code}
                                onChange={(e) =>
                                    setFormData({ ...formData, event_code: e.target.value })
                                }
                                required
                                className="border-slate-300 focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium">
                                Event Name *
                            </Label>
                            <Input
                                id="name"
                                placeholder="e.g., Tech Summit 2026"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                required
                                className="border-slate-300 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium">
                            Description
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Describe the event..."
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            rows={3}
                            className="border-slate-300 focus:border-blue-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="venue" className="text-sm font-medium">
                                Venue *
                            </Label>
                            <Input
                                id="venue"
                                placeholder="e.g., Convention Center"
                                value={formData.venue}
                                onChange={(e) =>
                                    setFormData({ ...formData, venue: e.target.value })
                                }
                                required
                                className="border-slate-300 focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="city" className="text-sm font-medium">
                                City
                            </Label>
                            <Input
                                id="city"
                                placeholder="e.g., Mumbai"
                                value={formData.city}
                                onChange={(e) =>
                                    setFormData({ ...formData, city: e.target.value })
                                }
                                className="border-slate-300 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_date" className="text-sm font-medium">
                                Start Date *
                            </Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) =>
                                    setFormData({ ...formData, start_date: e.target.value })
                                }
                                required
                                className="border-slate-300 focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="end_date" className="text-sm font-medium">
                                End Date *
                            </Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) =>
                                    setFormData({ ...formData, end_date: e.target.value })
                                }
                                required
                                className="border-slate-300 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-sm font-medium">
                                Status *
                            </Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, status: value })
                                }
                            >
                                <SelectTrigger className="border-slate-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="upcoming">Upcoming</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="target_leads" className="text-sm font-medium">
                                Target Leads
                            </Label>
                            <Input
                                id="target_leads"
                                type="number"
                                min="0"
                                placeholder="0"
                                value={formData.target_leads}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        target_leads: parseInt(e.target.value) || 0,
                                    })
                                }
                                className="border-slate-300 focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="actual_leads" className="text-sm font-medium">
                                Actual Leads
                            </Label>
                            <Input
                                id="actual_leads"
                                type="number"
                                min="0"
                                placeholder="0"
                                value={formData.actual_leads}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        actual_leads: parseInt(e.target.value) || 0,
                                    })
                                }
                                className="border-slate-300 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
