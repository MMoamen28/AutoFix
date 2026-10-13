using AutoFix.Data;
using AutoFix.DTOs.Dashboard;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _db;
        private readonly IWorkOrderService _workOrderService;

        public DashboardService(AppDbContext db, IWorkOrderService workOrderService)
        {
            _db = db;
            _workOrderService = workOrderService;
        }

        public async Task<AdminDashboardDto> GetAdminDashboardAsync()
        {
            var cairoNow = InvoiceService.GetCairoNow();
            var cairoToday = cairoNow.Date;
            var cairoMonthStart = new DateTime(cairoNow.Year, cairoNow.Month, 1);

            // Active jobs: non-deleted, non-final orders (Pending, InProgress, WaitingForParts, Completed)
            var activeOrders = await _db.WorkOrders.AsNoTracking()
                .Where(w => !w.IsDeleted && w.Status != "Invoiced" && w.Status != "Cancelled" && w.Status != "Credited" && w.Status != "Delivered")
                .ToListAsync();

            var pendingCount = activeOrders.Count(w => w.Status == "Pending");
            var inProgressCount = activeOrders.Count(w => w.Status == "InProgress" || w.Status == "WaitingForParts");
            var completedCount = activeOrders.Count(w => w.Status == "Completed");
            var deliveredCount = await _db.WorkOrders.CountAsync(w => !w.IsDeleted && w.Status == "Delivered");
            var totalActive = activeOrders.Count;

            // Revenues: payments collected minus refunds in Cairo timezone
            var payments = await _db.InvoicePayments.AsNoTracking()
                .Where(p => !p.IsDeleted)
                .ToListAsync();

            decimal todayRevenue = 0;
            decimal monthRevenue = 0;

            foreach (var p in payments)
            {
                var pDate = p.PaidAt.AddHours(2).Date;
                if (pDate == cairoToday)
                {
                    todayRevenue += p.Amount;
                }
                if (pDate >= cairoMonthStart && pDate <= cairoToday)
                {
                    monthRevenue += p.Amount;
                }
            }

            // Outstanding receivables: invoices total minus payments (excluding Credited, Paid, Cancelled, and soft-deleted)
            var activeInvoices = await _db.Invoices.AsNoTracking()
                .Where(i => !i.IsDeleted && i.Status != "Paid" && i.Status != "Cancelled" && i.Status != "Credited")
                .ToListAsync();

            var outstanding = activeInvoices.Sum(i => Math.Max(0, i.TotalAmount - i.PaidAmount));

            var totalCustomers = await _db.Customers.CountAsync(c => !c.IsDeleted);
            var totalCars = await _db.Cars.CountAsync(c => !c.IsDeleted);
            var lowStockCount = await _db.SpareParts.CountAsync(sp => !sp.IsDeleted && sp.StockQuantity <= sp.MinimumStockLevel);
            var totalInspections = await _db.CarInspections.CountAsync(ci => !ci.IsDeleted);

            var recentOrders = await _workOrderService.GetAllAsync();
            var recentInspections = await _db.CarInspections
                .AsNoTracking()
                .OrderByDescending(ci => ci.InspectedAt)
                .Take(5)
                .Select(ci => new RecentInspectionSummaryDto
                {
                    Id = ci.Id,
                    ReportNumber = ci.ReportNumber,
                    CustomerName = ci.CustomerName,
                    CarPlate = ci.CarPlate,
                    CarMakeModel = $"{ci.CarMake} {ci.CarModel}",
                    OverallScore = ci.OverallScore,
                    GeneralVerdict = ci.GeneralVerdict,
                    Status = ci.Status,
                    InspectedAt = ci.InspectedAt
                })
                .ToListAsync();

            return new AdminDashboardDto
            {
                TotalActiveWorkOrders = totalActive,
                PendingOrdersCount = pendingCount,
                InProgressOrdersCount = inProgressCount,
                CompletedOrdersCount = completedCount,
                DeliveredOrdersCount = deliveredCount,
                TodayRevenue = todayRevenue,
                MonthRevenue = monthRevenue,
                OutstandingReceivables = outstanding,
                TotalCustomers = totalCustomers,
                TotalCars = totalCars,
                LowStockPartsCount = lowStockCount,
                TotalInspectionsCount = totalInspections,
                RecentWorkOrders = recentOrders.Take(5).ToList(),
                RecentInspections = recentInspections
            };
        }

        public async Task<CustomerDashboardDto?> GetCustomerDashboardAsync(int customerId)
        {
            var customer = await _db.Customers
                .Include(c => c.Cars)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null) return null;

            var cars = customer.Cars.Select(c => new CustomerCarSummaryDto
            {
                Id = c.Id,
                Make = c.Make,
                Model = c.Model,
                Year = c.Year,
                LicensePlate = c.LicensePlate,
                VIN = c.VIN,
                CurrentOdometerKm = c.CurrentOdometerKm,
                Color = c.Color
            }).ToList();

            var allOrders = await _workOrderService.GetAllAsync(customerId: customerId);
            var activeOrders = allOrders.Where(o => o.Status != "Delivered" && o.Status != "Invoiced" && o.Status != "Cancelled").ToList();
            var orderHistory = allOrders.Where(o => o.Status == "Delivered" || o.Status == "Invoiced" || o.Status == "Cancelled").ToList();

            var invoices = await _db.Invoices
                .AsNoTracking()
                .Where(i => i.CustomerId == customerId)
                .OrderByDescending(i => i.IssuedAt)
                .Select(i => new CustomerInvoiceSummaryDto
                {
                    Id = i.Id,
                    InvoiceNumber = i.InvoiceNumber,
                    TotalAmount = i.TotalAmount,
                    PaidAmount = i.PaidAmount,
                    RemainingAmount = i.RemainingAmount,
                    Status = i.Status,
                    IssuedAt = i.IssuedAt
                })
                .ToListAsync();

            var inspections = await _db.CarInspections
                .AsNoTracking()
                .Where(ci => ci.CustomerId == customerId && ci.Status == "Final" && ci.IsCurrentRevision)
                .OrderByDescending(ci => ci.InspectedAt)
                .Select(ci => new CustomerInspectionSummaryDto
                {
                    Id = ci.Id,
                    ReportNumber = ci.ReportNumber,
                    CarPlate = ci.CarPlate,
                    CarMakeModel = $"{ci.CarMake} {ci.CarModel}",
                    OverallScore = ci.OverallScore,
                    GeneralVerdict = ci.GeneralVerdict,
                    InspectedAt = ci.InspectedAt,
                    Status = ci.Status,
                    RevisionNumber = ci.RevisionNumber
                })
                .ToListAsync();

            return new CustomerDashboardDto
            {
                CustomerId = customer.Id,
                CustomerName = customer.FullName,
                Phone = customer.Phone,
                Email = customer.Email,
                MyCars = cars,
                ActiveOrders = activeOrders,
                OrderHistory = orderHistory,
                Invoices = invoices,
                FinalizedInspections = inspections
            };
        }

        public async Task<FinancialSummaryDto> GetFinancialSummaryAsync(string period, DateTime? startDate = null, DateTime? endDate = null)
        {
            var cairoNow = InvoiceService.GetCairoNow();
            DateTime currentStart, currentEnd = cairoNow;
            DateTime prevStart, prevEnd;

            switch (period?.ToLowerInvariant())
            {
                case "today":
                    currentStart = cairoNow.Date;
                    prevStart = currentStart.AddDays(-1);
                    prevEnd = currentStart.AddSeconds(-1);
                    break;
                case "week":
                    currentStart = cairoNow.Date.AddDays(-6);
                    prevStart = currentStart.AddDays(-7);
                    prevEnd = currentStart.AddSeconds(-1);
                    break;
                case "year":
                    currentStart = new DateTime(cairoNow.Year, 1, 1);
                    prevStart = new DateTime(cairoNow.Year - 1, 1, 1);
                    prevEnd = new DateTime(cairoNow.Year - 1, cairoNow.Month, cairoNow.Day);
                    break;
                case "custom":
                    currentStart = startDate ?? cairoNow.Date.AddDays(-30);
                    currentEnd = endDate ?? cairoNow;
                    var duration = currentEnd - currentStart;
                    prevStart = currentStart - duration;
                    prevEnd = currentStart.AddSeconds(-1);
                    break;
                case "month":
                default:
                    currentStart = new DateTime(cairoNow.Year, cairoNow.Month, 1);
                    var prevMonth = cairoNow.AddMonths(-1);
                    prevStart = new DateTime(prevMonth.Year, prevMonth.Month, 1);
                    prevEnd = new DateTime(prevMonth.Year, prevMonth.Month, Math.Min(cairoNow.Day, DateTime.DaysInMonth(prevMonth.Year, prevMonth.Month)));
                    break;
            }

            // Convert to UTC for database comparison
            var currentStartUtc = currentStart.AddHours(-2);
            var currentEndUtc = currentEnd.AddHours(-2);
            var prevStartUtc = prevStart.AddHours(-2);
            var prevEndUtc = prevEnd.AddHours(-2);

            // 1. Current period revenues (excluding Credited invoices)
            var currentPayments = await _db.InvoicePayments
                .Include(p => p.Invoice)
                .AsNoTracking()
                .Where(p => !p.IsDeleted && p.PaidAt >= currentStartUtc && p.PaidAt <= currentEndUtc && (p.Invoice == null || p.Invoice.Status != "Credited"))
                .ToListAsync();

            decimal currentRevenue = currentPayments.Sum(p => p.Amount);

            // Previous period revenues
            var prevPayments = await _db.InvoicePayments
                .Include(p => p.Invoice)
                .AsNoTracking()
                .Where(p => !p.IsDeleted && p.PaidAt >= prevStartUtc && p.PaidAt <= prevEndUtc && (p.Invoice == null || p.Invoice.Status != "Credited"))
                .ToListAsync();

            decimal prevRevenue = prevPayments.Sum(p => p.Amount);

            // 2. Current expenses
            var currentExpenses = await _db.TreasuryTransactions
                .AsNoTracking()
                .Where(t => !t.IsDeleted && t.TransactionType == "Expense" && t.TransactionDate >= currentStartUtc && t.TransactionDate <= currentEndUtc)
                .ToListAsync();

            decimal currentExpenseTotal = currentExpenses.Sum(t => t.Amount);

            var prevExpenses = await _db.TreasuryTransactions
                .AsNoTracking()
                .Where(t => !t.IsDeleted && t.TransactionType == "Expense" && t.TransactionDate >= prevStartUtc && t.TransactionDate <= prevEndUtc)
                .ToListAsync();

            decimal prevExpenseTotal = prevExpenses.Sum(t => t.Amount);

            // 3. Cost of sold parts (from WorkOrderLines on invoiced orders in current period)
            var currentPartLines = await _db.WorkOrderLines
                .Include(l => l.WorkOrder)
                .AsNoTracking()
                .Where(l => !l.IsDeleted && (l.LineType == "Part" || l.LineType == "SparePart") && l.WorkOrder != null && !l.WorkOrder.IsDeleted && l.WorkOrder.CompletedAt >= currentStartUtc && l.WorkOrder.CompletedAt <= currentEndUtc)
                .ToListAsync();

            decimal currentPartCost = currentPartLines.Sum(l => l.Quantity * l.UnitCost);

            var prevPartLines = await _db.WorkOrderLines
                .Include(l => l.WorkOrder)
                .AsNoTracking()
                .Where(l => !l.IsDeleted && (l.LineType == "Part" || l.LineType == "SparePart") && l.WorkOrder != null && !l.WorkOrder.IsDeleted && l.WorkOrder.CompletedAt >= prevStartUtc && l.WorkOrder.CompletedAt <= prevEndUtc)
                .ToListAsync();

            decimal prevPartCost = prevPartLines.Sum(l => l.Quantity * l.UnitCost);

            decimal currentNetProfit = currentRevenue - currentPartCost - currentExpenseTotal;
            decimal prevNetProfit = prevRevenue - prevPartCost - prevExpenseTotal;

            // Trend points (daily breakdown for chart)
            var trend = new System.Collections.Generic.List<decimal>();
            int days = Math.Max(1, (int)(currentEnd.Date - currentStart.Date).TotalDays + 1);
            int step = Math.Max(1, days / 7);
            for (var d = currentStart.Date; d <= currentEnd.Date; d = d.AddDays(step))
            {
                var dUtcStart = d.AddHours(-2);
                var dUtcEnd = d.AddDays(step).AddHours(-2);
                var dailySum = currentPayments
                    .Where(p => p.PaidAt >= dUtcStart && p.PaidAt < dUtcEnd)
                    .Sum(p => p.Amount);
                trend.Add(dailySum);
            }
            if (trend.Count < 2)
            {
                trend.Add(currentRevenue);
            }

            decimal revChange = prevRevenue > 0 ? Math.Round(((currentRevenue - prevRevenue) / prevRevenue) * 100m, 1) : 0m;
            decimal expChange = prevExpenseTotal > 0 ? Math.Round(((currentExpenseTotal - prevExpenseTotal) / prevExpenseTotal) * 100m, 1) : 0m;
            decimal profChange = Math.Abs(prevNetProfit) > 0 ? Math.Round(((currentNetProfit - prevNetProfit) / Math.Abs(prevNetProfit)) * 100m, 1) : 0m;

            return new FinancialSummaryDto
            {
                Period = period ?? "month",
                TotalRevenue = currentRevenue,
                TotalExpenses = currentExpenseTotal,
                NetProfit = currentNetProfit,
                RevenueChangePercentage = revChange,
                ExpenseChangePercentage = expChange,
                ProfitChangePercentage = profChange,
                RevenueTrend = trend
            };
        }
    }
}
