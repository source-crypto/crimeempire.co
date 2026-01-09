import React from "react";
import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ status }) {
    const statusConfig = {
        open: { label: "Open", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
        investigating: { label: "Investigating", className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
        solved: { label: "Solved", className: "bg-green-500/20 text-green-300 border-green-500/30" },
        cold_case: { label: "Cold Case", className: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
        closed: { label: "Closed", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" }
    };

    const config = statusConfig[status] || statusConfig.open;

    return (
        <Badge variant="outline" className={`${config.className} font-medium`}>
            {config.label}
        </Badge>
    );
}