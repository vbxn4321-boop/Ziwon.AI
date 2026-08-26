"use client";

import React from "react";
import { Edit3, FileText } from "lucide-react";
import { PsstBusinessPlanResult } from "@/lib/ai/psst-generator";
import { CanvasTheme, PsstFormData, PsstSectionKey } from "../types";
import { SECTION_LABELS } from "../constants";
import { PsstEvaluationCard } from "./PsstEvaluationCard";

interface PsstDocumentViewerProps {
  canvasTheme: CanvasTheme;
  activeSection: PsstSectionKey;
  generatedResult: PsstBusinessPlanResult | null;
  formData: PsstFormData;
  isDirectEditing: boolean;
  setIsDirectEditing: React.Dispatch<React.SetStateAction<boolean>>;
  docScrollRef: React.RefObject<HTMLDivElement | null>;
  sectionRefs: Record<PsstSectionKey, React.RefObject<HTMLDivElement | null>>;
  onScrollToSection: (sec: PsstSectionKey) => void;
}

export const PsstDocumentViewer: React.FC<PsstDocumentViewerProps> = ({
  canvasTheme,
  activeSection,
  generatedResult,
  formData,
  isDirectEditing,
  setIsDirectEditing,
  docScrollRef,
  sectionRefs,
  onScrollToSection,
}) => {
  return (
    <div
      id="psst-document-canvas"
      className={`lg:col-span-7 flex flex-col h-full overflow-hidden relative transition-colors ${
        canvasTheme === "dark" ? "bg-slate-950 text-slate-100" : "bg-[#f1f5f9] text-slate-800"
      }`}
    >
      {/* Sheet Sub-Header */}
      <div
        className={`h-12 px-6 flex items-center justify-between flex-shrink-0 border-b ${
          canvasTheme === "dark"
            ? "bg-slate-900/90 border-slate-800 text-slate-200"
            : "bg-white border-slate-200 text-slate-800"
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs border border-blue-500/20">
            {SECTION_LABELS[activeSection] || "창업아이템 개요(요약)"}
          </span>
          {generatedResult?.evaluationReport && (
            <span className="text-[11px] text-slate-400 font-medium">
              (점수: {generatedResult.evaluationReport.score}점 · {generatedResult.evaluationReport.grade})
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsDirectEditing((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 border cursor-pointer ${
              isDirectEditing
                ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                : canvasTheme === "dark"
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isDirectEditing ? "💾 편집 완료" : "✏️ 직접편집"}</span>
          </button>
        </div>
      </div>

      {/* Document Paper Body Container */}
      <div ref={docScrollRef as any} className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6">
        {generatedResult ? (
          <div
            className={`max-w-3xl mx-auto rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 transition-colors ${
              canvasTheme === "dark"
                ? "bg-slate-900/90 border border-slate-800 text-slate-200"
                : "bg-white border border-slate-200 text-slate-900"
            }`}
          >
            {/* ── 1. Overview Section ── */}
            {generatedResult.overview && (
              <div
                ref={sectionRefs.overview as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-blue-400 border-l-4 border-blue-500 pl-3">
                    창업아이템 개요(요약)
                  </h2>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    🏛️ {formData.targetProgramTitle || "중소벤처기업부 표준 PSST"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-indigo-300">명칭</h3>
                  <p className="text-xs font-semibold pl-1">
                    <b>{generatedResult.overview.title}</b>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-indigo-300">산업 분야</h3>
                  <p className="text-xs pl-1 text-slate-300">
                    <b>{generatedResult.overview.industry}</b>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-indigo-300">아이템 핵심 개요</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.overview.itemSummary}
                  </p>
                </div>

              {/* Government Standard 2-Column Summary Table */}
              {generatedResult.overview.summaryTable && (
                <div className="space-y-2 pt-1">
                  <h3 className="text-sm font-bold text-indigo-300">📋 사업 요약 규격표</h3>
                  <div className="overflow-x-auto rounded-xl border border-indigo-500/30 bg-slate-950/70">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-indigo-950/60 text-indigo-200 border-b border-indigo-500/20 font-bold">
                        <tr>
                          <th className="p-2.5 w-28">항목 구분</th>
                          <th className="p-2.5">공식 등록 내용</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">아이템 범주</td>
                          <td className="p-2.5">{generatedResult.overview.summaryTable.itemCategory}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">주요 타겟</td>
                          <td className="p-2.5">{generatedResult.overview.summaryTable.targetUsers}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">핵심 기능</td>
                          <td className="p-2.5">{generatedResult.overview.summaryTable.coreFeature}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">수익 모델</td>
                          <td className="p-2.5">{generatedResult.overview.summaryTable.monetization}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">신청 예산</td>
                          <td className="p-2.5 font-semibold text-emerald-400">
                            {generatedResult.overview.summaryTable.targetBudget}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <h3 className="text-sm font-bold text-indigo-300">개발 배경 및 시급성</h3>
                <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                  {generatedResult.problem?.developmentNecessity}
                </p>
              </div>
            </div>
          )}

            {/* ── 2. Problem Section ── */}
            {generatedResult.problem && (
              <div
                ref={sectionRefs.problem as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <h2 className="text-xl font-extrabold text-rose-400 border-l-4 border-rose-500 pl-3">
                  {generatedResult.problem.title || "1. 문제인식 (Problem)"}
                </h2>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">1-1. 시장 및 고객의 문제점</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.problem.marketPainPoint}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">1-2. 타겟 고객의 핵심 페인포인트</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.problem.targetCustomerProblem}
                  </p>
                </div>

                {/* TAM - SAM - SOM Market Size Diagram Card */}
                {generatedResult.problem.tamSamSom && (
                  <div className="space-y-2 pt-1">
                    <h3 className="text-sm font-bold text-rose-300">📊 타겟 시장 규모 (TAM - SAM - SOM)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="text-[11px] font-bold text-blue-400">TAM (전체 시장)</div>
                        <div className="text-xs font-semibold text-slate-200 leading-relaxed">
                          {generatedResult.problem.tamSamSom.tam}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="text-[11px] font-bold text-purple-400">SAM (유효 시장)</div>
                        <div className="text-xs font-semibold text-slate-200 leading-relaxed">
                          {generatedResult.problem.tamSamSom.sam}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="text-[11px] font-bold text-emerald-400">SOM (수익 시장)</div>
                        <div className="text-xs font-semibold text-slate-200 leading-relaxed">
                          {generatedResult.problem.tamSamSom.som}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">1-3. 개발 및 사업화의 필요성과 시급성</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.problem.developmentNecessity}
                  </p>
                </div>
              </div>
            )}

            {/* ── 3. Solution Section ── */}
            {generatedResult.solution && (
              <div
                ref={sectionRefs.solution as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <h2 className="text-xl font-extrabold text-blue-400 border-l-4 border-blue-500 pl-3">
                  {generatedResult.solution.title || "2. 실현가능성 (Solution)"}
                </h2>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">2-1. 핵심 기술 및 해결 방안</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.solution.coreTechnologyAndFeatures}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">2-2. 경쟁사 대비 차별화 요소 (기술적 해자)</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.solution.competitorDifferentiation}
                  </p>
                </div>

                {/* Competitor Comparative Matrix Table */}
                {generatedResult.solution.competitorTable && generatedResult.solution.competitorTable.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-sm font-bold text-blue-300">⚔️ 경쟁 제품/대체재 비교 분석표</h3>
                    <div className="overflow-x-auto rounded-xl border border-blue-500/20 bg-slate-950/70">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-blue-950/60 text-blue-200 border-b border-blue-500/20 font-bold">
                          <tr>
                            <th className="p-2.5">비교 구분</th>
                            <th className="p-2.5 text-emerald-400 font-extrabold bg-emerald-950/30">
                              당사 솔루션 (Ziwon)
                            </th>
                            <th className="p-2.5 text-slate-300">경쟁사 A (기존 외산)</th>
                            <th className="p-2.5 text-slate-300">대체재 B</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                          {generatedResult.solution.competitorTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="p-2.5 font-bold text-blue-400 bg-slate-900/50">{row.category}</td>
                              <td className="p-2.5 font-semibold text-emerald-300 bg-emerald-950/15">{row.ourItem}</td>
                              <td className="p-2.5 text-slate-400">{row.competitorA}</td>
                              <td className="p-2.5 text-slate-400">{row.competitorB}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <h3 className="text-sm font-bold text-slate-300">2-3. 개발 및 사업화 로드맵</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.solution.implementationPlan}
                  </p>
                </div>

                {/* Q1~Q4 Development Roadmap Milestone Table */}
                {generatedResult.solution.roadmapTable && generatedResult.solution.roadmapTable.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-sm font-bold text-blue-300">🗓️ 협약 기간 내 개발 및 사업화 마일스톤 로드맵</h3>
                    <div className="overflow-x-auto rounded-xl border border-blue-500/20 bg-slate-950/70">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-blue-950/60 text-blue-200 border-b border-blue-500/20 font-bold">
                          <tr>
                            <th className="p-2.5 w-32">추진 기간</th>
                            <th className="p-2.5">목표 마일스톤</th>
                            <th className="p-2.5">주요 개발/실증 활동</th>
                            <th className="p-2.5 text-emerald-400">최종 산출물</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                          {generatedResult.solution.roadmapTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="p-2.5 font-bold text-blue-400 bg-slate-900/50">{row.quarter}</td>
                              <td className="p-2.5 font-semibold text-slate-200">{row.milestone}</td>
                              <td className="p-2.5 text-slate-400">{row.keyActivities}</td>
                              <td className="p-2.5 font-semibold text-emerald-300">{row.output}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 4. Scale-up Section ── */}
            {generatedResult.scaleUp && (
              <div
                ref={sectionRefs.scaleUp as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <h2 className="text-xl font-extrabold text-purple-400 border-l-4 border-purple-500 pl-3">
                  {generatedResult.scaleUp.title || "3. 성장전략 (Scale-up)"}
                </h2>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">3-1. 비즈니스 모델(BM) 및 수익 구조</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.scaleUp.businessModelAndRevenue}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">3-2. 초기 시장 진입 및 마케팅 전략</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.scaleUp.marketEntryAndMarketing}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">3-3. 자금 조달 및 예산 집행 계획</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.scaleUp.fundingAndBudgetPlan}
                  </p>
                </div>

                {/* Government Subsidy Budget Allocation Table */}
                {generatedResult.scaleUp.budgetTable && generatedResult.scaleUp.budgetTable.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-sm font-bold text-purple-300">💰 정부지원금 비목별 소요 예산 집행 계획표</h3>
                    <div className="overflow-x-auto rounded-xl border border-purple-500/20 bg-slate-950/70">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-purple-950/60 text-purple-200 border-b border-purple-500/20 font-bold">
                          <tr>
                            <th className="p-2.5">비목 구분</th>
                            <th className="p-2.5 text-right">집행 금액 (원)</th>
                            <th className="p-2.5 text-center">비중</th>
                            <th className="p-2.5">세부 산출 근거 및 내역</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                          {generatedResult.scaleUp.budgetTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="p-2.5 font-bold text-purple-300 bg-slate-900/50">{row.category}</td>
                              <td className="p-2.5 font-semibold text-right text-emerald-400">{row.amount}</td>
                              <td className="p-2.5 text-center font-bold text-purple-400">{row.ratio}%</td>
                              <td className="p-2.5 text-slate-400">{row.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 5. Team Section ── */}
            {generatedResult.team && (
              <div
                ref={sectionRefs.team as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <h2 className="text-xl font-extrabold text-emerald-400 border-l-4 border-emerald-500 pl-3">
                  {generatedResult.team.title || "4. 팀 구성 (Team)"}
                </h2>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">4-1. 대표자 및 핵심 팀원 보유 역량</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.team.founderAndTeamCompetency || (generatedResult.team as any).founderCompetence}
                  </p>
                </div>

              {/* Team Personnel R&R Matrix Table */}
              {generatedResult.team.memberList && generatedResult.team.memberList.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-sm font-bold text-emerald-300">👥 핵심 인력 구성 및 업무 분장 (R&R)</h3>
                  <div className="overflow-x-auto rounded-xl border border-emerald-500/20 bg-slate-950/70">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-emerald-950/60 text-emerald-200 border-b border-emerald-500/20 font-bold">
                        <tr>
                          <th className="p-2.5 w-28">직책 / 역할</th>
                          <th className="p-2.5 w-28">성명 / 구분</th>
                          <th className="p-2.5">주요 역량 및 실무 경력</th>
                          <th className="p-2.5">담당 주요 업무</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                        {generatedResult.team.memberList.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="p-2.5 font-bold text-emerald-400 bg-slate-900/50">{row.role}</td>
                            <td className="p-2.5 font-semibold text-slate-200">{row.nameOrAlias}</td>
                            <td className="p-2.5 text-slate-300">{row.competency}</td>
                            <td className="p-2.5 text-slate-400">{row.mainTask}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <h3 className="text-sm font-bold text-slate-300">4-2. 역할 분장 및 조직 구성</h3>
                <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                  {generatedResult.team.rolesAndResponsibilities}
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-300">4-3. 외부 협력 네트워크</h3>
                <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                  {generatedResult.team.collaborationNetwork}
                </p>
              </div>
            </div>
          )}

            {/* ── 6. Evaluation Report Section ── */}
            <PsstEvaluationCard
              evaluationReport={generatedResult.evaluationReport}
              canvasTheme={canvasTheme}
              sectionRef={sectionRefs.evaluation}
            />
          </div>
        ) : (
          /* Paper Sheet Empty Placeholder */
          <div className="max-w-3xl mx-auto rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4 my-auto shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-100">
                작성된 사업계획서가 이곳에 실시간으로 렌더링됩니다
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                좌측의 <b>[💬 AI 챗봇 인터뷰 모드]</b>에서 대화를 나누시거나, <b>[⚡ 퀵 폼 모드]</b>에서
                정보를 입력하고 생성 버튼을 누르면 정부 표준 PSST 한글 전문이 완성됩니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating Right Index Anchor Nav ── */}
      {generatedResult && (
        <div className="absolute right-3 top-16 flex flex-col space-y-1.5 z-20">
          <button
            type="button"
            onClick={() => onScrollToSection("overview")}
            className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[9px] shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
            title="창업아이템 개요"
          >
            개요
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("problem")}
            className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="P: 문제인식"
          >
            P
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("solution")}
            className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-blue-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="S: 실현가능성"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("scaleUp")}
            className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-purple-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="S: 성장전략"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("team")}
            className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-emerald-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="T: 팀구성"
          >
            T
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("evaluation")}
            className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 border border-slate-700 hover:bg-amber-500 hover:text-white font-bold text-[9px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="평가리포트"
          >
            평가
          </button>
        </div>
      )}
    </div>
  );
};
