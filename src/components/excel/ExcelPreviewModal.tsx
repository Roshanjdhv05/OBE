'use client';

import React from 'react';
import { ExcelImportPreview } from '@/lib/excel/parser';
import { CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet } from 'lucide-react';

interface ExcelPreviewModalProps {
  preview: ExcelImportPreview;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ExcelPreviewModal: React.FC<ExcelPreviewModalProps> = ({
  preview,
  fileName,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Import Preview — {preview.assessmentType}</h2>
              <p className="text-xs text-slate-400">File: {fileName}</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={isSubmitting} className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 disabled:opacity-50">
            ✕
          </button>
        </div>

        {/* Modal Summary Grid */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase">Valid Students</div>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{preview.validStudentsCount}</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase">COs Detected</div>
            <div className="text-xl font-bold text-blue-600 mt-1">
              {preview.detectedCOs.join(', ') || 'None'}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase">Duplicate IDs</div>
            <div className={`text-xl font-bold mt-1 flex items-center gap-1.5 ${preview.duplicates.length > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {preview.duplicates.length > 0 && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              <span>{preview.duplicates.length}</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase">Invalid Rows</div>
            <div className={`text-xl font-bold mt-1 ${preview.invalidRows.length > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {preview.invalidRows.length}
            </div>
          </div>
        </div>

        {/* Warnings & Errors */}
        {preview.duplicates.length > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Duplicate Student IDs Detected in Spreadsheet:</span>
            </div>
            <ul className="list-disc pl-6 space-y-0.5 max-h-20 overflow-y-auto">
              {preview.duplicates.map((d) => (
                <li key={d.studentId}>
                  Student ID <strong className="font-mono">{d.studentId}</strong> found on rows: {d.rows.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview Data Table */}
        <div className="flex-1 overflow-auto p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Parsed Student Records Sample (First 50 Records)
          </h3>

          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3 font-mono">Row</th>
                  <th className="p-3">Student ID</th>
                  <th className="p-3">Student Name</th>
                  {preview.detectedCOs.map((co) => (
                    <th key={co} className="p-3 text-center">{co}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                {preview.studentMarks && preview.studentMarks.slice(0, 50).map((std) => (
                  <tr key={std.rowIndex + std.studentId} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400 font-mono">{std.rowIndex}</td>
                    <td className="p-3 font-mono font-bold text-blue-700">{std.studentId}</td>
                    <td className="p-3 font-semibold text-slate-900">{std.studentName}</td>
                    {preview.detectedCOs.map((co) => (
                      <td key={co} className="p-3 text-center font-mono">
                        {std.coMarks[co]
                          ? `${std.coMarks[co].obtained} / ${std.coMarks[co].max}`
                          : '—'}
                      </td>
                    ))}
                  </tr>
                ))}

                {preview.surveyRecords && preview.surveyRecords.slice(0, 50).map((std) => (
                  <tr key={std.rowIndex + std.studentId} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400 font-mono">{std.rowIndex}</td>
                    <td className="p-3 font-mono font-bold text-blue-700">{std.studentId}</td>
                    <td className="p-3 font-semibold text-slate-900">{std.studentName}</td>
                    {preview.detectedCOs.map((co) => (
                      <td key={co} className="p-3 text-center">
                        {std.coResponses[co] ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            {std.coResponses[co].response} ({std.coResponses[co].score})
                          </span>
                        ) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Clicking import will save records to Supabase & calculate attainment.
          </span>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Saving Assessment...</span>
                </>
              ) : (
                <span>Import Valid Records ({preview.validStudentsCount})</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
