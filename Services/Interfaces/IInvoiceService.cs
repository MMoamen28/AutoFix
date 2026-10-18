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
        Task<string> GenerateWordTemplateInvoiceHtmlAsync(int id, bool isCustomer = false);
        Task<string> GenerateWordTemplateInvoiceHtmlForWorkOrderAsync(int workOrderId, bool isCustomer = false);
        Task<InvoiceResponseDto?> GetByInvoiceNumberAsync(string invoiceNumber, bool isCustomer = false);
        Task<InvoiceResponseDto> UpdateInvoiceNumberAsync(int id, UpdateInvoiceNumberDto dto, string changedBy, bool isAdmin);
        Task<InvoiceResponseDto> UpdateInvoiceDateAsync(int id, UpdateInvoiceDateDto dto, string changedBy, bool isAdmin);
        Task<InvoiceResponseDto> CreditInvoiceAsync(int invoiceId, string reason, string? issuedBy = null, string? concurrencyToken = null);
        Task<List<CreditNoteResponseDto>> GetAllCreditNotesAsync(int? customerId = null);
        Task<DateTime> LogWhatsAppShareAsync(int invoiceId, LogWhatsAppShareDto dto, string? userId, string? userName);
    }
}
