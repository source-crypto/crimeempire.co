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
import { Plus, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function TaskManager({ tasks, resources, investigations }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    investigation_id: "",
    priority: "normal",
    due_date: "",
    status: "pending"
  });

  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const resetForm = () => {
    setTaskForm({
      title: "",
      description: "",
      assigned_to: "",
      investigation_id: "",
      priority: "normal",
      due_date: "",
      status: "pending"
    });
    setSelectedTask(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTask) {
      await updateTaskMutation.mutateAsync({ id: selectedTask.id, data: taskForm });
    } else {
      await createTaskMutation.mutateAsync(taskForm);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: { ...task, status: newStatus }
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'blocked': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getResourceName = (resourceId) => {
    const resource = resources.find(r => r.id === resourceId);
    return resource ? resource.name : 'Unassigned';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Task Management</h3>
        <Button 
          onClick={() => setShowDialog(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign Task
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.map(task => (
          <Card 
            key={task.id} 
            className="bg-white border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedTask(task);
              setTaskForm(task);
              setShowDialog(true);
            }}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(task.status)}
                    <h4 className="font-semibold text-slate-900">{task.title}</h4>
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={
                      task.status === 'completed' ? 'bg-emerald-500 text-white' :
                      task.status === 'in_progress' ? 'bg-blue-500 text-white' :
                      task.status === 'blocked' ? 'bg-red-500 text-white' :
                      'bg-slate-400 text-white'
                    }>
                      {task.status}
                    </Badge>
                    <Badge className={
                      task.priority === 'urgent' ? 'bg-red-500 text-white' :
                      task.priority === 'high' ? 'bg-orange-500 text-white' :
                      task.priority === 'normal' ? 'bg-blue-500 text-white' :
                      'bg-slate-400 text-white'
                    }>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-slate-700">
                      {getResourceName(task.assigned_to)}
                    </Badge>
                  </div>
                </div>
                {task.due_date && (
                  <div className="text-xs text-slate-500 ml-4">
                    Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Update Task' : 'Create Task'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Task Title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
              required
            />
            <Textarea
              placeholder="Task Description"
              value={taskForm.description}
              onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
              className="min-h-[100px]"
            />
            <Select
              value={taskForm.assigned_to}
              onValueChange={(value) => setTaskForm({...taskForm, assigned_to: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {resources.map(resource => (
                  <SelectItem key={resource.id} value={resource.id}>
                    {resource.name} - {resource.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={taskForm.investigation_id}
              onValueChange={(value) => setTaskForm({...taskForm, investigation_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to Investigation (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {investigations.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.case_number} - {inv.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <Select
                value={taskForm.priority}
                onValueChange={(value) => setTaskForm({...taskForm, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={taskForm.status}
                onValueChange={(value) => setTaskForm({...taskForm, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              type="datetime-local"
              value={taskForm.due_date}
              onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
            />

            {selectedTask && (
              <Textarea
                placeholder="Completion Notes"
                value={taskForm.completion_notes || ''}
                onChange={(e) => setTaskForm({...taskForm, completion_notes: e.target.value})}
              />
            )}

            <div className="flex gap-2">
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
                {selectedTask ? 'Update' : 'Create'} Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}