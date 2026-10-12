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

        public async Task<string> GenerateHtmlPrintReportAsync(int id)
        {
            var inspection = await GetByIdAsync(id);
            if (inspection == null) throw new KeyNotFoundException($"Inspection {id} not found.");

            return BuildInspectionHtml(inspection, isBlank: false);
        }

        public Task<string> GenerateBlankFormHtmlAsync()
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
            return Task.FromResult(BuildInspectionHtml(empty, isBlank: true));
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
        private static string BuildInspectionHtml(InspectionResponseDto insp, bool isBlank)
        {
            Dictionary<string, JsonElement> checklist = new();
            if (!isBlank && !string.IsNullOrWhiteSpace(insp.ChecklistDataJson))
            {
                try
                {
                    checklist = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(insp.ChecklistDataJson) ?? new();
                }
                catch { }
            }

            string Val(string key)
            {
                if (isBlank) return "______";
                if (checklist.TryGetValue(key, out var el))
                {
                    if (el.ValueKind == JsonValueKind.String) return el.GetString() ?? "______";
                    if (el.TryGetProperty("val", out var v)) return v.GetString() ?? "______";
                }
                return "______";
            }

            string Underline(string? text)
            {
                return string.IsNullOrWhiteSpace(text) ? "______" : WebUtility.HtmlEncode(text);
            }

            var makeModel = Underline(insp.CarMake + " " + insp.CarModel);
            var plate = Underline(insp.CarPlate);
            var chassis = Underline(insp.CarChassis);
            var custName = Underline(insp.CustomerName);
            var custPhone = Underline(insp.CustomerPhone);
            var odo = insp.OdometerKm > 0 ? insp.OdometerKm.ToString("N0") : "______";
            var invNo = Underline(insp.InvoiceNumber);
            var invAmt = (insp.InvoiceAmount.HasValue && insp.InvoiceAmount.Value > 0) ? insp.InvoiceAmount.Value.ToString("F2") : "0.00";
            var dateStr = insp.InspectedAt.ToString("dd/MM/yyyy");

            string RepeatedHeader() => $@"
            <div class=""report-header"">
                <div class=""header-box left-box"">
                    <div class=""box-title"">Car Information - بيانات السيارة</div>
                    <div class=""box-content"">
                        <div class=""row""><span class=""lbl"">Type / الطراز:</span> <span class=""val"">{makeModel}</span></div>
                        <div class=""row""><span class=""lbl"">Model / الموديل:</span> <span class=""val"">{(insp.CarYear > 0 ? insp.CarYear.ToString() : "______")}</span></div>
                        <div class=""row""><span class=""lbl"">Plate No. / اللوحة:</span> <span class=""val"">{plate}</span></div>
                        <div class=""row""><span class=""lbl"">VIN No. / الشاسية:</span> <span class=""val"">{chassis}</span></div>
                    </div>
                </div>
                <div class=""header-box right-box"">
                    <div class=""box-title"">Client Information - بيانات العميل</div>
                    <div class=""box-content"">
                        <div class=""row""><span class=""lbl"">Name / اسم العميل:</span> <span class=""val"">{custName}</span></div>
                        <div class=""row""><span class=""lbl"">Phone / موبايل العميل:</span> <span class=""val"">{custPhone}</span></div>
                        <div class=""row""><span class=""lbl"">KM. / قراءة العداد:</span> <span class=""val"">{odo}</span></div>
                        <div class=""row invoice-subrow"">
                            <span>Invoice NO: {invNo}</span>
                            <span>{invAmt}</span>
                            <span>{dateStr}</span>
                            <span>Date</span>
                        </div>
                    </div>
                </div>
            </div>";

            string Row(string en, string ar, string key) => $@"
                <tr>
                    <td class=""lbl-cell""><span class=""en"">{en}</span><span class=""ar"">{ar}</span></td>
                    <td class=""val-cell"">{Val(key)}</td>
                </tr>";

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
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
            background: #ffffff;
            color: #000000;
            font-size: 11px;
            line-height: 1.2;
        }}
        .a4-page {{
            width: 210mm;
            height: 297mm;
            padding: 12mm 10mm 10mm 10mm;
            margin: 0 auto;
            position: relative;
            background: #ffffff;
            page-break-after: always;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }}
        .page-footer {{
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            padding-top: 4px;
            border-top: 1px solid #000;
        }}
        .report-header {{
            display: flex;
            justify-content: space-between;
            gap: 8mm;
            margin-bottom: 4mm;
        }}
        .header-box {{
            flex: 1;
            border: 2px solid #000000;
            border-radius: 8px;
            overflow: hidden;
            background: #ffffff;
        }}
        .box-title {{
            background: #d9d9d9;
            font-weight: bold;
            font-size: 11px;
            text-align: center;
            padding: 4px 6px;
            border-bottom: 2px solid #000000;
        }}
        .box-content {{
            padding: 6px 8px;
            font-size: 11px;
        }}
        .box-content .row {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }}
        .invoice-subrow {{
            border-top: 1px solid #999;
            padding-top: 4px;
            margin-top: 4px;
            font-size: 10px;
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
            gap: 25mm;
        }}
        .workshop-logo-large {{
            max-width: 380px;
            max-height: 180px;
            object-fit: contain;
            filter: grayscale(100%);
        }}
        .title-box-rounded {{
            border: 3px solid #000000;
            background: #d9d9d9;
            border-radius: 12px;
            padding: 18px 45px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            box-shadow: 2px 2px 0px #000;
        }}

        /* Tables & Columns */
        table.check-table {{
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000000;
            margin-bottom: 3mm;
            font-size: 10px;
        }}
        table.check-table th, table.check-table td {{
            border: 1px solid #000000;
            padding: 3px 5px;
            height: 20px;
        }}
        .table-head {{
            background: #d9d9d9;
            font-weight: bold;
            text-align: center;
            border-bottom: 2px solid #000000 !important;
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
        .lbl-cell .en {{ direction: ltr; text-align: left; font-size: 9px; color: #222; }}
        .val-cell {{
            background: #ffffff;
            text-align: center;
            font-weight: bold;
        }}
        .three-columns {{
            display: flex;
            gap: 4mm;
            align-items: flex-start;
        }}
        .col {{
            flex: 1;
            display: flex;
            flex-direction: column;
        }}
        .icons-strip {{
            display: flex;
            justify-content: space-around;
            align-items: center;
            border: 2px solid #000000;
            border-radius: 6px;
            padding: 4px;
            background: #f0f0f0;
            margin: 2mm 0;
            font-weight: bold;
            font-size: 10px;
        }}
        .icons-strip span {{
            padding: 2px 8px;
            border-radius: 4px;
            background: #ffffff;
            border: 1px solid #000;
        }}
        .two-tables-row {{
            display: flex;
            gap: 4mm;
        }}
        .diagram-container {{
            text-align: center;
            border: 2px solid #000000;
            border-radius: 6px;
            padding: 4px;
            margin: 2mm 0;
            background: #ffffff;
        }}
        .diagram-img {{
            max-width: 100%;
            height: 140px;
            object-fit: contain;
        }}
        .bottom-notes-box {{
            border: 2px solid #000000;
            border-radius: 6px;
            padding: 6px;
            margin-top: 2mm;
            background: #ffffff;
        }}
        .notes-row {{
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #999;
            padding: 4px 0;
        }}
        .notes-row:last-child {{
            border-bottom: none;
        }}
    </style>
</head>
<body>

    <!-- ==================== PAGE 1 ==================== -->
    <div class=""a4-page page-1"">
        {RepeatedHeader()}
        <div class=""page-1-body"">
            <svg class=""workshop-logo-large"" viewBox=""0 0 400 120"">
                <rect width=""400"" height=""120"" fill=""#ffffff"" rx=""10""/>
                <circle cx=""80"" cy=""60"" r=""40"" fill=""none"" stroke=""#000000"" stroke-width=""6""/>
                <path d=""M60 60 L80 40 L100 60 L80 80 Z"" fill=""#000000""/>
                <text x=""150"" y=""58"" font-size=""34"" font-weight=""bold"" fill=""#000000"" font-family=""sans-serif"">OETTINGER</text>
                <text x=""150"" y=""88"" font-size=""16"" font-weight=""bold"" fill=""#444444"" font-family=""sans-serif"">AUTOMOTIVE WORKSHOP</text>
            </svg>

            <div class=""title-box-rounded"">
                Comprehensive Car Inspection<br>فحص سيارة شامل
            </div>

            <div style=""text-align: center; font-size: 14px; font-weight: bold; border: 2px solid #000; border-radius: 8px; padding: 10px 30px; background: #fff;"">
                Report No: {insp.ReportNumber}<br>
                Date: {dateStr}
            </div>
        </div>
        <div class=""page-footer"">Page 1 of 3</div>
    </div>

    <!-- ==================== PAGE 2 ==================== -->
    <div class=""a4-page page-2"">
        {RepeatedHeader()}
        
        <div class=""three-columns"">
            <!-- Left Column -->
            <div class=""col"">
                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">كهرباء المحرك<br>Engine Electrical System</th></tr></thead>
                    <tbody>
                        {Row("Car Battery", "بطارية السيارة", "battery")}
                        {Row("Alternator Charging", "شحن الدينامو", "alternator")}
                        {Row("Starter Motor Sound", "صوت المارش", "starter")}
                    </tbody>
                </table>

                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">مكيف السيارة<br>Car Air Conditioner</th></tr></thead>
                    <tbody>
                        {Row("Cooling Level", "مستوى التبريد", "ac_cooling")}
                        {Row("Air Distribution", "توزيع الهواء", "ac_distribution")}
                        {Row("Heating System", "نظام التدفئة", "ac_heating")}
                    </tbody>
                </table>

                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">السيارة من الداخل<br>Interior of the Car</th></tr></thead>
                    <tbody>
                        {Row("Dashboard", "لوحة القيادة - التابلوه", "int_dashboard")}
                        {Row("Seat Upholstery", "فرش المقاعد", "int_seats")}
                        {Row("Roof lining & pillars", "فرش السقف والقوائم", "int_roof")}
                        {Row("Handles", "المقابض", "int_handles")}
                        {Row("Interior Buttons", "أزرار التحكم", "int_buttons")}
                        {Row("Entertainment", "نظام الترفيه", "int_screen")}
                        {Row("Steering & Gear", "الدركسيون والفتيس", "int_steering_gear")}
                    </tbody>
                </table>
            </div>

            <!-- Middle Column -->
            <div class=""col"">
                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">اختبار القيادة<br>Driving Test</th></tr></thead>
                    <tbody>
                        {Row("Engine Condition", "حالة المحرك", "drive_engine")}
                        {Row("Gear Condition", "حالة الفتيس", "drive_gear")}
                        {Row("Wheel Bearing", "رولمان بلي العجل", "drive_bearing")}
                        {Row("Front Suspension", "العفشة الأمامية", "drive_front_susp")}
                        {Row("Rear Suspension", "العفشة الخلفية", "drive_rear_susp")}
                        {Row("Steering Gearbox", "علبة الدركسيون", "drive_steering_box")}
                        {Row("Steering Wheel", "طارة الدركسيون", "drive_steering_wheel")}
                        {Row("Noise While Steering", "أصوات عند التوجيه", "drive_steering_noise")}
                        {Row("Drive Shaft", "عمود الكردان / الكبالن", "drive_shaft")}
                        {Row("Brake Condition", "حالة الفرامل", "drive_brakes")}
                        {Row("Abnormal Vibrations", "اهتزازات غير طبيعية", "drive_vibrations")}
                    </tbody>
                </table>
            </div>

            <!-- Right Column -->
            <div class=""col"">
                <table class=""check-table"">
                    <thead><tr><th colspan=""2"" class=""table-head"">بنود الصيانة<br>Service Items</th></tr></thead>
                    <tbody>
                        {Row("Engine Oil", "زيت المحرك", "serv_engine_oil")}
                        {Row("Gear Oil", "زيت الفتيس", "serv_gear_oil")}
                        {Row("Brake Fluid", "زيت الفرامل", "serv_brake_fluid")}
                        {Row("Air Filter", "فلتر الهواء", "serv_air_filter")}
                        {Row("AC Filter", "فلتر التكييف", "serv_ac_filter")}
                        {Row("Spark Plugs", "البوجيهات", "serv_spark_plugs")}
                        {Row("Engine Belt", "سير المجموعة", "serv_engine_belt")}
                        {Row("Belt Pulley", "بكرات السيور", "serv_belt_pulley")}
                        {Row("Front Brake Pads", "تيل فرامل أمامي", "serv_front_pads")}
                        {Row("Rear Brake Pads", "تيل فرامل خلفي", "serv_rear_pads")}
                        {Row("Front Rotors", "طنابير أمامية", "serv_front_rotors")}
                        {Row("Rear Rotors", "طنابير خلفية", "serv_rear_rotors")}
                    </tbody>
                </table>
            </div>
        </div>

        <div class=""icons-strip"">
            <span>⚙️ ميكانيكا (Mechanics)</span>
            <span>⚡ كهرباء (Electrical)</span>
            <span>❄️ تبريد وتكييف (Cooling & AC)</span>
            <span>🎨 سمكرة ودهان (Body & Paint)</span>
        </div>

        <div class=""two-tables-row"">
            <table class=""check-table"" style=""flex:1;"">
                <thead><tr><th colspan=""2"" class=""table-head"">حالة الجنط - Rim Condition</th></tr></thead>
                <tbody>
                    {Row("Right Front", "أمامي يمين", "rim_rf")}
                    {Row("Left Front", "أمامي شمال", "rim_lf")}
                    {Row("Right Rear", "خلفي يمين", "rim_rr")}
                    {Row("Left Rear", "خلفي شمال", "rim_lr")}
                </tbody>
            </table>
            <table class=""check-table"" style=""flex:1;"">
                <thead><tr><th colspan=""2"" class=""table-head"">حالة الكاوتش - Tire Condition</th></tr></thead>
                <tbody>
                    {Row("Right Front", "أمامي يمين", "tire_rf")}
                    {Row("Left Front", "أمامي شمال", "tire_lf")}
                    {Row("Right Rear", "خلفي يمين", "tire_rr")}
                    {Row("Left Rear", "خلفي شمال", "tire_lr")}
                </tbody>
            </table>
        </div>

        <table class=""check-table"">
            <thead><tr><th colspan=""4"" class=""table-head"">السيارة من الاسفل والتسريبات - Underneath the Car AND Leaks</th></tr></thead>
            <tbody>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Coolant Leak</span><span class=""ar"">تسريب مياه التبريد</span></td>
                    <td class=""val-cell"">{Val("leak_coolant")}</td>
                    <td class=""lbl-cell""><span class=""en"">Engine Oil Leak</span><span class=""ar"">تسريب زيت المحرك</span></td>
                    <td class=""val-cell"">{Val("leak_engine_oil")}</td>
                </tr>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Coolant Status</span><span class=""ar"">حالة سائل التبريد</span></td>
                    <td class=""val-cell"">{Val("status_coolant")}</td>
                    <td class=""lbl-cell""><span class=""en"">Gear Oil Leak</span><span class=""ar"">تسريب زيت الفتيس</span></td>
                    <td class=""val-cell"">{Val("leak_gear_oil")}</td>
                </tr>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Exhaust Mounts</span><span class=""ar"">حوامل الشكمان</span></td>
                    <td class=""val-cell"">{Val("exhaust_mounts")}</td>
                    <td class=""lbl-cell""><span class=""en"">Power Steering Leak</span><span class=""ar"">تسريب زيت الباور</span></td>
                    <td class=""val-cell"">{Val("leak_power_steering")}</td>
                </tr>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Exhaust Insulators</span><span class=""ar"">عوازل الشكمان</span></td>
                    <td class=""val-cell"">{Val("exhaust_insulators")}</td>
                    <td class=""lbl-cell""><span class=""en"">Boots</span><span class=""ar"">الكبالن وكاوتش ترابها</span></td>
                    <td class=""val-cell"">{Val("axle_boots")}</td>
                </tr>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Car Shields</span><span class=""ar"">صاج الحماية والبطانات</span></td>
                    <td class=""val-cell"" colspan=""3"">{Val("car_shields")}</td>
                </tr>
            </tbody>
        </table>

        <div class=""page-footer"">Page 2 of 3</div>
    </div>

    <!-- ==================== PAGE 3 ==================== -->
    <div class=""a4-page page-3"">
        {RepeatedHeader()}

        <table class=""check-table"">
            <thead><tr><th colspan=""4"" class=""table-head"">العفشة - Suspension System</th></tr></thead>
            <tbody>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Front Tie Rods</span><span class=""ar"">بيض وأطراف دركسيون أمامية</span></td>
                    <td class=""val-cell"">{Val("susp_front_tie_rods")}</td>
                    <td class=""lbl-cell""><span class=""en"">Rear Tie Rods</span><span class=""ar"">أذرع تعليق خلفية</span></td>
                    <td class=""val-cell"">{Val("susp_rear_tie_rods")}</td>
                </tr>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Front Shock Absorbers</span><span class=""ar"">مساعدين أماميين</span></td>
                    <td class=""val-cell"">{Val("susp_front_shocks")}</td>
                    <td class=""lbl-cell""><span class=""en"">Rear Shock Absorbers</span><span class=""ar"">مساعدين خلفيين</span></td>
                    <td class=""val-cell"">{Val("susp_rear_shocks")}</td>
                </tr>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Engine Mounts</span><span class=""ar"">قواعد المحرك</span></td>
                    <td class=""val-cell"">{Val("susp_engine_mounts")}</td>
                    <td class=""lbl-cell""><span class=""en"">Gearbox Mounts</span><span class=""ar"">قواعد الفتيس</span></td>
                    <td class=""val-cell"">{Val("susp_gear_mounts")}</td>
                </tr>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Front Control Arms</span><span class=""ar"">مقصات أمامية</span></td>
                    <td class=""val-cell"">{Val("susp_front_arms")}</td>
                    <td class=""lbl-cell""><span class=""en"">Rear Control Arms</span><span class=""ar"">مقصات خلفية</span></td>
                    <td class=""val-cell"">{Val("susp_rear_arms")}</td>
                </tr>
                <tr>
                    <td class=""lbl-cell""><span class=""en"">Steering Gearbox</span><span class=""ar"">علبة الدركسيون</span></td>
                    <td class=""val-cell"">{Val("susp_steering_box")}</td>
                    <td class=""lbl-cell""><span class=""en"">Steering Rods</span><span class=""ar"">بارات التوجيه</span></td>
                    <td class=""val-cell"">{Val("susp_steering_rods")}</td>
                </tr>
            </tbody>
        </table>

        <div class=""two-tables-row"">
            <table class=""check-table"" style=""flex:1;"">
                <thead><tr><th colspan=""2"" class=""table-head"">جسم السيارة والدهان - Car Body & Paint</th></tr></thead>
                <tbody>
                    {Row("Right Rear Door", "باب خلفي يمين", "body_rr_door")}
                    {Row("Left Rear Door", "باب خلفي شمال", "body_lr_door")}
                    {Row("Right Rear Fender", "رفرف خلفي يمين", "body_rr_fender")}
                    {Row("Left Rear Fender", "رفرف خلفي شمال", "body_lr_fender")}
                    {Row("Trunk", "الشنطة", "body_trunk")}
                    {Row("Chassis", "الشاسية", "body_chassis")}
                    {Row("Headlights Condition", "حالة الفوانيس", "body_headlights")}
                </tbody>
            </table>

            <table class=""check-table"" style=""flex:1;"">
                <thead><tr><th colspan=""2"" class=""table-head"">جسم السيارة والدهان - Car Body & Paint</th></tr></thead>
                <tbody>
                    {Row("Front Bumper", "إكصدام أمامي", "body_front_bumper")}
                    {Row("Rear Bumper", "إكصدام خلفي", "body_rear_bumper")}
                    {Row("Roof", "السقف", "body_roof")}
                    {Row("Hood", "الكبوت", "body_hood")}
                    {Row("Right Front Fender", "رفرف أمامي يمين", "body_rf_fender")}
                    {Row("Left Front Fender", "رفرف أمامي شمال", "body_lf_fender")}
                    {Row("Right Front Door", "باب أمامي يمين", "body_rf_door")}
                    {Row("Left Front Door", "باب أمامي شمال", "body_lf_door")}
                </tbody>
            </table>
        </div>

        <!-- 5-View Car Diagram SVG -->
        <div class=""diagram-container"">
            <svg class=""diagram-img"" viewBox=""0 0 700 130"">
                <!-- TOP VIEW -->
                <g transform=""translate(270, 5)"">
                    <rect x=""0"" y=""0"" width=""160"" height=""90"" rx=""16"" fill=""#f5f5f5"" stroke=""#000"" stroke-width=""2""/>
                    <rect x=""35"" y=""15"" width=""90"" height=""60"" rx=""8"" fill=""#e0e0e0"" stroke=""#000"" stroke-width=""1.5""/>
                    <rect x=""10"" y=""18"" width=""20"" height=""12"" fill=""#333"" rx=""2""/>
                    <rect x=""10"" y=""60"" width=""20"" height=""12"" fill=""#333"" rx=""2""/>
                    <rect x=""130"" y=""18"" width=""20"" height=""12"" fill=""#333"" rx=""2""/>
                    <rect x=""130"" y=""60"" width=""20"" height=""12"" fill=""#333"" rx=""2""/>
                    <text x=""80"" y=""50"" font-size=""11"" font-weight=""bold"" text-anchor=""middle"">TOP / السقف</text>
                </g>

                <!-- LEFT SIDE -->
                <g transform=""translate(10, 15)"">
                    <rect x=""0"" y=""10"" width=""220"" height=""60"" rx=""10"" fill=""#f5f5f5"" stroke=""#000"" stroke-width=""2""/>
                    <circle cx=""45"" cy=""70"" r=""14"" fill=""#333"" stroke=""#000"" stroke-width=""2""/>
                    <circle cx=""175"" cy=""70"" r=""14"" fill=""#333"" stroke=""#000"" stroke-width=""2""/>
                    <rect x=""50"" y=""18"" width=""55"" height=""26"" fill=""#e0e0e0"" stroke=""#000"" stroke-width=""1""/>
                    <rect x=""110"" y=""18"" width=""55"" height=""26"" fill=""#e0e0e0"" stroke=""#000"" stroke-width=""1""/>
                    <text x=""110"" y=""55"" font-size=""11"" font-weight=""bold"" text-anchor=""middle"">LEFT / الجانب الأيسر</text>
                </g>

                <!-- RIGHT SIDE -->
                <g transform=""translate(470, 15)"">
                    <rect x=""0"" y=""10"" width=""220"" height=""60"" rx=""10"" fill=""#f5f5f5"" stroke=""#000"" stroke-width=""2""/>
                    <circle cx=""45"" cy=""70"" r=""14"" fill=""#333"" stroke=""#000"" stroke-width=""2""/>
                    <circle cx=""175"" cy=""70"" r=""14"" fill=""#333"" stroke=""#000"" stroke-width=""2""/>
                    <rect x=""50"" y=""18"" width=""55"" height=""26"" fill=""#e0e0e0"" stroke=""#000"" stroke-width=""1""/>
                    <rect x=""110"" y=""18"" width=""55"" height=""26"" fill=""#e0e0e0"" stroke=""#000"" stroke-width=""1""/>
                    <text x=""110"" y=""55"" font-size=""11"" font-weight=""bold"" text-anchor=""middle"">RIGHT / الجانب الأيمن</text>
                </g>
            </svg>
        </div>

        <div class=""bottom-notes-box"">
            <div class=""notes-row"">
                <span style=""font-weight:bold;"">ملاحظات / Notes & Comment:</span>
                <span>{Underline(insp.Notes)}</span>
            </div>
            <div class=""notes-row"">
                <span style=""font-weight:bold;"">كشف الأعطال بالجهاز / Diagnostic Scan Result:</span>
                <span>{Underline(insp.DiagnosticScanResult)}</span>
            </div>
        </div>

        <div class=""page-footer"">Page 3 of 3</div>
    </div>

</body>
</html>";
        }
    }
}
