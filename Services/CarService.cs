using AutoFix.Data;
using AutoFix.DTOs.Car;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class CarService : ICarService
    {
        private readonly AppDbContext _db;
        public CarService(AppDbContext db) => _db = db;

        public async Task<List<CarResponseDto>> GetAllAsync()
        {
            return await _db.Cars
                .AsNoTracking()
                .Select(c => new CarResponseDto
                {
                    Id = c.Id,
                    Make = c.Make,
                    Model = c.Model,
                    Year = c.Year,
                    LicensePlate = c.LicensePlate,
                    VIN = c.VIN
                })
                .ToListAsync();
        }

        public async Task<CarResponseDto?> GetByIdAsync(int id)
        {
            return await _db.Cars
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => new CarResponseDto
                {
                    Id = c.Id,
                    Make = c.Make,
                    Model = c.Model,
                    Year = c.Year,
                    LicensePlate = c.LicensePlate,
                    VIN = c.VIN
                })
                .FirstOrDefaultAsync();
        }

        public async Task<CarResponseDto> CreateAsync(CreateCarDto dto, int customerId)
        {
            var car = new Car
            {
                Make = dto.Make,
                Model = dto.Model,
                Year = dto.Year,
                LicensePlate = dto.LicensePlate,
                VIN = dto.VIN,
                CustomerId = customerId
            };

            _db.Cars.Add(car);
            await _db.SaveChangesAsync();

            return (await GetByIdAsync(car.Id))!;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var car = await _db.Cars.FindAsync(id);
            if (car == null) return false;

            _db.Cars.Remove(car);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
