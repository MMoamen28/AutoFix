using AutoFix.Data;
using AutoFix.DTOs.Invoice;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class WorkOrderService : IWorkOrderService
    {
        private readonly AppDbContext _db;
        private readonly IDataFolderService _dataFolder;

        // Strict lifecycle transitions map
        private static readonly Dictionary<string, HashSet<string>> AllowedTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Pending"] = new(StringComparer.OrdinalIgnoreCase) { "InProgress", "Cancelled" },
            ["InProgress"] = new(StringComparer.OrdinalIgnoreCase) { "WaitingForParts", "Completed", "Cancelled" },
            ["WaitingForParts"] = new(StringComparer.OrdinalIgnoreCase) { "InProgress", "Cancelled" },
            ["Completed"] = new(StringComparer.OrdinalIgnoreCase) { "Delivered", "Cancelled" },
            ["Delivered"] = new(StringComparer.OrdinalIgnoreCase) { "Invoiced" },
            ["Invoiced"] = new(StringComparer.OrdinalIgnoreCase) { }, // Terminal final state
            ["Cancelled"] = new(StringComparer.OrdinalIgnoreCase) { } // Terminal final state (no transitions out)
        };

        private readonly IRealtimeService? _realtime;

        public WorkOrderService(AppDbContext db, IDataFolderService dataFolder, IRealtimeService? realtime = null)
        {
            _db = db;
            _dataFolder = dataFolder;
            _realtime = realtime;
        }

        private IQueryable<WorkOrder> BaseQuery()
        {
            return _db.WorkOrders
                .Include(w => w.Customer)
                .Include(w => w.Car)
                .Include(w => w.AssignedTechnician)
                .Include(w => w.HelperTechnician)
                .Include(w => w.Lines).ThenInclude(l => l.SparePart)
                .Include(w => w.Lines).ThenInclude(l => l.Technician)
                .Include(w => w.Lines).ThenInclude(l => l.Service)
                .Include(w => w.Photos)
                .Include(w => w.MechanicHistories).ThenInclude(h => h.PreviousMechanic)
                .Include(w => w.MechanicHistories).ThenInclude(h => h.NewMechanic);
        }

        private WorkOrderResponseDto MapToDto(WorkOrder w, bool isCustomer = false)
        {
            var activeLines = w.Lines.Where(l => !l.IsDeleted).ToList();
            var workmanshipTotal = w.TotalWorkmanship != 0 
                ? w.TotalWorkmanship 
                : activeLines.Where(l => l.LineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase)).Sum(l => l.Quantity * l.UnitPrice);

            return new WorkOrderResponseDto
            {
                Id = w.Id,
                OrderNumber = w.OrderNumber,
                CustomerId = w.CustomerId,
                CustomerName = w.Customer?.FullName ?? string.Empty,
                CustomerPhone = w.Customer?.Phone ?? string.Empty,
                CarId = w.CarId,
                CarMake = w.Car?.Make ?? string.Empty,
                CarModel = w.Car?.Model ?? string.Empty,
                CarPlate = w.Car?.LicensePlate ?? string.Empty,
                CarChassis = w.Car?.VIN ?? string.Empty,
                AssignedTechnicianId = w.AssignedTechnicianId,
                AssignedTechnicianName = w.AssignedTechnician != null
                    ? $"{w.AssignedTechnician.FirstName} {w.AssignedTechnician.LastName}"
                    : null,
                HelperTechnicianId = w.HelperTechnicianId,
                HelperTechnicianName = w.HelperTechnician != null
                    ? $"{w.HelperTechnician.FirstName} {w.HelperTechnician.LastName}"
                    : null,
                OdometerInKm = w.OdometerInKm,
                FuelLevel = w.FuelLevel,
                CustomerComplaint = w.CustomerComplaint,
                InspectionNotes = w.InspectionNotes,
                Status = w.Status,
                TotalLabor = w.TotalLabor,
                TotalParts = w.TotalParts,
                TotalWorkmanship = workmanshipTotal,
                TotalAmount = w.TotalAmount,
                ReceivedAt = w.ReceivedAt,
                ExpectedDeliveryAt = w.ExpectedDeliveryAt,
                CompletedAt = w.CompletedAt,
                DeliveredAt = w.DeliveredAt,
                Lines = activeLines.Select(l => new WorkOrderLineResponseDto
                {
                    Id = l.Id,
                    LineType = l.LineType,
                    Description = l.Description,
                    ServiceId = l.ServiceId,
                    ServiceName = l.Service != null ? (string.IsNullOrEmpty(l.Service.NameArabic) ? l.Service.Name : $"{l.Service.Name} ({l.Service.NameArabic})") : null,
                    SparePartId = l.SparePartId,
                    SparePartName = l.SparePart?.Name,
                    IsExternalPart = l.IsExternalPart,
                    ExternalVendorName = l.ExternalVendorName,
                    Quantity = l.Quantity,
                    UnitCost = isCustomer ? 0 : l.UnitCost,
                    UnitPrice = l.UnitPrice,
                    TechnicianId = l.TechnicianId,
                    TechnicianName = l.Technician != null ? $"{l.Technician.FirstName} {l.Technician.LastName}" : null
                }).ToList(),
                Photos = w.Photos.Where(p => !p.IsDeleted).Select(p => new WorkOrderPhotoResponseDto
                {
                    Id = p.Id,
                    FileName = p.FileName,
                    FilePath = p.FilePath,
                    PhotoType = p.PhotoType,
                    Caption = p.Caption,
                    UploadedAt = p.UploadedAt
                }).ToList(),
                MechanicHistories = w.MechanicHistories.Where(h => !h.IsDeleted)
                    .OrderByDescending(h => h.AssignedAt)
                    .Select(h => new WorkOrderMechanicHistoryDto
                    {
                        Id = h.Id,
                        WorkOrderId = h.WorkOrderId,
                        Role = h.Role,
                        PreviousMechanicId = h.PreviousMechanicId,
                        PreviousMechanicName = h.PreviousMechanic != null ? $"{h.PreviousMechanic.FirstName} {h.PreviousMechanic.LastName}" : null,
                        NewMechanicId = h.NewMechanicId,
                        NewMechanicName = h.NewMechanic != null ? $"{h.NewMechanic.FirstName} {h.NewMechanic.LastName}" : null,
                        AssignedBy = h.AssignedBy,
                        AssignedAt = h.AssignedAt,
                        Reason = h.Reason
                    }).ToList()
            };
        }

        public async Task<List<WorkOrderResponseDto>> GetAllAsync(string? status = null, int? customerId = null, int? mechanicId = null, bool isCustomer = false)
        {
            var query = BaseQuery().AsNoTracking();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(w => w.Status == status);
            }

            if (customerId.HasValue && customerId.Value > 0)
            {
                query = query.Where(w => w.CustomerId == customerId.Value);
            }

            if (mechanicId.HasValue && mechanicId.Value > 0)
            {
                query = query.Where(w => 
                    w.AssignedTechnicianId == mechanicId.Value || 
                    w.HelperTechnicianId == mechanicId.Value ||
                    w.Lines.Any(l => !l.IsDeleted && l.TechnicianId == mechanicId.Value));
            }

            var results = await query.OrderByDescending(w => w.ReceivedAt).ToListAsync();
            return results.Select(w => MapToDto(w, isCustomer)).ToList();
        }

        public async Task<WorkOrderResponseDto?> GetByIdAsync(int id, bool isCustomer = false)
        {
            var workOrder = await BaseQuery().AsNoTracking().FirstOrDefaultAsync(w => w.Id == id);
            return workOrder == null ? null : MapToDto(workOrder, isCustomer);
        }

        public async Task<WorkOrderResponseDto> CreateAsync(CreateWorkOrderDto dto)
        {
            // Verify Customer and Car exist
            var customer = await _db.Customers.FindAsync(dto.CustomerId);
            if (customer == null) throw new InvalidOperationException($"Customer {dto.CustomerId} not found.");

            var car = await _db.Cars.FindAsync(dto.CarId);
            if (car == null) throw new InvalidOperationException($"Car {dto.CarId} not found.");

            var nextOrderNumber = $"WO-{DateTime.UtcNow:yyyyMM}-{(await _db.WorkOrders.CountAsync() + 1):D4}";

            var workOrder = new WorkOrder
            {
                OrderNumber = nextOrderNumber,
                CustomerId = dto.CustomerId,
                CarId = dto.CarId,
                AssignedTechnicianId = dto.AssignedTechnicianId,
                HelperTechnicianId = dto.HelperTechnicianId,
                InsuranceCompanyId = dto.InsuranceCompanyId,
                InsuranceClaimNumber = dto.InsuranceClaimNumber,
                OdometerInKm = dto.OdometerInKm,
                FuelLevel = dto.FuelLevel,
                CustomerComplaint = dto.CustomerComplaint.Trim(),
                InspectionNotes = dto.InspectionNotes?.Trim() ?? string.Empty,
                Status = "Pending",
                ReceivedAt = DateTime.UtcNow,
                ExpectedDeliveryAt = dto.ExpectedDeliveryAt
            };

            // Calculate totals and add lines
            decimal totalLabor = 0;
            decimal totalParts = 0;
            decimal totalWorkmanship = 0;

            foreach (var lineDto in dto.Lines)
            {
                var subtotal = lineDto.Quantity * lineDto.UnitPrice;
                if (lineDto.LineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase))
                {
                    totalWorkmanship += subtotal;
                    totalLabor += subtotal;
                }
                else if (lineDto.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                {
                    totalLabor += subtotal;
                }
                else
                {
                    totalParts += subtotal;
                }

                workOrder.Lines.Add(new WorkOrderLine
                {
                    LineType = lineDto.LineType,
                    Description = lineDto.Description.Trim(),
                    ServiceId = lineDto.ServiceId,
                    SparePartId = lineDto.SparePartId,
                    IsExternalPart = lineDto.IsExternalPart,
                    ExternalVendorName = lineDto.ExternalVendorName?.Trim(),
                    Quantity = lineDto.Quantity,
                    UnitCost = lineDto.UnitCost,
                    UnitPrice = lineDto.UnitPrice,
                    TechnicianId = lineDto.TechnicianId ?? dto.AssignedTechnicianId
                });
            }

            workOrder.TotalWorkmanship = totalWorkmanship;
            workOrder.TotalLabor = totalLabor;
            workOrder.TotalParts = totalParts;
            workOrder.TotalAmount = totalLabor + totalParts;

            _db.WorkOrders.Add(workOrder);
            await _db.SaveChangesAsync();

            // Record initial mechanic assignment history if technicians assigned
            if (dto.AssignedTechnicianId.HasValue)
            {
                _db.WorkOrderMechanicHistories.Add(new WorkOrderMechanicHistory
                {
                    WorkOrderId = workOrder.Id,
                    Role = "Main",
                    PreviousMechanicId = null,
                    NewMechanicId = dto.AssignedTechnicianId.Value,
                    AssignedBy = "Reception",
                    Reason = "Initial assignment on order creation",
                    AssignedAt = DateTime.UtcNow
                });
            }

            if (dto.HelperTechnicianId.HasValue)
            {
                _db.WorkOrderMechanicHistories.Add(new WorkOrderMechanicHistory
                {
                    WorkOrderId = workOrder.Id,
                    Role = "Helper",
                    PreviousMechanicId = null,
                    NewMechanicId = dto.HelperTechnicianId.Value,
                    AssignedBy = "Reception",
                    Reason = "Initial helper assignment on order creation",
                    AssignedAt = DateTime.UtcNow
                });
            }

            // Also log odometer history if mileage specified
            if (dto.OdometerInKm > 0)
            {
                _db.CarOdometerLogs.Add(new CarOdometerLog
                {
                    CarId = car.Id,
                    OdometerKm = dto.OdometerInKm,
                    Source = "WorkOrder",
                    ReferenceId = workOrder.OrderNumber,
                    Notes = $"Odometer recorded at Reception for order {workOrder.OrderNumber}"
                });
                car.CurrentOdometerKm = dto.OdometerInKm;
            }

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(workOrder.Id))!;
        }

        public async Task<WorkOrderResponseDto?> UpdateAsync(int id, UpdateWorkOrderDto dto)
        {
            var workOrder = await _db.WorkOrders
                .Include(w => w.Lines)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null) return null;

            if (workOrder.Status == "Invoiced" || workOrder.Status == "Delivered")
            {
                throw new InvalidOperationException($"Cannot modify WorkOrder {workOrder.OrderNumber} in status '{workOrder.Status}'.");
            }

            // Track mechanic changes
            if (dto.AssignedTechnicianId != workOrder.AssignedTechnicianId)
            {
                _db.WorkOrderMechanicHistories.Add(new WorkOrderMechanicHistory
                {
                    WorkOrderId = workOrder.Id,
                    Role = "Main",
                    PreviousMechanicId = workOrder.AssignedTechnicianId,
                    NewMechanicId = dto.AssignedTechnicianId,
                    AssignedBy = "Admin",
                    Reason = "Updated via WorkOrder edit",
                    AssignedAt = DateTime.UtcNow
                });
                workOrder.AssignedTechnicianId = dto.AssignedTechnicianId;
            }

            if (dto.HelperTechnicianId != workOrder.HelperTechnicianId)
            {
                _db.WorkOrderMechanicHistories.Add(new WorkOrderMechanicHistory
                {
                    WorkOrderId = workOrder.Id,
                    Role = "Helper",
                    PreviousMechanicId = workOrder.HelperTechnicianId,
                    NewMechanicId = dto.HelperTechnicianId,
                    AssignedBy = "Admin",
                    Reason = "Updated via WorkOrder edit",
                    AssignedAt = DateTime.UtcNow
                });
                workOrder.HelperTechnicianId = dto.HelperTechnicianId;
            }

            workOrder.InsuranceCompanyId = dto.InsuranceCompanyId;
            workOrder.InsuranceClaimNumber = dto.InsuranceClaimNumber;
            workOrder.OdometerInKm = dto.OdometerInKm;
            workOrder.FuelLevel = dto.FuelLevel;
            workOrder.CustomerComplaint = dto.CustomerComplaint.Trim();
            workOrder.InspectionNotes = dto.InspectionNotes?.Trim() ?? string.Empty;
            workOrder.ExpectedDeliveryAt = dto.ExpectedDeliveryAt;

            if (dto.Lines.Count > 0)
            {
                foreach (var line in workOrder.Lines)
                {
                    line.IsDeleted = true;
                    line.DeletedAt = DateTime.UtcNow;
                }

                decimal totalLabor = 0;
                decimal totalParts = 0;
                decimal totalWorkmanship = 0;

                foreach (var lineDto in dto.Lines)
                {
                    var subtotal = lineDto.Quantity * lineDto.UnitPrice;
                    if (lineDto.LineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase))
                    {
                        totalWorkmanship += subtotal;
                        totalLabor += subtotal;
                    }
                    else if (lineDto.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                    {
                        totalLabor += subtotal;
                    }
                    else
                    {
                        totalParts += subtotal;
                    }

                    workOrder.Lines.Add(new WorkOrderLine
                    {
                        LineType = lineDto.LineType,
                        Description = lineDto.Description.Trim(),
                        ServiceId = lineDto.ServiceId,
                        SparePartId = lineDto.SparePartId,
                        IsExternalPart = lineDto.IsExternalPart,
                        ExternalVendorName = lineDto.ExternalVendorName?.Trim(),
                        Quantity = lineDto.Quantity,
                        UnitCost = lineDto.UnitCost,
                        UnitPrice = lineDto.UnitPrice,
                        TechnicianId = lineDto.TechnicianId ?? dto.AssignedTechnicianId
                    });
                }

                workOrder.TotalWorkmanship = totalWorkmanship;
                workOrder.TotalLabor = totalLabor;
                workOrder.TotalParts = totalParts;
                workOrder.TotalAmount = totalLabor + totalParts;
            }

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(workOrder.Id))!;
        }

        public async Task<WorkOrderResponseDto> AssignMechanicsAsync(int id, AssignMechanicRequestDto dto)
        {
            var workOrder = await _db.WorkOrders.FindAsync(id);
            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            var assignedBy = string.IsNullOrWhiteSpace(dto.AssignedBy) ? "Admin" : dto.AssignedBy;
            var reason = dto.Reason ?? "Reassigned by Admin/Reception";

            // Main mechanic check
            if (dto.MainMechanicId != workOrder.AssignedTechnicianId)
            {
                _db.WorkOrderMechanicHistories.Add(new WorkOrderMechanicHistory
                {
                    WorkOrderId = workOrder.Id,
                    Role = "Main",
                    PreviousMechanicId = workOrder.AssignedTechnicianId,
                    NewMechanicId = dto.MainMechanicId,
                    AssignedBy = assignedBy,
                    Reason = reason,
                    AssignedAt = DateTime.UtcNow
                });
                workOrder.AssignedTechnicianId = dto.MainMechanicId;
            }

            // Helper mechanic check
            if (dto.HelperMechanicId != workOrder.HelperTechnicianId)
            {
                _db.WorkOrderMechanicHistories.Add(new WorkOrderMechanicHistory
                {
                    WorkOrderId = workOrder.Id,
                    Role = "Helper",
                    PreviousMechanicId = workOrder.HelperTechnicianId,
                    NewMechanicId = dto.HelperMechanicId,
                    AssignedBy = assignedBy,
                    Reason = reason,
                    AssignedAt = DateTime.UtcNow
                });
                workOrder.HelperTechnicianId = dto.HelperMechanicId;
            }

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "AssignMechanics",
                EntityName = "WorkOrder",
                EntityId = workOrder.OrderNumber,
                Details = $"Assigned Main: {dto.MainMechanicId}, Helper: {dto.HelperMechanicId}. Reason: {reason}",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(id))!;
        }

        public async Task<List<WorkOrderMechanicHistoryDto>> GetMechanicHistoryAsync(int id)
        {
            var histories = await _db.WorkOrderMechanicHistories
                .AsNoTracking()
                .Include(h => h.PreviousMechanic)
                .Include(h => h.NewMechanic)
                .Where(h => h.WorkOrderId == id && !h.IsDeleted)
                .OrderByDescending(h => h.AssignedAt)
                .ToListAsync();

            return histories.Select(h => new WorkOrderMechanicHistoryDto
            {
                Id = h.Id,
                WorkOrderId = h.WorkOrderId,
                Role = h.Role,
                PreviousMechanicId = h.PreviousMechanicId,
                PreviousMechanicName = h.PreviousMechanic != null ? $"{h.PreviousMechanic.FirstName} {h.PreviousMechanic.LastName}" : null,
                NewMechanicId = h.NewMechanicId,
                NewMechanicName = h.NewMechanic != null ? $"{h.NewMechanic.FirstName} {h.NewMechanic.LastName}" : null,
                AssignedBy = h.AssignedBy,
                AssignedAt = h.AssignedAt,
                Reason = h.Reason
            }).ToList();
        }

        public async Task<WorkOrderResponseDto> AddLineAsync(int id, CreateWorkOrderLineDto lineDto, string? user = null)
        {
            var workOrder = await _db.WorkOrders
                .Include(w => w.Lines)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            if (workOrder.Status == "Invoiced")
            {
                if (string.IsNullOrWhiteSpace(lineDto.RevisionReason))
                {
                    throw new InvalidOperationException($"Cannot add items to WorkOrder {workOrder.OrderNumber} after invoice issuance without an authorized revision reason or credit note.");
                }
            }
            else if (workOrder.Status == "Delivered")
            {
                throw new InvalidOperationException($"Cannot add items to WorkOrder {workOrder.OrderNumber} in status '{workOrder.Status}'.");
            }

            var lineType = string.IsNullOrWhiteSpace(lineDto.LineType) ? "LaborManufacturer" : lineDto.LineType;

            var line = new WorkOrderLine
            {
                WorkOrderId = workOrder.Id,
                LineType = lineType,
                Description = lineDto.Description.Trim(),
                ServiceId = lineDto.ServiceId,
                SparePartId = lineDto.SparePartId,
                IsExternalPart = lineDto.IsExternalPart,
                ExternalVendorName = lineDto.ExternalVendorName?.Trim(),
                Quantity = lineDto.Quantity,
                UnitCost = lineDto.UnitCost,
                UnitPrice = lineDto.UnitPrice,
                TechnicianId = lineDto.TechnicianId ?? workOrder.AssignedTechnicianId
            };

            workOrder.Lines.Add(line);

            // Recompute totals
            var activeLines = workOrder.Lines.Where(l => !l.IsDeleted).ToList();
            workOrder.TotalWorkmanship = activeLines
                .Where(l => l.LineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalLabor = activeLines
                .Where(l => l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalParts = activeLines
                .Where(l => !l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalAmount = workOrder.TotalLabor + workOrder.TotalParts;

            // Audit log
            _db.AuditLogs.Add(new AuditLog
            {
                Action = lineType == "LaborManufacturer" ? "WorkmanshipLineAdded" : "WorkOrderLineAdded",
                EntityName = "WorkOrderLine",
                EntityId = workOrder.OrderNumber,
                UserName = user ?? "Staff",
                OldValues = null,
                NewValues = $"LineType: {line.LineType}, Desc: {line.Description}, Qty: {line.Quantity}, Price: {line.UnitPrice:N2}, Cost: {line.UnitCost:N2}",
                Details = $"User '{user ?? "Staff"}' added {line.LineType} line '{line.Description}' (Qty: {line.Quantity}, Price: {line.UnitPrice:N2} L.E, Cost: {line.UnitCost:N2} L.E) to WO {workOrder.OrderNumber}. Revision Reason: {lineDto.RevisionReason ?? "Standard add"}",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(workOrder.Id))!;
        }

        public async Task<WorkOrderResponseDto> UpdateLineAsync(int id, int lineId, UpdateWorkOrderLineDto lineDto, string? user = null)
        {
            var workOrder = await _db.WorkOrders
                .Include(w => w.Lines)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            var line = workOrder.Lines.FirstOrDefault(l => l.Id == lineId && !l.IsDeleted);
            if (line == null) throw new KeyNotFoundException($"Line {lineId} not found on WorkOrder {id}.");

            if (workOrder.Status == "Invoiced")
            {
                if (string.IsNullOrWhiteSpace(lineDto.RevisionReason))
                {
                    throw new InvalidOperationException($"Cannot modify items on WorkOrder {workOrder.OrderNumber} after invoice issuance without an authorized revision reason or credit note.");
                }
            }
            else if (workOrder.Status == "Delivered")
            {
                throw new InvalidOperationException($"Cannot modify items on WorkOrder {workOrder.OrderNumber} in status '{workOrder.Status}'.");
            }

            var oldValues = $"Desc: {line.Description}, LineType: {line.LineType}, Qty: {line.Quantity}, Price: {line.UnitPrice:N2}, Cost: {line.UnitCost:N2}";

            if (!string.IsNullOrWhiteSpace(lineDto.LineType)) line.LineType = lineDto.LineType;
            if (!string.IsNullOrWhiteSpace(lineDto.Description)) line.Description = lineDto.Description.Trim();
            if (lineDto.ServiceId.HasValue) line.ServiceId = lineDto.ServiceId.Value;
            if (lineDto.Quantity.HasValue && lineDto.Quantity.Value > 0) line.Quantity = lineDto.Quantity.Value;
            if (lineDto.UnitPrice.HasValue) line.UnitPrice = lineDto.UnitPrice.Value;
            if (lineDto.UnitCost.HasValue) line.UnitCost = lineDto.UnitCost.Value;
            if (lineDto.TechnicianId.HasValue) line.TechnicianId = lineDto.TechnicianId.Value;

            var newValues = $"Desc: {line.Description}, LineType: {line.LineType}, Qty: {line.Quantity}, Price: {line.UnitPrice:N2}, Cost: {line.UnitCost:N2}";

            // Recompute totals
            var activeLines = workOrder.Lines.Where(l => !l.IsDeleted).ToList();
            workOrder.TotalWorkmanship = activeLines
                .Where(l => l.LineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalLabor = activeLines
                .Where(l => l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalParts = activeLines
                .Where(l => !l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalAmount = workOrder.TotalLabor + workOrder.TotalParts;

            // Audit log
            _db.AuditLogs.Add(new AuditLog
            {
                Action = line.LineType == "LaborManufacturer" ? "WorkmanshipLineUpdated" : "WorkOrderLineUpdated",
                EntityName = "WorkOrderLine",
                EntityId = line.Id.ToString(),
                UserName = user ?? "Staff",
                OldValues = oldValues,
                NewValues = newValues,
                Details = $"User '{user ?? "Staff"}' updated line #{line.Id} on WO {workOrder.OrderNumber}. Old: [{oldValues}] -> New: [{newValues}]. Revision Reason: {lineDto.RevisionReason ?? "Standard edit"}",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(workOrder.Id))!;
        }

        public async Task<WorkOrderResponseDto> DeleteLineAsync(int id, int lineId, string? user = null, string? revisionReason = null)
        {
            var workOrder = await _db.WorkOrders
                .Include(w => w.Lines)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            var line = workOrder.Lines.FirstOrDefault(l => l.Id == lineId && !l.IsDeleted);
            if (line == null) throw new KeyNotFoundException($"Line {lineId} not found on WorkOrder {id}.");

            if (workOrder.Status == "Invoiced")
            {
                if (string.IsNullOrWhiteSpace(revisionReason))
                {
                    throw new InvalidOperationException($"Cannot remove items from WorkOrder {workOrder.OrderNumber} after invoice issuance without an authorized revision reason or credit note.");
                }
            }
            else if (workOrder.Status == "Delivered")
            {
                throw new InvalidOperationException($"Cannot remove items from WorkOrder {workOrder.OrderNumber} in status '{workOrder.Status}'.");
            }

            line.IsDeleted = true;
            line.DeletedAt = DateTime.UtcNow;
            line.DeletedBy = user ?? "Staff";

            // Recompute totals
            var activeLines = workOrder.Lines.Where(l => !l.IsDeleted).ToList();
            workOrder.TotalWorkmanship = activeLines
                .Where(l => l.LineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalLabor = activeLines
                .Where(l => l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalParts = activeLines
                .Where(l => !l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalAmount = workOrder.TotalLabor + workOrder.TotalParts;

            // Audit log
            _db.AuditLogs.Add(new AuditLog
            {
                Action = line.LineType == "LaborManufacturer" ? "WorkmanshipLineRemoved" : "WorkOrderLineRemoved",
                EntityName = "WorkOrderLine",
                EntityId = line.Id.ToString(),
                UserName = user ?? "Staff",
                OldValues = $"Desc: {line.Description}, LineType: {line.LineType}, Qty: {line.Quantity}, Price: {line.UnitPrice:N2}",
                NewValues = "Deleted",
                Details = $"User '{user ?? "Staff"}' removed line #{line.Id} ('{line.Description}', Price: {line.UnitPrice:N2} L.E) from WO {workOrder.OrderNumber}. Revision Reason: {revisionReason ?? "Standard remove"}",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(workOrder.Id))!;
        }

        public async Task<WorkOrderResponseDto> TransitionStatusAsync(int id, string newStatus, string? notes = null)
        {
            var workOrder = await _db.WorkOrders
                .Include(w => w.Lines).ThenInclude(l => l.SparePart)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            var current = workOrder.Status;

            // Validate transition
            if (!AllowedTransitions.TryGetValue(current, out var targets) || !targets.Contains(newStatus))
            {
                throw new InvalidOperationException(
                    $"ForbiddenStatusTransition: Cannot transition WorkOrder from '{current}' to '{newStatus}'. Allowed transitions: {string.Join(", ", targets ?? new())}");
            }

            workOrder.Status = newStatus;

            // Stock management: Deduct internal parts when transitioning to Completed
            if (newStatus == "Completed")
            {
                workOrder.CompletedAt = DateTime.UtcNow;

                // Ensure default warehouse exists
                var warehouse = await _db.Warehouses.FirstOrDefaultAsync();
                if (warehouse == null)
                {
                    warehouse = new Warehouse { Name = "Main Warehouse", Code = "WH-MAIN" };
                    _db.Warehouses.Add(warehouse);
                    await _db.SaveChangesAsync();
                }

                foreach (var line in workOrder.Lines.Where(l => !l.IsDeleted && !l.IsExternalPart && l.SparePartId.HasValue))
                {
                    var partId = line.SparePartId!.Value;
                    var part = line.SparePart ?? await _db.SpareParts.FindAsync(partId);
                    if (part != null)
                    {
                        part.StockQuantity -= (int)line.Quantity;

                        _db.PartMovements.Add(new PartMovement
                        {
                            SparePartId = part.Id,
                            WarehouseId = warehouse.Id,
                            MovementType = "WorkOrderIssue",
                            QuantityChanged = -line.Quantity,
                            BalanceAfter = part.StockQuantity,
                            UnitCost = line.UnitCost,
                            ReferenceNumber = workOrder.OrderNumber,
                            Notes = $"Deducted on WorkOrder {workOrder.OrderNumber} completion",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }
            else if (newStatus == "Delivered")
            {
                workOrder.DeliveredAt = DateTime.UtcNow;
            }
            else if (newStatus == "Cancelled")
            {
                // Restore internal parts if they were issued for this order (e.g. from Completed)
                var issuedMovements = await _db.PartMovements
                    .Where(pm => pm.ReferenceNumber == workOrder.OrderNumber && pm.MovementType == "WorkOrderIssue")
                    .ToListAsync();

                var alreadyRestored = await _db.PartMovements
                    .AnyAsync(pm => pm.ReferenceNumber == workOrder.OrderNumber && pm.MovementType == "WorkOrderRestore");

                if (issuedMovements.Count > 0 && !alreadyRestored)
                {
                    foreach (var movement in issuedMovements)
                    {
                        var part = await _db.SpareParts.FindAsync(movement.SparePartId);
                        if (part != null)
                        {
                            var restoreQty = Math.Abs(movement.QuantityChanged);
                            part.StockQuantity += (int)restoreQty;

                            _db.PartMovements.Add(new PartMovement
                            {
                                SparePartId = part.Id,
                                WarehouseId = movement.WarehouseId,
                                MovementType = "WorkOrderRestore",
                                QuantityChanged = restoreQty,
                                BalanceAfter = part.StockQuantity,
                                UnitCost = movement.UnitCost,
                                ReferenceNumber = workOrder.OrderNumber,
                                Notes = $"Stock restored upon cancellation of WorkOrder {workOrder.OrderNumber}",
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }
            }

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "WorkOrderStatusTransition",
                EntityName = "WorkOrder",
                EntityId = workOrder.OrderNumber,
                Details = $"Status transitioned from '{current}' to '{newStatus}'. Notes: {notes ?? "N/A"}",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            if (_realtime != null)
            {
                await _realtime.NotifyAsync("workorder-updated", new { OrderId = workOrder.Id, Status = newStatus, OrderNumber = workOrder.OrderNumber });
                await _realtime.NotifyAsync("repair-updated", new { OrderId = workOrder.Id });
            }

            return (await GetByIdAsync(id))!;
        }

        public async Task<WorkOrderPhotoResponseDto> AddPhotoAsync(int id, string fileName, byte[] photoBytes, string photoType, string? caption = null)
        {
            var workOrder = await _db.WorkOrders.FindAsync(id);
            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            var photosDir = Path.Combine(_dataFolder.RootPath, "Files", "Photos");
            Directory.CreateDirectory(photosDir);

            var safeFileName = $"wo_{id}_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Path.GetFileName(fileName)}";
            var fullPath = Path.Combine(photosDir, safeFileName);
            await File.WriteAllBytesAsync(fullPath, photoBytes);

            var relativePath = Path.Combine("Files", "Photos", safeFileName);

            var photo = new WorkOrderPhoto
            {
                WorkOrderId = id,
                FileName = fileName,
                FilePath = relativePath,
                PhotoType = string.IsNullOrWhiteSpace(photoType) ? "Reception" : photoType,
                Caption = caption,
                UploadedAt = DateTime.UtcNow
            };

            _db.WorkOrderPhotos.Add(photo);
            await _db.SaveChangesAsync();

            return new WorkOrderPhotoResponseDto
            {
                Id = photo.Id,
                FileName = photo.FileName,
                FilePath = photo.FilePath,
                PhotoType = photo.PhotoType,
                Caption = photo.Caption,
                UploadedAt = photo.UploadedAt
            };
        }

        public async Task<InvoiceResponseDto> ConvertToInvoiceAsync(int id, ConvertWorkOrderToInvoiceDto? options = null)
        {
            var workOrder = await BaseQuery().FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            // Idempotent: check if already invoiced
            var existingInvoice = await _db.Invoices
                .Include(i => i.Payments)
                .Include(i => i.Customer)
                .Include(i => i.Car)
                .FirstOrDefaultAsync(i => i.WorkOrderId == id);

            if (existingInvoice != null)
            {
                return MapInvoiceToDto(existingInvoice);
            }

            // Allowed to invoice from Completed or Delivered
            if (workOrder.Status != "Completed" && workOrder.Status != "Delivered")
            {
                throw new InvalidOperationException($"WorkOrder must be in 'Completed' or 'Delivered' status to convert to Invoice. Current status: '{workOrder.Status}'.");
            }

            var nextInvNum = $"INV-{DateTime.UtcNow:yyyyMM}-{(await _db.Invoices.CountAsync() + 1):D4}";

            // Freeze line items snapshot JSON
            var snapshotItems = workOrder.Lines.Where(l => !l.IsDeleted).Select(l => new
            {
                l.Description,
                l.LineType,
                l.Quantity,
                l.UnitCost,
                l.UnitPrice,
                Subtotal = l.Quantity * l.UnitPrice,
                GrossMargin = (l.Quantity * l.UnitPrice) - (l.Quantity * l.UnitCost),
                Technician = l.Technician != null ? $"{l.Technician.FirstName} {l.Technician.LastName}" : null
            }).ToList();

            var subtotal = workOrder.TotalAmount;
            var discount = options?.DiscountAmount ?? 0m;
            var taxable = Math.Max(0, subtotal - discount);

            // Dynamic VAT setting: default 14.0m, or passed setting (e.g. 0% for tax-exempt)
            var vatPercentage = options?.VatPercentage ?? 14.0m;
            var vatAmount = Math.Round(taxable * (vatPercentage / 100m), 2, MidpointRounding.AwayFromZero);
            var totalAmount = taxable + vatAmount;

            var invoice = new Invoice
            {
                InvoiceNumber = nextInvNum,
                WorkOrderId = workOrder.Id,
                CustomerId = workOrder.CustomerId,
                CarId = workOrder.CarId,
                InsuranceCompanyId = workOrder.InsuranceCompanyId,
                Subtotal = subtotal,
                DiscountAmount = discount,
                VatPercentage = vatPercentage,
                VatAmount = vatAmount,
                TotalAmount = totalAmount,
                PaidAmount = 0,
                Status = "Issued",
                Currency = options?.Currency ?? "EGP",
                IssuedAt = DateTime.UtcNow,
                Notes = options?.Notes ?? $"Generated from WorkOrder {workOrder.OrderNumber}",
                SnapshotDetailsJson = JsonSerializer.Serialize(snapshotItems)
            };

            _db.Invoices.Add(invoice);

            workOrder.Status = "Invoiced";
            if (!workOrder.DeliveredAt.HasValue)
            {
                workOrder.DeliveredAt = DateTime.UtcNow;
            }

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "ConvertToInvoice",
                EntityName = "Invoice",
                EntityId = nextInvNum,
                Details = $"WorkOrder {workOrder.OrderNumber} converted to Invoice {nextInvNum} (Subtotal: {subtotal:N2}, Discount: {discount:N2}, VAT: {vatAmount:N2}, Total: {totalAmount:N2} L.E).",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            var created = await _db.Invoices
                .Include(i => i.Customer)
                .Include(i => i.Car)
                .Include(i => i.WorkOrder)
                .Include(i => i.Payments)
                .FirstAsync(i => i.Id == invoice.Id);

            if (_realtime != null)
            {
                await _realtime.NotifyAsync("workorder-updated", new { OrderId = workOrder.Id, Status = workOrder.Status, OrderNumber = workOrder.OrderNumber });
                await _realtime.NotifyAsync("repair-updated", new { OrderId = workOrder.Id });
                await _realtime.NotifyAsync("invoice-issued", new { InvoiceId = invoice.Id, InvoiceNumber = invoice.InvoiceNumber });
            }

            return MapInvoiceToDto(created);
        }

        public async Task<string> GeneratePrintedOrderHtmlAsync(int id)
        {
            var workOrder = await BaseQuery().AsNoTracking().FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            var mainTech = workOrder.AssignedTechnician != null
                ? $"{workOrder.AssignedTechnician.FirstName} {workOrder.AssignedTechnician.LastName}"
                : "Not Assigned";

            var helperTech = workOrder.HelperTechnician != null
                ? $"{workOrder.HelperTechnician.FirstName} {workOrder.HelperTechnician.LastName}"
                : "None";

            var activeLines = workOrder.Lines.Where(l => !l.IsDeleted).ToList();
            var workmanshipLines = activeLines.Where(l => l.LineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase)).ToList();
            var partsLines = activeLines.Where(l => !l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase)).ToList();
            var otherLaborLines = activeLines.Where(l => l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase) && !l.LineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase)).ToList();

            var workmanshipSubtotal = workmanshipLines.Sum(l => l.Quantity * l.UnitPrice);
            var partsSubtotal = partsLines.Sum(l => l.Quantity * l.UnitPrice);
            var otherLaborSubtotal = otherLaborLines.Sum(l => l.Quantity * l.UnitPrice);

            var workmanshipRows = workmanshipLines.Count == 0
                ? "<tr><td colspan='5' style='padding: 8px; text-align: center; color: #64748b;'>لا توجد بنود مصنعية</td></tr>"
                : string.Join("", workmanshipLines.Select((l, idx) => $@"
                    <tr>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'>{idx + 1}</td>
                        <td dir='auto' style='padding: 8px; border: 1px solid #ddd; text-align: right;'><strong>{l.Description}</strong></td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'><span dir='ltr'>{l.Quantity:F1}</span></td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{l.UnitPrice:N2}</span> ج.م</td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{(l.Quantity * l.UnitPrice):N2}</span> ج.م</td>
                    </tr>"));

            var partsRows = partsLines.Count == 0
                ? "<tr><td colspan='5' style='padding: 8px; text-align: center; color: #64748b;'>لا توجد قطع غيار</td></tr>"
                : string.Join("", partsLines.Select((l, idx) => $@"
                    <tr>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'>{idx + 1}</td>
                        <td dir='auto' style='padding: 8px; border: 1px solid #ddd; text-align: right;'><strong>{l.Description}</strong>{(l.IsExternalPart && !string.IsNullOrEmpty(l.ExternalVendorName) ? $" <small>({l.ExternalVendorName})</small>" : "")}</td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'><span dir='ltr'>{l.Quantity:F1}</span></td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{l.UnitPrice:N2}</span> ج.م</td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{(l.Quantity * l.UnitPrice):N2}</span> ج.م</td>
                    </tr>"));

            var otherLaborSection = otherLaborLines.Count > 0 ? $@"
                <div class='card' style='margin-bottom: 15px;'>
                    <h4>خدمات وعمالة أخرى (Other Labor / Services)</h4>
                    <table>
                        <thead>
                            <tr>
                                <th style='width: 30px; text-align: center;'>#</th>
                                <th>البيان / الخدمة</th>
                                <th style='width: 70px; text-align: center;'>الكمية</th>
                                <th style='width: 100px; text-align: right;'>سعر الوحدة</th>
                                <th style='width: 110px; text-align: right;'>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {string.Join("", otherLaborLines.Select((l, idx) => $@"
                                <tr>
                                    <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'>{idx + 1}</td>
                                    <td dir='auto' style='padding: 8px; border: 1px solid #ddd; text-align: right;'><strong>{l.LineType}</strong>: {l.Description}</td>
                                    <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'><span dir='ltr'>{l.Quantity:F1}</span></td>
                                    <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{l.UnitPrice:N2}</span> ج.م</td>
                                    <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{(l.Quantity * l.UnitPrice):N2}</span> ج.م</td>
                                </tr>"))}
                        </tbody>
                    </table>
                    <div style='text-align: left; margin-top: 6px; font-weight: bold;'>
                        إجمالي الخدمات الأخرى: <span dir='ltr'>{otherLaborSubtotal:N2}</span> ج.م
                    </div>
                </div>" : "";

            return $@"
<!DOCTYPE html>
<html lang='ar' dir='rtl'>
<head>
    <meta charset='UTF-8'>
    <title>أمر شغل / Work Order - {workOrder.OrderNumber}</title>
    <style>
        @page {{ size: A4 portrait; margin: 15mm; }}
        body {{ font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; color: #222; font-size: 13px; line-height: 1.5; }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 15px; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; background: #e0f2fe; color: #0369a1; }}
        .section-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }}
        .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 15px; }}
        .card h4 {{ margin: 0 0 8px 0; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; font-size: 14px; display: flex; justify-content: space-between; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        th {{ background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: right; }}
        .totals {{ margin-top: 15px; text-align: left; }}
        .totals-box {{ display: inline-block; min-width: 280px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }}
        .totals-row {{ display: flex; justify-content: space-between; padding: 4px 0; }}
        .grand-total {{ font-size: 16px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; margin-top: 6px; padding-top: 6px; }}
        .signatures {{ display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }}
        .sig-block {{ width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 5px; }}
        @media print {{
            .no-print {{ display: none !important; }}
            body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
            table {{ page-break-inside: auto; }}
            tr {{ page-break-inside: avoid; page-break-after: auto; }}
        }}
        .no-print-bar {{
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-bottom: 15px;
            padding: 10px;
            background: #f1f5f9;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
        }}
        .btn-print {{
            background: #2563eb;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 13px;
        }}
        .btn-download {{
            background: #059669;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 13px;
        }}
    </style>
</head>
<body>
    <div class='no-print-bar no-print'>
        <button class='btn-print' onclick='window.print()'>طباعة أمر الشغل / Print Work Order</button>
        <button class='btn-download' onclick='window.print()'>تحميل PDF / Download PDF</button>
    </div>
    <div class='header'>
        <div>
            <h1 style='margin: 0; color: #1e3a8a; font-size: 22px;'>أوتوفكس لإدارة مراكز الصيانة | AutoFix Workshop</h1>
            <div style='color: #64748b; font-size: 12px;'>Professional Automotive Workshop Management System</div>
        </div>
        <div style='text-align: left;'>
            <div style='font-size: 18px; font-weight: bold; color: #2563eb;'>{workOrder.OrderNumber}</div>
            <div class='badge'>الحالة: {workOrder.Status}</div>
            <div style='color: #64748b; font-size: 11px; margin-top: 4px;'>التاريخ: {workOrder.ReceivedAt:yyyy-MM-dd HH:mm}</div>
        </div>
    </div>

    <div class='section-grid'>
        <div class='card' style='margin-bottom: 0;'>
            <h4>بيانات العميل (Customer Details)</h4>
            <div><strong>الاسم:</strong> <span dir='auto'>{workOrder.Customer?.FullName}</span></div>
            <div><strong>الهاتف:</strong> <span dir='ltr'>{workOrder.Customer?.Phone}</span></div>
            <div><strong>شكوى العميل:</strong> <span dir='auto'>{workOrder.CustomerComplaint}</span></div>
        </div>
        <div class='card' style='margin-bottom: 0;'>
            <h4>بيانات السيارة (Vehicle Details)</h4>
            <div><strong>السيارة:</strong> <span dir='auto'>{workOrder.Car?.Make} {workOrder.Car?.Model} ({workOrder.Car?.Year})</span></div>
            <div><strong>رقم اللوحة:</strong> <span dir='auto'>{workOrder.Car?.LicensePlate}</span></div>
            <div><strong>رقم الشاسية / VIN:</strong> <span dir='ltr'>{workOrder.Car?.VIN}</span></div>
            <div><strong>قراءة العداد:</strong> <span dir='ltr'>{workOrder.OdometerInKm} كم</span></div>
        </div>
    </div>

    <div class='card' style='margin-top: 15px;'>
        <h4>الفنيون المسؤولون عن أمر الشغل (Assigned Technicians)</h4>
        <div style='display: flex; justify-content: space-between;'>
            <div><strong>الفني الرئيسي (Main Mechanic):</strong> <span style='color: #2563eb; font-weight: bold;'>{mainTech}</span></div>
            <div><strong>الفني المساعد (Helper Mechanic):</strong> <span style='color: #0284c7; font-weight: bold;'>{helperTech}</span></div>
        </div>
    </div>

    <!-- 1. Dedicated Workmanship Section (مصنعية) -->
    <div class='card'>
        <h4>
            <span>مصنعية (Workmanship)</span>
            <span style='color: #2563eb;'>إجمالي المصنعية: <span dir='ltr'>{workmanshipSubtotal:N2}</span> ج.م</span>
        </h4>
        <table>
            <thead>
                <tr>
                    <th style='width: 30px; text-align: center;'>#</th>
                    <th>بند المصنعية / الخدمة (Workmanship Service)</th>
                    <th style='width: 70px; text-align: center;'>الكمية</th>
                    <th style='width: 100px; text-align: right;'>سعر الوحدة</th>
                    <th style='width: 110px; text-align: right;'>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                {workmanshipRows}
            </tbody>
        </table>
    </div>

    <!-- 2. Dedicated Parts Section (قطع الغيار) -->
    <div class='card'>
        <h4>
            <span>قطع الغيار (Spare Parts)</span>
            <span style='color: #0284c7;'>إجمالي قطع الغيار: <span dir='ltr'>{partsSubtotal:N2}</span> ج.م</span>
        </h4>
        <table>
            <thead>
                <tr>
                    <th style='width: 30px; text-align: center;'>#</th>
                    <th>قطعة الغيار / الصنف (Part Description)</th>
                    <th style='width: 70px; text-align: center;'>الكمية</th>
                    <th style='width: 100px; text-align: right;'>سعر الوحدة</th>
                    <th style='width: 110px; text-align: right;'>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                {partsRows}
            </tbody>
        </table>
    </div>

    {otherLaborSection}

    <div class='totals'>
        <div class='totals-box'>
            <div class='totals-row'><span>إجمالي المصنعية:</span><span><span dir='ltr'>{workmanshipSubtotal:N2}</span> ج.م</span></div>
            <div class='totals-row'><span>إجمالي قطع الغيار:</span><span><span dir='ltr'>{partsSubtotal:N2}</span> ج.م</span></div>
            {(otherLaborSubtotal > 0 ? $"<div class='totals-row'><span>خدمات أخرى:</span><span><span dir='ltr'>{otherLaborSubtotal:N2}</span> ج.م</span></div>" : "")}
            <div class='totals-row grand-total'><span>المجموع الكلي:</span><span><span dir='ltr'>{workOrder.TotalAmount:N2}</span> ج.م</span></div>
        </div>
    </div>

    <div class='signatures'>
        <div class='sig-block'>توقيع الفني الرئيسي ({mainTech})</div>
        <div class='sig-block'>توقيع الاستقبال / الإدارة</div>
        <div class='sig-block'>توقيع واستلام العميل</div>
    </div>
</body>
</html>";
        }

        private static InvoiceResponseDto MapInvoiceToDto(Invoice i, bool isCustomer = false)
        {
            decimal totalWorkmanship = 0;
            decimal totalLabor = 0;
            decimal totalParts = 0;
            var snapshotJson = i.SnapshotDetailsJson;

            if (!string.IsNullOrEmpty(i.SnapshotDetailsJson) && i.SnapshotDetailsJson != "[]")
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(i.SnapshotDetailsJson);
                    foreach (var el in doc.RootElement.EnumerateArray())
                    {
                        var lineType = el.TryGetProperty("LineType", out var lt) ? lt.GetString() ?? "" : "";
                        var subtotal = el.TryGetProperty("Subtotal", out var sub) ? sub.GetDecimal() : 0m;
                        if (lineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase))
                        {
                            totalWorkmanship += subtotal;
                            totalLabor += subtotal;
                        }
                        else if (lineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                        {
                            totalLabor += subtotal;
                        }
                        else
                        {
                            totalParts += subtotal;
                        }
                    }

                    if (isCustomer)
                    {
                        var sanitized = doc.RootElement.EnumerateArray().Select(el => new
                        {
                            Description = el.TryGetProperty("Description", out var d) ? d.GetString() : "",
                            LineType = el.TryGetProperty("LineType", out var lt) ? lt.GetString() : "",
                            Quantity = el.TryGetProperty("Quantity", out var q) ? q.GetDecimal() : 1m,
                            UnitPrice = el.TryGetProperty("UnitPrice", out var up) ? up.GetDecimal() : 0m,
                            Subtotal = el.TryGetProperty("Subtotal", out var sub) ? sub.GetDecimal() : 0m,
                            Technician = el.TryGetProperty("Technician", out var tech) ? tech.GetString() : null
                        }).ToList();
                        snapshotJson = System.Text.Json.JsonSerializer.Serialize(sanitized);
                    }
                }
                catch { }
            }
            else if (i.WorkOrder != null)
            {
                totalWorkmanship = i.WorkOrder.TotalWorkmanship;
                totalLabor = i.WorkOrder.TotalLabor;
                totalParts = i.WorkOrder.TotalParts;
            }

            return new InvoiceResponseDto
            {
                Id = i.Id,
                InvoiceNumber = i.InvoiceNumber,
                WorkOrderId = i.WorkOrderId,
                WorkOrderNumber = i.WorkOrder?.OrderNumber,
                CustomerId = i.CustomerId,
                CustomerName = i.Customer?.FullName ?? string.Empty,
                CustomerPhone = i.Customer?.Phone ?? string.Empty,
                CarId = i.CarId,
                CarPlate = i.Car?.LicensePlate ?? string.Empty,
                CarMakeModel = i.Car != null ? $"{i.Car.Make} {i.Car.Model}" : string.Empty,
                Subtotal = i.Subtotal,
                TotalWorkmanship = totalWorkmanship,
                TotalLabor = totalLabor,
                TotalParts = totalParts,
                DiscountAmount = i.DiscountAmount,
                VatPercentage = i.VatPercentage,
                VatAmount = i.VatAmount,
                TotalAmount = i.TotalAmount,
                PaidAmount = i.PaidAmount,
                RemainingAmount = i.RemainingAmount,
                Status = i.Status,
                Currency = i.Currency,
                IssuedAt = i.IssuedAt,
                DueDate = i.DueDate,
                Notes = i.Notes,
                SnapshotDetailsJson = snapshotJson,
                Payments = i.Payments.Where(p => !p.IsDeleted).Select(p => new PaymentResponseDto
                {
                    Id = p.Id,
                    Amount = p.Amount,
                    PaymentMethod = p.PaymentMethod,
                    ReferenceNumber = p.ReferenceNumber,
                    PaidAt = p.PaidAt,
                    ReceivedBy = p.ReceivedByUserId,
                    Notes = p.Notes
                }).ToList()
            };
        }

        public async Task<WorkOrderResponseDto> ClaimOrderAsync(int id, int mechanicId)
        {
            var workOrder = await BaseQuery().FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            if (workOrder.Status != "Pending")
            {
                throw new InvalidOperationException($"Cannot claim order in status '{workOrder.Status}'. Only 'Pending' orders can be claimed.");
            }

            if (workOrder.AssignedTechnicianId != null)
            {
                throw new InvalidOperationException("Order has already been assigned to a technician.");
            }

            var mechanic = await _db.Mechanics.FindAsync(mechanicId);
            if (mechanic == null)
            {
                throw new KeyNotFoundException($"Mechanic {mechanicId} not found.");
            }

            workOrder.AssignedTechnicianId = mechanicId;
            workOrder.Status = "InProgress";

            _db.WorkOrderMechanicHistories.Add(new WorkOrderMechanicHistory
            {
                WorkOrderId = workOrder.Id,
                Role = "Main",
                PreviousMechanicId = null,
                NewMechanicId = mechanicId,
                AssignedBy = "Mechanic",
                Reason = "Self-claimed by mechanic",
                AssignedAt = DateTime.UtcNow
            });

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "ClaimWorkOrder",
                EntityName = "WorkOrder",
                EntityId = workOrder.OrderNumber,
                Details = $"WorkOrder {workOrder.OrderNumber} claimed by mechanic {mechanic.FirstName} {mechanic.LastName} (ID {mechanicId}). Status set to InProgress.",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            if (_realtime != null)
            {
                await _realtime.NotifyAsync("workorder-updated", new { OrderId = workOrder.Id, Status = workOrder.Status, OrderNumber = workOrder.OrderNumber });
                await _realtime.NotifyAsync("repair-updated", new { OrderId = workOrder.Id });
            }

            return (await GetByIdAsync(id))!;
        }

        public async Task<InvoiceResponseDto> CreditWorkOrderInvoiceAsync(int id, string? reason = null)
        {
            var workOrder = await BaseQuery().FirstOrDefaultAsync(w => w.Id == id);
            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            var invoice = await _db.Invoices
                .Include(i => i.Payments)
                .Include(i => i.Customer)
                .Include(i => i.Car)
                .Include(i => i.WorkOrder)
                .FirstOrDefaultAsync(i => i.WorkOrderId == id);

            if (invoice == null)
            {
                throw new InvalidOperationException($"No invoice found for WorkOrder {workOrder.OrderNumber} to credit.");
            }

            if (invoice.Status == "Credited")
            {
                return MapInvoiceToDto(invoice);
            }

            var creditNoteNumber = $"CN-{invoice.InvoiceNumber}";
            var previousPaidAmount = invoice.PaidAmount;

            invoice.Status = "Credited";
            invoice.Notes = (invoice.Notes ?? string.Empty) + $" [Credit Note: {creditNoteNumber}. Reason: {reason ?? "Customer credit note issued"}]";

            // If payments were previously made, issue an automatic customer refund and record in Treasury
            if (previousPaidAmount > 0)
            {
                // Reversing refund payment record
                _db.InvoicePayments.Add(new InvoicePayment
                {
                    InvoiceId = invoice.Id,
                    Amount = -previousPaidAmount,
                    PaymentMethod = "Refund",
                    ReferenceNumber = creditNoteNumber,
                    Notes = $"Automatic refund for credited invoice {invoice.InvoiceNumber} (Credit Note: {creditNoteNumber})",
                    PaidAt = DateTime.UtcNow
                });
                invoice.PaidAmount = 0;

                // Treasury transaction record for cash/bank refund
                _db.TreasuryTransactions.Add(new TreasuryTransaction
                {
                    TransactionType = "CustomerRefund",
                    Amount = -previousPaidAmount,
                    Category = "Refund",
                    ReferenceNumber = creditNoteNumber,
                    Description = $"Refund to customer {invoice.Customer?.FullName} for credited invoice {invoice.InvoiceNumber} (Credit Note: {creditNoteNumber})",
                    TransactionDate = DateTime.UtcNow
                });
            }

            // Restore stock if parts were issued
            var issuedMovements = await _db.PartMovements
                .Where(pm => pm.ReferenceNumber == workOrder.OrderNumber && pm.MovementType == "WorkOrderIssue")
                .ToListAsync();

            var restoredCount = await _db.PartMovements
                .CountAsync(pm => pm.ReferenceNumber == workOrder.OrderNumber && pm.MovementType == "WorkOrderRestore");

            if (issuedMovements.Count > 0 && restoredCount == 0)
            {
                foreach (var movement in issuedMovements)
                {
                    var part = await _db.SpareParts.FindAsync(movement.SparePartId);
                    if (part != null)
                    {
                        var restoreQty = Math.Abs(movement.QuantityChanged);
                        part.StockQuantity += (int)restoreQty;

                        _db.PartMovements.Add(new PartMovement
                        {
                            SparePartId = part.Id,
                            WarehouseId = movement.WarehouseId,
                            MovementType = "WorkOrderRestore",
                            QuantityChanged = restoreQty,
                            BalanceAfter = part.StockQuantity,
                            UnitCost = movement.UnitCost,
                            ReferenceNumber = workOrder.OrderNumber,
                            Notes = $"Stock restored upon credit note {creditNoteNumber} for WorkOrder {workOrder.OrderNumber}",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "IssueCreditNote",
                EntityName = "Invoice",
                EntityId = invoice.InvoiceNumber,
                Details = $"Credit Note {creditNoteNumber} issued for WorkOrder {workOrder.OrderNumber} (Invoice: {invoice.InvoiceNumber}, Total: {invoice.TotalAmount:F2} L.E). Paid amount of {previousPaidAmount:F2} L.E was refunded to customer and logged in Treasury. Stock restored. Reason: {reason ?? "N/A"}",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            if (_realtime != null)
            {
                await _realtime.NotifyAsync("workorder-updated", new { OrderId = workOrder.Id, Status = workOrder.Status, OrderNumber = workOrder.OrderNumber });
                await _realtime.NotifyAsync("repair-updated", new { OrderId = workOrder.Id });
            }

            return MapInvoiceToDto(invoice);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var workOrder = await _db.WorkOrders.FindAsync(id);
            if (workOrder == null) return false;

            if (workOrder.Status == "Invoiced")
            {
                throw new InvalidOperationException("Cannot delete an invoiced work order.");
            }

            _db.WorkOrders.Remove(workOrder);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
