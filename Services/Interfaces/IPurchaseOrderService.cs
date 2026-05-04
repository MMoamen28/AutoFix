using System.Collections.Generic;
using System.Threading.Tasks;
using AutoFix.DTOs.PurchaseOrder;

namespace AutoFix.Services.Interfaces
{
    public interface IPurchaseOrderService
    {
        Task<List<PurchaseOrderResponseDto>> GetAllAsync();
        Task<List<PurchaseOrderResponseDto>> GetByCustomerIdAsync(int customerId);
        Task<List<PurchaseOrderResponseDto>> GetByMechanicIdAsync(int mechanicId);
        Task<List<PurchaseOrderResponseDto>> GetPendingAsync();
        Task<PurchaseOrderResponseDto?> GetByIdAsync(int id);
        Task<PurchaseOrderResponseDto> PlaceOrderAsync(int customerId, PlaceOrderDto dto);
        Task<PurchaseOrderResponseDto?> AssignMechanicAsync(int orderId, AssignMechanicDto dto);
        Task<PurchaseOrderResponseDto?> UpdateStatusAsync(int orderId, UpdatePurchaseOrderStatusDto dto);
        Task<bool> CancelOrderAsync(int orderId, int customerId);
    }
}
