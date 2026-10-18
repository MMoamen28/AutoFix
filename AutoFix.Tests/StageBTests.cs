using AutoFix.DTOs.Car;
using AutoFix.DTOs.Customer;
using AutoFix.DTOs.Inspection;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Exceptions;
using AutoFix.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace AutoFix.Tests
{
    public class StageBTests
    {
        [Fact]
        public async Task CustomerManagement_DuplicatePhoneWarning_ThrowsConflictUnlessAllowed()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);

                var c1 = await custService.CreateAsync(new CreateCustomerDto
                {
                    FullName = "Tarek Mansour",
                    Phone = "01099887766",
                    Email = "tarek@workshop.local"
                });
                Assert.NotNull(c1);

                var ex = await Assert.ThrowsAsync<ValidationWarningException>(() =>
                    custService.CreateAsync(new CreateCustomerDto
                    {
                        FullName = "Tarek Mansour Duplicate",
                        Phone = "01099887766",
                        Email = "tarek2@workshop.local",
                        AllowDuplicate = false
                    }));

                Assert.Equal("DuplicatePhone", ex.Code);

                // Attempt with AllowDuplicate = true -> succeeds
                var c2 = await custService.CreateAsync(new CreateCustomerDto
                {
                    FullName = "Tarek Mansour Confirmed",
                    Phone = "01099887766",
                    Email = "tarek2@workshop.local",
                    AllowDuplicate = true
                });

                Assert.NotNull(c2);
                Assert.NotEqual(c1.Id, c2.Id);
            }
        }

        [Fact]
        public async Task CarManagement_LinkedToCustomer_DuplicatePlateOrVinDetected()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var carService = new CarService(db);

                var cust = await custService.CreateAsync(new CreateCustomerDto
                {
                    FullName = "Hassan Zaki",
                    Phone = "01122334455"
                });

                var car1 = await carService.CreateAsync(new CreateCarDto
                {
                    Make = "Toyota",
                    Model = "Corolla",
                    Year = 2022,
                    LicensePlate = "ق ب ر 1 2 3 4",
                    VIN = "NMTBA30E30R123456",
                    CurrentOdometerKm = 45000
                }, cust.Id);

                Assert.NotNull(car1);
                Assert.Equal(cust.Id, car1.CustomerId);

                // Duplicate plate creation throws DuplicateCarWarning
                var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    carService.CreateAsync(new CreateCarDto
                    {
                        Make = "Toyota",
                        Model = "Yaris",
                        Year = 2021,
                        LicensePlate = "ق ب ر 1 2 3 4",
                        VIN = "OTHERVIN999888777"
                    }, cust.Id));

                Assert.Contains("DuplicateCarWarning", ex.Message);
            }
        }

        [Fact]
        public async Task WorkOrderLifecycle_EnforcesTransitions_CannotDeliverBeforeCompletion()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var carService = new CarService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var cust = await custService.CreateAsync(new CreateCustomerDto { FullName = "Mona Adel", Phone = "01233445566" });
                var car = await carService.CreateAsync(new CreateCarDto
                {
                    Make = "Hyundai",
                    Model = "Elantra",
                    Year = 2023,
                    LicensePlate = "أ ب ج 9 8 7 6",
                    VIN = "KMHD84LF0NU112233",
                    CurrentOdometerKm = 30000
                }, cust.Id);

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = cust.Id,
                    CarId = car.Id,
                    OdometerInKm = 30500,
                    CustomerComplaint = "Check engine light and oil leak",
                    Lines = new()
                    {
                        new CreateWorkOrderLineDto { LineType = "LaborMechanical", Description = "Engine inspection", UnitPrice = 300, Quantity = 1 },
                        new CreateWorkOrderLineDto { LineType = "SparePart", Description = "Synthetic Oil 5W30", UnitPrice = 850, Quantity = 1 }
                    }
                });

                Assert.Equal("Pending", wo.Status);
                Assert.Equal(1150m, wo.TotalAmount);

                // Cannot jump directly from Pending to Delivered (Forbidden)
                var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    woService.TransitionStatusAsync(wo.Id, "Delivered"));
                Assert.Contains("ForbiddenStatusTransition", ex.Message);

                // Valid transition: Pending -> InProgress -> Completed -> Delivered
                var inProgress = await woService.TransitionStatusAsync(wo.Id, "InProgress");
                Assert.Equal("InProgress", inProgress.Status);

                var completed = await woService.TransitionStatusAsync(wo.Id, "Completed");
                Assert.Equal("Completed", completed.Status);
                Assert.NotNull(completed.CompletedAt);

                var delivered = await woService.TransitionStatusAsync(wo.Id, "Delivered");
                Assert.Equal("Delivered", delivered.Status);
                Assert.NotNull(delivered.DeliveredAt);
            }
        }

        [Fact]
        public async Task WorkOrder_AtomicPriceSnapshot_ConvertsToInvoiceWith14Vat()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var carService = new CarService(db);
                var woService = new WorkOrderService(db, dataFolder);

                var cust = await custService.CreateAsync(new CreateCustomerDto { FullName = "Ahmed Nabil", Phone = "01055667788" });
                var car = await carService.CreateAsync(new CreateCarDto
                {
                    Make = "Kia",
                    Model = "Sportage",
                    Year = 2024,
                    LicensePlate = "س ع د 5 5 5 5",
                    VIN = "KNDPM3AC7R7654321",
                    CurrentOdometerKm = 15000
                }, cust.Id);

                var wo = await woService.CreateAsync(new CreateWorkOrderDto
                {
                    CustomerId = cust.Id,
                    CarId = car.Id,
                    OdometerInKm = 15200,
                    Lines = new()
                    {
                        new CreateWorkOrderLineDto { LineType = "LaborMechanical", Description = "Brake pad replacement labor", UnitPrice = 400, Quantity = 1 },
                        new CreateWorkOrderLineDto { LineType = "SparePart", Description = "Brake Pads Front", UnitPrice = 1000, Quantity = 1 }
                    }
                });

                await woService.TransitionStatusAsync(wo.Id, "InProgress");
                await woService.TransitionStatusAsync(wo.Id, "Completed");

                // Convert to Invoice
                var invoice = await woService.ConvertToInvoiceAsync(wo.Id);

                Assert.NotNull(invoice);
                Assert.Equal(1400m, invoice.Subtotal);
                Assert.Equal(14.0m, invoice.VatPercentage);
                Assert.Equal(196.0m, invoice.VatAmount); // 14% of 1400
                Assert.Equal(1596.0m, invoice.TotalAmount); // 1400 + 196
                Assert.Equal(1596.0m, invoice.RemainingAmount);
                Assert.Equal("Issued", invoice.Status);

                var updatedWo = await woService.GetByIdAsync(wo.Id);
                Assert.Equal("Invoiced", updatedWo!.Status);
            }
        }

        [Fact]
        public async Task CarInspection_CreateDraft_AutoFillsFromDb_EmptyPrintsUnderline()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var carService = new CarService(db);
                var inspService = new InspectionService(db, dataFolder);

                var cust = await custService.CreateAsync(new CreateCustomerDto { FullName = "Youssef Sherif", Phone = "01099881122" });
                var car = await carService.CreateAsync(new CreateCarDto
                {
                    Make = "BMW",
                    Model = "320i",
                    Year = 2023,
                    LicensePlate = "ط هـ ر 7 7 7 7",
                    VIN = "WBA3B3G51NN998877",
                    CurrentOdometerKm = 38000
                }, cust.Id);

                var insp = await inspService.CreateAsync(new CreateInspectionDto
                {
                    CustomerId = cust.Id,
                    CarId = car.Id,
                    Status = "Draft",
                    ChecklistDataJson = "{\"battery\":\"Good\",\"ac_cooling\":\"Good\"}"
                });

                Assert.NotNull(insp);
                Assert.Equal("BMW", insp.CarMake);
                Assert.Equal("320i", insp.CarModel);
                Assert.Equal("ط هـ ر 7 7 7 7", insp.CarPlate);
                Assert.Equal("WBA3B3G51NN998877", insp.CarChassis);
                Assert.Equal("Youssef Sherif", insp.CustomerName);
                Assert.Equal("01099881122", insp.CustomerPhone);
                Assert.Equal(38000, insp.OdometerKm);
                Assert.Equal("Draft", insp.Status);
                Assert.Equal(1, insp.RevisionNumber);
            }
        }

        [Fact]
        public async Task CarInspection_3PageHtmlStructure_ContainsPage123AndForcedBreaks()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var inspService = new InspectionService(db, dataFolder);

                var insp = await inspService.CreateAsync(new CreateInspectionDto
                {
                    CarMake = "Audi",
                    CarModel = "A4",
                    CarPlate = "د ر س 1 2 3",
                    CarChassis = "WAUZZZF45HA112233",
                    CustomerName = "Karim Fouad",
                    CustomerPhone = "01011223344",
                    OdometerKm = 52000,
                    Status = "Draft"
                });

                var html = await inspService.GenerateHtmlPrintReportAsync(insp.Id);

                // Verify exact structure
                Assert.Contains("page-1", html);
                Assert.Contains("page-2", html);
                Assert.Contains("page-3", html);
                Assert.Contains("Page 1 of 3", html);
                Assert.Contains("Page 2 of 3", html);
                Assert.Contains("Page 3 of 3", html);
                Assert.Contains("page-break-after: always", html);
                Assert.Contains("A4 portrait", html);
                Assert.Contains("Comprehensive Car Inspection", html);
                Assert.Contains("فحص سيارة شامل", html);
                Assert.Contains("كهرباء المحرك", html);
                Assert.Contains("اختبار القيادة", html);
                Assert.Contains("العفشة", html);
                Assert.Contains("جسم السيارة والدهان", html);
            }
        }

        [Fact]
        public async Task CarInspection_FinalizeLocksReport_RevisionCreatesNewRevisionPreservingOld()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var inspService = new InspectionService(db, dataFolder);

                var draft = await inspService.CreateAsync(new CreateInspectionDto
                {
                    CarMake = "Mercedes",
                    CarModel = "C180",
                    CarPlate = "ص ع ق 4 4 4",
                    CustomerName = "Amr Diab",
                    CustomerPhone = "01000112233",
                    Status = "Draft"
                });

                // Finalize report
                var finalized = await inspService.FinalizeAsync(draft.Id);
                Assert.Equal("Final", finalized.Status);
                Assert.NotNull(finalized.FinalizedAt);

                // Attempt to directly edit finalized report -> blocked
                await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    inspService.UpdateAsync(finalized.Id, new UpdateInspectionDto
                    {
                        CarMake = "Mercedes",
                        Notes = "Illegal direct modification"
                    }));

                // Create new revision
                var rev2 = await inspService.ReviseAsync(finalized.Id, new UpdateInspectionDto
                {
                    Notes = "Revision 2 notes: Re-checked brakes"
                });

                Assert.Equal(2, rev2.RevisionNumber);
                Assert.True(rev2.IsCurrentRevision);
                Assert.Equal("Draft", rev2.Status);
                Assert.Equal(finalized.Id, rev2.PreviousRevisionId);

                // Check old revision: remains in DB, but IsCurrentRevision is false
                var oldRev = await db.CarInspections.FindAsync(finalized.Id);
                Assert.NotNull(oldRev);
                Assert.False(oldRev!.IsCurrentRevision);
                Assert.Equal("Final", oldRev.Status);
            }
        }

        [Fact]
        public async Task CarInspection_WhatsAppShare_FormatsEgyptianPhoneAndLogsAudit()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var inspService = new InspectionService(db, dataFolder);

                var insp = await inspService.CreateAsync(new CreateInspectionDto
                {
                    CarMake = "Nissan",
                    CarModel = "Sunny",
                    CarPlate = "س ن ي 1 1 1",
                    CustomerName = "Wael Gomaa",
                    CustomerPhone = "01065432109",
                    Status = "Final",
                    GeneralVerdict = "Good",
                    OverallScore = 92
                });

                var waUrl = await inspService.GetWhatsAppShareUrlAsync(insp.Id);

                Assert.StartsWith("https://wa.me/201065432109?text=", waUrl);

                // Verify audit log entry
                var audit = await db.AuditLogs.FirstOrDefaultAsync(a => a.Action == "WhatsAppInspectionShare");
                Assert.NotNull(audit);
                Assert.Equal(insp.ReportNumber, audit.EntityId);
            }
        }

        [Fact]
        public async Task CustomerDashboard_Isolation_CustomerOnlySeesOwnCarsAndOrders()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var carService = new CarService(db);
                var woService = new WorkOrderService(db, dataFolder);
                var inspService = new InspectionService(db, dataFolder);
                var dashService = new DashboardService(db, woService);

                var cust1 = await custService.CreateAsync(new CreateCustomerDto { FullName = "Customer One", Phone = "01000000001" });
                var cust2 = await custService.CreateAsync(new CreateCustomerDto { FullName = "Customer Two", Phone = "01000000002" });

                var car1 = await carService.CreateAsync(new CreateCarDto { Make = "Mazda", Model = "3", Year = 2020, LicensePlate = "م ز د 1", VIN = "JM1BL1H59A1111111" }, cust1.Id);
                var car2 = await carService.CreateAsync(new CreateCarDto { Make = "Toyota", Model = "Yaris", Year = 2021, LicensePlate = "ت ي ت 2", VIN = "JT1BL1H59A2222222" }, cust2.Id);

                await woService.CreateAsync(new CreateWorkOrderDto { CustomerId = cust1.Id, CarId = car1.Id, CustomerComplaint = "Cust 1 order" });
                await woService.CreateAsync(new CreateWorkOrderDto { CustomerId = cust2.Id, CarId = car2.Id, CustomerComplaint = "Cust 2 order" });

                var d1 = await dashService.GetCustomerDashboardAsync(cust1.Id);
                Assert.NotNull(d1);
                Assert.Single(d1.MyCars);
                Assert.Equal(car1.Id, d1.MyCars[0].Id);
                Assert.Single(d1.ActiveOrders);
                Assert.Equal("Cust 1 order", d1.ActiveOrders[0].CustomerComplaint);

                // Verify customer 1 does not see customer 2 data
                Assert.DoesNotContain(d1.MyCars, c => c.Id == car2.Id);
                Assert.DoesNotContain(d1.ActiveOrders, o => o.CustomerId == cust2.Id);
            }
        }

        [Fact]
        public async Task ComprehensiveCarInspection_Exact3PageReport_RuntimeAssetsAndFields()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var inspService = new InspectionService(db, dataFolder);

                var checklistJson = System.Text.Json.JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["Check_Battery"] = "12.6V Good",
                    ["Check_Alternator"] = "14.2V Charging",
                    ["Check_Starter"] = "Normal Sound",
                    ["Check_CoolingLevel"] = "Max / Excellent",
                    ["Check_AirDist"] = "Normal",
                    ["Check_Heating"] = "Operating",
                    ["Check_Dashboard"] = "Clean / No Lights",
                    ["Drive_Engine"] = "Smooth / High Response",
                    ["Svc_EngineOil"] = "Synthetic 5W30 OK",
                    ["Rim_RF"] = "Original / Clean",
                    ["Tire_RF"] = "Bridgestone 7mm",
                    ["Leak_Coolant"] = "No Leaks",
                    ["Under_Boots"] = "Intact",
                    ["Susp_FrontTie"] = "Tight / Good",
                    ["Body_FrontBumper"] = "Minor Scratches",
                    ["Diagnostic_Scan_Result"] = "No DTC Faults Stored",
                    ["Additional_Comments"] = "Car in prime condition"
                });

                var insp = await inspService.CreateAsync(new CreateInspectionDto
                {
                    CarMake = "Audi",
                    CarModel = "A4 Quattro",
                    CarPlate = "أ ب ج 7 8 9",
                    CarChassis = "WAUZZZF45HA998877",
                    CustomerName = "Tarek Nour",
                    CustomerPhone = "01099887766",
                    OdometerKm = 64000,
                    InvoiceNumber = "INV-2026-9999",
                    InvoiceAmount = 8500.50m,
                    Status = "Draft",
                    OverallScore = 94,
                    GeneralVerdict = "Excellent",
                    ChecklistDataJson = checklistJson
                });

                var html = await inspService.GenerateHtmlPrintReportAsync(insp.Id, showInvoiceTotal: false);

                // 1. Exact 3-page A4 structure
                Assert.Contains("page-1", html);
                Assert.Contains("page-2", html);
                Assert.Contains("page-3", html);
                Assert.Contains("Page 1 of 3", html);
                Assert.Contains("Page 2 of 3", html);
                Assert.Contains("Page 3 of 3", html);
                Assert.Contains("A4 portrait", html);
                Assert.Contains("page-break-after: always", html);

                // 2. Draft watermark & badge
                Assert.Contains("DRAFT - مسودة", html);
                Assert.Contains("watermark", html);

                // 3. Runtime assets presence (base64 data URI when assets exist in D:\AutoFix\Assets\InspectionReport\)
                if (System.IO.File.Exists(@"D:\AutoFix\Assets\InspectionReport\logo.png"))
                {
                    Assert.Contains("workshop-logo-large", html);
                    Assert.Contains("data:image/png;base64,", html);
                }
                if (System.IO.File.Exists(@"D:\AutoFix\Assets\InspectionReport\icons.png"))
                {
                    Assert.Contains("icons-strip-img", html);
                }
                if (System.IO.File.Exists(@"D:\AutoFix\Assets\InspectionReport\car-diagram.png"))
                {
                    Assert.Contains("diagram-img", html);
                }

                // 4. Default header shows Invoice NO
                Assert.Contains("Invoice NO: INV-2026-9999", html);

                // 5. Field list values rendered correctly
                Assert.Contains("12.6V Good", html);
                Assert.Contains("14.2V Charging", html);
                Assert.Contains("Max / Excellent", html);
                Assert.Contains("Smooth / High Response", html);
                Assert.Contains("Synthetic 5W30 OK", html);
                Assert.Contains("Bridgestone 7mm", html);
                Assert.Contains("Minor Scratches", html);
                Assert.Contains("No DTC Faults Stored", html);
                Assert.Contains("Car in prime condition", html);
            }
        }

        [Fact]
        public async Task ComprehensiveCarInspection_InvoiceTotalSetting_SwitchesDisplay()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var inspService = new InspectionService(db, dataFolder);

                var insp = await inspService.CreateAsync(new CreateInspectionDto
                {
                    CarMake = "BMW",
                    CarModel = "320i",
                    CarPlate = "س ص ع 5 5 5",
                    CustomerName = "Nader Samy",
                    CustomerPhone = "01122334455",
                    InvoiceNumber = "INV-777",
                    InvoiceAmount = 4500.00m,
                    Status = "Final"
                });

                // Default: showInvoiceTotal = false -> shows "Invoice NO: INV-777"
                var htmlDefault = await inspService.GenerateHtmlPrintReportAsync(insp.Id, showInvoiceTotal: false);
                Assert.Contains("Invoice NO: INV-777", htmlDefault);

                // Configured: showInvoiceTotal = true -> shows "Invoice Total: 4,500.00 L.E"
                var htmlTotal = await inspService.GenerateHtmlPrintReportAsync(insp.Id, showInvoiceTotal: true);
                Assert.Contains("Invoice Total: 4,500.00 L.E", htmlTotal);
            }
        }

        [Fact]
        public async Task ComprehensiveCarInspection_BlankPrintMode_And_FinalWatermark()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var inspService = new InspectionService(db, dataFolder);

                // Blank form test
                var blankHtml = await inspService.GenerateBlankFormHtmlAsync(showInvoiceTotal: false);
                Assert.Contains("page-1", blankHtml);
                Assert.Contains("page-2", blankHtml);
                Assert.Contains("page-3", blankHtml);
                Assert.Contains("Page 1 of 3", blankHtml);
                Assert.Contains("Page 2 of 3", blankHtml);
                Assert.Contains("Page 3 of 3", blankHtml);
                Assert.Contains("BLANK FORM - نموذج فارغ", blankHtml);
                Assert.DoesNotContain("class=\"watermark\"", blankHtml);

                // Finalized report test: Watermark should NOT be displayed
                var insp = await inspService.CreateAsync(new CreateInspectionDto
                {
                    CarMake = "Toyota",
                    CarModel = "Corolla",
                    CarPlate = "ق ك ل 1 2 3",
                    CustomerName = "Sherif Adel",
                    CustomerPhone = "01234567890",
                    Status = "Final"
                });

                var finalHtml = await inspService.GenerateHtmlPrintReportAsync(insp.Id);
                Assert.Contains("FINAL - معتمد", finalHtml);
                Assert.DoesNotContain("class=\"watermark\"", finalHtml);
            }
        }
    }
}

