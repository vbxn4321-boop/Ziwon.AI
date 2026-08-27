import re

file_path = "src/components/ProgramDetailModal.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove kstartupRawData banner in AI tab (present branch)
pattern1 = re.compile(r"\{\/\* Platform-Specific Quick Overview Banner \(K-Startup vs Bizinfo\) \*\/\}.*?\{\/\* Gate 1: Unauthenticated Alert \*\/\}", re.DOTALL)
content = pattern1.sub("{/* Gate 1: Unauthenticated Alert */}", content)

# 2. Remove kstartupRawData banner in AI tab (absent branch)
pattern2 = re.compile(r"\{\/\* Platform-Specific Quick Overview Banner in Initial View \*\/\}.*?\{\/\* Basic Notice Summary Card \*\/\}", re.DOTALL)
content = pattern2.sub("{/* Basic Notice Summary Card */}", content)

# 3. Insert CommonNoticeHeader component definition
header_component = """
const CommonNoticeHeader: React.FC<{ selectedProgram: SupportProgram, kst: (keys: string[]) => string | null, biz: (keys: string[]) => string | null }> = ({ selectedProgram, kst, biz }) => {
  const isKst = selectedProgram.sources.some(s => s.sourceType === "K_STARTUP");
  const isBiz = selectedProgram.sources.some(s => s.sourceType === "BIZINFO");

  if (isKst) {
    return (
      <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/20 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-500/20 pb-3">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
              🚀 K-Startup 창업 지원사업
            </span>
            <span className="text-xs font-bold text-slate-200">
              {kst(["biz_pbanc_nm", "intg_pbanc_biz_nm", "detl_pg_title", "공고명"]) || selectedProgram.title}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {kst(["aply_mthd_onli_rcpt_istc", "detl_pg_url"])?.startsWith("http") && (
              <a href={kst(["aply_mthd_onli_rcpt_istc", "detl_pg_url"])!} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1">
                <span>온라인 접수처 바로가기</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-amber-400/90 font-bold block">창업 업력 조건</span>
            <span className="font-semibold text-slate-200 break-keep leading-tight block">{kst(["biz_enyy", "창업업력"]) || "공고문 참조"}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-amber-400/90 font-bold block">대상 연령</span>
            <span className="font-semibold text-slate-200 break-keep leading-tight block">{kst(["aply_trgt_age", "biz_trgt_age", "대상연령"]) || "공고문 참조"}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-amber-400/90 font-bold block">지원 지역</span>
            <span className="font-semibold text-slate-200 break-keep leading-tight block">{kst(["supt_regin", "지역"]) || selectedProgram.region}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-amber-400/90 font-bold block">접수 기간</span>
            <span className="font-semibold text-slate-200 break-keep leading-tight block">
              {kst(["pbanc_rcpt_bgng_dt", "접수시작일시"]) ? `${kst(["pbanc_rcpt_bgng_dt"])?.substring(0, 10)} ~ ${kst(["pbanc_rcpt_end_dt"])?.substring(0, 10)}` : "공고문 참조"}
            </span>
          </div>
        </div>

        {(kst(["aply_trgt_ctnt"]) || kst(["aply_excl_trgt_ctnt"]) || kst(["prfn_matr"])) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div className="space-y-1.5">
              {kst(["aply_trgt_ctnt"]) && (
                <div className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-300 break-keep leading-relaxed">
                  <strong className="text-emerald-400 font-bold">지원대상:</strong> {kst(["aply_trgt_ctnt"])}
                </div>
              )}
              {kst(["aply_excl_trgt_ctnt"]) && (
                <div className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-300 break-keep leading-relaxed">
                  <strong className="text-rose-400 font-bold">지원제외:</strong> {kst(["aply_excl_trgt_ctnt"])}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {kst(["prfn_matr"]) && (
                <div className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-300 break-keep leading-relaxed">
                  <strong className="text-blue-400 font-bold">우대사항:</strong> {kst(["prfn_matr"])}
                </div>
              )}
              <div className="text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-400 flex flex-col gap-1">
                <span><strong>주관/수행:</strong> {kst(["pbanc_ntrp_nm"]) || selectedProgram.organizer} / {kst(["exct_istt_nm"]) || selectedProgram.executingAgency || "공고문 참조"}</span>
                <span><strong>문의처:</strong> {kst(["tel_no", "cntct_no"])}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else if (isBiz) {
    return (
      <div className="bg-gradient-to-r from-teal-950/20 via-slate-900 to-blue-950/20 border border-teal-500/20 rounded-2xl p-5 space-y-4 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-teal-500/20 pb-3">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs border border-teal-500/30">
              🏢 기업마당 정책 지원사업
            </span>
            <span className="text-xs font-bold text-slate-200">
              {biz(["pblancNm"]) || selectedProgram.title}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {biz(["pblancUrl"])?.startsWith("http") && (
              <a href={biz(["pblancUrl"])!} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center space-x-1">
                <span>기업마당 공고 원문</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5 h-full">
              <span className="text-[11px] text-teal-400 font-bold block">지원대상 (trgetNm)</span>
              <p className="font-medium text-slate-200 leading-relaxed whitespace-pre-wrap">{biz(["trgetNm"]) || "공고문 참조"}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5 h-full flex flex-col">
              <span className="text-[11px] text-teal-400 font-bold block">사업 요약 (bsnsSumryCn)</span>
              <p className="font-medium text-slate-300 leading-relaxed whitespace-pre-wrap flex-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                {biz(["bsnsSumryCn"]) || "공고문 참조"}
              </p>
            </div>
          </div>
        </div>
        
        {biz(["hashtags"]) && (
          <div className="flex flex-wrap gap-1.5">
            {biz(["hashtags"])!.split(',').map((tag: string, idx: number) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">#{tag.trim()}</span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] pt-2 border-t border-slate-800">
           <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
             <span className="text-slate-400 block font-bold">접수 기간</span>
             <span className="text-slate-200 block truncate">{biz(["reqstBeginEndDe"]) || "공고문 참조"}</span>
           </div>
           <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
             <span className="text-slate-400 block font-bold">소관 기관</span>
             <span className="text-slate-200 truncate block">{biz(["jrsdInsttNm"]) || selectedProgram.organizer}</span>
           </div>
           <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
             <span className="text-slate-400 block font-bold">수행 기관</span>
             <span className="text-slate-200 truncate block">{biz(["excInsttNm"]) || selectedProgram.executingAgency || "공고문 참조"}</span>
           </div>
           <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
             <span className="text-slate-400 block font-bold">접수 방법</span>
             <span className="text-slate-200 truncate block">{biz(["reqstMthPapersCn"]) || "공고문 참조"}</span>
           </div>
        </div>
      </div>
    );
  }
  return null;
}
"""
content = content.replace("export const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({", header_component + "\nexport const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({")

# 4. Inject CommonNoticeHeader into viewer tab
viewer_target = '<div className="space-y-3 flex flex-col flex-1 min-h-[480px]">'
viewer_injection = '<div className="space-y-3 flex flex-col flex-1 min-h-[480px]">\n              <CommonNoticeHeader selectedProgram={selectedProgram} kst={kst} biz={biz} />'
content = content.replace(viewer_target, viewer_injection)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Modification complete.")
