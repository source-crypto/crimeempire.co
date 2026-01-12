import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, X } from "lucide-react";
import { motion } from "framer-motion";

export default function NotificationPreferences({ onClose, userEmail }) {
    const queryClient = useQueryClient();

    const { data: preferences, isLoading } = useQuery({
        queryKey: ['notification-preferences', userEmail],
        queryFn: async () => {
            const prefs = await base44.entities.NotificationPreference.filter({ user_email: userEmail });
            return prefs[0] || null;
        },
        enabled: !!userEmail,
    });

    const [formData, setFormData] = React.useState({
        case_updates: true,
        deadline_alerts: true,
        new_assignments: true,
        evidence_added: true,
        critical_only: false,
        email_notifications: false
    });

    React.useEffect(() => {
        if (preferences) {
            setFormData({
                case_updates: preferences.case_updates ?? true,
                deadline_alerts: preferences.deadline_alerts ?? true,
                new_assignments: preferences.new_assignments ?? true,
                evidence_added: preferences.evidence_added ?? true,
                critical_only: preferences.critical_only ?? false,
                email_notifications: preferences.email_notifications ?? false
            });
        }
    }, [preferences]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const payload = { ...data, user_email: userEmail };
            if (preferences) {
                return base44.entities.NotificationPreference.update(preferences.id, payload);
            } else {
                return base44.entities.NotificationPreference.create(payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
            onClose();
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    if (isLoading) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-lg"
            >
                <Card className="bg-slate-900 border-slate-700">
                    <CardHeader className="border-b border-slate-700">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Settings className="w-6 h-6 text-amber-500" />
                                <CardTitle className="text-2xl text-slate-100">Notification Preferences</CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="case_updates"
                                        checked={formData.case_updates}
                                        onCheckedChange={(checked) => setFormData({...formData, case_updates: checked})}
                                        className="border-slate-600"
                                    />
                                    <label htmlFor="case_updates" className="text-sm text-slate-300 cursor-pointer">
                                        <div className="font-medium">Case Updates</div>
                                        <div className="text-xs text-slate-500">Get notified when cases are updated</div>
                                    </label>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="deadline_alerts"
                                        checked={formData.deadline_alerts}
                                        onCheckedChange={(checked) => setFormData({...formData, deadline_alerts: checked})}
                                        className="border-slate-600"
                                    />
                                    <label htmlFor="deadline_alerts" className="text-sm text-slate-300 cursor-pointer">
                                        <div className="font-medium">Deadline Alerts</div>
                                        <div className="text-xs text-slate-500">Receive alerts for upcoming deadlines</div>
                                    </label>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="new_assignments"
                                        checked={formData.new_assignments}
                                        onCheckedChange={(checked) => setFormData({...formData, new_assignments: checked})}
                                        className="border-slate-600"
                                    />
                                    <label htmlFor="new_assignments" className="text-sm text-slate-300 cursor-pointer">
                                        <div className="font-medium">New Assignments</div>
                                        <div className="text-xs text-slate-500">Get notified when assigned to new cases</div>
                                    </label>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="evidence_added"
                                        checked={formData.evidence_added}
                                        onCheckedChange={(checked) => setFormData({...formData, evidence_added: checked})}
                                        className="border-slate-600"
                                    />
                                    <label htmlFor="evidence_added" className="text-sm text-slate-300 cursor-pointer">
                                        <div className="font-medium">Evidence Added</div>
                                        <div className="text-xs text-slate-500">Notify when new evidence is added to cases</div>
                                    </label>
                                </div>

                                <div className="border-t border-slate-700 pt-4">
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="critical_only"
                                            checked={formData.critical_only}
                                            onCheckedChange={(checked) => setFormData({...formData, critical_only: checked})}
                                            className="border-slate-600"
                                        />
                                        <label htmlFor="critical_only" className="text-sm text-slate-300 cursor-pointer">
                                            <div className="font-medium">Critical Notifications Only</div>
                                            <div className="text-xs text-slate-500">Only receive critical priority notifications</div>
                                        </label>
                                    </div>
                                </div>

                                <div className="border-t border-slate-700 pt-4">
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="email_notifications"
                                            checked={formData.email_notifications}
                                            onCheckedChange={(checked) => setFormData({...formData, email_notifications: checked})}
                                            className="border-slate-600"
                                        />
                                        <label htmlFor="email_notifications" className="text-sm text-slate-300 cursor-pointer">
                                            <div className="font-medium">Email Notifications</div>
                                            <div className="text-xs text-slate-500">Send notifications to your email address</div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    Save Preferences
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}