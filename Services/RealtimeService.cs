using AutoFix.Hubs;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace AutoFix.Services
{
    public class RealtimeService : IRealtimeService
    {
        private readonly IHubContext<AutoFixHub> _hub;
        public RealtimeService(IHubContext<AutoFixHub> hub) => _hub = hub;

        public async Task NotifyAsync(string eventName, object data)
        {
            await _hub.Clients.All.SendAsync(eventName, data);
        }
    }
}
