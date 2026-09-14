"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

interface RawSourceTabProps {
  sources: any[];
}

export const RawSourceTab: React.FC<RawSourceTabProps> = ({ sources }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <h3 className="font-extrabold text-slate-900 text-sm">공공기관 원문 출처 링크</h3>
      <div className="space-y-3">
        {sources.map((src, idx) => (
          <div
            key={src.id ? `${src.id}-${idx}` : idx}
            className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {src.sourceType}
                </span>
                <span className="font-semibold text-slate-800">{src.rawTitle}</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-xl">{src.sourceUrl}</p>
            </div>
            <a
              href={src.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center space-x-1 flex-shrink-0 font-bold shadow-2xs"
            >
              <span>원문 열기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
