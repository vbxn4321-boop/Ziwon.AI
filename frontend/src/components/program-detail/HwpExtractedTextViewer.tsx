"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  FileText,
  Download,
  Copy,
  Check,
  Search,
  LayoutGrid,
  AlignLeft,
  X,
  List,
} from "lucide-react";

interface HwpExtractedTextViewerProps {
  fileName: string;
  fileUrl: string;
  extractedText: string;
  onRefresh?: () => void;
}

// Recognized Korean Government Application Form Field Labels
const KNOWN_FIELD_LABELS = new Set([
  "성명",
  "대표자명",
  "대표자",
  "대표자 정보",
  "생년월일",
  "소속",
  "직위",
  "직책",
  "연락처",
  "전화번호",
  "휴대전화",
  "휴대폰",
  "H.P",
  "TEL",
  "E-mail",
  "이메일",
  "메일주소",
  "기업명",
  "회사명",
  "상호명",
  "주요 기술분야",
  "기술분야",
  "회사 소재지",
  "소재지",
  "본사 주소",
  "본사 소재지",
  "사업장 소재지",
  "사업자구분",
  "기업구분",
  "설립일자",
  "설립일",
  "설립연월일",
  "창업일자",
  "사업자 등록번호",
  "사업자등록번호",
  "법인등록번호",
  "법인 등록번호",
  "자본금",
  "매출액",
  "상시근로자수",
  "임직원수",
  "고용인원",
  "주요 생산품목",
  "주요제품",
  "홈페이지",
  "아이템명",
  "창업아이템명",
  "과제명",
  "사업명",
  "신청 분야",
  "지원 분야",
  "총 사업비",
  "정부지원금",
  "자부담금",
  "신청금액",
  "소요예산",
  "협약기간",
  "수행기간",
  "운영기관",
  "주관기관",
  "문의처",
]);

function isFieldLabel(text: string): boolean {
  const clean = text.replace(/[*:\s]/g, "");
  if (KNOWN_FIELD_LABELS.has(text) || KNOWN_FIELD_LABELS.has(clean)) return true;
  for (const label of KNOWN_FIELD_LABELS) {
    if (clean === label.replace(/\s/g, "")) return true;
  }
  return false;
}

interface ParsedBlock {
  type:
    | "title_box"
    | "chapter_header"
    | "section_header"
    | "subsection_header"
    | "minor_header"
    | "bullet_list"
    | "form_table"
    | "data_grid"
    | "paragraph";
  title?: string;
  rows?: { label: string; value: string }[];
  cells?: string[];
  text?: string;
  id?: string;
}

export const HwpExtractedTextViewer: React.FC<HwpExtractedTextViewerProps> = ({
  fileName,
  fileUrl,
  extractedText,
}) => {
  const [viewMode, setViewMode] = useState<"smart" | "raw">("smart");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [showToc, setShowToc] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // High-fidelity Korean Government Guidelines & Forms Parser
  const parsedBlocks = useMemo(() => {
    if (!extractedText) return [];

    const rawLines = extractedText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const blocks: ParsedBlock[] = [];
    let currentTableRows: { label: string; value: string }[] = [];
    let currentShortCells: string[] = [];

    const flushTable = () => {
      if (currentTableRows.length > 0) {
        blocks.push({
          type: "form_table",
          rows: [...currentTableRows],
        });
        currentTableRows = [];
      }
    };

    const flushShortCells = () => {
      if (currentShortCells.length > 0) {
        if (currentShortCells.length >= 4) {
          // If 4 or more consecutive short cells, render as a compact structured data grid
          blocks.push({
            type: "data_grid",
            cells: [...currentShortCells],
          });
        } else {
          // Otherwise keep as standard paragraphs
          for (const cell of currentShortCells) {
            blocks.push({
              type: "paragraph",
              text: cell,
            });
          }
        }
        currentShortCells = [];
      }
    };

    let i = 0;
    let blockCounter = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];

      // 1. Document / Notice Main Title Box (e.g. 「...」, [...] 참가신청서)
      if (
        (/^([「\[].*?[」\]])/.test(line) && line.length < 90) ||
        (line.includes("참가신청서") && line.length < 60) ||
        (line.includes("사업계획서") && line.length < 60)
      ) {
        flushTable();
        flushShortCells();
        blocks.push({
          type: "title_box",
          title: line,
          id: `section-${blockCounter++}`,
        });
        i++;
        continue;
      }

      // 2. Major Chapter Heading (Ⅰ. 사업개요, Ⅱ. 2026년 사업시행 주요내용, 제1장 ...)
      if (
        /^(제\s*[0-9]+\s*장|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVXLCDM]+\.|\d+\.\s*(총칙|사업개요|추진계획|지원내용|신청자격))/.test(
          line
        ) &&
        line.length < 60
      ) {
        flushTable();
        flushShortCells();
        blocks.push({
          type: "chapter_header",
          title: line,
          id: `chapter-${blockCounter++}`,
        });
        i++;
        continue;
      }

      // 3. Section Heading (1. 목 적, 2. 근거법령, 3. 성과목표 및 지표)
      // Must be digit + dot + Korean/English text, not units or currencies
      if (
        /^\d+[\.\)]\s+[가-힣A-Za-z0-9]/.test(line) &&
        line.length < 60 &&
        !/(백만원|원|%|건|개|명|일|월)\s*$/.test(line)
      ) {
        flushTable();
        flushShortCells();
        blocks.push({
          type: "section_header",
          title: line,
          id: `section-${blockCounter++}`,
        });
        i++;
        continue;
      }

      // 4. Subsection Heading (□ 사업 개요, ■ 신청기업 정보, ◆, ●)
      if (/^[□■◆●]\s+/.test(line) && line.length < 60) {
        flushTable();
        flushShortCells();
        blocks.push({
          type: "subsection_header",
          title: line,
        });
        i++;
        continue;
      }

      // 5. Minor Subheading (가. , 나. , (1) , ① )
      if (/^([가-하]\.|\(\d+\)|[①-⑳])\s+/.test(line) && line.length < 60) {
        flushTable();
        flushShortCells();
        blocks.push({
          type: "minor_header",
          title: line,
        });
        i++;
        continue;
      }

      // 6. Bullet Items (ㅇ, ◦, ▪, ▫, •, -, *, ※)
      if (/^[ㅇ◦▪▫•\-\*※]\s*/.test(line)) {
        flushTable();
        flushShortCells();
        blocks.push({
          type: "bullet_list",
          text: line,
        });
        i++;
        continue;
      }

      // 7. Official Form Key-Value Label (e.g. 성명, 생년월일, 소속, 기업명, 주요 기술분야)
      if (isFieldLabel(line)) {
        flushShortCells();
        const label = line;
        let value = "-";
        if (i + 1 < rawLines.length) {
          const nextLine = rawLines[i + 1];
          if (
            !isFieldLabel(nextLine) &&
            !/^\d+[\.\)]\s+/.test(nextLine) &&
            !/^[□■◆●ㅇ◦▪▫•\-\*※]/.test(nextLine) &&
            nextLine.length < 150
          ) {
            value = nextLine;
            i++;
          }
        }
        currentTableRows.push({ label, value });
        i++;
        continue;
      }

      // 8. Consecutive Short Table Cell Data (e.g., year columns, budget figures, metric cells <= 18 chars)
      if (line.length <= 18 && !line.includes(".") && !line.startsWith("제")) {
        flushTable();
        currentShortCells.push(line);
        i++;
        continue;
      }

      // 9. Normal Paragraph / Content Line
      flushTable();
      flushShortCells();
      blocks.push({
        type: "paragraph",
        text: line,
      });
      i++;
    }

    flushTable();
    flushShortCells();

    return blocks;
  }, [extractedText]);

  // Table of Contents chapters list
  const tocChapters = useMemo(() => {
    return parsedBlocks.filter((b) => b.type === "chapter_header" || b.type === "title_box");
  }, [parsedBlocks]);

  // Search filter
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return parsedBlocks;
    const q = searchQuery.toLowerCase();
    return parsedBlocks.filter((b) => {
      if (b.title && b.title.toLowerCase().includes(q)) return true;
      if (b.text && b.text.toLowerCase().includes(q)) return true;
      if (b.rows && b.rows.some((r) => r.label.toLowerCase().includes(q) || r.value.toLowerCase().includes(q)))
        return true;
      if (b.cells && b.cells.some((c) => c.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [parsedBlocks, searchQuery]);

  const scrollToId = (id?: string) => {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getFontSizeClass = () => {
    if (fontSize === "sm") return "text-[11px] leading-relaxed";
    if (fontSize === "lg") return "text-sm leading-relaxed";
    return "text-xs leading-relaxed";
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans">
      {/* ── 1. Top Callout Banner & Actions ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 border-b border-indigo-900/60 shadow-md flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-[11px] font-black uppercase tracking-wide flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-indigo-300" />
                <span>한글(HWP/HWPX) 공식 서식</span>
              </span>
              <h4 className="text-sm sm:text-base font-black text-white truncate max-w-md">
                {fileName}
              </h4>
            </div>
            <p className="text-xs text-indigo-200/90 leading-relaxed">
              📌 <b>공문서 양식 뷰어:</b> 정부 공고문 및 신청 서식을 실제 공문서 구조로 복원한 <b>[열람용 뷰어]</b>입니다. 공식 접수는 원본 <b>[한글 서식 다운로드]</b>를 이용해 작성하십시오.
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="추출 텍스트 전체 복사"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-extrabold">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-200" />
                  <span>텍스트 복사</span>
                </>
              )}
            </button>

            <a
              href={`/api/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(fileName)}`}
              download={fileName}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>한글(HWP) 서식 다운로드</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── 2. Toolbar (Mode, Search, Font Size, TOC) ── */}
      <div className="h-12 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-shrink-0 text-xs">
        <div className="flex items-center space-x-2">
          {/* Mode Switch */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("smart")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 font-bold cursor-pointer ${
                viewMode === "smart"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>📑 공문서 서식 뷰 (원본 복원)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 font-bold cursor-pointer ${
                viewMode === "raw"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>📝 원문 텍스트</span>
            </button>
          </div>

          {/* Quick Outline/TOC button for long docs */}
          {tocChapters.length > 1 && viewMode === "smart" && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowToc(!showToc)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                  showToc
                    ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
                title="목차 바로가기"
              >
                <List className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">목차 ({tocChapters.length})</span>
              </button>

              {showToc && (
                <div className="absolute left-0 top-full mt-2 w-72 max-h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>주요 장/목차</span>
                    <button onClick={() => setShowToc(false)} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="py-1 space-y-0.5">
                    {tocChapters.map((ch, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          scrollToId(ch.id);
                          setShowToc(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs text-slate-800 dark:text-slate-200 truncate block transition-colors"
                      >
                        {ch.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <span className="text-[11px] text-slate-500 hidden md:inline pl-1">
            총 {extractedText.length.toLocaleString()}자 파싱됨
          </span>
        </div>

        {/* Right Tools: Font Size & Search */}
        <div className="flex items-center space-x-2">
          {/* Font Size Toggle */}
          <div className="hidden sm:flex items-center space-x-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
            <button
              onClick={() => setFontSize("sm")}
              className={`px-2 py-1 rounded-lg ${fontSize === "sm" ? "bg-white dark:bg-slate-700 shadow-2xs text-blue-600" : "text-slate-500"}`}
              title="작은 글자"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize("base")}
              className={`px-2 py-1 rounded-lg ${fontSize === "base" ? "bg-white dark:bg-slate-700 shadow-2xs text-blue-600" : "text-slate-500"}`}
              title="기본 글자"
            >
              A
            </button>
            <button
              onClick={() => setFontSize("lg")}
              className={`px-2 py-1 rounded-lg ${fontSize === "lg" ? "bg-white dark:bg-slate-700 shadow-2xs text-blue-600" : "text-slate-500"}`}
              title="큰 글자"
            >
              A+
            </button>
          </div>

          <div className="relative w-44 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="내용 실시간 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Scrollable Canvas Area (Bug-free Full Height Container) ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-8 flex justify-center bg-slate-200/70 dark:bg-slate-950"
      >
        {viewMode === "raw" ? (
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text h-fit min-h-full">
            {extractedText}
          </div>
        ) : (
          /* Official Korean Government Document Paper (A4 Style, Guaranteed 100% Background Fill) */
          <div className="w-full max-w-4xl bg-white text-slate-900 p-8 sm:p-14 shadow-2xl border border-slate-300 rounded-sm space-y-5 select-text h-fit min-h-full">
            {filteredBlocks.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">
                검색된 항목이 없습니다.
              </div>
            ) : (
              filteredBlocks.map((block, idx) => {
                // 1. Official Boxed Title (e.g. 「...」 참가신청서)
                if (block.type === "title_box") {
                  return (
                    <div
                      key={idx}
                      id={block.id}
                      className="border-2 border-slate-900 p-5 sm:p-7 text-center my-6 bg-slate-50 rounded-xs shadow-2xs"
                    >
                      <h2 className="text-base sm:text-xl font-black text-slate-950 tracking-tight leading-snug">
                        {block.title}
                      </h2>
                    </div>
                  );
                }

                // 2. Major Chapter Header (Ⅰ. 사업개요, Ⅱ. 2026년 사업시행 주요내용)
                if (block.type === "chapter_header") {
                  return (
                    <div
                      key={idx}
                      id={block.id}
                      className="bg-[#1e3a8a] text-white px-5 py-3 rounded-xs font-black text-sm sm:text-base shadow-sm mt-8 mb-4 flex items-center justify-between"
                    >
                      <span>{block.title}</span>
                      <span className="text-[11px] text-blue-200 font-medium hidden sm:inline">
                        대한민국 정부 공고 지침
                      </span>
                    </div>
                  );
                }

                // 3. Section Header (1. 목 적, 2. 근거법령, 3. 성과목표 및 지표)
                if (block.type === "section_header") {
                  return (
                    <div
                      key={idx}
                      id={block.id}
                      className="pt-5 pb-1 border-b border-slate-300 mt-4 mb-3"
                    >
                      <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center space-x-2">
                        <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block mr-1"></span>
                        <span>{block.title}</span>
                      </h3>
                    </div>
                  );
                }

                // 4. Subsection Header (□ 사업 개요, ■ 신청기업 정보)
                if (block.type === "subsection_header") {
                  return (
                    <div key={idx} className="pt-3 pb-1">
                      <h4 className="text-xs sm:text-sm font-extrabold text-blue-900 flex items-center space-x-1.5">
                        <span>{block.title}</span>
                      </h4>
                    </div>
                  );
                }

                // 5. Minor Header (가. , (1) , ① )
                if (block.type === "minor_header") {
                  return (
                    <div key={idx} className="pt-2 pb-0.5 pl-1">
                      <h5 className="text-xs font-bold text-slate-800">
                        {block.title}
                      </h5>
                    </div>
                  );
                }

                // 6. Bullet List (ㅇ, ▪, ▫, •, -)
                if (block.type === "bullet_list" && block.text) {
                  return (
                    <div
                      key={idx}
                      className={`pl-3 text-slate-700 font-normal flex items-start space-x-2 ${getFontSizeClass()}`}
                    >
                      <span className="text-blue-600 font-black select-none">•</span>
                      <span className="flex-1 leading-relaxed">
                        {block.text.replace(/^[ㅇ◦▪▫•\-\*※]\s*/, "")}
                      </span>
                    </div>
                  );
                }

                // 7. Form Table (Official 2-column key-value grid)
                if (block.type === "form_table" && block.rows && block.rows.length > 0) {
                  return (
                    <div
                      key={idx}
                      className="border border-slate-900 overflow-hidden my-4 bg-white shadow-2xs"
                    >
                      <table className="w-full border-collapse text-xs">
                        <tbody>
                          {block.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className="border-b border-slate-300 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="w-32 sm:w-44 bg-slate-100 font-bold p-2.5 sm:p-3 text-slate-800 border-r border-slate-300 text-center align-middle whitespace-normal break-keep">
                                {row.label}
                              </td>
                              <td className="p-2.5 sm:p-3 text-slate-900 font-medium align-middle break-all leading-relaxed">
                                {row.value === "-" ? (
                                  <span className="text-slate-400 italic">(작성란)</span>
                                ) : (
                                  <span className="font-semibold text-blue-950">{row.value}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                // 8. Structured Data Grid (for consecutive short table cells/metrics)
                if (block.type === "data_grid" && block.cells && block.cells.length > 0) {
                  return (
                    <div
                      key={idx}
                      className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-sm"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {block.cells.map((cell, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-white border border-slate-200 px-2.5 py-1.5 rounded text-center font-medium text-slate-800 shadow-2xs truncate"
                            title={cell}
                          >
                            {cell}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // 9. Standard Paragraph
                return (
                  <p
                    key={idx}
                    className={`text-slate-800 font-normal leading-relaxed ${getFontSizeClass()}`}
                  >
                    {block.text}
                  </p>
                );
              })
            )}

            {/* Document Footer Note */}
            <div className="pt-12 mt-12 border-t border-slate-200 text-center text-slate-400 text-[11px] select-none space-y-1">
              <p>- 대한민국 정부 및 산하기관 표준 공고문·지침 서식 미리보기 -</p>
              <p className="text-[10px] text-slate-400">
                문서 서식 무단 배포 금지 | 접수 및 상세 작성은 원본 한글(HWP) 서식을 사용하십시오.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
