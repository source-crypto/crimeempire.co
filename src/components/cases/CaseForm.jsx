import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { motion } from "framer-motion";

export default function CaseForm({ caseData, onSubmit, onCancel }) {
    const [formData, setFormData] = React.useState(caseData || {
        case_number: `CASE-${Date.now().toString().slice(-6)}`,
        title: "",
        description: "",
        status: "open",
        priority: "medium",
        assigned_officer: "",
        location: "",
        date_opened: new Date().toISOString().split('T')[0]
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
            <Card className="w-full max-w-2xl bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
                <CardHeader className="border-b border-slate-700">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl text-slate-100">
                            {caseData ? 'Edit Case' : 'New Case'}
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onCancel} className="text-slate-400 hover:text-slate-100">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Case Number</label>
                                <Input
                                    value={formData.case_number}
                                    onChange={(e) => setFormData({...formData, case_number: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Date Opened</label>
                                <Input
                                    type="date"
                                    value={formData.date_opened}
                                    onChange={(e) => setFormData({...formData, date_opened: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Case Title *</label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                                placeholder="Enter case title"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Description</label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100 h-24"
                                placeholder="Enter case description"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Status</label>
                                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="investigating">Investigating</SelectItem>
                                        <SelectItem value="solved">Solved</SelectItem>
                                        <SelectItem value="cold_case">Cold Case</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Priority</label>
                                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Assigned Officer</label>
                                <Input
                                    value={formData.assigned_officer}
                                    onChange={(e) => setFormData({...formData, assigned_officer: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                    placeholder="Officer name"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Location</label>
                                <Input
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                    placeholder="Case location"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                                {caseData ? 'Update Case' : 'Create Case'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}