import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ChainOfCustodyForm from "./ChainOfCustodyForm";

export default function ChainOfCustodyLog({ evidenceId, evidenceNumber }) {
    const [showForm, setShowForm] = useState(false);
    const queryClient = useQueryClient();

    const { data: transfers = [] } = useQuery({
        queryKey: ['evidence-transfers', evidenceId],
        queryFn: () => base44.entities.EvidenceTransfer.filter({ evidence_id: evidenceId }, '-transfer_date'),
        enabled: !!evidenceId,
    });

    const createTransferMutation = useMutation({
        mutationFn: (data) => base44.entities.EvidenceTransfer.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidence-transfers', evidenceId] });
            setShowForm(false);
        },
    });

    return (
        <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <CardTitle className="text-lg text-slate-100">Chain of Custody</CardTitle>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setShowForm(true)}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Log Transfer
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {transfers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        No transfers recorded yet
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transfers.map((transfer, index) => (
                            <motion.div
                                key={transfer.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="text-sm font-medium text-slate-300">
                                        {transfer.transferred_from}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-amber-500" />
                                    <div className="text-sm font-medium text-slate-300">
                                        {transfer.transferred_to}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 mb-2">
                                    {format(new Date(transfer.transfer_date), 'MMM d, yyyy h:mm a')}
                                </div>
                                <div className="text-sm text-slate-400 mb-1">
                                    <span className="font-medium text-amber-500">Reason:</span> {transfer.reason}
                                </div>
                                {transfer.location && (
                                    <div className="text-sm text-slate-400 mb-1">
                                        <span className="font-medium text-amber-500">Location:</span> {transfer.location}
                                    </div>
                                )}
                                {transfer.notes && (
                                    <div className="text-sm text-slate-400 mt-2 pt-2 border-t border-slate-700">
                                        {transfer.notes}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}

                <AnimatePresence>
                    {showForm && (
                        <ChainOfCustodyForm
                            evidenceId={evidenceId}
                            evidenceNumber={evidenceNumber}
                            onSubmit={(data) => createTransferMutation.mutate(data)}
                            onCancel={() => setShowForm(false)}
                        />
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}