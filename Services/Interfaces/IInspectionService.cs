using AutoFix.DTOs.Inspection;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IInspectionService
    {
        Task<List<InspectionResponseDto>> GetAllAsync(int? customerId = null);
        Task<InspectionResponseDto?> GetByIdAsync(int id);
        Task<InspectionResponseDto> CreateAsync(CreateInspectionDto dto, int? mechanicId = null);
        Task<InspectionResponseDto?> UpdateAsync(int id, UpdateInspectionDto dto);
        Task<InspectionResponseDto> ReviseAsync(int id, UpdateInspectionDto dto);
        Task<InspectionResponseDto> FinalizeAsync(int id);
        Task<bool> DeleteAsync(int id);
        Task<string> GenerateHtmlPrintReportAsync(int id, bool showInvoiceTotal = false);
        Task<string> GenerateBlankFormHtmlAsync(bool showInvoiceTotal = false);
        Task<byte[]> GenerateOrGetPdfAsync(int id);
        Task<string> GetWhatsAppShareUrlAsync(int id, string? customNotes = null);
    }
}
