using AutoFix.DTOs.Receipt;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IReceiptService
    {
        Task<List<ReceiptResponseDto>> GetAllAsync();
        // Owner only — returns all receipts
        Task<List<ReceiptResponseDto>> GetOwnerCopiesAsync();
        // Owner only — returns only owner copies
        Task<List<ReceiptResponseDto>> GetByCustomerIdAsync(int customerId);
        // Returns customer copies for a specific customer
        Task<ReceiptResponseDto?> GetByIdAsync(int id);
        Task<bool> VoidReceiptAsync(int id);
        // Owner only — mark a receipt as Void
    }
}
