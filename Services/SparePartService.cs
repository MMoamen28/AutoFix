using AutoFix.Data;
using AutoFix.DTOs.SparePart;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class SparePartService : ISparePartService
    {
        private readonly AppDbContext _db;
        public SparePartService(AppDbContext db) => _db = db;

        private IQueryable<SparePartResponseDto> Project(IQueryable<SparePart> query)
        {
            return query.Select(sp => new SparePartResponseDto
            {
                Id = sp.Id,
                CategoryId = sp.CategoryId,
                CategoryName = sp.Category.Name,
                Name = sp.Name,
                PartNumber = sp.PartNumber,
                Description = sp.Description,
                Brand = sp.Brand,
                UnitPrice = sp.UnitPrice,
                StockQuantity = sp.StockQuantity,
                MinimumStockLevel = sp.MinimumStockLevel,
                IsLowStock = sp.StockQuantity <= sp.MinimumStockLevel,
                IsActive = sp.IsActive,
                CreatedAt = sp.CreatedAt,
                UpdatedAt = sp.UpdatedAt
            });
        }

        public async Task<List<SparePartResponseDto>> GetAllAsync()
        {
            return await Project(_db.SpareParts.AsNoTracking()).ToListAsync();
        }

        public async Task<List<SparePartResponseDto>> GetByCategoryAsync(int categoryId)
        {
            return await Project(_db.SpareParts.AsNoTracking().Where(sp => sp.CategoryId == categoryId)).ToListAsync();
        }

        public async Task<List<SparePartResponseDto>> GetLowStockAsync()
        {
            return await Project(_db.SpareParts.AsNoTracking())
                .Where(sp => sp.IsActive && sp.IsLowStock)
                .ToListAsync();
        }

        public async Task<SparePartResponseDto?> GetByIdAsync(int id)
        {
            return await Project(_db.SpareParts.AsNoTracking().Where(sp => sp.Id == id)).FirstOrDefaultAsync();
        }

        public async Task<SparePartResponseDto> CreateAsync(CreateSparePartDto dto)
        {
            var part = new SparePart
            {
                CategoryId = dto.CategoryId,
                Name = dto.Name,
                PartNumber = dto.PartNumber,
                Description = dto.Description,
                Brand = dto.Brand,
                UnitPrice = dto.UnitPrice,
                StockQuantity = dto.StockQuantity,
                MinimumStockLevel = dto.MinimumStockLevel,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.SpareParts.Add(part);
            await _db.SaveChangesAsync();

            return (await GetByIdAsync(part.Id))!;
        }

        public async Task<SparePartResponseDto?> UpdateAsync(int id, UpdateSparePartDto dto)
        {
            var part = await _db.SpareParts.FindAsync(id);
            if (part == null) return null;

            part.CategoryId = dto.CategoryId;
            part.Name = dto.Name;
            part.Description = dto.Description;
            part.Brand = dto.Brand;
            part.UnitPrice = dto.UnitPrice;
            part.MinimumStockLevel = dto.MinimumStockLevel;
            part.IsActive = dto.IsActive;
            part.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return await GetByIdAsync(id);
        }

        public async Task<(bool Success, string Error, SparePartResponseDto? Part)> AdjustStockAsync(int id, AdjustStockDto dto)
        {
            var part = await _db.SpareParts.FindAsync(id);
            if (part == null) return (false, "Part not found", null);

            var newQuantity = part.StockQuantity + dto.Adjustment;
            if (newQuantity < 0)
            {
                return (false, "Adjustment would result in negative stock", null);
            }

            part.StockQuantity = newQuantity;
            part.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            var updatedDto = await GetByIdAsync(id);
            return (true, string.Empty, updatedDto);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var part = await _db.SpareParts.FindAsync(id);
            if (part == null) return false;

            _db.SpareParts.Remove(part);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
