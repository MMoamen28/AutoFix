using AutoFix.Data;
using AutoFix.DTOs.Invoice;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly AppDbContext _db;

        public InvoiceService(AppDbContext db)
        {
            _db = db;
        }

        private IQueryable<Invoice> BaseQuery()
        {
            return _db.Invoices
                .Include(i => i.Customer)
                .Include(i => i.Car)
                .Include(i => i.WorkOrder)
                .Include(i => i.Payments);
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
                Payments = i.Payments.Where(p => !p.IsDeleted).OrderByDescending(p => p.PaidAt).Select(p => new PaymentResponseDto
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

            var afterDiscount = Math.Max(0, subtotal - dto.DiscountAmount);
            var vatAmount = Math.Round(afterDiscount * (dto.VatPercentage / 100m), 2);
            var totalAmount = afterDiscount + vatAmount;

            var nextNum = $"INV-{DateTime.UtcNow:yyyyMM}-{(await _db.Invoices.CountAsync() + 1):D4}";

            var invoice = new Invoice
            {
                InvoiceNumber = nextNum,
                WorkOrderId = dto.WorkOrderId,
                CustomerId = dto.CustomerId,
                CarId = dto.CarId,
                Subtotal = subtotal,
                DiscountAmount = dto.DiscountAmount,
                VatPercentage = dto.VatPercentage,
                VatAmount = vatAmount,
                TotalAmount = totalAmount,
                PaidAmount = 0,
                Status = "Issued",
                Currency = "EGP",
                IssuedAt = DateTime.UtcNow,
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

            await _db.SaveChangesAsync();

            return (await GetByIdAsync(invoice.Id))!;
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

        public async Task<string> GeneratePrintedInvoiceHtmlAsync(int id)
        {
            var invoice = await BaseQuery().AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
            if (invoice == null) throw new KeyNotFoundException($"Invoice {id} not found.");

            var workmanshipLines = new List<(string Desc, decimal Qty, decimal Price, decimal Subtotal)>();
            var partsLines = new List<(string Desc, decimal Qty, decimal Price, decimal Subtotal)>();
            var otherLaborLines = new List<(string Desc, decimal Qty, decimal Price, decimal Subtotal)>();

            if (!string.IsNullOrEmpty(invoice.SnapshotDetailsJson) && invoice.SnapshotDetailsJson != "[]")
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(invoice.SnapshotDetailsJson);
                    foreach (var el in doc.RootElement.EnumerateArray())
                    {
                        var desc = el.TryGetProperty("Description", out var d) ? d.GetString() ?? "" : "";
                        var lineType = el.TryGetProperty("LineType", out var lt) ? lt.GetString() ?? "" : "";
                        var qty = el.TryGetProperty("Quantity", out var q) ? q.GetDecimal() : 1m;
                        var price = el.TryGetProperty("UnitPrice", out var p) ? p.GetDecimal() : 0m;
                        var sub = el.TryGetProperty("Subtotal", out var s) ? s.GetDecimal() : qty * price;

                        if (lineType.Equals("LaborManufacturer", StringComparison.OrdinalIgnoreCase))
                        {
                            workmanshipLines.Add((desc, qty, price, sub));
                        }
                        else if (lineType.StartsWith("Labor", StringComparison.OrdinalIgnoreCase))
                        {
                            otherLaborLines.Add((desc, qty, price, sub));
                        }
                        else
                        {
                            partsLines.Add((desc, qty, price, sub));
                        }
                    }
                }
                catch { }
            }

            var workmanshipSubtotal = workmanshipLines.Sum(x => x.Subtotal);
            var partsSubtotal = partsLines.Sum(x => x.Subtotal);
            var otherLaborSubtotal = otherLaborLines.Sum(x => x.Subtotal);

            var workmanshipRows = workmanshipLines.Count == 0
                ? "<tr><td colspan='5' style='padding: 8px; text-align: center; color: #64748b;'>لا توجد بنود مصنعية</td></tr>"
                : string.Join("", workmanshipLines.Select((l, idx) => $@"
                    <tr>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'>{idx + 1}</td>
                        <td dir='auto' style='padding: 8px; border: 1px solid #ddd; text-align: right;'><strong>{l.Desc}</strong></td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'><span dir='ltr'>{l.Qty:F1}</span></td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{l.Price:N2}</span> ج.م</td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{l.Subtotal:N2}</span> ج.م</td>
                    </tr>"));

            var partsRows = partsLines.Count == 0
                ? "<tr><td colspan='5' style='padding: 8px; text-align: center; color: #64748b;'>لا توجد قطع غيار</td></tr>"
                : string.Join("", partsLines.Select((l, idx) => $@"
                    <tr>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'>{idx + 1}</td>
                        <td dir='auto' style='padding: 8px; border: 1px solid #ddd; text-align: right;'><strong>{l.Desc}</strong></td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'><span dir='ltr'>{l.Qty:F1}</span></td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{l.Price:N2}</span> ج.م</td>
                        <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{l.Subtotal:N2}</span> ج.م</td>
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
                                    <td dir='auto' style='padding: 8px; border: 1px solid #ddd; text-align: right;'>{l.Desc}</td>
                                    <td style='padding: 8px; border: 1px solid #ddd; text-align: center;'><span dir='ltr'>{l.Qty:F1}</span></td>
                                    <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{l.Price:N2}</span> ج.م</td>
                                    <td style='padding: 8px; border: 1px solid #ddd; text-align: right;'><span dir='ltr'>{l.Subtotal:N2}</span> ج.م</td>
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
    <title>فاتورة ضريبية / Tax Invoice - {invoice.InvoiceNumber}</title>
    <style>
        @page {{ size: A4 portrait; margin: 12mm; }}
        body {{ font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; color: #1e293b; font-size: 13px; line-height: 1.5; }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 15px; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; background: #e0f2fe; color: #0369a1; }}
        .section-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }}
        .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 15px; }}
        .card h4 {{ margin: 0 0 8px 0; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; font-size: 14px; display: flex; justify-content: space-between; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        th {{ background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: right; }}
        .totals {{ margin-top: 15px; text-align: left; }}
        .totals-box {{ display: inline-block; min-width: 300px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; }}
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
        <button class='btn-print' onclick='window.print()'>طباعة الفاتورة / Print Invoice</button>
        <button class='btn-download' onclick='window.print()'>تحميل PDF / Download PDF</button>
    </div>
    <div class='header'>
        <div>
            <h1 style='margin: 0; color: #1e3a8a; font-size: 22px;'>أوتوفكس لإدارة مراكز الصيانة | AutoFix Workshop</h1>
            <div style='color: #64748b; font-size: 12px;'>فاتورة ضريبية رسمية | Official Tax Invoice</div>
        </div>
        <div style='text-align: left;'>
            <div style='font-size: 18px; font-weight: bold; color: #2563eb;'>{invoice.InvoiceNumber}</div>
            <div class='badge'>الحالة: {invoice.Status}</div>
            <div style='color: #64748b; font-size: 11px; margin-top: 4px;'>التاريخ: {invoice.IssuedAt:yyyy-MM-dd HH:mm}</div>
        </div>
    </div>

    <div class='section-grid'>
        <div class='card' style='margin-bottom: 0;'>
            <h4>بيانات العميل (Customer Details)</h4>
            <div><strong>الاسم:</strong> <span dir='auto'>{invoice.Customer?.FullName}</span></div>
            <div><strong>الهاتف:</strong> <span dir='ltr'>{invoice.Customer?.Phone}</span></div>
            <div><strong>أمر الشغل المرجعي:</strong> {invoice.WorkOrder?.OrderNumber ?? "N/A"}</div>
        </div>
        <div class='card' style='margin-bottom: 0;'>
            <h4>بيانات السيارة (Vehicle Details)</h4>
            <div><strong>السيارة:</strong> <span dir='auto'>{invoice.Car?.Make} {invoice.Car?.Model} ({invoice.Car?.Year})</span></div>
            <div><strong>رقم اللوحة:</strong> <span dir='auto'>{invoice.Car?.LicensePlate}</span></div>
            <div><strong>رقم الشاسية / VIN:</strong> <span dir='ltr'>{invoice.Car?.VIN}</span></div>
        </div>
    </div>

    <!-- 1. Dedicated Workmanship Section (مصنعية) -->
    <div class='card' style='margin-top: 15px;'>
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
                    <th>قطع الغيار والمستهلكات (Part Description)</th>
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
            <div class='totals-row'><span>المجموع الفرعي (Subtotal):</span><span><span dir='ltr'>{invoice.Subtotal:N2}</span> ج.م</span></div>
            <div class='totals-row' style='font-size: 12px; color: #64748b;'><span>منها مصنعية (Workmanship):</span><span><span dir='ltr'>{workmanshipSubtotal:N2}</span> ج.م</span></div>
            <div class='totals-row' style='font-size: 12px; color: #64748b;'><span>منها قطع غيار (Parts):</span><span><span dir='ltr'>{partsSubtotal:N2}</span> ج.م</span></div>
            {(invoice.DiscountAmount > 0 ? $"<div class='totals-row' style='color: #ef4444;'><span>الخصم (Discount):</span><span>-<span dir='ltr'>{invoice.DiscountAmount:N2}</span> ج.م</span></div>" : "")}
            <div class='totals-row'><span>الوعاء الخاضع للضريبة:</span><span><span dir='ltr'>{Math.Max(0, invoice.Subtotal - invoice.DiscountAmount):N2}</span> ج.م</span></div>
            <div class='totals-row'><span>ضريبة القيمة المضافة ({invoice.VatPercentage}%):</span><span><span dir='ltr'>{invoice.VatAmount:N2}</span> ج.م</span></div>
            <div class='totals-row grand-total'><span>إجمالي الفاتورة (Total):</span><span><span dir='ltr'>{invoice.TotalAmount:N2}</span> ج.م</span></div>
            <div class='totals-row' style='color: #10b981; margin-top: 4px;'><span>المدفوع (Paid):</span><span><span dir='ltr'>{invoice.PaidAmount:N2}</span> ج.م</span></div>
            <div class='totals-row' style='font-weight: bold; color: {(invoice.RemainingAmount > 0 ? "#ef4444" : "#10b981")};'><span>المتبقي (Remaining):</span><span><span dir='ltr'>{invoice.RemainingAmount:N2}</span> ج.م</span></div>
        </div>
    </div>

    {(invoice.Status == "Credited" ? $@"
    <div style='margin-top: 20px; background: #fee2e2; border: 2px dashed #dc2626; border-radius: 6px; padding: 12px; text-align: center; color: #991b1b; font-weight: bold;'>
        ⚠️ فاتورة ملغاة بموجب إشعار دائن رسمي رقم (CN-{invoice.InvoiceNumber}) - تم استرداد المبالغ وإعادة القطع للمخزن
    </div>" : "")}

    <div class='signatures'>
        <div class='sig-block'>المحاسب المسؤول</div>
        <div class='sig-block'>إدارة المركز / الختم</div>
        <div class='sig-block'>توقيع واستلام العميل</div>
    </div>
</body>
</html>";
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

            // If payments were previously made, issue an automatic customer refund and record in Treasury
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

            // Restore stock if parts were issued from work order (once only)
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

