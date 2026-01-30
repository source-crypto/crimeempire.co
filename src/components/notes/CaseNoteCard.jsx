import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Clock, Star } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function CaseNoteCard({ note }) {
    const noteTypeColors = {
        update: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        finding: "bg-green-500/20 text-green-300 border-green-500/30",
        interview: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        lead: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        observation: "bg-slate-500/20 text-slate-300 border-slate-500/30",
        coordination: "bg-pink-500/20 text-pink-300 border-pink-500/30"
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
        >
            <Card className="bg-slate-800/50 border-slate-700/50 hover:border-amber-500/30 transition-all duration-300">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={noteTypeColors[note.note_type]}>
                                {note.note_type}
                            </Badge>
                            {note.is_important && (
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {format(new Date(note.created_date), 'MMM d, yyyy HH:mm')}
                        </div>
                    </div>
                    <p className="text-slate-300 mb-3 whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        {note.created_by}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}