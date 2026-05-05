namespace AutoFix.Services.Interfaces
{
    public interface IRealtimeService
    {
        Task NotifyAsync(string eventName, object data);
    }
}
