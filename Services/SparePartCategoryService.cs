using AutoFix.Data;
using AutoFix.DTOs.SparePartCategory;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class SparePartCategoryService : ISparePartCategoryService
    {
        private readonly AppDbContext _db;
        public SparePartCategoryService(AppDbContext db) => _db = db;

        public async Task<List<SparePartCategoryResponseDto>> GetAllAsync()
        {
            return await _db.SparePartCategories
                .AsNoTracking()
                .Select(c => new SparePartCategoryResponseDto
                {
                    Id          = c.Id,
                    Name        = c.Name,
                    Description = c.Description,
                    TotalParts  = c.SpareParts.Count,
                    ActiveParts = c.SpareParts.Count(sp => sp.IsActive)
                })
                .ToListAsync();
        }

        public async Task<SparePartCategoryResponseDto?> GetByIdAsync(int id)
        {
            return await _db.SparePartCategories
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => new SparePartCategoryResponseDto
                {
                    Id          = c.Id,
                    Name        = c.Name,
                    Description = c.Description,
                    TotalParts  = c.SpareParts.Count,
                    ActiveParts = c.SpareParts.Count(sp => sp.IsActive)
                })
                .FirstOrDefaultAsync();
        }

        public async Task<SparePartCategoryResponseDto> CreateAsync(CreateSparePartCategoryDto dto)
        {
            var category = new SparePartCategory
            {
                Name = dto.Name,
                Description = dto.Description
            };

            _db.SparePartCategories.Add(category);
            await _db.SaveChangesAsync();

            return (await GetByIdAsync(category.Id))!;
        }

        public async Task<SparePartCategoryResponseDto?> UpdateAsync(int id, UpdateSparePartCategoryDto dto)
        {
            var category = await _db.SparePartCategories.FindAsync(id);
            if (category == null) return null;

            category.Name = dto.Name;
            category.Description = dto.Description;

            await _db.SaveChangesAsync();

            return await GetByIdAsync(id);
        }

        public async Task<(bool Success, string Error)> DeleteAsync(int id)
        {
            var category = await _db.SparePartCategories
                .Include(c => c.SpareParts)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null) return (false, "Category not found");

            if (category.SpareParts.Any())
            {
                return (false, "Cannot delete a category that has spare parts assigned to it");
            }

            _db.SparePartCategories.Remove(category);
            await _db.SaveChangesAsync();

            return (true, string.Empty);
        }
    }
}
