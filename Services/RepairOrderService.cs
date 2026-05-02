using AutoFix.Data;
using AutoFix.DTOs.RepairOrder;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class RepairOrderService : IRepairOrderService
    {
        private readonly AppDbContext _db;
        public RepairOrderService(AppDbContext db) => _db = db;

        public async Task<List<RepairOrderResponseDto>> GetAllAsync()
        {
            return await _db.RepairOrders
                .AsNoTracking()
                .Select(ro => new RepairOrderResponseDto
                {
                    Id           = ro.Id,
                    Status       = ro.Status,
                    CustomerId   = ro.CustomerId,
                    CustomerName = ro.Customer.FullName,
                    CarPlate     = ro.Car.LicensePlate,
                    CarInfo      = $"{ro.Car.Year} {ro.Car.Make} {ro.Car.Model}",
                    MechanicId   = ro.MechanicId,
                    MechanicName = ro.Mechanic != null
                                     ? $"{ro.Mechanic.FirstName} {ro.Mechanic.LastName}"
                                     : null,
                    TotalCost    = ro.TotalCost,
                    Notes        = ro.Notes,
                    CreatedAt    = ro.CreatedAt,
                    CompletedAt  = ro.CompletedAt,
                    Services     = ro.RepairOrderServices
                                     .Select(ros => ros.Service.Name)
                                     .ToList()
                })
                .ToListAsync();
        }

        public async Task<RepairOrderResponseDto?> GetByIdAsync(int id)
        {
            return await _db.RepairOrders
                .AsNoTracking()
                .Where(ro => ro.Id == id)
                .Select(ro => new RepairOrderResponseDto
                {
                    Id           = ro.Id,
                    Status       = ro.Status,
                    CustomerId   = ro.CustomerId,
                    CustomerName = ro.Customer.FullName,
                    CarPlate     = ro.Car.LicensePlate,
                    CarInfo      = $"{ro.Car.Year} {ro.Car.Make} {ro.Car.Model}",
                    MechanicId   = ro.MechanicId,
                    MechanicName = ro.Mechanic != null
                                     ? $"{ro.Mechanic.FirstName} {ro.Mechanic.LastName}"
                                     : null,
                    TotalCost    = ro.TotalCost,
                    Notes        = ro.Notes,
                    CreatedAt    = ro.CreatedAt,
                    CompletedAt  = ro.CompletedAt,
                    Services     = ro.RepairOrderServices
                                     .Select(ros => ros.Service.Name)
                                     .ToList()
                })
                .FirstOrDefaultAsync();
        }

        public async Task<List<RepairOrderResponseDto>> GetByCustomerIdAsync(int customerId)
        {
            return await _db.RepairOrders
                .AsNoTracking()
                .Where(ro => ro.CustomerId == customerId)
                .Select(ro => new RepairOrderResponseDto
                {
                    Id           = ro.Id,
                    Status       = ro.Status,
                    CustomerId   = ro.CustomerId,
                    CustomerName = ro.Customer.FullName,
                    CarPlate     = ro.Car.LicensePlate,
                    CarInfo      = $"{ro.Car.Year} {ro.Car.Make} {ro.Car.Model}",
                    MechanicId   = ro.MechanicId,
                    MechanicName = ro.Mechanic != null
                                     ? $"{ro.Mechanic.FirstName} {ro.Mechanic.LastName}"
                                     : null,
                    TotalCost    = ro.TotalCost,
                    Notes        = ro.Notes,
                    CreatedAt    = ro.CreatedAt,
                    CompletedAt  = ro.CompletedAt,
                    Services     = ro.RepairOrderServices
                                     .Select(ros => ros.Service.Name)
                                     .ToList()
                })
                .ToListAsync();
        }

        public async Task<RepairOrderResponseDto> CreateAsync(CreateRepairOrderDto dto, int customerId)
        {
            var services = await _db.Services
                .Where(s => dto.ServiceIds.Contains(s.Id))
                .ToListAsync();

            if (services.Count != dto.ServiceIds.Count)
            {
                var foundIds = services.Select(s => s.Id).ToList();
                var missingIds = dto.ServiceIds.Except(foundIds).ToList();
                throw new ArgumentException($"One or more service IDs are invalid: {string.Join(", ", missingIds)}");
            }

            var order = new RepairOrder
            {
                CustomerId = customerId,
                CarId      = dto.CarId,
                Notes      = dto.Notes,
                TotalCost  = services.Sum(s => s.BasePrice),
                RepairOrderServices = services.Select(s => new RepairOrderServiceJoin
                {
                    ServiceId   = s.Id,
                    PriceAtTime = s.BasePrice
                }).ToList()
            };

            _db.RepairOrders.Add(order);
            await _db.SaveChangesAsync();

            return await GetByIdAsync(order.Id) ?? throw new Exception("Order not found after creation");
        }

        public async Task<RepairOrderResponseDto?> UpdateAsync(int id, UpdateRepairOrderDto dto)
        {
            var order = await _db.RepairOrders
                .Include(ro => ro.RepairOrderServices)
                .FirstOrDefaultAsync(ro => ro.Id == id);

            if (order == null) return null;

            order.Status = dto.Status;
            order.MechanicId = dto.MechanicId;
            order.Notes = dto.Notes;

            if (dto.Status == "Completed")
            {
                order.CompletedAt = DateTime.UtcNow;

                // Receipt Generation
                var orderWithDetails = await _db.RepairOrders
                    .Include(ro => ro.Customer)
                    .Include(ro => ro.Car)
                    .Include(ro => ro.Mechanic)
                    .Include(ro => ro.RepairOrderServices)
                        .ThenInclude(ros => ros.Service)
                    .FirstOrDefaultAsync(ro => ro.Id == id);

                if (orderWithDetails != null)
                {
                    var services = orderWithDetails.RepairOrderServices
                        .Select(ros => ros.Service.Name)
                        .ToList();

                    var carInfo = $"{orderWithDetails.Car.Year} {orderWithDetails.Car.Make} {orderWithDetails.Car.Model} — {orderWithDetails.Car.LicensePlate}";
                    var mechanicName = orderWithDetails.Mechanic != null
                        ? $"{orderWithDetails.Mechanic.FirstName} {orderWithDetails.Mechanic.LastName}"
                        : "Unassigned";

                    // Customer copy
                    _db.Receipts.Add(new Receipt
                    {
                        RepairOrderId      = orderWithDetails.Id,
                        CustomerId         = orderWithDetails.CustomerId,
                        CustomerName       = orderWithDetails.Customer.FullName,
                        CustomerEmail      = orderWithDetails.Customer.Email,
                        CustomerPhone      = orderWithDetails.Customer.Phone,
                        CarInfo            = carInfo,
                        MechanicName       = mechanicName,
                        ServicesPerformed  = services,
                        TotalCost          = orderWithDetails.TotalCost,
                        Notes              = orderWithDetails.Notes,
                        IssuedAt           = DateTime.UtcNow,
                        IsOwnerCopy        = false,
                        Status             = "Issued"
                    });

                    // Owner copy
                    _db.Receipts.Add(new Receipt
                    {
                        RepairOrderId      = orderWithDetails.Id,
                        CustomerId         = orderWithDetails.CustomerId,
                        CustomerName       = orderWithDetails.Customer.FullName,
                        CustomerEmail      = orderWithDetails.Customer.Email,
                        CustomerPhone      = orderWithDetails.Customer.Phone,
                        CarInfo            = carInfo,
                        MechanicName       = mechanicName,
                        ServicesPerformed  = services,
                        TotalCost          = orderWithDetails.TotalCost,
                        Notes              = orderWithDetails.Notes,
                        IssuedAt           = DateTime.UtcNow,
                        IsOwnerCopy        = true,
                        Status             = "Issued"
                    });
                }
            }

            await _db.SaveChangesAsync();

            return await GetByIdAsync(order.Id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var order = await _db.RepairOrders.FindAsync(id);
            if (order == null) return false;

            _db.RepairOrders.Remove(order);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
