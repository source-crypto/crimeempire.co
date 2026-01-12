import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Bell, Mail, Save } from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
    const [user, setUser] = React.useState(null);
    const [preferences, setPreferences] = React.useState(null);

    React.useEffect(() => {
        base44.auth.me().then(setUser).catch(() => setUser(null));
    }, []);

    const queryClient = useQueryClient();

    const { data: existingPrefs } = useQuery({
        queryKey: ['preferences', user?.email],
        queryFn: async () => {
            if (!user) return null;
            const prefs = await base44.entities.NotificationPreference.filter({ user_email: user.email });
            return prefs[0] || null;
        },
        enabled: !!user,
    });

    React.useEffect(() => {
        if (existingPrefs) {
            setPreferences(existingPrefs);
        } else if (user) {
            setPreferences({
                user_email: user.email,
                email_notifications: true,
                critical_case_alerts: true,
                status_change_alerts: true,
                new_evidence_alerts: true,
                new_note_alerts: false,
                assignment_alerts: true
            });
        }
    }, [existingPrefs, user]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (existingPrefs) {
                return await base44.entities.NotificationPreference.update(existingPrefs.id, data);
            } else {
                return await base44.entities.NotificationPreference.create(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['preferences'] });
        },
    });

    const handleSave = () => {
        if (preferences) {
            saveMutation.mutate(preferences);
        }
    };

    if (!user || !preferences) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-amber-500 text-lg">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl font-bold text-slate-100 mb-2">Settings</h1>
                    <p className="text-slate-400">Manage your notification preferences</p>
                </motion.div>

                <Card className="bg-slate-900/50 border-slate-700/50 mb-6">
                    <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-amber-500" />
                            Notification Preferences
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-slate-400" />
                                <div>
                                    <h3 className="text-slate-100 font-medium">Email Notifications</h3>
                                    <p className="text-slate-500 text-sm">Receive notifications via email</p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences.email_notifications}
                                onCheckedChange={(checked) => setPreferences({...preferences, email_notifications: checked})}
                            />
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div>
                                <h3 className="text-slate-100 font-medium">Critical Case Alerts</h3>
                                <p className="text-slate-500 text-sm">Get notified when cases are marked as critical priority</p>
                            </div>
                            <Switch
                                checked={preferences.critical_case_alerts}
                                onCheckedChange={(checked) => setPreferences({...preferences, critical_case_alerts: checked})}
                            />
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div>
                                <h3 className="text-slate-100 font-medium">Status Change Alerts</h3>
                                <p className="text-slate-500 text-sm">Notify when case status changes</p>
                            </div>
                            <Switch
                                checked={preferences.status_change_alerts}
                                onCheckedChange={(checked) => setPreferences({...preferences, status_change_alerts: checked})}
                            />
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div>
                                <h3 className="text-slate-100 font-medium">New Evidence Alerts</h3>
                                <p className="text-slate-500 text-sm">Get notified when new evidence is added to your cases</p>
                            </div>
                            <Switch
                                checked={preferences.new_evidence_alerts}
                                onCheckedChange={(checked) => setPreferences({...preferences, new_evidence_alerts: checked})}
                            />
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-800">
                            <div>
                                <h3 className="text-slate-100 font-medium">Case Note Alerts</h3>
                                <p className="text-slate-500 text-sm">Notify when new notes are added to your cases</p>
                            </div>
                            <Switch
                                checked={preferences.new_note_alerts}
                                onCheckedChange={(checked) => setPreferences({...preferences, new_note_alerts: checked})}
                            />
                        </div>

                        <div className="flex items-center justify-between py-3">
                            <div>
                                <h3 className="text-slate-100 font-medium">Assignment Alerts</h3>
                                <p className="text-slate-500 text-sm">Get notified when you're assigned to a new case</p>
                            </div>
                            <Switch
                                checked={preferences.assignment_alerts}
                                onCheckedChange={(checked) => setPreferences({...preferences, assignment_alerts: checked})}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                        disabled={saveMutation.isPending}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </div>

                {saveMutation.isSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-center"
                    >
                        Settings saved successfully!
                    </motion.div>
                )}
            </div>
        </div>
    );
}