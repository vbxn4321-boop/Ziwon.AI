import AdmZip from "adm-zip";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Node 전용: 기존 HWPX 표 구조를 유지하면서 라벨 셀에 내용을 삽입한다. */
export function fillHwpxTemplate(template: Buffer, sections: Array<{ label: string; content?: string }>): Buffer {
  const zip = new AdmZip(template);
  for (const entry of zip.getEntries().filter((e) => /Contents\/section\d*\.xml$/i.test(e.entryName))) {
    let xml = entry.getData().toString("utf8");
    for (const section of sections) {
      if (!section.label || !section.content) continue;
      const pattern = new RegExp(`(<hp:tc\\b[\\s\\S]*?${escapeRegExp(escapeXml(section.label))}[\\s\\S]*?<\\/hp:tc>)`, "i");
      xml = xml.replace(pattern, (cell) => {
        const content = escapeXml(section.content || "");
        if (cell.includes(content)) return cell;
        const paragraph = `<hp:p id="ziwon_${Math.random().toString(36).slice(2)}" paraPrIDRef="0"><hp:run charPrIDRef="0"><hp:t>${content}</hp:t></hp:run></hp:p>`;
        return cell.replace(/<\/hp:subList>/i, `${paragraph}</hp:subList>`);
      });
    }
    entry.setData(Buffer.from(xml, "utf8"));
  }
  return zip.toBuffer();
}
