import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { motion } from "framer-motion";

export default function ChainOfCustodyForm({ evidenceId, evidenceNumber, onSubmit, onCancel }) {
    const [formData, setFormData] = React.useState({
        evidence_id: evidenceId,
        transferred_from: "",
        transferred_to: "",
        transfer_date: new Date().toISOString().slice(0, 16),
        reason: "",
        location: "",
        notes: ""
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <Card className="w-full max-w-2xl bg-slate-900 border-slate-700">
                <CardHeader className="border-b border-slate-700">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl text-slate-100">
                            Log Evidence Transfer - {evidenceNumber}
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onCancel} className="text-slate-400">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Transferred From *</label>
                                <Input
                                    value={formData.transferred_from}
                                    onChange={(e) => setFormData({...formData, transferred_from: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                    placeholder="Officer/Department name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Transferred To *</label>
                                <Input
                                    value={formData.transferred_to}
                                    onChange={(e) => setFormData({...formData, transferred_to: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                    placeholder="Officer/Department name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Transfer Date & Time *</label>
                            <Input
                                type="datetime-local"
                                value={formData.transfer_date}
                                onChange={(e) => setFormData({...formData, transfer_date: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Reason for Transfer *</label>
                            <Input
                                value={formData.reason}
                                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                                placeholder="e.g., Lab analysis, Court presentation, Secure storage"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Current Location</label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                                placeholder="Storage location after transfer"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Additional Notes</label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100 h-20"
                                placeholder="Any additional transfer details"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                                Log Transfer
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}