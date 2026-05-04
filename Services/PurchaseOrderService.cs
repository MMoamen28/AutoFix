using AutoFix.Data;
using AutoFix.DTOs.PurchaseOrder;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class PurchaseOrderService : IPurchaseOrderService
    {
        private readonly AppDbContext _db;
        public PurchaseOrderService(AppDbContext db) => _db = db;

        public async Task<List<PurchaseOrderResponseDto>> GetAllAsync()
        {
            var orders = await _db.PurchaseOrders
                .Include(o => o.Customer)
                .Include(o => o.Car)
                .Include(o => o.Mechanic)
                .Include(o => o.Items)
                .AsNoTracking()
                .ToListAsync();

            return orders.Select(MapToDto).ToList();
        }

        public async Task<List<PurchaseOrderResponseDto>> GetByCustomerIdAsync(int customerId)
        {
            var orders = await _db.PurchaseOrders
                .Where(o => o.CustomerId == customerId)
                .Include(o => o.Customer)
                .Include(o => o.Car)
                .Include(o => o.Mechanic)
                .Include(o => o.Items)
                .AsNoTracking()
                .ToListAsync();

            return orders.Select(MapToDto).ToList();
        }

        public async Task<List<PurchaseOrderResponseDto>> GetByMechanicIdAsync(int mechanicId)
        {
            var orders = await _db.PurchaseOrders
                .Where(o => o.MechanicId == mechanicId)
                .Include(o => o.Customer)
                .Include(o => o.Car)
                .Include(o => o.Mechanic)
                .Include(o => o.Items)
                .AsNoTracking()
                .ToListAsync();

            return orders.Select(MapToDto).ToList();
        }

        public async Task<List<PurchaseOrderResponseDto>> GetPendingAsync()
        {
            var orders = await _db.PurchaseOrders
                .Where(o => o.MechanicId == null)
                .Include(o => o.Customer)
                .Include(o => o.Car)
                .Include(o => o.Mechanic)
                .Include(o => o.Items)
                .AsNoTracking()
                .ToListAsync();

            return orders.Select(MapToDto).ToList();
        }

        public async Task<PurchaseOrderResponseDto?> GetByIdAsync(int id)
        {
            var order = await _db.PurchaseOrders
                .Include(o => o.Customer)
                .Include(o => o.Car)
                .Include(o => o.Mechanic)
                .Include(o => o.Items)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id);

            return order != null ? MapToDto(order) : null;
        }

        public async Task<PurchaseOrderResponseDto> PlaceOrderAsync(int customerId, PlaceOrderDto dto)
        {
            // 1. Get all cart items for this customer
            var cartItems = await _db.CartItems
                .Where(ci => ci.CustomerId == customerId)
                .ToListAsync();

            if (!cartItems.Any())
                throw new InvalidOperationException("Cart is empty");

            // 2. Validate stock for SparePart items
            foreach (var item in cartItems.Where(ci => ci.ItemType == "SparePart"))
            {
                var part = await _db.SpareParts.FindAsync(item.ItemId);
                if (part == null || part.StockQuantity < item.Quantity)
                    throw new InvalidOperationException($"Insufficient stock for part: {item.ItemName}");
            }

            // 3. Get item details for order items
            var orderItems = new List<PurchaseOrderItem>();
            foreach (var ci in cartItems)
            {
                string description = "";
                if (ci.ItemType == "Service")
                {
                    var svc = await _db.Services.FindAsync(ci.ItemId);
                    description = svc?.Description ?? "";
                }
                else
                {
                    var part = await _db.SpareParts.FindAsync(ci.ItemId);
                    description = part?.Description ?? "";
                }

                orderItems.Add(new PurchaseOrderItem
                {
                    ItemType = ci.ItemType,
                    ItemId = ci.ItemId,
                    ItemName = ci.ItemName,
                    ItemDescription = description,
                    UnitPrice = ci.UnitPrice,
                    Quantity = ci.Quantity,
                    Subtotal = ci.UnitPrice * ci.Quantity
                });
            }

            // 4. Create the PurchaseOrder
            var total = orderItems.Sum(oi => oi.Subtotal);
            var car = await _db.Cars.Include(c => c.Customer).FirstOrDefaultAsync(c => c.Id == dto.CarId);
            if (car == null) throw new Exception("Car not found");

            var order = new PurchaseOrder
            {
                CustomerId = customerId,
                CarId = dto.CarId,
                Status = "Pending",
                TotalAmount = total,
                Notes = dto.Notes,
                PlacedAt = DateTime.UtcNow,
                Items = orderItems
            };
            _db.PurchaseOrders.Add(order);

            // 5. Reduce stock for SparePart items
            foreach (var item in cartItems.Where(ci => ci.ItemType == "SparePart"))
            {
                var part = await _db.SpareParts.FindAsync(item.ItemId);
                if (part != null)
                {
                    part.StockQuantity -= item.Quantity;
                    part.UpdatedAt = DateTime.UtcNow;
                }
            }

            // 6. Clear the cart
            _db.CartItems.RemoveRange(cartItems);

            await _db.SaveChangesAsync();

            // 7. Generate two receipts automatically
            var carInfo = $"{car.Year} {car.Make} {car.Model} — {car.LicensePlate}";
            var itemsSummary = System.Text.Json.JsonSerializer.Serialize(
                orderItems.Select(oi => new { oi.ItemName, oi.Quantity, oi.Subtotal })
            );

            // Customer copy
            _db.PurchaseReceipts.Add(new PurchaseReceipt
            {
                PurchaseOrderId = order.Id,
                CustomerId = customerId,
                CustomerName = car.Customer.FullName,
                CustomerEmail = car.Customer.Email,
                CustomerPhone = car.Customer.Phone,
                CarInfo = carInfo,
                ItemsSummary = itemsSummary,
                TotalAmount = total,
                Notes = dto.Notes,
                IssuedAt = DateTime.UtcNow,
                IsOwnerCopy = false,
                Status = "Issued"
            });

            // Owner copy
            _db.PurchaseReceipts.Add(new PurchaseReceipt
            {
                PurchaseOrderId = order.Id,
                CustomerId = customerId,
                CustomerName = car.Customer.FullName,
                CustomerEmail = car.Customer.Email,
                CustomerPhone = car.Customer.Phone,
                CarInfo = carInfo,
                ItemsSummary = itemsSummary,
                TotalAmount = total,
                Notes = dto.Notes,
                IssuedAt = DateTime.UtcNow,
                IsOwnerCopy = true,
                Status = "Issued"
            });

            await _db.SaveChangesAsync();
            return await GetByIdAsync(order.Id) ?? throw new Exception("Order not found after creation");
        }

        public async Task<PurchaseOrderResponseDto?> AssignMechanicAsync(int orderId, AssignMechanicDto dto)
        {
            var order = await _db.PurchaseOrders.FindAsync(orderId);
            if (order == null) return null;

            order.MechanicId = dto.MechanicId;
            order.Status = "AssignedToMechanic";
            await _db.SaveChangesAsync();

            return await GetByIdAsync(orderId);
        }

        public async Task<PurchaseOrderResponseDto?> UpdateStatusAsync(int orderId, UpdatePurchaseOrderStatusDto dto)
        {
            var order = await _db.PurchaseOrders.FindAsync(orderId);
            if (order == null) return null;

            order.Status = dto.Status;
            if (dto.Status == "Completed")
            {
                order.CompletedAt = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync();

            return await GetByIdAsync(orderId);
        }

        public async Task<bool> CancelOrderAsync(int orderId, int customerId)
        {
            var order = await _db.PurchaseOrders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId && o.CustomerId == customerId);
            if (order == null || order.Status != "Pending") return false;

            // Restore stock
            foreach (var item in order.Items.Where(i => i.ItemType == "SparePart"))
            {
                var part = await _db.SpareParts.FindAsync(item.ItemId);
                if (part != null)
                {
                    part.StockQuantity += item.Quantity;
                }
            }

            order.Status = "Cancelled";
            await _db.SaveChangesAsync();
            return true;
        }

        private static PurchaseOrderResponseDto MapToDto(PurchaseOrder o) => new PurchaseOrderResponseDto
        {
            Id = o.Id,
            CustomerId = o.CustomerId,
            CustomerName = o.Customer?.FullName ?? "Unknown Customer",
            CarId = o.CarId,
            CarInfo = o.Car != null ? $"{o.Car.Year} {o.Car.Make} {o.Car.Model} ({o.Car.LicensePlate})" : "Unknown Car",
            MechanicId = o.MechanicId,
            MechanicName = o.Mechanic != null ? $"{o.Mechanic.FirstName} {o.Mechanic.LastName}" : null,
            Status = o.Status,
            TotalAmount = o.TotalAmount,
            Notes = o.Notes,
            PlacedAt = o.PlacedAt,
            CompletedAt = o.CompletedAt,
            Items = o.Items.Select(i => new PurchaseOrderItemDto
            {
                Id = i.Id,
                ItemType = i.ItemType,
                ItemId = i.ItemId,
                ItemName = i.ItemName,
                ItemDescription = i.ItemDescription,
                UnitPrice = i.UnitPrice,
                Quantity = i.Quantity,
                Subtotal = i.Subtotal
            }).ToList()
        };
    }
}
