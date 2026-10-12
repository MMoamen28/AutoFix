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
                .Include(w => w.Photos)
                .Include(w => w.MechanicHistories).ThenInclude(h => h.PreviousMechanic)
                .Include(w => w.MechanicHistories).ThenInclude(h => h.NewMechanic);
        }

        private WorkOrderResponseDto MapToDto(WorkOrder w)
        {
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
                TotalAmount = w.TotalAmount,
                ReceivedAt = w.ReceivedAt,
                ExpectedDeliveryAt = w.ExpectedDeliveryAt,
                CompletedAt = w.CompletedAt,
                DeliveredAt = w.DeliveredAt,
                Lines = w.Lines.Where(l => !l.IsDeleted).Select(l => new WorkOrderLineResponseDto
                {
                    Id = l.Id,
                    LineType = l.LineType,
                    Description = l.Description,
                    SparePartId = l.SparePartId,
                    SparePartName = l.SparePart?.Name,
                    IsExternalPart = l.IsExternalPart,
                    ExternalVendorName = l.ExternalVendorName,
                    Quantity = l.Quantity,
                    UnitCost = l.UnitCost,
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

        public async Task<List<WorkOrderResponseDto>> GetAllAsync(string? status = null, int? customerId = null, int? mechanicId = null)
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
            return results.Select(MapToDto).ToList();
        }

        public async Task<WorkOrderResponseDto?> GetByIdAsync(int id)
        {
            var workOrder = await BaseQuery().AsNoTracking().FirstOrDefaultAsync(w => w.Id == id);
            return workOrder == null ? null : MapToDto(workOrder);
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

            foreach (var lineDto in dto.Lines)
            {
                var subtotal = lineDto.Quantity * lineDto.UnitPrice;
                if (lineDto.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
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
                    SparePartId = lineDto.SparePartId,
                    IsExternalPart = lineDto.IsExternalPart,
                    ExternalVendorName = lineDto.ExternalVendorName?.Trim(),
                    Quantity = lineDto.Quantity,
                    UnitCost = lineDto.UnitCost,
                    UnitPrice = lineDto.UnitPrice,
                    TechnicianId = lineDto.TechnicianId ?? dto.AssignedTechnicianId
                });
            }

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

                foreach (var lineDto in dto.Lines)
                {
                    var subtotal = lineDto.Quantity * lineDto.UnitPrice;
                    if (lineDto.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
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
                        SparePartId = lineDto.SparePartId,
                        IsExternalPart = lineDto.IsExternalPart,
                        ExternalVendorName = lineDto.ExternalVendorName?.Trim(),
                        Quantity = lineDto.Quantity,
                        UnitCost = lineDto.UnitCost,
                        UnitPrice = lineDto.UnitPrice,
                        TechnicianId = lineDto.TechnicianId ?? dto.AssignedTechnicianId
                    });
                }

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

        public async Task<WorkOrderResponseDto> AddLineAsync(int id, CreateWorkOrderLineDto lineDto)
        {
            var workOrder = await _db.WorkOrders
                .Include(w => w.Lines)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {id} not found.");

            if (workOrder.Status == "Invoiced" || workOrder.Status == "Delivered")
            {
                throw new InvalidOperationException($"Cannot add items to WorkOrder {workOrder.OrderNumber} in status '{workOrder.Status}'.");
            }

            var line = new WorkOrderLine
            {
                WorkOrderId = workOrder.Id,
                LineType = lineDto.LineType,
                Description = lineDto.Description.Trim(),
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
            workOrder.TotalLabor = activeLines
                .Where(l => l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalParts = activeLines
                .Where(l => !l.LineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                .Sum(l => l.Quantity * l.UnitPrice);
            workOrder.TotalAmount = workOrder.TotalLabor + workOrder.TotalParts;

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
                Details = $"WorkOrder {workOrder.OrderNumber} converted to Invoice {nextInvNum} (Subtotal: {subtotal}, Discount: {discount}, VAT: {vatAmount}, Total: {totalAmount:F2} EGP).",
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

            var linesHtml = string.Join("", workOrder.Lines.Where(l => !l.IsDeleted).Select((l, idx) => $@"
                <tr>
                    <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'>{idx + 1}</td>
                    <td style='padding: 8px; border: 1px solid #ddd;'><strong>{l.LineType}</strong><br/>{l.Description}</td>
                    <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'>{l.Quantity:F1}</td>
                    <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'>{l.UnitPrice:F2} EGP</td>
                    <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'>{(l.Quantity * l.UnitPrice):F2} EGP</td>
                </tr>"));

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
        .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }}
        .card h4 {{ margin: 0 0 8px 0; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; font-size: 14px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        th {{ background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: right; }}
        .totals {{ margin-top: 15px; text-align: left; }}
        .totals-box {{ display: inline-block; min-width: 250px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }}
        .totals-row {{ display: flex; justify-content: space-between; padding: 4px 0; }}
        .grand-total {{ font-size: 16px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; margin-top: 6px; padding-top: 6px; }}
        .signatures {{ display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }}
        .sig-block {{ width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 5px; }}
    </style>
</head>
<body>
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
        <div class='card'>
            <h4>بيانات العميل (Customer Details)</h4>
            <div><strong>الاسم:</strong> {workOrder.Customer?.FullName}</div>
            <div><strong>الهاتف:</strong> {workOrder.Customer?.Phone}</div>
            <div><strong>شكوى العميل:</strong> {workOrder.CustomerComplaint}</div>
        </div>
        <div class='card'>
            <h4>بيانات السيارة (Vehicle Details)</h4>
            <div><strong>السيارة:</strong> {workOrder.Car?.Make} {workOrder.Car?.Model} ({workOrder.Car?.Year})</div>
            <div><strong>رقم اللوحة:</strong> {workOrder.Car?.LicensePlate}</div>
            <div><strong>رقم الشاسية / VIN:</strong> {workOrder.Car?.VIN}</div>
            <div><strong>قراءة العداد:</strong> {workOrder.OdometerInKm} كم</div>
        </div>
    </div>

    <div class='card' style='margin-bottom: 15px;'>
        <h4>الفنيون المسؤولون عن أمر الشغل (Assigned Technicians)</h4>
        <div style='display: flex; justify-content: space-between;'>
            <div><strong>الفني الرئيسي (Main Mechanic):</strong> <span style='color: #2563eb; font-weight: bold;'>{mainTech}</span></div>
            <div><strong>الفني المساعد (Helper Mechanic):</strong> <span style='color: #0284c7; font-weight: bold;'>{helperTech}</span></div>
        </div>
    </div>

    <div class='card'>
        <h4>بنود العمل وقطع الغيار (Services & Spare Parts)</h4>
        <table>
            <thead>
                <tr>
                    <th style='width: 30px; text-align: center;'>#</th>
                    <th>البيان / الوصف</th>
                    <th style='width: 70px; text-align: center;'>الكمية</th>
                    <th style='width: 100px; text-align: right;'>سعر الوحدة</th>
                    <th style='width: 110px; text-align: right;'>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                {linesHtml}
            </tbody>
        </table>

        <div class='totals'>
            <div class='totals-box'>
                <div class='totals-row'><span>إجمالي المصنعيات:</span><span>{workOrder.TotalLabor:F2} EGP</span></div>
                <div class='totals-row'><span>إجمالي قطع الغيار:</span><span>{workOrder.TotalParts:F2} EGP</span></div>
                <div class='totals-row grand-total'><span>المجموع الكلي:</span><span>{workOrder.TotalAmount:F2} EGP</span></div>
            </div>
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

        private static InvoiceResponseDto MapInvoiceToDto(Invoice i)
        {
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
                SnapshotDetailsJson = i.SnapshotDetailsJson,
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
                Details = $"Credit Note {creditNoteNumber} issued for WorkOrder {workOrder.OrderNumber} (Invoice: {invoice.InvoiceNumber}, Total: {invoice.TotalAmount:F2} EGP). Paid amount of {previousPaidAmount:F2} EGP was refunded to customer and logged in Treasury. Stock restored. Reason: {reason ?? "N/A"}",
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
