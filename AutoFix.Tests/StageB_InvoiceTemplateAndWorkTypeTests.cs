using AutoFix.DTOs.Customer;
using AutoFix.DTOs.Invoice;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Models;
using AutoFix.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace AutoFix.Tests
{
    public class StageB_InvoiceTemplateAndWorkTypeTests
    {
        [Fact]
        public async Task Test1_HeaderFieldsComeFromDatabase_NoHardcodedSamples()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var invService = new InvoiceService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Hossam Hassan",
                    Phone = "01099887766",
                    Make = "Mercedes",
                    Model = "C180",
                    Year = 2024,
                    LicensePlate = "م ر س 123",
                    VIN = "WDD205001122"
                });

                var inv = await invService.CreateAsync(new CreateInvoiceDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    Notes = "VIP Maintenance"
                });

                var html = await invService.GenerateWordTemplateInvoiceHtmlAsync(inv.Id);

                Assert.Contains("Hossam Hassan", html);
                Assert.Contains("01099887766", html);
                Assert.Contains("Mercedes", html);
                Assert.Contains("C180 2024", html);
                Assert.Contains("م ر س 123", html);
                Assert.Contains(inv.InvoiceNumber, html);

                // Samples 0.00 and 23/07/2026 must NOT be hardcoded
                Assert.DoesNotContain("23/07/2026", html);
            }
        }

        [Fact]
        public async Task Test2_DateEqualsCairoSystemDate()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var invService = new InvoiceService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Ahmed Helmy",
                    Phone = "01234567890",
                    Make = "BMW",
                    Model = "320i",
                    Year = 2023,
                    LicensePlate = "ب م و 777"
                });

                var inv = await invService.CreateAsync(new CreateInvoiceDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id
                });

                var cairoDate = InvoiceService.GetCairoNow().ToString("dd/MM/yyyy");
                var html = await invService.GenerateWordTemplateInvoiceHtmlAsync(inv.Id);

                Assert.Contains(cairoDate, html);
            }
        }

        [Fact]
        public async Task Test3_IDUniqueUnderParallelCreations()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var invService = new InvoiceService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Tamer Ashour",
                    Phone = "01122334455",
                    Make = "Audi",
                    Model = "A4",
                    Year = 2021,
                    LicensePlate = "ع د 444"
                });

                var tasks = new List<Task<InvoiceResponseDto>>();
                for (int i = 0; i < 20; i++)
                {
                    tasks.Add(invService.CreateAsync(new CreateInvoiceDto
                    {
                        CustomerId = quick.Customer.Id,
                        CarId = quick.Car.Id
                    }));
                }

                var createdInvoices = await Task.WhenAll(tasks);
                var numbers = createdInvoices.Select(x => x.InvoiceNumber).ToList();

                Assert.Equal(20, numbers.Distinct().Count());
            }
        }

        [Fact]
        public async Task Test4_DuplicateIDEditRejected_AndLockedAfterIssueNeedsReasonAndAdmin()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var invService = new InvoiceService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Amr Diab",
                    Phone = "01000000001",
                    Make = "Porsche",
                    Model = "Cayenne",
                    Year = 2025,
                    LicensePlate = "ع م ر 1"
                });

                var inv1 = await invService.CreateAsync(new CreateInvoiceDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id
                });

                var inv2 = await invService.CreateAsync(new CreateInvoiceDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id
                });

                // Duplicate ID edit must be rejected
                await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    invService.UpdateInvoiceNumberAsync(inv2.Id, new UpdateInvoiceNumberDto
                    {
                        NewInvoiceNumber = inv1.InvoiceNumber,
                        Reason = "Attempt duplicate"
                    }, "Admin", true));

                // Non-admin cannot edit issued invoice ID
                await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                    invService.UpdateInvoiceNumberAsync(inv1.Id, new UpdateInvoiceNumberDto
                    {
                        NewInvoiceNumber = "INV-CUSTOM-001",
                        Reason = "Customer attempt"
                    }, "Receptionist", false));

                // Missing reason for issued invoice edit is rejected
                await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    invService.UpdateInvoiceNumberAsync(inv1.Id, new UpdateInvoiceNumberDto
                    {
                        NewInvoiceNumber = "INV-CUSTOM-001",
                        Reason = ""
                    }, "Admin", true));

                // Admin with mandatory reason succeeds
                var updated = await invService.UpdateInvoiceNumberAsync(inv1.Id, new UpdateInvoiceNumberDto
                {
                    NewInvoiceNumber = "INV-CUSTOM-001",
                    Reason = "Official workshop correction per customer request"
                }, "Admin", true);

                Assert.Equal("INV-CUSTOM-001", updated.InvoiceNumber);

                // History table must contain the old ID
                var history = await db.InvoiceIdHistories.FirstOrDefaultAsync(h => h.InvoiceId == inv1.Id);
                Assert.NotNull(history);
                Assert.Equal(inv1.InvoiceNumber, history.OldInvoiceNumber);
                Assert.Equal("INV-CUSTOM-001", history.NewInvoiceNumber);

                // Old ID still resolves to the invoice!
                var resolvedByOld = await invService.GetByInvoiceNumberAsync(inv1.InvoiceNumber);
                Assert.NotNull(resolvedByOld);
                Assert.Equal(inv1.Id, resolvedByOld.Id);
            }
        }

        [Fact]
        public async Task Test5_PhotoReferenceExample_Calculates2650BeforeTax()
        {
            // Example from user photo:
            // Item 1: Castrol 5L = 1,400.00
            // Item 2: Oil Filter = 300.00
            // Item 3: Air Filter = 650.00
            // Items total = 2,350.00
            // Separate workmanship = 300.00
            // Total before discount and VAT = 2,650.00 L.E
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);
                var invService = new InvoiceService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Mahmoud Metwally",
                    Phone = "01088776655",
                    Make = "BMW",
                    Model = "E90",
                    Year = 2011,
                    LicensePlate = "ب م و 909"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    WorkType = "Maintenance",
                    WorkDone = "تم تغيير زيت وفلاتر",
                    WorkToBeDone = "فحص تيل الفرامل القادم",
                    Notes = "استخدام كاسترول أصلي",
                    Lines = new List<CreateWorkOrderLineDto>
                    {
                        new CreateWorkOrderLineDto { LineType = "SparePart", Description = "زيت كاسترول ماجنتك 5 لتر", Quantity = 1, UnitPrice = 1400.00m },
                        new CreateWorkOrderLineDto { LineType = "SparePart", Description = "فلتر زيت E90", Quantity = 1, UnitPrice = 300.00m },
                        new CreateWorkOrderLineDto { LineType = "SparePart", Description = "فلتر هواء ضيق E90", Quantity = 1, UnitPrice = 650.00m },
                        new CreateWorkOrderLineDto { LineType = "LaborManufacturer", Description = "مصنعية تغيير الزيت والفلاتر", Quantity = 1, UnitPrice = 300.00m }
                    }
                });

                Assert.Equal(2350.00m, wo.TotalParts);
                Assert.Equal(300.00m, wo.TotalWorkmanship);
                Assert.Equal(2650.00m, wo.TotalAmount);

                // Transition to Completed and convert to invoice
                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                await woService.TransitionStatusAsync(wo.Id, "Completed");

                var inv = await woService.ConvertToInvoiceAsync(wo.Id, new ConvertWorkOrderToInvoiceDto
                {
                    DiscountAmount = 0m,
                    VatPercentage = 14.0m
                });

                // Items (2,350) + Workmanship (300) = Subtotal (2,650)
                Assert.Equal(2650.00m, inv.Subtotal);
                Assert.Equal(300.00m, inv.TotalWorkmanship);
                Assert.Equal(2350.00m, inv.TotalParts);

                var html = await invService.GenerateWordTemplateInvoiceHtmlAsync(inv.Id);

                // Exact rows and numbers in html
                Assert.Contains("زيت كاسترول ماجنتك 5 لتر", html);
                Assert.Contains("1,400.00", html);
                Assert.Contains("فلتر زيت E90", html);
                Assert.Contains("300.00", html);
                Assert.Contains("فلتر هواء ضيق E90", html);
                Assert.Contains("650.00", html);
                Assert.Contains("2,650.00", html); // Subtotal
                Assert.Contains("مصنعية / Workmanship:", html);

                // Notes persist and print
                Assert.Contains("تم تغيير زيت وفلاتر", html);
                Assert.Contains("فحص تيل الفرامل القادم", html);
                Assert.Contains("استخدام كاسترول أصلي", html);
            }
        }

        [Fact]
        public async Task Test6_WorkType_DecidesDocument_AndLockedAfterInvoicing()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Sameh Shoukry",
                    Phone = "01022334455",
                    Make = "Toyota",
                    Model = "Corolla",
                    Year = 2020,
                    LicensePlate = "ط ي ت 111"
                });

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    WorkType = "Inspection",
                    CustomerComplaint = "Full purchase inspection"
                });

                Assert.Equal("Inspection", wo.WorkType);

                // Update work type before invoice
                var updated = await woService.UpdateAsync(wo.Id, new UpdateWorkOrderDto
                {
                    WorkType = "Maintenance"
                });
                Assert.Equal("Maintenance", updated.WorkType);

                // Transition to Completed and convert to invoice
                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                await woService.TransitionStatusAsync(wo.Id, "Completed");
                await woService.ConvertToInvoiceAsync(wo.Id);

                // Changing work type after invoicing is locked
                await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.UpdateAsync(wo.Id, new UpdateWorkOrderDto
                    {
                        WorkType = "Inspection"
                    }));
            }
        }

        [Fact]
        public async Task Test7_FixedWorkmanshipBox_WithAnyPrice()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var woService = new WorkOrderService(db, dataFolder);
                var invService = new InvoiceService(db, dataFolder);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Wael Gomaa",
                    Phone = "01033445566",
                    Make = "Kia",
                    Model = "Sportage",
                    Year = 2022,
                    LicensePlate = "ك ي ا 222"
                });

                // Case 1: Workmanship 750.00
                var wo1 = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    Lines = new List<CreateWorkOrderLineDto>
                    {
                        new CreateWorkOrderLineDto { LineType = "LaborManufacturer", Description = "Brake Service", Quantity = 1, UnitPrice = 750.00m }
                    }
                });
                await woService.TransitionStatusAsync(wo1.Id, "InProgress");
                await woService.TransitionStatusAsync(wo1.Id, "Completed");
                var inv1 = await woService.ConvertToInvoiceAsync(wo1.Id);
                var html1 = await invService.GenerateWordTemplateInvoiceHtmlAsync(inv1.Id);
                Assert.Contains("750.00", html1);

                // Case 2: Workmanship 0.00
                var wo2 = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = quick.Customer.Id,
                    CarId = quick.Car.Id,
                    Lines = new List<CreateWorkOrderLineDto>
                    {
                        new CreateWorkOrderLineDto { LineType = "SparePart", Description = "Wiper Blade", Quantity = 1, UnitPrice = 200.00m }
                    }
                });
                await woService.TransitionStatusAsync(wo2.Id, "InProgress");
                await woService.TransitionStatusAsync(wo2.Id, "Completed");
                var inv2 = await woService.ConvertToInvoiceAsync(wo2.Id);
                var html2 = await invService.GenerateWordTemplateInvoiceHtmlAsync(inv2.Id);
                Assert.Contains("0.00", html2);
            }
        }
    }
}
