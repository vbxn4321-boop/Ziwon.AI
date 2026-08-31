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
    return <span className="text-slate-400 text-xs">{fallback}</span>;
  }
  const clean = cleanHtml(rawString);
  const items = clean
    .split(/[,/·|]/)
    .map((i) => i.trim())
    .filter(Boolean);

  if (items.length <= 1) {
    return <span className="font-semibold text-slate-200 text-xs break-words leading-relaxed">{clean}</span>;
  }

  const colorClasses = {
    amber: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    blue: "bg-blue-500/15 text-blue-200 border-blue-500/30",
    teal: "bg-teal-500/15 text-teal-200 border-teal-500/30",
    purple: "bg-purple-500/15 text-purple-200 border-purple-500/30",
  }[colorScheme];

  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {items.map((item, idx) => (
        <span
          key={idx}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border break-all leading-tight ${colorClasses}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
