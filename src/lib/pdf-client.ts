export type ExtractedPdf = {
  text: string;
  pages: number;
  pagesRead: number;
  truncated: boolean;
};

const MAX_PAGES = 80;
const MAX_CHARS = 50000;

export async function extractPdfText(file: Blob): Promise<ExtractedPdf> {
  const pdfjs = await import("pdfjs-dist");

  // The worker code is loaded from the same open-source package version. The PDF bytes
  // themselves stay in the browser and are not sent to this CDN.
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pagesRead = Math.min(pdf.numPages, MAX_PAGES);
  const chunks: string[] = [];
  let charCount = 0;
  let truncated = pdf.numPages > MAX_PAGES;

  for (let pageNumber = 1; pageNumber <= pagesRead; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!pageText) continue;
    const next = `\n\n--- Page ${pageNumber} ---\n${pageText}`;
    if (charCount + next.length > MAX_CHARS) {
      chunks.push(next.slice(0, Math.max(0, MAX_CHARS - charCount)));
      truncated = true;
      break;
    }
    chunks.push(next);
    charCount += next.length;
  }

  return {
    text: chunks.join("").trim(),
    pages: pdf.numPages,
    pagesRead,
    truncated,
  };
}
