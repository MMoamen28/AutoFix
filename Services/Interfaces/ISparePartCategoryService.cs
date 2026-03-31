using AutoFix.DTOs.SparePartCategory;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface ISparePartCategoryService
    {
        Task<List<SparePartCategoryResponseDto>> GetAllAsync();
        Task<SparePartCategoryResponseDto?> GetByIdAsync(int id);
        Task<SparePartCategoryResponseDto> CreateAsync(CreateSparePartCategoryDto dto);
        Task<SparePartCategoryResponseDto?> UpdateAsync(int id, UpdateSparePartCategoryDto dto);
        Task<(bool Success, string Error)> DeleteAsync(int id);
    }
}
