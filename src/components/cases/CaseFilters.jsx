import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function CaseFilters({ filters, onFilterChange }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                    placeholder="Search cases..."
                    value={filters.search}
                    onChange={(e) => onFilterChange({...filters, search: e.target.value})}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
            </div>

            <Select value={filters.status} onValueChange={(value) => onFilterChange({...filters, status: value})}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="solved">Solved</SelectItem>
                    <SelectItem value="cold_case">Cold Case</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(value) => onFilterChange({...filters, priority: value})}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}