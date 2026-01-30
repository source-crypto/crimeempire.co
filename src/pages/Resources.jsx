import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Package, FileText, BarChart } from "lucide-react";
import ResourceCard from "../components/resources/ResourceCard";
import TaskManager from "../components/resources/TaskManager";
import InvestigationManager from "../components/resources/InvestigationManager";
import ResourceAllocation from "../components/resources/ResourceAllocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Resources() {
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [resourceForm, setResourceForm] = useState({
    name: "",
    badge_number: "",
    type: "patrol_officer",
    department: "patrol",
    status: "available",
    contact: "",
    specialization: "",
    location: ""
  });

  const [equipmentForm, setEquipmentForm] = useState({
    name: "",
    asset_id: "",
    type: "vehicle",
    status: "available",
    condition: "good",
    location: ""
  });

  const queryClient = useQueryClient();

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 50),
  });

  const { data: investigations = [] } = useQuery({
    queryKey: ['investigations'],
    queryFn: () => base44.entities.Investigation.list(),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['crimeReports'],
    queryFn: () => base44.entities.CrimeReport.list('-created_date', 100),
  });

  const createResourceMutation = useMutation({
    mutationFn: (data) => base44.entities.Resource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowResourceDialog(false);
      setResourceForm({
        name: "",
        badge_number: "",
        type: "patrol_officer",
        department: "patrol",
        status: "available",
        contact: "",
        specialization: "",
        location: ""
      });
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setShowEquipmentDialog(false);
      setEquipmentForm({
        name: "",
        asset_id: "",
        type: "vehicle",
        status: "available",
        condition: "good",
        location: ""
      });
    },
  });

  const filteredResources = resources.filter(r => {
    const matchesDept = filterDepartment === "all" || r.department === filterDepartment;
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesDept && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Resource Management</h1>
            <p className="text-slate-600 mt-1">Comprehensive personnel, equipment, and operations management</p>
          </div>
        </div>

        <Tabs defaultValue="allocation" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="allocation" className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              <span className="hidden sm:inline">Allocation</span>
            </TabsTrigger>
            <TabsTrigger value="personnel" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Personnel</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Equipment</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="investigations" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Investigations</span>
            </TabsTrigger>
          </TabsList>

          {/* Allocation Tab */}
          <TabsContent value="allocation" className="space-y-6 mt-6">
            <ResourceAllocation 
              resources={resources}
              tasks={tasks}
              investigations={investigations}
            />
          </TabsContent>

          {/* Personnel Tab */}
          <TabsContent value="personnel" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="patrol">Patrol</SelectItem>
                    <SelectItem value="investigations">Investigations</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="forensics">Forensics</SelectItem>
                    <SelectItem value="administration">Administration</SelectItem>
                    <SelectItem value="cybercrime">Cybercrime</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on_duty">On Duty</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="off_duty">Off Duty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => setShowResourceDialog(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Personnel
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map(resource => (
                <ResourceCard 
                  key={resource.id}
                  resource={resource}
                  onClick={() => {}}
                />
              ))}
            </div>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Button 
                onClick={() => setShowEquipmentDialog(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Equipment
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {equipment.map(item => (
                <Card key={item.id} className="bg-white border-slate-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-900">
                          {item.name}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-1">{item.asset_id}</p>
                      </div>
                      <Badge className={
                        item.status === 'available' ? 'bg-emerald-500 text-white' :
                        item.status === 'in_use' ? 'bg-amber-500 text-slate-900' :
                        item.status === 'maintenance' ? 'bg-blue-500 text-white' :
                        'bg-slate-500 text-white'
                      }>
                        {item.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Type</span>
                        <span className="font-medium text-slate-900 capitalize">{item.type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Condition</span>
                        <span className="font-medium text-slate-900 capitalize">{item.condition}</span>
                      </div>
                      {item.location && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Location</span>
                          <span className="font-medium text-slate-900">{item.location}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6 mt-6">
            <TaskManager 
              tasks={tasks}
              resources={resources}
              investigations={investigations}
            />
          </TabsContent>

          {/* Investigations Tab */}
          <TabsContent value="investigations" className="space-y-6 mt-6">
            <InvestigationManager 
              investigations={investigations}
              resources={resources}
              reports={reports}
            />
          </TabsContent>
        </Tabs>

        {/* Resource Dialog */}
        <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Personnel</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              createResourceMutation.mutate(resourceForm);
            }} className="space-y-4">
              <Input
                placeholder="Full Name"
                value={resourceForm.name}
                onChange={(e) => setResourceForm({...resourceForm, name: e.target.value})}
                required
              />
              <Input
                placeholder="Badge Number"
                value={resourceForm.badge_number}
                onChange={(e) => setResourceForm({...resourceForm, badge_number: e.target.value})}
              />
              <Select
                value={resourceForm.type}
                onValueChange={(value) => setResourceForm({...resourceForm, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patrol_officer">Patrol Officer</SelectItem>
                  <SelectItem value="detective">Detective</SelectItem>
                  <SelectItem value="emergency_services">Emergency Services</SelectItem>
                  <SelectItem value="forensics">Forensics</SelectItem>
                  <SelectItem value="support_staff">Support Staff</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={resourceForm.department}
                onValueChange={(value) => setResourceForm({...resourceForm, department: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patrol">Patrol</SelectItem>
                  <SelectItem value="investigations">Investigations</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="forensics">Forensics</SelectItem>
                  <SelectItem value="administration">Administration</SelectItem>
                  <SelectItem value="cybercrime">Cybercrime</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Contact"
                value={resourceForm.contact}
                onChange={(e) => setResourceForm({...resourceForm, contact: e.target.value})}
              />
              <Input
                placeholder="Specialization"
                value={resourceForm.specialization}
                onChange={(e) => setResourceForm({...resourceForm, specialization: e.target.value})}
              />
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
                Create Personnel
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Equipment Dialog */}
        <Dialog open={showEquipmentDialog} onOpenChange={setShowEquipmentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Equipment</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              createEquipmentMutation.mutate(equipmentForm);
            }} className="space-y-4">
              <Input
                placeholder="Equipment Name"
                value={equipmentForm.name}
                onChange={(e) => setEquipmentForm({...equipmentForm, name: e.target.value})}
                required
              />
              <Input
                placeholder="Asset ID"
                value={equipmentForm.asset_id}
                onChange={(e) => setEquipmentForm({...equipmentForm, asset_id: e.target.value})}
              />
              <Select
                value={equipmentForm.type}
                onValueChange={(value) => setEquipmentForm({...equipmentForm, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="weapon">Weapon</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="forensic_tool">Forensic Tool</SelectItem>
                  <SelectItem value="protective_gear">Protective Gear</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Location"
                value={equipmentForm.location}
                onChange={(e) => setEquipmentForm({...equipmentForm, location: e.target.value})}
              />
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
                Add Equipment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}