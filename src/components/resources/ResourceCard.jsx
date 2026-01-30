import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, Phone, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function ResourceCard({ resource, onClick }) {
  const statusColors = {
    available: "bg-emerald-500 text-white",
    on_duty: "bg-blue-500 text-white",
    assigned: "bg-amber-500 text-slate-900",
    off_duty: "bg-slate-400 text-white",
    unavailable: "bg-red-500 text-white"
  };

  const typeIcons = {
    patrol_officer: Shield,
    detective: Briefcase,
    emergency_services: Shield,
    forensics: Briefcase,
    support_staff: Briefcase
  };

  const Icon = typeIcons[resource.type] || Shield;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-white border-slate-200"
        onClick={onClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Icon className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  {resource.name}
                </CardTitle>
                <p className="text-xs text-slate-500">{resource.badge_number}</p>
              </div>
            </div>
            <Badge className={statusColors[resource.status]}>
              {resource.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Department</span>
              <span className="font-medium text-slate-900 capitalize">{resource.department}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Type</span>
              <span className="font-medium text-slate-900 capitalize">{resource.type.replace('_', ' ')}</span>
            </div>
            {resource.specialization && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Specialization</span>
                <span className="font-medium text-slate-900">{resource.specialization}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Active Cases</span>
              <span className="font-semibold text-amber-600">{resource.active_cases || 0}</span>
            </div>
            {resource.location && (
              <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-200">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="text-slate-600">{resource.location}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}