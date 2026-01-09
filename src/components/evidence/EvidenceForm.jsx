import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { motion } from "framer-motion";

export default function EvidenceForm({ caseId, onSubmit, onCancel }) {
    const [formData, setFormData] = React.useState({
        case_id: caseId,
        evidence_number: `EVD-${Date.now().toString().slice(-6)}`,
        type: "physical",
        description: "",
        file_url: "",
        collected_by: "",
        collection_date: new Date().toISOString().split('T')[0],
        chain_of_custody: ""
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
                        <CardTitle className="text-2xl text-slate-100">Add Evidence</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onCancel} className="text-slate-400 hover:text-slate-100">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Evidence Number</label>
                                <Input
                                    value={formData.evidence_number}
                                    onChange={(e) => setFormData({...formData, evidence_number: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Type *</label>
                                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="physical">Physical</SelectItem>
                                        <SelectItem value="digital">Digital</SelectItem>
                                        <SelectItem value="document">Document</SelectItem>
                                        <SelectItem value="testimony">Testimony</SelectItem>
                                        <SelectItem value="photo">Photo</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="forensic">Forensic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Description *</label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100 h-24"
                                placeholder="Detailed evidence description"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">File URL (optional)</label>
                            <Input
                                value={formData.file_url}
                                onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                                placeholder="https://..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Collected By</label>
                                <Input
                                    value={formData.collected_by}
                                    onChange={(e) => setFormData({...formData, collected_by: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                    placeholder="Officer name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Collection Date</label>
                                <Input
                                    type="date"
                                    value={formData.collection_date}
                                    onChange={(e) => setFormData({...formData, collection_date: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Chain of Custody Notes</label>
                            <Textarea
                                value={formData.chain_of_custody}
                                onChange={(e) => setFormData({...formData, chain_of_custody: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100 h-20"
                                placeholder="Chain of custody information"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                                Add Evidence
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}