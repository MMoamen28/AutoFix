using System;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IReportExportService
    {
        Task<(byte[] content, string contentType, string fileName)> ExportSparePartsAsync(string? filter = null, string format = "xlsx");
        Task<(byte[] content, string contentType, string fileName)> ExportBusinessReportAsync(string periodType, DateTime? selectedDate = null, int? selectedYear = null, int? selectedMonth = null);
        Task<(byte[] content, string contentType, string fileName)> ExportCustomerRecordAsync(int customerId);
    }
}
