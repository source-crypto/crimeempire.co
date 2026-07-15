import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const PATH_LABELS = {
  corporate: 'Corporate',
  logistics: 'Logistics',
  security: 'Security',
  government: 'Government',
  entrepreneurship: 'Entrepreneur',
};

export default function CareerSalaryChart({ data }) {
  const chartData = data.map((d) => ({
    path: PATH_LABELS[d.path] || d.path,
    avgSalary: d.avgSalary,
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.15)" />
        <XAxis dataKey="path" stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(147,51,234,0.4)',
            borderRadius: 8,
            color: '#e2e8f0',
          }}
        />
        <Bar dataKey="avgSalary" fill="#22d3ee" name="Avg Salary" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}