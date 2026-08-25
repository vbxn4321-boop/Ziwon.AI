import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Building, Mail, Sparkles, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | Ziwon.AI (84컴퍼니)",
  description: "84컴퍼니가 운영하는 Ziwon.AI 서비스의 개인정보 처리방침입니다. 고객의 소중한 개인정보를 안전하게 보호합니다.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-600 selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-xs font-semibold group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>메인으로 돌아가기</span>
          </Link>

          <Link href="/" className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-extrabold text-white tracking-tight">
              Ziwon<span className="text-blue-400">.AI</span>
            </span>
          </Link>

          <Link
            href="/terms"
            className="text-xs text-slate-400 hover:text-blue-400 font-medium transition-colors"
          >
            이용약관 보기
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        {/* Title Badge */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>개인정보보호법 준수 공지</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            개인정보 처리방침
          </h1>
          <p className="text-xs text-slate-400">
            시행일자: 2026년 8월 25일 | 최종 개정일자: 2026년 8월 25일
          </p>
        </div>

        {/* Introduction Box */}
        <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed space-y-2">
          <p className="font-semibold text-white">
            84컴퍼니(이하 '회사' 또는 '서비스')는 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하며, 이용자의 개인정보를 안전하게 처리하고 보호하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
          </p>
          <p className="text-slate-400 text-[11px]">
            본 방침은 84컴퍼니가 제공하는 <strong>Ziwon.AI (AI 기반 정부지원사업 맞춤 추천 및 PSST 사업계획서 자동 생성 플랫폼)</strong>에 적용됩니다.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">1</span>
            <span>수집하는 개인정보의 항목 및 수집방법</span>
          </h2>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-3">
            <p>회사는 서비스 제공을 위해 최소한의 개인정보만을 수집하며, 불필요한 민감정보(생일, 연령대, 성별, 주민등록번호 등)는 수집하지 않습니다.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                <p className="font-bold text-blue-400">1. 소셜 간편 로그인 (카카오 / 구글)</p>
                <p className="text-slate-300">• 필수항목: 소셜 계정 고유식별자(ID), 카카오계정(이메일), 프로필 닉네임, 프로필 사진</p>
                <p className="text-[11px] text-slate-400">※ 최소 수집 원칙 준수로 생일, 연령대, 성별, 전화번호, CI는 수집하지 않음</p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                <p className="font-bold text-blue-400">2. 직접 이메일 회원가입</p>
                <p className="text-slate-300">• 필수항목: 이메일 주소, 비밀번호(Bcrypt 단방향 12라운드 암호화), 성명</p>
                <p className="text-[11px] text-slate-400">• 비밀번호는 복호화할 수 없도록 안전하게 암호화 보관</p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5 md:col-span-2">
                <p className="font-bold text-blue-400">3. 맞춤 지원사업 추천 및 PSST 사업계획서 생성 시</p>
                <p className="text-slate-300">• 기업명, 사업자등록번호, 대표자/담당자명, 사업장 소재지, 주요 업종, 기업 창업일자(업력 판별용), 매출액, 근로자 수, 주요 아이템 설명</p>
                <p className="text-[11px] text-slate-400">※ 지원사업 매칭은 대표자 개인의 생년월일이 아닌 '기업 창업일자'를 기준으로 판정됩니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">2</span>
            <span>개인정보의 처리 목적</span>
          </h2>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>1. <strong>회원 가입 및 식별</strong>: 본인 식별, 회원 자격 유지, 중복 가입 및 부정 이용 방지, 계정 보안 관리</p>
            <p>2. <strong>맞춤형 서비스 제공</strong>: AI 기반 기업 맞춤형 공고 추천, 매칭 적합도 분석, PSST 표준 사업계획서 자동 생성 및 보관</p>
            <p>3. <strong>고객 지원 및 고지</strong>: 서비스 관련 중요 공지사항 전달, 문의 대응 및 분쟁 해결</p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">3</span>
            <span>개인정보의 보유 및 이용 기간</span>
          </h2>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>회사는 원칙적으로 <strong>회원 탈퇴 시 이용자의 개인정보를 지체 없이 파기</strong>합니다. 단, 관계 법령에 따라 보존 의무가 있는 경우 아래 기간 동안 보관합니다:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong>통신비밀보호법</strong>: 로그인 기록 및 접속 로그 (3개월)</li>
              <li><strong>전자상거래 등에서의 소비자보호에 관한 법률</strong>: 계약 또는 청약철회에 관한 기록 (5년)</li>
              <li><strong>전자상거래 등에서의 소비자보호에 관한 법률</strong>: 소비자 불만 또는 분쟁 처리에 관한 기록 (3년)</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">4</span>
            <span>개인정보 처리의 위탁</span>
          </h2>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">수탁업체</th>
                  <th className="py-2.5 px-3">위탁 업무 내용</th>
                  <th className="py-2.5 px-3">보유 및 이용 기간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Google LLC (Gemini API)</td>
                  <td className="py-2.5 px-3">AI 사업계획서 텍스트 생성 및 데이터 파싱 (비식별화 처리)</td>
                  <td className="py-2.5 px-3">서비스 제공 완료 시까지</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Supabase Inc.</td>
                  <td className="py-2.5 px-3">데이터베이스(PostgreSQL) 호스팅 및 소셜 OAuth 인증</td>
                  <td className="py-2.5 px-3">회원 탈퇴 시까지</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Upstash / Redis</td>
                  <td className="py-2.5 px-3">로그인 세션(Refresh Token) 및 인증번호(OTP) 임시 관리</td>
                  <td className="py-2.5 px-3">토큰 유효기간 만료 시까지</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">5</span>
            <span>사업자 정보 및 개인정보 보호책임자</span>
          </h2>
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center space-x-2 text-blue-400 font-bold pb-1">
              <Building className="w-4 h-4" />
              <span>84컴퍼니 사업자 및 개인정보보호 책임</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <p><span className="text-slate-500">상호명 : </span>84컴퍼니</p>
              <p><span className="text-slate-500">대표자 : </span>정진아</p>
              <p><span className="text-slate-500">사업자등록번호 : </span>754-12-00298</p>
              <p><span className="text-slate-500">개인정보보호책임자 : </span>정진아 (CPO)</p>
              <p className="sm:col-span-2"><span className="text-slate-500">사업장 주소 : </span>전남광주통합특별시 북구 첨단연신로91번길 38, 4층 402-2호(신용동)</p>
              <p className="sm:col-span-2">
                <span className="text-slate-500">고객센터 / 문의 이메일 : </span>
                <a href="mailto:vbxn4321@gmail.com" className="text-blue-400 underline underline-offset-2">
                  vbxn4321@gmail.com
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>© 2026 84컴퍼니 (Ziwon.AI). All rights reserved.</p>
          <div className="flex items-center justify-center space-x-4 text-xs">
            <Link href="/" className="hover:text-slate-300">홈으로</Link>
            <span>•</span>
            <Link href="/privacy" className="text-blue-400 font-semibold">개인정보 처리방침</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-300">서비스 이용약관</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
