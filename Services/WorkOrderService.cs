using AutoFix.Data;
using AutoFix.DTOs.Invoice;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Helpers;
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
        private readonly IRealtimeService? _realtime;
        private readonly IServiceProvider? _serviceProvider;

        private ISettingsService? Settings => _serviceProvider != null ? Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetService<ISettingsService>(_serviceProvider) : null;
        private IInvoiceService? Invoices => _serviceProvider != null ? Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetService<IInvoiceService>(_serviceProvider) : null;
        private IInspectionService? Inspections => _serviceProvider != null ? Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetService<IInspectionService>(_serviceProvider) : null;

        // Strict lifecycle transitions map
        private static readonly Dictionary<string, HashSet<string>> AllowedTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Pending"] = new(StringComparer.OrdinalIgnoreCase) { "InProgress", "Cancelled" },
            ["InProgress"] = new(StringComparer.OrdinalIgnoreCase) { "WaitingForParts", "Completed", "Cancelled" },
            ["WaitingForParts"] = new(StringComparer.OrdinalIgnoreCase) { "InProgress", "Cancelled" },
            ["Completed"] = new(StringComparer.OrdinalIgnoreCase) { "Delivered", "Invoiced", "Cancelled" },
            ["Delivered"] = new(StringComparer.OrdinalIgnoreCase) { "Invoiced", "Cancelled" },
            ["Invoiced"] = new(StringComparer.OrdinalIgnoreCase) { }, // Terminal final state
            ["Cancelled"] = new(StringComparer.OrdinalIgnoreCase) { } // Terminal final state (no transitions out)
        };

        public WorkOrderService(AppDbContext db, IDataFolderService dataFolder, IRealtimeService? realtime = null, IServiceProvider? serviceProvider = null)
        {
            _db = db;
            _dataFolder = dataFolder;
            _realtime = realtime;
            _serviceProvider = serviceProvider;
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
                ConcurrencyToken = w.ConcurrencyToken,
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
                WorkType = string.IsNullOrWhiteSpace(w.WorkType) ? "Maintenance" : w.WorkType,
                WorkDone = w.WorkDone ?? string.Empty,
                WorkToBeDone = w.WorkToBeDone ?? string.Empty,
                Notes = w.Notes ?? string.Empty,
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
                    TechnicianName = l.Technician != null ? $"{l.Technician.FirstName} {l.Technician.LastName}" : null,
                    AddedAt = l.AddedAt
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

        private async Task<string> GenerateNextWorkOrderNumberAsync()
        {
            var cairoNow = InvoiceService.GetCairoNow();
            var prefix = $"WO-{cairoNow:yyyyMM}-";
            var existingNumbers = await _db.WorkOrders
                .IgnoreQueryFilters()
                .Where(w => w.OrderNumber.StartsWith(prefix))
                .Select(w => w.OrderNumber)
                .ToListAsync();

            int maxSeq = 0;
            foreach (var num in existingNumbers)
            {
                if (num != null && num.Length > prefix.Length)
                {
                    var suffix = num.Substring(prefix.Length);
                    if (int.TryParse(suffix, out int parsed) && parsed > maxSeq)
                    {
                        maxSeq = parsed;
                    }
                }
            }
            return $"{prefix}{(maxSeq + 1):D4}";
        }

        public async Task<WorkOrderResponseDto> CreateAsync(CreateWorkOrderDto dto)
        {
            // Verify Customer and Car exist
            var customer = await _db.Customers.FindAsync(dto.CustomerId);
            if (customer == null) throw new InvalidOperationException($"Customer {dto.CustomerId} not found.");

            var car = await _db.Cars.FindAsync(dto.CarId);
            if (car == null) throw new InvalidOperationException($"Car {dto.CarId} not found.");

            var workOrder = new WorkOrder
            {
                OrderNumber = string.Empty,
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
                WorkType = string.IsNullOrWhiteSpace(dto.WorkType) ? "Maintenance" : dto.WorkType,
                WorkDone = dto.WorkDone?.Trim() ?? string.Empty,
                WorkToBeDone = dto.WorkToBeDone?.Trim() ?? string.Empty,
                Notes = dto.Notes?.Trim() ?? string.Empty,
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
                    TechnicianId = lineDto.TechnicianId ?? dto.AssignedTechnicianId,
                    AddedAt = lineDto.AddedAt ?? DateTime.UtcNow
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

            const int maxRetries = 5;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                workOrder.OrderNumber = await GenerateNextWorkOrderNumberAsync();
                try
                {
                    await _db.SaveChangesAsync();
                    break;
                }
                catch (DbUpdateException ex) when (attempt < maxRetries && (ex.InnerException?.Message.Contains("UNIQUE") == true || ex.Message.Contains("UNIQUE")))
                {
                    continue;
                }
            }
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

            if (!string.IsNullOrEmpty(dto.ConcurrencyToken) && !string.IsNullOrEmpty(workOrder.ConcurrencyToken) && workOrder.ConcurrencyToken != dto.ConcurrencyToken)
            {
                throw new DbUpdateConcurrencyException("تم تعديل هذا السجل من جهاز آخر، أعد التحميل");
            }
            workOrder.ConcurrencyToken = Guid.NewGuid().ToString("N");

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

            if (!string.IsNullOrWhiteSpace(dto.WorkType) && dto.WorkType != workOrder.WorkType)
            {
                if (workOrder.Status == "Invoiced")
                {
                    throw new InvalidOperationException("Cannot change work type after the work order has been invoiced.");
                }
                _db.AuditLogs.Add(new AuditLog
                {
                    Action = "ChangeWorkType",
                    EntityName = "WorkOrder",
                    EntityId = workOrder.OrderNumber,
                    Details = $"WorkType changed from '{workOrder.WorkType}' to '{dto.WorkType}'",
                    Timestamp = DateTime.UtcNow
                });
                workOrder.WorkType = dto.WorkType;
            }

            if (dto.WorkDone != null) workOrder.WorkDone = dto.WorkDone.Trim();
            if (dto.WorkToBeDone != null) workOrder.WorkToBeDone = dto.WorkToBeDone.Trim();
            if (dto.Notes != null) workOrder.Notes = dto.Notes.Trim();

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
            AutoFix.Controllers.SyncController.UpdateMarker("workorder");
            if (_realtime != null)
            {
                await _realtime.NotifyAsync("workorder-updated", new { OrderId = workOrder.Id, Status = workOrder.Status, OrderNumber = workOrder.OrderNumber });
            }
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
                TechnicianId = lineDto.TechnicianId ?? workOrder.AssignedTechnicianId,
                AddedAt = lineDto.AddedAt ?? DateTime.UtcNow
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
            await SyncWorkOrderToActiveInvoiceAsync(workOrder);
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
            await SyncWorkOrderToActiveInvoiceAsync(workOrder);
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
            await SyncWorkOrderToActiveInvoiceAsync(workOrder);
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

            // Allowed to invoice from Completed, Delivered, or Active (Pending / InProgress)
            if (workOrder.Status == "Cancelled")
            {
                throw new InvalidOperationException($"Cannot convert cancelled WorkOrder {workOrder.OrderNumber} to Invoice.");
            }
            if (workOrder.Status != "Completed" && workOrder.Status != "Delivered")
            {
                workOrder.Status = "Completed";
                workOrder.CompletedAt = DateTime.UtcNow;
            }

            var nextInvNum = await InvoiceService.GenerateUniqueInvoiceNumberStaticAsync(_db);

            int GetWorkOrderLineGroup(WorkOrderLine l)
            {
                if (l.SparePartId.HasValue || l.IsExternalPart ||
                    l.LineType.Equals("SparePart", StringComparison.OrdinalIgnoreCase) ||
                    l.LineType.Equals("Part", StringComparison.OrdinalIgnoreCase) ||
                    l.Description.Contains("قطع غيار", StringComparison.OrdinalIgnoreCase))
                {
                    return 0;
                }
                if (l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase) ||
                    l.LineType.Equals("Workmanship", StringComparison.OrdinalIgnoreCase) ||
                    l.Description.Contains("مصنعية", StringComparison.OrdinalIgnoreCase))
                {
                    return 2;
                }
                return 1;
            }

            var sortedLines = workOrder.Lines
                .Where(l => !l.IsDeleted)
                .OrderBy(GetWorkOrderLineGroup)
                .ThenBy(l => l.AddedAt)
                .ThenBy(l => l.Id)
                .ToList();

            var snapshotItems = sortedLines.Select(l => new
            {
                l.Id,
                l.Description,
                l.LineType,
                l.Quantity,
                l.UnitCost,
                l.UnitPrice,
                Subtotal = l.Quantity * l.UnitPrice,
                GrossMargin = (l.Quantity * l.UnitPrice) - (l.Quantity * l.UnitCost),
                Technician = l.Technician != null ? $"{l.Technician.FirstName} {l.Technician.LastName}" : null,
                l.AddedAt,
                l.SparePartId,
                l.ServiceId,
                l.IsExternalPart
            }).ToList();

            var subtotal = workOrder.TotalAmount;
            var discount = options?.DiscountAmount ?? 0m;
            var taxable = Math.Max(0, subtotal - discount);

            // Dynamic VAT setting: default 14.0m, or 0% when ShowVat is OFF
            var settings = Settings != null ? await Settings.GetSettingsAsync() : new AutoFix.DTOs.Settings.WorkshopSettingsDto();
            var vatPercentage = settings.ShowVat ? (options?.VatPercentage ?? 14.0m) : 0m;
            var vatAmount = settings.ShowVat ? Math.Round(taxable * (vatPercentage / 100m), 2, MidpointRounding.AwayFromZero) : 0m;
            var totalAmount = taxable + vatAmount;

            var invoiceNotes = !string.IsNullOrWhiteSpace(options?.Notes)
                ? options.Notes
                : (!string.IsNullOrWhiteSpace(workOrder.Notes) ? workOrder.Notes : $"Generated from WorkOrder {workOrder.OrderNumber}");

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
                Notes = invoiceNotes,
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

            if (workOrder.WorkType == "Inspection")
            {
                var inspection = await _db.CarInspections.FirstOrDefaultAsync(ci => ci.WorkOrderId == id && !ci.IsDeleted);
                if (inspection != null && Inspections != null)
                {
                    return await Inspections.GenerateHtmlPrintReportAsync(inspection.Id, showInvoiceTotal: true);
                }
            }

            if (Invoices != null)
            {
                return await Invoices.GenerateWordTemplateInvoiceHtmlForWorkOrderAsync(id);
            }

            throw new InvalidOperationException("Invoice template service is not available.");
        }

        public async Task<WorkOrderResponseDto> CreateBundleAsync(CreateWorkOrderBundleDto dto, string? user = null)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                // 1. Customer
                Customer customer;
                if (dto.CustomerId.HasValue && dto.CustomerId.Value > 0)
                {
                    customer = await _db.Customers.FindAsync(dto.CustomerId.Value);
                    if (customer == null || customer.IsDeleted)
                    {
                        throw new InvalidOperationException($"العميل رقم {dto.CustomerId.Value} غير موجود بالمنظومة");
                    }

                    if (dto.UpdateCustomerProfile)
                    {
                        var oldCustValues = new { customer.FullName, customer.Phone, customer.ExtraPhone, customer.Address, customer.Notes };
                        var nameChanged = !string.IsNullOrWhiteSpace(dto.CustomerName) && dto.CustomerName.Trim() != customer.FullName;
                        var phoneChanged = !string.IsNullOrWhiteSpace(dto.CustomerPhone) && dto.CustomerPhone.Trim() != customer.Phone;

                        if (phoneChanged)
                        {
                            var phoneNorm = ArabicSearchNormalizer.NormalizePhoneForComparison(dto.CustomerPhone);
                            var collision = await _db.Customers.AsNoTracking()
                                .Where(c => !c.IsDeleted && c.Id != customer.Id)
                                .Select(c => new { c.Id, c.FullName, c.Phone, c.ExtraPhone })
                                .ToListAsync();
                            var collMatch = collision.FirstOrDefault(c => 
                                ArabicSearchNormalizer.NormalizePhoneForComparison(c.Phone) == phoneNorm ||
                                (!string.IsNullOrEmpty(c.ExtraPhone) && ArabicSearchNormalizer.NormalizePhoneForComparison(c.ExtraPhone) == phoneNorm));
                            if (collMatch != null)
                            {
                                throw new AutoFix.Exceptions.ValidationWarningException("DuplicatePhone", $"رقم الهاتف '{dto.CustomerPhone}' مسجل بالفعل باسم عميل آخر ({collMatch.FullName})", collMatch.Id, collMatch.FullName);
                            }
                            customer.Phone = ArabicSearchNormalizer.FormatPhoneForStorage(dto.CustomerPhone);
                        }

                        if (nameChanged)
                        {
                            customer.FullName = dto.CustomerName.Trim();
                        }
                        if (!string.IsNullOrWhiteSpace(dto.CustomerNotes))
                        {
                            customer.Notes = dto.CustomerNotes.Trim();
                        }

                        await _db.SaveChangesAsync();

                        var newCustValues = new { customer.FullName, customer.Phone, customer.ExtraPhone, customer.Address, customer.Notes };
                        _db.AuditLogs.Add(new AuditLog
                        {
                            Action = "Update",
                            EntityName = "Customer",
                            EntityId = customer.Id.ToString(),
                            OldValues = System.Text.Json.JsonSerializer.Serialize(oldCustValues),
                            NewValues = System.Text.Json.JsonSerializer.Serialize(newCustValues),
                            Details = "Customer profile updated from work order bundle",
                            Timestamp = DateTime.UtcNow
                        });
                        await _db.SaveChangesAsync();

                        await _realtime.NotifyAsync("customer-updated", new { CustomerId = customer.Id });
                        AutoFix.Controllers.SyncController.NotifyCustomersChanged();
                    }
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(dto.CustomerName))
                        throw new InvalidOperationException("اسم العميل مطلوب.");
                    if (string.IsNullOrWhiteSpace(dto.CustomerPhone))
                        throw new InvalidOperationException("رقم هاتف العميل مطلوب.");

                    var normPhone = ArabicSearchNormalizer.NormalizePhoneForComparison(dto.CustomerPhone);
                    if (!dto.AllowDuplicatePhone)
                    {
                        var allCusts = await _db.Customers.AsNoTracking()
                            .Where(c => !c.IsDeleted)
                            .Select(c => new { c.Id, c.FullName, c.Phone, c.ExtraPhone })
                            .ToListAsync();
                        var existingCust = allCusts.FirstOrDefault(c => 
                            ArabicSearchNormalizer.NormalizePhoneForComparison(c.Phone) == normPhone ||
                            (!string.IsNullOrEmpty(c.ExtraPhone) && ArabicSearchNormalizer.NormalizePhoneForComparison(c.ExtraPhone) == normPhone));
                        if (existingCust != null)
                        {
                            throw new AutoFix.Exceptions.ValidationWarningException(
                                "DuplicatePhone",
                                $"رقم الهاتف '{dto.CustomerPhone}' مسجل بالفعل باسم عميل آخر ({existingCust.FullName})",
                                existingCust.Id,
                                existingCust.FullName);
                        }
                    }

                    customer = new Customer
                    {
                        FullName = dto.CustomerName.Trim(),
                        Phone = ArabicSearchNormalizer.FormatPhoneForStorage(dto.CustomerPhone),
                        Notes = dto.CustomerNotes?.Trim() ?? string.Empty,
                        CreatedAt = DateTime.UtcNow
                    };
                    _db.Customers.Add(customer);
                    await _db.SaveChangesAsync();

                    _db.AuditLogs.Add(new AuditLog
                    {
                        Action = "Create",
                        EntityName = "Customer",
                        EntityId = customer.Id.ToString(),
                        NewValues = System.Text.Json.JsonSerializer.Serialize(new { customer.FullName, customer.Phone }),
                        Details = "Customer registered via Reception bundle",
                        Timestamp = DateTime.UtcNow
                    });
                    await _db.SaveChangesAsync();

                    await _realtime.NotifyAsync("customer-created", new { CustomerId = customer.Id });
                    AutoFix.Controllers.SyncController.NotifyCustomersChanged();
                }

                Car car;
                if (dto.CarId.HasValue && dto.CarId.Value > 0)
                {
                    car = await _db.Cars.FindAsync(dto.CarId.Value);
                    if (car == null || car.IsDeleted)
                    {
                        throw new InvalidOperationException($"السيارة رقم {dto.CarId.Value} غير موجودة");
                    }
                    if (car.CustomerId != customer.Id)
                    {
                        throw new InvalidOperationException($"السيارة المحددة لا تنتمي لهذا العميل ({customer.FullName})");
                    }

                    if (dto.UpdateCarProfile)
                    {
                        var oldCarValues = new { car.Make, car.Model, car.Year, car.LicensePlate, car.VIN, car.CurrentOdometerKm };
                        if (!string.IsNullOrWhiteSpace(dto.Make)) car.Make = dto.Make.Trim();
                        if (!string.IsNullOrWhiteSpace(dto.Model)) car.Model = dto.Model.Trim();
                        if (dto.Year > 1900) car.Year = dto.Year;
                        if (!string.IsNullOrWhiteSpace(dto.LicensePlate)) car.LicensePlate = ArabicSearchNormalizer.NormalizeDigits(dto.LicensePlate.Trim());
                        if (!string.IsNullOrWhiteSpace(dto.VIN)) car.VIN = dto.VIN.Trim().ToUpperInvariant();
                        await _db.SaveChangesAsync();

                        var newCarValues = new { car.Make, car.Model, car.Year, car.LicensePlate, car.VIN, car.CurrentOdometerKm };
                        _db.AuditLogs.Add(new AuditLog
                        {
                            Action = "Update",
                            EntityName = "Car",
                            EntityId = car.Id.ToString(),
                            OldValues = System.Text.Json.JsonSerializer.Serialize(oldCarValues),
                            NewValues = System.Text.Json.JsonSerializer.Serialize(newCarValues),
                            Details = "Car profile updated from work order bundle",
                            Timestamp = DateTime.UtcNow
                        });
                        await _db.SaveChangesAsync();
                    }

                    var oldKm = car.CurrentOdometerKm;
                    var newKm = dto.OdometerInKm ?? 0;
                    if (newKm > 0 && newKm < oldKm && !dto.AllowLowerOdometer)
                    {
                        throw new AutoFix.Exceptions.ValidationWarningException(
                            "LowerOdometer",
                            $"قراءة العداد الحالية ({newKm} كم) أقل من القراءة السابقة المسجلة ({oldKm} كم). هل تريد التأكيد؟",
                            car.Id,
                            $"قراءة سابقة: {oldKm} كم");
                    }

                    if (newKm > 0 && newKm != oldKm)
                    {
                        _db.CarOdometerLogs.Add(new CarOdometerLog
                        {
                            CarId = car.Id,
                            OdometerKm = newKm,
                            Source = "WorkOrderBundle",
                            Notes = "Odometer recorded at Reception bundle",
                            IsLowerReadingWarning = newKm < oldKm
                        });
                        car.CurrentOdometerKm = newKm;
                        await _db.SaveChangesAsync();
                    }
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(dto.Make))
                        throw new InvalidOperationException("ماركة السيارة مطلوبة.");
                    if (string.IsNullOrWhiteSpace(dto.Model))
                        throw new InvalidOperationException("موديل السيارة مطلوب.");
                    if (string.IsNullOrWhiteSpace(dto.LicensePlate))
                        throw new InvalidOperationException("رقم اللوحة مطلوب.");

                    var cleanPlate = ArabicSearchNormalizer.NormalizeDigits(dto.LicensePlate.Trim());
                    var cleanVin = !string.IsNullOrWhiteSpace(dto.VIN) ? dto.VIN.Trim().ToUpperInvariant() : null;

                    if (!dto.AllowDuplicateCar)
                    {
                        var existingCar = await _db.Cars.AsNoTracking()
                            .Include(c => c.Customer)
                            .FirstOrDefaultAsync(c => !c.IsDeleted && (
                                c.LicensePlate == cleanPlate || 
                                (!string.IsNullOrEmpty(cleanVin) && !string.IsNullOrEmpty(c.VIN) && c.VIN == cleanVin)
                            ));

                        if (existingCar != null)
                        {
                            var matchReason = existingCar.LicensePlate == cleanPlate ? $"لوحة '{cleanPlate}'" : $"شاسيه '{cleanVin}'";
                            throw new AutoFix.Exceptions.ValidationWarningException(
                                "DuplicateCar",
                                $"السيارة ذات {matchReason} مسجلة بالفعل باسم ({existingCar.Customer?.FullName ?? "غير معروف"})",
                                existingCar.Id,
                                existingCar.Customer?.FullName);
                        }
                    }

                    car = new Car
                    {
                        CustomerId = customer.Id,
                        Make = dto.Make.Trim(),
                        Model = dto.Model.Trim(),
                        Year = dto.Year > 1900 ? dto.Year : DateTime.UtcNow.Year,
                        LicensePlate = cleanPlate,
                        VIN = cleanVin ?? string.Empty,
                        CurrentOdometerKm = dto.OdometerInKm ?? 0
                    };
                    _db.Cars.Add(car);
                    await _db.SaveChangesAsync();

                    _db.AuditLogs.Add(new AuditLog
                    {
                        Action = "Create",
                        EntityName = "Car",
                        EntityId = car.Id.ToString(),
                        NewValues = System.Text.Json.JsonSerializer.Serialize(new { car.Make, car.Model, car.LicensePlate, car.CustomerId }),
                        Details = "Car registered via Reception bundle",
                        Timestamp = DateTime.UtcNow
                    });
                    await _db.SaveChangesAsync();

                    if (car.CurrentOdometerKm > 0)
                    {
                        _db.CarOdometerLogs.Add(new CarOdometerLog
                        {
                            CarId = car.Id,
                            OdometerKm = car.CurrentOdometerKm,
                            Source = "Initial",
                            Notes = "Initial odometer at bundle registration"
                        });
                        await _db.SaveChangesAsync();
                    }
                }

                // 3. Work Order
                var workOrder = new WorkOrder
                {
                    OrderNumber = string.Empty,
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    WorkType = string.IsNullOrWhiteSpace(dto.WorkType) ? "Maintenance" : dto.WorkType.Trim(),
                    CustomerComplaint = dto.CustomerComplaint?.Trim() ?? string.Empty,
                    Notes = dto.Notes?.Trim() ?? string.Empty,
                    WorkDone = dto.WorkDone?.Trim() ?? string.Empty,
                    WorkToBeDone = dto.WorkToBeDone?.Trim() ?? string.Empty,
                    OdometerInKm = dto.OdometerInKm ?? car.CurrentOdometerKm,
                    AssignedTechnicianId = dto.AssignedTechnicianId,
                    Status = "Pending",
                    ReceivedAt = DateTime.UtcNow
                };
                _db.WorkOrders.Add(workOrder);

                const int maxRetries = 5;
                for (int attempt = 1; attempt <= maxRetries; attempt++)
                {
                    workOrder.OrderNumber = await GenerateNextWorkOrderNumberAsync();
                    try
                    {
                        await _db.SaveChangesAsync();
                        break;
                    }
                    catch (DbUpdateException ex) when (attempt < maxRetries && (ex.InnerException?.Message.Contains("UNIQUE") == true || ex.Message.Contains("UNIQUE")))
                    {
                        continue;
                    }
                }

                // 4. Lines
                if (dto.Lines != null && dto.Lines.Count > 0)
                {
                    foreach (var lineDto in dto.Lines)
                    {
                        var lineType = string.IsNullOrWhiteSpace(lineDto.LineType) ? "LaborManufacturer" : lineDto.LineType;
                        var line = new WorkOrderLine
                        {
                            WorkOrderId = workOrder.Id,
                            LineType = lineType,
                            Description = (lineDto.Description ?? "").Trim(),
                            ServiceId = lineDto.ServiceId,
                            SparePartId = lineDto.SparePartId,
                            IsExternalPart = lineDto.IsExternalPart,
                            ExternalVendorName = lineDto.ExternalVendorName?.Trim(),
                            Quantity = lineDto.Quantity > 0 ? lineDto.Quantity : 1,
                            UnitCost = lineDto.UnitCost,
                            UnitPrice = lineDto.UnitPrice,
                            TechnicianId = lineDto.TechnicianId ?? workOrder.AssignedTechnicianId,
                            AddedAt = lineDto.AddedAt ?? DateTime.UtcNow
                        };
                        workOrder.Lines.Add(line);
                    }

                    var activeLines = workOrder.Lines.ToList();
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

                    await _db.SaveChangesAsync();
                }

                _db.AuditLogs.Add(new AuditLog
                {
                    Action = "CreateWorkOrderBundle",
                    EntityName = "WorkOrder",
                    EntityId = workOrder.OrderNumber,
                    UserName = user ?? "Staff",
                    Details = $"Atomic bundle created: Customer {customer.FullName}, Car {car.LicensePlate}, WorkOrder {workOrder.OrderNumber} ({workOrder.WorkType}) with {workOrder.Lines.Count} lines. Total: {workOrder.TotalAmount:N2} L.E.",
                    Timestamp = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();

                await tx.CommitAsync();

                if (_realtime != null)
                {
                    await _realtime.NotifyAsync("workorder-created", new { OrderId = workOrder.Id, OrderNumber = workOrder.OrderNumber });
                    await _realtime.NotifyAsync("dashboard-updated", new { });
                }

                return (await GetByIdAsync(workOrder.Id))!;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<List<CarServiceHistoryDto>> GetCarServiceHistoryAsync(int carId, bool isCustomer = false)
        {
            var workOrders = await _db.WorkOrders
                .Include(w => w.Lines).ThenInclude(l => l.Technician)
                .Include(w => w.AssignedTechnician)
                .AsNoTracking()
                .Where(w => w.CarId == carId && !w.IsDeleted && w.Status != "Cancelled")
                .OrderByDescending(w => w.ReceivedAt)
                .ToListAsync();

            var history = new List<CarServiceHistoryDto>();

            foreach (var wo in workOrders)
            {
                var activeLines = wo.Lines.Where(l => !l.IsDeleted).ToList();
                if (activeLines.Count == 0)
                {
                    history.Add(new CarServiceHistoryDto
                    {
                        WorkOrderId = wo.Id,
                        OrderNumber = wo.OrderNumber,
                        Date = wo.ReceivedAt,
                        OdometerKm = wo.OdometerInKm,
                        OperationName = !string.IsNullOrWhiteSpace(wo.CustomerComplaint) ? wo.CustomerComplaint : (!string.IsNullOrWhiteSpace(wo.WorkDone) ? wo.WorkDone : wo.WorkType),
                        LineType = "Summary",
                        Quantity = 1,
                        UnitPrice = wo.TotalAmount,
                        TotalPrice = wo.TotalAmount,
                        UnitCost = isCustomer ? null : 0m,
                        MechanicName = wo.AssignedTechnician != null ? $"{wo.AssignedTechnician.FirstName} {wo.AssignedTechnician.LastName}" : null,
                        WorkType = wo.WorkType,
                        Status = wo.Status
                    });
                }
                else
                {
                    foreach (var l in activeLines)
                    {
                        var techName = l.Technician != null
                            ? $"{l.Technician.FirstName} {l.Technician.LastName}"
                            : (wo.AssignedTechnician != null ? $"{wo.AssignedTechnician.FirstName} {wo.AssignedTechnician.LastName}" : null);

                        history.Add(new CarServiceHistoryDto
                        {
                            WorkOrderId = wo.Id,
                            OrderNumber = wo.OrderNumber,
                            Date = wo.ReceivedAt,
                            OdometerKm = wo.OdometerInKm,
                            OperationName = l.Description,
                            LineType = l.LineType,
                            Quantity = l.Quantity,
                            UnitPrice = l.UnitPrice,
                            TotalPrice = l.Quantity * l.UnitPrice,
                            UnitCost = isCustomer ? null : l.UnitCost,
                            MechanicName = techName,
                            WorkType = wo.WorkType,
                            Status = wo.Status
                        });
                    }
                }
            }

            return history.OrderByDescending(h => h.Date).ToList();
        }

        private async Task SyncWorkOrderToActiveInvoiceAsync(WorkOrder workOrder)
        {
            var invoice = await _db.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.WorkOrderId == workOrder.Id && !i.IsDeleted && i.Status != "Credited");

            // Restrict strictly to draft invoices only, with zero payments made
            if (invoice != null && invoice.Status == "Draft" && invoice.PaidAmount == 0 && (invoice.Payments == null || !invoice.Payments.Any(p => !p.IsDeleted)))
            {
                invoice.Subtotal = workOrder.TotalAmount;
                var settings = Settings != null ? await Settings.GetSettingsAsync() : new AutoFix.DTOs.Settings.WorkshopSettingsDto();
                var afterDiscount = Math.Max(0, invoice.Subtotal - invoice.DiscountAmount);
                var vatPct = settings.ShowVat ? invoice.VatPercentage : 0m;
                invoice.VatPercentage = vatPct;
                invoice.VatAmount = settings.ShowVat ? Math.Round(afterDiscount * (vatPct / 100m), 2) : 0m;
                invoice.TotalAmount = afterDiscount + invoice.VatAmount;

                if (_realtime != null)
                {
                    await _realtime.NotifyAsync("invoice-updated", new { InvoiceId = invoice.Id, InvoiceNumber = invoice.InvoiceNumber });
                }
            }

            if (_realtime != null)
            {
                await _realtime.NotifyAsync("workorder-updated", new { OrderId = workOrder.Id, Status = workOrder.Status, OrderNumber = workOrder.OrderNumber });
                await _realtime.NotifyAsync("dashboard-updated", new { });
            }
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

        public async Task<WorkOrderResponseDto> UpdateNotesAsync(int id, string notes, string? user = null)
        {
            var workOrder = await _db.WorkOrders
                .Include(w => w.Lines)
                .Include(w => w.Customer)
                .Include(w => w.Car)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            if (workOrder.Status == "Invoiced" || workOrder.Status == "Delivered")
            {
                throw new InvalidOperationException($"Cannot modify notes on WorkOrder {workOrder.OrderNumber} in status '{workOrder.Status}'.");
            }

            workOrder.Notes = notes?.Trim() ?? string.Empty;
            await _db.SaveChangesAsync();

            if (_realtime != null)
            {
                await _realtime.NotifyAsync("workorder-updated", new { OrderId = workOrder.Id, UpdatedByDevice = user, OrderNumber = workOrder.OrderNumber });
            }

            return (await GetByIdAsync(workOrder.Id))!;
        }
    }
}
