import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Sparkles, Search, Filter } from "lucide-react";
import ReportCard from "../components/reports/ReportCard";
import { motion } from "framer-motion";

export default function Reports() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [analyzing, setAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    latitude: 40.7128,
    longitude: -74.0060,
    incident_date: new Date().toISOString().slice(0, 16),
    reporter_name: "",
    reporter_contact: "",
    category: "other",
    severity: "medium"
  });

  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['crimeReports'],
    queryFn: () => base44.entities.CrimeReport.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CrimeReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crimeReports'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CrimeReport.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crimeReports'] });
    },
  });

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this crime report and provide: 1) Suggested severity level (critical/high/medium/low), 2) Priority score (0-100), 3) Brief analysis.

Report: ${formData.title}
Description: ${formData.description}
Location: ${formData.location}
Category: ${formData.category}

Return analysis in format:
Severity: [level]
Priority: [score]
Analysis: [brief analysis]`,
        add_context_from_internet: false
      });

      const lines = result.split('\n');
      const severity = lines.find(l => l.startsWith('Severity:'))?.split(':')[1]?.trim().toLowerCase() || formData.severity;
      const priority = parseInt(lines.find(l => l.startsWith('Priority:'))?.split(':')[1]?.trim()) || 50;
      const analysis = lines.slice(2).join('\n').replace('Analysis:', '').trim();

      setFormData(prev => ({
        ...prev,
        severity,
        priority_score: priority,
        ai_analysis: analysis
      }));
    } catch (error) {
      console.error("AI analysis failed:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      incident_number: `INC-${Date.now()}`,
      status: 'new'
    };

    if (selectedReport) {
      await updateMutation.mutateAsync({ id: selectedReport.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      latitude: 40.7128,
      longitude: -74.0060,
      incident_date: new Date().toISOString().slice(0, 16),
      reporter_name: "",
      reporter_contact: "",
      category: "other",
      severity: "medium"
    });
    setSelectedReport(null);
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === "all" || r.severity === filterSeverity;
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Crime Reports</h1>
            <p className="text-slate-600 mt-1">Manage and track all incident reports</p>
          </div>
          <Button 
            onClick={() => setShowDialog(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Report
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map(report => (
            <ReportCard 
              key={report.id}
              report={report}
              onClick={() => {
                setSelectedReport(report);
                setFormData(report);
                setShowDialog(true);
              }}
            />
          ))}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">
                {selectedReport ? 'Edit Report' : 'New Crime Report'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <Input
                placeholder="Incident Title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                className="text-lg font-semibold"
              />
              
              <Textarea
                placeholder="Detailed Description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                className="min-h-[120px]"
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="violent_crime">Violent Crime</SelectItem>
                    <SelectItem value="property_crime">Property Crime</SelectItem>
                    <SelectItem value="drug_related">Drug Related</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="cybercrime">Cybercrime</SelectItem>
                    <SelectItem value="traffic">Traffic</SelectItem>
                    <SelectItem value="domestic">Domestic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({...formData, severity: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={formData.latitude}
                  onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={formData.longitude}
                  onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                />
              </div>

              <Input
                type="datetime-local"
                value={formData.incident_date}
                onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Reporter Name"
                  value={formData.reporter_name}
                  onChange={(e) => setFormData({...formData, reporter_name: e.target.value})}
                />
                <Input
                  placeholder="Reporter Contact"
                  value={formData.reporter_contact}
                  onChange={(e) => setFormData({...formData, reporter_contact: e.target.value})}
                />
              </div>

              {formData.ai_analysis && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-900 mb-2">AI Analysis</p>
                  <p className="text-sm text-amber-800">{formData.ai_analysis}</p>
                  {formData.priority_score && (
                    <p className="text-sm text-amber-900 mt-2 font-semibold">
                      Priority Score: {formData.priority_score}/100
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAIAnalysis}
                  disabled={analyzing || !formData.description}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {analyzing ? 'Analyzing...' : 'AI Analysis'}
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                >
                  {selectedReport ? 'Update' : 'Create'} Report
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}