import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Building, Mail, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 이용약관 | Ziwon.AI (84컴퍼니)",
  description: "84컴퍼니가 제공하는 Ziwon.AI 서비스 이용약관입니다. 권리, 의무 및 책임사항을 안내합니다.",
};

export default function TermsPage() {
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
            href="/privacy"
            className="text-xs text-slate-400 hover:text-blue-400 font-medium transition-colors"
          >
            개인정보 처리방침 보기
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        {/* Title Badge */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
            <FileText className="w-4 h-4" />
            <span>표준 약관 규정</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            서비스 이용약관
          </h1>
          <p className="text-xs text-slate-400">
            시행일자: 2026년 8월 25일 | 최종 개정일자: 2026년 8월 25일
          </p>
        </div>

        {/* Introduction Box */}
        <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed space-y-2">
          <p className="font-semibold text-white">
            본 약관은 84컴퍼니(이하 "회사")가 운영하는 Ziwon.AI 서비스(이하 "서비스")를 이용함에 있어 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-purple-600/20 text-purple-400 flex items-center justify-center text-xs">1</span>
            <span>용어의 정의</span>
          </h2>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>1. <strong>"서비스"</strong>란 회사가 제공하는 AI 맞춤형 정부지원사업 공고 추천, 공고 상세 분석, PSST 사업계획서 생성 등 일체의 웹 서비스를 의미합니다.</p>
            <p>2. <strong>"이용자"</strong>란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</p>
            <p>3. <strong>"회원"</strong>이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 서비스의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 의미합니다.</p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-purple-600/20 text-purple-400 flex items-center justify-center text-xs">2</span>
            <span>서비스의 제공 및 법적 한계</span>
          </h2>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>1. 회사는 중소기업 및 스타트업을 위해 AI 알고리즘을 활용한 정부지원사업 추천 및 사업계획서 초안 작성 보조 도구를 제공합니다.</p>
            <p>2. 회사가 제공하는 AI 분석 점수 및 생성된 사업계획서 초안은 의사결정을 돕기 위한 <strong>참고용 보조 자료</strong>이며, 실제 정부지원사업의 선정·합격 또는 법적 효력을 보장하지 않습니다.</p>
            <p>3. 최종 사업계획서 제출 및 정부 공고 자격 요건 충족 여부에 대한 최종 검토와 책임은 전적으로 이용자 본인에게 있습니다.</p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-purple-600/20 text-purple-400 flex items-center justify-center text-xs">3</span>
            <span>회원의 의무 및 금지사항</span>
          </h2>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>이용자는 다음 각 호의 행위를 하여서는 안 됩니다:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>타인의 정보(이메일, 소셜 계정, 사업자등록번호 등)를 도용하여 가입하는 행위</li>
              <li>서비스를 통해 얻은 데이터를 회사의 사전 승낙 없이 무단 크롤링, 상업적 재판매 또는 배포하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하거나 서버에 과도한 부하를 유발하는 행위</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-purple-600/20 text-purple-400 flex items-center justify-center text-xs">4</span>
            <span>지식재산권 및 데이터 권리</span>
          </h2>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>1. 서비스에 대한 저작권 및 지식재산권은 84컴퍼니에 귀속됩니다.</p>
            <p>2. 이용자가 입력한 고유 기업 정보 및 생성된 사업계획서 결과물의 소유권은 이용자에게 있습니다.</p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-purple-600/20 text-purple-400 flex items-center justify-center text-xs">5</span>
            <span>사업자 정보 및 문의처</span>
          </h2>
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center space-x-2 text-purple-400 font-bold pb-1">
              <Building className="w-4 h-4" />
              <span>84컴퍼니 사업자 정보</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <p><span className="text-slate-500">상호명 : </span>84컴퍼니</p>
              <p><span className="text-slate-500">대표자 : </span>정진아</p>
              <p><span className="text-slate-500">사업자등록번호 : </span>754-12-00298</p>
              <p className="sm:col-span-2"><span className="text-slate-500">사업장 주소 : </span>전남광주통합특별시 북구 첨단연신로91번길 38, 4층 402-2호(신용동)</p>
              <p className="sm:col-span-2">
                <span className="text-slate-500">고객센터 / 문의 이메일 : </span>
                <a href="mailto:vbxn4321@gmail.com" className="text-purple-400 underline underline-offset-2">
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
            <Link href="/privacy" className="hover:text-slate-300">개인정보 처리방침</Link>
            <span>•</span>
            <Link href="/terms" className="text-purple-400 font-semibold">서비스 이용약관</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
