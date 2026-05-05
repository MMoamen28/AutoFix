import * as signalR from "@microsoft/signalr";

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  async connect() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl("/hubs/autofix", {
        accessTokenFactory: () => localStorage.getItem("token") || "",
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    const events = ["order-updated", "repair-updated", "inventory-updated", "request-updated", "cart-updated"];
    events.forEach((event) => {
      this.connection!.on(event, (data: any) => {
        this.listeners.get(event)?.forEach((cb) => cb(data));
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
      });
    });

    try {
      await this.connection.start();
      console.log("SignalR connected");
    } catch (err) {
      console.error("SignalR connection failed:", err);
    }
  }

  async disconnect() {
    await this.connection?.stop();
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => { this.listeners.get(event)?.delete(callback); };
  }
}

export const signalRService = new SignalRService();
export default signalRService;
