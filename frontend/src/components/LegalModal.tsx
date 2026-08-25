"use client";

import React, { useState } from "react";
import { X, ShieldCheck, FileText } from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "privacy" | "terms";
}

export default function LegalModal({ isOpen, onClose, defaultTab = "privacy" }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">84컴퍼니 · Ziwon.AI 운영 정책</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6">
          <button
            onClick={() => setActiveTab("privacy")}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === "privacy"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>개인정보 처리방침 (필수 고지)</span>
          </button>
          <button
            onClick={() => setActiveTab("terms")}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === "terms"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>서비스 이용약관</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto text-xs text-slate-300 leading-relaxed space-y-6">
          {activeTab === "privacy" ? (
            <div className="space-y-5">
              <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-300 space-y-1">
                <p className="font-semibold text-xs text-blue-200">84컴퍼니 개인정보 보호 안내</p>
                <p className="text-[11px] text-blue-300/80">
                  84컴퍼니(이하 '회사')는 개인정보보호법 및 관계 법령을 준수하며, Ziwon.AI 이용자의 개인정보를 안전하게 보호하고 최소 수집 원칙을 준수합니다.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white">제1조 (수집하는 개인정보 항목 및 수집방법)</h3>
                <div className="space-y-1.5 pl-2 text-slate-300">
                  <p>1. <strong>소셜 간편 로그인 (카카오/구글)</strong>: 소셜 고유 식별자(ID), 카카오계정(이메일), 프로필 닉네임, 프로필 사진</p>
                  <p className="text-[11px] text-slate-400 pl-2">※ 최소 수집 원칙에 따라 생일, 연령대, 성별, 전화번호, CI 등은 수집하지 않습니다.</p>
                  <p>2. <strong>직접 이메일 회원가입</strong>: 이메일 주소, 비밀번호(Bcrypt 단방향 암호화), 성명(닉네임)</p>
                  <p>3. <strong>기업 맞춤 서비스 이용 시</strong>: 기업명, 사업자등록번호, 대표자/담당자명, 사업장 소재지, 주요 업종, 기업 창업일자(업력 계산용), 최근 매출액, 근로자 수, 아이템 정보</p>
                  <p>4. <strong>자동 수집</strong>: IP 주소, 쿠키(Cookie), 서비스 이용 기록, 접속 로그</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white">제2조 (개인정보의 수집 및 이용목적)</h3>
                <div className="space-y-1.5 pl-2 text-slate-300">
                  <p>• AI 기반 맞춤형 정부지원사업 추천 및 매칭 적합도 점수 산출</p>
                  <p>• 기업 맞춤형 PSST(품목·기술·사업성·팀) 사업계획서 자동 생성 및 저장 관리</p>
                  <p>• 회원 식별, 계정 보안 관리 및 악용 방지</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white">제3조 (개인정보의 보유 및 이용기간)</h3>
                <div className="space-y-1.5 pl-2 text-slate-300">
                  <p>• 원칙적으로 <strong>회원 탈퇴 시 지체 없이 파기</strong>합니다.</p>
                  <p>• 통신비밀보호법에 따른 로그인 기록: 3개월 보관</p>
                  <p>• 전자상거래법에 따른 소비자 불만 및 분쟁처리 기록: 3년 보관</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white">제4조 (개인정보의 제3자 제공 및 위탁)</h3>
                <div className="space-y-1.5 pl-2 text-slate-300">
                  <p>• 회사는 이용자의 사전 동의 없이 개인정보를 제3자에게 제공하지 않습니다.</p>
                  <p>• <strong>Google LLC (Gemini API)</strong>: AI 사업계획서 생성 및 텍스트 분석 (비식별화 처리 데이터만 전송)</p>
                  <p>• <strong>Supabase Inc.</strong>: 데이터베이스 호스팅 및 OAuth 인증 관리</p>
                  <p>• <strong>Upstash / Redis</strong>: 토큰 및 OTP 인증 임시 세션 관리</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white">제5조 (사업자 정보 및 개인정보 보호책임자)</h3>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 text-slate-300 text-xs">
                  <p className="font-bold text-white text-sm">84컴퍼니</p>
                  <p>• 대표자: 정진아</p>
                  <p>• 사업자등록번호: 754-12-00298</p>
                  <p>• 사업장 소재지: 전남광주통합특별시 북구 첨단연신로91번길 38, 4층 402-2호(신용동)</p>
                  <p>• 개인정보 보호책임자: 정진아 (대표 / CPO)</p>
                  <p>• 고객센터 / 대표 이메일: vbxn4321@gmail.com</p>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-3.5 bg-purple-950/30 border border-purple-800/40 rounded-xl text-purple-300 space-y-1">
                <p className="font-semibold text-xs text-purple-200">Ziwon.AI 서비스 이용약관</p>
                <p className="text-[11px] text-purple-300/80">
                  본 약관은 84컴퍼니가 제공하는 Ziwon.AI 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정합니다.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white">제1조 (목적)</h3>
                <p className="text-slate-300">
                  본 약관은 84컴퍼니(이하 "회사")가 운영하는 Ziwon.AI(이하 "서비스")를 이용함에 있어 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white">제2조 (서비스의 제공 및 한계)</h3>
                <div className="space-y-1.5 pl-2 text-slate-300">
                  <p>1. 회사는 AI 기술을 활용하여 중소기업 및 스타트업 대상 정부지원사업 추천, 공고 요약, PSST 사업계획서 초안 작성 보조 서비스를 제공합니다.</p>
                  <p>2. 서비스가 제공하는 AI 분석 및 사업계획서 생성 결과는 참고용 자료이며, 정부 지원사업 선정 여부나 법적 책임을 보장하지 않습니다. 최종 서류 제출 및 검토의 책임은 이용자에게 있습니다.</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white">제3조 (회원의 의무 및 금지행위)</h3>
                <div className="space-y-1.5 pl-2 text-slate-300">
                  <p>1. 이용자는 회원가입 시 정확한 정보를 제공하여야 하며 타인의 정보를 도용하여서는 안 됩니다.</p>
                  <p>2. 회사의 서비스를 이용하여 얻은 정보를 회사의 사전 동의 없이 무단 복제, 배포, 상업적 재판매하는 행위를 금지합니다.</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white">제4조 (지식재산권)</h3>
                <p className="text-slate-300">
                  이용자가 입력한 기업 정보 및 생성된 사업계획서의 소유권은 이용자에게 있으며, 회사는 서비스 운영 및 모델 개선 목적에 한해 비식별화된 데이터로 처리할 수 있습니다.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
