using AutoFix.DTOs.Invoice;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IInvoiceService
    {
        Task<List<InvoiceResponseDto>> GetAllAsync(int? customerId = null, bool isCustomer = false);
        Task<InvoiceResponseDto?> GetByIdAsync(int id, bool isCustomer = false);
        Task<InvoiceResponseDto> CreateAsync(CreateInvoiceDto dto);
        Task<PaymentResponseDto> RecordPaymentAsync(int invoiceId, RecordPaymentDto dto, string? receivedBy = null);
        Task<bool> DeleteAsync(int id);
        Task<string> GeneratePrintedInvoiceHtmlAsync(int id);
    }
}
