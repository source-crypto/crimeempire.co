import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

export default function MacroIndicatorChart({ data }) {
  const chartData = data.map((d) => ({
    name: d.indicator_name?.length > 16 ? d.indicator_name.slice(0, 14) + '…' : d.indicator_name,
    current: d.current_value || 0,
    previous: d.previous_value || 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.15)" />
        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(147,51,234,0.4)',
            borderRadius: 8,
            color: '#e2e8f0',
          }}
        />
        <Legend wrapperStyle={{ color: '#e2e8f0' }} />
        <Bar dataKey="previous" fill="#64748b" name="Previous" radius={[4, 4, 0, 0]} />
        <Bar dataKey="current" fill="#9333EA" name="Current" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}