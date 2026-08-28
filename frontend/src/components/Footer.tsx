import Link from "next/link";
import { ShieldCheck, FileText, Mail, MapPin, Building, Sparkles, HelpCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-16 pt-10 pb-12 text-slate-600 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-100">
          {/* 1. Service Brand Column */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                Ziwon<span className="text-blue-600">.AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Core AI v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              대한민국 100만 스타트업 & 중소기업을 위한 AI 맞춤형 정부지원사업 공고 자동 탐색 및 PSST 표준 사업계획서 자동 작성 솔루션
            </p>
            <div className="flex items-center space-x-3 pt-1 text-xs">
              <Link
                href="/privacy"
                className="text-slate-700 hover:text-blue-600 font-semibold underline underline-offset-4 transition-colors"
              >
                개인정보 처리방침
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                href="/terms"
                className="text-slate-500 hover:text-slate-800 transition-colors"
              >
                서비스 이용약관
              </Link>
            </div>
          </div>

          {/* 2. Business Details (카카오 심사 및 전자상거래법 필수 기재 정보) */}
          <div className="md:col-span-7 space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs pb-1 border-b border-slate-200">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>84컴퍼니 사업자 정보</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 pt-1">
              <div>
                <span className="text-slate-400">상호명 : </span>
                <span className="text-slate-800 font-medium">84컴퍼니</span>
              </div>
              <div>
                <span className="text-slate-400">대표자 : </span>
                <span className="text-slate-800 font-medium">정진아</span>
              </div>
              <div>
                <span className="text-slate-400">사업자등록번호 : </span>
                <span className="text-slate-800 font-medium">754-12-00298</span>
              </div>
              <div>
                <span className="text-slate-400">개인정보보호책임자 : </span>
                <span className="text-slate-800 font-medium">정진아 (CPO)</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400">사업장 주소 : </span>
                <span className="text-slate-800 font-medium">전남광주통합특별시 북구 첨단연신로91번길 38, 4층 402-2호(신용동)</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400">고객센터 / 제휴 문의 : </span>
                <a
                  href="mailto:vbxn4321@gmail.com"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  vbxn4321@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom Disclaimer & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 space-y-2 sm:space-y-0">
          <p>
            © 2026 84컴퍼니 (Ziwon.AI). All rights reserved.
          </p>
          <p className="text-slate-400/80 text-[10px]">
            Ziwon.AI는 공공데이터 포털 및 K-Startup 공식 Open API를 연계하여 지원사업 정보를 제공합니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
