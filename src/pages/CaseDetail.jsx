import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Edit, Calendar, MapPin, User, FileText, MessageSquare, Upload, ArrowRightLeft, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "../components/cases/StatusBadge";
import PriorityBadge from "../components/cases/PriorityBadge";
import EvidenceCard from "../components/evidence/EvidenceCard";
import EvidenceForm from "../components/evidence/EvidenceForm";
import CaseForm from "../components/cases/CaseForm";
import CaseNoteCard from "../components/notes/CaseNoteCard";
import CaseNoteForm from "../components/notes/CaseNoteForm";
import ChainOfCustodyCard from "../components/evidence/ChainOfCustodyCard";
import TransferForm from "../components/evidence/TransferForm";
import AIAnalysisCard from "../components/evidence/AIAnalysisCard";

export default function CaseDetail() {
    const [showEvidenceForm, setShowEvidenceForm] = useState(false);
    const [showCaseForm, setShowCaseForm] = useState(false);
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    const [showTransferForm, setShowTransferForm] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState({});
    const [user, setUser] = useState(null);
    
    React.useEffect(() => {
        base44.auth.me().then(setUser).catch(() => setUser(null));
    }, []);
    
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('id');

    const queryClient = useQueryClient();

    const { data: caseItem, isLoading: caseLoading } = useQuery({
        queryKey: ['case', caseId],
        queryFn: async () => {
            const cases = await base44.entities.Case.filter({ id: caseId });
            return cases[0];
        },
        enabled: !!caseId,
    });

    const { data: evidence = [] } = useQuery({
        queryKey: ['evidence', caseId],
        queryFn: () => base44.entities.Evidence.filter({ case_id: caseId }, '-created_date'),
        enabled: !!caseId,
    });

    const { data: notes = [] } = useQuery({
        queryKey: ['notes', caseId],
        queryFn: () => base44.entities.CaseNote.filter({ case_id: caseId }, '-created_date'),
        enabled: !!caseId,
    });

    const { data: transfers = [] } = useQuery({
        queryKey: ['transfers', selectedEvidence?.id],
        queryFn: () => selectedEvidence ? base44.entities.EvidenceTransfer.filter({ evidence_id: selectedEvidence.id }, '-transfer_date') : [],
        enabled: !!selectedEvidence,
    });

    const createEvidenceMutation = useMutation({
        mutationFn: async (data) => {
            const evidence = await base44.entities.Evidence.create(data);
            
            // Create notification for assigned officer
            if (caseItem?.assigned_officer && user) {
                await base44.entities.Notification.create({
                    user_email: caseItem.assigned_officer,
                    title: "New Evidence Added",
                    message: `New evidence "${data.evidence_number}" added to case #${caseItem.case_number}`,
                    type: "new_evidence",
                    case_id: caseId,
                    priority: caseItem.priority
                });
            }
            
            return evidence;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidence', caseId] });
            setShowEvidenceForm(false);
        },
    });

    const createNoteMutation = useMutation({
        mutationFn: async (data) => {
            const note = await base44.entities.CaseNote.create(data);
            
            // Create notification for assigned officer if it's an important note
            if (data.is_important && caseItem?.assigned_officer && user) {
                await base44.entities.Notification.create({
                    user_email: caseItem.assigned_officer,
                    title: "Important Case Note",
                    message: `Important note added to case #${caseItem.case_number}`,
                    type: "new_note",
                    case_id: caseId,
                    priority: "high"
                });
            }
            
            return note;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', caseId] });
            setShowNoteForm(false);
        },
    });

    const createTransferMutation = useMutation({
        mutationFn: (data) => base44.entities.EvidenceTransfer.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            setShowTransferForm(false);
        },
    });

    const updateCaseMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const oldCase = caseItem;
            const updatedCase = await base44.entities.Case.update(id, data);
            
            // Trigger notifications based on changes
            if (oldCase && user) {
                // Priority changed to critical
                if (data.priority === 'critical' && oldCase.priority !== 'critical' && data.assigned_officer) {
                    await base44.entities.Notification.create({
                        user_email: data.assigned_officer,
                        title: "Critical Case Alert",
                        message: `Case #${data.case_number} has been marked as CRITICAL priority`,
                        type: "critical_case",
                        case_id: id,
                        priority: "critical"
                    });
                }
                
                // Status changed
                if (data.status !== oldCase.status && data.assigned_officer) {
                    await base44.entities.Notification.create({
                        user_email: data.assigned_officer,
                        title: "Case Status Changed",
                        message: `Case #${data.case_number} status changed from ${oldCase.status} to ${data.status}`,
                        type: "status_change",
                        case_id: id,
                        priority: data.priority
                    });
                }
                
                // Officer assigned
                if (data.assigned_officer && data.assigned_officer !== oldCase.assigned_officer) {
                    await base44.entities.Notification.create({
                        user_email: data.assigned_officer,
                        title: "Case Assignment",
                        message: `You have been assigned to case #${data.case_number}: ${data.title}`,
                        type: "assignment",
                        case_id: id,
                        priority: data.priority
                    });
                }
            }
            
            return updatedCase;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['case', caseId] });
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            setShowCaseForm(false);
        },
    });

    const handleFileUpload = async (evidenceId, file) => {
        setUploadingFile(true);
        try {
            // Upload file
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // Update evidence with file URL
            const currentEvidence = evidence.find(e => e.id === evidenceId);
            await base44.entities.Evidence.update(evidenceId, {
                ...currentEvidence,
                file_url
            });
            
            // Run AI analysis for digital/forensic evidence
            if (currentEvidence && (currentEvidence.type === 'digital' || currentEvidence.type === 'forensic')) {
                const analysis = await base44.integrations.Core.InvokeLLM({
                    prompt: `Analyze this ${currentEvidence.type} evidence file and provide:
1. A brief summary
2. Key findings (list 3-5 important points)
3. Any anomalies or suspicious patterns detected
4. Confidence level (0-100%)

Context: ${currentEvidence.description}`,
                    file_urls: [file_url],
                    response_json_schema: {
                        type: "object",
                        properties: {
                            summary: { type: "string" },
                            findings: { type: "array", items: { type: "string" } },
                            anomalies: { type: "array", items: { type: "string" } },
                            confidence: { type: "number" }
                        }
                    }
                });
                
                setAiAnalysis(prev => ({ ...prev, [evidenceId]: analysis }));
            }
            
            queryClient.invalidateQueries({ queryKey: ['evidence', caseId] });
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploadingFile(false);
        }
    };

    if (caseLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-amber-500 text-lg">Loading case details...</div>
            </div>
        );
    }

    if (!caseItem) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-slate-400 text-lg">Case not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Link to={createPageUrl('Cases')}>
                        <Button variant="ghost" className="text-slate-400 hover:text-slate-100 mb-6">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Cases
                        </Button>
                    </Link>

                    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-6">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-sm font-mono text-slate-500">#{caseItem.case_number}</span>
                                        <StatusBadge status={caseItem.status} />
                                        <PriorityBadge priority={caseItem.priority} />
                                    </div>
                                    <CardTitle className="text-3xl text-slate-100 mb-3">
                                        {caseItem.title}
                                    </CardTitle>
                                    <p className="text-slate-400">
                                        {caseItem.description}
                                    </p>
                                </div>
                                <Button
                                    onClick={() => setShowCaseForm(true)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Case
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                                {caseItem.assigned_officer && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg">
                                            <User className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Assigned Officer</div>
                                            <div className="text-slate-300">{caseItem.assigned_officer}</div>
                                        </div>
                                    </div>
                                )}
                                {caseItem.location && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg">
                                            <MapPin className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Location</div>
                                            <div className="text-slate-300">{caseItem.location}</div>
                                        </div>
                                    </div>
                                )}
                                {caseItem.date_opened && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg">
                                            <Calendar className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Date Opened</div>
                                            <div className="text-slate-300">
                                                {format(new Date(caseItem.date_opened), 'MMMM d, yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-6 h-6 text-amber-500" />
                                        <CardTitle className="text-2xl text-slate-100">
                                            Evidence ({evidence.length})
                                        </CardTitle>
                                    </div>
                                    <Button
                                        onClick={() => setShowEvidenceForm(true)}
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Evidence
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {evidence.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                                        <p className="text-slate-500">No evidence added yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                        {evidence.map((item) => (
                                            <div key={item.id}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <EvidenceCard evidence={item} />
                                                </div>
                                                <div className="ml-4 space-y-2 mb-3">
                                                    {(item.type === 'digital' || item.type === 'forensic') && (
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="file"
                                                                id={`file-${item.id}`}
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleFileUpload(item.id, file);
                                                                }}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => document.getElementById(`file-${item.id}`).click()}
                                                                disabled={uploadingFile}
                                                                className="border-slate-700 text-slate-300"
                                                            >
                                                                <Upload className="w-3 h-3 mr-2" />
                                                                {uploadingFile ? 'Uploading...' : 'Upload & Analyze'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setSelectedEvidence(item);
                                                                    setShowTransferForm(true);
                                                                }}
                                                                className="border-slate-700 text-slate-300"
                                                            >
                                                                <ArrowRightLeft className="w-3 h-3 mr-2" />
                                                                Transfer
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {aiAnalysis[item.id] && (
                                                        <AIAnalysisCard analysis={aiAnalysis[item.id]} />
                                                    )}
                                                    {selectedEvidence?.id === item.id && transfers.length > 0 && (
                                                        <div className="mt-2 space-y-2">
                                                            <h4 className="text-sm font-semibold text-slate-300">Chain of Custody</h4>
                                                            {transfers.map(transfer => (
                                                                <ChainOfCustodyCard key={transfer.id} transfer={transfer} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <MessageSquare className="w-6 h-6 text-amber-500" />
                                        <CardTitle className="text-2xl text-slate-100">
                                            Case Notes ({notes.length})
                                        </CardTitle>
                                    </div>
                                    <Button
                                        onClick={() => setShowNoteForm(true)}
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
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                        {notes.map((note) => (
                                            <CaseNoteCard key={note.id} note={note} />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showEvidenceForm && (
                        <EvidenceForm
                            caseId={caseId}
                            onSubmit={(data) => createEvidenceMutation.mutate(data)}
                            onCancel={() => setShowEvidenceForm(false)}
                        />
                    )}
                    {showCaseForm && (
                        <CaseForm
                            caseData={caseItem}
                            onSubmit={(data) => updateCaseMutation.mutate({ id: caseItem.id, data })}
                            onCancel={() => setShowCaseForm(false)}
                        />
                    )}
                    {showNoteForm && (
                        <CaseNoteForm
                            caseId={caseId}
                            onSubmit={(data) => createNoteMutation.mutate(data)}
                            onCancel={() => setShowNoteForm(false)}
                        />
                    )}
                    {showTransferForm && selectedEvidence && (
                        <TransferForm
                            evidenceId={selectedEvidence.id}
                            onSubmit={(data) => createTransferMutation.mutate(data)}
                            onCancel={() => {
                                setShowTransferForm(false);
                                setSelectedEvidence(null);
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}