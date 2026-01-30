import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AIAssistant({ onAnalysisComplete }) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalysis = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant for a crime management system. Analyze the following request and provide actionable insights:\n\n${prompt}`,
        add_context_from_internet: false
      });
      setResponse(result);
    } catch (error) {
      setResponse("Error generating analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="w-5 h-5 text-amber-400" />
          AI Operations Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Ask AI to analyze crime patterns, suggest resource allocation, or generate insights..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
          disabled={loading}
        />
        <Button 
          onClick={handleAnalysis}
          disabled={loading || !prompt.trim()}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Generate Insights
            </>
          )}
        </Button>

        <AnimatePresence>
          {response && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700"
            >
              <div className="text-sm text-slate-300 whitespace-pre-wrap">{response}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}