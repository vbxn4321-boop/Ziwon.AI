"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  X,
  FileCheck,
  Building2,
  FileText,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  redirectUrl?: string;
  featureBadge?: string;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  title = "AI 심층 합격 전략은 회원 전용 혜택이에요",
  subtitle = "3초 간편 로그인 후 이 공고의 HWP 첨부 서식 분석과 3-Step 합격 공략 리포트를 바로 확인해 보세요.",
  redirectUrl = "/",
  featureBadge = "✨ AI 핵심 합격 분석",
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToLogin = () => {
    onClose();
    const target = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
    router.push(target);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 transform transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Icon & Badge */}
        <div className="flex items-center space-x-2.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              {featureBadge}
            </span>
          </div>
        </div>

        {/* Headline & Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Benefits Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-start space-x-2.5 text-xs text-slate-700">
            <div className="w-5 h-5 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck className="w-3 h-3" />
            </div>
            <span>
              <strong>HWP/PDF 첨부 서식 바이너리 파싱</strong> & 공고문 전문 3-Step 합격 공략
            </span>
          </div>

          <div className="flex items-start space-x-2.5 text-xs text-slate-700">
            <div className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 className="w-3 h-3" />
            </div>
            <span>
              <strong>내 기업 맞춤 1:1 적합도 채점</strong> & 지원 자격 결격사유 사전 필터링
            </span>
          </div>

          <div className="flex items-start space-x-2.5 text-xs text-slate-700">
            <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-3 h-3" />
            </div>
            <span>
              <strong>중기부 표준 PSST 사업계획서</strong> 4대 항목 3초 자동 생성
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleGoToLogin}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-md shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <span>⚡ 3초 간편 로그인 / 회원가입</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-800 font-semibold text-xs transition-colors cursor-pointer text-center"
          >
            다음에 할게요 (공고 계속 보기)
          </button>
        </div>

        {/* Security Tag */}
        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 pt-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>카카오 · 구글 · 이메일로 3초 만에 시작 가능합니다</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;
