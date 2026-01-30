import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({ title, value, change, icon: Icon, color = "amber" }) {
  const colorClasses = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    red: "bg-red-50 text-red-600 border-red-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100"
  };

  const getTrendIcon = () => {
    if (!change) return <Minus className="w-4 h-4" />;
    return change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!change) return "text-slate-500";
    return change > 0 ? "text-emerald-600" : "text-red-600";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card className="bg-white border-slate-200 hover:shadow-lg transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-slate-900 mb-2">{value}</p>
              {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className="font-medium">{Math.abs(change)}%</span>
                  <span className="text-slate-500 ml-1">vs last period</span>
                </div>
              )}
            </div>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colorClasses[color]} border`}>
              <Icon className="w-7 h-7" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}