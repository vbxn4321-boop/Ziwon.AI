import React from "react";

export function cleanHtml(rawText: string | null | undefined): string {
  if (!rawText) return "";
  return rawText
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&middot;/gi, "·")
    .replace(/&#183;/gi, "·")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export function formatNoticeDate(raw: string | null | undefined): string {
  if (!raw) return "공고문 참조";
  const cleaned = cleanHtml(raw);
  return cleaned.replace(/(\d{4})(\d{2})(\d{2})/g, "$1.$2.$3");
}

export function getDDay(endDateStr?: string): { text: string; isUrgent: boolean; isClosed: boolean } {
  if (!endDateStr) return { text: "상시모집", isUrgent: false, isClosed: false };
  const end = new Date(endDateStr);
  if (isNaN(end.getTime())) return { text: "공고문 참조", isUrgent: false, isClosed: false };
  end.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 0) return { text: "마감완료", isUrgent: false, isClosed: true };
  if (diffDays === 0) return { text: "오늘 마감 (D-Day)", isUrgent: true, isClosed: false };
  return { text: `D-${diffDays}`, isUrgent: diffDays <= 7, isClosed: false };
}

export function renderConditionChips(
  rawString: string | null | undefined,
  fallback: string = "공고문 참조",
  colorScheme: "amber" | "blue" | "teal" | "purple" = "amber"
) {
  if (!rawString || !rawString.trim()) {
    return <span className="text-slate-500 font-medium text-xs">{fallback}</span>;
  }
  const clean = cleanHtml(rawString);
  const items = clean
    .split(/[,/·|]/)
    .map((i) => i.trim())
    .filter(Boolean);

  if (items.length <= 1) {
    return <span className="font-bold text-slate-900 text-xs break-words leading-relaxed">{clean}</span>;
  }

  const colorClasses = {
    amber: "bg-amber-100 text-amber-950 border-amber-300 font-bold",
    blue: "bg-blue-100 text-blue-950 border-blue-300 font-bold",
    teal: "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold",
    purple: "bg-purple-100 text-purple-950 border-purple-300 font-bold",
  }[colorScheme];

  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {items.map((item, idx) => (
        <span
          key={idx}
          className={`px-2.5 py-1 rounded-lg text-xs border break-all leading-tight shadow-2xs ${colorClasses}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export type DocCategory = "pdf" | "image" | "hwp" | "docx" | "notice_only" | "etc";

export function getDocCategory(doc?: { fileType?: string | null; fileName?: string | null; fileUrl?: string | null } | null): DocCategory {
  if (!doc) return "etc";
  const fType = (doc.fileType || "").toUpperCase();
  if (fType === "NOTICE_ONLY") return "notice_only";
  if (fType === "PDF") return "pdf";
  if (fType === "IMAGE" || fType === "PNG" || fType === "JPG" || fType === "JPEG") return "image";
  if (fType === "HWP" || fType === "HWPX") return "hwp";
  if (fType === "DOCX" || fType === "DOC") return "docx";

  const name = (doc.fileName || doc.fileUrl || "").toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return "image";
  if (/\.(hwp|hwpx)$/i.test(name)) return "hwp";
  if (/\.(docx|doc)$/i.test(name)) return "docx";
  return "etc";
}

export function getDocBadgeText(category: DocCategory): string {
  switch (category) {
    case "pdf":
      return "PDF 공고문";
    case "image":
      return "포스터/이미지";
    case "hwp":
      return "HWP 서식";
    case "docx":
      return "DOCX 서식";
    case "notice_only":
      return "웹 접수 링크";
    default:
      return "첨부 서류";
  }
}

export function getDocDownloadText(category: DocCategory): string {
  switch (category) {
    case "pdf":
      return "PDF 원본 다운로드";
    case "image":
      return "이미지 원본 다운로드";
    case "hwp":
      return "한글(HWP) 서식 다운로드";
    case "docx":
      return "DOCX 서식 다운로드";
    default:
      return "첨부파일 다운로드";
  }
}
