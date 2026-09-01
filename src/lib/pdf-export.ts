export type PdfSection = {
  heading?: string;
  body: string;
};

function safeName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "speakly-export";
}

export async function downloadTextPdf({
  fileName,
  title,
  subtitle,
  sections,
}: {
  fileName: string;
  title: string;
  subtitle?: string;
  sections: PdfSection[];
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 17;
  const pageWidth = 210 - margin * 2;
  const pageBottom = 282;
  let y = 20;

  const ensureSpace = (height: number) => {
    if (y + height > pageBottom) {
      doc.addPage();
      y = 20;
    }
  };

  const writeLines = (text: string, size = 10.5, bold = false, gap = 5.2) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const paragraphs = text.replace(/\r/g, "").split("\n");
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        y += gap * 0.65;
        continue;
      }
      const lines = doc.splitTextToSize(paragraph, pageWidth) as string[];
      for (const line of lines) {
        ensureSpace(gap + 1);
        doc.text(line, margin, y);
        y += gap;
      }
    }
  };

  writeLines(title, 18, true, 7);
  if (subtitle) {
    y += 1;
    writeLines(subtitle, 9.5, false, 4.8);
  }
  y += 4;

  for (const section of sections) {
    if (!section.body.trim()) continue;
    if (section.heading) {
      ensureSpace(12);
      y += 2;
      writeLines(section.heading, 12.5, true, 6);
      y += 1;
    }
    writeLines(section.body, 10.5, false, 5.2);
    y += 3;
  }

  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Speakly Study OS • ${page}/${total}`, margin, 291);
  }

  doc.save(`${safeName(fileName)}.pdf`);
}
