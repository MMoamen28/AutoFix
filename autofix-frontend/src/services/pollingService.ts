import axiosClient from './axiosClient';

class PollingService {
  private intervalId: any = null;
  private lastMarkers: { customers: number; workOrders: number; invoices: number } = {
    customers: 0,
    workOrders: 0,
    invoices: 0
  };
  private isInitialized = false;

  start() {
    if (this.intervalId) return;
    this.poll();
    this.intervalId = setInterval(() => this.poll(), 8000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async poll() {
    try {
      const res = await axiosClient.get('/sync/markers');
      window.dispatchEvent(new CustomEvent('server-connection-changed', { detail: { connected: true } }));

      if (!res.data) return;
      const { customers, workOrders, invoices } = res.data;

      if (!this.isInitialized) {
        this.lastMarkers = { customers, workOrders, invoices };
        this.isInitialized = true;
        return;
      }

      if (customers && customers !== this.lastMarkers.customers) {
        this.lastMarkers.customers = customers;
        window.dispatchEvent(new CustomEvent('customer-updated', { detail: { fromPolling: true } }));
      }

      if (workOrders && workOrders !== this.lastMarkers.workOrders) {
        this.lastMarkers.workOrders = workOrders;
        window.dispatchEvent(new CustomEvent('workorder-updated', { detail: { fromPolling: true } }));
      }

      if (invoices && invoices !== this.lastMarkers.invoices) {
        this.lastMarkers.invoices = invoices;
        window.dispatchEvent(new CustomEvent('invoice-updated', { detail: { fromPolling: true } }));
      }
    } catch {
      window.dispatchEvent(new CustomEvent('server-connection-changed', { detail: { connected: false } }));
    }
  }

  updateMarker(type: 'customers' | 'workOrders' | 'invoices', value: number) {
    this.lastMarkers[type] = value;
  }
}

export const pollingService = new PollingService();
export default pollingService;
