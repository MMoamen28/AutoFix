using AutoFix.Data;
using AutoFix.DTOs.Car;
using AutoFix.Helpers;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class CarService : ICarService
    {
        private readonly AppDbContext _db;
        public CarService(AppDbContext db) => _db = db;

        private static CarResponseDto MapToDto(Car c)
        {
            return new CarResponseDto
            {
                Id = c.Id,
                CustomerId = c.CustomerId,
                CustomerName = c.Customer?.FullName,
                Make = c.Make,
                Model = c.Model,
                Year = c.Year,
                LicensePlate = c.LicensePlate,
                VIN = c.VIN,
                Color = c.Color,
                CurrentOdometerKm = c.CurrentOdometerKm,
                Notes = c.Notes,
                IsDeleted = c.IsDeleted,
                DeletedAt = c.DeletedAt
            };
        }

        public async Task<List<CarResponseDto>> GetAllAsync(bool includeArchived = false)
        {
            var query = includeArchived ? _db.Cars.IgnoreQueryFilters().AsNoTracking() : _db.Cars.AsNoTracking();
            var cars = await query.Include(c => c.Customer).OrderByDescending(c => c.Id).ToListAsync();
            return cars.Select(MapToDto).ToList();
        }

        public async Task<List<CarResponseDto>> GetByCustomerIdAsync(int customerId, bool includeArchived = false)
        {
            var query = includeArchived ? _db.Cars.IgnoreQueryFilters().AsNoTracking() : _db.Cars.AsNoTracking();
            var cars = await query
                .Include(c => c.Customer)
                .Where(c => c.CustomerId == customerId)
                .OrderByDescending(c => c.Id)
                .ToListAsync();

            return cars.Select(MapToDto).ToList();
        }

        public async Task<List<CarResponseDto>> SearchCarsAsync(string query, bool includeArchived = false)
        {
            if (string.IsNullOrWhiteSpace(query))
                return await GetAllAsync(includeArchived);

            var rawTrimmed = query.Trim();
            var digitsNorm = ArabicSearchNormalizer.NormalizeDigits(rawTrimmed);

            var carQuery = includeArchived ? _db.Cars.IgnoreQueryFilters().AsNoTracking() : _db.Cars.AsNoTracking();

            var cars = await carQuery
                .Include(c => c.Customer)
                .Where(c =>
                    EF.Functions.Like(c.LicensePlate, $"%{rawTrimmed}%") ||
                    EF.Functions.Like(c.LicensePlate, $"%{digitsNorm}%") ||
                    EF.Functions.Like(c.VIN, $"%{rawTrimmed}%") ||
                    EF.Functions.Like(c.Make, $"%{rawTrimmed}%") ||
                    EF.Functions.Like(c.Model, $"%{rawTrimmed}%") ||
                    (c.Customer != null && EF.Functions.Like(c.Customer.FullName, $"%{rawTrimmed}%")))
                .OrderByDescending(c => c.Id)
                .ToListAsync();

            return cars.Select(MapToDto).ToList();
        }

        public async Task<List<CarResponseDto>> GetCarsByMechanicAsync(int mechanicId)
        {
            // Find distinct cars where mechanic was assigned to work orders, lines, or repair orders
            var workOrderCarIds = await _db.WorkOrders
                .AsNoTracking()
                .Where(wo => !wo.IsDeleted && (
                    wo.AssignedTechnicianId == mechanicId ||
                    wo.Lines.Any(l => !l.IsDeleted && l.TechnicianId == mechanicId)))
                .Select(wo => wo.CarId)
                .Distinct()
                .ToListAsync();

            var repairOrderCarIds = await _db.RepairOrders
                .AsNoTracking()
                .Where(ro => !ro.IsDeleted && ro.MechanicId == mechanicId)
                .Select(ro => ro.CarId)
                .Distinct()
                .ToListAsync();

            var allCarIds = workOrderCarIds.Union(repairOrderCarIds).Distinct().ToList();

            var cars = await _db.Cars
                .AsNoTracking()
                .Include(c => c.Customer)
                .Where(c => allCarIds.Contains(c.Id))
                .OrderByDescending(c => c.Id)
                .ToListAsync();

            return cars.Select(MapToDto).ToList();
        }

        public async Task<CarResponseDto?> GetByIdAsync(int id)
        {
            var car = await _db.Cars
                .AsNoTracking()
                .Include(c => c.Customer)
                .FirstOrDefaultAsync(c => c.Id == id);

            return car == null ? null : MapToDto(car);
        }

        public async Task<CarResponseDto?> CheckDuplicatePlateOrVinAsync(string plate, string vin, int? excludeId = null)
        {
            var cleanPlate = ArabicSearchNormalizer.NormalizeDigits((plate ?? "").Trim());
            var cleanVin = (vin ?? "").Trim().ToUpperInvariant();

            var query = _db.Cars.AsNoTracking().Include(c => c.Customer).Where(c => !c.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(c => c.Id != excludeId.Value);
            }

            var duplicate = await query.FirstOrDefaultAsync(c =>
                (!string.IsNullOrEmpty(cleanPlate) && c.LicensePlate == cleanPlate) ||
                (!string.IsNullOrEmpty(cleanVin) && c.VIN == cleanVin));

            return duplicate == null ? null : MapToDto(duplicate);
        }

        public async Task<CarResponseDto> CreateAsync(CreateCarDto dto, int customerId)
        {
            var cleanPlate = ArabicSearchNormalizer.NormalizeDigits(dto.LicensePlate.Trim());
            var cleanVin = dto.VIN.Trim().ToUpperInvariant();

            if (!dto.AllowDuplicate)
            {
                var duplicate = await CheckDuplicatePlateOrVinAsync(cleanPlate, cleanVin);
                if (duplicate != null)
                {
                    throw new InvalidOperationException(
                        $"DuplicateCarWarning: Car with plate '{cleanPlate}' or VIN '{cleanVin}' already exists (Car ID: {duplicate.Id}, Owner: {duplicate.CustomerName ?? "Unknown"}).");
                }
            }

            var car = new Car
            {
                Make = dto.Make.Trim(),
                Model = dto.Model.Trim(),
                Year = dto.Year,
                LicensePlate = cleanPlate,
                VIN = cleanVin,
                Color = dto.Color?.Trim(),
                CurrentOdometerKm = dto.CurrentOdometerKm,
                Notes = dto.Notes?.Trim(),
                CustomerId = customerId
            };

            _db.Cars.Add(car);
            await _db.SaveChangesAsync();

            if (car.CurrentOdometerKm > 0)
            {
                _db.CarOdometerLogs.Add(new CarOdometerLog
                {
                    CarId = car.Id,
                    OdometerKm = car.CurrentOdometerKm,
                    Source = "Manual",
                    Notes = "Initial mileage recorded on car creation"
                });
                await _db.SaveChangesAsync();
            }

            return (await GetByIdAsync(car.Id))!;
        }

        public async Task<CarResponseDto?> UpdateAsync(int id, CreateCarDto dto)
        {
            var car = await _db.Cars.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (car == null) return null;

            var oldKm = car.CurrentOdometerKm;
            var newKm = dto.CurrentOdometerKm;

            if (newKm != oldKm)
            {
                if (newKm < oldKm && !dto.AllowLowerOdometer)
                {
                    throw new InvalidOperationException(
                        $"LowerOdometerWarning: New reading ({newKm} km) is lower than previous reading ({oldKm} km). Confirmation required.");
                }

                _db.CarOdometerLogs.Add(new CarOdometerLog
                {
                    CarId = car.Id,
                    OdometerKm = newKm,
                    Source = "Manual",
                    Notes = dto.Notes ?? "Odometer updated during car edit",
                    IsLowerReadingWarning = newKm < oldKm
                });

                car.CurrentOdometerKm = newKm;
            }

            car.Make = dto.Make.Trim();
            car.Model = dto.Model.Trim();
            car.Year = dto.Year;
            car.LicensePlate = ArabicSearchNormalizer.NormalizeDigits(dto.LicensePlate.Trim());
            car.VIN = dto.VIN.Trim().ToUpperInvariant();
            car.Color = dto.Color?.Trim();
            car.Notes = dto.Notes?.Trim();
            if (dto.CustomerId.HasValue)
            {
                car.CustomerId = dto.CustomerId.Value;
            }

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(car.Id))!;
        }

        public async Task<CarOdometerLogDto> UpdateOdometerAsync(int carId, UpdateOdometerRequestDto request)
        {
            var car = await _db.Cars.FirstOrDefaultAsync(c => c.Id == carId && !c.IsDeleted);
            if (car == null) throw new KeyNotFoundException($"Car with ID {carId} not found.");

            var oldKm = car.CurrentOdometerKm;
            var newKm = request.NewOdometerKm;

            if (newKm < oldKm && !request.AllowLowerOdometer)
            {
                throw new InvalidOperationException(
                    $"LowerOdometerWarning: New reading ({newKm} km) is lower than current reading ({oldKm} km). Confirmation required.");
            }

            var log = new CarOdometerLog
            {
                CarId = car.Id,
                OdometerKm = newKm,
                Source = string.IsNullOrWhiteSpace(request.Source) ? "Manual" : request.Source,
                ReferenceId = request.ReferenceId,
                Notes = request.Notes,
                IsLowerReadingWarning = newKm < oldKm,
                RecordedAt = DateTime.UtcNow
            };

            car.CurrentOdometerKm = newKm;
            _db.CarOdometerLogs.Add(log);
            await _db.SaveChangesAsync();

            return new CarOdometerLogDto
            {
                Id = log.Id,
                CarId = log.CarId,
                OdometerKm = log.OdometerKm,
                RecordedAt = log.RecordedAt,
                Source = log.Source,
                ReferenceId = log.ReferenceId,
                Notes = log.Notes,
                IsLowerReadingWarning = log.IsLowerReadingWarning
            };
        }

        public async Task<List<CarOdometerLogDto>> GetOdometerHistoryAsync(int carId)
        {
            var logs = await _db.CarOdometerLogs
                .AsNoTracking()
                .Where(l => l.CarId == carId && !l.IsDeleted)
                .OrderByDescending(l => l.RecordedAt)
                .ThenByDescending(l => l.Id)
                .ToListAsync();

            return logs.Select(l => new CarOdometerLogDto
            {
                Id = l.Id,
                CarId = l.CarId,
                OdometerKm = l.OdometerKm,
                RecordedAt = l.RecordedAt,
                Source = l.Source,
                ReferenceId = l.ReferenceId,
                Notes = l.Notes,
                IsLowerReadingWarning = l.IsLowerReadingWarning
            }).ToList();
        }

        public async Task<bool> DeleteAsync(int id)
        {
            return await ArchiveAsync(id);
        }

        public async Task<bool> ArchiveAsync(int id)
        {
            var car = await _db.Cars
                .Include(c => c.RepairOrders)
                .Include(c => c.WorkOrders)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (car == null) return false;

            var hasActiveRepairOrders = car.RepairOrders
                .Any(ro => !ro.IsDeleted && (ro.Status == "Pending" || ro.Status == "InProgress"));

            var hasActiveWorkOrders = car.WorkOrders
                .Any(wo => !wo.IsDeleted && (wo.Status == "Pending" || wo.Status == "InProgress" || wo.Status == "WaitingForParts"));

            if (hasActiveRepairOrders || hasActiveWorkOrders)
            {
                throw new InvalidOperationException(
                    "Cannot archive car with active in-progress orders. Complete or cancel orders first.");
            }

            car.IsDeleted = true;
            car.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RestoreAsync(int id)
        {
            var car = await _db.Cars
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == id);

            if (car == null || !car.IsDeleted) return false;

            car.IsDeleted = false;
            car.DeletedAt = null;
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
