const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ProgramDetailModal.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. K-Startup Inquiry phone number and word wrap
content = content.replace(
  `<span><strong>문의처:</strong> {kst(["tel_no", "cntct_no"])}</span>`,
  `<span><strong>문의처:</strong> {kst(["tel_no", "cntct_no", "enqrv_tel_no", "inq_tel_no"]) || "공고문 참조"}</span>`
);

content = content.replace(
  /<div className="text-xs bg-slate-900\/60 p-2\.5 rounded-lg border border-slate-800 text-slate-300 break-keep leading-relaxed">/g,
  `<div className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-300 break-words whitespace-pre-wrap leading-relaxed">`
);

// 2. Bizinfo HTML mapping and word wrap
content = content.replace(
  `<p className="font-medium text-slate-200 leading-relaxed whitespace-pre-wrap">{biz(["trgetNm"]) || "공고문 참조"}</p>`,
  `<div className="font-medium text-slate-200 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: biz(["trgetNm"]) || "공고문 참조" }} />`
);

content = content.replace(
  `<p className="font-medium text-slate-300 leading-relaxed whitespace-pre-wrap flex-1 max-h-[120px] overflow-y-auto custom-scrollbar">\n                {biz(["bsnsSumryCn"]) || "공고문 참조"}\n              </p>`,
  `<div className="font-medium text-slate-300 leading-relaxed whitespace-pre-wrap flex-1 max-h-[120px] overflow-y-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: biz(["bsnsSumryCn"]) || "공고문 참조" }} />`
);

// 3. Bizinfo truncate removal
content = content.replace(
  `<span className="text-slate-200 block truncate">{biz(["reqstBeginEndDe"]) || "공고문 참조"}</span>`,
  `<span className="text-slate-200 block break-keep leading-tight">{biz(["reqstBeginEndDe"]) || "공고문 참조"}</span>`
);

content = content.replace(
  `<span className="text-slate-200 truncate block">{biz(["jrsdInsttNm"]) || selectedProgram.organizer}</span>`,
  `<span className="text-slate-200 break-keep leading-tight block">{biz(["jrsdInsttNm"]) || selectedProgram.organizer}</span>`
);

content = content.replace(
  `<span className="text-slate-200 truncate block">{biz(["excInsttNm"]) || selectedProgram.executingAgency || "공고문 참조"}</span>`,
  `<span className="text-slate-200 break-keep leading-tight block">{biz(["excInsttNm"]) || selectedProgram.executingAgency || "공고문 참조"}</span>`
);

content = content.replace(
  `<span className="text-slate-200 truncate block">{biz(["reqstMthPapersCn"]) || "공고문 참조"}</span>`,
  `<span className="text-slate-200 break-keep leading-tight block">{biz(["reqstMthPapersCn"]) || "공고문 참조"}</span>`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed UI issues.');
