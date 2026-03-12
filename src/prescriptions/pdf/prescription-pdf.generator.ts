import PDFDocument = require('pdfkit');
import {
  Doctor,
  Patient,
  Prescription,
  PrescriptionItem,
  User,
} from '@prisma/client';

export type FullPrescription = Prescription & {
  items: PrescriptionItem[];
  patient: Patient & { user: Pick<User, 'name' | 'email'> };
  author: Doctor & { user: Pick<User, 'name' | 'email'> };
};

const BRAND_COLOR = '#1a56db';
const GRAY = '#6b7280';

export function generatePrescriptionPdf(
  prescription: FullPrescription,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .rect(0, 0, doc.page.width, 80)
      .fill(BRAND_COLOR);

    doc
      .fillColor('white')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('PRESCRIPCIÓN MÉDICA', 50, 25, { align: 'center' });

    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`Código: ${prescription.code}`, 50, 55, { align: 'center' });

    doc.fillColor('black').moveDown(3);

    // ── Info columns ─────────────────────────────────────────────────────────
    const startY = 110;
    const colLeft = 50;
    const colRight = 310;

    // Doctor
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(BRAND_COLOR)
      .text('MÉDICO', colLeft, startY);
    doc
      .font('Helvetica')
      .fillColor('black')
      .fontSize(10)
      .text(`Dr/a. ${prescription.author.user.name}`, colLeft, startY + 16)
      .text(
        `Especialidad: ${prescription.author.specialty ?? 'Medicina General'}`,
        colLeft,
        startY + 30,
      );

    // Patient
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(BRAND_COLOR)
      .text('PACIENTE', colRight, startY);
    doc
      .font('Helvetica')
      .fillColor('black')
      .fontSize(10)
      .text(prescription.patient.user.name, colRight, startY + 16)
      .text(prescription.patient.user.email, colRight, startY + 30);

    // Status & dates
    const infoY = startY + 60;
    const statusLabel =
      prescription.status === 'consumed' ? 'Consumida' : 'Pendiente';
    const statusColor =
      prescription.status === 'consumed' ? '#16a34a' : '#d97706';

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(BRAND_COLOR)
      .text('INFORMACIÓN', colLeft, infoY);
    doc.font('Helvetica').fillColor('black').fontSize(10);
    doc.text(
      `Fecha de emisión: ${prescription.createdAt.toLocaleDateString('es-ES')}`,
      colLeft,
      infoY + 16,
    );
    doc
      .fillColor(statusColor)
      .text(`Estado: ${statusLabel}`, colLeft, infoY + 30);
    if (prescription.consumedAt) {
      doc
        .fillColor(GRAY)
        .text(
          `Consumida el: ${prescription.consumedAt.toLocaleDateString('es-ES')}`,
          colLeft,
          infoY + 44,
        );
    }

    // Notes
    if (prescription.notes) {
      const notesY = infoY + (prescription.consumedAt ? 64 : 50);
      doc
        .fillColor(BRAND_COLOR)
        .font('Helvetica-Bold')
        .text('NOTAS', colLeft, notesY);
      doc
        .fillColor(GRAY)
        .font('Helvetica')
        .fontSize(9)
        .text(prescription.notes, colLeft, notesY + 14, { width: 500 });
    }

    // ── Divider ──────────────────────────────────────────────────────────────
    const dividerY = doc.y + 18;
    doc
      .moveTo(50, dividerY)
      .lineTo(doc.page.width - 50, dividerY)
      .strokeColor(BRAND_COLOR)
      .lineWidth(1.5)
      .stroke();

    // ── Items table ──────────────────────────────────────────────────────────
    const tableStartY = dividerY + 14;
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(BRAND_COLOR)
      .text('ÍTEMS DE LA PRESCRIPCIÓN', 50, tableStartY);

    // Table header
    const headerY = tableStartY + 18;
    doc.rect(50, headerY, 495, 18).fill('#e0e7ff');
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text('MEDICAMENTO', 55, headerY + 4)
      .text('DOSIS', 220, headerY + 4)
      .text('CANTIDAD', 320, headerY + 4)
      .text('INDICACIONES', 400, headerY + 4);

    // Table rows
    let rowY = headerY + 22;
    prescription.items.forEach((item, idx) => {
      const rowColor = idx % 2 === 0 ? 'white' : '#f8faff';
      doc.rect(50, rowY, 495, 26).fill(rowColor);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('black')
        .text(item.name, 55, rowY + 4, { width: 155, ellipsis: true });

      doc
        .font('Helvetica')
        .fillColor('#374151')
        .text(item.dosage ?? '—', 220, rowY + 4, { width: 90 })
        .text(item.quantity != null ? String(item.quantity) : '—', 320, rowY + 4, {
          width: 70,
        })
        .text(item.instructions ?? '—', 400, rowY + 4, {
          width: 140,
          ellipsis: true,
        });

      rowY += 28;
    });

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc
      .moveTo(50, footerY)
      .lineTo(doc.page.width - 50, footerY)
      .strokeColor('#d1d5db')
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor(GRAY)
      .text(
        `Documento generado el ${new Date().toLocaleDateString('es-ES')} — Sistema de Prescripciones Médicas`,
        50,
        footerY + 8,
        { align: 'center', width: 495 },
      );

    doc.end();
  });
}
