import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, FileText, Image, Video, Database, Eye } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function EvidenceCard({ evidence, onViewDetails }) {
    const typeIcons = {
        physical: FileText,
        digital: Database,
        document: FileText,
        testimony: User,
        photo: Image,
        video: Video,
        forensic: Database
    };

    const typeColors = {
        physical: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        digital: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        document: "bg-slate-500/20 text-slate-300 border-slate-500/30",
        testimony: "bg-green-500/20 text-green-300 border-green-500/30",
        photo: "bg-pink-500/20 text-pink-300 border-pink-500/30",
        video: "bg-red-500/20 text-red-300 border-red-500/30",
        forensic: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    };

    const Icon = typeIcons[evidence.type] || FileText;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card className="bg-slate-800/50 border-slate-700/50 hover:border-amber-500/30 transition-all duration-300">
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                            <Icon className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <Badge variant="outline" className="bg-slate-900/50 text-slate-300 border-slate-600 font-mono text-xs mb-2">
                                        {evidence.evidence_number}
                                    </Badge>
                                    <Badge variant="outline" className={`${typeColors[evidence.type]} ml-2`}>
                                        {evidence.type}
                                    </Badge>
                                </div>
                            </div>
                            <p className="text-slate-300 text-sm">
                                {evidence.description}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                {evidence.collected_by && (
                                    <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {evidence.collected_by}
                                    </div>
                                )}
                                {evidence.collection_date && (
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(evidence.collection_date), 'MMM d, yyyy')}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 mt-2">
                                {evidence.file_url && (
                                    <a 
                                        href={evidence.file_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-amber-500 hover:text-amber-400 text-sm underline inline-block"
                                    >
                                        View File
                                    </a>
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onViewDetails(evidence)}
                                    className="border-slate-600 text-slate-300 hover:bg-slate-800 text-xs"
                                >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Chain of Custody
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}