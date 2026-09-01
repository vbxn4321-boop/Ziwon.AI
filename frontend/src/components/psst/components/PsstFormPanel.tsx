"use client";

import React, { useMemo } from "react";
import {
  SlidersHorizontal,
  Target,
  Sparkles,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Info,
  ClipboardCopy,
  Lightbulb,
} from "lucide-react";
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

// Per-format field config: which fields are relevant and their hint
type FieldConfig = {
  show: boolean;
  required: boolean;
  tip?: string;
};

type FormatFieldMap = {
  itemDescription: FieldConfig;
  coreStrengths: FieldConfig;
  targetCustomer: FieldConfig;
  budget: FieldConfig;
};

const FORMAT_FIELD_CONFIG: Record<string, FormatFieldMap> = {
  "pre-startup": {
    itemDescription: { show: true, required: true, tip: "문제인식, MVP 검증 계획, 아이디어 차별점 중심으로 서술하세요." },
    coreStrengths: { show: true, required: true, tip: "보유 기술/특허/경력 등 대표자 역량을 포함하세요." },
    targetCustomer: { show: true, required: true, tip: "구체적인 목표 고객군(연령, 지역, 직업 등)을 정의하세요." },
    budget: { show: false, required: false },
  },
  "early-startup": {
    itemDescription: { show: true, required: true, tip: "시장 진입 현황, 초기 매출/고객, 성장 가능성을 중심으로 서술하세요." },
    coreStrengths: { show: true, required: true, tip: "경쟁사 대비 기술/서비스 차별성을 구체적 수치로 표현하세요." },
    targetCustomer: { show: true, required: true },
    budget: { show: true, required: true, tip: "자부담 비율(30%)과 지원금 집행 계획을 명시하세요." },
  },
  "r-and-d": {
    itemDescription: { show: true, required: true, tip: "기술 개발 목표(정량적 성능 수치), 개발 로드맵, 핵심 기술 사양을 포함하세요." },
    coreStrengths: { show: true, required: true, tip: "보유 특허·논문·선행연구 실적을 반드시 기재하세요 (가점 요인)." },
    targetCustomer: { show: false, required: false },
    budget: { show: true, required: true, tip: "R&D 비목별 사용계획(인건비, 연구재료비 등)을 구체적으로 입력하세요." },
  },
  "scaleup-leap": {
    itemDescription: { show: true, required: true, tip: "기존 매출 실적, 해외 진출 계획, 글로벌 시장 전략 중심으로 서술하세요." },
    coreStrengths: { show: true, required: true },
    targetCustomer: { show: true, required: false, tip: "국내외 목표 고객/파트너사 및 계약 현황을 기재하면 가점입니다." },
    budget: { show: true, required: true },
  },
  "local-business": {
    itemDescription: { show: true, required: true, tip: "지역 내 BM 혁신 방안, 로컬 커뮤니티 기여도, 차별화 요소를 설명하세요." },
    coreStrengths: { show: true, required: true },
    targetCustomer: { show: true, required: true },
    budget: { show: false, required: false },
  },
  "kibo-shinbo": {
    itemDescription: { show: true, required: true, tip: "사업성(시장 규모, 수익성), 기술성(보유 기술/특허), 상환 가능성 순으로 서술하세요." },
    coreStrengths: { show: true, required: true },
    targetCustomer: { show: false, required: false },
    budget: { show: true, required: true, tip: "연도별 매출 추정, 자금 소요 계획, 대출 상환 일정을 구체적으로 기재하세요." },
  },
  "youth-academy": {
    itemDescription: { show: true, required: true, tip: "시제품/프로토타입 완성도, 양산 체계 계획, 기술 사업화 로드맵 위주로 작성하세요." },
    coreStrengths: { show: true, required: true },
    targetCustomer: { show: true, required: false },
    budget: { show: true, required: false },
  },
};

const DEFAULT_FIELD_CONFIG: FormatFieldMap = {
  itemDescription: { show: true, required: true },
  coreStrengths: { show: true, required: true },
  targetCustomer: { show: true, required: false },
  budget: { show: true, required: false },
};

export const PsstFormPanel: React.FC<PsstFormPanelProps> = ({
  formData,
  setFormData,
  isGenerating,
  errorMessage,
  onGenerateFromForm,
  userCompany,
  onPrefillFromCompany,
}) => {
  const selectedFormat = TARGET_PROGRAM_FORMATS.find(
    (f) => f.name === formData.targetProgramTitle
  );

  const fieldConfig = useMemo<FormatFieldMap>(() => {
    const key = selectedFormat?.id || "";
    return FORMAT_FIELD_CONFIG[key] || DEFAULT_FIELD_CONFIG;
  }, [selectedFormat]);

  const filledCount = [
    formData.companyName,
    formData.itemName,
    formData.industry,
    formData.itemDescription,
    formData.coreStrengths,
  ].filter(Boolean).length;

  const readyToGenerate =
    (formData.itemName || "").trim().length > 0 &&
    (formData.itemDescription || "").trim().length > 0;

  return (
    <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
      {/* 1. Target Format Picker */}
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center space-x-2 mb-1">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-extrabold text-amber-300">목표 지원사업 공인 서식 선택</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
            중기부·창진원 공인
          </span>
        </div>

        <div className="relative">
          <select
            value={formData.targetProgramTitle}
            onChange={(e) => setFormData({ ...formData, targetProgramTitle: e.target.value })}
            className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2.5 text-slate-100 text-xs font-bold focus:outline-none focus:border-amber-400 transition-colors cursor-pointer appearance-none pr-8"
            disabled={isGenerating}
          >
            {TARGET_PROGRAM_FORMATS.map((fmt) => (
              <option key={fmt.id} value={fmt.name} className="bg-slate-900 text-slate-200 py-1">
                [{fmt.badge}] {fmt.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
        </div>

        {selectedFormat?.description && (
          <div className="flex items-start space-x-1.5 text-[11px] text-amber-300/80 font-medium bg-amber-950/30 border border-amber-500/20 rounded-xl px-3 py-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>{selectedFormat.description}</span>
          </div>
        )}

        {/* Fill Progress */}
        <div className="flex items-center space-x-2">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
              style={{ width: `${(filledCount / 5) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-bold flex-shrink-0">
            {filledCount}/5 항목 입력
          </span>
        </div>
      </div>

      {/* 2. Program Analysis Context Banner — shown when linked from a notice */}
      {formData.programAnalysis && (
        <div className="bg-gradient-to-br from-indigo-950/80 via-blue-950/60 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="text-xs font-extrabold text-indigo-200">공고 맞춤 AI 전략 연동됨</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-bold">
              이 공고에 특화된 PSST 작성 활성화
            </span>
          </div>

          {/* Organizer Strategy */}
          {formData.programAnalysis.organizerStrategy && (
            <div className="text-[11px] bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 space-y-1">
              <p className="text-indigo-300 font-bold">{formData.programAnalysis.organizerStrategy.organizerName}</p>
              <p className="text-slate-300 leading-relaxed">
                <span className="text-blue-400 font-semibold">핵심 KPI:</span> {formData.programAnalysis.organizerStrategy.coreObjective}
              </p>
              <p className="text-slate-400 leading-relaxed">
                <span className="text-amber-400 font-semibold">공략 전략:</span> {formData.programAnalysis.organizerStrategy.strategyTip}
              </p>
            </div>
          )}

          {/* Evaluation Criteria Score Bars */}
          {(formData.programAnalysis.evaluationCriteria?.items?.length || 0) > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-bold text-slate-400 block">📊 심사 배점 기준 (AI가 이 비중으로 작성)</span>
              {formData.programAnalysis.evaluationCriteria!.items!.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[10.5px]">
                  <span className="text-slate-300 min-w-0 flex-1 truncate" title={item.category}>{item.category}</span>
                  <span className="text-indigo-300 font-bold flex-shrink-0">{item.scoreWeight}</span>
                </div>
              ))}
            </div>
          )}

          {/* Extra Points hint */}
          {(formData.programAnalysis.extraPoints?.items?.length || 0) > 0 && (
            <div className="flex items-start space-x-1.5 text-[10.5px] text-emerald-300/90 bg-emerald-950/30 border border-emerald-700/30 rounded-xl px-2.5 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>가점 요건: {formData.programAnalysis.extraPoints!.items.slice(0, 2).join(" / ")}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Company Auto-Fill Banner */}
      {userCompany?.name && (
        <div className="bg-blue-950/50 border border-blue-500/30 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-xs text-blue-100 block">{userCompany.name} 기업 프로필 연동됨</span>
              <span className="text-[10.5px] text-blue-300/80">기업 정보가 아래 폼에 자동 채워졌습니다.</span>
            </div>
          </div>
          {onPrefillFromCompany && (
            <button
              type="button"
              onClick={onPrefillFromCompany}
              className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-[10.5px] font-semibold transition-all cursor-pointer flex-shrink-0"
            >
              다시 채우기
            </button>
          )}
        </div>
      )}

      {/* 4. Section: 기본 정보 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-bold text-slate-200 text-xs">기본 정보 입력</span>
          <span className="text-[10px] text-slate-500 ml-auto">* 필수 항목</span>
        </div>

        <div className="space-y-1">
          <label className="text-slate-400 font-semibold flex items-center space-x-1">
            <span>👤 대표자 / 기업명</span>
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="ex) (주)지윈에이아이 또는 홍길동 대표 (예비창업자)"
            disabled={isGenerating}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold flex items-center space-x-1">
              <span>💡 창업 아이템명</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              placeholder="ex) Vision AI 기반 노지·시설원예 병해충 조기 감지 솔루션"
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-blue-300 font-bold placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">🏭 산업 분야</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="ex) 스마트농업 / AgTech / AI / 핀테크"
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Section: 사업 내용 & 개발 필요성 — shown conditionally */}
        {fieldConfig.itemDescription.show && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="text-slate-300 font-bold text-xs flex items-center space-x-1.5">
              <span>📝 사업 내용 & 개발 필요성</span>
              {fieldConfig.itemDescription.required && <span className="text-rose-400">*</span>}
            </label>
            {fieldConfig.itemDescription.tip && (
              <div className="flex items-start space-x-1.5 text-[10.5px] text-blue-300/80 bg-blue-950/30 border border-blue-700/30 rounded-xl px-2.5 py-2">
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{fieldConfig.itemDescription.tip}</span>
              </div>
            )}
            <textarea
              rows={4}
              value={formData.itemDescription}
              onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
              placeholder="ex) 기존 외산 스마트팜 장비는 수천만 원의 고가로 진입장벽이 높습니다. 본 아이템은 저비용 IoT 센서와 AI 영상 분석을 결합하여 농가 맞춤형 솔루션을 제공합니다."
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed transition-colors resize-none"
            />
          </div>
        )}

        {/* Section: 핵심 기술 & 차별화 */}
        {fieldConfig.coreStrengths.show && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="text-slate-300 font-bold text-xs flex items-center space-x-1.5">
              <span>🚀 핵심 기술 및 차별화 강점</span>
              {fieldConfig.coreStrengths.required && <span className="text-rose-400">*</span>}
            </label>
            {fieldConfig.coreStrengths.tip && (
              <div className="flex items-start space-x-1.5 text-[10.5px] text-blue-300/80 bg-blue-950/30 border border-blue-700/30 rounded-xl px-2.5 py-2">
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{fieldConfig.coreStrengths.tip}</span>
              </div>
            )}
            <input
              type="text"
              value={formData.coreStrengths}
              onChange={(e) => setFormData({ ...formData, coreStrengths: e.target.value })}
              placeholder="ex) 95% 정확도의 경량 딥러닝 모델, 기존 외산 대비 단가 70% 절감, 특허 출원 2건"
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* Section: 타겟 고객 (optional by format) */}
        {fieldConfig.targetCustomer.show && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="text-slate-300 font-bold text-xs flex items-center space-x-1.5">
              <span>🎯 주요 타겟 고객</span>
              {!fieldConfig.targetCustomer.required && (
                <span className="text-[10px] text-slate-500 font-medium">(선택)</span>
              )}
            </label>
            {fieldConfig.targetCustomer.tip && (
              <div className="flex items-start space-x-1.5 text-[10.5px] text-blue-300/80 bg-blue-950/30 border border-blue-700/30 rounded-xl px-2.5 py-2">
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{fieldConfig.targetCustomer.tip}</span>
              </div>
            )}
            <input
              type="text"
              value={formData.targetCustomer || ""}
              onChange={(e) => setFormData({ ...formData, targetCustomer: e.target.value })}
              placeholder="ex) 3,000평 이상 시설원예 농가 및 스마트팜 도입 희망 청년농"
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* Section: 사업 예산 (optional by format) */}
        {fieldConfig.budget.show && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="text-slate-300 font-bold text-xs flex items-center space-x-1.5">
              <span>💰 사업 예산 규모</span>
              {!fieldConfig.budget.required && (
                <span className="text-[10px] text-slate-500 font-medium">(선택)</span>
              )}
            </label>
            {fieldConfig.budget.tip && (
              <div className="flex items-start space-x-1.5 text-[10.5px] text-blue-300/80 bg-blue-950/30 border border-blue-700/30 rounded-xl px-2.5 py-2">
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{fieldConfig.budget.tip}</span>
              </div>
            )}
            <input
              type="text"
              value={(formData as any).budget || ""}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value } as any)}
              placeholder="ex) 정부지원금 3,500만원 + 자부담 1,500만원 (합계 5,000만원)"
              disabled={isGenerating}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={() => onGenerateFromForm()}
          disabled={isGenerating || !readyToGenerate}
          className={`w-full py-3.5 rounded-2xl text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-40 ${
            readyToGenerate
              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-600/30"
              : "bg-slate-700 cursor-not-allowed"
          }`}
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? "animate-spin" : "text-amber-300"}`} />
          <span>
            {isGenerating
              ? "AI가 PSST 사업계획서를 작성하는 중..."
              : readyToGenerate
              ? "🚀 AI 사업계획서 초안 생성하기"
              : "아이템명과 사업 내용을 먼저 입력해 주세요"}
          </span>
        </button>

        {/* How-to-use reminder: copy to HWP */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-3.5 space-y-2">
          <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
            <ClipboardCopy className="w-3.5 h-3.5 text-blue-400" />
            <span>완성 후 사용 방법</span>
          </span>
          <ol className="space-y-1.5 text-[10.5px] text-slate-400 leading-relaxed list-none">
            <li className="flex items-start space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <span><strong className="text-slate-300">AI 초안 생성</strong> 후 우측 미리보기 화면에서 내용 확인 및 직접 편집</span>
            </li>
            <li className="flex items-start space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <span>상단 <strong className="text-blue-300">[전문 복사]</strong> 버튼으로 전체 내용 클립보드 복사</span>
            </li>
            <li className="flex items-start space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <span>공식 한글(.hwp) 서식 파일을 열고 해당 항목에 <strong className="text-slate-300">붙여넣기(Ctrl+V)</strong></span>
            </li>
          </ol>
        </div>
    </div>
  );
};
