using AutoFix.Data;
using AutoFix.DTOs.Customer;
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
    public class CustomerService : ICustomerService
    {
        private readonly AppDbContext _db;
        public CustomerService(AppDbContext db) => _db = db;

        public async Task<List<CustomerResponseDto>> GetAllAsync(bool includeArchived = false)
        {
            var query = includeArchived ? _db.Customers.IgnoreQueryFilters().AsNoTracking() : _db.Customers.AsNoTracking();

            var customers = await query
                .Include(c => c.Cars)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return customers.Select(MapToCustomerResponseDto).ToList();
        }

        public async Task<List<CustomerResponseDto>> SearchAsync(string query, bool includeArchived = false)
        {
            if (string.IsNullOrWhiteSpace(query))
                return await GetAllAsync(includeArchived);

            var rawTrimmed = query.Trim();
            var arabicNorm = ArabicSearchNormalizer.NormalizeArabicText(rawTrimmed);
            var digitsNorm = ArabicSearchNormalizer.NormalizeDigits(rawTrimmed);
            var phoneNorm = ArabicSearchNormalizer.NormalizeEgyptianPhone(rawTrimmed);

            var carQuery = includeArchived ? _db.Cars.IgnoreQueryFilters().AsNoTracking() : _db.Cars.AsNoTracking();

            // Load candidate cars first to avoid SQLite correlated subquery / APPLY limitations
            var matchingCarCustomerIds = await carQuery
                .Where(car => 
                    EF.Functions.Like(car.LicensePlate, $"%{rawTrimmed}%") ||
                    EF.Functions.Like(car.LicensePlate, $"%{digitsNorm}%") ||
                    EF.Functions.Like(car.VIN, $"%{rawTrimmed}%") ||
                    EF.Functions.Like(car.Make, $"%{rawTrimmed}%") ||
                    EF.Functions.Like(car.Model, $"%{rawTrimmed}%"))
                .Select(car => car.CustomerId)
                .Distinct()
                .ToListAsync();

            var custQuery = includeArchived ? _db.Customers.IgnoreQueryFilters().AsNoTracking() : _db.Customers.AsNoTracking();

            var customers = await custQuery
                .Include(c => c.Cars)
                .Where(c => 
                    EF.Functions.Like(c.FullName, $"%{rawTrimmed}%") ||
                    EF.Functions.Like(c.FullName, $"%{arabicNorm}%") ||
                    EF.Functions.Like(c.Phone, $"%{rawTrimmed}%") ||
                    EF.Functions.Like(c.Phone, $"%{digitsNorm}%") ||
                    (!string.IsNullOrEmpty(phoneNorm) && EF.Functions.Like(c.Phone, $"%{phoneNorm}%")) ||
                    (c.ExtraPhone != null && (
                        EF.Functions.Like(c.ExtraPhone, $"%{rawTrimmed}%") ||
                        EF.Functions.Like(c.ExtraPhone, $"%{digitsNorm}%") ||
                        (!string.IsNullOrEmpty(phoneNorm) && EF.Functions.Like(c.ExtraPhone, $"%{phoneNorm}%"))
                    )) ||
                    (c.Email != null && EF.Functions.Like(c.Email, $"%{rawTrimmed}%")) ||
                    matchingCarCustomerIds.Contains(c.Id))
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return customers.Select(MapToCustomerResponseDto).ToList();
        }

        public async Task<CustomerResponseDto?> CheckDuplicatePhoneAsync(string phone, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(phone)) return null;

            var rawClean = phone.Trim();
            var digitsNorm = ArabicSearchNormalizer.NormalizeDigits(rawClean);
            var phoneNorm = ArabicSearchNormalizer.NormalizeEgyptianPhone(rawClean);

            var query = _db.Customers.AsNoTracking().Where(c => !c.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(c => c.Id != excludeId.Value);
            }

            var duplicate = await query.FirstOrDefaultAsync(c =>
                c.Phone == rawClean ||
                c.Phone == digitsNorm ||
                (!string.IsNullOrEmpty(phoneNorm) && c.Phone.EndsWith(phoneNorm)) ||
                c.ExtraPhone == rawClean ||
                c.ExtraPhone == digitsNorm ||
                (!string.IsNullOrEmpty(phoneNorm) && c.ExtraPhone != null && c.ExtraPhone.EndsWith(phoneNorm)));

            if (duplicate == null) return null;

            return MapToCustomerResponseDto(duplicate);
        }

        public async Task<CustomerResponseDto?> GetByIdAsync(int id)
        {
            var customer = await _db.Customers
                .AsNoTracking()
                .Include(c => c.Cars)
                .FirstOrDefaultAsync(c => c.Id == id);

            return customer == null ? null : MapToCustomerResponseDto(customer);
        }

        public async Task<CustomerResponseDto> CreateAsync(CreateCustomerDto dto)
        {
            if (!dto.AllowDuplicate)
            {
                var existing = await CheckDuplicatePhoneAsync(dto.Phone);
                if (existing != null)
                {
                    throw new InvalidOperationException(
                        $"DuplicatePhoneWarning: A customer with phone '{dto.Phone}' already exists ({existing.FullName}, ID: {existing.Id}).");
                }
            }

            var customer = new Customer
            {
                FullName = dto.FullName.Trim(),
                Email = dto.Email?.Trim() ?? string.Empty,
                Phone = ArabicSearchNormalizer.NormalizeDigits(dto.Phone.Trim()),
                ExtraPhone = !string.IsNullOrWhiteSpace(dto.ExtraPhone) ? ArabicSearchNormalizer.NormalizeDigits(dto.ExtraPhone.Trim()) : null,
                Address = dto.Address?.Trim(),
                Notes = dto.Notes?.Trim()
            };

            _db.Customers.Add(customer);
            await _db.SaveChangesAsync();

            return MapToCustomerResponseDto(customer);
        }

        public async Task<QuickAddCustomerCarResponseDto> QuickAddAsync(QuickAddCustomerCarDto dto)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                // 1. Phone duplicate check
                if (!dto.AllowDuplicatePhone)
                {
                    var existingPhone = await CheckDuplicatePhoneAsync(dto.Phone);
                    if (existingPhone != null)
                    {
                        throw new InvalidOperationException(
                            $"DuplicatePhoneWarning: Customer with phone '{dto.Phone}' already exists ({existingPhone.FullName}, ID: {existingPhone.Id}).");
                    }
                }

                // 2. Car duplicate check
                var cleanPlate = ArabicSearchNormalizer.NormalizeDigits(dto.LicensePlate.Trim());
                var cleanVin = !string.IsNullOrWhiteSpace(dto.VIN) ? dto.VIN.Trim().ToUpperInvariant() : null;

                if (!dto.AllowDuplicateCar)
                {
                    var existingCar = await _db.Cars.AsNoTracking()
                        .Include(c => c.Customer)
                        .FirstOrDefaultAsync(c => !c.IsDeleted && (
                            c.LicensePlate == cleanPlate || 
                            (!string.IsNullOrEmpty(cleanVin) && !string.IsNullOrEmpty(c.VIN) && c.VIN == cleanVin)
                        ));

                    if (existingCar != null)
                    {
                        var matchReason = existingCar.LicensePlate == cleanPlate ? $"plate '{cleanPlate}'" : $"VIN '{cleanVin}'";
                        throw new InvalidOperationException(
                            $"DuplicateCarWarning: Car with {matchReason} already exists (Car ID: {existingCar.Id}, Owner: {existingCar.Customer?.FullName ?? "Unknown"}).");
                    }
                }

                // 3. Create customer
                var customer = new Customer
                {
                    FullName = dto.FullName.Trim(),
                    Phone = ArabicSearchNormalizer.NormalizeDigits(dto.Phone.Trim()),
                    ExtraPhone = !string.IsNullOrWhiteSpace(dto.ExtraPhone) ? ArabicSearchNormalizer.NormalizeDigits(dto.ExtraPhone.Trim()) : null,
                    Email = dto.Email?.Trim() ?? string.Empty,
                    Address = dto.Address?.Trim(),
                    Notes = dto.CustomerNotes?.Trim()
                };

                _db.Customers.Add(customer);
                await _db.SaveChangesAsync();

                // 4. Create car
                var car = new Car
                {
                    CustomerId = customer.Id,
                    Make = dto.Make.Trim(),
                    Model = dto.Model.Trim(),
                    Year = dto.Year,
                    LicensePlate = cleanPlate,
                    VIN = cleanVin ?? string.Empty,
                    Color = dto.Color?.Trim(),
                    CurrentOdometerKm = dto.CurrentOdometerKm,
                    Notes = dto.CarNotes?.Trim()
                };

                _db.Cars.Add(car);
                await _db.SaveChangesAsync();

                // 5. Initial odometer log if > 0
                if (car.CurrentOdometerKm > 0)
                {
                    _db.CarOdometerLogs.Add(new CarOdometerLog
                    {
                        CarId = car.Id,
                        OdometerKm = car.CurrentOdometerKm,
                        Source = "QuickAdd",
                        Notes = "Initial mileage recorded during quick-add"
                    });
                    await _db.SaveChangesAsync();
                }

                await tx.CommitAsync();

                // Reload to return full DTOs
                var createdCustomer = await GetByIdAsync(customer.Id);
                var createdCar = createdCustomer!.Cars.First(c => c.Id == car.Id);

                return new QuickAddCustomerCarResponseDto
                {
                    Customer = createdCustomer,
                    Car = createdCar
                };
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<CustomerResponseDto?> UpdateAsync(int id, UpdateCustomerDto dto)
        {
            var customer = await _db.Customers.Include(c => c.Cars).FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (customer == null) return null;

            customer.FullName = dto.FullName.Trim();
            customer.Email = dto.Email?.Trim() ?? string.Empty;
            customer.Phone = ArabicSearchNormalizer.NormalizeDigits(dto.Phone.Trim());
            customer.ExtraPhone = !string.IsNullOrWhiteSpace(dto.ExtraPhone) ? ArabicSearchNormalizer.NormalizeDigits(dto.ExtraPhone.Trim()) : null;
            customer.Address = dto.Address?.Trim();
            customer.Notes = dto.Notes?.Trim();

            await _db.SaveChangesAsync();

            return MapToCustomerResponseDto(customer);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            return await ArchiveAsync(id);
        }

        public async Task<bool> ArchiveAsync(int id)
        {
            var customer = await _db.Customers
                .Include(c => c.Cars)
                .Include(c => c.RepairOrders)
                .Include(c => c.WorkOrders)
                .FirstOrDefaultAsync(c => c.Id == id);
            
            if (customer == null) return false;

            // Block archiving only if there are pending/active in-progress orders
            var hasActiveRepairOrders = customer.RepairOrders
                .Any(ro => !ro.IsDeleted && (ro.Status == "Pending" || ro.Status == "InProgress"));

            var hasActiveWorkOrders = customer.WorkOrders
                .Any(wo => !wo.IsDeleted && (wo.Status == "Pending" || wo.Status == "InProgress" || wo.Status == "WaitingForParts"));
            
            if (hasActiveRepairOrders || hasActiveWorkOrders)
            {
                throw new InvalidOperationException(
                    "Cannot archive customer with active in-progress work orders or repair orders. Please complete or cancel active orders first.");
            }

            customer.IsDeleted = true;
            customer.DeletedAt = DateTime.UtcNow;

            foreach (var car in customer.Cars)
            {
                car.IsDeleted = true;
                car.DeletedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RestoreAsync(int id)
        {
            var customer = await _db.Customers
                .IgnoreQueryFilters()
                .Include(c => c.Cars)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (customer == null || !customer.IsDeleted) return false;

            customer.IsDeleted = false;
            customer.DeletedAt = null;

            foreach (var car in customer.Cars)
            {
                car.IsDeleted = false;
                car.DeletedAt = null;
            }

            await _db.SaveChangesAsync();
            return true;
        }

        private static CustomerResponseDto MapToCustomerResponseDto(Customer c)
        {
            return new CustomerResponseDto
            {
                Id = c.Id,
                FullName = c.FullName,
                Email = c.Email,
                Phone = c.Phone,
                ExtraPhone = c.ExtraPhone,
                Address = c.Address,
                Notes = c.Notes,
                CreatedAt = c.CreatedAt,
                IsDeleted = c.IsDeleted,
                DeletedAt = c.DeletedAt,
                Cars = (c.Cars ?? new List<Car>())
                    .Where(car => !car.IsDeleted)
                    .Select(car => new AutoFix.DTOs.Car.CarResponseDto
                    {
                        Id = car.Id,
                        CustomerId = car.CustomerId,
                        CustomerName = c.FullName,
                        Make = car.Make,
                        Model = car.Model,
                        Year = car.Year,
                        LicensePlate = car.LicensePlate,
                        VIN = car.VIN,
                        Color = car.Color,
                        CurrentOdometerKm = car.CurrentOdometerKm,
                        Notes = car.Notes,
                        IsDeleted = car.IsDeleted,
                        DeletedAt = car.DeletedAt
                    }).ToList()
            };
        }
    }
}
