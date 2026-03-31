using AutoFix.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Jobs
{
    public class OverdueOrderJob
    {
        private readonly AppDbContext _db;
        private readonly ILogger<OverdueOrderJob> _logger;

        public OverdueOrderJob(AppDbContext db, ILogger<OverdueOrderJob> logger)
        {
            _db     = db;
            _logger = logger;
        }

        public async Task FlagOverdueOrdersAsync()
        {
            var cutoff = DateTime.UtcNow.AddDays(-3);

            var overdueOrders = await _db.RepairOrders
                .AsNoTracking()
                .Where(ro => ro.Status == "InProgress" && ro.CreatedAt < cutoff)
                .Select(ro => new { ro.Id, ro.CreatedAt, CarPlate = ro.Car.LicensePlate })
                .ToListAsync();

            foreach (var order in overdueOrders)
            {
                _logger.LogWarning(
                    "Overdue repair order #{Id} for car {Plate} — in progress since {Date}",
                    order.Id, order.CarPlate, order.CreatedAt);
            }

            _logger.LogInformation(
                "Overdue check complete. {Count} overdue orders found.", overdueOrders.Count);
        }

        public async Task FlagLowStockPartsAsync()
        {
            var lowStockParts = await _db.SpareParts
                .AsNoTracking()
                .Where(sp => sp.IsActive && sp.StockQuantity <= sp.MinimumStockLevel)
                .Select(sp => new
                {
                    sp.Id,
                    sp.Name,
                    sp.PartNumber,
                    sp.StockQuantity,
                    sp.MinimumStockLevel,
                    CategoryName = sp.Category.Name
                })
                .ToListAsync();

            foreach (var part in lowStockParts)
            {
                _logger.LogWarning(
                    "Low stock: [{Category}] {Name} (#{PartNumber}) — {Stock} units remaining, minimum is {Min}",
                    part.CategoryName, part.Name, part.PartNumber,
                    part.StockQuantity, part.MinimumStockLevel);
            }

            _logger.LogInformation(
                "Low stock check complete. {Count} parts need restocking.", lowStockParts.Count);
        }
    }
}
