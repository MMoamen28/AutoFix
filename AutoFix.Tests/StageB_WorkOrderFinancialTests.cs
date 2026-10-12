using AutoFix.DTOs.Customer;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Models;
using AutoFix.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace AutoFix.Tests
{
    public class StageB_WorkOrderFinancialTests
    {
        [Fact]
        public async Task WorkOrder_StatusRules_AllAllowedTransitionsSucceed()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Kareem Taha",
                    Phone = "01033334444",
                    Make = "Toyota",
                    Model = "Yaris",
                    Year = 2022,
                    LicensePlate = "ي ر س 1",
                    VIN = "JTDYARIS00112233"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Full service inspection"
                });

                Assert.Equal("Pending", wo.Status);

                // 1. Pending -> InProgress
                var s1 = await woService.TransitionStatusAsync(wo.Id, "InProgress");
                Assert.Equal("InProgress", s1.Status);

                // 2. InProgress -> WaitingForParts
                var s2 = await woService.TransitionStatusAsync(wo.Id, "WaitingForParts");
                Assert.Equal("WaitingForParts", s2.Status);

                // 3. WaitingForParts -> InProgress (can go back)
                var s3 = await woService.TransitionStatusAsync(wo.Id, "InProgress");
                Assert.Equal("InProgress", s3.Status);

                // 4. InProgress -> Completed
                var s4 = await woService.TransitionStatusAsync(wo.Id, "Completed");
                Assert.Equal("Completed", s4.Status);
                Assert.NotNull(s4.CompletedAt);

                // 5. Completed -> Delivered
                var s5 = await woService.TransitionStatusAsync(wo.Id, "Delivered");
                Assert.Equal("Delivered", s5.Status);
                Assert.NotNull(s5.DeliveredAt);

                // 6. Delivered -> Invoiced
                var inv = await woService.ConvertToInvoiceAsync(wo.Id);
                Assert.NotNull(inv);
                var finalWo = await woService.GetByIdAsync(wo.Id);
                Assert.Equal("Invoiced", finalWo!.Status);
            }
        }

        [Fact]
        public async Task WorkOrder_StatusRules_ForbiddenTransitionsThrowInvalidOperation()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Heba Gamal",
                    Phone = "01077778888",
                    Make = "Kia",
                    Model = "Cerato",
                    Year = 2021,
                    LicensePlate = "ك ي ا 2",
                    VIN = "KNACERATO009988"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Brake check"
                });

                // Pending cannot jump to Delivered
                await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.TransitionStatusAsync(wo.Id, "Delivered"));

                // Pending cannot jump to Completed
                await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.TransitionStatusAsync(wo.Id, "Completed"));

                // Cancel from Pending is allowed, but once Cancelled, it CANNOT transition to anything
                var woCancel = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Test cancel"
                });
                await woService.TransitionStatusAsync(woCancel.Id, "Cancelled");
                // Attempting to re-activate from Cancelled throws InvalidOperationException (Cancelled is final terminal state)
                var exCancelToPending = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.TransitionStatusAsync(woCancel.Id, "Pending"));
                Assert.Contains("ForbiddenStatusTransition", exCancelToPending.Message);

                // Move wo to InProgress -> Completed -> Delivered
                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                await woService.TransitionStatusAsync(wo.Id, "Completed");
                await woService.TransitionStatusAsync(wo.Id, "Delivered");

                // Delivered CANNOT be Cancelled
                var ex2 = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.TransitionStatusAsync(wo.Id, "Cancelled"));
                Assert.Contains("ForbiddenStatusTransition", ex2.Message);

                // Move to Invoiced
                await woService.ConvertToInvoiceAsync(wo.Id);

                // Invoiced CANNOT be Cancelled
                var ex3 = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.TransitionStatusAsync(wo.Id, "Cancelled"));
                Assert.Contains("ForbiddenStatusTransition", ex3.Message);
            }
        }

        [Fact]
        public async Task WorkOrder_MechanicAssignment_TracksHistoryWithRoleReasonAndTimestamps()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                // Seed mechanics
                var m1 = new Mechanic { FirstName = "Ali", LastName = "Hassan", Email = "ali@autofix.local" };
                var m2 = new Mechanic { FirstName = "Khaled", LastName = "Ibrahim", Email = "khaled@autofix.local" };
                var m3 = new Mechanic { FirstName = "Yasser", LastName = "Galal", Email = "yasser@autofix.local" };
                db.Mechanics.AddRange(m1, m2, m3);
                await db.SaveChangesAsync();

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Bassem Youssef",
                    Phone = "01088889999",
                    Make = "Audi",
                    Model = "Q3",
                    Year = 2023,
                    LicensePlate = "ب س م 1",
                    VIN = "WAUZZZF31N112233"
                });

                // Create with initial Main mechanic m1
                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    AssignedTechnicianId = m1.Id,
                    CustomerComplaint = "Transmission noise"
                });

                Assert.Equal(m1.Id, wo.AssignedTechnicianId);
                Assert.Null(wo.HelperTechnicianId);

                // Reassign Main to m2 and assign Helper to m3
                var updated = await woService.AssignMechanicsAsync(wo.Id, new AssignMechanicRequestDto
                {
                    MainMechanicId = m2.Id,
                    HelperMechanicId = m3.Id,
                    Reason = "Transmission overhaul requires senior mechanic and assistant",
                    AssignedBy = "Workshop Reception"
                });

                Assert.Equal(m2.Id, updated.AssignedTechnicianId);
                Assert.Equal("Khaled Ibrahim", updated.AssignedTechnicianName);
                Assert.Equal(m3.Id, updated.HelperTechnicianId);
                Assert.Equal("Yasser Galal", updated.HelperTechnicianName);

                // Query assignment history
                var history = await woService.GetMechanicHistoryAsync(wo.Id);
                Assert.NotEmpty(history);

                // Check Main mechanic transition: m1 -> m2
                var mainReassign = history.FirstOrDefault(h => h.Role == "Main" && h.NewMechanicId == m2.Id);
                Assert.NotNull(mainReassign);
                Assert.Equal(m1.Id, mainReassign!.PreviousMechanicId);
                Assert.Equal("Ali Hassan", mainReassign.PreviousMechanicName);
                Assert.Equal("Khaled Ibrahim", mainReassign.NewMechanicName);
                Assert.Equal("Workshop Reception", mainReassign.AssignedBy);

                // Check Helper mechanic initial assignment: null -> m3
                var helperAssign = history.FirstOrDefault(h => h.Role == "Helper" && h.NewMechanicId == m3.Id);
                Assert.NotNull(helperAssign);
                Assert.Null(helperAssign!.PreviousMechanicId);
                Assert.Equal("Yasser Galal", helperAssign.NewMechanicName);
            }
        }

        [Fact]
        public async Task WorkOrder_StockDeduction_DeductsInternalPartsOnlyOnCompleted()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                // Seed spare part with stock 10
                var part = new SparePart
                {
                    PartNumber = "OIL-FLTR-101",
                    Name = "Genuine Oil Filter",
                    UnitPrice = 350m,
                    PurchasePrice = 220m,
                    StockQuantity = 10
                };
                db.SpareParts.Add(part);
                await db.SaveChangesAsync();

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Tamer Hosny",
                    Phone = "01099990000",
                    Make = "Toyota",
                    Model = "Fortuner",
                    Year = 2022,
                    LicensePlate = "ت م ر 1",
                    VIN = "MR0FA39G0N112233"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Oil service",
                    Lines = new()
                    {
                        new CreateWorkOrderLineDto
                        {
                            LineType = "SparePart",
                            Description = "Genuine Oil Filter",
                            SparePartId = part.Id,
                            IsExternalPart = false,
                            Quantity = 2,
                            UnitPrice = 350m,
                            UnitCost = 220m
                        }
                    }
                });

                // In Pending: stock is still 10
                var partBefore = await db.SpareParts.FindAsync(part.Id);
                Assert.Equal(10, partBefore!.StockQuantity);

                // In InProgress: stock is still 10
                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                var partInProgress = await db.SpareParts.FindAsync(part.Id);
                Assert.Equal(10, partInProgress!.StockQuantity);

                // Move to Completed: stock deducts by 2 -> 8
                await woService.TransitionStatusAsync(wo.Id, "Completed");
                var partCompleted = await db.SpareParts.FindAsync(part.Id);
                Assert.Equal(8, partCompleted!.StockQuantity);

                // Verify PartMovement record was logged
                var movement = await db.PartMovements.FirstOrDefaultAsync(m => m.ReferenceNumber == wo.OrderNumber);
                Assert.NotNull(movement);
                Assert.Equal(-2m, movement!.QuantityChanged);
                Assert.Equal(8m, movement.BalanceAfter);
                Assert.Equal("WorkOrderIssue", movement.MovementType);
            }
        }

        [Fact]
        public async Task WorkOrder_HandCalculatedFinancialScenario_MatchesExactNumbers()
        {
            // Exact hand-calculated numbers from approved specification:
            // Labor: Mechanical (2x300=600, cost 2x150=300), Electrical (1x450=450, cost 1x200=200), Paint (1x1200=1200, cost 1x700=700) -> Subtotal Labor = 2,250 (Cost: 1,200)
            // Parts: Internal (1x350=350, cost 220), External (1x2400=2400, cost 2000) -> Subtotal Parts = 2,750 (Cost: 2,220)
            // Total Work Order Amount = 2,250 + 2,750 = 5,000 EGP
            // Total Cost = 1,200 + 2,220 = 3,420 EGP
            // Invoicing: Discount = 200 EGP -> Taxable = 4,800 EGP
            // Egyptian VAT (14%): 4,800 * 0.14 = 672 EGP
            // Total Invoice Amount = 4,800 + 672 = 5,472 EGP
            // Payment: Cash 2,000 EGP -> Remaining = 3,472 EGP
            // Gross Margin before VAT = 4,800 - 3,420 = 1,380 EGP

            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Hany Shaker",
                    Phone = "01011110000",
                    Make = "Mercedes",
                    Model = "E200",
                    Year = 2024,
                    LicensePlate = "هـ ن ي 1",
                    VIN = "W1K2130801A112233"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Full overhaul and service",
                    Lines = new()
                    {
                        // 1. Labor lines
                        new CreateWorkOrderLineDto { LineType = "LaborMechanical", Description = "Engine mechanical tune-up", Quantity = 2, UnitPrice = 300m, UnitCost = 150m },
                        new CreateWorkOrderLineDto { LineType = "LaborElectrical", Description = "Alternator diagnosis & wiring", Quantity = 1, UnitPrice = 450m, UnitCost = 200m },
                        new CreateWorkOrderLineDto { LineType = "LaborPaint", Description = "Front bumper touchup & paint", Quantity = 1, UnitPrice = 1200m, UnitCost = 700m },
                        // 2. Parts lines
                        new CreateWorkOrderLineDto { LineType = "SparePart", Description = "Synthetic Oil Filter", Quantity = 1, UnitPrice = 350m, UnitCost = 220m, IsExternalPart = false },
                        new CreateWorkOrderLineDto { LineType = "SparePart", Description = "BOSCH Alternator (Vendor X)", Quantity = 1, UnitPrice = 2400m, UnitCost = 2000m, IsExternalPart = true, ExternalVendorName = "Vendor X" }
                    }
                });

                // Assert Work Order calculations
                Assert.Equal(2250m, wo.TotalLabor); // 600 + 450 + 1200
                Assert.Equal(2750m, wo.TotalParts); // 350 + 2400
                Assert.Equal(5000m, wo.TotalAmount); // 2250 + 2750

                // Lifecycle to Completed & Delivered
                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                await woService.TransitionStatusAsync(wo.Id, "Completed");
                await woService.TransitionStatusAsync(wo.Id, "Delivered");

                // Convert to Invoice with 200 discount and 14% VAT
                var invoice = await woService.ConvertToInvoiceAsync(wo.Id, new ConvertWorkOrderToInvoiceDto
                {
                    DiscountAmount = 200m,
                    VatPercentage = 14.0m,
                    Currency = "EGP"
                });

                Assert.NotNull(invoice);
                Assert.Equal(5000m, invoice.Subtotal);
                Assert.Equal(200m, invoice.DiscountAmount);
                Assert.Equal(14.0m, invoice.VatPercentage);
                Assert.Equal(672m, invoice.VatAmount); // (5000 - 200) * 0.14 = 672.00
                Assert.Equal(5472m, invoice.TotalAmount); // 4800 + 672 = 5472.00
                Assert.Equal(5472m, invoice.RemainingAmount); // 0 paid yet

                // Add partial payment of 2,000 EGP
                var invInDb = await db.Invoices.Include(i => i.Payments).FirstAsync(i => i.Id == invoice.Id);
                invInDb.Payments.Add(new InvoicePayment
                {
                    InvoiceId = invInDb.Id,
                    Amount = 2000m,
                    PaymentMethod = "Cash",
                    PaidAt = DateTime.UtcNow
                });
                invInDb.PaidAmount = 2000m;
                invInDb.Status = "PartiallyPaid";
                await db.SaveChangesAsync();

                Assert.Equal(2000m, invInDb.PaidAmount);
                Assert.Equal(3472m, invInDb.RemainingAmount); // 5472 - 2000 = 3472.00

                // Hand-calculated Gross Margin
                decimal totalCost = (2 * 150m) + (1 * 200m) + (1 * 700m) + (1 * 220m) + (1 * 2000m); // 300 + 200 + 700 + 220 + 2000 = 3420
                Assert.Equal(3420m, totalCost);

                decimal netRevenueBeforeTax = invoice.Subtotal - invoice.DiscountAmount; // 5000 - 200 = 4800
                decimal grossMargin = netRevenueBeforeTax - totalCost; // 4800 - 3420 = 1380
                Assert.Equal(1380m, grossMargin);
            }
        }

        [Fact]
        public async Task WorkOrder_LaborManufacturer_SupportedAndCalculatedInLaborTotal()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Adel Imam",
                    Phone = "01044445555",
                    Make = "BMW",
                    Model = "X5",
                    Year = 2023,
                    LicensePlate = "ع د ل 1",
                    VIN = "WBAX500112233"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    Lines = new()
                    {
                        new CreateWorkOrderLineDto
                        {
                            LineType = "LaborManufacturer",
                            Description = "Official Manufacturer Warranty Calibration",
                            Quantity = 1,
                            UnitPrice = 850m
                        }
                    }
                });

                Assert.Equal(850m, wo.TotalLabor);
                Assert.Equal(0m, wo.TotalParts);
                Assert.Equal(850m, wo.TotalAmount);
                Assert.Equal("LaborManufacturer", wo.Lines[0].LineType);
            }
        }

        [Fact]
        public async Task WorkOrder_PrintedOrderHtml_ContainsBothMechanicsAndHeader()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var m1 = new Mechanic { FirstName = "Mostafa", LastName = "Kamal", Email = "mostafa@autofix.local" };
                var m2 = new Mechanic { FirstName = "Sayed", LastName = "Gharib", Email = "sayed@autofix.local" };
                db.Mechanics.AddRange(m1, m2);
                await db.SaveChangesAsync();

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Ashraf Abdelbaki",
                    Phone = "01066667777",
                    Make = "Toyota",
                    Model = "Camry",
                    Year = 2023,
                    LicensePlate = "ش ر ف 1",
                    VIN = "4T1B11HK5NU112233",
                    CurrentOdometerKm = 18000
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    AssignedTechnicianId = m1.Id,
                    HelperTechnicianId = m2.Id,
                    OdometerInKm = 18200,
                    CustomerComplaint = "Steering wheel vibration above 100 km/h",
                    Lines = new()
                    {
                        new CreateWorkOrderLineDto { LineType = "LaborMechanical", Description = "Wheel balancing & alignment", Quantity = 1, UnitPrice = 300m }
                    }
                });

                var html = await woService.GeneratePrintedOrderHtmlAsync(wo.Id);

                // Verify HTML contains required elements
                Assert.Contains("AutoFix Workshop", html);
                Assert.Contains("Mostafa Kamal", html); // Main technician
                Assert.Contains("Sayed Gharib", html);  // Helper technician
                Assert.Contains("Ashraf Abdelbaki", html);
                Assert.Contains("4T1B11HK5NU112233", html);
                Assert.Contains("18200 كم", html);
                Assert.Contains("Steering wheel vibration", html);
                Assert.Contains("Wheel balancing & alignment", html);
                Assert.Contains("300.00 EGP", html);
            }
        }

        [Fact]
        public async Task WorkOrder_Cancelled_IsStrictTerminalState_CannotTransitionToAnyState()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Tarek Nour",
                    Phone = "01011112222",
                    Make = "Nissan",
                    Model = "Sunny",
                    Year = 2020,
                    LicensePlate = "ط ر ق 1",
                    VIN = "NISSN0011223344"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Suspension check"
                });

                // Cancel the order
                var cancelled = await woService.TransitionStatusAsync(wo.Id, "Cancelled");
                Assert.Equal("Cancelled", cancelled.Status);

                // Attempt every possible transition out of Cancelled - ALL must be forbidden
                var targets = new[] { "Pending", "InProgress", "WaitingForParts", "Completed", "Delivered", "Invoiced" };
                foreach (var target in targets)
                {
                    var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                        woService.TransitionStatusAsync(wo.Id, target));
                    Assert.Contains("ForbiddenStatusTransition", ex.Message);
                }
            }
        }

        [Fact]
        public async Task WorkOrder_CompletedOrder_Cancelled_RestoresStockAndLogsPartMovement()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                // Seed spare part with initial stock 20
                var part = new SparePart
                {
                    Name = "Synthetic Engine Oil 5W-30",
                    PartNumber = "OIL-5W30-SYN",
                    PurchasePrice = 200m,
                    UnitPrice = 350m,
                    StockQuantity = 20
                };
                db.SpareParts.Add(part);
                await db.SaveChangesAsync();

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Mohsen Mohi",
                    Phone = "01099990000",
                    Make = "Hyundai",
                    Model = "Elantra",
                    Year = 2021,
                    LicensePlate = "م ح س 1",
                    VIN = "KMHD1122334455"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Oil change",
                    Lines = new()
                    {
                        new CreateWorkOrderLineDto
                        {
                            LineType = "SparePart",
                            Description = "Synthetic Engine Oil 5W-30",
                            SparePartId = part.Id,
                            IsExternalPart = false,
                            Quantity = 4, // 4 units
                            UnitCost = 200m,
                            UnitPrice = 350m
                        }
                    }
                });

                // Move Pending -> InProgress -> Completed
                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                await woService.TransitionStatusAsync(wo.Id, "Completed");

                // Verify stock deducted: 20 - 4 = 16
                var partAfterCompleted = await db.SpareParts.FindAsync(part.Id);
                Assert.Equal(16, partAfterCompleted!.StockQuantity);

                var issueMovement = await db.PartMovements
                    .FirstOrDefaultAsync(pm => pm.ReferenceNumber == wo.OrderNumber && pm.MovementType == "WorkOrderIssue");
                Assert.NotNull(issueMovement);
                Assert.Equal(-4, issueMovement!.QuantityChanged);
                Assert.Equal(16, issueMovement.BalanceAfter);

                // Now CANCEL the Completed order
                var cancelledWo = await woService.TransitionStatusAsync(wo.Id, "Cancelled");
                Assert.Equal("Cancelled", cancelledWo.Status);

                // Verify stock is restored back to 20!
                var partAfterCancel = await db.SpareParts.FindAsync(part.Id);
                Assert.Equal(20, partAfterCancel!.StockQuantity);

                // Verify restore PartMovement record exists with positive quantity and correct balance
                var restoreMovement = await db.PartMovements
                    .FirstOrDefaultAsync(pm => pm.ReferenceNumber == wo.OrderNumber && pm.MovementType == "WorkOrderRestore");
                Assert.NotNull(restoreMovement);
                Assert.Equal(4, restoreMovement!.QuantityChanged);
                Assert.Equal(20, restoreMovement.BalanceAfter);
                Assert.Contains("restored", restoreMovement.Notes.ToLower());
            }
        }

        [Fact]
        public async Task WorkOrder_InvoicedOrder_Credited_RestoresStockAndSetsInvoiceStatusCredited()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                // Seed spare part with initial stock 50
                var part = new SparePart
                {
                    Name = "Front Brake Rotors",
                    PartNumber = "BRK-ROTOR-FR",
                    PurchasePrice = 600m,
                    UnitPrice = 900m,
                    StockQuantity = 50
                };
                db.SpareParts.Add(part);
                await db.SaveChangesAsync();

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Hany Shaker",
                    Phone = "01055556666",
                    Make = "Toyota",
                    Model = "Corolla",
                    Year = 2022,
                    LicensePlate = "هـ ن ي 1",
                    VIN = "JTDK1122334455"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Brake replacement",
                    Lines = new()
                    {
                        new CreateWorkOrderLineDto
                        {
                            LineType = "SparePart",
                            Description = "Front Brake Rotors",
                            SparePartId = part.Id,
                            IsExternalPart = false,
                            Quantity = 2,
                            UnitCost = 600m,
                            UnitPrice = 900m
                        }
                    }
                });

                // Completed deducts stock (50 - 2 = 48)
                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                await woService.TransitionStatusAsync(wo.Id, "Completed");
                var partCompleted = await db.SpareParts.FindAsync(part.Id);
                Assert.Equal(48, partCompleted!.StockQuantity);

                // Convert to Invoice
                var inv = await woService.ConvertToInvoiceAsync(wo.Id);
                Assert.Equal("Issued", inv.Status);

                // Simulate customer making a payment of 1,000 EGP
                var invDb = await db.Invoices.FindAsync(inv.Id);
                invDb!.PaidAmount = 1000m;
                db.InvoicePayments.Add(new InvoicePayment
                {
                    InvoiceId = inv.Id,
                    Amount = 1000m,
                    PaymentMethod = "Cash",
                    PaidAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();

                // Issue credit note
                var creditedInv = await woService.CreditWorkOrderInvoiceAsync(wo.Id, "Customer warranty claim / returned rotors");
                Assert.Equal("Credited", creditedInv.Status);
                Assert.Equal(0m, creditedInv.PaidAmount);

                // Verify refund payment was recorded
                var refundPayment = await db.InvoicePayments
                    .FirstOrDefaultAsync(p => p.InvoiceId == inv.Id && p.PaymentMethod == "Refund");
                Assert.NotNull(refundPayment);
                Assert.Equal(-1000m, refundPayment!.Amount);

                // Verify Treasury refund transaction was recorded
                var treasuryRefund = await db.TreasuryTransactions
                    .FirstOrDefaultAsync(t => t.TransactionType == "CustomerRefund" && t.ReferenceNumber!.StartsWith("CN-"));
                Assert.NotNull(treasuryRefund);
                Assert.Equal(-1000m, treasuryRefund!.Amount);
                Assert.Equal("Refund", treasuryRefund.Category);

                // Verify audit log entry
                var auditLog = await db.AuditLogs
                    .FirstOrDefaultAsync(a => a.Action == "IssueCreditNote" && a.EntityId == inv.InvoiceNumber);
                Assert.NotNull(auditLog);
                Assert.Contains("refunded to customer and logged in Treasury", auditLog!.Details);

                // Verify stock restored back to 50!
                var partCredited = await db.SpareParts.FindAsync(part.Id);
                Assert.Equal(50, partCredited!.StockQuantity);

                // Verify restore PartMovement record
                var restoreMovement = await db.PartMovements
                    .FirstOrDefaultAsync(pm => pm.ReferenceNumber == wo.OrderNumber && pm.MovementType == "WorkOrderRestore");
                Assert.NotNull(restoreMovement);
                Assert.Equal(2, restoreMovement!.QuantityChanged);
                Assert.Equal(50, restoreMovement.BalanceAfter);
            }
        }

        [Fact]
        public async Task WorkOrder_InvoiceRules_Idempotent_AndStatusesConsistent()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Mona Zaki",
                    Phone = "01033332222",
                    Make = "Peugeot",
                    Model = "3008",
                    Year = 2023,
                    LicensePlate = "م ن ى 1",
                    VIN = "VF3300800112233"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Full Checkup",
                    Lines = new()
                    {
                        new CreateWorkOrderLineDto { LineType = "LaborMechanical", Description = "Engine diagnostics", Quantity = 1, UnitPrice = 500m }
                    }
                });

                // 1. Pending CANNOT be invoiced
                var exPending = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.ConvertToInvoiceAsync(wo.Id));
                Assert.Contains("must be in 'Completed' or 'Delivered' status", exPending.Message);

                // 2. InProgress CANNOT be invoiced
                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                var exInProgress = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.ConvertToInvoiceAsync(wo.Id));
                Assert.Contains("must be in 'Completed' or 'Delivered' status", exInProgress.Message);

                // 3. WaitingForParts CANNOT be invoiced
                await woService.TransitionStatusAsync(wo.Id, "WaitingForParts");
                var exWait = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.ConvertToInvoiceAsync(wo.Id));
                Assert.Contains("must be in 'Completed' or 'Delivered' status", exWait.Message);

                // 4. Completed CAN be invoiced
                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                await woService.TransitionStatusAsync(wo.Id, "Completed");

                var inv1 = await woService.ConvertToInvoiceAsync(wo.Id);
                Assert.NotNull(inv1);
                Assert.Equal("Invoiced", (await woService.GetByIdAsync(wo.Id))!.Status);

                // 5. Idempotency test: Clicking Invoice twice returns the SAME invoice, never creates a second one
                var inv2 = await woService.ConvertToInvoiceAsync(wo.Id);
                Assert.Equal(inv1.Id, inv2.Id);
                Assert.Equal(inv1.InvoiceNumber, inv2.InvoiceNumber);
                Assert.Equal(inv1.TotalAmount, inv2.TotalAmount);

                // Total invoices in DB for this work order must be EXACTLY 1
                var invCount = await db.Invoices.CountAsync(i => i.WorkOrderId == wo.Id);
                Assert.Equal(1, invCount);
            }
        }

        [Fact]
        public async Task WorkOrder_ClaimOrder_AssignsMechanic_TransitionsToInProgress_AndLogsHistory()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var mechanic = new Mechanic
                {
                    FirstName = "Sami",
                    LastName = "Anan",
                    Email = "sami@autofix.local"
                };
                db.Mechanics.Add(mechanic);
                await db.SaveChangesAsync();

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Ezzat El-Alaily",
                    Phone = "01077771111",
                    Make = "Mercedes",
                    Model = "C180",
                    Year = 2022,
                    LicensePlate = "ع ز ت 1",
                    VIN = "WDB20500112233"
                });

                // Create unassigned order
                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    CustomerComplaint = "Brake pad replacement"
                });

                Assert.Equal("Pending", wo.Status);
                Assert.Null(wo.AssignedTechnicianId);

                // Mechanic claims the order
                var claimed = await woService.ClaimOrderAsync(wo.Id, mechanic.Id);

                Assert.Equal("InProgress", claimed.Status);
                Assert.Equal(mechanic.Id, claimed.AssignedTechnicianId);
                Assert.Equal("Sami Anan", claimed.AssignedTechnicianName);

                // Verify history log
                var history = await woService.GetMechanicHistoryAsync(wo.Id);
                var claimEntry = history.FirstOrDefault(h => h.NewMechanicId == mechanic.Id && h.AssignedBy == "Mechanic");
                Assert.NotNull(claimEntry);
                Assert.Equal("Main", claimEntry!.Role);
                Assert.Equal("Self-claimed by mechanic", claimEntry.Reason);
            }
        }
    }
}
