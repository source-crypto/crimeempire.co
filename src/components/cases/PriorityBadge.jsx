import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, Flame } from "lucide-react";

export default function PriorityBadge({ priority }) {
    const priorityConfig = {
        low: { 
            label: "Low", 
            className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
            icon: Info
        },
        medium: { 
            label: "Medium", 
            className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
            icon: AlertCircle
        },
        high: { 
            label: "High", 
            className: "bg-orange-500/20 text-orange-300 border-orange-500/30",
            icon: AlertTriangle
        },
        critical: { 
            label: "Critical", 
            className: "bg-red-500/20 text-red-300 border-red-500/30",
            icon: Flame
        }
    };

    const config = priorityConfig[priority] || priorityConfig.medium;
    const Icon = config.icon;

    return (
        <Badge variant="outline" className={`${config.className} font-medium flex items-center gap-1`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </Badge>
    );
}