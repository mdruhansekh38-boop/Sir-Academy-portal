import { jsPDF } from 'jspdf';

interface PdfOptions {
  title: string;
  subtitle?: string;
  studentLabel?: string;
  studentId?: string;
}

export function buildPdf(opts: PdfOptions): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(232, 90, 42);
  doc.rect(0, 0, pageWidth, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(opts.title, 40, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('SIR ACADEMY · Student Integration and Regulation', 40, 48);

  if (opts.subtitle) {
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(opts.subtitle, 40, 92);
  }

  if (opts.studentLabel && opts.studentId) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`${opts.studentLabel}: ${opts.studentId}`, 40, opts.subtitle ? 110 : 92);
  }

  return doc;
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

// Returns a blob URL for in-app preview (used by the PDF viewer modal).
export function pdfBlobUrl(doc: jsPDF): string {
  return doc.output('bloburl') as unknown as string;
}
