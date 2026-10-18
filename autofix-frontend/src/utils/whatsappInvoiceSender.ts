import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import axiosClient from '../services/axiosClient';
import { normalizePhoneForWhatsApp } from './phoneNormalizer';
import { buildWhatsAppMessage, WhatsAppTemplateData } from './whatsappTemplateHelper';

export interface SendWhatsAppOptions {
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate?: string;
  customerName?: string;
  customerPhone?: string;
  carMake?: string;
  carModel?: string;
  plate?: string;
  total: number;
  paid: number;
  remaining: number;
  notes?: string;
  iframeElement?: HTMLIFrameElement | null;
  onEditPhone?: () => void;
  onSuccess?: (timestamp: string) => void;
}

export async function sendInvoiceViaWhatsApp(options: SendWhatsAppOptions): Promise<void> {
  const {
    invoiceId,
    invoiceNumber,
    invoiceDate,
    customerName,
    customerPhone,
    carMake,
    carModel,
    plate,
    total,
    paid,
    remaining,
    notes,
    iframeElement,
    onEditPhone,
    onSuccess
  } = options;

  const deviceName = localStorage.getItem('autofix_device_name') || 'لابتوب الإدارة';

  const normalizedPhone = normalizePhoneForWhatsApp(customerPhone);
  if (!normalizedPhone) {
    try {
      await axiosClient.post(`/invoices/${invoiceId}/whatsapp-log`, {
        attempt: 'invalid_phone',
        deviceName,
        errorMessage: `Invalid customer phone: ${customerPhone || 'empty'}`
      });
    } catch {}

    toast.error('رقم هاتف العميل غير صالح لإرسال واتساب (يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015). يرجى تعديل هاتف العميل.', {
      duration: 7000
    });

    if (onEditPhone) {
      onEditPhone();
    }
    return;
  }

  let workshopName = 'AP AUTO SERVICE CENTER';
  let workshopPhone = '01277252262';
  let messageTemplate: string | null = null;

  try {
    const settingsRes = await axiosClient.get('/settings');
    if (settingsRes.data) {
      if (settingsRes.data.workshopName) workshopName = settingsRes.data.workshopName;
      if (settingsRes.data.workshopPhone) workshopPhone = settingsRes.data.workshopPhone;
      if (settingsRes.data.whatsAppMessageTemplate) messageTemplate = settingsRes.data.whatsAppMessageTemplate;
    }
  } catch {}

  const templateData: WhatsAppTemplateData = {
    customerName,
    workshopName,
    invoiceNumber,
    invoiceDate: invoiceDate ? invoiceDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
    carMake,
    carModel,
    plate,
    total,
    paid,
    remaining,
    notes,
    workshopPhone
  };

  const message = buildWhatsAppMessage(messageTemplate, templateData);

  let targetElement: HTMLElement | null = null;
  let tempContainer: HTMLDivElement | null = null;

  if (iframeElement && iframeElement.contentDocument && iframeElement.contentDocument.body) {
    targetElement = iframeElement.contentDocument.body;
  } else {
    try {
      const htmlRes = await axiosClient.get<string>(`/invoices/${invoiceId}/preview`, { responseType: 'text' as any });
      tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.zIndex = '-1000';
      tempContainer.innerHTML = htmlRes.data;
      document.body.appendChild(tempContainer);
      targetElement = tempContainer;
    } catch (err) {
      console.error('Failed to load invoice html for capture:', err);
    }
  }

  let canvas: HTMLCanvasElement | null = null;
  if (targetElement) {
    try {
      canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => el.classList?.contains('no-print')
      });
    } catch (err) {
      console.error('html2canvas rendering failed:', err);
    }
  }

  if (tempContainer && document.body.contains(tempContainer)) {
    document.body.removeChild(tempContainer);
  }

  let blob: Blob | null = null;
  if (canvas) {
    try {
      blob = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, 'image/png'));
    } catch {}

    try {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`Invoice-${invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Fallback PDF download error:', err);
    }
  }

  let clipboardSuccess = false;
  if (blob && navigator.clipboard && typeof navigator.clipboard.write === 'function') {
    try {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      clipboardSuccess = true;
    } catch (err) {
      clipboardSuccess = false;
    }
  }

  const encodedMsg = encodeURIComponent(message);
  const primaryUrl = `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedMsg}`;
  const fallbackUrl = `https://wa.me/${normalizedPhone}?text=${encodedMsg}`;

  let opened = false;
  try {
    const win = window.open(primaryUrl, 'autofix_whatsapp');
    if (win && !win.closed) {
      opened = true;
    }
  } catch {}

  if (!opened) {
    try {
      window.open(fallbackUrl, 'autofix_whatsapp');
    } catch {}
  }

  if (clipboardSuccess) {
    try {
      const logRes = await axiosClient.post(`/invoices/${invoiceId}/whatsapp-log`, {
        attempt: 'opened',
        deviceName
      });
      if (onSuccess && logRes.data?.timestamp) {
        onSuccess(logRes.data.timestamp);
      }
    } catch {}

    toast.success('تم نسخ الفاتورة. في واتساب اضغط Ctrl+V ثم إرسال', {
      duration: 6000
    });
  } else {
    try {
      await axiosClient.post(`/invoices/${invoiceId}/whatsapp-log`, {
        attempt: 'clipboard_failed',
        deviceName,
        errorMessage: 'Clipboard write failed (requires secure context or permission)'
      });
    } catch {}

    toast.error('تعذر نسخ صورة الفاتورة إلى الحافظة. تم تنزيل ملف PDF تلقائيًا كبديل، يرجى إرفاقه في واتساب.', {
      duration: 8000
    });
  }
}
