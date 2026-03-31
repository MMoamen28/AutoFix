using AutoFix.DTOs.Car;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface ICarService
    {
        Task<List<CarResponseDto>> GetAllAsync();
        Task<CarResponseDto?> GetByIdAsync(int id);
        Task<CarResponseDto> CreateAsync(CreateCarDto dto, int customerId);
        Task<bool> DeleteAsync(int id);
    }
}
