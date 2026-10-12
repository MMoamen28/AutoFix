using AutoFix.DTOs.Dashboard;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IDashboardService
    {
        Task<AdminDashboardDto> GetAdminDashboardAsync();
        Task<CustomerDashboardDto?> GetCustomerDashboardAsync(int customerId);
    }
}
