export interface ChunkResult {
  chunkIndex: number;
  sectionTitle?: string;
  content: string;
  startOffset: number;
  endOffset: number;
}

/**
 * RAG Document Chunker
 * Splits extracted document text into sliding-window chunks with section title detection
 */
export function chunkDocumentText(
  text: string,
  targetChunkSize = 1000,
  overlapSize = 150
): ChunkResult[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanedText = text.replace(/\r\n/g, "\n");
  const chunks: ChunkResult[] = [];
  let chunkIndex = 0;
  let startOffset = 0;

  // Regex to detect common section headers (e.g. "1. 지원대상", "가. 신청자격", "□ 지원규모")
  const sectionHeaderRegex = /^(?:[0-9]+[.-]|\[[0-9]+\]|[가-하][.-]|□|■|○|◆|\d+년|\b지원대상\b|\b지원조건\b|\b지원규모\b|\b신청방법\b).{2,30}$/m;

  while (startOffset < cleanedText.length) {
    let endOffset = Math.min(startOffset + targetChunkSize, cleanedText.length);

    // If not at the end of the text, try to break at a paragraph boundary (\n\n or \n)
    if (endOffset < cleanedText.length) {
      const nextNewline = cleanedText.indexOf("\n\n", endOffset - 100);
      if (nextNewline !== -1 && nextNewline < endOffset + 150) {
        endOffset = nextNewline;
      } else {
        const singleNewline = cleanedText.indexOf("\n", endOffset - 50);
        if (singleNewline !== -1 && singleNewline < endOffset + 100) {
          endOffset = singleNewline;
        }
      }
    }

    const chunkContent = cleanedText.slice(startOffset, endOffset).trim();

    if (chunkContent.length > 0) {
      // Attempt to detect section header within the chunk
      let sectionTitle: string | undefined = undefined;
      const match = chunkContent.match(sectionHeaderRegex);
      if (match) {
        sectionTitle = match[0].trim();
      }

      chunks.push({
        chunkIndex: chunkIndex++,
        sectionTitle,
        content: chunkContent,
        startOffset,
        endOffset,
      });
    }

    // Move sliding window with overlap
    if (endOffset >= cleanedText.length) break;
    startOffset = Math.max(endOffset - overlapSize, startOffset + 1);
  }

  return chunks;
}
