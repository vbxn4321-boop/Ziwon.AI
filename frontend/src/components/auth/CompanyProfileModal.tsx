"use client";

import React, { useState, useEffect } from "react";
import { X, Building2, Briefcase, MapPin, Calendar, DollarSign, Users, Award, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { fetchMyCompany, saveMyCompany } from "@/lib/backend-client";
import { getJwtToken } from "@/lib/supabase-client";

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CompanyProfileModal({ isOpen, onClose }: CompanyProfileModalProps) {
  const [name, setName] = useState("");
  const [bizRegNo, setBizRegNo] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("서울특별시");
  const [foundedDate, setFoundedDate] = useState("");
  const [revenue, setRevenue] = useState<string>("");
  const [employeeCount, setEmployeeCount] = useState<number>(1);
  const [hasPatents, setHasPatents] = useState(false);
  const [hasCertifications, setHasCertifications] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [coreItemSummary, setCoreItemSummary] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load existing profile from backend
  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const token = await getJwtToken();
        if (!token) return;
        const comp = await fetchMyCompany(token);
        if (comp) {
          setName(comp.name || "");
          setBizRegNo(comp.bizRegNo || "");
          setIndustry(comp.industry || "");
          setRegion(comp.region || "서울특별시");
          setFoundedDate(comp.foundedDate ? comp.foundedDate.substring(0, 10) : "");
          setRevenue(comp.revenue ? String(comp.revenue) : "");
          setEmployeeCount(comp.employeeCount || 1);
          setHasPatents(comp.hasPatents || false);
          setHasCertifications(comp.hasCertifications || false);
          setIsExporting(comp.isExporting || false);
          setCoreItemSummary(comp.coreItemSummary || "");
        }
      } catch (err) {
        // No existing profile is fine
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setErrorMsg("기업명(또는 예비창업자명)을 입력해주세요.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await getJwtToken();
      if (!token) throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");

      await saveMyCompany(
        {
          name,
          bizRegNo: bizRegNo || undefined,
          industry: industry || undefined,
          region,
          foundedDate: foundedDate ? `${foundedDate}T00:00:00` : undefined,
          revenue: revenue ? parseFloat(revenue) : undefined,
          employeeCount: Number(employeeCount),
          hasPatents,
          hasCertifications,
          isExporting,
          coreItemSummary: coreItemSummary || undefined,
        },
        token
      );

      setSuccessMsg("기업 프로필이 백엔드 DB에 안전하게 저장되었습니다!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="border-b border-slate-800 pb-4 mb-6">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>FastAPI 백엔드 기업 정보 프로필</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">내 기업 정보 관리</h2>
          <p className="text-xs text-slate-400 mt-1">
            한 번 등록해 두시면, <b>PSST 사업계획서 생성 시 회사 정보가 자동으로 폼에 연동</b>됩니다.
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="text-xs">백엔드에서 기업 프로필을 불러오는 중...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 space-y-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">기업명 (또는 예비창업자명) *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: (주)지윈에이아이"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Biz Reg No */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">사업자등록번호</label>
                <input
                  type="text"
                  value={bizRegNo}
                  onChange={(e) => setBizRegNo(e.target.value)}
                  placeholder="예: 123-45-67890 (예비창업자 생략)"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Industry */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">산업 분야 / 업종</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="예: 생성형 AI B2B SaaS, 스마트팜"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Region */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">소재지 지역</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="서울특별시">서울특별시</option>
                    <option value="경기도">경기도</option>
                    <option value="인천광역시">인천광역시</option>
                    <option value="대전광역시">대전광역시</option>
                    <option value="대구광역시">대구광역시</option>
                    <option value="부산광역시">부산광역시</option>
                    <option value="광주광역시">광주광역시</option>
                    <option value="세종특별자치시">세종특별자치시</option>
                    <option value="전국">전국 / 기타</option>
                  </select>
                </div>
              </div>

              {/* Founded Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">설립연월일 (창업일)</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={foundedDate}
                    onChange={(e) => setFoundedDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Employees */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">상시 근로자 수</label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="number"
                    min="1"
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Core Item Summary */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">핵심 창업 아이템 / 주력 사업 설명</label>
              <textarea
                rows={3}
                value={coreItemSummary}
                onChange={(e) => setCoreItemSummary(e.target.value)}
                placeholder="기업의 핵심 기술 및 주력 제품/서비스를 간단히 설명해주세요. (PSST 사업계획서에 자동 반영됩니다)"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPatents}
                  onChange={(e) => setHasPatents(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
                />
                <span>특허 / 지식재산권 보유</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCertifications}
                  onChange={(e) => setHasCertifications(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
                />
                <span>벤처기업 / 이노비즈 인증 보유</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isExporting}
                  onChange={(e) => setIsExporting(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
                />
                <span>수출 실적 보유</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <span>기업 정보 저장하기</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
