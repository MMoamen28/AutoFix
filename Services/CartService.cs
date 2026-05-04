using AutoFix.Data;
using AutoFix.DTOs.Cart;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class CartService : ICartService
    {
        private readonly AppDbContext _db;
        public CartService(AppDbContext db) => _db = db;

        public async Task<List<CartItemResponseDto>> GetCartAsync(int customerId)
        {
            return await _db.CartItems
                .AsNoTracking()
                .Where(c => c.CustomerId == customerId)
                .Select(c => new CartItemResponseDto
                {
                    Id = c.Id,
                    ItemType = c.ItemType,
                    ItemId = c.ItemId,
                    ItemName = c.ItemName,
                    UnitPrice = c.UnitPrice,
                    Quantity = c.Quantity,
                    Subtotal = c.UnitPrice * c.Quantity,
                    AddedAt = c.AddedAt
                })
                .ToListAsync();
        }

        public async Task<CartItemResponseDto> AddToCartAsync(int customerId, AddToCartDto dto)
        {
            // 1. Validate item exists and get price/name
            string name;
            decimal price;

            if (dto.ItemType == "Service")
            {
                var service = await _db.Services.FindAsync(dto.ItemId);
                if (service == null) throw new Exception("Service not found");
                name = service.Name;
                price = service.BasePrice;
            }
            else
            {
                var part = await _db.SpareParts.FindAsync(dto.ItemId);
                if (part == null) throw new Exception("Spare part not found");
                if (part.StockQuantity < dto.Quantity) throw new Exception("Insufficient stock");
                name = part.Name;
                price = part.UnitPrice;
            }

            // 2. Check if item already in cart
            var existing = await _db.CartItems
                .FirstOrDefaultAsync(c => c.CustomerId == customerId && c.ItemType == dto.ItemType && c.ItemId == dto.ItemId);

            if (existing != null)
            {
                existing.Quantity += dto.Quantity;
                if (dto.ItemType == "SparePart")
                {
                    var part = await _db.SpareParts.FindAsync(dto.ItemId);
                    if (part!.StockQuantity < existing.Quantity) throw new Exception("Insufficient stock");
                }
                await _db.SaveChangesAsync();
                return MapToDto(existing);
            }

            // 3. Add new item
            var newItem = new CartItem
            {
                CustomerId = customerId,
                ItemType = dto.ItemType,
                ItemId = dto.ItemId,
                ItemName = name,
                UnitPrice = price,
                Quantity = dto.Quantity,
                AddedAt = DateTime.UtcNow
            };

            _db.CartItems.Add(newItem);
            await _db.SaveChangesAsync();
            return MapToDto(newItem);
        }

        public async Task<CartItemResponseDto?> UpdateQuantityAsync(int cartItemId, int customerId, UpdateCartItemDto dto)
        {
            var item = await _db.CartItems.FirstOrDefaultAsync(c => c.Id == cartItemId && c.CustomerId == customerId);
            if (item == null) return null;

            if (item.ItemType == "SparePart")
            {
                var part = await _db.SpareParts.FindAsync(item.ItemId);
                if (part == null || part.StockQuantity < dto.Quantity) throw new Exception("Insufficient stock");
            }

            item.Quantity = dto.Quantity;
            await _db.SaveChangesAsync();
            return MapToDto(item);
        }

        public async Task<bool> RemoveFromCartAsync(int cartItemId, int customerId)
        {
            var item = await _db.CartItems.FirstOrDefaultAsync(c => c.Id == cartItemId && c.CustomerId == customerId);
            if (item == null) return false;

            _db.CartItems.Remove(item);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ClearCartAsync(int customerId)
        {
            var items = await _db.CartItems.Where(c => c.CustomerId == customerId).ToListAsync();
            if (!items.Any()) return false;

            _db.CartItems.RemoveRange(items);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<decimal> GetCartTotalAsync(int customerId)
        {
            return await _db.CartItems
                .AsNoTracking()
                .Where(c => c.CustomerId == customerId)
                .SumAsync(c => c.UnitPrice * c.Quantity);
        }

        private static CartItemResponseDto MapToDto(CartItem c) => new CartItemResponseDto
        {
            Id = c.Id,
            ItemType = c.ItemType,
            ItemId = c.ItemId,
            ItemName = c.ItemName,
            UnitPrice = c.UnitPrice,
            Quantity = c.Quantity,
            Subtotal = c.UnitPrice * c.Quantity,
            AddedAt = c.AddedAt
        };
    }
}
