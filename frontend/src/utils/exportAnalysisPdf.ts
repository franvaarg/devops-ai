import { jsPDF } from "jspdf";

import type { HistoryItem } from "../services/api";

const PAGE_MARGIN = 18;
const CONTENT_WIDTH = 174;
const PAGE_BOTTOM = 277;
const DEFAULT_LINE_HEIGHT = 5.5;

type PdfColor = [number, number, number];

function formatAnalysisDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getSeverityColor(severity: string): PdfColor {
  switch (severity.toLowerCase()) {
    case "critical":
      return [185, 28, 28];

    case "high":
      return [194, 65, 12];

    case "medium":
      return [180, 83, 9];

    case "low":
      return [4, 120, 87];

    default:
      return [71, 85, 105];
  }
}

function getSafeFileDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function addContinuationHeader(doc: jsPDF) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("KANYI", PAGE_MARGIN, 11.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Analysis Report", 192, 11.5, {
    align: "right",
  });

  doc.setTextColor(30, 41, 59);
}

function addNewPage(doc: jsPDF) {
  doc.addPage();
  addContinuationHeader(doc);

  return 28;
}

function ensureSpace(
  doc: jsPDF,
  currentY: number,
  requiredHeight: number
) {
  if (currentY + requiredHeight > PAGE_BOTTOM) {
    return addNewPage(doc);
  }

  return currentY;
}

function addSectionTitle(
  doc: jsPDF,
  title: string,
  currentY: number
) {
  let y = ensureSpace(doc, currentY, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(title.toUpperCase(), PAGE_MARGIN, y);

  y += 3;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, y, 192, y);

  doc.setTextColor(30, 41, 59);

  return y + 7;
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  currentY: number,
  options?: {
    font?: "normal" | "bold";
    fontSize?: number;
    lineHeight?: number;
    textColor?: PdfColor;
  }
) {
  const font = options?.font ?? "normal";
  const fontSize = options?.fontSize ?? 10;
  const lineHeight =
    options?.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const textColor = options?.textColor ?? [30, 41, 59];

  doc.setFont("helvetica", font);
  doc.setFontSize(fontSize);
  doc.setTextColor(...textColor);

  const safeText = text.trim() || "No information available.";

  const paragraphs = safeText.split(/\r?\n/);

  let y = currentY;

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (!paragraph.trim()) {
      y += lineHeight;
      return;
    }

    const lines = doc.splitTextToSize(
      paragraph,
      CONTENT_WIDTH
    ) as string[];

    lines.forEach((line) => {
      y = ensureSpace(doc, y, lineHeight);

      doc.text(line, PAGE_MARGIN, y);
      y += lineHeight;
    });

    if (paragraphIndex < paragraphs.length - 1) {
      y += 1.5;
    }
  });

  return y;
}

function addSteps(
  doc: jsPDF,
  steps: string[],
  currentY: number
) {
  if (!steps.length) {
    return addWrappedText(
      doc,
      "No troubleshooting steps available.",
      currentY
    );
  }

  let y = currentY;

  steps.forEach((step, index) => {
    const prefix = `${index + 1}.`;
    const stepText = step.trim() || "No step description.";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    const wrappedLines = doc.splitTextToSize(
      stepText,
      CONTENT_WIDTH - 9
    ) as string[];

    wrappedLines.forEach((line, lineIndex) => {
      y = ensureSpace(doc, y, DEFAULT_LINE_HEIGHT);

      if (lineIndex === 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(prefix, PAGE_MARGIN, y);
      }

      doc.setFont("helvetica", "normal");
      doc.text(line, PAGE_MARGIN + 9, y);

      y += DEFAULT_LINE_HEIGHT;
    });

    y += 2;
  });

  return y;
}

function addOriginalLog(
  doc: jsPDF,
  originalLog: string,
  currentY: number
) {
  const safeLog =
    originalLog.trim() || "Original log unavailable.";

  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const logLines = safeLog.split(/\r?\n/);
  let y = currentY;

  logLines.forEach((logLine) => {
    const wrappedLines = doc.splitTextToSize(
      logLine || " ",
      CONTENT_WIDTH
    ) as string[];

    wrappedLines.forEach((line) => {
      y = ensureSpace(doc, y, 4.8);

      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(line, PAGE_MARGIN, y);

      y += 4.8;
    });
  });

  return y;
}

function addPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {
    doc.setPage(pageNumber);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(PAGE_MARGIN, 284, 192, 284);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    doc.text(
      `Generated by KANYI | Page ${pageNumber} of ${totalPages}`,
      105,
      290,
      {
        align: "center",
      }
    );
  }
}

export function exportAnalysisToPdf(
  analysis: HistoryItem
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const severityColor = getSeverityColor(
    analysis.severity
  );

  doc.setProperties({
    title: `KANYI Analysis Report ${analysis.id}`,
    subject: "AI-assisted log analysis report",
    author: "KANYI",
    creator: "KANYI",
  });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 48, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("KANYI", PAGE_MARGIN, 20);

  doc.setFontSize(14);
  doc.setTextColor(191, 219, 254);
  doc.text("Analysis Report", PAGE_MARGIN, 31);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Report ID: ${analysis.id}`,
    192,
    19,
    {
      align: "right",
    }
  );

  doc.text(
    formatAnalysisDate(analysis.createdAt),
    192,
    29,
    {
      align: "right",
    }
  );

  let currentY = 61;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("SEVERITY", PAGE_MARGIN, currentY);

  currentY += 4;

  doc.setFillColor(...severityColor);
  doc.roundedRect(
    PAGE_MARGIN,
    currentY,
    37,
    10,
    2,
    2,
    "F"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(
    analysis.severity.toUpperCase() || "UNKNOWN",
    PAGE_MARGIN + 18.5,
    currentY + 6.7,
    {
      align: "center",
    }
  );

  currentY += 19;

  currentY = addSectionTitle(
    doc,
    "Summary",
    currentY
  );

  currentY = addWrappedText(
    doc,
    analysis.summary,
    currentY
  );

  currentY += 7;

  currentY = addSectionTitle(
    doc,
    "Root Cause",
    currentY
  );

  currentY = addWrappedText(
    doc,
    analysis.rootCause,
    currentY
  );

  currentY += 7;

  currentY = addSectionTitle(
    doc,
    "Recommendation",
    currentY
  );

  currentY = addWrappedText(
    doc,
    analysis.recommendation,
    currentY
  );

  currentY += 7;

  currentY = addSectionTitle(
    doc,
    "Suggested Steps",
    currentY
  );

  currentY = addSteps(
    doc,
    analysis.steps ?? [],
    currentY
  );

  currentY += 6;

  currentY = addSectionTitle(
    doc,
    "Original Log",
    currentY
  );

  addOriginalLog(
    doc,
    analysis.originalLog,
    currentY
  );

  addPageNumbers(doc);

  const fileDate = getSafeFileDate(
    analysis.createdAt
  );

  doc.save(
    `KANYI_Analysis_${analysis.id}_${fileDate}.pdf`
  );
}
