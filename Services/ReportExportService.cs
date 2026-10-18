using AutoFix.Data;
using AutoFix.Helpers;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class ReportExportService : IReportExportService
    {
        private readonly AppDbContext _db;

        public ReportExportService(AppDbContext db)
        {
            _db = db;
        }

        private static DateTime GetCairoNow() => DateTime.UtcNow.AddHours(2);
        private static DateTime ToCairoTime(DateTime utc) => utc.AddHours(2);

        public async Task<(byte[] content, string contentType, string fileName)> ExportSparePartsAsync(string? filter = null, string format = "xlsx")
        {
            var cairoNow = GetCairoNow();
            var fileNameBase = $"AP_Spareparts_{cairoNow:yyyy-MM-dd}";

            var query = _db.SpareParts.AsNoTracking();

            if (filter == "low")
            {
                query = query.Where(p => !p.IsDeleted && p.StockQuantity <= p.MinimumStockLevel && p.StockQuantity > 0);
            }
            else if (filter == "out")
            {
                query = query.Where(p => !p.IsDeleted && p.StockQuantity <= 0);
            }
            else if (filter == "archived")
            {
                query = query.Where(p => p.IsDeleted);
            }
            else
            {
                query = query.Where(p => !p.IsDeleted);
            }

            var parts = await query.OrderBy(p => p.Name).ToListAsync();

            if (format?.ToLowerInvariant() == "csv")
            {
                var sb = new StringBuilder();
                sb.AppendLine("رقم القطعة,الاسم,الفئة,الكمية,الحد الأدنى,سعر الشراء,سعر البيع,قيمة المخزون,المورد");
                foreach (var p in parts)
                {
                    var stockVal = (decimal)p.StockQuantity * p.PurchasePrice;
                    var name = !string.IsNullOrWhiteSpace(p.NameArabic) ? p.NameArabic : p.Name;
                    var supplier = !string.IsNullOrWhiteSpace(p.Brand) ? p.Brand : "-";
                    sb.AppendLine($"\"{p.PartNumber}\",\"{EscapeCsv(name)}\",\"{EscapeCsv(p.CategoryName)}\",{p.StockQuantity},{p.MinimumStockLevel},{p.PurchasePrice:F2},{p.UnitPrice:F2},{stockVal:F2},\"{EscapeCsv(supplier)}\"");
                }

                var preamble = Encoding.UTF8.GetPreamble();
                var textBytes = Encoding.UTF8.GetBytes(sb.ToString());
                var fullBytes = new byte[preamble.Length + textBytes.Length];
                Buffer.BlockCopy(preamble, 0, fullBytes, 0, preamble.Length);
                Buffer.BlockCopy(textBytes, 0, fullBytes, preamble.Length, textBytes.Length);

                return (fullBytes, "text/csv; charset=utf-8", $"{fileNameBase}.csv");
            }

            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("قطع الغيار");
            ws.RightToLeft = true;

            var headers = new[] { "رقم القطعة", "الاسم", "الفئة", "الكمية", "الحد الأدنى", "سعر الشراء", "سعر البيع", "قيمة المخزون", "المورد" };
            for (int i = 0; i < headers.Length; i++)
            {
                var cell = ws.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 41, 59);
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }

            int row = 2;
            foreach (var p in parts)
            {
                var stockVal = (decimal)p.StockQuantity * p.PurchasePrice;
                var name = !string.IsNullOrWhiteSpace(p.NameArabic) ? p.NameArabic : p.Name;
                var supplier = !string.IsNullOrWhiteSpace(p.Brand) ? p.Brand : "-";

                ws.Cell(row, 1).SetValue(p.PartNumber);
                ws.Cell(row, 2).SetValue(name);
                ws.Cell(row, 3).SetValue(p.CategoryName ?? "General");

                var cQty = ws.Cell(row, 4);
                cQty.SetValue(p.StockQuantity);
                cQty.Style.NumberFormat.Format = "#,##0";

                var cMin = ws.Cell(row, 5);
                cMin.SetValue(p.MinimumStockLevel);
                cMin.Style.NumberFormat.Format = "#,##0";

                var cBuy = ws.Cell(row, 6);
                cBuy.SetValue(p.PurchasePrice);
                cBuy.Style.NumberFormat.Format = "#,##0.00";

                var cSell = ws.Cell(row, 7);
                cSell.SetValue(p.UnitPrice);
                cSell.Style.NumberFormat.Format = "#,##0.00";

                var cVal = ws.Cell(row, 8);
                cVal.SetValue(stockVal);
                cVal.Style.NumberFormat.Format = "#,##0.00";

                ws.Cell(row, 9).SetValue(supplier);
                row++;
            }

            if (row > 2)
            {
                ws.Range(1, 1, row - 1, headers.Length).SetAutoFilter();
            }

            ws.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{fileNameBase}.xlsx");
        }

        public async Task<(byte[] content, string contentType, string fileName)> ExportBusinessReportAsync(string periodType, DateTime? selectedDate = null, int? selectedYear = null, int? selectedMonth = null)
        {
            var cairoNow = GetCairoNow();
            DateTime cairoStart, cairoEnd;
            string fileName;

            var pt = (periodType ?? "month").ToLowerInvariant();
            if (pt == "day")
            {
                var targetDay = selectedDate?.Date ?? cairoNow.Date;
                cairoStart = targetDay;
                cairoEnd = targetDay.AddDays(1).AddTicks(-1);
                fileName = $"AP_Report_{targetDay:yyyy-MM-dd}.xlsx";
            }
            else if (pt == "year")
            {
                var targetYear = selectedYear ?? selectedDate?.Year ?? cairoNow.Year;
                cairoStart = new DateTime(targetYear, 1, 1);
                cairoEnd = cairoStart.AddYears(1).AddTicks(-1);
                fileName = $"AP_Report_{targetYear}.xlsx";
            }
            else
            {
                var targetYear = selectedYear ?? selectedDate?.Year ?? cairoNow.Year;
                var targetMonth = selectedMonth ?? selectedDate?.Month ?? cairoNow.Month;
                cairoStart = new DateTime(targetYear, targetMonth, 1);
                cairoEnd = cairoStart.AddMonths(1).AddTicks(-1);
                var monthShort = cairoStart.ToString("MMM", CultureInfo.InvariantCulture);
                fileName = $"AP_Report_{monthShort}-{targetYear}.xlsx";
            }

            var utcStart = cairoStart.AddHours(-2);
            var utcEnd = cairoEnd.AddHours(-2);

            var workOrders = await _db.WorkOrders
                .Include(w => w.Customer)
                .Include(w => w.Car)
                .AsNoTracking()
                .Where(w => !w.IsDeleted && w.ReceivedAt >= utcStart && w.ReceivedAt <= utcEnd)
                .OrderBy(w => w.ReceivedAt)
                .ToListAsync();

            var invoices = await _db.Invoices
                .Include(i => i.Customer)
                .Include(i => i.Car)
                .Include(i => i.WorkOrder)
                .Include(i => i.Payments)
                .AsNoTracking()
                .Where(i => !i.IsDeleted && i.IssuedAt >= utcStart && i.IssuedAt <= utcEnd)
                .OrderBy(i => i.IssuedAt)
                .ToListAsync();

            var payments = await _db.InvoicePayments
                .Include(p => p.Invoice)
                .ThenInclude(i => i.Customer)
                .AsNoTracking()
                .Where(p => !p.IsDeleted && p.PaidAt >= utcStart && p.PaidAt <= utcEnd)
                .OrderBy(p => p.PaidAt)
                .ToListAsync();

            var orderLines = await _db.WorkOrderLines
                .Include(l => l.WorkOrder)
                .ThenInclude(w => w.Customer)
                .Include(l => l.WorkOrder)
                .ThenInclude(w => w.Car)
                .Include(l => l.SparePart)
                .AsNoTracking()
                .Where(l => !l.IsDeleted && l.WorkOrder != null && !l.WorkOrder.IsDeleted && l.WorkOrder.ReceivedAt >= utcStart && l.WorkOrder.ReceivedAt <= utcEnd)
                .OrderBy(l => l.AddedAt)
                .ToListAsync();

            var expenses = await _db.TreasuryTransactions
                .AsNoTracking()
                .Where(t => !t.IsDeleted && t.TransactionType == "Expense" && t.TransactionDate >= utcStart && t.TransactionDate <= utcEnd)
                .OrderBy(t => t.TransactionDate)
                .ToListAsync();

            var treasuryTxs = await _db.TreasuryTransactions
                .AsNoTracking()
                .Where(t => !t.IsDeleted && t.TransactionDate >= utcStart && t.TransactionDate <= utcEnd)
                .OrderBy(t => t.TransactionDate)
                .ToListAsync();

            var completedOrderPartLines = await _db.WorkOrderLines
                .Include(l => l.WorkOrder)
                .AsNoTracking()
                .Where(l => !l.IsDeleted && (l.LineType == "Part" || l.LineType == "SparePart") && l.WorkOrder != null && !l.WorkOrder.IsDeleted && l.WorkOrder.CompletedAt >= utcStart && l.WorkOrder.CompletedAt <= utcEnd)
                .ToListAsync();

            using var workbook = new XLWorkbook();

            BuildSummarySheet(workbook, pt, cairoStart, cairoEnd, utcStart, utcEnd, workOrders, invoices, payments, expenses, completedOrderPartLines);
            BuildInvoicesSheet(workbook, invoices);
            BuildPaymentsSheet(workbook, payments);
            BuildWorkOrderLinesSheet(workbook, orderLines, invoices);
            BuildExpensesSheet(workbook, expenses);
            BuildTreasurySheet(workbook, treasuryTxs);
            BuildCustomersSheet(workbook, workOrders, invoices, payments);

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        private void BuildSummarySheet(
            XLWorkbook wb,
            string periodType,
            DateTime cairoStart,
            DateTime cairoEnd,
            DateTime utcStart,
            DateTime utcEnd,
            List<WorkOrder> workOrders,
            List<Invoice> invoices,
            List<InvoicePayment> payments,
            List<TreasuryTransaction> expenses,
            List<WorkOrderLine> completedOrderPartLines)
        {
            var ws = wb.Worksheets.Add("ملخص");
            ws.RightToLeft = true;

            var activeInvoices = invoices.Where(i => i.Status != "Cancelled").ToList();
            var cancelledInvoices = invoices.Where(i => i.Status == "Cancelled").ToList();

            var validPayments = payments.Where(p => p.Invoice == null || (p.Invoice.Status != "Credited" && p.Invoice.Status != "Cancelled")).ToList();
            var creditNotes = payments.Where(p => p.Amount < 0 || p.PaymentMethod == "Refund").ToList();

            decimal totalInvoiced = activeInvoices.Sum(i => i.TotalAmount);
            decimal totalCollected = validPayments.Sum(p => p.Amount);
            decimal totalRemaining = activeInvoices.Sum(i => i.RemainingAmount);
            decimal totalRefunds = Math.Abs(creditNotes.Sum(p => p.Amount));
            decimal cancelledAmount = cancelledInvoices.Sum(i => i.TotalAmount);
            decimal totalExpenses = expenses.Sum(t => t.Amount);
            decimal sparePartsCost = completedOrderPartLines.Sum(l => l.Quantity * l.UnitCost);
            decimal netProfit = totalCollected - sparePartsCost - totalExpenses;

            ws.Cell(1, 1).SetValue("تقرير نشاط وأرباح الورشة - AP AUTO SERVICE CENTER").Style.Font.SetBold().Font.SetFontSize(14).Font.SetFontColor(XLColor.FromArgb(30, 41, 59));
            ws.Range(1, 1, 1, 3).Merge();

            ws.Cell(2, 1).SetValue($"تاريخ استخراج التقرير: {GetCairoNow():yyyy-MM-dd HH:mm} (توقيت القاهرة)").Style.Font.SetFontSize(10).Font.SetFontColor(XLColor.FromArgb(100, 116, 139));

            var kpis = new (string Label, object Value, string Format, string Note)[]
            {
                ("الفترة المحددة", $"{cairoStart:yyyy-MM-dd} إلى {cairoEnd:yyyy-MM-dd}", "@", ""),
                ("عدد كروت العمل المستلمة", workOrders.Count, "#,##0", "إجمالي كروت العمل غير المحذوفة"),
                ("عدد الفواتير المصدرة", activeInvoices.Count, "#,##0", "الفواتير الفعالة (غير الملغاة)"),
                ("إجمالي الفواتير", totalInvoiced, "#,##0.00", "قيمة الفواتير المصدرة بالفترة"),
                ("إجمالي المحصل", totalCollected, "#,##0.00", "المبالغ المحصلة فعلياً من العملاء"),
                ("إجمالي المتبقي للتحصيل", totalRemaining, "#,##0.00", "مستحقات غير محصلة"),
                ("إشعارات الدائن والمرتجعات", totalRefunds, "#,##0.00", $"عدد: {creditNotes.Count} إشعار دائن"),
                ("الفواتير الملغاة", cancelledAmount, "#,##0.00", $"عدد: {cancelledInvoices.Count} فاتورة (مستبعدة من الإيرادات)"),
                ("إجمالي المصروفات", totalExpenses, "#,##0.00", "مصروفات مسجلة بالخزينة"),
                ("تكلفة قطع الغيار المباعة", sparePartsCost, "#,##0.00", "تكلفة شراء القطع المستخدمة في الكروت المكتملة"),
                ("صافي الأرباح", netProfit, "#,##0.00", "المعادلة: إجمالي المحصل - تكلفة قطع الغيار - إجمالي المصروفات")
            };

            int startRow = 4;
            ws.Cell(startRow, 1).SetValue("المؤشر المالي / التشغيلي");
            ws.Cell(startRow, 2).SetValue("القيمة");
            ws.Cell(startRow, 3).SetValue("ملاحظات");
            ws.Range(startRow, 1, startRow, 3).Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));

            for (int i = 0; i < kpis.Length; i++)
            {
                int r = startRow + 1 + i;
                ws.Cell(r, 1).SetValue(kpis[i].Label).Style.Font.SetBold();

                var valCell = ws.Cell(r, 2);
                valCell.SetValue(kpis[i].Value is decimal d ? d : (kpis[i].Value is int n ? n : kpis[i].Value.ToString()));
                valCell.Style.NumberFormat.Format = kpis[i].Format;

                if (kpis[i].Label == "صافي الأرباح")
                {
                    valCell.Style.Font.SetBold().Font.SetFontColor(netProfit >= 0 ? XLColor.FromArgb(22, 163, 74) : XLColor.FromArgb(220, 38, 38));
                }

                ws.Cell(r, 3).SetValue(kpis[i].Note).Style.Font.SetFontColor(XLColor.FromArgb(100, 116, 139));
            }

            int tableStartRow = startRow + kpis.Length + 3;

            if (periodType == "month")
            {
                ws.Cell(tableStartRow, 1).SetValue("حركة الأيام خلال الشهر").Style.Font.SetBold().Font.SetFontSize(12);
                int thRow = tableStartRow + 1;
                var tableHeaders = new[] { "التاريخ", "عدد الفواتير", "إجمالي الفواتير", "المحصل", "المصروفات", "تكلفة القطع", "صافي الربح" };
                for (int h = 0; h < tableHeaders.Length; h++)
                {
                    ws.Cell(thRow, h + 1).SetValue(tableHeaders[h]).Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(51, 65, 85));
                }

                int daysCount = DateTime.DaysInMonth(cairoStart.Year, cairoStart.Month);
                int curRow = thRow + 1;
                int dataStartRow = curRow;

                for (int day = 1; day <= daysCount; day++)
                {
                    var dayCairoStart = new DateTime(cairoStart.Year, cairoStart.Month, day, 0, 0, 0);
                    var dayCairoEnd = dayCairoStart.AddDays(1).AddTicks(-1);
                    var dayUtcStart = dayCairoStart.AddHours(-2);
                    var dayUtcEnd = dayCairoEnd.AddHours(-2);

                    var dayInvoices = invoices.Where(i => i.Status != "Cancelled" && i.IssuedAt >= dayUtcStart && i.IssuedAt <= dayUtcEnd).ToList();
                    var dayPayments = payments.Where(p => p.PaidAt >= dayUtcStart && p.PaidAt <= dayUtcEnd && (p.Invoice == null || (p.Invoice.Status != "Credited" && p.Invoice.Status != "Cancelled"))).ToList();
                    var dayExpenses = expenses.Where(t => t.TransactionDate >= dayUtcStart && t.TransactionDate <= dayUtcEnd).ToList();
                    var dayParts = completedOrderPartLines.Where(l => l.WorkOrder != null && l.WorkOrder.CompletedAt >= dayUtcStart && l.WorkOrder.CompletedAt <= dayUtcEnd).ToList();

                    decimal dInv = dayInvoices.Sum(i => i.TotalAmount);
                    decimal dCol = dayPayments.Sum(p => p.Amount);
                    decimal dExp = dayExpenses.Sum(t => t.Amount);
                    decimal dCost = dayParts.Sum(l => l.Quantity * l.UnitCost);
                    decimal dNet = dCol - dCost - dExp;

                    ws.Cell(curRow, 1).SetValue(dayCairoStart.ToString("yyyy-MM-dd"));
                    ws.Cell(curRow, 2).SetValue(dayInvoices.Count).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(curRow, 3).SetValue(dInv).Style.NumberFormat.Format = "#,##0.00";
                    ws.Cell(curRow, 4).SetValue(dCol).Style.NumberFormat.Format = "#,##0.00";
                    ws.Cell(curRow, 5).SetValue(dExp).Style.NumberFormat.Format = "#,##0.00";
                    ws.Cell(curRow, 6).SetValue(dCost).Style.NumberFormat.Format = "#,##0.00";
                    ws.Cell(curRow, 7).SetValue(dNet).Style.NumberFormat.Format = "#,##0.00";
                    curRow++;
                }

                int sumRow = curRow;
                ws.Cell(sumRow, 1).SetValue("الإجمالي الكلي").Style.Font.SetBold();
                ws.Cell(sumRow, 2).SetFormulaA1($"=SUM(B{dataStartRow}:B{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0";
                ws.Cell(sumRow, 3).SetFormulaA1($"=SUM(C{dataStartRow}:C{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Cell(sumRow, 4).SetFormulaA1($"=SUM(D{dataStartRow}:D{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Cell(sumRow, 5).SetFormulaA1($"=SUM(E{dataStartRow}:E{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Cell(sumRow, 6).SetFormulaA1($"=SUM(F{dataStartRow}:F{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Cell(sumRow, 7).SetFormulaA1($"=SUM(G{dataStartRow}:G{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Range(sumRow, 1, sumRow, 7).Style.Fill.SetBackgroundColor(XLColor.FromArgb(241, 245, 249));
            }
            else if (periodType == "year")
            {
                ws.Cell(tableStartRow, 1).SetValue("حركة الأشهر خلال السنة").Style.Font.SetBold().Font.SetFontSize(12);
                int thRow = tableStartRow + 1;
                var tableHeaders = new[] { "الشهر", "عدد الفواتير", "إجمالي الفواتير", "المحصل", "المصروفات", "تكلفة القطع", "صافي الربح" };
                for (int h = 0; h < tableHeaders.Length; h++)
                {
                    ws.Cell(thRow, h + 1).SetValue(tableHeaders[h]).Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(51, 65, 85));
                }

                int curRow = thRow + 1;
                int dataStartRow = curRow;

                for (int m = 1; m <= 12; m++)
                {
                    var mCairoStart = new DateTime(cairoStart.Year, m, 1);
                    var mCairoEnd = mCairoStart.AddMonths(1).AddTicks(-1);
                    var mUtcStart = mCairoStart.AddHours(-2);
                    var mUtcEnd = mCairoEnd.AddHours(-2);

                    var mInvoices = invoices.Where(i => i.Status != "Cancelled" && i.IssuedAt >= mUtcStart && i.IssuedAt <= mUtcEnd).ToList();
                    var mPayments = payments.Where(p => p.PaidAt >= mUtcStart && p.PaidAt <= mUtcEnd && (p.Invoice == null || (p.Invoice.Status != "Credited" && p.Invoice.Status != "Cancelled"))).ToList();
                    var mExpenses = expenses.Where(t => t.TransactionDate >= mUtcStart && t.TransactionDate <= mUtcEnd).ToList();
                    var mParts = completedOrderPartLines.Where(l => l.WorkOrder != null && l.WorkOrder.CompletedAt >= mUtcStart && l.WorkOrder.CompletedAt <= mUtcEnd).ToList();

                    decimal mInv = mInvoices.Sum(i => i.TotalAmount);
                    decimal mCol = mPayments.Sum(p => p.Amount);
                    decimal mExp = mExpenses.Sum(t => t.Amount);
                    decimal mCost = mParts.Sum(l => l.Quantity * l.UnitCost);
                    decimal mNet = mCol - mCost - mExp;

                    ws.Cell(curRow, 1).SetValue(mCairoStart.ToString("yyyy-MMMM", new CultureInfo("ar-EG")));
                    ws.Cell(curRow, 2).SetValue(mInvoices.Count).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(curRow, 3).SetValue(mInv).Style.NumberFormat.Format = "#,##0.00";
                    ws.Cell(curRow, 4).SetValue(mCol).Style.NumberFormat.Format = "#,##0.00";
                    ws.Cell(curRow, 5).SetValue(mExp).Style.NumberFormat.Format = "#,##0.00";
                    ws.Cell(curRow, 6).SetValue(mCost).Style.NumberFormat.Format = "#,##0.00";
                    ws.Cell(curRow, 7).SetValue(mNet).Style.NumberFormat.Format = "#,##0.00";
                    curRow++;
                }

                int sumRow = curRow;
                ws.Cell(sumRow, 1).SetValue("الإجمالي الكلي").Style.Font.SetBold();
                ws.Cell(sumRow, 2).SetFormulaA1($"=SUM(B{dataStartRow}:B{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0";
                ws.Cell(sumRow, 3).SetFormulaA1($"=SUM(C{dataStartRow}:C{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Cell(sumRow, 4).SetFormulaA1($"=SUM(D{dataStartRow}:D{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Cell(sumRow, 5).SetFormulaA1($"=SUM(E{dataStartRow}:E{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Cell(sumRow, 6).SetFormulaA1($"=SUM(F{dataStartRow}:F{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Cell(sumRow, 7).SetFormulaA1($"=SUM(G{dataStartRow}:G{sumRow - 1})").Style.Font.SetBold().NumberFormat.Format = "#,##0.00";
                ws.Range(sumRow, 1, sumRow, 7).Style.Fill.SetBackgroundColor(XLColor.FromArgb(241, 245, 249));
            }

            ws.Columns().AdjustToContents();
        }

        private void BuildInvoicesSheet(XLWorkbook wb, List<Invoice> invoices)
        {
            var ws = wb.Worksheets.Add("الفواتير");
            ws.RightToLeft = true;

            var headers = new[]
            {
                "رقم الفاتورة", "التاريخ والوقت", "رقم كارت العمل", "العميل", "الهاتف",
                "رقم اللوحة", "السيارة", "الحالة", "المجموع الفرعي", "الخصم", "ضريبة القيمة المضافة",
                "الإجمالي", "المدفوع", "المتبقي"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                var c = ws.Cell(1, i + 1);
                c.SetValue(headers[i]);
                c.Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));
            }

            int row = 2;
            foreach (var inv in invoices)
            {
                var statusArabic = inv.Status switch
                {
                    "Paid" => "مدفوعة بالكامل",
                    "PartiallyPaid" => "مدفوعة جزئياً",
                    "Invoiced" => "بانتظار الدفع",
                    "Credited" => "إشعار دائن",
                    "Cancelled" => "ملغاة",
                    _ => inv.Status
                };

                ws.Cell(row, 1).SetValue(inv.InvoiceNumber);
                ws.Cell(row, 2).SetValue(ToCairoTime(inv.IssuedAt).ToString("yyyy-MM-dd HH:mm"));
                ws.Cell(row, 3).SetValue(inv.WorkOrder?.OrderNumber ?? "-");
                ws.Cell(row, 4).SetValue(inv.Customer?.FullName ?? "-");
                ws.Cell(row, 5).SetValue(inv.Customer?.Phone ?? "-");
                ws.Cell(row, 6).SetValue(inv.Car?.LicensePlate ?? "-");
                ws.Cell(row, 7).SetValue($"{inv.Car?.Make} {inv.Car?.Model}".Trim());
                ws.Cell(row, 8).SetValue(statusArabic);

                ws.Cell(row, 9).SetValue(inv.Subtotal).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 10).SetValue(inv.DiscountAmount).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 11).SetValue(inv.VatAmount).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 12).SetValue(inv.TotalAmount).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 13).SetValue(inv.PaidAmount).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 14).SetValue(inv.RemainingAmount).Style.NumberFormat.Format = "#,##0.00";

                row++;
            }

            if (row > 2)
            {
                ws.Range(1, 1, row - 1, headers.Length).SetAutoFilter();
            }

            ws.Columns().AdjustToContents();
        }

        private void BuildPaymentsSheet(XLWorkbook wb, List<InvoicePayment> payments)
        {
            var ws = wb.Worksheets.Add("المدفوعات");
            ws.RightToLeft = true;

            var headers = new[] { "التاريخ والوقت", "رقم الفاتورة", "العميل", "طريقة الدفع", "المبلغ" };
            for (int i = 0; i < headers.Length; i++)
            {
                var c = ws.Cell(1, i + 1);
                c.SetValue(headers[i]);
                c.Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));
            }

            int row = 2;
            foreach (var p in payments)
            {
                ws.Cell(row, 1).SetValue(ToCairoTime(p.PaidAt).ToString("yyyy-MM-dd HH:mm"));
                ws.Cell(row, 2).SetValue(p.Invoice?.InvoiceNumber ?? p.ReferenceNumber ?? "-");
                ws.Cell(row, 3).SetValue(p.Invoice?.Customer?.FullName ?? "-");
                ws.Cell(row, 4).SetValue(p.PaymentMethod ?? "Cash");

                var cAmt = ws.Cell(row, 5);
                cAmt.SetValue(p.Amount);
                cAmt.Style.NumberFormat.Format = "#,##0.00";
                if (p.Amount < 0)
                {
                    cAmt.Style.Font.SetFontColor(XLColor.FromArgb(220, 38, 38));
                }
                row++;
            }

            if (row > 2)
            {
                ws.Range(1, 1, row - 1, headers.Length).SetAutoFilter();
            }

            ws.Columns().AdjustToContents();
        }

        private void BuildWorkOrderLinesSheet(XLWorkbook wb, List<WorkOrderLine> lines, List<Invoice> invoices)
        {
            var ws = wb.Worksheets.Add("بنود الأعمال");
            ws.RightToLeft = true;

            var headers = new[]
            {
                "التاريخ والوقت", "رقم كارت العمل", "رقم الفاتورة", "العميل", "اللوحة",
                "نوع البند", "الوصف", "رقم القطعة", "الكمية", "سعر الوحدة", "إجمالي البند", "تكلفة الوحدة"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                var c = ws.Cell(1, i + 1);
                c.SetValue(headers[i]);
                c.Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));
            }

            var woToInvoiceMap = invoices.Where(i => i.WorkOrderId.HasValue).GroupBy(i => i.WorkOrderId!.Value).ToDictionary(g => g.Key, g => g.First().InvoiceNumber);

            int row = 2;
            foreach (var l in lines)
            {
                var typeArabic = l.LineType switch
                {
                    "SparePart" or "Part" => "قطعة غيار",
                    "Service" => "خدمة",
                    "Inspection" => "فحص",
                    _ => "مصنعية"
                };

                var lineTotal = (decimal)l.Quantity * l.UnitPrice;
                var date = ToCairoTime(l.AddedAt != default ? l.AddedAt : (l.WorkOrder != null ? l.WorkOrder.ReceivedAt : DateTime.UtcNow)).ToString("yyyy-MM-dd HH:mm");
                var invNum = woToInvoiceMap.TryGetValue(l.WorkOrderId, out var n) ? n : "-";

                ws.Cell(row, 1).SetValue(date);
                ws.Cell(row, 2).SetValue(l.WorkOrder?.OrderNumber ?? "-");
                ws.Cell(row, 3).SetValue(invNum);
                ws.Cell(row, 4).SetValue(l.WorkOrder?.Customer?.FullName ?? "-");
                ws.Cell(row, 5).SetValue(l.WorkOrder?.Car?.LicensePlate ?? "-");
                ws.Cell(row, 6).SetValue(typeArabic);
                ws.Cell(row, 7).SetValue(l.Description ?? "-");
                ws.Cell(row, 8).SetValue(l.SparePart?.PartNumber ?? "-");

                ws.Cell(row, 9).SetValue(l.Quantity).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 10).SetValue(l.UnitPrice).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 11).SetValue(lineTotal).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 12).SetValue(l.UnitCost).Style.NumberFormat.Format = "#,##0.00";

                row++;
            }

            if (row > 2)
            {
                ws.Range(1, 1, row - 1, headers.Length).SetAutoFilter();
            }

            ws.Columns().AdjustToContents();
        }

        private void BuildExpensesSheet(XLWorkbook wb, List<TreasuryTransaction> expenses)
        {
            var ws = wb.Worksheets.Add("المصروفات");
            ws.RightToLeft = true;

            var headers = new[] { "التاريخ والوقت", "التصنيف", "البيان / الوصف", "المبلغ" };
            for (int i = 0; i < headers.Length; i++)
            {
                var c = ws.Cell(1, i + 1);
                c.SetValue(headers[i]);
                c.Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));
            }

            int row = 2;
            foreach (var e in expenses)
            {
                ws.Cell(row, 1).SetValue(ToCairoTime(e.TransactionDate).ToString("yyyy-MM-dd HH:mm"));
                ws.Cell(row, 2).SetValue(e.Category ?? "General");
                ws.Cell(row, 3).SetValue(e.Description ?? "-");
                ws.Cell(row, 4).SetValue(e.Amount).Style.NumberFormat.Format = "#,##0.00";
                row++;
            }

            if (row > 2)
            {
                ws.Range(1, 1, row - 1, headers.Length).SetAutoFilter();
            }

            ws.Columns().AdjustToContents();
        }

        private void BuildTreasurySheet(XLWorkbook wb, List<TreasuryTransaction> txs)
        {
            var ws = wb.Worksheets.Add("الخزينة");
            ws.RightToLeft = true;

            var headers = new[] { "رقم الحركة", "التاريخ والوقت", "نوع الحركة", "التصنيف", "البيان / الوصف", "رقم المرجع", "المبلغ", "الرصيد بعد الحركة" };
            for (int i = 0; i < headers.Length; i++)
            {
                var c = ws.Cell(1, i + 1);
                c.SetValue(headers[i]);
                c.Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));
            }

            int row = 2;
            foreach (var t in txs)
            {
                var typeArabic = t.TransactionType switch
                {
                    "Income" => "تحصيل إيراد",
                    "Expense" => "مصروف",
                    "CustomerRefund" => "مرتجع عميل",
                    "OwnerDeposit" => "إيداع شريك",
                    "OwnerWithdrawal" => "مسحوبات",
                    _ => t.TransactionType
                };

                ws.Cell(row, 1).SetValue(t.Id);
                ws.Cell(row, 2).SetValue(ToCairoTime(t.TransactionDate).ToString("yyyy-MM-dd HH:mm"));
                ws.Cell(row, 3).SetValue(typeArabic);
                ws.Cell(row, 4).SetValue(t.Category ?? "General");
                ws.Cell(row, 5).SetValue(t.Description ?? "-");
                ws.Cell(row, 6).SetValue(t.ReferenceNumber ?? "-");
                ws.Cell(row, 7).SetValue(t.Amount).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 8).SetValue(t.BalanceAfter).Style.NumberFormat.Format = "#,##0.00";
                row++;
            }

            if (row > 2)
            {
                ws.Range(1, 1, row - 1, headers.Length).SetAutoFilter();
            }

            ws.Columns().AdjustToContents();
        }

        private void BuildCustomersSheet(XLWorkbook wb, List<WorkOrder> workOrders, List<Invoice> invoices, List<InvoicePayment> payments)
        {
            var ws = wb.Worksheets.Add("العملاء");
            ws.RightToLeft = true;

            var headers = new[] { "اسم العميل", "الهاتف", "عدد الزيارات بالفترة", "إجمالي الفواتير", "إجمالي المدفوع", "المتبقي" };
            for (int i = 0; i < headers.Length; i++)
            {
                var c = ws.Cell(1, i + 1);
                c.SetValue(headers[i]);
                c.Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));
            }

            var activeInvoices = invoices.Where(i => i.Status != "Cancelled").ToList();

            var customerIds = workOrders.Select(w => w.CustomerId)
                .Concat(activeInvoices.Select(i => i.CustomerId))
                .Distinct()
                .ToList();

            var customersDict = workOrders.Where(w => w.Customer != null).Select(w => w.Customer)
                .Concat(activeInvoices.Where(i => i.Customer != null).Select(i => i.Customer))
                .DistinctBy(c => c.Id)
                .ToDictionary(c => c.Id);

            int row = 2;
            foreach (var cid in customerIds)
            {
                if (!customersDict.TryGetValue(cid, out var cust)) continue;

                var cOrders = workOrders.Where(w => w.CustomerId == cid).ToList();
                var cInvoices = activeInvoices.Where(i => i.CustomerId == cid).ToList();

                decimal cInvoiced = cInvoices.Sum(i => i.TotalAmount);
                decimal cPaid = cInvoices.Sum(i => i.PaidAmount);
                decimal cRemaining = cInvoices.Sum(i => i.RemainingAmount);

                ws.Cell(row, 1).SetValue(cust.FullName);
                ws.Cell(row, 2).SetValue(cust.Phone ?? "-");
                ws.Cell(row, 3).SetValue(cOrders.Count).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 4).SetValue(cInvoiced).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 5).SetValue(cPaid).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(row, 6).SetValue(cRemaining).Style.NumberFormat.Format = "#,##0.00";
                row++;
            }

            if (row > 2)
            {
                ws.Range(1, 1, row - 1, headers.Length).SetAutoFilter();
            }

            ws.Columns().AdjustToContents();
        }

        public async Task<(byte[] content, string contentType, string fileName)> ExportCustomerRecordAsync(int customerId)
        {
            var customer = await _db.Customers
                .Include(c => c.Cars)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null)
            {
                throw new KeyNotFoundException($"Customer {customerId} not found");
            }

            var cairoNow = GetCairoNow();
            var rawPhone = customer.Phone ?? "Unknown";
            var safePhone = new string(rawPhone.Where(char.IsLetterOrDigit).ToArray());
            if (string.IsNullOrWhiteSpace(safePhone)) safePhone = $"ID{customer.Id}";
            var fileName = $"AP_Customer_{safePhone}_{cairoNow:yyyy-MM-dd}.xlsx";

            var workOrders = await _db.WorkOrders
                .Include(w => w.Car)
                .Include(w => w.Lines)
                .ThenInclude(l => l.SparePart)
                .AsNoTracking()
                .Where(w => w.CustomerId == customerId && !w.IsDeleted)
                .OrderByDescending(w => w.ReceivedAt)
                .ToListAsync();

            var invoices = await _db.Invoices
                .Include(i => i.Car)
                .Include(i => i.WorkOrder)
                .Include(i => i.Payments)
                .AsNoTracking()
                .Where(i => i.CustomerId == customerId && !i.IsDeleted)
                .OrderByDescending(i => i.IssuedAt)
                .ToListAsync();

            var payments = await _db.InvoicePayments
                .Include(p => p.Invoice)
                .AsNoTracking()
                .Where(p => !p.IsDeleted && p.Invoice != null && p.Invoice.CustomerId == customerId)
                .OrderByDescending(p => p.PaidAt)
                .ToListAsync();

            using var workbook = new XLWorkbook();

            var wsProfile = workbook.Worksheets.Add("بيانات العميل والسيارات");
            wsProfile.RightToLeft = true;

            wsProfile.Cell(1, 1).SetValue("ملف وسجل العميل").Style.Font.SetBold().Font.SetFontSize(14).Font.SetFontColor(XLColor.FromArgb(30, 41, 59));
            wsProfile.Cell(2, 1).SetValue($"اسم العميل: {customer.FullName}").Style.Font.SetBold();
            wsProfile.Cell(3, 1).SetValue($"رقم الهاتف: {customer.Phone}");
            wsProfile.Cell(4, 1).SetValue($"هاتف إضافي: {customer.ExtraPhone ?? "-"}");
            wsProfile.Cell(5, 1).SetValue($"العنوان: {customer.Address ?? "-"}");
            wsProfile.Cell(6, 1).SetValue($"البريد الإلكتروني: {customer.Email ?? "-"}");
            wsProfile.Cell(7, 1).SetValue($"إجمالي الزيارات: {workOrders.Count}");

            decimal totalInvoiced = invoices.Where(i => i.Status != "Cancelled").Sum(i => i.TotalAmount);
            decimal totalPaid = invoices.Where(i => i.Status != "Cancelled").Sum(i => i.PaidAmount);
            decimal balanceDue = totalInvoiced - totalPaid;

            wsProfile.Cell(8, 1).SetValue($"إجمالي الفواتير: {totalInvoiced:N2} ج.م");
            wsProfile.Cell(9, 1).SetValue($"إجمالي المدفوع: {totalPaid:N2} ج.م");
            wsProfile.Cell(10, 1).SetValue($"المتبقي المطلوب: {balanceDue:N2} ج.م").Style.Font.SetBold().Font.SetFontColor(balanceDue > 0 ? XLColor.FromArgb(220, 38, 38) : XLColor.FromArgb(22, 163, 74));

            wsProfile.Cell(12, 1).SetValue("السيارات المسجلة للعميل").Style.Font.SetBold().Font.SetFontSize(12);
            var carHeaders = new[] { "رقم اللوحة", "الماركة", "الموديل", "سنة الصنع", "رقم الشاسيه (VIN)", "قراءة العداد الحالية" };
            for (int h = 0; h < carHeaders.Length; h++)
            {
                wsProfile.Cell(13, h + 1).SetValue(carHeaders[h]).Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(51, 65, 85));
            }
            int carRow = 14;
            foreach (var car in customer.Cars.Where(c => !c.IsDeleted))
            {
                wsProfile.Cell(carRow, 1).SetValue(car.LicensePlate);
                wsProfile.Cell(carRow, 2).SetValue(car.Make);
                wsProfile.Cell(carRow, 3).SetValue(car.Model);
                wsProfile.Cell(carRow, 4).SetValue(car.Year).Style.NumberFormat.Format = "0";
                wsProfile.Cell(carRow, 5).SetValue(car.VIN ?? "-");
                wsProfile.Cell(carRow, 6).SetValue(car.CurrentOdometerKm).Style.NumberFormat.Format = "#,##0";
                carRow++;
            }
            wsProfile.Columns().AdjustToContents();

            var wsVisits = workbook.Worksheets.Add("الزيارات والفواتير");
            wsVisits.RightToLeft = true;
            var visitHeaders = new[] { "تاريخ الزيارة", "رقم كارت العمل", "السيارة واللوحة", "نوع العمل", "الحالة", "رقم الفاتورة", "إجمالي الفاتورة", "المدفوع", "المتبقي" };
            for (int h = 0; h < visitHeaders.Length; h++)
            {
                wsVisits.Cell(1, h + 1).SetValue(visitHeaders[h]).Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));
            }
            int vRow = 2;
            foreach (var w in workOrders)
            {
                var inv = invoices.FirstOrDefault(i => i.WorkOrderId == w.Id);
                wsVisits.Cell(vRow, 1).SetValue(ToCairoTime(w.ReceivedAt).ToString("yyyy-MM-dd"));
                wsVisits.Cell(vRow, 2).SetValue(w.OrderNumber);
                wsVisits.Cell(vRow, 3).SetValue($"{w.Car?.Make} {w.Car?.Model} - {w.Car?.LicensePlate}".Trim());
                wsVisits.Cell(vRow, 4).SetValue(w.WorkType == "Inspection" ? "فحص" : "صيانة");
                wsVisits.Cell(vRow, 5).SetValue(w.Status);
                wsVisits.Cell(vRow, 6).SetValue(inv?.InvoiceNumber ?? "-");
                wsVisits.Cell(vRow, 7).SetValue(inv?.TotalAmount ?? w.TotalAmount).Style.NumberFormat.Format = "#,##0.00";
                wsVisits.Cell(vRow, 8).SetValue(inv?.PaidAmount ?? 0).Style.NumberFormat.Format = "#,##0.00";
                wsVisits.Cell(vRow, 9).SetValue(inv?.RemainingAmount ?? w.TotalAmount).Style.NumberFormat.Format = "#,##0.00";
                vRow++;
            }
            if (vRow > 2) wsVisits.Range(1, 1, vRow - 1, visitHeaders.Length).SetAutoFilter();
            wsVisits.Columns().AdjustToContents();

            var wsPay = workbook.Worksheets.Add("المدفوعات");
            wsPay.RightToLeft = true;
            var payHeaders = new[] { "التاريخ والوقت", "رقم الفاتورة", "طريقة الدفع", "رقم المرجع", "المبلغ" };
            for (int h = 0; h < payHeaders.Length; h++)
            {
                wsPay.Cell(1, h + 1).SetValue(payHeaders[h]).Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));
            }
            int pRow = 2;
            foreach (var p in payments)
            {
                wsPay.Cell(pRow, 1).SetValue(ToCairoTime(p.PaidAt).ToString("yyyy-MM-dd HH:mm"));
                wsPay.Cell(pRow, 2).SetValue(p.Invoice?.InvoiceNumber ?? "-");
                wsPay.Cell(pRow, 3).SetValue(p.PaymentMethod);
                wsPay.Cell(pRow, 4).SetValue(p.ReferenceNumber ?? "-");
                var cAmt = wsPay.Cell(pRow, 5);
                cAmt.SetValue(p.Amount);
                cAmt.Style.NumberFormat.Format = "#,##0.00";
                if (p.Amount < 0) cAmt.Style.Font.SetFontColor(XLColor.FromArgb(220, 38, 38));
                pRow++;
            }
            if (pRow > 2) wsPay.Range(1, 1, pRow - 1, payHeaders.Length).SetAutoFilter();
            wsPay.Columns().AdjustToContents();

            var wsParts = workbook.Worksheets.Add("القطع المستخدمة");
            wsParts.RightToLeft = true;
            var partsHeaders = new[] { "التاريخ", "رقم كارت العمل", "لوحة السيارة", "رقم القطعة", "الوصف", "الكمية", "سعر البيع", "الإجمالي" };
            for (int h = 0; h < partsHeaders.Length; h++)
            {
                wsParts.Cell(1, h + 1).SetValue(partsHeaders[h]).Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromArgb(30, 41, 59));
            }
            int prtRow = 2;
            foreach (var w in workOrders)
            {
                foreach (var line in w.Lines.Where(l => !l.IsDeleted && (l.LineType == "Part" || l.LineType == "SparePart")))
                {
                    wsParts.Cell(prtRow, 1).SetValue(ToCairoTime(line.AddedAt != default ? line.AddedAt : w.ReceivedAt).ToString("yyyy-MM-dd"));
                    wsParts.Cell(prtRow, 2).SetValue(w.OrderNumber);
                    wsParts.Cell(prtRow, 3).SetValue(w.Car?.LicensePlate ?? "-");
                    wsParts.Cell(prtRow, 4).SetValue(line.SparePart?.PartNumber ?? "-");
                    wsParts.Cell(prtRow, 5).SetValue(line.Description ?? "-");
                    wsParts.Cell(prtRow, 6).SetValue(line.Quantity).Style.NumberFormat.Format = "#,##0";
                    wsParts.Cell(prtRow, 7).SetValue(line.UnitPrice).Style.NumberFormat.Format = "#,##0.00";
                    wsParts.Cell(prtRow, 8).SetValue((decimal)line.Quantity * line.UnitPrice).Style.NumberFormat.Format = "#,##0.00";
                    prtRow++;
                }
            }
            if (prtRow > 2) wsParts.Range(1, 1, prtRow - 1, partsHeaders.Length).SetAutoFilter();
            wsParts.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        private static string EscapeCsv(string? val) => (val ?? string.Empty).Replace("\"", "\"\"");
    }
}
