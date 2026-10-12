using AutoFix.Data;
using AutoFix.DTOs.Inspection;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class InspectionService : IInspectionService
    {
        private readonly AppDbContext _db;
        private readonly IDataFolderService _dataFolder;

        public InspectionService(AppDbContext db, IDataFolderService dataFolder)
        {
            _db = db;
            _dataFolder = dataFolder;
        }

        private IQueryable<CarInspection> BaseQuery()
        {
            return _db.CarInspections
                .Include(ci => ci.Customer)
                .Include(ci => ci.Car)
                .Include(ci => ci.WorkOrder)
                .Include(ci => ci.Invoice)
                .Include(ci => ci.InspectedByMechanic);
        }

        private InspectionResponseDto MapToDto(CarInspection ci, List<CarInspection>? allRevisions = null)
        {
            var revisionsList = allRevisions != null
                ? allRevisions.OrderBy(r => r.RevisionNumber).Select(r => new InspectionRevisionSummaryDto
                {
                    Id = r.Id,
                    ReportNumber = r.ReportNumber,
                    RevisionNumber = r.RevisionNumber,
                    InspectedAt = r.InspectedAt,
                    Status = r.Status,
                    IsCurrentRevision = r.IsCurrentRevision
                }).ToList()
                : new List<InspectionRevisionSummaryDto>();

            return new InspectionResponseDto
            {
                Id = ci.Id,
                ReportNumber = ci.ReportNumber,
                CustomerId = ci.CustomerId,
                CustomerName = !string.IsNullOrWhiteSpace(ci.CustomerName) ? ci.CustomerName : (ci.Customer?.FullName ?? string.Empty),
                CustomerPhone = !string.IsNullOrWhiteSpace(ci.CustomerPhone) ? ci.CustomerPhone : (ci.Customer?.Phone ?? string.Empty),
                CarId = ci.CarId,
                CarPlate = !string.IsNullOrWhiteSpace(ci.CarPlate) ? ci.CarPlate : (ci.Car?.LicensePlate ?? string.Empty),
                CarChassis = !string.IsNullOrWhiteSpace(ci.CarChassis) ? ci.CarChassis : (ci.Car?.VIN ?? string.Empty),
                CarMake = !string.IsNullOrWhiteSpace(ci.CarMake) ? ci.CarMake : (ci.Car?.Make ?? string.Empty),
                CarModel = !string.IsNullOrWhiteSpace(ci.CarModel) ? ci.CarModel : (ci.Car?.Model ?? string.Empty),
                CarYear = ci.CarYear > 0 ? ci.CarYear : (ci.Car?.Year ?? 0),
                OdometerKm = ci.OdometerKm,
                WorkOrderId = ci.WorkOrderId,
                WorkOrderNumber = ci.WorkOrder?.OrderNumber,
                InvoiceId = ci.InvoiceId,
                InvoiceNumber = ci.InvoiceNumber ?? ci.Invoice?.InvoiceNumber,
                InvoiceAmount = ci.InvoiceAmount ?? ci.Invoice?.TotalAmount,
                Status = ci.Status,
                RevisionNumber = ci.RevisionNumber,
                PreviousRevisionId = ci.PreviousRevisionId,
                IsCurrentRevision = ci.IsCurrentRevision,
                FinalizedAt = ci.FinalizedAt,
                ChecklistDataJson = ci.ChecklistDataJson,
                DamageMarkersJson = ci.DamageMarkersJson,
                DiagnosticScanResult = ci.DiagnosticScanResult,
                PdfFilePath = ci.PdfFilePath,
                OverallScore = ci.OverallScore,
                GeneralVerdict = ci.GeneralVerdict,
                Notes = ci.Notes,
                InspectedAt = ci.InspectedAt,
                InspectedByMechanicId = ci.InspectedByMechanicId,
                InspectedByMechanicName = ci.InspectedByMechanic != null
                    ? $"{ci.InspectedByMechanic.FirstName} {ci.InspectedByMechanic.LastName}"
                    : null,
                Revisions = revisionsList
            };
        }

        public async Task<List<InspectionResponseDto>> GetAllAsync(int? customerId = null)
        {
            var query = BaseQuery().AsNoTracking();

            if (customerId.HasValue && customerId.Value > 0)
            {
                query = query.Where(ci => ci.CustomerId == customerId.Value);
            }

            var list = await query.OrderByDescending(ci => ci.InspectedAt).ToListAsync();
            return list.Select(ci => MapToDto(ci)).ToList();
        }

        public async Task<InspectionResponseDto?> GetByIdAsync(int id)
        {
            var inspection = await BaseQuery().AsNoTracking().FirstOrDefaultAsync(ci => ci.Id == id);
            if (inspection == null) return null;

            // Load related revisions with same root or report number prefix
            var rootNum = inspection.ReportNumber.Split("-R")[0];
            var revisions = await _db.CarInspections
                .AsNoTracking()
                .Where(r => r.ReportNumber.StartsWith(rootNum))
                .ToListAsync();

            return MapToDto(inspection, revisions);
        }

        public async Task<InspectionResponseDto> CreateAsync(CreateInspectionDto dto, int? mechanicId = null)
        {
            // Auto-fill car & customer details if IDs are provided
            var carMake = dto.CarMake;
            var carModel = dto.CarModel;
            var carPlate = dto.CarPlate;
            var carChassis = dto.CarChassis;
            var carYear = dto.CarYear;
            var odo = dto.OdometerKm;

            if (dto.CarId.HasValue && dto.CarId.Value > 0)
            {
                var car = await _db.Cars.FindAsync(dto.CarId.Value);
                if (car != null)
                {
                    if (string.IsNullOrWhiteSpace(carMake)) carMake = car.Make;
                    if (string.IsNullOrWhiteSpace(carModel)) carModel = car.Model;
                    if (string.IsNullOrWhiteSpace(carPlate)) carPlate = car.LicensePlate;
                    if (string.IsNullOrWhiteSpace(carChassis)) carChassis = car.VIN;
                    if (carYear <= 0) carYear = car.Year;
                    if (odo <= 0) odo = car.CurrentOdometerKm;
                }
            }

            var custName = dto.CustomerName;
            var custPhone = dto.CustomerPhone;
            if (dto.CustomerId.HasValue && dto.CustomerId.Value > 0)
            {
                var cust = await _db.Customers.FindAsync(dto.CustomerId.Value);
                if (cust != null)
                {
                    if (string.IsNullOrWhiteSpace(custName)) custName = cust.FullName;
                    if (string.IsNullOrWhiteSpace(custPhone)) custPhone = cust.Phone;
                }
            }

            var invNum = dto.InvoiceNumber;
            var invAmt = dto.InvoiceAmount;
            if (dto.InvoiceId.HasValue && dto.InvoiceId.Value > 0)
            {
                var inv = await _db.Invoices.FindAsync(dto.InvoiceId.Value);
                if (inv != null)
                {
                    if (string.IsNullOrWhiteSpace(invNum)) invNum = inv.InvoiceNumber;
                    if (!invAmt.HasValue) invAmt = inv.TotalAmount;
                }
            }

            var nextNum = $"INSP-{DateTime.UtcNow:yyyyMM}-{(await _db.CarInspections.CountAsync() + 1):D4}";

            var inspection = new CarInspection
            {
                ReportNumber = nextNum,
                CustomerId = dto.CustomerId,
                CustomerName = custName,
                CustomerPhone = custPhone,
                CarId = dto.CarId,
                CarPlate = carPlate,
                CarChassis = carChassis,
                CarMake = carMake,
                CarModel = carModel,
                CarYear = carYear,
                OdometerKm = odo,
                WorkOrderId = dto.WorkOrderId,
                InvoiceId = dto.InvoiceId,
                InvoiceNumber = invNum,
                InvoiceAmount = invAmt,
                Status = dto.Status == "Final" ? "Final" : "Draft",
                RevisionNumber = 1,
                IsCurrentRevision = true,
                FinalizedAt = dto.Status == "Final" ? DateTime.UtcNow : null,
                ChecklistDataJson = string.IsNullOrWhiteSpace(dto.ChecklistDataJson) ? "{}" : dto.ChecklistDataJson,
                DamageMarkersJson = string.IsNullOrWhiteSpace(dto.DamageMarkersJson) ? "[]" : dto.DamageMarkersJson,
                DiagnosticScanResult = dto.DiagnosticScanResult,
                OverallScore = dto.OverallScore,
                GeneralVerdict = dto.GeneralVerdict,
                Notes = dto.Notes,
                InspectedAt = dto.InspectedAt,
                InspectedByMechanicId = mechanicId
            };

            _db.CarInspections.Add(inspection);

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "CreateInspection",
                EntityName = "CarInspection",
                EntityId = nextNum,
                Details = $"Created car inspection {nextNum} for {custName} ({carPlate}). Status: {inspection.Status}.",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return (await GetByIdAsync(inspection.Id))!;
        }

        public async Task<InspectionResponseDto?> UpdateAsync(int id, UpdateInspectionDto dto)
        {
            var inspection = await _db.CarInspections.FindAsync(id);
            if (inspection == null) return null;

            if (inspection.Status == "Final")
            {
                throw new InvalidOperationException("Finalized inspection reports are locked. Use the Revise action to create a new revision.");
            }

            inspection.CustomerId = dto.CustomerId;
            inspection.CustomerName = dto.CustomerName;
            inspection.CustomerPhone = dto.CustomerPhone;
            inspection.CarId = dto.CarId;
            inspection.CarPlate = dto.CarPlate;
            inspection.CarChassis = dto.CarChassis;
            inspection.CarMake = dto.CarMake;
            inspection.CarModel = dto.CarModel;
            inspection.CarYear = dto.CarYear;
            inspection.OdometerKm = dto.OdometerKm;
            inspection.WorkOrderId = dto.WorkOrderId;
            inspection.InvoiceId = dto.InvoiceId;
            inspection.InvoiceNumber = dto.InvoiceNumber;
            inspection.InvoiceAmount = dto.InvoiceAmount;
            inspection.ChecklistDataJson = dto.ChecklistDataJson;
            inspection.DamageMarkersJson = dto.DamageMarkersJson;
            inspection.DiagnosticScanResult = dto.DiagnosticScanResult;
            inspection.Notes = dto.Notes;
            inspection.GeneralVerdict = dto.GeneralVerdict;
            inspection.OverallScore = dto.OverallScore;
            inspection.InspectedAt = dto.InspectedAt;

            if (dto.Status == "Final")
            {
                inspection.Status = "Final";
                inspection.FinalizedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(id))!;
        }

        public async Task<InspectionResponseDto> ReviseAsync(int id, UpdateInspectionDto dto)
        {
            var original = await _db.CarInspections.FindAsync(id);
            if (original == null) throw new KeyNotFoundException($"Inspection {id} not found.");

            // Mark old revision as not current
            original.IsCurrentRevision = false;

            var baseReportNum = original.ReportNumber.Split("-R")[0];
            var nextRevNum = original.RevisionNumber + 1;
            var newReportNum = $"{baseReportNum}-R{nextRevNum}";

            var newRevision = new CarInspection
            {
                ReportNumber = newReportNum,
                CustomerId = dto.CustomerId ?? original.CustomerId,
                CustomerName = !string.IsNullOrWhiteSpace(dto.CustomerName) ? dto.CustomerName : original.CustomerName,
                CustomerPhone = !string.IsNullOrWhiteSpace(dto.CustomerPhone) ? dto.CustomerPhone : original.CustomerPhone,
                CarId = dto.CarId ?? original.CarId,
                CarPlate = !string.IsNullOrWhiteSpace(dto.CarPlate) ? dto.CarPlate : original.CarPlate,
                CarChassis = !string.IsNullOrWhiteSpace(dto.CarChassis) ? dto.CarChassis : original.CarChassis,
                CarMake = !string.IsNullOrWhiteSpace(dto.CarMake) ? dto.CarMake : original.CarMake,
                CarModel = !string.IsNullOrWhiteSpace(dto.CarModel) ? dto.CarModel : original.CarModel,
                CarYear = dto.CarYear > 0 ? dto.CarYear : original.CarYear,
                OdometerKm = dto.OdometerKm > 0 ? dto.OdometerKm : original.OdometerKm,
                WorkOrderId = dto.WorkOrderId ?? original.WorkOrderId,
                InvoiceId = dto.InvoiceId ?? original.InvoiceId,
                InvoiceNumber = dto.InvoiceNumber ?? original.InvoiceNumber,
                InvoiceAmount = dto.InvoiceAmount ?? original.InvoiceAmount,
                Status = "Draft",
                RevisionNumber = nextRevNum,
                PreviousRevisionId = original.Id,
                IsCurrentRevision = true,
                ChecklistDataJson = !string.IsNullOrWhiteSpace(dto.ChecklistDataJson) ? dto.ChecklistDataJson : original.ChecklistDataJson,
                DamageMarkersJson = !string.IsNullOrWhiteSpace(dto.DamageMarkersJson) ? dto.DamageMarkersJson : original.DamageMarkersJson,
                DiagnosticScanResult = dto.DiagnosticScanResult ?? original.DiagnosticScanResult,
                Notes = dto.Notes ?? original.Notes,
                GeneralVerdict = dto.GeneralVerdict ?? original.GeneralVerdict,
                OverallScore = dto.OverallScore,
                InspectedAt = DateTime.UtcNow,
                InspectedByMechanicId = original.InspectedByMechanicId
            };

            _db.CarInspections.Add(newRevision);

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "ReviseInspection",
                EntityName = "CarInspection",
                EntityId = newReportNum,
                Details = $"Created revision {newReportNum} from previous revision ID {original.Id} ({original.ReportNumber}).",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(newRevision.Id))!;
        }

        public async Task<InspectionResponseDto> FinalizeAsync(int id)
        {
            var inspection = await _db.CarInspections.FindAsync(id);
            if (inspection == null) throw new KeyNotFoundException($"Inspection {id} not found.");

            inspection.Status = "Final";
            inspection.FinalizedAt = DateTime.UtcNow;

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "FinalizeInspection",
                EntityName = "CarInspection",
                EntityId = inspection.ReportNumber,
                Details = $"Finalized inspection {inspection.ReportNumber}. Report locked from further direct edits.",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return (await GetByIdAsync(id))!;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var inspection = await _db.CarInspections.FindAsync(id);
            if (inspection == null) return false;

            _db.CarInspections.Remove(inspection);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<string> GenerateHtmlPrintReportAsync(int id, bool showInvoiceTotal = false)
        {
            var inspection = await GetByIdAsync(id);
            if (inspection == null) throw new KeyNotFoundException($"Inspection {id} not found.");

            return BuildInspectionHtml(inspection, isBlank: false, showInvoiceTotal: showInvoiceTotal);
        }

        public Task<string> GenerateBlankFormHtmlAsync(bool showInvoiceTotal = false)
        {
            var empty = new InspectionResponseDto
            {
                ReportNumber = "______",
                CarMake = "",
                CarModel = "",
                CarPlate = "",
                CarChassis = "",
                CustomerName = "",
                CustomerPhone = "",
                OdometerKm = 0,
                InvoiceNumber = "______",
                InvoiceAmount = 0,
                ChecklistDataJson = "{}",
                DamageMarkersJson = "[]",
                InspectedAt = DateTime.UtcNow
            };
            return Task.FromResult(BuildInspectionHtml(empty, isBlank: true, showInvoiceTotal: showInvoiceTotal));
        }

        public async Task<byte[]> GenerateOrGetPdfAsync(int id)
        {
            var inspection = await _db.CarInspections.FindAsync(id);
            if (inspection == null) throw new KeyNotFoundException($"Inspection {id} not found.");

            var inspFolder = Path.Combine(_dataFolder.RootPath, "Files", "Inspections");
            Directory.CreateDirectory(inspFolder);

            var pdfFileName = $"{inspection.ReportNumber}.html";
            var filePath = Path.Combine(inspFolder, pdfFileName);

            // Generate full printable document
            var html = await GenerateHtmlPrintReportAsync(id);
            await File.WriteAllTextAsync(filePath, html, Encoding.UTF8);

            inspection.PdfFilePath = Path.Combine("Files", "Inspections", pdfFileName);
            await _db.SaveChangesAsync();

            return Encoding.UTF8.GetBytes(html);
        }

        public async Task<string> GetWhatsAppShareUrlAsync(int id, string? customNotes = null)
        {
            var inspection = await GetByIdAsync(id);
            if (inspection == null) throw new KeyNotFoundException($"Inspection {id} not found.");

            // Format phone to Egyptian international format +20
            var rawPhone = new string((inspection.CustomerPhone ?? "").Where(char.IsDigit).ToArray());
            if (rawPhone.StartsWith("0"))
            {
                rawPhone = "2" + rawPhone; // e.g. 01012345678 -> 201012345678
            }
            else if (!rawPhone.StartsWith("20"))
            {
                rawPhone = "20" + rawPhone;
            }

            var verdictAr = inspection.GeneralVerdict switch
            {
                "Excellent" => "ممتاز",
                "Good" => "جيد",
                "Fair" => "مقبول",
                "Poor" => "يحتاج صيانة",
                "Reject" => "غير صالح",
                _ => inspection.GeneralVerdict
            };

            var msgBuilder = new StringBuilder();
            msgBuilder.AppendLine($"مرحباً {inspection.CustomerName}،");
            msgBuilder.AppendLine($"يسر مركز AutoFix أن يشارككم تقرير الفحص الشامل للسيارة ({inspection.CarMake} {inspection.CarModel} - اللوحة: {inspection.CarPlate}).");
            msgBuilder.AppendLine($"📋 رقم التقرير: {inspection.ReportNumber}");
            msgBuilder.AppendLine($"⭐ التقييم العام: {inspection.OverallScore:F0}% ({verdictAr})");
            if (!string.IsNullOrWhiteSpace(customNotes))
            {
                msgBuilder.AppendLine($"📝 ملاحظات: {customNotes}");
            }
            msgBuilder.AppendLine("شكراً لثقتكم بمركزنا!");

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "WhatsAppInspectionShare",
                EntityName = "CarInspection",
                EntityId = inspection.ReportNumber,
                Details = $"Generated WhatsApp share link for {rawPhone} ({inspection.CustomerName}).",
                Timestamp = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            var encodedMsg = WebUtility.UrlEncode(msgBuilder.ToString());
            return $"https://wa.me/{rawPhone}?text={encodedMsg}";
        }

        // ======================================================================
        // 3-PAGE A4 EXACT PRINT LAYOUT BUILDER
        // ======================================================================
        private static string GetAssetBase64(string fileName)
        {
            try
            {
                var primaryPath = Path.Combine(@"D:\AutoFix\Assets\InspectionReport", fileName);
                if (File.Exists(primaryPath))
                {
                    var bytes = File.ReadAllBytes(primaryPath);
                    return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
                }
            }
            catch { }
            return "";
        }

        private static string BuildInspectionHtml(InspectionResponseDto insp, bool isBlank, bool showInvoiceTotal = false)
        {
            Dictionary<string, JsonElement> checklist = new(StringComparer.OrdinalIgnoreCase);
            if (!isBlank && !string.IsNullOrWhiteSpace(insp.ChecklistDataJson))
            {
                try
                {
                    checklist = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(insp.ChecklistDataJson) ?? new(StringComparer.OrdinalIgnoreCase);
                }
                catch { }
            }

            string Val(string primaryKey, params string[] fallbackKeys)
            {
                if (isBlank) return "______";
                var keys = new List<string> { primaryKey };
                if (fallbackKeys != null && fallbackKeys.Length > 0) keys.AddRange(fallbackKeys);

                foreach (var k in keys)
                {
                    if (checklist.TryGetValue(k, out var el))
                    {
                        if (el.ValueKind == JsonValueKind.String)
                        {
                            var s = el.GetString();
                            if (!string.IsNullOrWhiteSpace(s)) return WebUtility.HtmlEncode(s);
                        }
                        else if (el.ValueKind == JsonValueKind.Object)
                        {
                            if (el.TryGetProperty("val", out var v) && v.ValueKind == JsonValueKind.String)
                            {
                                var s = v.GetString();
                                if (!string.IsNullOrWhiteSpace(s)) return WebUtility.HtmlEncode(s);
                            }
                            if (el.TryGetProperty("status", out var st) && st.ValueKind == JsonValueKind.String)
                            {
                                var s = st.GetString();
                                if (!string.IsNullOrWhiteSpace(s)) return WebUtility.HtmlEncode(s);
                            }
                        }
                    }
                }
                return "______";
            }

            string Underline(string? text)
            {
                if (isBlank) return "______";
                return string.IsNullOrWhiteSpace(text) ? "______" : WebUtility.HtmlEncode(text);
            }

            var carTypeRaw = !string.IsNullOrWhiteSpace(insp.CarMake) ? $"{insp.CarMake} {insp.CarModel}".Trim() : "";
            var carType = !string.IsNullOrWhiteSpace(carTypeRaw) ? Underline(carTypeRaw) : Val("Car_Type");
            var carModel = isBlank ? "______" : (insp.CarYear > 0 ? insp.CarYear.ToString() : Val("Car_Model"));
            var plate = !string.IsNullOrWhiteSpace(insp.CarPlate) ? Underline(insp.CarPlate) : Val("Plate_No");
            var vin = !string.IsNullOrWhiteSpace(insp.CarChassis) ? Underline(insp.CarChassis) : Val("VIN_No");

            var clientName = !string.IsNullOrWhiteSpace(insp.CustomerName) ? Underline(insp.CustomerName) : Val("Client_Name");
            var clientPhone = !string.IsNullOrWhiteSpace(insp.CustomerPhone) ? Underline(insp.CustomerPhone) : Val("Client_Phone");
            var km = isBlank ? "______" : (insp.OdometerKm > 0 ? insp.OdometerKm.ToString("N0") : Val("KM_Reading"));

            var invNo = isBlank ? "______" : (!string.IsNullOrWhiteSpace(insp.InvoiceNumber) ? Underline(insp.InvoiceNumber) : Val("Invoice_No"));
            var invAmt = (insp.InvoiceAmount.HasValue && insp.InvoiceAmount.Value > 0) ? $"{insp.InvoiceAmount.Value:N2} L.E" : "0.00 L.E";
            var dateStr = isBlank ? "______" : (insp.InspectedAt != default ? insp.InspectedAt.ToString("dd/MM/yyyy") : Val("Current_Date"));

            var invDisplay = showInvoiceTotal ? $"Invoice Total: {invAmt}" : $"Invoice NO: {invNo}";

            string RepeatedHeader() => $@"
            <div class=""report-header"">
                <div class=""header-box left-box"">
                    <div class=""box-title"">Car Information - بيانات السيارة</div>
                    <div class=""box-content"">
                        <div class=""row""><span class=""lbl"">Type / الطراز:</span> <span class=""val"">{carType}</span></div>
                        <div class=""row""><span class=""lbl"">Model / الموديل:</span> <span class=""val"">{carModel}</span></div>
                        <div class=""row""><span class=""lbl"">Plate No. / اللوحة:</span> <span class=""val"">{plate}</span></div>
                        <div class=""row""><span class=""lbl"">VIN No. / الشاسية:</span> <span class=""val"">{vin}</span></div>
                    </div>
                </div>
                <div class=""header-box right-box"">
                    <div class=""box-title"">Client Information - بيانات العميل</div>
                    <div class=""box-content"">
                        <div class=""row""><span class=""lbl"">Name / اسم العميل:</span> <span class=""val"">{clientName}</span></div>
                        <div class=""row""><span class=""lbl"">Phone / موبايل العميل:</span> <span class=""val"">{clientPhone}</span></div>
                        <div class=""row""><span class=""lbl"">KM. / قراءة العداد:</span> <span class=""val"">{km}</span></div>
                        <div class=""row invoice-subrow"">
                            <span>{invDisplay}</span>
                            <span>{dateStr}</span>
                            <span>Date</span>
                        </div>
                    </div>
                </div>
            </div>";

            string Row(string en, string ar, string key, params string[] fallbacks) => $@"
                <tr>
                    <td class=""lbl-cell""><span class=""en"">{en}</span><span class=""ar"">{ar}</span></td>
                    <td class=""val-cell"">{Val(key, fallbacks)}</td>
                </tr>";

            string Row4(string en1, string ar1, string k1, string[] fb1, string en2, string ar2, string k2, string[] fb2) => $@"
                <tr>
                    <td class=""lbl-cell""><span class=""en"">{en1}</span><span class=""ar"">{ar1}</span></td>
                    <td class=""val-cell"">{Val(k1, fb1)}</td>
                    <td class=""lbl-cell""><span class=""en"">{en2}</span><span class=""ar"">{ar2}</span></td>
                    <td class=""val-cell"">{Val(k2, fb2)}</td>
                </tr>";

            var logoBase64 = GetAssetBase64("logo.png");
            var iconsBase64 = GetAssetBase64("icons.png");
            var diagramBase64 = GetAssetBase64("car-diagram.png");

            var isDraft = !isBlank && (string.Equals(insp.Status, "Draft", StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(insp.Status));
            var watermarkHtml = isDraft ? @"<div class=""watermark"">DRAFT - مسودة</div>" : "";
            var statusBadgeText = isBlank ? "BLANK FORM - نموذج فارغ" : (isDraft ? "DRAFT - مسودة" : "FINAL - معتمد");
            var statusBadgeClass = isBlank ? "badge-blank" : (isDraft ? "badge-draft" : "badge-final");

            return $@"<!DOCTYPE html>
<html lang=""ar"" dir=""rtl"">
<head>
    <meta charset=""UTF-8"">
    <title>Comprehensive Car Inspection - {insp.ReportNumber}</title>
    <style>
        @page {{
            size: A4 portrait;
            margin: 0;
        }}
        * {{
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        body {{
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #ffffff;
            color: #000000;
            font-size: 10px;
            line-height: 1.15;
        }}
        .a4-page {{
            width: 210mm;
            height: 297mm;
            max-height: 297mm;
            padding: 7mm 9mm 7mm 9mm;
            margin: 0 auto;
            position: relative;
            background: #ffffff;
            page-break-after: always;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
        }}
        .watermark {{
            position: absolute;
            top: 48%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 70px;
            font-weight: 900;
            color: rgba(220, 38, 38, 0.12);
            text-transform: uppercase;
            letter-spacing: 8px;
            pointer-events: none;
            z-index: 999;
            white-space: nowrap;
            border: 6px dashed rgba(220, 38, 38, 0.18);
            padding: 12px 48px;
            border-radius: 18px;
        }}
        .page-footer {{
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            padding-top: 3px;
            border-top: 1.5px solid #000000;
            margin-top: 2px;
        }}
        .report-header {{
            display: flex;
            justify-content: space-between;
            gap: 6mm;
            margin-bottom: 2.5mm;
        }}
        .header-box {{
            flex: 1;
            border: 2px solid #000000;
            border-radius: 6px;
            overflow: hidden;
            background: #ffffff;
        }}
        .box-title {{
            background: #d9d9d9;
            font-weight: bold;
            font-size: 10.5px;
            text-align: center;
            padding: 3px 5px;
            border-bottom: 1.5px solid #000000;
        }}
        .box-content {{
            padding: 4px 7px;
            font-size: 10px;
        }}
        .box-content .row {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 2.5px;
        }}
        .invoice-subrow {{
            border-top: 1px solid #777;
            padding-top: 3px;
            margin-top: 3px;
            font-size: 9.5px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
        }}

        /* Page 1 Specific */
        .page-1-body {{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            gap: 16mm;
            margin: 8mm 0;
        }}
        .logo-wrap {{
            text-align: center;
            padding: 8px;
        }}
        .workshop-logo-large {{
            max-width: 320px;
            max-height: 140px;
            object-fit: contain;
        }}
        .title-box-rounded {{
            border: 3px solid #000000;
            background: #d9d9d9;
            border-radius: 12px;
            padding: 16px 40px;
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            box-shadow: 2px 2px 0px #000;
            line-height: 1.35;
        }}
        .meta-card {{
            text-align: center;
            border: 2px solid #000000;
            border-radius: 8px;
            padding: 12px 32px;
            background: #ffffff;
            font-size: 13px;
            font-weight: bold;
            display: flex;
            flex-direction: column;
            gap: 6px;
            align-items: center;
        }}
        .badge-status {{
            display: inline-block;
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .badge-draft {{
            background: #fef2f2;
            color: #991b1b;
            border: 1.5px solid #dc2626;
        }}
        .badge-final {{
            background: #ecfdf5;
            color: #065f46;
            border: 1.5px solid #059669;
        }}
        .badge-blank {{
            background: #f3f4f6;
            color: #374151;
            border: 1.5px solid #6b7280;
        }}
        .score-card {{
            text-align: center;
            border: 2px solid #000000;
            border-radius: 8px;
            padding: 10px 28px;
            background: #fafafa;
        }}
        .score-title {{
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 4px;
        }}
        .score-val {{
            font-size: 28px;
            font-weight: 900;
            color: #111827;
        }}
        .score-verdict {{
            font-size: 12px;
            font-weight: bold;
            color: #374151;
        }}

        /* Tables & Columns */
        table.check-table {{
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000000;
            margin-bottom: 2mm;
            font-size: 9px;
        }}
        table.check-table th, table.check-table td {{
            border: 1px solid #000000;
            padding: 2px 4px;
            height: 18px;
        }}
        .table-head {{
            background: #d9d9d9;
            font-weight: bold;
            text-align: center;
            border-bottom: 1.5px solid #000000 !important;
            font-size: 9.5px;
            line-height: 1.2;
            padding: 2.5px 3px;
        }}
        .lbl-cell {{
            background: #d9d9d9;
            font-weight: bold;
            width: 65%;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .lbl-cell .ar {{ direction: rtl; text-align: right; }}
        .lbl-cell .en {{ direction: ltr; text-align: left; font-size: 8.5px; color: #111; }}
        .val-cell {{
            background: #ffffff;
            text-align: center;
            font-weight: bold;
            font-size: 9px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        .three-columns {{
            display: flex;
            gap: 3mm;
            align-items: flex-start;
        }}
        .col {{
            flex: 1;
            display: flex;
            flex-direction: column;
        }}
        .icons-strip-wrap {{
            text-align: center;
            border: 1.5px solid #000000;
            border-radius: 5px;
            padding: 2px;
            margin: 1.5mm 0;
            background: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
        }}
        .icons-strip-img {{
            max-width: 100%;
            height: 38px;
            object-fit: contain;
            display: block;
            margin: 0 auto;
        }}
        .icons-strip-fallback {{
            display: flex;
            justify-content: space-around;
            width: 100%;
            font-size: 9px;
            font-weight: bold;
            padding: 4px;
        }}
        .two-tables-row {{
            display: flex;
            gap: 3mm;
        }}
        .diagram-container {{
            text-align: center;
            border: 1.5px solid #000000;
            border-radius: 5px;
            padding: 2px;
            margin: 1.5mm 0;
            background: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
        }}
        .diagram-img {{
            max-width: 100%;
            height: 110px;
            object-fit: contain;
            display: block;
            margin: 0 auto;
        }}
        .bottom-notes-box {{
            border: 1.5px solid #000000;
            border-radius: 5px;
            padding: 4px 6px;
            margin-top: 1.5mm;
            background: #ffffff;
            font-size: 9.5px;
        }}
        .notes-row {{
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #ccc;
            padding: 2px 0;
        }}
        .notes-row:last-child {{
            border-bottom: none;
        }}
        .notes-lbl {{
            font-weight: bold;
        }}
        .notes-val {{
            font-weight: bold;
            color: #111;
        }}
        .signatures-row {{
            display: flex;
            justify-content: space-between;
            gap: 6mm;
            margin-top: 2mm;
            border: 1.5px solid #000000;
            border-radius: 5px;
            padding: 4px 8px;
            background: #ffffff;
        }}
        .sig-box {{
            flex: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5px;
        }}
        .sig-lbl {{
            font-weight: bold;
        }}
        .sig-val {{
            font-weight: bold;
            color: #111;
        }}
    </style>
</head>
<body>

    <!-- ==================== PAGE 1 ==================== -->
    <div class=""a4-page page-1"">
        {watermarkHtml}
        {RepeatedHeader()}
        <div class=""page-1-body"">
            <div class=""logo-wrap"">
                {(string.IsNullOrEmpty(logoBase64) ? @"
                <svg class=""workshop-logo-large"" viewBox=""0 0 400 120"">
                    <rect width=""400"" height=""120"" fill=""#ffffff"" rx=""10""/>
                    <text x=""200"" y=""70"" font-size=""34"" font-weight=""bold"" fill=""#000000"" text-anchor=""middle"">AUTOFIX WORKSHOP</text>
                </svg>" : $@"<img src=""{logoBase64}"" class=""workshop-logo-large"" alt=""AutoFix Workshop Logo"" />")}
            </div>

            <div class=""title-box-rounded"">
                Comprehensive Car Inspection<br>فحص سيارة شامل
            </div>

            <div class=""meta-card"">
                <div>Report No: {Underline(insp.ReportNumber)}</div>
                <div>Date: {dateStr}</div>
                <div class=""badge-status {statusBadgeClass}"">{statusBadgeText}</div>
            </div>

            {(!isBlank && insp.OverallScore > 0 ? $@"
            <div class=""score-card"">
                <div class=""score-title"">Overall Vehicle Rating - التقييم العام للسيارة</div>
                <div class=""score-val"">{insp.OverallScore:F0}%</div>
                <div class=""score-verdict"">{WebUtility.HtmlEncode(insp.GeneralVerdict ?? "Good")}</div>
            </div>" : "")}
        </div>
        <div class=""page-footer"">Page 1 of 3</div>
    </div>

    <!-- ==================== PAGE 2 ==================== -->
    <div class=""a4-page page-2"">
        {watermarkHtml}
        {RepeatedHeader()}

        <div class=""three-columns"">
            <!-- Left Column -->
            <div class=""col"">
                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">كهرباء المحرك<br>Engine Electrical System</th></tr></thead>
                    <tbody>
                        {Row("Car Battery", "بطارية السيارة", "Check_Battery", "battery")}
                        {Row("Alternator Charging", "شحن الدينامو", "Check_Alternator", "alternator")}
                        {Row("Starter Motor Sound", "صوت المارش", "Check_Starter", "starter")}
                    </tbody>
                </table>

                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">مكيف السيارة<br>Car Air Conditioner</th></tr></thead>
                    <tbody>
                        {Row("Cooling Level", "مستوى التبريد", "Check_CoolingLevel", "ac_cooling")}
                        {Row("Air Distribution", "توزيع الهواء", "Check_AirDist", "ac_distribution")}
                        {Row("Heating System", "نظام التدفئة", "Check_Heating", "ac_heating")}
                    </tbody>
                </table>

                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">السيارة من الداخل<br>Interior of the Car</th></tr></thead>
                    <tbody>
                        {Row("Dashboard", "لوحة القيادة - التابلوه", "Check_Dashboard", "int_dashboard")}
                        {Row("Seat Upholstery", "فرش المقاعد", "Check_Seats", "int_seats")}
                        {Row("Roof Lining and Pillars", "فرش السقف والقوائم", "Check_RoofLining", "int_roof")}
                        {Row("Handles", "المقابض", "Check_Handles", "int_handles")}
                        {Row("Interior Buttons", "أزرار التحكم", "Check_Buttons", "int_buttons")}
                        {Row("Entertainment", "نظام الترفيه", "Check_Entertainment", "int_screen")}
                        {Row("Steering and Gear", "الدركسيون والفتيس", "Check_SteeringGear_Interior", "int_steering_gear")}
                    </tbody>
                </table>
            </div>

            <!-- Middle Column -->
            <div class=""col"">
                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">اختبار القيادة<br>Driving Test</th></tr></thead>
                    <tbody>
                        {Row("Engine Condition", "حالة المحرك", "Drive_Engine", "drive_engine")}
                        {Row("Gear Condition", "حالة الفتيس", "Drive_Gear", "drive_gear")}
                        {Row("Wheel Bearing", "رولمان بلي العجل", "Drive_WheelBearing", "drive_bearing")}
                        {Row("Front Suspension", "العفشة الأمامية", "Drive_FrontSusp", "drive_front_susp")}
                        {Row("Rear Suspension", "العفشة الخلفية", "Drive_RearSusp", "drive_rear_susp")}
                        {Row("Steering Gearbox", "علبة الدركسيون", "Drive_SteeringBox", "drive_steering_box")}
                        {Row("Steering Wheel", "طارة الدركسيون", "Drive_SteeringWheel", "drive_steering_wheel")}
                        {Row("Noise While Steering", "أصوات عند التوجيه", "Drive_SteeringNoise", "drive_steering_noise")}
                        {Row("Drive Shaft", "عمود الكردان / الكبالن", "Drive_Shaft", "drive_shaft")}
                        {Row("Brake Condition", "حالة الفرامل", "Drive_Brakes", "drive_brakes")}
                        {Row("Abnormal Vibrations", "اهتزازات غير طبيعية", "Drive_Vibrations", "drive_vibrations")}
                    </tbody>
                </table>
            </div>

            <!-- Right Column -->
            <div class=""col"">
                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">بنود الصيانة<br>Service Items</th></tr></thead>
                    <tbody>
                        {Row("Engine Oil", "زيت المحرك", "Svc_EngineOil", "serv_engine_oil")}
                        {Row("Gear Oil", "زيت الفتيس", "Svc_GearOil", "serv_gear_oil")}
                        {Row("Brake Fluid", "زيت الفرامل", "Svc_BrakeFluid", "serv_brake_fluid")}
                        {Row("Air Filter", "فلتر الهواء", "Svc_AirFilter", "serv_air_filter")}
                        {Row("AC Filter", "فلتر التكييف", "Svc_ACFilter", "serv_ac_filter")}
                        {Row("Spark Plugs", "البوجيهات", "Svc_SparkPlugs", "serv_spark_plugs")}
                        {Row("Engine Belt", "سير المجموعة", "Svc_EngineBelt", "serv_engine_belt")}
                        {Row("Belt Pulley", "بكرات السيور", "Svc_BeltPulley", "serv_belt_pulley")}
                        {Row("Front Brake Pads", "تيل فرامل أمامي", "Svc_FrontPads", "serv_front_pads")}
                        {Row("Rear Brake Pads", "تيل فرامل خلفي", "Svc_RearPads", "serv_rear_pads")}
                        {Row("Front Rotors", "طنابير أمامية", "Svc_FrontRotors", "serv_front_rotors")}
                        {Row("Rear Rotors", "طنابير خلفية", "Svc_RearRotors", "serv_rear_rotors")}
                    </tbody>
                </table>
            </div>
        </div>

        <div class=""icons-strip-wrap"">
            {(string.IsNullOrEmpty(iconsBase64) ? @"
            <div class=""icons-strip-fallback"">
                <span>⚙️ ميكانيكا (Mechanics)</span>
                <span>⚡ كهرباء (Electrical)</span>
                <span>❄️ تبريد وتكييف (Cooling & AC)</span>
                <span>🎨 سمكرة ودهان (Body & Paint)</span>
            </div>" : $@"<img src=""{iconsBase64}"" class=""icons-strip-img"" alt=""Mechanics, Electrical, Cooling & AC, Body & Paint"" />")}
        </div>

        <div class=""two-tables-row"">
            <table class=""check-table"" style=""flex:1;"">
                <thead><tr><th colspan=""2"" class=""table-head"">حالة الجنط - Rim Condition</th></tr></thead>
                <tbody>
                    {Row("Right Front", "أمامي يمين", "Rim_RF", "rim_rf")}
                    {Row("Left Front", "أمامي شمال", "Rim_LF", "rim_lf")}
                    {Row("Right Rear", "خلفي يمين", "Rim_RR", "rim_rr")}
                    {Row("Left Rear", "خلفي شمال", "Rim_LR", "rim_lr")}
                </tbody>
            </table>
            <table class=""check-table"" style=""flex:1;"">
                <thead><tr><th colspan=""2"" class=""table-head"">حالة الكاوتش - Tire Condition</th></tr></thead>
                <tbody>
                    {Row("Right Front", "أمامي يمين", "Tire_RF", "tire_rf")}
                    {Row("Left Front", "أمامي شمال", "Tire_LF", "tire_lf")}
                    {Row("Right Rear", "خلفي يمين", "Tire_RR", "tire_rr")}
                    {Row("Left Rear", "خلفي شمال", "Tire_LR", "tire_lr")}
                </tbody>
            </table>
        </div>

        <table class=""check-table"">
            <thead><tr><th colspan=""4"" class=""table-head"">السيارة من الاسفل والتسريبات - Underneath the Car AND Leaks</th></tr></thead>
            <tbody>
                {Row4("Coolant Leak", "تسريب مياه التبريد", "Leak_Coolant", new[] { "leak_coolant" },
                      "Engine Oil Leak", "تسريب زيت المحرك", "Leak_EngineOil", new[] { "leak_engine_oil" })}
                {Row4("Coolant Status", "حالة سائل التبريد", "Status_Coolant", new[] { "status_coolant" },
                      "Gear Oil Leak", "تسريب زيت الفتيس", "Leak_GearOil", new[] { "leak_gear_oil" })}
                {Row4("Exhaust Mounts", "حوامل الشكمان", "Under_ExhaustMounts", new[] { "exhaust_mounts" },
                      "Power Steering Fluid Leak", "تسريب زيت الباور", "Leak_PowerSteering", new[] { "leak_power_steering" })}
                {Row4("Exhaust Insulators", "عوازل الشكمان", "Under_ExhaustInsulators", new[] { "exhaust_insulators" },
                      "Boots", "الكبالن وكاوتش ترابها", "Under_Boots", new[] { "axle_boots" })}
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Car Shields</span><span class=""ar"">صاج الحماية والبطانات</span></td>
                    <td class=""val-cell"" colspan=""3"">{Val("Under_Shields", "car_shields")}</td>
                </tr>
            </tbody>
        </table>

        <div class=""page-footer"">Page 2 of 3</div>
    </div>

    <!-- ==================== PAGE 3 ==================== -->
    <div class=""a4-page page-3"">
        {watermarkHtml}
        {RepeatedHeader()}

        <table class=""check-table"">
            <thead><tr><th colspan=""4"" class=""table-head"">العفشة - Suspension System</th></tr></thead>
            <tbody>
                {Row4("Front Steering Tie Rods", "بيض وأطراف دركسيون أمامية", "Susp_FrontTie", new[] { "susp_front_tie_rods" },
                      "Rear Steering Tie Rods", "أذرع تعليق خلفية", "Susp_RearTie", new[] { "susp_rear_tie_rods" })}
                {Row4("Front Shock Absorbers", "مساعدين أماميين", "Susp_FrontShocks", new[] { "susp_front_shocks" },
                      "Rear Shock Absorbers", "مساعدين خلفيين", "Susp_RearShocks", new[] { "susp_rear_shocks" })}
                {Row4("Engine Mounts", "قواعد المحرك", "Susp_EngineMounts", new[] { "susp_engine_mounts" },
                      "Gearbox Mounts", "قواعد الفتيس", "Susp_GearboxMounts", new[] { "susp_gear_mounts" })}
                {Row4("Front Control Arms", "مقصات أمامية", "Susp_FrontControlArms", new[] { "susp_front_arms" },
                      "Rear Control Arms", "مقصات خلفية", "Susp_RearControlArms", new[] { "susp_rear_arms" })}
                {Row4("Steering Gearbox", "علبة الدركسيون", "Susp_SteeringBox", new[] { "susp_steering_box" },
                      "Steering Rods", "بارات التوجيه", "Susp_SteeringRods", new[] { "susp_steering_rods" })}
        </tbody>
        </table>

        <div class=""two-tables-row"">
            <table class=""check-table"" style=""flex:1;"">
                <thead><tr><th colspan=""2"" class=""table-head"">جسم السيارة والدهان - Car Body & Paint</th></tr></thead>
                <tbody>
                    {Row("Right Rear Door", "باب خلفي يمين", "Body_RRDoor", "body_rr_door")}
                    {Row("Left Rear Door", "باب خلفي شمال", "Body_LRDoor", "body_lr_door")}
                    {Row("Right Rear Fender", "رفرف خلفي يمين", "Body_RRFender", "body_rr_fender")}
                    {Row("Left Rear Fender", "رفرف خلفي شمال", "Body_LRFender", "body_lr_fender")}
                    {Row("Trunk", "الشنطة", "Body_Trunk", "body_trunk")}
                    {Row("Chassis", "الشاسية", "Body_Chassis", "body_chassis")}
                    {Row("Headlights Condition", "حالة الفوانيس", "Body_Headlights", "body_headlights")}
                </tbody>
            </table>

            <table class=""check-table"" style=""flex:1;"">
                <thead><tr><th colspan=""2"" class=""table-head"">جسم السيارة والدهان - Car Body & Paint</th></tr></thead>
                <tbody>
                    {Row("Front Bumper", "إكصدام أمامي", "Body_FrontBumper", "body_front_bumper")}
                    {Row("Rear Bumper", "إكصدام خلفي", "Body_RearBumper", "body_rear_bumper")}
                    {Row("Roof", "السقف", "Body_Roof", "body_roof")}
                    {Row("Hood", "الكبوت", "Body_Hood", "body_hood")}
                    {Row("Right Front Fender", "رفرف أمامي يمين", "Body_RFFender", "body_rf_fender")}
                    {Row("Left Front Fender", "رفرف أمامي شمال", "Body_LFFender", "body_lf_fender")}
                    {Row("Right Front Door", "باب أمامي يمين", "Body_RFDoor", "body_rf_door")}
                    {Row("Left Front Door", "باب أمامي شمال", "Body_LFDoor", "body_lf_door")}
                </tbody>
            </table>
        </div>

        <!-- 5-View Car Diagram -->
        <div class=""diagram-container"">
            {(string.IsNullOrEmpty(diagramBase64) ? @"
            <div style=""padding: 20px; font-weight: bold;"">[ 5-View Car Damage Diagram ]</div>" : $@"<img src=""{diagramBase64}"" class=""diagram-img"" alt=""5-View Car Damage Diagram"" />")}
        </div>

        <div class=""bottom-notes-box"">
            <div class=""notes-row"">
                <span class=""notes-lbl"">ملاحظات / Notes & Comment:</span>
                <span class=""notes-val"">{(Val("Additional_Comments") != "______" ? Val("Additional_Comments") : Underline(insp.Notes))}</span>
            </div>
            <div class=""notes-row"">
                <span class=""notes-lbl"">كشف الأعطال بالجهاز / Diagnostic Scan Result:</span>
                <span class=""notes-val"">{(Val("Diagnostic_Scan_Result") != "______" ? Val("Diagnostic_Scan_Result") : Underline(insp.DiagnosticScanResult))}</span>
            </div>
        </div>

        <div class=""signatures-row"">
            <div class=""sig-box"">
                <span class=""sig-lbl"">Inspector Signature / توقيع الفاحص:</span>
                <span class=""sig-val"">{Underline(insp.InspectedByMechanicName)}</span>
            </div>
            <div class=""sig-box"">
                <span class=""sig-lbl"">Customer Signature / توقيع العميل:</span>
                <span class=""sig-val"">____________________</span>
            </div>
        </div>

        <div class=""page-footer"">Page 3 of 3</div>
    </div>

</body>
</html>";
        }
    }
}
