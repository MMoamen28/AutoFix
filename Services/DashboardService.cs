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
            var now = DateTime.UtcNow;
            var todayStart = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var orders = await _db.WorkOrders.AsNoTracking().ToListAsync();

            var pendingCount = orders.Count(w => w.Status == "Pending");
            var inProgressCount = orders.Count(w => w.Status == "InProgress" || w.Status == "WaitingForParts");
            var completedCount = orders.Count(w => w.Status == "Completed");
            var deliveredCount = orders.Count(w => w.Status == "Delivered");
            var totalActive = pendingCount + inProgressCount + completedCount;

            // Revenues from payments
            var payments = await _db.InvoicePayments.AsNoTracking().ToListAsync();
            var todayRevenue = payments.Where(p => p.PaidAt >= todayStart).Sum(p => p.Amount);
            var monthRevenue = payments.Where(p => p.PaidAt >= monthStart).Sum(p => p.Amount);

            // Outstanding receivables (excluding Paid, Cancelled, and Credited)
            var invoices = await _db.Invoices.AsNoTracking().ToListAsync();
            var outstanding = invoices.Where(i => i.Status != "Paid" && i.Status != "Cancelled" && i.Status != "Credited").Sum(i => i.RemainingAmount);

            var totalCustomers = await _db.Customers.CountAsync();
            var totalCars = await _db.Cars.CountAsync();
            var lowStockCount = await _db.SpareParts.CountAsync(sp => sp.StockQuantity <= sp.MinimumStockLevel);
            var totalInspections = await _db.CarInspections.CountAsync();

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
