"use client";

import { useState } from "react";
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
import { createEvent } from "@/lib/admin-api";

interface AddEventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function AddEventDialog({
    open,
    onOpenChange,
    onSuccess,
}: AddEventDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        event_code: "",
        name: "",
        description: "",
        venue: "",
        city: "",
        start_date: "",
        end_date: "",
        status: "upcoming" as "active" | "upcoming" | "completed" | "cancelled",
        target_leads: 0,
        actual_leads: 0,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createEvent(formData);
            onSuccess();
            onOpenChange(false);
            setFormData({
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
        } catch (error) {
            console.error("Error creating event:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Add New Event</DialogTitle>
                    <DialogDescription>
                        Create a new event in the system. Fill in all the required details.
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
                                onValueChange={(value: any) =>
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
                            {loading ? "Creating..." : "Create Event"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
