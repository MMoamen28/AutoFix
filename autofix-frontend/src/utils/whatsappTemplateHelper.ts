export interface WhatsAppTemplateData {
  customerName?: string | null;
  workshopName?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  carMake?: string | null;
  carModel?: string | null;
  plate?: string | null;
  total: number;
  paid: number;
  remaining: number;
  notes?: string | null;
  workshopPhone?: string | null;
}

export const DEFAULT_WHATSAPP_TEMPLATE = `السلام عليكم {customerName} 🌟

شكرًا لاختياركم *{workshopName}*

📄 *فاتورة رقم:* {invoiceNumber}
📅 *التاريخ:* {invoiceDate}
🚗 *السيارة:* {carMake} {carModel} - {plate}

💰 *الإجمالي:* {total} ج.م
✅ *المدفوع:* {paid} ج.م
{remainingLine}

{notesLine}
📞 للاستفسار: {workshopPhone}

نتمنى لكم رحلة آمنة 🌹`;

export function formatAmountDecimal(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  const rounded = Math.round((Number(val) + Number.EPSILON) * 100) / 100;
  return rounded.toFixed(2);
}

export function buildWhatsAppMessage(template: string | null | undefined, data: WhatsAppTemplateData): string {
  const tpl = (template && template.trim().length > 0) ? template : DEFAULT_WHATSAPP_TEMPLATE;

  const customerName = data.customerName?.trim() || '';
  const workshopName = data.workshopName?.trim() || 'AP AUTO SERVICE CENTER';
  const invoiceNumber = data.invoiceNumber?.trim() || '';
  const invoiceDate = data.invoiceDate?.trim() || '';
  const carMake = data.carMake?.trim() || '';
  const carModel = data.carModel?.trim() || '';
  const plate = data.plate?.trim() || '';
  const totalStr = formatAmountDecimal(data.total);
  const paidStr = formatAmountDecimal(data.paid);

  const remainingLine = data.remaining > 0
    ? `⏳ *المتبقي:* ${formatAmountDecimal(data.remaining)} ج.م`
    : '🎉 تم السداد بالكامل';

  const notesLine = data.notes && data.notes.trim().length > 0
    ? `📝 *ملاحظات:* ${data.notes.trim()}`
    : '';

  const workshopPhone = data.workshopPhone?.trim() || '';

  const lines = tpl.replace(/\r\n/g, '\n').split('\n');
  const resultLines: string[] = [];

  for (const rawLine of lines) {
    let line = rawLine;

    if (line.includes('{notesLine}')) {
      if (!notesLine) {
        continue;
      }
      line = line.replace(/\{notesLine\}/g, notesLine);
    }

    if (line.includes('{workshopPhone}')) {
      if (!workshopPhone) {
        continue;
      }
      line = line.replace(/\{workshopPhone\}/g, workshopPhone);
    }

    line = line.replace(/\{customerName\}/g, customerName);
    line = line.replace(/\{workshopName\}/g, workshopName);
    line = line.replace(/\{invoiceNumber\}/g, invoiceNumber);
    line = line.replace(/\{invoiceDate\}/g, invoiceDate);
    line = line.replace(/\{carMake\}/g, carMake);
    line = line.replace(/\{carModel\}/g, carModel);
    line = line.replace(/\{plate\}/g, plate);
    line = line.replace(/\{total\}/g, totalStr);
    line = line.replace(/\{paid\}/g, paidStr);
    line = line.replace(/\{remainingLine\}/g, remainingLine);

    if (/\{[a-zA-Z0-9_]+\}/.test(line)) {
      continue;
    }

    if (line.includes('undefined') || line.includes('null')) {
      continue;
    }

    resultLines.push(line);
  }

  const trimmedLines: string[] = [];
  let prevEmpty = false;
  for (const l of resultLines) {
    const isBlank = l.trim().length === 0;
    if (isBlank) {
      if (!prevEmpty && trimmedLines.length > 0) {
        trimmedLines.push('');
      }
      prevEmpty = true;
    } else {
      trimmedLines.push(l.trimEnd());
      prevEmpty = false;
    }
  }

  while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1].trim().length === 0) {
    trimmedLines.pop();
  }

  return trimmedLines.join('\n');
}
