"use client";

import React from "react";
import { SlidersHorizontal, Target, Sparkles, AlertTriangle, Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { PsstFormData } from "../types";
import { TARGET_PROGRAM_FORMATS } from "../constants";

interface PsstFormPanelProps {
  formData: PsstFormData;
  setFormData: React.Dispatch<React.SetStateAction<PsstFormData>>;
  isGenerating: boolean;
  errorMessage: string | null;
  onGenerateFromForm: (e?: React.FormEvent) => void;
  userCompany?: any;
  onPrefillFromCompany?: () => void;
}

export const PsstFormPanel: React.FC<PsstFormPanelProps> = ({
  formData,
  setFormData,
  isGenerating,
  errorMessage,
  onGenerateFromForm,
  userCompany,
  onPrefillFromCompany,
}) => {
  return (
    <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
      {/* 1. Company Profile Auto-Integration Banner */}
      {userCompany?.name && (
        <div className="bg-gradient-to-r from-blue-950/50 via-indigo-950/40 to-slate-900 border border-blue-500/30 rounded-2xl p-3.5 space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-bold text-xs text-white">[{userCompany.name}] 기업 프로필 자동 연동됨</span>
                <p className="text-[10.5px] text-blue-200/80">업종, 핵심 아이템, 우대 가점이 폼에 자동 입력되었습니다.</p>
              </div>
            </div>

            {onPrefillFromCompany && (
              <button
                type="button"
                onClick={onPrefillFromCompany}
                className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-[10.5px] font-semibold transition-all cursor-pointer"
                title="등록된 기업 정보로 다시 채우기"
              >
                다시 채우기
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onGenerateFromForm()}
            disabled={isGenerating}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : "text-amber-300"}`} />
            <span>{isGenerating ? "AI가 사업계획서를 작성하는 중..." : "🚀 내 기업 맞춤 초안 원클릭 즉시 생성"}</span>
          </button>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-slate-200 flex items-center space-x-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>초고속 폼 정보 입력 & 검토</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            * 각 항목을 수정하여 맞춤 첨삭이 가능합니다.
          </span>
        </div>

        {/* Form Inputs with Transparent ex) Placeholders */}
        <div className="space-y-3 text-[11px]">
          {/* Official Standard Target Format Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold flex items-center space-x-1">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>🏛️ 목표 지원사업 공인 서식 선택</span>
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">중기부·창진원 공인</span>
            </div>
            <select
              value={formData.targetProgramTitle}
              onChange={(e) => setFormData({ ...formData, targetProgramTitle: e.target.value })}
              className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2.5 text-slate-100 text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              {TARGET_PROGRAM_FORMATS.map((fmt) => (
                <option key={fmt.id} value={fmt.name} className="bg-slate-900 text-slate-200 py-1">
                  [{fmt.badge}] {fmt.name}
                </option>
              ))}
            </select>
            {TARGET_PROGRAM_FORMATS.find((f) => f.name === formData.targetProgramTitle)?.description && (
              <p className="text-[10.5px] text-amber-300/80 pl-1 pt-0.5 font-medium">
                💡 {TARGET_PROGRAM_FORMATS.find((f) => f.name === formData.targetProgramTitle)?.description}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">👤 대표자 / 기업명</span>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="ex) (주)지윈에이아이 또는 홍길동 대표 (예비창업자)"
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">💡 창업 아이템명</span>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              placeholder="ex) Vision AI 기반 노지·시설원예 병해충 조기 감지 및 지능형 환경제어 솔루션"
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-blue-300 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">산업 분야</span>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="ex) 스마트농업 / AgTech / AI"
                disabled={isGenerating}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">사업 예산 규모</span>
              <input
                type="text"
                value={formData.budget || ""}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="ex) 약 50,000,000원 (정부지원 70% + 자부담 30%)"
                disabled={isGenerating}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">🎯 주요 타겟 고객</span>
            <input
              type="text"
              value={formData.targetCustomer || ""}
              onChange={(e) => setFormData({ ...formData, targetCustomer: e.target.value })}
              placeholder="ex) 3,000평 이상 고소득 시설원예 농가 및 스마트팜 도입 희망 청년농"
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">📝 사업 내용 & 개발 필요성</span>
            <textarea
              rows={4}
              value={formData.itemDescription}
              onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
              placeholder="ex) 기존 외산 스마트팜 장비는 수천만 원의 고가로 진입장벽이 높고 조작이 복잡합니다. 본 아이템은 저비용 IoT 센서와 카메라 영상 분석을 결합하여, 모바일 앱으로 작물 생육 상태를 실시간 진단하고 최적의 환기·급수를 자동 제어하는 농가 맞춤형 솔루션입니다."
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed text-[11px] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">🚀 핵심 기술 및 차별화 강점</span>
            <input
              type="text"
              value={formData.coreStrengths}
              onChange={(e) => setFormData({ ...formData, coreStrengths: e.target.value })}
              placeholder="ex) 95% 정확도의 농작물 질병 경량 딥러닝 모델, LoRa 기반 5km 장거리 저전력 통신, 기존 외산 대비 도입 단가 70% 절감"
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => onGenerateFromForm()}
          disabled={isGenerating}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
          <span>{isGenerating ? "AI가 PSST 문서를 작성 중입니다..." : "초고속 PSST 사업계획서 생성하기"}</span>
        </button>
      </div>
    </div>
  );
};
