import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import CaseNoteForm from "./CaseNoteForm";

export default function CaseNotesLog({ caseId }) {
    const [showForm, setShowForm] = useState(false);
    const queryClient = useQueryClient();

    const { data: notes = [] } = useQuery({
        queryKey: ['case-notes', caseId],
        queryFn: () => base44.entities.CaseNote.filter({ case_id: caseId }, '-created_date'),
        enabled: !!caseId,
    });

    const createNoteMutation = useMutation({
        mutationFn: (data) => base44.entities.CaseNote.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['case-notes', caseId] });
            setShowForm(false);
        },
    });

    const noteTypeColors = {
        update: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        finding: "bg-green-500/20 text-green-300 border-green-500/30",
        interview: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        analysis: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        other: "bg-slate-500/20 text-slate-300 border-slate-500/30"
    };

    return (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-amber-500" />
                        <CardTitle className="text-2xl text-slate-100">
                            Collaboration Log ({notes.length})
                        </CardTitle>
                    </div>
                    <Button
                        onClick={() => setShowForm(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Note
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {notes.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500">No notes added yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notes.map((note, index) => (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-slate-800/50 border rounded-lg p-4 ${
                                    note.is_important ? 'border-amber-500/50' : 'border-slate-700'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-slate-300">{note.author}</span>
                                        <Badge variant="outline" className={noteTypeColors[note.note_type]}>
                                            {note.note_type}
                                        </Badge>
                                        {note.is_important && (
                                            <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Important
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                                        {format(new Date(note.created_date), 'MMM d, yyyy h:mm a')}
                                    </span>
                                </div>
                                <p className="text-slate-300 whitespace-pre-wrap">{note.content}</p>
                            </motion.div>
                        ))}
                    </div>
                )}

                <AnimatePresence>
                    {showForm && (
                        <CaseNoteForm
                            caseId={caseId}
                            onSubmit={(data) => createNoteMutation.mutate(data)}
                            onCancel={() => setShowForm(false)}
                        />
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}