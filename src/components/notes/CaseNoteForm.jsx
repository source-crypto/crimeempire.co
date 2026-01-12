import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { motion } from "framer-motion";

export default function CaseNoteForm({ caseId, onSubmit, onCancel }) {
    const [formData, setFormData] = React.useState({
        case_id: caseId,
        author: "",
        content: "",
        note_type: "update",
        is_important: false
    });

    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
        base44.auth.me().then(u => {
            setUser(u);
            setFormData(prev => ({ ...prev, author: u.full_name || u.email }));
        }).catch(() => {});
    }, []);

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
                        <CardTitle className="text-xl text-slate-100">Add Case Note</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onCancel} className="text-slate-400">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Author *</label>
                                <Input
                                    value={formData.author}
                                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                    placeholder="Your name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Note Type</label>
                                <Select value={formData.note_type} onValueChange={(value) => setFormData({...formData, note_type: value})}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="update">Update</SelectItem>
                                        <SelectItem value="finding">Finding</SelectItem>
                                        <SelectItem value="interview">Interview</SelectItem>
                                        <SelectItem value="analysis">Analysis</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Note Content *</label>
                            <Textarea
                                value={formData.content}
                                onChange={(e) => setFormData({...formData, content: e.target.value})}
                                className="bg-slate-800 border-slate-700 text-slate-100 h-32"
                                placeholder="Enter your note, update, or finding..."
                                required
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="important"
                                checked={formData.is_important}
                                onCheckedChange={(checked) => setFormData({...formData, is_important: checked})}
                                className="border-slate-600"
                            />
                            <label
                                htmlFor="important"
                                className="text-sm font-medium text-slate-300 cursor-pointer"
                            >
                                Mark as important
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                                Add Note
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}