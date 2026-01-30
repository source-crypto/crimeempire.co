import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, MapPin, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function ReportCard({ report, onClick }) {
  const severityColors = {
    critical: "bg-red-500 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-yellow-500 text-slate-900",
    low: "bg-emerald-500 text-white"
  };

  const statusColors = {
    new: "bg-blue-500 text-white",
    assigned: "bg-purple-500 text-white",
    investigating: "bg-amber-500 text-slate-900",
    resolved: "bg-emerald-500 text-white",
    closed: "bg-slate-500 text-white"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-200 bg-white"
        onClick={onClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-slate-900">
                {report.title}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                #{report.incident_number || report.id?.slice(0, 8)}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className={severityColors[report.severity]}>
                {report.severity}
              </Badge>
              <Badge className={statusColors[report.status]}>
                {report.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 mb-4 line-clamp-2">
            {report.description}
          </p>
          <div className="flex flex-col gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{report.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(report.incident_date), 'MMM d, yyyy HH:mm')}</span>
            </div>
            {report.reporter_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{report.reporter_name}</span>
              </div>
            )}
          </div>
          {report.priority_score && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">AI Priority Score</span>
                <span className="font-semibold text-amber-600">{report.priority_score}/100</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}