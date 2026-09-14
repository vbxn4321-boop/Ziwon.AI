export interface DownloadableDoc {
  fileUrl: string;
  fileName?: string | null;
  /** ZIP 첨부파일 내부 문서일 때의 내부 경로. fileUrl 은 부모 ZIP 을 가리킨다. */
  entryPath?: string | null;
}

/**
 * 다운로드 프록시(/api/download)를 거쳐야 하는 첨부파일인지 판단.
 * ZIP 내부 문서는 서버가 압축을 풀어줘야 하므로 항상 프록시를 탄다.
 */
export function shouldProxyDownload(doc: DownloadableDoc): boolean {
  if (doc.entryPath) return true;
  return (
    doc.fileUrl.includes("fileDown.do") ||
    doc.fileUrl.includes("FileDown.do") ||
    doc.fileUrl.includes("afile/fileDownload") ||
    /\.(pdf|hwp|hwpx|docx|zip|png|jpe?g|gif|webp)$/i.test(doc.fileUrl)
  );
}

/**
 * 첨부파일 다운로드 URL 생성.
 * entryPath 가 있으면 서버가 부모 ZIP 을 받아 해당 내부 문서만 꺼내 내려준다.
 */
export function buildDownloadUrl(
  doc: DownloadableDoc,
  opts: { view?: boolean; fileName?: string } = {}
): string {
  const params = new URLSearchParams({ url: doc.fileUrl });
  const name = opts.fileName ?? doc.fileName;
  if (name) params.set("filename", name);
  if (doc.entryPath) params.set("entry", doc.entryPath);
  if (opts.view) params.set("view", "true");
  return `/api/download?${params.toString()}`;
}

