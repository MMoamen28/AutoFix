using AutoFix.DTOs.Settings;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface ISettingsService
    {
        Task<WorkshopSettingsDto> GetSettingsAsync();
        Task<WorkshopSettingsDto> UpdateSettingsAsync(WorkshopSettingsDto dto);
    }
}
