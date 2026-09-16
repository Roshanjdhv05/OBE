'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export interface AttainmentChartData {
  coCode: string;
  ciaAttainment?: number;
  eseAttainment?: number;
  directAttainment?: number;
  indirectAttainment?: number;
  finalAttainment?: number;
}

interface AttainmentChartProps {
  title: string;
  data: AttainmentChartData[];
  type?: 'direct_indirect' | 'final' | 'cia_ese';
}

export const AttainmentChart: React.FC<AttainmentChartProps> = ({
  title,
  data,
  type = 'final',
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="coCode" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Target 50%', fill: '#f59e0b', fontSize: 10 }} />

            {type === 'cia_ese' && (
              <>
                <Bar dataKey="ciaAttainment" name="CIA Attainment %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="eseAttainment" name="ESE Attainment %" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </>
            )}

            {type === 'direct_indirect' && (
              <>
                <Bar dataKey="directAttainment" name="Direct Attainment %" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="indirectAttainment" name="Indirect Exit Survey %" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </>
            )}

            {type === 'final' && (
              <Bar dataKey="finalAttainment" name="Final CO Attainment %" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
