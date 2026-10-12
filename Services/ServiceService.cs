using AutoFix.Data;
using AutoFix.DTOs.Service;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class ServiceService : IServiceService
    {
        private readonly AppDbContext _db;
        public ServiceService(AppDbContext db) => _db = db;

        public async Task<List<ServiceResponseDto>> GetAllAsync(bool includeArchived = false)
        {
            var query = _db.Services.AsNoTracking();
            if (includeArchived)
            {
                query = query.IgnoreQueryFilters();
            }

            return await query
                .Select(s => new ServiceResponseDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    NameArabic = s.NameArabic,
                    Description = s.Description,
                    Category = s.Category,
                    BasePrice = s.BasePrice,
                    DefaultCost = s.DefaultCost,
                    EstimatedMinutes = s.EstimatedMinutes,
                    IsActive = s.IsActive && !s.IsDeleted,
                    IsDeleted = s.IsDeleted
                })
                .ToListAsync();
        }

        public async Task<ServiceResponseDto?> GetByIdAsync(int id)
        {
            return await _db.Services
                .AsNoTracking()
                .Where(s => s.Id == id)
                .Select(s => new ServiceResponseDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    NameArabic = s.NameArabic,
                    Description = s.Description,
                    Category = s.Category,
                    BasePrice = s.BasePrice,
                    DefaultCost = s.DefaultCost,
                    EstimatedMinutes = s.EstimatedMinutes,
                    IsActive = s.IsActive && !s.IsDeleted,
                    IsDeleted = s.IsDeleted
                })
                .FirstOrDefaultAsync();
        }

        public async Task<ServiceResponseDto> CreateAsync(CreateServiceDto dto)
        {
            var service = new Service
            {
                Name = dto.Name.Trim(),
                NameArabic = dto.NameArabic?.Trim() ?? string.Empty,
                Description = dto.Description?.Trim() ?? string.Empty,
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "Mechanical" : dto.Category.Trim(),
                BasePrice = dto.BasePrice,
                DefaultCost = dto.DefaultCost,
                EstimatedMinutes = dto.EstimatedMinutes,
                IsActive = dto.IsActive
            };

            _db.Services.Add(service);
            await _db.SaveChangesAsync();

            return (await GetByIdAsync(service.Id))!;
        }

        public async Task<ServiceResponseDto?> UpdateAsync(int id, UpdateServiceDto dto)
        {
            var service = await _db.Services.FindAsync(id);
            if (service == null) return null;

            service.Name = dto.Name.Trim();
            service.NameArabic = dto.NameArabic?.Trim() ?? string.Empty;
            service.Description = dto.Description?.Trim() ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(dto.Category))
            {
                service.Category = dto.Category.Trim();
            }
            service.BasePrice = dto.BasePrice;
            service.DefaultCost = dto.DefaultCost;
            service.EstimatedMinutes = dto.EstimatedMinutes;
            service.IsActive = dto.IsActive;

            await _db.SaveChangesAsync();

            return await GetByIdAsync(service.Id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var service = await _db.Services.FindAsync(id);
            if (service == null) return false;

            // Soft-delete archiving: mark deleted and inactive
            service.IsDeleted = true;
            service.DeletedAt = System.DateTime.UtcNow;
            service.IsActive = false;

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RestoreAsync(int id)
        {
            var service = await _db.Services.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Id == id);
            if (service == null) return false;

            service.IsDeleted = false;
            service.DeletedAt = null;
            service.DeletedBy = null;
            service.IsActive = true;

            await _db.SaveChangesAsync();
            return true;
        }
    }
}
