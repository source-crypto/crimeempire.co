import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";

export default function CaseCard({ caseItem }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="bg-slate-900/50 border-slate-700/50 hover:border-amber-500/30 transition-all duration-300 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-600 font-mono text-xs">
                                    #{caseItem.case_number}
                                </Badge>
                                <PriorityBadge priority={caseItem.priority} />
                            </div>
                            <CardTitle className="text-xl text-slate-100 mb-2">
                                {caseItem.title}
                            </CardTitle>
                            <p className="text-slate-400 text-sm line-clamp-2">
                                {caseItem.description}
                            </p>
                        </div>
                        <StatusBadge status={caseItem.status} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {caseItem.assigned_officer && (
                                <div className="flex items-center gap-2 text-slate-400">
                                    <User className="w-4 h-4 text-amber-500" />
                                    <span>{caseItem.assigned_officer}</span>
                                </div>
                            )}
                            {caseItem.location && (
                                <div className="flex items-center gap-2 text-slate-400">
                                    <MapPin className="w-4 h-4 text-amber-500" />
                                    <span>{caseItem.location}</span>
                                </div>
                            )}
                            {caseItem.date_opened && (
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Calendar className="w-4 h-4 text-amber-500" />
                                    <span>Opened: {format(new Date(caseItem.date_opened), 'MMM d, yyyy')}</span>
                                </div>
                            )}
                        </div>
                        <Link to={createPageUrl(`CaseDetail?id=${caseItem.id}`)}>
                            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                                <FileText className="w-4 h-4 mr-2" />
                                View Details
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}