"use client";

import React, { useEffect, useRef } from "react";
import { Check, CircleDot, Circle, ListTree, Lock, Paperclip } from "lucide-react";
import { FormFieldProgressItem, InterviewProgress } from "../types";

interface PsstConversationOutlineProps {
  interviewProgress: InterviewProgress;
  /** 목차 항목을 눌렀을 때. 그 칸을 지금 다루자고 챗봇에게 말한다. */
  onJumpToField: (field: FormFieldProgressItem) => void;
  disabled?: boolean;
}

/** 칸 성격별 꼬리표. 챗봇이 안 물어보는 칸이 왜 안 물어보는지 보이게 한다. */
const TYPE_BADGE: Record<string, { label: string; className: string; icon?: React.ReactNode }> = {
  NARRATIVE: { label: "서술", className: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  FACT: { label: "정보", className: "bg-slate-100 text-slate-600 border-slate-200" },
  ATTACHMENT: {
    label: "첨부",
    className: "bg-amber-50 text-amber-700 border-amber-100",
    icon: <Paperclip className="w-2.5 h-2.5" />,
  },
  PERSONAL: {
    label: "직접입력",
    className: "bg-rose-50 text-rose-700 border-rose-100",
    icon: <Lock className="w-2.5 h-2.5" />,
  },
  CONSENT: {
    label: "동의서",
    className: "bg-rose-50 text-rose-700 border-rose-100",
    icon: <Lock className="w-2.5 h-2.5" />,
  },
};

/**
 * 대화의 목차.
 *
 * 공고 서식을 파싱해 나온 칸 목록을 그대로 세우고, 지금 챗봇이 어느 칸을
 * 묻고 있는지 표시한다. 문서의 목차(어디로 스크롤할지)가 아니라 대화의
 * 목차(지금 무엇을 채우는 중인지)다.
 *
 * 데이터는 `interviewProgress.fieldProgress` 로, 서버가 매 턴 계산해서
 * 내려준다. 개인정보·동의서 칸은 챗봇이 묻지 않으므로 서버 단계에서
 * 이미 빠져 있고, 여기 보이는 건 실제로 대화로 채울 칸들이다.
 */
export const PsstConversationOutline: React.FC<PsstConversationOutlineProps> = ({
  interviewProgress,
  onJumpToField,
  disabled = false,
}) => {
  const fields = interviewProgress.fieldProgress || [];
  const currentId = interviewProgress.currentFieldId;
  const activeRef = useRef<HTMLButtonElement>(null);

  // 대화가 다음 칸으로 넘어가면 목차도 따라 스크롤한다
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentId]);

  const completed = fields.filter((f) => f.completed).length;
  const total = fields.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fbfbfa] border-l border-r border-stone-200">
      <div className="px-3.5 py-3 border-b border-stone-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
          <ListTree className="w-3.5 h-3.5 text-indigo-600" />
          <span>대화의 목차</span>
          {total > 0 && (
            <span className="ml-auto text-[10px] text-slate-400 tabular-nums font-medium">
              {completed}/{total}
            </span>
          )}
        </div>
        {total > 0 && (
          <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {total === 0 ? (
          <p className="px-2 py-6 text-[11px] text-slate-400 leading-relaxed text-center">
            대화를 시작하면 이 공고 서식에서 뽑아낸 항목이
            <br />
            순서대로 여기에 나타납니다.
          </p>
        ) : (
          fields.map((field, idx) => {
            const isCurrent = field.id === currentId;
            const badge = TYPE_BADGE[field.type] || TYPE_BADGE.FACT;

            return (
              <button
                key={field.id}
                ref={isCurrent ? activeRef : undefined}
                type="button"
                onClick={() => onJumpToField(field)}
                disabled={disabled}
                title={field.guidance || field.label}
                className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-start gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  isCurrent
                    ? "bg-indigo-50 border border-indigo-200"
                    : field.completed
                    ? "hover:bg-white border border-transparent"
                    : "hover:bg-white border border-transparent"
                }`}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {field.completed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <CircleDot className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[11px] leading-snug ${
                      isCurrent
                        ? "text-indigo-900 font-bold"
                        : field.completed
                        ? "text-slate-500"
                        : "text-slate-700"
                    }`}
                  >
                    <span className="text-slate-400 tabular-nums mr-1">{idx + 1}.</span>
                    {field.label}
                  </span>

                  {field.sectionTitle && (
                    <span className="block mt-0.5 text-[10px] text-slate-400 truncate">
                      {field.sectionTitle}
                    </span>
                  )}

                  {isCurrent && field.guidance && (
                    <span className="block mt-1 text-[10px] text-indigo-700/80 leading-relaxed line-clamp-3">
                      ※ {field.guidance}
                    </span>
                  )}
                </span>

                <span
                  className={`flex-shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-bold inline-flex items-center gap-0.5 ${badge.className}`}
                >
                  {badge.icon}
                  {badge.label}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
