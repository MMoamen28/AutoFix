using AutoFix.Data;
using AutoFix.DTOs.PurchaseOrder;
using AutoFix.DTOs.PurchaseReceipt;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class PurchaseReceiptService : IPurchaseReceiptService
    {
        private readonly AppDbContext _db;
        public PurchaseReceiptService(AppDbContext db) => _db = db;

        public async Task<List<PurchaseReceiptResponseDto>> GetAllAsync()
        {
            var receipts = await _db.PurchaseReceipts
                .Include(r => r.PurchaseOrder)
                .AsNoTracking()
                .ToListAsync();

            return receipts.Select(MapToDto).ToList();
        }

        public async Task<List<PurchaseReceiptResponseDto>> GetOwnerCopiesAsync()
        {
            var receipts = await _db.PurchaseReceipts
                .Include(r => r.PurchaseOrder)
                .Where(r => r.IsOwnerCopy)
                .AsNoTracking()
                .ToListAsync();

            return receipts.Select(MapToDto).ToList();
        }

        public async Task<List<PurchaseReceiptResponseDto>> GetByCustomerIdAsync(int customerId)
        {
            var receipts = await _db.PurchaseReceipts
                .Include(r => r.PurchaseOrder)
                .Where(r => r.CustomerId == customerId && !r.IsOwnerCopy)
                .AsNoTracking()
                .ToListAsync();

            return receipts.Select(MapToDto).ToList();
        }

        public async Task<PurchaseReceiptResponseDto?> GetByIdAsync(int id)
        {
            var receipt = await _db.PurchaseReceipts
                .Include(r => r.PurchaseOrder)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id);

            return receipt != null ? MapToDto(receipt) : null;
        }

        public async Task<PurchaseReceiptResponseDto?> GetByOrderIdAsync(int orderId)
        {
            var receipt = await _db.PurchaseReceipts
                .Include(r => r.PurchaseOrder)
                .Where(r => r.PurchaseOrderId == orderId && !r.IsOwnerCopy)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            return receipt != null ? MapToDto(receipt) : null;
        }

        public async Task<bool> VoidReceiptAsync(int id)
        {
            var receipt = await _db.PurchaseReceipts.FindAsync(id);
            if (receipt == null) return false;

            receipt.Status = "Void";
            await _db.SaveChangesAsync();
            return true;
        }

        private static PurchaseReceiptResponseDto MapToDto(PurchaseReceipt r)
        {
            var items = System.Text.Json.JsonSerializer.Deserialize<List<PurchaseOrderItemDto>>(r.ItemsSummary) ?? new();
            return new PurchaseReceiptResponseDto
            {
                Id = r.Id,
                PurchaseOrderId = r.PurchaseOrderId,
                CustomerId = r.CustomerId,
                CustomerName = r.CustomerName,
                CustomerEmail = r.CustomerEmail,
                CustomerPhone = r.CustomerPhone,
                CarInfo = r.CarInfo,
                MechanicName = r.MechanicName,
                Items = items,
                TotalAmount = r.TotalAmount,
                Notes = r.Notes,
                IssuedAt = r.IssuedAt,
                IsOwnerCopy = r.IsOwnerCopy,
                Status = r.Status
            };
        }
    }
}
