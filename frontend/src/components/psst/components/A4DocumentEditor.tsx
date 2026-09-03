"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Printer,
  ClipboardCopy,
  Check,
  RotateCcw,
  Sparkles,
  Table as TableIcon,
  Maximize2,
  FileDown,
  Edit3,
  Info,
} from "lucide-react";
import { PsstBusinessPlanResult } from "@/lib/ai/psst-generator";
import {
  convertPsstToHwpPages,
  copyToHwpClipboard,
  PsstPageData,
} from "@/lib/export/hwp-clipboard-exporter";
import { CanvasTheme } from "../types";

interface A4DocumentEditorProps {
  plan: PsstBusinessPlanResult | null;
  programTitle?: string;
  isDirectEditing: boolean;
  setIsDirectEditing: React.Dispatch<React.SetStateAction<boolean>>;
  canvasTheme: CanvasTheme;
}

export const A4DocumentEditor: React.FC<A4DocumentEditorProps> = ({
  plan,
  programTitle,
  isDirectEditing,
  setIsDirectEditing,
  canvasTheme,
}) => {
  const [pages, setPages] = useState<PsstPageData[]>([]);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedFont, setSelectedFont] = useState("'맑은 고딕', 'Malgun Gothic', sans-serif");
  const [selectedFontSize, setSelectedFontSize] = useState("10pt");
  const [lastPlanSnapshot, setLastPlanSnapshot] = useState<string>("");

  // Initialize or update HTML content when a new AI plan arrives
  useEffect(() => {
    if (plan && plan.overview?.title) {
      const planKey = `${plan.overview.title}-${plan.overview.companyName}`;
      if (planKey !== lastPlanSnapshot) {
        setLastPlanSnapshot(planKey);
        const generatedPages = convertPsstToHwpPages(plan, programTitle);
        setPages(generatedPages);
        setTimeout(() => {
          generatedPages.forEach((p, idx) => {
            if (pageRefs.current[idx]) {
              pageRefs.current[idx]!.innerHTML = p.html;
            }
          });
        }, 0);
      }
    }
  }, [plan, programTitle, lastPlanSnapshot]);

  // Execute formatting command safely on currently active selection
  const formatDoc = (cmd: string, val: string = "") => {
    document.execCommand(cmd, false, val);
  };

  // Font family change
  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    formatDoc("fontName", font);
  };

  // Font size change (pt mapping)
  const handleFontSizeChange = (pt: string) => {
    setSelectedFontSize(pt);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = pt;
    span.appendChild(range.extractContents());
    range.insertNode(span);
  };

  // Insert Table
  const handleInsertTable = () => {
    const tableHtml = `
      <table border="1" cellspacing="0" cellpadding="7" style="border-collapse: collapse; width: 100%; border: 1.5px solid #000; margin: 12px 0; font-family: '맑은 고딕', sans-serif; font-size: 10pt; table-layout: fixed; box-sizing: border-box; background-color: #ffffff;">
        <thead>
          <tr style="background-color: #f1f5f9; font-weight: bold; text-align: center;">
            <th style="border: 1px solid #000; padding: 7px 8px; width: 30%;">구분</th>
            <th style="border: 1px solid #000; padding: 7px 8px; width: 70%;">세부 내용</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #000; padding: 7px 8px; font-weight: bold; background-color: #f8fafc; text-align: center;">항목 1</td>
            <td style="border: 1px solid #000; padding: 7px 8px;">내용을 입력하세요</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 7px 8px; font-weight: bold; background-color: #f8fafc; text-align: center;">항목 2</td>
            <td style="border: 1px solid #000; padding: 7px 8px;">내용을 입력하세요</td>
          </tr>
        </tbody>
      </table><p><br/></p>
    `;
    formatDoc("insertHTML", tableHtml);
  };

  // One-click Copy for HWP across all pages
  const handleHwpCopy = async () => {
    const allHtml = pageRefs.current
      .map((el) => el?.innerHTML || "")
      .filter(Boolean)
      .join(
        '\n<div style="page-break-after: always; mso-break-type: section-break; height: 1px; clear: both; margin: 24px 0;"></div>\n'
      );

    const success = await copyToHwpClipboard(allHtml);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  // Reset to AI draft
  const handleResetToAiDraft = () => {
    if (!plan) return;
    if (window.confirm("현재 직접 수정한 내용을 버리고 AI가 생성한 원본 초안으로 되돌리시겠습니까?")) {
      const generatedPages = convertPsstToHwpPages(plan, programTitle);
      setPages(generatedPages);
      generatedPages.forEach((p, idx) => {
        if (pageRefs.current[idx]) {
          pageRefs.current[idx]!.innerHTML = p.html;
        }
      });
    }
  };

  // Print / PDF Export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* ── 1. Top Ribbon Toolbar (Naver SmartEditor / Hancom Style) ── */}
      <div
        className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 z-20 transition-colors flex-shrink-0 ${
          canvasTheme === "dark"
            ? "bg-slate-900 border-slate-800 text-slate-200"
            : "bg-white border-slate-200 text-slate-800 shadow-xs"
        }`}
      >
        {/* Left Formatting Group */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Font Family Selector */}
          <select
            value={selectedFont}
            onChange={(e) => handleFontChange(e.target.value)}
            title="글꼴 선택 (한글 공문서 표준)"
            className="h-8 px-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="'맑은 고딕', 'Malgun Gothic', sans-serif">맑은 고딕 (표준)</option>
            <option value="'돋움', Dotum, sans-serif">돋움</option>
            <option value="'바탕', Batang, serif">바탕 (명조)</option>
            <option value="Pretendard, sans-serif">Pretendard</option>
          </select>

          {/* Font Size (pt) */}
          <select
            value={selectedFontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            title="글자 크기 (pt 단위)"
            className="h-8 px-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="9pt">9pt (주석/각주)</option>
            <option value="10pt">10pt (본문 표준)</option>
            <option value="11pt">11pt (본문 강조)</option>
            <option value="12pt">12pt (소제목)</option>
            <option value="14pt">14pt (중제목)</option>
            <option value="16pt">16pt (대제목)</option>
            <option value="18pt">18pt (표제부)</option>
          </select>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Bold, Italic, Underline, Strike */}
          <button
            type="button"
            onClick={() => formatDoc("bold")}
            title="굵게 (Ctrl+B)"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Bold className="w-4 h-4 font-bold" />
          </button>
          <button
            type="button"
            onClick={() => formatDoc("italic")}
            title="기울임 (Ctrl+I)"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatDoc("underline")}
            title="밑줄 (Ctrl+U)"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatDoc("strikeThrough")}
            title="취소선"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => formatDoc("justifyLeft")}
            title="왼쪽 정렬"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatDoc("justifyCenter")}
            title="가운데 정렬"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatDoc("justifyRight")}
            title="오른쪽 정렬"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatDoc("justifyFull")}
            title="양쪽 정렬 (공문서 표준)"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Lists & Table */}
          <button
            type="button"
            onClick={() => formatDoc("insertUnorderedList")}
            title="글머리 기호 (•)"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => formatDoc("insertOrderedList")}
            title="번호 매기기 (1. 2. 3.)"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleInsertTable}
            title="표(Table) 삽입"
            className="px-2.5 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 text-xs font-bold flex items-center space-x-1 cursor-pointer"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>표 삽입</span>
          </button>
        </div>

        {/* Right Action Group */}
        <div className="flex items-center space-x-2">
          {/* Edit Toggle */}
          <button
            type="button"
            onClick={() => setIsDirectEditing(!isDirectEditing)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border cursor-pointer ${
              isDirectEditing
                ? "bg-emerald-600 text-white border-emerald-500 shadow-md animate-pulse"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isDirectEditing ? "✏️ 편집 모드 ON" : "보기 모드"}</span>
          </button>

          {/* Reset to AI Draft */}
          <button
            type="button"
            onClick={handleResetToAiDraft}
            title="AI 원본 초안으로 초기화"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Print / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            title="A4 인쇄 또는 PDF로 저장"
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>인쇄/PDF</span>
          </button>

          {/* Primary Action: One-Click HWP Copy */}
          <button
            type="button"
            onClick={handleHwpCopy}
            className={`px-4 py-1.5 rounded-xl text-xs font-black shadow-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
              isCopied
                ? "bg-emerald-600 text-white shadow-emerald-500/30"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25"
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4" />
                <span>한글(HWP) 복사 완료!</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-4 h-4" />
                <span>한글(HWP)로 전체 복사</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Status Guide Banner */}
      <div className="bg-blue-600/10 border-b border-blue-500/20 px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-400 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
          <span>
            <b>정부 공문서 규격 A4 페이지네이션 (210mm × 297mm, 표준 여백 20mm)</b> — [한글(HWP)로 전체 복사] 후 한컴 한글이나 MS Word에 붙여넣기(Ctrl+V)하시면 4개 페이지가 100% 분할 유지됩니다.
          </span>
        </div>
        {isDirectEditing && (
          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap flex-shrink-0">
            각 페이지 본문을 직접 클릭하여 자유롭게 수정 가능
          </span>
        )}
      </div>

      {/* ── 2. A4 Document Multi-Page Paper Canvas Container ── */}
      <div
        className={`flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center transition-colors ${
          canvasTheme === "dark" ? "bg-slate-950" : "bg-slate-200/80"
        }`}
      >
        <div className="flex flex-col items-center space-y-10 py-4 w-full max-w-[794px]">
          {pages.map((page, idx) => (
            <div key={idx} className="flex flex-col items-center w-full group">
              {/* Page Number & Section Badge Header */}
              <div className="self-start mb-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center space-x-2 shadow-sm">
                <span className="text-blue-400 font-extrabold">📄 {idx + 1} / {pages.length} 페이지</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-200">{page.title}</span>
                <span className="text-slate-500 text-[10px] hidden sm:inline">({page.subtitle})</span>
              </div>

              {/* Individual A4 Sheet Paper (Fixed 794px width × 1123px minHeight, exactly 20mm padding) */}
              <div
                className="w-full bg-white text-slate-900 shadow-2xl border border-slate-300/80 rounded-sm relative flex flex-col transition-all print:m-0 print:shadow-none print:border-none page-sheet"
                style={{
                  width: "794px",
                  minHeight: "1123px",
                  padding: "20mm",
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                }}
              >
                {/* Editable Document Page Body */}
                <div
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  contentEditable={isDirectEditing}
                  suppressContentEditableWarning={true}
                  className={`outline-none flex-1 text-slate-900 transition-all ${
                    isDirectEditing ? "cursor-text ring-1 ring-blue-500/30 rounded p-1" : "cursor-default"
                  }`}
                  style={{
                    fontFamily: selectedFont,
                    fontSize: selectedFontSize,
                    lineHeight: "160%",
                    wordBreak: "keep-all",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                  }}
                />

                {/* Government Official Document Page Number (Footer) */}
                <div className="pt-6 pb-2 text-center text-xs font-bold text-slate-500 border-t border-slate-200 mt-auto select-none print:hidden">
                  - {idx + 1} -
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embedded Print CSS for Multi-Page Native A4 Output */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 20mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, .no-print, [id^="psst-sidebar"], [id^="psst-header"], button, select {
            display: none !important;
          }
          .page-sheet {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </div>
  );
};
