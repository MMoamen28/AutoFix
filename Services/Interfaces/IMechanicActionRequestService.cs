using AutoFix.DTOs.MechanicActionRequest;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IMechanicActionRequestService
    {
        Task<List<MechanicActionRequestResponseDto>> GetAllPendingAsync();
        // Owner only — all pending requests
        Task<List<MechanicActionRequestResponseDto>> GetAllAsync();
        // Owner only — all requests regardless of status
        Task<List<MechanicActionRequestResponseDto>> GetByMechanicIdAsync(int mechanicId);
        // Mechanic sees their own requests
        Task<MechanicActionRequestResponseDto> CreateAsync(CreateMechanicActionRequestDto dto, int mechanicId, string mechanicName);
        // Mechanic submits a new request
        Task<MechanicActionRequestResponseDto?> ReviewAsync(int id, ReviewActionRequestDto dto);
        // Owner approves or rejects
        // When Approved: execute the actual action (update repair order, add spare part, adjust stock)
        // When Rejected: just update status and save owner note
    }
}
