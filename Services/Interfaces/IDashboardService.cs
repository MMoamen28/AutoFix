using AutoFix.DTOs.Dashboard;
using System;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IDashboardService
    {
        Task<AdminDashboardDto> GetAdminDashboardAsync();
        Task<CustomerDashboardDto?> GetCustomerDashboardAsync(int customerId);
        Task<FinancialSummaryDto> GetFinancialSummaryAsync(string period, DateTime? startDate = null, DateTime? endDate = null);
    }
}
