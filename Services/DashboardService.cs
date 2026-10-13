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
    }
}
