using AutoFix.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AutoFix.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            // 1. Categories
            if (!context.SparePartCategories.Any())
            {
                context.SparePartCategories.Add(new SparePartCategory { Name = "General", Description = "General Parts" });
                context.SaveChanges();
            }

            var category = context.SparePartCategories.First();

            // 2. Services
            var serviceNames = new[] { "Change Oil", "Change Brake Pads", "Change Light Bulbs" };
            foreach (var name in serviceNames)
            {
                if (!context.Services.Any(s => s.Name == name))
                {
                    context.Services.Add(new Service { Name = name, Description = "Professional " + name, BasePrice = 50.00m });
                }
            }

            // 3. Spare Parts
            var partNames = new[] { "Oil Filter", "Brake Pad Set", "Headlight Bulb" };
            foreach (var name in partNames)
            {
                if (!context.SpareParts.Any(p => p.Name == name))
                {
                    context.SpareParts.Add(new SparePart 
                    { 
                        Name = name, 
                        PartNumber = "PN-" + name.Replace(" ", "").ToUpper(), 
                        UnitPrice = 20.00m, 
                        StockQuantity = 100, 
                        CategoryId = category.Id, 
                        Brand = "AutoFix", 
                        IsActive = true 
                    });
                }
            }

            context.SaveChanges();
        }
    }
}
