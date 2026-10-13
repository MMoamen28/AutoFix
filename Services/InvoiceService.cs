using AutoFix.Data;
using AutoFix.DTOs.Invoice;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly AppDbContext _db;
        private readonly IDataFolderService? _dataFolder;
        private readonly ISettingsService? _settingsService;
        private static readonly SemaphoreSlim _invoiceIdLock = new(1, 1);

        public InvoiceService(AppDbContext db, IDataFolderService? dataFolder = null, ISettingsService? settingsService = null)
        {
            _db = db;
            _dataFolder = dataFolder;
            _settingsService = settingsService;
        }

        public static DateTime GetCairoNow()
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "Egypt Standard Time" : "Africa/Cairo");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            }
            catch
            {
                return DateTime.UtcNow.AddHours(2);
            }
        }

        public static async Task<string> GenerateUniqueInvoiceNumberStaticAsync(AppDbContext db)
        {
            await _invoiceIdLock.WaitAsync();
            try
            {
                var cairoNow = GetCairoNow();
                var prefix = $"INV-{cairoNow:yyyyMM}-";

                // Query both existing Invoices and historic IDs (ignoring soft delete query filters)
                var existingNumbers = await db.Invoices
                    .IgnoreQueryFilters()
                    .Where(i => i.InvoiceNumber.StartsWith(prefix))
                    .Select(i => i.InvoiceNumber)
                    .ToListAsync();

                var historyNumbers = await db.InvoiceIdHistories
                    .IgnoreQueryFilters()
                    .Where(h => h.OldInvoiceNumber.StartsWith(prefix) || h.NewInvoiceNumber.StartsWith(prefix))
                    .Select(h => h.OldInvoiceNumber)
                    .ToListAsync();

                var allNumbers = existingNumbers.Concat(historyNumbers).Distinct().ToList();

                int maxSeq = 0;
                foreach (var num in allNumbers)
                {
                    if (num.Length > prefix.Length)
                    {
                        var suffix = num.Substring(prefix.Length);
                        if (int.TryParse(suffix, out var seq) && seq > maxSeq)
                        {
                            maxSeq = seq;
                        }
                    }
                }

                var nextSeq = maxSeq + 1;
                return $"{prefix}{nextSeq:D4}";
            }
            finally
            {
                _invoiceIdLock.Release();
            }
        }

        private IQueryable<Invoice> BaseQuery()
        {
            return _db.Invoices
                .Include(i => i.Customer)
                .Include(i => i.Car)
                .Include(i => i.WorkOrder)
                    .ThenInclude(w => w!.Lines)
                .Include(i => i.Payments)
                .Include(i => i.IdHistories);
        }

        private static InvoiceResponseDto MapToDto(Invoice i, bool isCustomer = false)
        {
            decimal totalWorkmanship = 0;
            decimal totalLabor = 0;
            decimal totalParts = 0;
            var snapshotJson = i.SnapshotDetailsJson;

            if (!string.IsNullOrEmpty(i.SnapshotDetailsJson) && i.SnapshotDetailsJson != "[]")
            {
                try
                {
                    using var doc = JsonDocument.Parse(i.SnapshotDetailsJson);
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
                        snapshotJson = JsonSerializer.Serialize(sanitized);
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
                Payments = i.Payments.Where(p => !p.IsDeleted).OrderByDescending(p => p.PaidAt).Select(p => new PaymentResponseDto
                {
                    Id = p.Id,
                    Amount = p.Amount,
                    PaymentMethod = p.PaymentMethod,
                    ReferenceNumber = p.ReferenceNumber,
                    PaidAt = p.PaidAt,
                    ReceivedBy = p.ReceivedByUserId,
                    Notes = p.Notes,
                    TotalAmount = i.TotalAmount,
                    PaidAmount = i.PaidAmount,
                    RemainingAmount = i.RemainingAmount
                }).ToList(),
                IdHistories = i.IdHistories.Where(h => !h.IsDeleted).OrderByDescending(h => h.ChangedAt).Select(h => new InvoiceIdHistoryResponseDto
                {
                    Id = h.Id,
                    InvoiceId = h.InvoiceId,
                    OldInvoiceNumber = h.OldInvoiceNumber,
                    NewInvoiceNumber = h.NewInvoiceNumber,
                    ChangedBy = h.ChangedBy,
                    Reason = h.Reason,
                    ChangedAt = h.ChangedAt
                }).ToList()
            };
        }

        public async Task<List<InvoiceResponseDto>> GetAllAsync(int? customerId = null, bool isCustomer = false)
        {
            var query = BaseQuery().AsNoTracking();

            if (customerId.HasValue && customerId.Value > 0)
            {
                query = query.Where(i => i.CustomerId == customerId.Value);
            }

            var list = await query.OrderByDescending(i => i.IssuedAt).ToListAsync();
            return list.Select(i => MapToDto(i, isCustomer)).ToList();
        }

        public async Task<InvoiceResponseDto?> GetByIdAsync(int id, bool isCustomer = false)
        {
            var invoice = await BaseQuery().AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
            return invoice == null ? null : MapToDto(invoice, isCustomer);
        }

        public async Task<InvoiceResponseDto?> GetByInvoiceNumberAsync(string invoiceNumber, bool isCustomer = false)
        {
            if (string.IsNullOrWhiteSpace(invoiceNumber)) return null;
            var trimmed = invoiceNumber.Trim();

            var invoice = await BaseQuery().AsNoTracking().FirstOrDefaultAsync(i => i.InvoiceNumber == trimmed);
            if (invoice != null)
            {
                return MapToDto(invoice, isCustomer);
            }

            var history = await _db.InvoiceIdHistories
                .Include(h => h.Invoice)
                .AsNoTracking()
                .FirstOrDefaultAsync(h => h.OldInvoiceNumber == trimmed);

            if (history != null)
            {
                return await GetByIdAsync(history.InvoiceId, isCustomer);
            }

            return null;
        }

        public async Task<InvoiceResponseDto> CreateAsync(CreateInvoiceDto dto)
        {
            var customer = await _db.Customers.FindAsync(dto.CustomerId);
            if (customer == null) throw new InvalidOperationException($"Customer {dto.CustomerId} not found.");

            var car = await _db.Cars.FindAsync(dto.CarId);
            if (car == null) throw new InvalidOperationException($"Car {dto.CarId} not found.");

            decimal subtotal = 0;
            if (dto.WorkOrderId.HasValue)
            {
                var wo = await _db.WorkOrders.FindAsync(dto.WorkOrderId.Value);
                if (wo != null) subtotal = wo.TotalAmount;
            }

            var settings = _settingsService != null ? await _settingsService.GetSettingsAsync() : new AutoFix.DTOs.Settings.WorkshopSettingsDto();
            var afterDiscount = Math.Max(0, subtotal - dto.DiscountAmount);
            var vatPercentage = settings.ShowVat ? dto.VatPercentage : 0m;
            var vatAmount = settings.ShowVat ? Math.Round(afterDiscount * (vatPercentage / 100m), 2) : 0m;
            var totalAmount = afterDiscount + vatAmount;

            for (int attempt = 0; attempt < 5; attempt++)
            {
                var nextNum = await GenerateUniqueInvoiceNumberStaticAsync(_db);

                var invoice = new Invoice
                {
                    InvoiceNumber = nextNum,
                    WorkOrderId = dto.WorkOrderId,
                    CustomerId = dto.CustomerId,
                    CarId = dto.CarId,
                    Subtotal = subtotal,
                    DiscountAmount = dto.DiscountAmount,
                    VatPercentage = vatPercentage,
                    VatAmount = vatAmount,
                    TotalAmount = totalAmount,
                    PaidAmount = 0,
                    Status = "Issued",
                    Currency = "EGP",
                    IssuedAt = GetCairoNow(),
                    Notes = dto.Notes ?? string.Empty
                };

                _db.Invoices.Add(invoice);

                _db.AuditLogs.Add(new AuditLog
                {
                    Action = "CreateInvoice",
                    EntityName = "Invoice",
                    EntityId = nextNum,
                    Details = $"Manual invoice {nextNum} created for Customer {customer.FullName}. Total: {totalAmount:F2} L.E.",
                    Timestamp = DateTime.UtcNow
                });

                try
                {
                    await _db.SaveChangesAsync();
                    return (await GetByIdAsync(invoice.Id))!;
                }
                catch (DbUpdateException) when (attempt < 4)
                {
                    _db.Entry(invoice).State = EntityState.Detached;
                    await Task.Delay(25 * (attempt + 1));
                }
            }

            throw new InvalidOperationException("Failed to generate a unique invoice number after multiple attempts.");
        }

        public async Task<InvoiceResponseDto> UpdateInvoiceNumberAsync(int id, UpdateInvoiceNumberDto dto, string changedBy, bool isAdmin)
        {
            var invoice = await _db.Invoices.Include(i => i.Payments).Include(i => i.IdHistories).FirstOrDefaultAsync(i => i.Id == id);
            if (invoice == null) throw new KeyNotFoundException($"Invoice {id} not found.");

            if (string.IsNullOrWhiteSpace(dto.NewInvoiceNumber))
            {
                throw new InvalidOperationException("Invoice ID cannot be empty.");
            }

            var newId = dto.NewInvoiceNumber.Trim();
            if (newId.Equals(invoice.InvoiceNumber, StringComparison.OrdinalIgnoreCase))
            {
                return (await GetByIdAsync(id))!;
            }

            // System-wide uniqueness across active, deleted, credited, and historical IDs
            var inUse = await _db.Invoices.IgnoreQueryFilters().AnyAsync(i => i.InvoiceNumber == newId && i.Id != id) ||
                        await _db.InvoiceIdHistories.IgnoreQueryFilters().AnyAsync(h => h.OldInvoiceNumber == newId || h.NewInvoiceNumber == newId);

            if (inUse)
            {
                throw new InvalidOperationException($"Invoice ID '{newId}' is already in use by another invoice or historical ID. Please enter a unique ID.");
            }

            var isLocked = invoice.Status != "Draft" || invoice.PaidAmount > 0 || invoice.Payments.Any(p => !p.IsDeleted);

            if (isLocked)
            {
                if (!isAdmin)
                {
                    throw new UnauthorizedAccessException("Only an Administrator can edit the ID of an issued or paid invoice.");
                }

                if (string.IsNullOrWhiteSpace(dto.Reason))
                {
                    throw new InvalidOperationException("A mandatory reason is required to change an issued invoice ID.");
                }
            }

            var oldId = invoice.InvoiceNumber;

            // Record history entry
            _db.InvoiceIdHistories.Add(new InvoiceIdHistory
            {
                InvoiceId = invoice.Id,
                OldInvoiceNumber = oldId,
                NewInvoiceNumber = newId,
                ChangedBy = string.IsNullOrWhiteSpace(changedBy) ? "Admin" : changedBy,
                Reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Draft modification" : dto.Reason.Trim(),
                ChangedAt = DateTime.UtcNow
            });

            // Audit log
            _db.AuditLogs.Add(new AuditLog
            {
                Action = "UpdateInvoiceNumber",
                EntityName = "Invoice",
                EntityId = newId,
                Details = $"Invoice ID changed from '{oldId}' to '{newId}' by {changedBy}. Reason: {dto.Reason ?? "Draft update"}",
                Timestamp = DateTime.UtcNow
            });

            invoice.InvoiceNumber = newId;
            await _db.SaveChangesAsync();

            return (await GetByIdAsync(id))!;
        }

        public async Task<InvoiceResponseDto> UpdateInvoiceDateAsync(int id, UpdateInvoiceDateDto dto, string changedBy, bool isAdmin)
        {
            var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.Id == id);
            if (invoice == null) throw new KeyNotFoundException($"Invoice {id} not found.");

            if (!isAdmin)
            {
                throw new UnauthorizedAccessException("Only an Administrator can edit invoice date.");
            }

            if (invoice.Status != "Draft")
            {
                throw new InvalidOperationException("Invoice date can only be edited before the invoice is issued.");
            }

            var oldDate = invoice.IssuedAt;
            invoice.IssuedAt = dto.NewIssuedAt;

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "UpdateInvoiceDate",
                EntityName = "Invoice",
                EntityId = invoice.InvoiceNumber,
                Details = $"Invoice date changed from '{oldDate:yyyy-MM-dd HH:mm}' to '{dto.NewIssuedAt:yyyy-MM-dd HH:mm}' by {changedBy}. Reason: {dto.Reason ?? "Admin correction"}",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(id))!;
        }

        public async Task<PaymentResponseDto> RecordPaymentAsync(int invoiceId, RecordPaymentDto dto, string? receivedBy = null)
        {
            var invoice = await _db.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null) throw new KeyNotFoundException($"Invoice {invoiceId} not found.");

            if (dto.Amount > invoice.RemainingAmount)
            {
                throw new InvalidOperationException($"Payment amount ({dto.Amount:F2}) cannot exceed remaining invoice balance ({invoice.RemainingAmount:F2}).");
            }

            var payment = new InvoicePayment
            {
                InvoiceId = invoiceId,
                Amount = dto.Amount,
                PaymentMethod = dto.PaymentMethod,
                ReferenceNumber = dto.ReferenceNumber,
                PaidAt = DateTime.UtcNow,
                ReceivedByUserId = receivedBy ?? "Admin",
                Notes = dto.Notes
            };

            invoice.Payments.Add(payment);
            invoice.PaidAmount += dto.Amount;

            if (invoice.RemainingAmount <= 0)
            {
                invoice.Status = "Paid";
            }
            else
            {
                invoice.Status = "PartiallyPaid";
            }

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "RecordInvoicePayment",
                EntityName = "InvoicePayment",
                EntityId = invoice.InvoiceNumber,
                Details = $"Recorded payment of {dto.Amount:F2} L.E ({dto.PaymentMethod}) on Invoice {invoice.InvoiceNumber}.",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return new PaymentResponseDto
            {
                Id = payment.Id,
                Amount = payment.Amount,
                PaymentMethod = payment.PaymentMethod,
                ReferenceNumber = payment.ReferenceNumber,
                PaidAt = payment.PaidAt,
                ReceivedBy = payment.ReceivedByUserId,
                Notes = payment.Notes,
                TotalAmount = invoice.TotalAmount,
                PaidAmount = invoice.PaidAmount,
                RemainingAmount = invoice.RemainingAmount
            };
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.Id == id);
            if (invoice == null) return false;

            if (invoice.PaidAmount > 0)
            {
                throw new InvalidOperationException("Cannot delete an invoice that has recorded payments.");
            }

            _db.Invoices.Remove(invoice);
            await _db.SaveChangesAsync();
            return true;
        }

        private string GetLogoBase64()
        {
            try
            {
                if (_dataFolder != null)
                {
                    var customPath = Path.Combine(_dataFolder.RootPath, "Files", "Settings", "logo.png");
                    if (File.Exists(customPath))
                    {
                        var bytes = File.ReadAllBytes(customPath);
                        return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
                    }
                }

                var defaultPath = Path.Combine(@"D:\AutoFix\Assets\InvoiceTemplate", "logo.png");
                if (File.Exists(defaultPath))
                {
                    var bytes = File.ReadAllBytes(defaultPath);
                    return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
                }
            }
            catch { }
            return "";
        }

        private string GetWatermarkBase64()
        {
            try
            {
                if (_dataFolder != null)
                {
                    var customPath = Path.Combine(_dataFolder.RootPath, "Files", "Settings", "watermark.png");
                    if (File.Exists(customPath))
                    {
                        var bytes = File.ReadAllBytes(customPath);
                        return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
                    }
                }

                var defaultPath = Path.Combine(@"D:\AutoFix\Assets\InvoiceTemplate", "watermark.png");
                if (File.Exists(defaultPath))
                {
                    var bytes = File.ReadAllBytes(defaultPath);
                    return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
                }
            }
            catch { }
            return "";
        }

        private static string? _cairo400Base64;
        private static string? _cairo700Base64;

        private static string GetCairo400Base64()
        {
            if (_cairo400Base64 != null) return _cairo400Base64;
            var path = @"D:\AutoFix\Assets\Fonts\cairo-400.woff2";
            if (File.Exists(path))
            {
                _cairo400Base64 = Convert.ToBase64String(File.ReadAllBytes(path));
            }
            return _cairo400Base64 ?? "";
        }

        private static string GetCairo700Base64()
        {
            if (_cairo700Base64 != null) return _cairo700Base64;
            var path = @"D:\AutoFix\Assets\Fonts\cairo-700.woff2";
            if (File.Exists(path))
            {
                _cairo700Base64 = Convert.ToBase64String(File.ReadAllBytes(path));
            }
            return _cairo700Base64 ?? "";
        }

        public async Task<string> GeneratePrintedInvoiceHtmlAsync(int id)
        {
            return await GenerateWordTemplateInvoiceHtmlAsync(id, false);
        }

        public async Task<string> GenerateWordTemplateInvoiceHtmlAsync(int id, bool isCustomer = false)
        {
            var invoice = await BaseQuery().AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
            if (invoice == null) throw new KeyNotFoundException($"Invoice {id} not found.");

            // Extract all item lines (parts, labor, workmanship, manual lines) into a unified itemsList
            var itemsList = new List<(string Desc, decimal Qty, decimal Price, decimal Subtotal)>();

            if (!string.IsNullOrEmpty(invoice.SnapshotDetailsJson) && invoice.SnapshotDetailsJson != "[]")
            {
                try
                {
                    using var doc = JsonDocument.Parse(invoice.SnapshotDetailsJson);
                    foreach (var el in doc.RootElement.EnumerateArray())
                    {
                        var desc = el.TryGetProperty("Description", out var d) ? d.GetString() ?? "" : "";
                        var qty = el.TryGetProperty("Quantity", out var q) ? q.GetDecimal() : 1m;
                        var price = el.TryGetProperty("UnitPrice", out var p) ? p.GetDecimal() : 0m;
                        var sub = el.TryGetProperty("Subtotal", out var s) ? s.GetDecimal() : (qty * price);
                        itemsList.Add((desc, qty, price, sub));
                    }
                }
                catch { }
            }
            else if (invoice.WorkOrder != null)
            {
                foreach (var line in invoice.WorkOrder.Lines.Where(l => !l.IsDeleted))
                {
                    itemsList.Add((line.Description, line.Quantity, line.UnitPrice, line.Quantity * line.UnitPrice));
                }
            }

            // Fallback: If no snapshot lines and subtotal > 0
            if (itemsList.Count == 0 && invoice.Subtotal > 0)
            {
                itemsList.Add(("خدمات صيانة وإصلاح", 1m, invoice.Subtotal, invoice.Subtotal));
            }

            var settings = _settingsService != null ? await _settingsService.GetSettingsAsync() : new AutoFix.DTOs.Settings.WorkshopSettingsDto();

            var docTitle = (invoice.WorkOrder?.WorkType == "Inspection")
                ? "فحص سيارة شامل"
                : "فاتورة صيانة";

            var effectiveNotes = !string.IsNullOrWhiteSpace(invoice.WorkOrder?.Notes) ? invoice.WorkOrder.Notes : invoice.Notes;

            return BuildWordTemplateHtml(
                invoice.InvoiceNumber,
                invoice.IssuedAt,
                invoice.Car?.Make,
                invoice.Car != null ? $"{invoice.Car.Model} {invoice.Car.Year}".Trim() : null,
                invoice.Car?.LicensePlate,
                invoice.Customer?.FullName,
                invoice.Customer?.Phone,
                invoice.WorkOrder?.OdometerInKm,
                itemsList,
                effectiveNotes,
                invoice.Subtotal,
                invoice.DiscountAmount,
                invoice.VatPercentage,
                invoice.VatAmount,
                invoice.TotalAmount,
                invoice.PaidAmount,
                invoice.RemainingAmount,
                docTitle,
                isCustomer,
                settings.ShowVat,
                settings.PrintNotesOnInvoice,
                settings.DigitMode);
        }

        public async Task<string> GenerateWordTemplateInvoiceHtmlForWorkOrderAsync(int workOrderId, bool isCustomer = false)
        {
            var existingInvoice = await _db.Invoices.AsNoTracking().FirstOrDefaultAsync(i => i.WorkOrderId == workOrderId);
            if (existingInvoice != null)
            {
                return await GenerateWordTemplateInvoiceHtmlAsync(existingInvoice.Id, isCustomer);
            }

            var workOrder = await _db.WorkOrders
                .Include(w => w.Customer)
                .Include(w => w.Car)
                .Include(w => w.Lines)
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == workOrderId);

            if (workOrder == null) throw new KeyNotFoundException($"WorkOrder {workOrderId} not found.");

            // Extract all item lines into a unified itemsList
            var itemsList = new List<(string Desc, decimal Qty, decimal Price, decimal Subtotal)>();
            foreach (var line in workOrder.Lines.Where(l => !l.IsDeleted))
            {
                itemsList.Add((line.Description, line.Quantity, line.UnitPrice, line.Quantity * line.UnitPrice));
            }

            if (itemsList.Count == 0 && workOrder.TotalAmount > 0)
            {
                itemsList.Add(("خدمات صيانة وإصلاح", 1m, workOrder.TotalAmount, workOrder.TotalAmount));
            }

            var subtotal = itemsList.Sum(i => i.Subtotal);
            var settings = _settingsService != null ? await _settingsService.GetSettingsAsync() : new AutoFix.DTOs.Settings.WorkshopSettingsDto();

            var vatPercentage = settings.ShowVat ? 14m : 0m;
            var vatAmount = settings.ShowVat ? Math.Round(subtotal * (vatPercentage / 100m), 2) : 0m;
            var totalAmount = subtotal + vatAmount;

            var draftInvNumber = $"DRAFT-{workOrder.OrderNumber}";
            var docTitle = (workOrder.WorkType == "Inspection")
                ? "فحص سيارة شامل"
                : "فاتورة صيانة";

            return BuildWordTemplateHtml(
                draftInvNumber,
                workOrder.ReceivedAt,
                workOrder.Car?.Make,
                workOrder.Car != null ? $"{workOrder.Car.Model} {workOrder.Car.Year}".Trim() : null,
                workOrder.Car?.LicensePlate,
                workOrder.Customer?.FullName,
                workOrder.Customer?.Phone,
                workOrder.OdometerInKm,
                itemsList,
                workOrder.Notes,
                subtotal,
                0m,
                vatPercentage,
                vatAmount,
                totalAmount,
                0m,
                totalAmount,
                docTitle,
                isCustomer,
                settings.ShowVat,
                settings.PrintNotesOnInvoice,
                settings.DigitMode);
        }

        private string BuildWordTemplateHtml(
            string invoiceNumber,
            DateTime issuedAt,
            string? carMake,
            string? carModelAndYear,
            string? carPlateStr,
            string? customerName,
            string? customerPhone,
            int? odometerInKm,
            List<(string Desc, decimal Qty, decimal Price, decimal Subtotal)> itemsList,
            string? notesText,
            decimal subtotal,
            decimal discountAmount,
            decimal vatPercentage,
            decimal vatAmount,
            decimal totalAmount,
            decimal paidAmount,
            decimal remainingAmount,
            string docTitle,
            bool isCustomer = false,
            bool showVat = false,
            bool printNotes = false,
            string? digitMode = null)
        {
            var logoBase64 = GetLogoBase64();
            var watermarkBase64 = GetWatermarkBase64();

            string FormatDigits(string input)
            {
                if (string.IsNullOrEmpty(input)) return input;
                if (digitMode != "arabic-indic") return input;
                char[] arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                var sb = new StringBuilder(input.Length);
                foreach (var ch in input)
                {
                    if (ch >= '0' && ch <= '9')
                        sb.Append(arabicDigits[ch - '0']);
                    else
                        sb.Append(ch);
                }
                return sb.ToString();
            }

            string FmtMoney(decimal amount)
            {
                var isNeg = amount < 0;
                var absStr = Math.Abs(amount).ToString("N2", CultureInfo.InvariantCulture);
                var formatted = FormatDigits(absStr);
                return $"{(isNeg ? "-" : "")}{formatted} ج.م";
            }

            // Client & Car values
            string Val(string? v) => string.IsNullOrWhiteSpace(v) ? "______" : WebUtility.HtmlEncode(v.Trim());

            var carType = Val(carMake);
            var carModel = Val(carModelAndYear);
            var carPlate = Val(carPlateStr);
            var invoiceId = Val(invoiceNumber);

            var clientName = Val(customerName);
            var clientPhone = Val(customerPhone);
            var kmVal = odometerInKm.HasValue && odometerInKm.Value > 0
                ? FormatDigits(odometerInKm.Value.ToString("N0", CultureInfo.InvariantCulture))
                : "______";

            // Cairo system date dd/MM/yyyy
            var cairoDate = FormatDigits(issuedAt.AddHours(2).ToString("dd/MM/yyyy"));

            // Dynamic items rows (1 item = 1 row, 3 items = 3 rows, no empty placeholder rows)
            var rowsBuilder = new StringBuilder();
            for (int idx = 0; idx < itemsList.Count; idx++)
            {
                var item = itemsList[idx];
                rowsBuilder.Append($@"
                <tr>
                    <td style='text-align: center; font-weight: bold;'>{FormatDigits((idx + 1).ToString())}</td>
                    <td dir='auto' style='text-align: start; padding-inline: 8px;'>{WebUtility.HtmlEncode(item.Desc)}</td>
                    <td dir='ltr' style='text-align: center;'>{FormatDigits(item.Qty.ToString("0.##", CultureInfo.InvariantCulture))}</td>
                    <td dir='ltr' style='text-align: right; padding-inline: 8px;'>{FormatDigits(item.Price.ToString("N2", CultureInfo.InvariantCulture))}</td>
                    <td dir='ltr' style='text-align: right; padding-inline: 8px;'>{FormatDigits(item.Subtotal.ToString("N2", CultureInfo.InvariantCulture))}</td>
                </tr>");
            }

            if (itemsList.Count == 0)
            {
                rowsBuilder.Append(@"
                <tr>
                    <td colspan='5' style='text-align: center; color: #64748b; padding: 12px;'>لا توجد بنود مضافة / No items added</td>
                </tr>");
            }

            var hasNotes = !string.IsNullOrWhiteSpace(notesText);
            var showNotesBlock = hasNotes || printNotes;

            var html = $@"<!DOCTYPE html>
<html lang='ar' dir='rtl'>
<head>
    <meta charset='UTF-8'>
    <title>فاتورة - {invoiceNumber}</title>
    <style>
        @font-face {{
            font-family: 'Cairo';
            font-style: normal;
            font-weight: 400;
            src: url('data:font/woff2;base64,{GetCairo400Base64()}') format('woff2');
        }}
        @font-face {{
            font-family: 'Cairo';
            font-style: normal;
            font-weight: 700;
            src: url('data:font/woff2;base64,{GetCairo700Base64()}') format('woff2');
        }}
        @page {{
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
        }}
        @media print {{
            body {{
                background: #fff !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }}
            .no-print {{
                display: none !important;
            }}
            .page-watermark {{
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 440px !important;
                max-width: 80% !important;
                opacity: 0.10 !important;
                z-index: 0 !important;
                pointer-events: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }}
            .table-container table {{
                page-break-inside: auto;
            }}
            tr {{
                page-break-inside: avoid;
                page-break-after: auto;
            }}
            thead {{
                display: table-header-group;
            }}
            .items-table, .items-table td, .info-card, .totals-card, .notes-section {{
                background: transparent !important;
            }}
            .footer-page-num:after {{
                content: counter(page);
            }}
        }}
        * {{
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}
        body {{
            font-family: Cairo, 'Segoe UI', Tahoma, Arial, sans-serif;
            margin: 0;
            padding: 10px 15px;
            color: #0f172a;
            font-size: 13px;
            line-height: 1.4;
            background: #ffffff;
            position: relative;
        }}
        /* Watermark visible behind table text, repeated across pages */
        .page-watermark {{
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 440px;
            max-width: 80%;
            opacity: 0.10;
            z-index: 0;
            pointer-events: none;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}
        .content-wrap {{
            position: relative;
            z-index: 1;
        }}
        /* Action buttons bar */
        .actions-bar {{
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-bottom: 15px;
            padding: 8px 14px;
            background: #f1f5f9;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
        }}
        .btn {{
            border: none;
            padding: 8px 18px;
            border-radius: 5px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }}
        .btn-print {{ background: #2563eb; color: #ffffff; }}
        .btn-download {{ background: #059669; color: #ffffff; }}
        .btn:hover {{ opacity: 0.9; transform: translateY(-1px); }}

        /* Top Bar: Logo Left & Title Center */
        .top-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            position: relative;
        }}
        .logo-box {{
            flex: 0 0 160px;
            text-align: left;
        }}
        .logo-box img {{
            max-width: 150px;
            max-height: 70px;
            object-fit: contain;
        }}
        .center-title-box {{
            flex: 1;
            text-align: center;
            margin: 0 15px;
        }}
        .title-badge {{
            display: inline-block;
            border: 2px solid #000000;
            border-radius: 10px;
            padding: 6px 24px;
            font-size: 15px;
            font-weight: 800;
            color: #000000;
            background: rgba(255, 255, 255, 0.85);
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }}

        /* Two Header Boxes (semi-transparent to reveal watermark behind text) */
        .header-boxes-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 14px;
        }}
        .info-card {{
            border: 2px solid #000000;
            border-radius: 8px;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.65);
        }}
        .info-card-header {{
            border-bottom: 2px solid #000000;
            background: rgba(241, 245, 249, 0.85);
            font-weight: 800;
            font-size: 13.5px;
            text-align: center;
            padding: 4px 8px;
            color: #000000;
        }}
        .info-table {{
            width: 100%;
            border-collapse: collapse;
        }}
        .info-table td {{
            padding: 4px 8px;
            font-size: 12.5px;
            vertical-align: middle;
            border: none;
            background: transparent;
        }}
        .label-en {{
            text-align: left;
            font-weight: 700;
            color: #1e293b;
            width: 25%;
        }}
        .info-val {{
            text-align: center;
            font-weight: 600;
            color: #0f172a;
            width: 50%;
        }}
        .label-ar {{
            text-align: right;
            font-weight: 700;
            color: #1e293b;
            width: 25%;
        }}

        /* Dynamic Items Table (transparent body so watermark shines behind text) */
        .table-container {{
            margin-top: 10px;
            margin-bottom: 12px;
        }}
        .items-table {{
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000000;
            background: transparent;
        }}
        .items-table th {{
            background: rgba(241, 245, 249, 0.85);
            border: 1.5px solid #000000;
            padding: 6px 8px;
            font-size: 12.5px;
            font-weight: 800;
            text-align: center;
            color: #0f172a;
        }}
        .items-table td {{
            border: 1.5px solid #000000;
            padding: 5px 6px;
            font-size: 12px;
            color: #0f172a;
            background: transparent;
        }}

        /* Final Total & Notes Grid */
        .bottom-section {{
            display: grid;
            grid-template-columns: 1fr 340px;
            gap: 16px;
            margin-top: 10px;
            margin-bottom: 20px;
            align-items: start;
        }}

        /* Notes Box */
        .notes-section {{
            border: 1.5px solid #000000;
            border-radius: 6px;
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.65);
            min-height: 90px;
        }}
        .notes-header {{
            font-weight: 800;
            font-size: 13px;
            color: #0f172a;
            margin-bottom: 6px;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 4px;
        }}
        .notes-body {{
            font-size: 12.5px;
            color: #1e293b;
            word-break: break-word;
            white-space: pre-wrap;
            line-height: 1.6;
        }}

        /* Final Total Box under items table */
        .totals-card {{
            border: 2px solid #000000;
            border-radius: 6px;
            padding: 10px 14px;
            background: rgba(248, 250, 252, 0.75);
        }}
        .total-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3px 0;
            font-size: 12.5px;
        }}
        .grand-total {{
            border-top: 2px solid #000000;
            border-bottom: 2px solid #000000;
            margin: 6px 0;
            padding: 6px 0;
            font-size: 15px;
            font-weight: 800;
            color: #1e3a8a;
        }}
    </style>
    <script>
        function triggerPrint() {{
            const watermark = document.getElementById('invoice-watermark');
            if (watermark && !watermark.complete) {{
                watermark.onload = () => window.print();
            }} else {{
                window.print();
            }}
        }}
    </script>
</head>
<body>
    {(!string.IsNullOrEmpty(watermarkBase64) ? $"<img id='invoice-watermark' src='{watermarkBase64}' class='page-watermark' alt='Watermark' />" : "")}

    <div class='content-wrap'>
        <!-- Action Bar (Hidden in Print) -->
        <div class='actions-bar no-print'>
            <button class='btn btn-print' onclick='triggerPrint()'>طباعة الفاتورة / Print</button>
            <button class='btn btn-download' onclick='triggerPrint()'>تحميل PDF / Download PDF</button>
        </div>

        <!-- Top Header: Logo Left & Title Badge Center -->
        <div class='top-header'>
            <div class='logo-box'>
                {(!string.IsNullOrEmpty(logoBase64) ? $"<img src='{logoBase64}' alt='AP AUTO SERVICE CENTER' />" : "<div style='font-weight:900;font-size:16px;'>AP AUTO SERVICE CENTER</div>")}
            </div>
            <div class='center-title-box'>
                <div class='title-badge'>{docTitle}</div>
            </div>
            <div style='flex: 0 0 160px; text-align: right;'>
                <span style='font-size: 11px; color: #64748b; font-weight: bold;'>A4 Standard</span>
            </div>
        </div>

        <!-- Part 1: Two Header Boxes -->
        <div class='header-boxes-grid'>
            <!-- Left Box: Car Information -->
            <div class='info-card'>
                <div class='info-card-header'>بيانات السيارة - Car Information</div>
                <table class='info-table'>
                    <tr>
                        <td class='label-en'>Type</td>
                        <td class='info-val' dir='auto'>{carType}</td>
                        <td class='label-ar'>الطراز</td>
                    </tr>
                    <tr>
                        <td class='label-en'>Model</td>
                        <td class='info-val' dir='auto'>{carModel}</td>
                        <td class='label-ar'>الموديل</td>
                    </tr>
                    <tr>
                        <td class='label-en'>Plate No.</td>
                        <td class='info-val' dir='auto'>{carPlate}</td>
                        <td class='label-ar'>اللوحة</td>
                    </tr>
                    <tr>
                        <td class='label-en'>Invoice ID</td>
                        <td class='info-val' dir='ltr'><strong>{invoiceId}</strong></td>
                        <td class='label-ar'>رقم الفاتورة</td>
                    </tr>
                </table>
            </div>

            <!-- Right Box: Client Information -->
            <div class='info-card'>
                <div class='info-card-header'>بيانات العميل - Client Information</div>
                <table class='info-table'>
                    <tr>
                        <td class='label-en'>Name</td>
                        <td class='info-val' dir='auto'>{clientName}</td>
                        <td class='label-ar'>اسم العميل</td>
                    </tr>
                    <tr>
                        <td class='label-en'>Phone</td>
                        <td class='info-val' dir='ltr'>{clientPhone}</td>
                        <td class='label-ar'>موبايل العميل</td>
                    </tr>
                    <tr>
                        <td class='label-en'>KM.</td>
                        <td class='info-val' dir='ltr'>{kmVal}</td>
                        <td class='label-ar'>قراءة العداد</td>
                    </tr>
                    <tr>
                        <td class='label-en'>Date</td>
                        <td class='info-val' dir='ltr'>{cairoDate}</td>
                        <td class='label-ar'>التاريخ</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Part 2: Dynamic Items Table -->
        <div class='table-container'>
            <table class='items-table'>
                <thead>
                    <tr>
                        <th style='width: 35px;'>#</th>
                        <th>البيان / الخدمة / قطع الغيار (Description / Operation)</th>
                        <th style='width: 80px;'>الكمية (Qty)</th>
                        <th style='width: 110px;'>السعر (Price)</th>
                        <th style='width: 120px;'>الإجمالي (Total)</th>
                    </tr>
                </thead>
                <tbody>
                    {rowsBuilder}
                </tbody>
            </table>
        </div>

        <!-- Part 3: Bottom Section (Notes Box & Final Total Box) -->
        <div class='bottom-section'>
            {(showNotesBlock ? $@"
            <div class='notes-section'>
                <div class='notes-header'>ملاحظات / Notes</div>
                <div class='notes-body'>{(hasNotes ? WebUtility.HtmlEncode(notesText) : "<span style='display:inline-block; width:100%; border-bottom:1px solid #94a3b8; height:20px;'></span>")}</div>
            </div>" : "<div class='notes-section' style='visibility:hidden;'></div>")}

            <!-- Final Total Box: الإجمالي النهائي -->
            <div class='totals-card'>
                <div class='total-row'>
                    <span>المجموع الفرعي:</span>
                    <span dir='ltr'>{FmtMoney(subtotal)}</span>
                </div>
                {(discountAmount > 0 ? $@"
                <div class='total-row' style='color: #dc2626;'>
                    <span>الخصم:</span>
                    <span dir='ltr'>-{FmtMoney(discountAmount)}</span>
                </div>" : "")}
                {(showVat ? $@"
                {(discountAmount > 0 ? $@"
                <div class='total-row'>
                    <span>الوعاء الخاضع للضريبة:</span>
                    <span dir='ltr'>{FmtMoney(Math.Max(0, subtotal - discountAmount))}</span>
                </div>" : "")}
                <div class='total-row'>
                    <span>ضريبة القيمة المضافة ({FormatDigits(vatPercentage.ToString())}%):</span>
                    <span dir='ltr'>{FmtMoney(vatAmount)}</span>
                </div>" : "")}
                <div class='total-row grand-total'>
                    <span>الإجمالي النهائي:</span>
                    <span dir='ltr'>{FmtMoney(totalAmount)}</span>
                </div>
                {(paidAmount > 0 || remainingAmount < totalAmount ? $@"
                <div class='total-row' style='color: #059669; font-weight: 700; margin-top: 4px;'>
                    <span>المدفوع:</span>
                    <span dir='ltr'>{FmtMoney(paidAmount)}</span>
                </div>
                <div class='total-row' style='font-weight: 800; color: {(remainingAmount > 0 ? "#dc2626" : "#059669")};'>
                    <span>المتبقي:</span>
                    <span dir='ltr'>{FmtMoney(remainingAmount)}</span>
                </div>" : "")}
            </div>
        </div>
    </div>
</body>
</html>";

            return html;
        }

        public async Task<InvoiceResponseDto> CreditInvoiceAsync(int invoiceId, string reason, string? issuedBy = null)
        {
            var invoice = await _db.Invoices
                .Include(i => i.Payments)
                .Include(i => i.Customer)
                .Include(i => i.Car)
                .Include(i => i.WorkOrder)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);

            if (invoice == null) throw new KeyNotFoundException($"Invoice {invoiceId} not found.");

            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new InvalidOperationException("A valid mandatory reason is required to issue a credit note.");
            }

            if (invoice.Status == "Credited")
            {
                return (await GetByIdAsync(invoice.Id))!;
            }

            var creditNoteNumber = $"CN-{invoice.InvoiceNumber}";
            var previousPaidAmount = invoice.PaidAmount;

            invoice.Status = "Credited";
            invoice.Notes = (invoice.Notes ?? string.Empty) + $" [Credit Note: {creditNoteNumber}. Reason: {reason}]";

            if (invoice.WorkOrder != null)
            {
                invoice.WorkOrder.Status = "Credited";
            }

            if (previousPaidAmount > 0)
            {
                _db.InvoicePayments.Add(new InvoicePayment
                {
                    InvoiceId = invoice.Id,
                    Amount = -previousPaidAmount,
                    PaymentMethod = "Refund",
                    ReferenceNumber = creditNoteNumber,
                    Notes = $"Automatic refund for credited invoice {invoice.InvoiceNumber} (Credit Note: {creditNoteNumber})",
                    PaidAt = DateTime.UtcNow,
                    ReceivedByUserId = issuedBy ?? "Admin"
                });
                invoice.PaidAmount = 0;

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

            if (invoice.WorkOrder != null)
            {
                var issuedMovements = await _db.PartMovements
                    .Where(pm => pm.ReferenceNumber == invoice.WorkOrder.OrderNumber && pm.MovementType == "WorkOrderIssue")
                    .ToListAsync();

                var restoredCount = await _db.PartMovements
                    .CountAsync(pm => pm.ReferenceNumber == invoice.WorkOrder.OrderNumber && pm.MovementType == "WorkOrderRestore");

                if (issuedMovements.Count > 0 && restoredCount == 0)
                {
                    var defaultWh = await _db.Warehouses.FirstOrDefaultAsync();
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
                                WarehouseId = movement.WarehouseId > 0 ? movement.WarehouseId : (defaultWh?.Id ?? 1),
                                MovementType = "WorkOrderRestore",
                                QuantityChanged = restoreQty,
                                BalanceAfter = part.StockQuantity,
                                UnitCost = movement.UnitCost,
                                ReferenceNumber = invoice.WorkOrder.OrderNumber,
                                Notes = $"Stock restored upon credit note {creditNoteNumber} for WorkOrder {invoice.WorkOrder.OrderNumber}",
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }
            }

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "IssueCreditNote",
                EntityName = "Invoice",
                EntityId = invoice.InvoiceNumber,
                Details = $"Credit Note {creditNoteNumber} issued for Invoice {invoice.InvoiceNumber} (Total: {invoice.TotalAmount:F2} L.E). Refunded: {previousPaidAmount:F2} L.E. Reason: {reason}",
                Timestamp = DateTime.UtcNow,
                UserName = issuedBy ?? "Admin"
            });

            await _db.SaveChangesAsync();

            return (await GetByIdAsync(invoice.Id))!;
        }

        public async Task<List<CreditNoteResponseDto>> GetAllCreditNotesAsync(int? customerId = null)
        {
            var query = _db.Invoices
                .Include(i => i.Customer)
                .Include(i => i.Car)
                .Include(i => i.WorkOrder)
                .Include(i => i.Payments)
                .Where(i => i.Status == "Credited");

            if (customerId.HasValue && customerId.Value > 0)
            {
                query = query.Where(i => i.CustomerId == customerId.Value);
            }

            var creditedInvoices = await query.OrderByDescending(i => i.IssuedAt).ToListAsync();
            var result = new List<CreditNoteResponseDto>();

            foreach (var inv in creditedInvoices)
            {
                var cnNumber = $"CN-{inv.InvoiceNumber}";
                var reason = "Customer credit note issued";
                if (!string.IsNullOrEmpty(inv.Notes) && inv.Notes.Contains("Reason:"))
                {
                    var idx = inv.Notes.IndexOf("Reason:");
                    var endIdx = inv.Notes.IndexOf("]", idx);
                    if (endIdx > idx)
                    {
                        reason = inv.Notes.Substring(idx + 7, endIdx - (idx + 7)).Trim();
                    }
                    else
                    {
                        reason = inv.Notes.Substring(idx + 7).Trim();
                    }
                }

                var refundedAmount = Math.Abs(inv.Payments.Where(p => p.Amount < 0).Sum(p => p.Amount));
                var stockRestored = false;
                if (inv.WorkOrder != null)
                {
                    stockRestored = await _db.PartMovements.AnyAsync(pm => pm.ReferenceNumber == inv.WorkOrder.OrderNumber && pm.MovementType == "WorkOrderRestore");
                }

                var auditLog = await _db.AuditLogs
                    .Where(a => a.Action == "IssueCreditNote" && a.EntityId == inv.InvoiceNumber)
                    .OrderByDescending(a => a.Timestamp)
                    .FirstOrDefaultAsync();

                result.Add(new CreditNoteResponseDto
                {
                    Id = inv.Id,
                    CreditNoteNumber = cnNumber,
                    InvoiceId = inv.Id,
                    InvoiceNumber = inv.InvoiceNumber,
                    WorkOrderId = inv.WorkOrderId,
                    WorkOrderNumber = inv.WorkOrder?.OrderNumber,
                    CustomerId = inv.CustomerId,
                    CustomerName = inv.Customer?.FullName ?? string.Empty,
                    CustomerPhone = inv.Customer?.Phone ?? string.Empty,
                    CarPlate = inv.Car?.LicensePlate ?? string.Empty,
                    CarMakeModel = inv.Car != null ? $"{inv.Car.Make} {inv.Car.Model}" : string.Empty,
                    InvoiceTotal = inv.TotalAmount,
                    AmountRefunded = refundedAmount,
                    StockRestored = stockRestored,
                    Reason = reason,
                    IssuedBy = auditLog?.UserName ?? "Admin",
                    IssuedAt = auditLog?.Timestamp ?? inv.IssuedAt,
                    Notes = inv.Notes
                });
            }

            return result;
        }
    }
}
