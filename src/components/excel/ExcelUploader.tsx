'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { parseAssessmentExcel, parseExitSurveyExcel, ExcelImportPreview } from '@/lib/excel/parser';

interface ExcelUploaderProps {
  assessmentType: 'CIA' | 'ESE' | 'COURSE_EXIT_SURVEY';
  onParsedPreview: (preview: ExcelImportPreview, file: File) => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({ assessmentType, onParsedPreview }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processSelectedFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErrorMsg('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      let preview: ExcelImportPreview;

      if (assessmentType === 'COURSE_EXIT_SURVEY') {
        preview = parseExitSurveyExcel(buffer);
      } else {
        preview = parseAssessmentExcel(buffer, assessmentType);
      }

      setIsLoading(false);
      onParsedPreview(preview, file);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to parse uploaded Excel file. Please check file structure.');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Upload {assessmentType} Assessment Spreadsheet</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            File must contain Student ID Number and Student Name columns. Student ID will be used for primary matching.
          </p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && processSelectedFile(e.target.files[0])}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <UploadCloud className="w-6 h-6" />
          </div>

          {isLoading ? (
            <div className="text-xs font-semibold text-blue-600 animate-pulse">
              Parsing Excel workbook structure...
            </div>
          ) : (
            <>
              <div className="text-sm font-semibold text-slate-700">
                Click to browse or drag and drop your Excel file here
              </div>
              <p className="text-xs text-slate-400">Supports .xlsx, .xls, .csv</p>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
