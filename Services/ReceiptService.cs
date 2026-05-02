using AutoFix.Data;
using AutoFix.DTOs.Receipt;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class ReceiptService : IReceiptService
    {
        private readonly AppDbContext _db;
        public ReceiptService(AppDbContext db) => _db = db;

        public async Task<List<ReceiptResponseDto>> GetAllAsync()
        {
            var receipts = await _db.Receipts.AsNoTracking().ToListAsync();
            return receipts.Select(r => MapToDto(r)).ToList();
        }

        public async Task<List<ReceiptResponseDto>> GetOwnerCopiesAsync()
        {
            var receipts = await _db.Receipts.AsNoTracking().Where(r => r.IsOwnerCopy).ToListAsync();
            return receipts.Select(r => MapToDto(r)).ToList();
        }

        public async Task<List<ReceiptResponseDto>> GetByCustomerIdAsync(int customerId)
        {
            var receipts = await _db.Receipts.AsNoTracking().Where(r => r.CustomerId == customerId && !r.IsOwnerCopy).ToListAsync();
            return receipts.Select(r => MapToDto(r)).ToList();
        }

        public async Task<ReceiptResponseDto?> GetByIdAsync(int id)
        {
            var receipt = await _db.Receipts
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id);
            
            return receipt != null ? MapToDto(receipt) : null;
        }

        public async Task<bool> VoidReceiptAsync(int id)
        {
            var receipt = await _db.Receipts.FindAsync(id);
            if (receipt == null) return false;

            receipt.Status = "Void";
            await _db.SaveChangesAsync();
            return true;
        }

        private static ReceiptResponseDto MapToDto(Models.Receipt r) => new ReceiptResponseDto
        {
            Id = r.Id,
            RepairOrderId = r.RepairOrderId,
            CustomerId = r.CustomerId,
            CustomerName = r.CustomerName,
            CustomerEmail = r.CustomerEmail,
            CustomerPhone = r.CustomerPhone,
            CarInfo = r.CarInfo,
            MechanicName = r.MechanicName,
            ServicesPerformed = r.ServicesPerformed,
            TotalCost = r.TotalCost,
            Notes = r.Notes,
            IssuedAt = r.IssuedAt,
            IsOwnerCopy = r.IsOwnerCopy,
            Status = r.Status
        };
    }
}
