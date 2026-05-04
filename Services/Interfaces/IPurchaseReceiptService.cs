using System.Collections.Generic;
using System.Threading.Tasks;
using AutoFix.DTOs.PurchaseReceipt;

namespace AutoFix.Services.Interfaces
{
    public interface IPurchaseReceiptService
    {
        Task<List<PurchaseReceiptResponseDto>> GetAllAsync();
        Task<List<PurchaseReceiptResponseDto>> GetOwnerCopiesAsync();
        Task<List<PurchaseReceiptResponseDto>> GetByCustomerIdAsync(int customerId);
        Task<PurchaseReceiptResponseDto?> GetByIdAsync(int id);
        Task<PurchaseReceiptResponseDto?> GetByOrderIdAsync(int orderId);
        Task<bool> VoidReceiptAsync(int id);
    }
}
