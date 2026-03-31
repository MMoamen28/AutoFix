using AutoFix.DTOs.Customer;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface ICustomerService
    {
        Task<List<CustomerResponseDto>> GetAllAsync();
        Task<CustomerResponseDto?> GetByIdAsync(int id);
        Task<CustomerResponseDto> CreateAsync(CreateCustomerDto dto);
        Task<CustomerResponseDto?> UpdateAsync(int id, UpdateCustomerDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
