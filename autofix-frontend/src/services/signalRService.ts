import * as signalR from "@microsoft/signalr";

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private registeredHubEvents: Set<string> = new Set();
  private isConnected = false;

  async connect() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl("/hubs/autofix", {
        accessTokenFactory: () => localStorage.getItem("token") || "",
      })
      .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.onreconnecting(() => {
      this.isConnected = false;
      window.dispatchEvent(new CustomEvent("server-connection-changed", { detail: { connected: false } }));
    });

    this.connection.onreconnected(() => {
      this.isConnected = true;
      window.dispatchEvent(new CustomEvent("server-connection-changed", { detail: { connected: true } }));
    });

    this.connection.onclose(() => {
      this.isConnected = false;
      window.dispatchEvent(new CustomEvent("server-connection-changed", { detail: { connected: false } }));
    });

    const defaultEvents = [
      "workorder-created",
      "workorder-updated",
      "invoice-updated",
      "invoice-issued",
      "customer-created",
      "customer-updated",
      "dashboard-updated",
      "inventory-updated",
      "expense-updated",
      "order-updated",
      "repair-updated",
      "request-updated",
      "cart-updated"
    ];

    defaultEvents.forEach((evt) => this.registerHubEvent(evt));

    this.listeners.forEach((_, evt) => {
      this.registerHubEvent(evt);
    });

    try {
      await this.connection.start();
      this.isConnected = true;
      window.dispatchEvent(new CustomEvent("server-connection-changed", { detail: { connected: true } }));
    } catch {
      this.isConnected = false;
      window.dispatchEvent(new CustomEvent("server-connection-changed", { detail: { connected: false } }));
    }
  }

  private registerHubEvent(event: string) {
    if (!this.connection || this.registeredHubEvents.has(event)) return;
    this.registeredHubEvents.add(event);
    this.connection.on(event, (data: any) => {
      this.listeners.get(event)?.forEach((cb) => cb(data));
      window.dispatchEvent(new CustomEvent(event, { detail: data }));
    });
  }

  async disconnect() {
    this.isConnected = false;
    await this.connection?.stop();
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    this.registerHubEvent(event);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export const signalRService = new SignalRService();
export default signalRService;
