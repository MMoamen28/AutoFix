using AutoFix.DTOs.RepairOrder;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IRepairOrderService
    {
        Task<List<RepairOrderResponseDto>> GetAllAsync();
        Task<RepairOrderResponseDto?> GetByIdAsync(int id);
        Task<List<RepairOrderResponseDto>> GetByCustomerIdAsync(int customerId);
        Task<RepairOrderResponseDto> CreateAsync(CreateRepairOrderDto dto, int customerId);
        Task<RepairOrderResponseDto?> UpdateAsync(int id, UpdateRepairOrderDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
