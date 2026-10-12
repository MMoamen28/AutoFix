using AutoFix.DTOs.Car;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface ICarService
    {
        Task<List<CarResponseDto>> GetAllAsync(bool includeArchived = false);
        Task<List<CarResponseDto>> GetByCustomerIdAsync(int customerId, bool includeArchived = false);
        Task<List<CarResponseDto>> SearchCarsAsync(string query, bool includeArchived = false);
        Task<List<CarResponseDto>> GetCarsByMechanicAsync(int mechanicId);
        Task<CarResponseDto?> GetByIdAsync(int id);
        Task<CarResponseDto?> CheckDuplicatePlateOrVinAsync(string plate, string vin, int? excludeId = null);
        Task<CarResponseDto> CreateAsync(CreateCarDto dto, int customerId);
        Task<CarResponseDto?> UpdateAsync(int id, CreateCarDto dto);
        Task<CarOdometerLogDto> UpdateOdometerAsync(int carId, UpdateOdometerRequestDto request);
        Task<List<CarOdometerLogDto>> GetOdometerHistoryAsync(int carId);
        Task<bool> DeleteAsync(int id);
        Task<bool> ArchiveAsync(int id);
        Task<bool> RestoreAsync(int id);
    }
}
