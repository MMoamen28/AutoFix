using AutoFix.DTOs.Mechanic;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IMechanicService
    {
        Task<List<MechanicResponseDto>> GetAllAsync(bool includeArchived = false);
        Task<MechanicResponseDto?> GetByIdAsync(int id);
        Task<MechanicResponseDto> CreateAsync(CreateMechanicDto dto);
        Task<MechanicResponseDto?> UpdateAsync(int id, UpdateMechanicDto dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> ArchiveAsync(int id);
        Task<bool> RestoreAsync(int id);
        Task<MechanicWorkHistoryDto?> GetWorkHistoryAsync(int id, System.DateTime? from = null, System.DateTime? to = null);
    }
}
