using AutoFix.DTOs.Invoice;
using AutoFix.DTOs.WorkOrder;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IWorkOrderService
    {
        Task<List<WorkOrderResponseDto>> GetAllAsync(string? status = null, int? customerId = null, int? mechanicId = null);
        Task<WorkOrderResponseDto?> GetByIdAsync(int id);
        Task<WorkOrderResponseDto> CreateAsync(CreateWorkOrderDto dto);
        Task<WorkOrderResponseDto?> UpdateAsync(int id, UpdateWorkOrderDto dto);
        Task<WorkOrderResponseDto> AssignMechanicsAsync(int id, AssignMechanicRequestDto dto);
        Task<List<WorkOrderMechanicHistoryDto>> GetMechanicHistoryAsync(int id);
        Task<WorkOrderResponseDto> TransitionStatusAsync(int id, string newStatus, string? notes = null);
        Task<WorkOrderPhotoResponseDto> AddPhotoAsync(int id, string fileName, byte[] photoBytes, string photoType, string? caption = null);
        Task<bool> DeleteAsync(int id);
        Task<WorkOrderResponseDto> AddLineAsync(int id, CreateWorkOrderLineDto lineDto);
        Task<InvoiceResponseDto> ConvertToInvoiceAsync(int id, ConvertWorkOrderToInvoiceDto? options = null);
        Task<WorkOrderResponseDto> ClaimOrderAsync(int id, int mechanicId);
        Task<InvoiceResponseDto> CreditWorkOrderInvoiceAsync(int id, string? reason = null);
        Task<string> GeneratePrintedOrderHtmlAsync(int id);
    }
}
