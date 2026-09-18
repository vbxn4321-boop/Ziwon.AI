"use client";

import React, { useState } from "react";
import { Check, X, Sparkles, FileText, ArrowRight } from "lucide-react";

interface PsstMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mappedPlan: {
    itemName?: string;
    itemDescription?: string;
    problemBackground?: string;
    solutionOverview?: string;
    marketAnalysis?: string;
    revenueModel?: string;
    teamBackground?: string;
    customFields?: Record<string, string>;
  } | null;
  currentFormData: any;
  onApply: (fieldsToApply: any, overwrite: boolean) => void;
}

export const PsstMappingModal: React.FC<PsstMappingModalProps> = ({
  isOpen,
  onClose,
  mappedPlan,
  currentFormData,
  onApply,
}) => {
  const [overwrite, setOverwrite] = useState(false);

  if (!isOpen || !mappedPlan) return null;

  const fieldList = [
    {
      key: "itemName",
      label: "창업 아이템명",
      extracted: mappedPlan.itemName,
      current: currentFormData.itemName,
    },
    {
      key: "itemDescription",
      label: "아이템 핵심 설명 (문제인식/개요)",
      extracted: mappedPlan.itemDescription || mappedPlan.problemBackground,
      current: currentFormData.itemDescription,
    },
    {
      key: "coreStrengths",
      label: "실현가능성 및 차별성",
      extracted: mappedPlan.solutionOverview,
      current: currentFormData.coreStrengths,
    },
    {
      key: "targetCustomer",
      label: "타깃 시장 및 성장전략",
      extracted: mappedPlan.marketAnalysis || mappedPlan.revenueModel,
      current: currentFormData.targetCustomer,
    },
  ];

  const handleConfirm = () => {
    onApply(mappedPlan, overwrite);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                기존 사업계획서 자동 항목 매핑
              </h3>
              <p className="text-xs text-slate-500">
                추출된 내용을 검토하고 작성 폼에 반영할 방식을 선택하세요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
            <span className="text-indigo-950 font-medium">
              💡 기존에 직접 입력하신 내용은 안전하게 보존됩니다.
            </span>
            <label className="flex items-center space-x-1.5 text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-slate-800">
                기존 입력 덮어쓰기
              </span>
            </label>
          </div>

          <div className="space-y-3">
            {fieldList.map((f) => {
              const hasExtracted = !!f.extracted?.trim();
              const hasCurrent = !!f.current?.trim();
              const willFill = hasExtracted && (overwrite || !hasCurrent);

              return (
                <div
                  key={f.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    willFill
                      ? "bg-slate-50/80 border-slate-200"
                      : "bg-slate-50/30 border-slate-100 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-[11px]">{f.label}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        willFill
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : hasCurrent
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {willFill
                        ? overwrite && hasCurrent
                          ? "덮어쓰기 예정"
                          : "새로 채우기"
                        : hasCurrent
                        ? "기존 내용 유지"
                        : "추출 내용 없음"}
                    </span>
                  </div>

                  <div className="text-slate-700 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-200/80 text-[11px]">
                    {f.extracted?.trim() || "(추출된 내용이 없습니다)"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{overwrite ? "덮어쓰기 적용" : "비어 있는 항목 채우기"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
