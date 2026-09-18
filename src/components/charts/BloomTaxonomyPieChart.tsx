'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Brain, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface CORecordForBloom {
  coCode: string;
  coDesc?: string;
  finalPct?: number;
  ciaPct?: number;
  esePct?: number;
  directPct?: number;
}

interface BloomTaxonomyPieChartProps {
  title?: string;
  coRecords: CORecordForBloom[];
  subtitle?: string;
}

export interface BloomLevelSummary {
  level: string;        // 'K1', 'K2', ...
  name: string;         // 'Remember', 'Understand', ...
  fullName: string;     // 'K1: Remember'
  coCode: string;       // 'CO1'
  attainmentPct: number;// 0..100
  coCount: number;
  isMissing: boolean;
  color: string;
}

const BLOOM_LEVELS_CONFIG = [
  { level: 'K1', name: 'Remember', coCode: 'CO1', fullName: 'K1: Remember', color: '#10b981', keywords: ['remember', 'recall', 'define', 'list', 'state'] },
  { level: 'K2', name: 'Understand', coCode: 'CO2', fullName: 'K2: Understand', color: '#3b82f6', keywords: ['understand', 'explain', 'describe', 'discuss'] },
  { level: 'K3', name: 'Apply', coCode: 'CO3', fullName: 'K3: Apply', color: '#6366f1', keywords: ['apply', 'demonstrate', 'calculate', 'solve', 'use'] },
  { level: 'K4', name: 'Analyze', coCode: 'CO4', fullName: 'K4: Analyze', color: '#a855f7', keywords: ['analyse', 'analyze', 'compare', 'contrast', 'examine'] },
  { level: 'K5', name: 'Evaluate', coCode: 'CO5', fullName: 'K5: Evaluate', color: '#f59e0b', keywords: ['evaluate', 'assess', 'judge', 'critique'] },
  { level: 'K6', name: 'Create', coCode: 'CO6', fullName: 'K6: Create', color: '#f43f5e', keywords: ['create', 'design', 'construct', 'develop', 'plan'] },
];

export const BloomTaxonomyPieChart: React.FC<BloomTaxonomyPieChartProps> = ({
  title = "Bloom's Taxonomy CO Attainment Distribution (K1 to K6)",
  coRecords,
  subtitle,
}) => {
  // Compute Bloom's level summaries ensuring ALL 6 levels (K1..K6) are present
  const levelSummaries: BloomLevelSummary[] = BLOOM_LEVELS_CONFIG.map((cfg, index) => {
    // Find matching COs for this level
    const matchedCOs = coRecords.filter((r) => {
      if (!r.coCode) return false;
      const cleanCode = r.coCode.toUpperCase().trim();
      // Direct match by CO code (e.g. CO1, CO-1) or K level (e.g. K1)
      if (cleanCode === cfg.coCode || cleanCode === cfg.level) return true;
      if (cleanCode.endsWith(String(index + 1))) return true;

      // Match by description keyword if available
      if (r.coDesc) {
        const descLower = r.coDesc.toLowerCase();
        if (cfg.keywords.some((kw) => descLower.includes(kw))) return true;
      }

      return false;
    });

    if (matchedCOs.length > 0) {
      // Calculate average attainment
      const validPcts = matchedCOs
        .map((r) => r.finalPct ?? r.directPct ?? r.ciaPct ?? r.esePct)
        .filter((p): p is number => p !== undefined && p !== null);

      const avgPct =
        validPcts.length > 0
          ? Number((validPcts.reduce((a, b) => a + b, 0) / validPcts.length).toFixed(1))
          : 0;

      return {
        level: cfg.level,
        name: cfg.name,
        fullName: cfg.fullName,
        coCode: cfg.coCode,
        attainmentPct: avgPct,
        coCount: matchedCOs.length,
        isMissing: false,
        color: cfg.color,
      };
    }

    // Missing CO level -> mandatory 0%
    return {
      level: cfg.level,
      name: cfg.name,
      fullName: cfg.fullName,
      coCode: cfg.coCode,
      attainmentPct: 0,
      coCount: 0,
      isMissing: true,
      color: cfg.color,
    };
  });

  // Prepare Pie Chart data:
  // Recharts needs positive values to render slices properly.
  // If value is 0%, we set sliceValue = 0.0001 so it remains in legend & data list with 0% displayed.
  const pieData = levelSummaries.map((s) => ({
    name: `${s.fullName} (${s.attainmentPct}%)`,
    shortName: s.fullName,
    value: s.attainmentPct > 0 ? s.attainmentPct : 0.0001,
    actualPct: s.attainmentPct,
    coCode: s.coCode,
    isMissing: s.isMissing,
    coCount: s.coCount,
    color: s.color,
  }));

  const totalCOsEvaluated = coRecords.length;
  const missingCount = levelSummaries.filter((s) => s.isMissing).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {totalCOsEvaluated} Total CO(s) Evaluated
          </span>
          {missingCount > 0 && (
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {missingCount} Level(s) 0% (Missing COs)
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Pie Chart + 6 Level Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Recharts Pie Chart (7 Cols) */}
        <div className="lg:col-span-7 h-72 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                label={({ shortName, actualPct }) => `${shortName}: ${actualPct}%`}
                labelLine={false}
              >
                {pieData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.isMissing ? '#e2e8f0' : entry.color}
                    stroke={entry.isMissing ? '#cbd5e1' : entry.color}
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1">
                        <div className="font-bold flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: data.color }}
                          ></span>
                          <span>{data.shortName}</span>
                        </div>
                        <div className="text-slate-300">
                          Attainment Score:{' '}
                          <strong className="text-white font-mono">{data.actualPct}%</strong>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Mapped CO: <span className="font-mono text-amber-300">{data.coCode}</span> ({data.coCount} record(s))
                        </div>
                        {data.isMissing && (
                          <div className="text-amber-400 font-semibold text-[10px] pt-1">
                            ⚠ No CO mapped for this Bloom level (Default 0%)
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Level Breakdown Cards (5 Cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
          {levelSummaries.map((s) => (
            <div
              key={s.level}
              className={`p-3 rounded-xl border transition-all ${
                s.isMissing
                  ? 'bg-slate-50/80 border-slate-200 text-slate-400'
                  : 'bg-white border-slate-200 shadow-2xs hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-md text-white uppercase"
                  style={{ backgroundColor: s.isMissing ? '#94a3b8' : s.color }}
                >
                  {s.level}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {s.coCode}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 truncate">{s.name}</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-base font-black font-mono ${s.isMissing ? 'text-slate-400' : 'text-slate-900'}`}>
                  {s.attainmentPct}%
                </span>
                {s.isMissing ? (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    0% (Missing)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    {s.coCount} CO
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
