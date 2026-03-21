"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    CheckCircle,
    XCircle,
    TrendingUp,
    TrendingDown,
    Loader2,
} from "lucide-react";

interface ConversionOutcomeDialogProps {
    open: boolean;
    leadName: string;
    leadEmail: string;
    onConvert: (notes: string) => Promise<void>;
    onNotConvert: (notes: string) => Promise<void>;
    onClose: () => void;
}

export default function ConversionOutcomeDialog({
    open,
    leadName,
    leadEmail,
    onConvert,
    onNotConvert,
    onClose,
}: ConversionOutcomeDialogProps) {
    const [selectedOutcome, setSelectedOutcome] = useState<"converted" | "not_converted" | null>(null);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!selectedOutcome) {
            alert("Please select an outcome");
            return;
        }

        setLoading(true);
        try {
            if (selectedOutcome === "converted") {
                await onConvert(notes);
            } else {
                await onNotConvert(notes);
            }
            // Reset and close
            setSelectedOutcome(null);
            setNotes("");
            onClose();
        } catch (error) {
            console.error("Error updating conversion outcome:", error);
            alert("Failed to update outcome");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        Complete Lead Conversion Outcome
                    </DialogTitle>
                    <DialogDescription className="text-base mt-2">
                        Both the meeting and follow-up have been completed for{" "}
                        <strong className="text-slate-900 dark:text-slate-100">{leadName}</strong>.
                        <br />
                        Now mark this lead as converted or not converted to complete the pipeline.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Outcome Selection */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">What was the outcome?</Label>

                        {/* Converted Option */}
                        <button
                            onClick={() => setSelectedOutcome("converted")}
                            disabled={loading}
                            className={`w-full p-4 rounded-lg border-2 transition-all ${
                                selectedOutcome === "converted"
                                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                    : "border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700"
                            } disabled:opacity-50 disabled:cursor-not-allowed text-left`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            selectedOutcome === "converted"
                                                ? "border-green-500 bg-green-500"
                                                : "border-slate-300 dark:border-slate-600"
                                        }`}
                                    >
                                        {selectedOutcome === "converted" && (
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                                            Converted
                                        </p>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Lead successfully converted into a client/deal
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* Not Converted Option */}
                        <button
                            onClick={() => setSelectedOutcome("not_converted")}
                            disabled={loading}
                            className={`w-full p-4 rounded-lg border-2 transition-all ${
                                selectedOutcome === "not_converted"
                                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                    : "border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700"
                            } disabled:opacity-50 disabled:cursor-not-allowed text-left`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            selectedOutcome === "not_converted"
                                                ? "border-red-500 bg-red-500"
                                                : "border-slate-300 dark:border-slate-600"
                                        }`}
                                    >
                                        {selectedOutcome === "not_converted" && (
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingDown className="w-5 h-5 text-red-600" />
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                                            Not Converted
                                        </p>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Lead did not convert despite meeting and follow-up
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Notes Section */}
                    {selectedOutcome && (
                        <div className="space-y-2">
                            <Label htmlFor="outcome_notes" className="text-sm font-medium">
                                {selectedOutcome === "converted"
                                    ? "Deal Details (Optional)"
                                    : "Reason for Not Converting (Optional)"}
                            </Label>
                            <Textarea
                                id="outcome_notes"
                                placeholder={
                                    selectedOutcome === "converted"
                                        ? "e.g., Successfully closed deal for Rs. 50 Lakhs investment advisory package"
                                        : "e.g., Lead interested but chose competitor, Budget constraints, etc."
                                }
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={loading}
                                className="min-h-24"
                            />
                        </div>
                    )}

                    {/* Stage Summary */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                            PIPELINE PROGRESSION
                        </p>
                        <div className="flex items-center justify-between text-sm">
                            <div className="text-slate-600 dark:text-slate-400">
                                ✓ Met → ✓ Follow-up → ✓ Meeting
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                                → {selectedOutcome === "converted" ? "Converted" : "Not Converted"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        size="lg"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedOutcome || loading}
                        size="lg"
                        className={`min-w-40 ${
                            selectedOutcome === "converted"
                                ? "bg-green-600 hover:bg-green-700"
                                : selectedOutcome === "not_converted"
                                  ? "bg-red-600 hover:bg-red-700"
                                  : ""
                        }`}
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {loading ? "Updating..." : "Confirm Outcome"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
