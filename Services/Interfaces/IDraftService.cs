using AutoFix.DTOs.Draft;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IDraftService
    {
        Task<FormDraftDto?> GetDraftAsync(string userId, string formKey);
        Task<FormDraftDto> SaveDraftAsync(string userId, string formKey, string formDataJson);
        Task<bool> DeleteDraftAsync(string userId, string formKey);
    }
}
