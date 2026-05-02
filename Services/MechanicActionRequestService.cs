using AutoFix.Data;
using AutoFix.DTOs.MechanicActionRequest;
using AutoFix.DTOs.RepairOrder;
using AutoFix.DTOs.SparePart;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class MechanicActionRequestService : IMechanicActionRequestService
    {
        private readonly AppDbContext _db;
        private readonly IRepairOrderService _repairOrderService;
        private readonly ISparePartService _sparePartService;

        public MechanicActionRequestService(
            AppDbContext db,
            IRepairOrderService repairOrderService,
            ISparePartService sparePartService)
        {
            _db = db;
            _repairOrderService = repairOrderService;
            _sparePartService = sparePartService;
        }

        public async Task<List<MechanicActionRequestResponseDto>> GetAllPendingAsync()
        {
            return await _db.MechanicActionRequests
                .AsNoTracking()
                .Where(r => r.Status == "Pending")
                .Select(r => MapToDto(r))
                .ToListAsync();
        }

        public async Task<List<MechanicActionRequestResponseDto>> GetAllAsync()
        {
            return await _db.MechanicActionRequests
                .AsNoTracking()
                .Select(r => MapToDto(r))
                .ToListAsync();
        }

        public async Task<List<MechanicActionRequestResponseDto>> GetByMechanicIdAsync(int mechanicId)
        {
            return await _db.MechanicActionRequests
                .AsNoTracking()
                .Where(r => r.MechanicId == mechanicId)
                .Select(r => MapToDto(r))
                .ToListAsync();
        }

        public async Task<MechanicActionRequestResponseDto> CreateAsync(CreateMechanicActionRequestDto dto, int mechanicId, string mechanicName)
        {
            var request = new MechanicActionRequest
            {
                MechanicId = mechanicId,
                MechanicName = mechanicName,
                ActionType = dto.ActionType,
                ActionPayload = dto.ActionPayload,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow
            };

            _db.MechanicActionRequests.Add(request);
            await _db.SaveChangesAsync();

            return MapToDto(request);
        }

        public async Task<MechanicActionRequestResponseDto?> ReviewAsync(int id, ReviewActionRequestDto dto)
        {
            var request = await _db.MechanicActionRequests.FindAsync(id);
            if (request == null) return null;

            request.Status = dto.Decision;
            request.OwnerNote = dto.OwnerNote;
            request.ReviewedAt = DateTime.UtcNow;

            if (dto.Decision == "Approved")
            {
                switch (request.ActionType)
                {
                    case "UpdateRepairOrderStatus":
                        var updateDto = JsonSerializer.Deserialize<UpdateRepairOrderDto>(request.ActionPayload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (updateDto != null)
                        {
                            var repairOrderId = JsonDocument.Parse(request.ActionPayload).RootElement.GetProperty("repairOrderId").GetInt32();
                            await _repairOrderService.UpdateAsync(repairOrderId, updateDto);
                        }
                        break;

                    case "AdjustStock":
                        var stockDto = JsonSerializer.Deserialize<AdjustStockDto>(request.ActionPayload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (stockDto != null)
                        {
                            var sparePartId = JsonDocument.Parse(request.ActionPayload).RootElement.GetProperty("sparePartId").GetInt32();
                            await _sparePartService.AdjustStockAsync(sparePartId, stockDto);
                        }
                        break;

                    case "AddSparePart":
                        var createPartDto = JsonSerializer.Deserialize<CreateSparePartDto>(request.ActionPayload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (createPartDto != null)
                        {
                            await _sparePartService.CreateAsync(createPartDto);
                        }
                        break;
                }
            }

            await _db.SaveChangesAsync();
            return MapToDto(request);
        }

        private static MechanicActionRequestResponseDto MapToDto(MechanicActionRequest r) => new MechanicActionRequestResponseDto
        {
            Id = r.Id,
            MechanicId = r.MechanicId,
            MechanicName = r.MechanicName,
            ActionType = r.ActionType,
            ActionPayload = r.ActionPayload,
            Status = r.Status,
            OwnerNote = r.OwnerNote,
            RequestedAt = r.RequestedAt,
            ReviewedAt = r.ReviewedAt
        };
    }
}
