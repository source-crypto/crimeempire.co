import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Folder, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";

export default function InvestigationManager({ investigations, resources, reports }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [investigationForm, setInvestigationForm] = useState({
    case_number: `CASE-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    title: "",
    crime_report_id: "",
    lead_investigator: "",
    team_members: "",
    status: "active",
    priority: "medium",
    progress: 0,
    findings: "",
    deadline: "",
    resources_allocated: ""
  });

  const queryClient = useQueryClient();

  const createInvestigationMutation = useMutation({
    mutationFn: (data) => base44.entities.Investigation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateInvestigationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Investigation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setInvestigationForm({
      case_number: `CASE-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      title: "",
      crime_report_id: "",
      lead_investigator: "",
      team_members: "",
      status: "active",
      priority: "medium",
      progress: 0,
      findings: "",
      deadline: "",
      resources_allocated: ""
    });
    setSelectedInvestigation(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedInvestigation) {
      await updateInvestigationMutation.mutateAsync({ 
        id: selectedInvestigation.id, 
        data: investigationForm 
      });
    } else {
      await createInvestigationMutation.mutateAsync(investigationForm);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Active Investigations</h3>
        <Button 
          onClick={() => setShowDialog(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Investigation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {investigations.map(investigation => (
          <Card 
            key={investigation.id} 
            className="bg-white border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedInvestigation(investigation);
              setInvestigationForm(investigation);
              setShowDialog(true);
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {investigation.title}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{investigation.case_number}</p>
                </div>
                <Badge className={
                  investigation.priority === 'critical' ? 'bg-red-500 text-white' :
                  investigation.priority === 'high' ? 'bg-orange-500 text-white' :
                  investigation.priority === 'medium' ? 'bg-blue-500 text-white' :
                  'bg-slate-400 text-white'
                }>
                  {investigation.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Progress</span>
                  <span className="font-semibold">{investigation.progress || 0}%</span>
                </div>
                <Progress value={investigation.progress || 0} className="h-2" />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <UsersIcon className="w-4 h-4" />
                <span>{investigation.lead_investigator || 'Unassigned'}</span>
              </div>

              <Badge className={
                investigation.status === 'active' ? 'bg-emerald-500 text-white' :
                investigation.status === 'pending' ? 'bg-amber-500 text-slate-900' :
                investigation.status === 'completed' ? 'bg-blue-500 text-white' :
                'bg-slate-400 text-white'
              }>
                {investigation.status}
              </Badge>

              {investigation.deadline && (
                <p className="text-xs text-slate-500">
                  Deadline: {format(new Date(investigation.deadline), 'MMM d, yyyy')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInvestigation ? 'Update Investigation' : 'New Investigation'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Case Number"
              value={investigationForm.case_number}
              onChange={(e) => setInvestigationForm({...investigationForm, case_number: e.target.value})}
              required
            />
            <Input
              placeholder="Investigation Title"
              value={investigationForm.title}
              onChange={(e) => setInvestigationForm({...investigationForm, title: e.target.value})}
              required
            />

            <Select
              value={investigationForm.crime_report_id}
              onValueChange={(value) => setInvestigationForm({...investigationForm, crime_report_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to Crime Report (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {reports.map(report => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.incident_number} - {report.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={investigationForm.lead_investigator}
              onValueChange={(value) => setInvestigationForm({...investigationForm, lead_investigator: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Lead Investigator" />
              </SelectTrigger>
              <SelectContent>
                {resources.filter(r => r.type === 'detective').map(resource => (
                  <SelectItem key={resource.id} value={resource.id}>
                    {resource.name} - {resource.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Team Members (comma-separated names or IDs)"
              value={investigationForm.team_members}
              onChange={(e) => setInvestigationForm({...investigationForm, team_members: e.target.value})}
            />

            <div className="grid grid-cols-3 gap-4">
              <Select
                value={investigationForm.status}
                onValueChange={(value) => setInvestigationForm({...investigationForm, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cold_case">Cold Case</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={investigationForm.priority}
                onValueChange={(value) => setInvestigationForm({...investigationForm, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Progress %"
                value={investigationForm.progress}
                onChange={(e) => setInvestigationForm({...investigationForm, progress: parseInt(e.target.value) || 0})}
                min="0"
                max="100"
              />
            </div>

            <Input
              type="date"
              placeholder="Deadline"
              value={investigationForm.deadline}
              onChange={(e) => setInvestigationForm({...investigationForm, deadline: e.target.value})}
            />

            <Textarea
              placeholder="Findings and Notes"
              value={investigationForm.findings}
              onChange={(e) => setInvestigationForm({...investigationForm, findings: e.target.value})}
              className="min-h-[120px]"
            />

            <Textarea
              placeholder="Resources Allocated (equipment, personnel, etc.)"
              value={investigationForm.resources_allocated}
              onChange={(e) => setInvestigationForm({...investigationForm, resources_allocated: e.target.value})}
            />

            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900">
                {selectedInvestigation ? 'Update' : 'Create'} Investigation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}