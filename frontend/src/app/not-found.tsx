import Link from "next/link";
import { Sparkles, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto shadow-2xs">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
            404 Page Not Found
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            요청하신 페이지를 찾을 수 없습니다
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            입력하신 주소가 잘못되었거나, 페이지가 변경 또는 삭제되어 이용할 수 없습니다.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>홈으로 이동</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
