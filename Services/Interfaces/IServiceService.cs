using AutoFix.DTOs.Service;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IServiceService
    {
        Task<List<ServiceResponseDto>> GetAllAsync();
        Task<ServiceResponseDto?> GetByIdAsync(int id);
        Task<ServiceResponseDto> CreateAsync(CreateServiceDto dto);
        Task<ServiceResponseDto?> UpdateAsync(int id, UpdateServiceDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
