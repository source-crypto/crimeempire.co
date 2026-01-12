import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

export default function ChainOfCustodyCard({ transfer }) {
    return (
        <Card className="bg-slate-800/30 border-slate-700/30">
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-slate-300 mb-2">
                            <span className="font-medium">{transfer.from_officer}</span>
                            <ArrowRight className="w-4 h-4 text-amber-500" />
                            <span className="font-medium">{transfer.to_officer}</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{transfer.reason}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(transfer.transfer_date), 'MMM d, yyyy HH:mm')}
                            </div>
                            {transfer.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {transfer.location}
                                </div>
                            )}
                        </div>
                        {transfer.notes && (
                            <p className="text-xs text-slate-500 mt-2 italic">{transfer.notes}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}