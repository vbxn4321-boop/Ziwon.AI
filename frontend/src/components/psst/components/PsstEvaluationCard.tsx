"use client";

import React from "react";
import { Award, CheckCircle2, AlertTriangle } from "lucide-react";
import { CanvasTheme } from "../types";

interface PsstEvaluationCardProps {
  evaluationReport: {
    score: number;
    grade: string;
    gradeDescription: string;
    breakdown?: {
      problemScore: number;
      problemFeedback: string;
      solutionScore: number;
      solutionFeedback: string;
      scaleUpScore: number;
      scaleUpFeedback: string;
      teamScore: number;
      teamFeedback: string;
    };
    strengths: string[];
    weaknesses: string[];
    expectedQuestions: {
      question: string;
      evaluationIntent: string;
      recommendedDefense: string;
    }[];
  };
  canvasTheme: CanvasTheme;
  sectionRef: React.RefObject<HTMLDivElement | null>;
}

export const PsstEvaluationCard: React.FC<PsstEvaluationCardProps> = ({
  evaluationReport,
  canvasTheme,
  sectionRef,
}) => {
  if (!evaluationReport) return null;

  return (
    <div ref={sectionRef as any} className="space-y-5 pb-4">
      <h2 className="text-xl font-extrabold text-amber-400 border-l-4 border-amber-500 pl-3 flex items-center justify-between">
        <span>5. 심사위원 모의 평가 리포트</span>
        <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
          {evaluationReport.score}점 ({evaluationReport.grade})
        </span>
      </h2>

      {/* Official Government 4-Pillar Rubric Scorecard */}
      {evaluationReport.breakdown && (
        <div
          className={`p-4 rounded-2xl border space-y-3 text-xs ${
            canvasTheme === "dark"
              ? "bg-slate-950/80 border-slate-800"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between border-b pb-2 border-slate-800">
            <span className="font-bold text-slate-200 flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>정부 공인 100점 만점 심사위원 세부 배점표</span>
            </span>
            <span className="text-amber-400 font-extrabold text-sm">
              총점 {evaluationReport.score}점 / 100점
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. Problem */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400">1. 문제 인식 (Problem)</span>
                <span className="font-extrabold text-slate-200">
                  {evaluationReport.breakdown.problemScore} / 25점
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${(evaluationReport.breakdown.problemScore / 25) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                {evaluationReport.breakdown.problemFeedback}
              </p>
            </div>

            {/* 2. Solution */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">2. 실현 가능성 (Solution)</span>
                <span className="font-extrabold text-slate-200">
                  {evaluationReport.breakdown.solutionScore} / 30점
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${(evaluationReport.breakdown.solutionScore / 30) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                {evaluationReport.breakdown.solutionFeedback}
              </p>
            </div>

            {/* 3. Scale-up */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-400">3. 성장 전략 (Scale-up)</span>
                <span className="font-extrabold text-slate-200">
                  {evaluationReport.breakdown.scaleUpScore} / 30점
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{
                    width: `${(evaluationReport.breakdown.scaleUpScore / 30) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                {evaluationReport.breakdown.scaleUpFeedback}
              </p>
            </div>

            {/* 4. Team */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">4. 팀 역량 (Team)</span>
                <span className="font-extrabold text-slate-200">
                  {evaluationReport.breakdown.teamScore} / 15점
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{
                    width: `${(evaluationReport.breakdown.teamScore / 15) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                {evaluationReport.breakdown.teamFeedback}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={`p-4 rounded-2xl border space-y-1 text-xs ${
          canvasTheme === "dark"
            ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}
      >
        <div className="font-bold">심사위원 종합 총평</div>
        <p className="leading-relaxed text-slate-300">
          {evaluationReport.gradeDescription}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className={`p-4 rounded-2xl border space-y-1.5 text-xs ${
            canvasTheme === "dark"
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="font-bold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>심사역 추천 핵심 강점</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
            {evaluationReport.strengths.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>

        <div
          className={`p-4 rounded-2xl border space-y-1.5 text-xs ${
            canvasTheme === "dark"
              ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="font-bold flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>감점 방지 보완점</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
            {evaluationReport.weaknesses.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Q&A */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-slate-200">
          💡 심사위원 대면 면접 예상 질문 & 추천 방어 논리
        </h3>
        <div className="space-y-2.5">
          {evaluationReport.expectedQuestions.map((qa, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border space-y-2 text-xs ${
                canvasTheme === "dark"
                  ? "bg-slate-950/60 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="font-bold text-slate-100">
                <span className="text-rose-400 mr-1.5">Q{idx + 1}.</span>
                {qa.question}
              </div>
              <div
                className={`p-2.5 rounded-xl border text-[11px] space-y-0.5 ${
                  canvasTheme === "dark"
                    ? "bg-blue-950/40 border-blue-500/30 text-blue-200"
                    : "bg-blue-50 border-blue-200 text-blue-950"
                }`}
              >
                <div className="font-semibold text-blue-300">
                  🛡️ 추천 답변 (의도: {qa.evaluationIntent})
                </div>
                <p className="leading-relaxed text-slate-300">{qa.recommendedDefense}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
