using AutoFix.Models;
using System.Linq;

namespace AutoFix.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            // 1. Default Warehouse
            if (!context.Warehouses.Any())
            {
                context.Warehouses.Add(new Warehouse
                {
                    Name = "Main Warehouse (المخزن الرئيسي)",
                    Code = "WH-01",
                    Location = "Section A",
                    IsDefault = true
                });
            }

            // 2. Services / Workmanship Price List
            var services = new[]
            {
                new { Name = "Brake pads replacement", NameAr = "تغيير تيل فرامل", Category = "Mechanical", Price = 250.00m, Cost = 100.00m, Minutes = 45 },
                new { Name = "Oil change", NameAr = "تغيير زيت وفلتر", Category = "Oils", Price = 100.00m, Cost = 40.00m, Minutes = 30 },
                new { Name = "AC service", NameAr = "صيانة وشحن تكييف", Category = "Mechanical", Price = 400.00m, Cost = 150.00m, Minutes = 60 },
                new { Name = "Computer Diagnostics", NameAr = "فحص كمبيوتر وأعطال", Category = "Electrical", Price = 300.00m, Cost = 100.00m, Minutes = 20 }
            };

            foreach (var s in services)
            {
                var existing = context.Services.FirstOrDefault(x => x.Name == s.Name || x.NameArabic == s.NameAr);
                if (existing == null)
                {
                    context.Services.Add(new Service
                    {
                        Name = s.Name,
                        NameArabic = s.NameAr,
                        Category = s.Category,
                        Description = s.Name,
                        BasePrice = s.Price,
                        DefaultCost = s.Cost,
                        EstimatedMinutes = s.Minutes,
                        IsActive = true
                    });
                }
                else
                {
                    if (string.IsNullOrEmpty(existing.NameArabic))
                    {
                        existing.NameArabic = s.NameAr;
                    }
                }
            }

            // 3. Spare Parts
            var parts = new[]
            {
                new { Name = "Oil Filter", NameAr = "فلتر زيت محرك", Code = "PN-OILFILTER", Price = 180.00m, Cost = 120.00m, Qty = 50, Min = 10, Shelf = "A-01" },
                new { Name = "Brake Pad Set", NameAr = "طقم تيل فرامل أمامي", Code = "PN-BRAKEPAD", Price = 650.00m, Cost = 450.00m, Qty = 25, Min = 5, Shelf = "B-03" },
                new { Name = "Engine Oil 5W-30 (4L)", NameAr = "زيت محرك 5W-30 (4 لتر)", Code = "PN-OIL5W30", Price = 950.00m, Cost = 750.00m, Qty = 40, Min = 8, Shelf = "A-02" },
                new { Name = "Headlight Bulb", NameAr = "لمبة إضاءة أمامية H7", Code = "PN-BULBH7", Price = 90.00m, Cost = 50.00m, Qty = 30, Min = 5, Shelf = "C-01" }
            };

            foreach (var p in parts)
            {
                if (!context.SpareParts.Any(x => x.PartNumber == p.Code))
                {
                    context.SpareParts.Add(new SparePart
                    {
                        Name = p.Name,
                        NameArabic = p.NameAr,
                        PartNumber = p.Code,
                        Brand = "AutoFix",
                        PurchasePrice = p.Cost,
                        UnitPrice = p.Price,
                        StockQuantity = p.Qty,
                        MinimumStockLevel = p.Min,
                        ShelfLocation = p.Shelf,
                        IsActive = true
                    });
                }
            }

            context.SaveChanges();
        }
    }
}
