using AutoFix.DTOs.RepairOrder;
using AutoFix.Models;
using AutoFix.Services;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace AutoFix.Tests
{
    // Fake realtime service for unit tests
    public class FakeRealtimeService : IRealtimeService
    {
        public Task NotifyAsync(string eventName, object data) => Task.CompletedTask;
    }

    public class BusinessLogicAndAtomicOrderTests
    {
        [Fact]
        public async Task CompleteRepairOrder_CreatesDualReceiptsAtomically()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var realtime = new FakeRealtimeService();
                var repairOrderService = new RepairOrderService(db, realtime);

                // 1. Setup Customer & Car
                var customer = new Customer { FullName = "Hossam Hassan", Phone = "01234567890", Email = "hossam@alex.eg" };
                db.Customers.Add(customer);
                await db.SaveChangesAsync();

                var car = new Car { CustomerId = customer.Id, Make = "Hyundai", Model = "Elantra", Year = 2021, LicensePlate = "ABC-999" };
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var mechanic = new Mechanic { FirstName = "Mahmoud", LastName = "Mechanic", Email = "mahmoud@staff.eg" };
                db.Mechanics.Add(mechanic);
                await db.SaveChangesAsync();

                var service = await db.Services.FirstAsync();

                // 2. Create Repair Order
                var createDto = new CreateRepairOrderDto
                {
                    CarId = car.Id,
                    Notes = "Engine oil change and brake inspection",
                    ServiceIds = new List<int> { service.Id }
                };
                var order = await repairOrderService.CreateAsync(createDto, customer.Id);
                Assert.NotNull(order);
                Assert.Equal("Pending", order.Status);

                // 3. Claim order
                var claimed = await repairOrderService.ClaimOrderAsync(order.Id, mechanic.Id);
                Assert.NotNull(claimed);
                Assert.Equal("InProgress", claimed.Status);

                // 4. Complete order
                var updateDto = new UpdateRepairOrderDto
                {
                    Status = "Completed",
                    MechanicId = mechanic.Id,
                    Notes = "Work done cleanly"
                };
                var completed = await repairOrderService.UpdateAsync(order.Id, updateDto);
                Assert.NotNull(completed);
                Assert.Equal("Completed", completed.Status);

                // 5. Verify atomic dual receipts created
                var receipts = await db.Receipts.Where(r => r.RepairOrderId == order.Id).ToListAsync();
                Assert.Equal(2, receipts.Count);

                var customerCopy = receipts.FirstOrDefault(r => !r.IsOwnerCopy);
                var ownerCopy = receipts.FirstOrDefault(r => r.IsOwnerCopy);

                Assert.NotNull(customerCopy);
                Assert.NotNull(ownerCopy);
                Assert.Equal(service.BasePrice, customerCopy.TotalCost);
                Assert.Equal(service.BasePrice, ownerCopy.TotalCost);
                Assert.Equal("Issued", customerCopy.Status);
                Assert.Equal("Issued", ownerCopy.Status);
            }
        }

        [Fact]
        public async Task PriceSnapshot_ChangingServicePriceLater_DoesNotAlterIssuedReceipt()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var realtime = new FakeRealtimeService();
                var repairOrderService = new RepairOrderService(db, realtime);

                var customer = new Customer { FullName = "Snapshot Tester", Phone = "01100000000" };
                db.Customers.Add(customer);
                var car = new Car { Customer = customer, Make = "Toyota", Model = "Yaris", Year = 2020, LicensePlate = "XYZ-123" };
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var service = await db.Services.FirstAsync();
                var originalPrice = service.BasePrice;

                var order = await repairOrderService.CreateAsync(new CreateRepairOrderDto
                {
                    CarId = car.Id,
                    ServiceIds = new List<int> { service.Id }
                }, customer.Id);

                await repairOrderService.UpdateAsync(order.Id, new UpdateRepairOrderDto { Status = "Completed" });

                var initialReceiptCost = (await db.Receipts.FirstAsync(r => r.RepairOrderId == order.Id)).TotalCost;
                Assert.Equal(originalPrice, initialReceiptCost);

                // Mutate the catalog service price in database
                service.BasePrice = originalPrice + 1000.00m;
                await db.SaveChangesAsync();

                // Re-query the receipt: cost MUST remain unchanged (Price Snapshotting)
                var receiptAfterPriceChange = await db.Receipts.FirstAsync(r => r.RepairOrderId == order.Id);
                Assert.Equal(originalPrice, receiptAfterPriceChange.TotalCost);
            }
        }
    }
}
