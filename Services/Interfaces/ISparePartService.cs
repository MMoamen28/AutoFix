using AutoFix.DTOs.SparePart;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface ISparePartService
    {
        Task<List<SparePartResponseDto>> GetAllAsync();
        Task<List<SparePartResponseDto>> GetByCategoryAsync(int categoryId);
        Task<List<SparePartResponseDto>> GetLowStockAsync();
        Task<SparePartResponseDto?> GetByIdAsync(int id);
        Task<List<SparePartResponseDto>> GetMarketplaceAsync();
        Task<SparePartResponseDto> CreateAsync(CreateSparePartDto dto);
        Task<SparePartResponseDto?> UpdateAsync(int id, UpdateSparePartDto dto);
        Task<(bool Success, string Error, SparePartResponseDto? Part)> AdjustStockAsync(int id, AdjustStockDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
