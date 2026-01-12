import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, X } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import ChainOfCustodyLog from "./ChainOfCustodyLog";

export default function EvidenceDetailView({ evidence, onClose }) {
    const typeColors = {
        physical: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        digital: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        document: "bg-slate-500/20 text-slate-300 border-slate-500/30",
        testimony: "bg-green-500/20 text-green-300 border-green-500/30",
        photo: "bg-pink-500/20 text-pink-300 border-pink-500/30",
        video: "bg-red-500/20 text-red-300 border-red-500/30",
        forensic: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-4xl my-8"
            >
                <Card className="bg-slate-900 border-slate-700">
                    <CardHeader className="border-b border-slate-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600 font-mono">
                                        {evidence.evidence_number}
                                    </Badge>
                                    <Badge variant="outline" className={typeColors[evidence.type]}>
                                        {evidence.type}
                                    </Badge>
                                </div>
                                <CardTitle className="text-2xl text-slate-100">Evidence Details</CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
                            <p className="text-slate-300">{evidence.description}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {evidence.collected_by && (
                                <div>
                                    <h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Collected By
                                    </h3>
                                    <p className="text-slate-300">{evidence.collected_by}</p>
                                </div>
                            )}
                            {evidence.collection_date && (
                                <div>
                                    <h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Collection Date
                                    </h3>
                                    <p className="text-slate-300">{format(new Date(evidence.collection_date), 'MMMM d, yyyy')}</p>
                                </div>
                            )}
                        </div>

                        {evidence.chain_of_custody && (
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-2">Initial Chain of Custody Notes</h3>
                                <p className="text-slate-300 bg-slate-800/50 p-3 rounded border border-slate-700">
                                    {evidence.chain_of_custody}
                                </p>
                            </div>
                        )}

                        {evidence.file_url && (
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-2">Attached File</h3>
                                <a 
                                    href={evidence.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-amber-500 hover:text-amber-400 underline"
                                >
                                    View Evidence File
                                </a>
                            </div>
                        )}

                        <ChainOfCustodyLog 
                            evidenceId={evidence.id} 
                            evidenceNumber={evidence.evidence_number}
                        />
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}