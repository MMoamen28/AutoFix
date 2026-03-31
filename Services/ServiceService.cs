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

        public async Task<List<ServiceResponseDto>> GetAllAsync()
        {
            return await _db.Services
                .AsNoTracking()
                .Select(s => new ServiceResponseDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    BasePrice = s.BasePrice,
                    EstimatedMinutes = s.EstimatedMinutes
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
                    Description = s.Description,
                    BasePrice = s.BasePrice,
                    EstimatedMinutes = s.EstimatedMinutes
                })
                .FirstOrDefaultAsync();
        }

        public async Task<ServiceResponseDto> CreateAsync(CreateServiceDto dto)
        {
            var service = new Service
            {
                Name = dto.Name,
                Description = dto.Description,
                BasePrice = dto.BasePrice,
                EstimatedMinutes = dto.EstimatedMinutes
            };

            _db.Services.Add(service);
            await _db.SaveChangesAsync();

            return await GetByIdAsync(service.Id);
        }

        public async Task<ServiceResponseDto?> UpdateAsync(int id, UpdateServiceDto dto)
        {
            var service = await _db.Services.FindAsync(id);
            if (service == null) return null;

            service.Name = dto.Name;
            service.Description = dto.Description;
            service.BasePrice = dto.BasePrice;
            service.EstimatedMinutes = dto.EstimatedMinutes;

            await _db.SaveChangesAsync();

            return await GetByIdAsync(service.Id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var service = await _db.Services.FindAsync(id);
            if (service == null) return false;

            _db.Services.Remove(service);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
