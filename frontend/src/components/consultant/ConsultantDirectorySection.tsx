"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Star,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users,
  FileCheck,
  Send,
  X,
  Building2,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";

export interface ConsultantProfile {
  id: string;
  name: string;
  role: string;
  title: string;
  agencyHistory: string;
  tags: string[];
  category: "package" | "rnd" | "tips" | "policy";
  achievements: string[];
  successCount: number;
  rating: number;
  reviewCount: number;
  badge: string;
  badgeColor: string;
  avatarBg: string;
  intro: string;
}

const CONSULTANTS: ConsultantProfile[] = [
  {
    id: "c1",
    name: "김도현 수석 컨설턴트",
    role: "前 창업진흥원 전담평가위원",
    title: "TIPS 운영사 수석심사역 • 스타트업 빌더",
    agencyHistory: "중소벤처기업부 창업진흥원 심사위원 6년 역임",
    tags: ["예비창업패키지", "초기창업패키지", "TIPS R&D", "IT/SaaS"],
    category: "package",
    achievements: [
      "2024~2025년 예창패·초창패 누적 42개사 합격 배출",
      "중기부 TIPS 선정 사업계획서 18건 전담 코칭",
      "PSST 문제인식-실현가능성 논리구조 전문 첨삭",
    ],
    successCount: 42,
    rating: 4.98,
    reviewCount: 124,
    badge: "창진원 공인 평가위원",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    avatarBg: "from-blue-600 to-indigo-600",
    intro: "심사위원 입장에서 10초 만에 합격을 결정짓는 핵심 지표와 차별화 포인트를 날카롭게 짚어드립니다.",
  },
  {
    id: "c2",
    name: "이지은 기술거래사 • 변리사",
    role: "한국발명진흥회 전문위원",
    title: "기술가치평가사 • 특허법률사무소 대표",
    agencyHistory: "한국특허전략개발원(KISTA) R&D 전문위원",
    tags: ["디딤돌 R&D", "딥테크·AI", "바이오·헬스케어", "특허 가점"],
    category: "rnd",
    achievements: [
      "중기부 디딤돌·전략형 R&D 과제 58건 수주 지원",
      "특허 연계 정부지원사업 가점 요건 100% 충족 가이드",
      "기술개발 로드맵 및 정량적 목표치 설계 특화",
    ],
    successCount: 58,
    rating: 4.99,
    reviewCount: 98,
    badge: "기술 R&D 수주 전문",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    avatarBg: "from-purple-600 to-pink-600",
    intro: "복잡한 기술 개발 내용을 심사위원이 이해하기 쉬운 정량적 개발 목표와 시장성 지표로 재구성합니다.",
  },
  {
    id: "c3",
    name: "박성민 공인 경영지도사",
    role: "前 중소기업유통센터 심사위원",
    title: "소상공인시장진흥공단 전문위원 • 재무전략 이사",
    agencyHistory: "신용보증기금·기술보증기금 정책자금 멘토",
    tags: ["창업도약패키지", "제조·하드웨어", "정책자금 융자", "공공조달"],
    category: "policy",
    achievements: [
      "창업도약패키지 및 스케일업 지원사업 35건 선정",
      "기보·신보 정책금융 및 비R&D 바우처 45억원 유치",
      "재무계획, 자금소요계획, 시장진입 전략 정밀 검토",
    ],
    successCount: 35,
    rating: 4.97,
    reviewCount: 86,
    badge: "정책금융 & 제조 전문",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    avatarBg: "from-emerald-600 to-teal-600",
    intro: "자금 소요 계획과 비즈니스 모델의 현실성을 검증하여 심사에서 탈락하지 않는 탄탄한 계획서를 완성합니다.",
  },
  {
    id: "c4",
    name: "최유진 수석 액셀러레이터",
    role: "前 카카오벤처스 수석심사역",
    title: "시드~시리즈A 전문 투자총괄 • IR 코치",
    agencyHistory: "서울창조경제혁신센터 글로벌 멘토단",
    tags: ["창업도약패키지", "스케일업 IR", "투자유치 연계", "글로벌 진출"],
    category: "tips",
    achievements: [
      "초기 스타트업 누적 29개사 140억원 투자유치 연계",
      "정부지원금 이후 민간 후속 투자 연계 사업계획서 코칭",
      "글로벌 진출 지원사업 및 지자체 스타트업 육성 선정",
    ],
    successCount: 29,
    rating: 4.98,
    reviewCount: 72,
    badge: "투자연계 & 스케일업",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    avatarBg: "from-amber-500 to-orange-600",
    intro: "정부 지원사업 선정뿐만 아니라, 향후 후속 투자 유치까지 이어지는 강력한 스토리라인을 만듭니다.",
  },
];

export const ConsultantDirectorySection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedConsultant, setSelectedConsultant] = useState<ConsultantProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal Form States
  const [applicantName, setApplicantName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [targetProgram, setTargetProgram] = useState("");
  const [inquiryNotes, setInquiryNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const filteredConsultants =
    selectedCategory === "all"
      ? CONSULTANTS
      : CONSULTANTS.filter((c) => c.category === selectedCategory);

  const handleOpenConsultation = (consultant: ConsultantProfile) => {
    setSelectedConsultant(consultant);
    setIsSubmitted(false);
    setIsModalOpen(true);
  };

  const handleSubmitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <section className="space-y-8 pt-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>Ziwon.AI 공식 검증 전문가 라인업</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            추천 전문 컨설턴트 1:1 서류 첨삭 & 멘토링
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            작성하신 PSST 사업계획서를 정부 지원사업 전담 평가위원 및 전문 기술거래사에게 직접 검토받으세요.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full text-xs">
          {[
            { id: "all", label: "전체 전문가" },
            { id: "package", label: "예비/초기 패키지" },
            { id: "rnd", label: "R&D 딥테크" },
            { id: "tips", label: "TIPS & 스케일업" },
            { id: "policy", label: "정책자금 & 제조" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer border ${
                selectedCategory === tab.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Consultant Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredConsultants.map((c) => (
          <div
            key={c.id}
            className="bg-white border border-slate-200 hover:border-blue-400 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 group"
          >
            {/* Header: Avatar, Name, Rating, Badge */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-13 h-13 rounded-2xl bg-gradient-to-tr ${c.avatarBg} text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex-shrink-0`}
                  >
                    {c.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-base text-slate-900">{c.name}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${c.badgeColor}`}>
                        {c.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{c.role}</p>
                    <p className="text-[11px] text-blue-700 font-semibold">{c.title}</p>
                  </div>
                </div>

                {/* Rating & Review */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center space-x-1 justify-end text-amber-500 font-extrabold text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{c.rating.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">리뷰 {c.reviewCount}건</span>
                </div>
              </div>

              {/* Agency History Quote */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                "{c.intro}"
              </div>

              {/* Key Achievements */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 block">주요 실적 & 전문 분야</span>
                <ul className="space-y-1 text-xs text-slate-700">
                  {c.achievements.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {c.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-200/80 text-blue-800 text-[11px] font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-slate-400 text-[11px] block">누적 지원사업 선정</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  총 <span className="text-blue-600">{c.successCount}건</span> 합격
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenConsultation(c)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>1:1 서류 첨삭 신청</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Partners Recruitment Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
            <Award className="w-3.5 h-3.5" />
            <span>Ziwon.AI 파트너스 컨설턴트 상시 모집</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black">
            정부지원사업 심사위원 및 전문 컨설턴트로 활동해 보세요
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            경영지도사, 기술거래사, 변리사, VC 심사역 등 정부지원사업 전문 자격을 보유하신 분들의 파트너스 신청을 환영합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("컨설턴트 파트너스 사전 등록 신청이 접수되었습니다. 담당자가 안내 메일을 발송해 드립니다.")}
          className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs sm:text-sm shadow-md transition-all flex-shrink-0 cursor-pointer"
        >
          파트너스 등록 신청하기
        </button>
      </div>

      {/* 1:1 Consultation Request Modal */}
      {isModalOpen && selectedConsultant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Briefcase className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">1:1 서류 첨삭 & 멘토링 신청</h3>
                  <p className="text-[11px] text-blue-100 font-medium">
                    {selectedConsultant.name} ({selectedConsultant.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {isSubmitted ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-black text-slate-900 text-base">상담 신청이 성공적으로 접수되었습니다!</h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                      <strong>{selectedConsultant.name}</strong> 컨설턴트에게 신청 내역이 전달되었으며, <strong>24시간 이내</strong>에 기재해 주신 연락처로 상담 일정 및 사전 안내를 드립니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm"
                  >
                    확인
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitConsultation} className="space-y-4">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>작성하신 정보는 전문 컨설턴트와의 상담 배정 외의 용도로 절대 사용되지 않습니다.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">대표자 / 신청자명 *</label>
                      <input
                        type="text"
                        required
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        placeholder="홍길동 대표"
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">기업명 / 창업 예정 상호 *</label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="(주)지원AI 또는 예비창업"
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">연락처 (휴대폰) *</label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="010-1234-5678"
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">목표 지원사업 공고명</label>
                      <input
                        type="text"
                        value={targetProgram}
                        onChange={(e) => setTargetProgram(e.target.value)}
                        placeholder="예: 2026 예비창업패키지"
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">컨설팅 / 첨삭 요청 사항</label>
                    <textarea
                      rows={3}
                      value={inquiryNotes}
                      onChange={(e) => setInquiryNotes(e.target.value)}
                      placeholder="예: AI로 1차 작성한 PSST 사업계획서의 문제인식 및 시장 규모 타당성을 집중 검토받고 싶습니다."
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>접수 처리 중...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>1:1 상담 신청서 제출하기</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
