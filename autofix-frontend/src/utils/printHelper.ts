import invoiceService from '../services/invoiceService';
import { workOrderService } from '../services/workOrderService';

/**
 * Print HTML content directly from the current view using a hidden iframe.
 * Never opens a new tab, never navigates away, and prevents 401 unauthenticated print failures.
 */
export function printHtmlInIframe(html: string): void {
  // Remove any leftover print frames
  const oldIframe = document.getElementById('autofix-silent-print-frame');
  if (oldIframe) {
    document.body.removeChild(oldIframe);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'autofix-silent-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('title', 'AutoFix Print Frame');

  // Use UTF-8 Blob URL to guarantee UTF-8 decoding without ANSI/Latin-1 distortion
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Error invoking print dialog:', e);
      } finally {
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 400);
  };

  document.body.appendChild(iframe);
}

/**
 * Download HTML document as a file (compatible with all browsers and PDF readers)
 */
export function downloadHtmlFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * High-level helper: Print Invoice directly from current screen
 */
export async function printInvoiceInPlace(invoiceId: number): Promise<void> {
  const html = await invoiceService.getPrintHtml(invoiceId);
  printHtmlInIframe(html);
}

/**
 * High-level helper: Download Invoice HTML
 */
export async function downloadInvoiceDoc(invoiceId: number, invoiceNumber: string): Promise<void> {
  const html = await invoiceService.getPrintHtml(invoiceId);
  downloadHtmlFile(html, `Invoice_${invoiceNumber || invoiceId}.html`);
}

/**
 * High-level helper: Print Work Order directly from current screen
 */
export async function printWorkOrderInPlace(workOrderId: number): Promise<void> {
  const html = await workOrderService.getPrintHtml(workOrderId);
  printHtmlInIframe(html);
}

/**
 * High-level helper: Download Work Order HTML
 */
export async function downloadWorkOrderDoc(workOrderId: number, orderNumber: string): Promise<void> {
  const html = await workOrderService.getPrintHtml(workOrderId);
  downloadHtmlFile(html, `WorkOrder_${orderNumber || workOrderId}.html`);
}
