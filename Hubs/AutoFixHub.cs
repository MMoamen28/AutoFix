using Microsoft.AspNetCore.SignalR;

namespace AutoFix.Hubs
{
    public class AutoFixHub : Hub
    {
        public async Task NotifyAll(string eventName, object data)
        {
            await Clients.All.SendAsync(eventName, data);
        }
    }
}
