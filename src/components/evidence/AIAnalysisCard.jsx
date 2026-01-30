import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AIAnalysisCard({ analysis }) {
    if (!analysis) return null;

    return (
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <CardTitle className="text-lg text-slate-100">AI Analysis</CardTitle>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        Powered by AI
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {analysis.summary && (
                    <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-400" />
                            Summary
                        </h4>
                        <p className="text-sm text-slate-400">{analysis.summary}</p>
                    </div>
                )}
                
                {analysis.findings && analysis.findings.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            Key Findings
                        </h4>
                        <ul className="space-y-1">
                            {analysis.findings.map((finding, idx) => (
                                <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                                    <span className="text-amber-500 mt-1">•</span>
                                    <span>{finding}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {analysis.anomalies && analysis.anomalies.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            Detected Anomalies
                        </h4>
                        <ul className="space-y-1">
                            {analysis.anomalies.map((anomaly, idx) => (
                                <li key={idx} className="text-sm text-amber-300 flex items-start gap-2">
                                    <span className="text-red-500 mt-1">⚠</span>
                                    <span>{anomaly}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {analysis.confidence && (
                    <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs text-slate-500">
                            Confidence Level: <span className="text-purple-400 font-semibold">{analysis.confidence}%</span>
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}