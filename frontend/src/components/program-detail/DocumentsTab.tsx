"use client";

import React from "react";
import { FileText, Download } from "lucide-react";

interface DocumentsTabProps {
  sortedDocs: any[];
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ sortedDocs }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <h3 className="font-extrabold text-slate-900 text-sm">공식 첨부 서류 다운로드</h3>
      {sortedDocs.length === 0 ? (
        <p className="text-xs text-slate-500">등록된 첨부 서류가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedDocs.map((doc, idx) => (
            <div
              key={doc.id || idx}
              className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-2.5 truncate mr-2">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-semibold text-slate-800 truncate">{doc.fileName}</span>
              </div>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                download={doc.fileName}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center space-x-1 flex-shrink-0 font-bold shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>다운로드</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
