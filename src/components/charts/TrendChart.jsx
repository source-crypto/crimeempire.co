import React from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrendChart({ data, title, type = "line", dataKey = "value", xKey = "name" }) {
  const ChartComponent = type === "line" ? LineChart : type === "area" ? AreaChart : BarChart;
  const DataComponent = type === "line" ? Line : type === "area" ? Area : Bar;

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey={xKey} 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            {type === "line" && (
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke="#f59e0b" 
                strokeWidth={3}
                dot={{ fill: '#f59e0b', r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {type === "area" && (
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke="#f59e0b" 
                fill="#fef3c7"
                strokeWidth={2}
              />
            )}
            {type === "bar" && (
              <Bar 
                dataKey={dataKey} 
                fill="#f59e0b"
                radius={[8, 8, 0, 0]}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}