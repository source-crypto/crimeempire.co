import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

export default function TrendsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.15)" />
        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
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
        <Line type="monotone" dataKey="wealth" stroke="#22d3ee" strokeWidth={2} name="City Wealth" dot={{ r: 3 }} />
        <Line type="monotone" dataKey="criminal" stroke="#ef4444" strokeWidth={2} name="Criminal Payouts" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}