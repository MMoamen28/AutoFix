using AutoFix.DTOs.Mechanic;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IMechanicService
    {
        Task<List<MechanicResponseDto>> GetAllAsync();
        Task<MechanicResponseDto?> GetByIdAsync(int id);
        Task<MechanicResponseDto> CreateAsync(CreateMechanicDto dto);
        Task<MechanicResponseDto?> UpdateAsync(int id, UpdateMechanicDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
