using AutoFix.DTOs.Customer;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface ICustomerService
    {
        Task<List<CustomerResponseDto>> GetAllAsync(bool includeArchived = false);
        Task<List<CustomerResponseDto>> SearchAsync(string query, bool includeArchived = false);
        Task<CustomerResponseDto?> CheckDuplicatePhoneAsync(string phone, int? excludeId = null);
        Task<CustomerResponseDto?> GetByIdAsync(int id);
        Task<CustomerResponseDto> CreateAsync(CreateCustomerDto dto);
        Task<QuickAddCustomerCarResponseDto> QuickAddAsync(QuickAddCustomerCarDto dto);
        Task<CustomerResponseDto?> UpdateAsync(int id, UpdateCustomerDto dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> ArchiveAsync(int id);
        Task<bool> RestoreAsync(int id);
    }
}
