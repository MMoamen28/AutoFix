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
            // Seed Categories
            if (!context.SparePartCategories.Any())
            {
                var categories = new List<SparePartCategory>
                {
                    new SparePartCategory { Name = "Engine Components", Description = "Parts related to the internal combustion engine." },
                    new SparePartCategory { Name = "Braking System", Description = "Pads, rotors, and hydraulics." },
                    new SparePartCategory { Name = "Suspension & Steering", Description = "Shocks, struts, and linkages." },
                    new SparePartCategory { Name = "Electrical", Description = "Batteries, alternators, and wiring." },
                    new SparePartCategory { Name = "Fluids & Lubricants", Description = "Oil, coolant, and brake fluid." }
                };
                context.SparePartCategories.AddRange(categories);
                context.SaveChanges();
            }

            // Seed Services
            if (!context.Services.Any())
            {
                var services = new List<Service>
                {
                    new Service { Name = "Oil Change", Description = "Full synthetic oil and filter replacement.", BasePrice = 80.00m },
                    new Service { Name = "Brake Pad Replacement", Description = "Front or rear brake pad set.", BasePrice = 150.00m },
                    new Service { Name = "Tire Rotation", Description = "Balancing and rotation of all four tires.", BasePrice = 50.00m },
                    new Service { Name = "Battery Installation", Description = "Removal of old battery and installation of new one.", BasePrice = 30.00m },
                    new Service { Name = "Diagnostic Scan", Description = "Full OBD-II diagnostic report.", BasePrice = 100.00m }
                };
                context.Services.AddRange(services);
                context.SaveChanges();
            }

            // Seed a few Spare Parts
            if (!context.SpareParts.Any())
            {
                var catEngine = context.SparePartCategories.First(c => c.Name == "Engine Components");
                var catBrakes = context.SparePartCategories.First(c => c.Name == "Braking System");

                var parts = new List<SparePart>
                {
                    new SparePart { Name = "Oil Filter (OEM)", PartNumber = "OF-123", UnitPrice = 15.00m, StockQuantity = 50, CategoryId = catEngine.Id },
                    new SparePart { Name = "Ceramic Brake Pads", PartNumber = "BP-456", UnitPrice = 65.00m, StockQuantity = 20, CategoryId = catBrakes.Id },
                    new SparePart { Name = "Spark Plug", PartNumber = "SP-789", UnitPrice = 8.00m, StockQuantity = 100, CategoryId = catEngine.Id }
                };
                context.SpareParts.AddRange(parts);
                context.SaveChanges();
            }
            // Seed Customers
            if (!context.Customers.Any())
            {
                var customers = new List<Customer>
                {
                    new Customer { FullName = "Mohamed Salah", Email = "salah@liverpool.com", Phone = "0123456789", KeycloakUserId = "demo-cust-1", CreatedAt = DateTime.UtcNow },
                    new Customer { FullName = "Ahmed Hegazy", Email = "hegazy@ittihad.com", Phone = "0987654321", KeycloakUserId = "demo-cust-2", CreatedAt = DateTime.UtcNow }
                };
                context.Customers.AddRange(customers);
                context.SaveChanges();
            }

            // Seed Mechanics
            if (!context.Mechanics.Any())
            {
                var mechanics = new List<Mechanic>
                {
                    new Mechanic { FirstName = "John", LastName = "Wick", Email = "john@high-table.com", KeycloakUserId = "demo-mech-1", HiredAt = DateTime.UtcNow },
                    new Mechanic { FirstName = "James", LastName = "Bond", Email = "007@mi6.gov", KeycloakUserId = "demo-mech-2", HiredAt = DateTime.UtcNow }
                };
                context.Mechanics.AddRange(mechanics);
                context.SaveChanges();
            }
        }
    }
}
