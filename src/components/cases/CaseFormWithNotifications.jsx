import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { motion } from "framer-motion";

export default function CaseFormWithNotifications({ caseData, onSubmit, onCancel }) {
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

    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
        base44.auth.me().then(u => setUser(u)).catch(() => {});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const isNewCase = !caseData;
        const statusChanged = caseData && caseData.status !== formData.status;
        const priorityChanged = caseData && caseData.priority !== formData.priority;
        const officerChanged = caseData && caseData.assigned_officer !== formData.assigned_officer;

        await onSubmit(formData);

        // Get notification preferences
        try {
            const prefs = await base44.entities.NotificationPreference.filter({ user_email: formData.assigned_officer });
            const preference = prefs[0];
            
            const shouldNotify = !preference || 
                (!preference.critical_only || formData.priority === 'critical');

            if (shouldNotify && formData.assigned_officer) {
                // Create notifications for case updates
                if (isNewCase && (!preference || preference.new_assignments)) {
                    const notification = {
                        user_email: formData.assigned_officer,
                        title: "New Case Assignment",
                        message: `You have been assigned to case: ${formData.title}`,
                        type: "assignment",
                        priority: formData.priority,
                        case_id: formData.id,
                        send_email: preference?.email_notifications || false
                    };
                    
                    await base44.entities.Notification.create(notification);
                    
                    // Send email if enabled
                    if (preference?.email_notifications) {
                        try {
                            await base44.integrations.Core.SendEmail({
                                to: formData.assigned_officer,
                                subject: `New Case Assignment: ${formData.title}`,
                                body: `You have been assigned to case #${formData.case_number}: ${formData.title}\n\nPriority: ${formData.priority}\nStatus: ${formData.status}\n\nPlease review the case details in the system.`
                            });
                        } catch (err) {
                            console.error('Failed to send email:', err);
                        }
                    }
                }
                
                if (statusChanged && (!preference || preference.case_updates)) {
                    await base44.entities.Notification.create({
                        user_email: formData.assigned_officer,
                        title: "Case Status Updated",
                        message: `Case "${formData.title}" status changed to: ${formData.status}`,
                        type: "case_update",
                        priority: formData.priority,
                        case_id: caseData?.id,
                        send_email: preference?.email_notifications || false
                    });
                }
                
                if (priorityChanged && formData.priority === 'critical') {
                    await base44.entities.Notification.create({
                        user_email: formData.assigned_officer,
                        title: "Critical Priority Case",
                        message: `Case "${formData.title}" has been marked as CRITICAL priority`,
                        type: "critical",
                        priority: "critical",
                        case_id: caseData?.id,
                        send_email: true
                    });
                    
                    // Always send email for critical
                    try {
                        await base44.integrations.Core.SendEmail({
                            to: formData.assigned_officer,
                            subject: `CRITICAL: Case ${formData.case_number} Requires Immediate Attention`,
                            body: `CRITICAL PRIORITY ALERT\n\nCase #${formData.case_number}: ${formData.title}\n\nThis case has been marked as critical priority and requires your immediate attention.\n\nPlease review the case details in the system immediately.`
                        });
                    } catch (err) {
                        console.error('Failed to send critical email:', err);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to create notification:', err);
        }
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
                                <label className="text-sm font-medium text-slate-300">Assigned Officer (Email)</label>
                                <Input
                                    value={formData.assigned_officer}
                                    onChange={(e) => setFormData({...formData, assigned_officer: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                    placeholder="officer@email.com"
                                    type="email"
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