using AutoFix.Controllers;
using AutoFix.Data;
using AutoFix.DTOs.Invoice;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Models;
using AutoFix.Services;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace AutoFix.Tests
{
    public class MoneyAndConcurrencyTests
    {
        private static (AppDbContext Db, IDataFolderService DataFolder, SqliteConnection Connection) CreateCleanTestContext()
        {
            var testDbId = Guid.NewGuid().ToString("N");
            var testDbFolder = Path.Combine(@"C:\AutoFixTestData", "MoneyTests_" + testDbId);
            Directory.CreateDirectory(testDbFolder);

            var inMemoryConfig = new Dictionary<string, string?>
            {
                { "DataDirectory", testDbFolder },
                { "DatabaseProvider", "Sqlite" },
                { "AuthMode", "None" }
            };

            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemoryConfig)
                .Build();

            using var loggerFactory = LoggerFactory.Create(b => b.AddConsole());
            var logger = loggerFactory.CreateLogger<DataFolderService>();
            var dataFolder = new DataFolderService(configuration, logger);

            var connection = new SqliteConnection(dataFolder.GetConnectionString());
            connection.Open();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;";
                cmd.ExecuteNonQuery();
            }

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(connection)
                .Options;

            var db = new AppDbContext(options);
            db.Database.Migrate();
            DbInitializer.Initialize(db);

            return (db, dataFolder, connection);
        }

        [Fact]
        public async Task Test_Migration_OldRowsCanBeEdited_WithoutFalseConflict()
        {
            var testDbId = Guid.NewGuid().ToString("N");
            var testDbFolder = Path.Combine(@"C:\AutoFixTestData", "MigOld_" + testDbId);
            Directory.CreateDirectory(testDbFolder);

            var inMemoryConfig = new Dictionary<string, string?>
            {
                { "DataDirectory", testDbFolder },
                { "DatabaseProvider", "Sqlite" },
                { "AuthMode", "None" }
            };

            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemoryConfig)
                .Build();

            using var loggerFactory = LoggerFactory.Create(b => b.AddConsole());
            var logger = loggerFactory.CreateLogger<DataFolderService>();
            var dataFolder = new DataFolderService(configuration, logger);

            var connection = new SqliteConnection(dataFolder.GetConnectionString());
            connection.Open();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;";
                cmd.ExecuteNonQuery();
            }

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(connection)
                .Options;

            using (var db = new AppDbContext(options))
            {
                var migrator = db.Database.GetService<Microsoft.EntityFrameworkCore.Migrations.IMigrator>();
                migrator.Migrate("20261013064800_StageB_07_WorkOrderLineAddedAt");

                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = @"
                        INSERT INTO Customers (FullName, Phone, Email, KeycloakUserId, CreatedAt, IsDeleted) 
                        VALUES ('عميل قديم', '01012341234', 'old@autofix.com', 'kc-old-01', '2026-01-01', 0);
                        
                        INSERT INTO Cars (CustomerId, LicensePlate, Make, Model, Year, VIN, CurrentOdometerKm, IsDeleted) 
                        VALUES (last_insert_rowid(), 'ق د ي 1', 'Toyota', 'Corolla', 2020, 'VIN1234567890', 50000, 0);
                        
                        INSERT INTO WorkOrders (OrderNumber, CustomerId, CarId, Status, ReceivedAt, TotalAmount, IsDeleted, TotalLabor, TotalParts, TotalWorkmanship, OdometerInKm, FuelLevel, CustomerComplaint, InspectionNotes, WorkType, WorkDone, WorkToBeDone, Notes)
                        VALUES ('WO-OLD-01', 1, 1, 'Pending', '2026-01-01', 1000, 0, 500, 500, 0, 50000, 'Half', 'شكوى قديمة', '', 'Maintenance', '', '', '');

                        INSERT INTO Invoices (InvoiceNumber, CustomerId, CarId, Status, Currency, IssuedAt, Subtotal, DiscountAmount, VatPercentage, VatAmount, TotalAmount, PaidAmount, Notes, SnapshotDetailsJson, IsDeleted)
                        VALUES ('INV-OLD-01', 1, 1, 'Draft', 'EGP', '2026-01-01', 1000, 0, 0, 0, 1000, 0, 'فاتورة قديمة', '[]', 0);
                    ";
                    cmd.ExecuteNonQuery();
                }

                migrator.Migrate("20261015004955_AddConcurrencyTokensToWorkOrderAndInvoice");

                var oldWo = await db.WorkOrders.FirstAsync(w => w.OrderNumber == "WO-OLD-01");
                Assert.Equal("", oldWo.ConcurrencyToken);

                var workOrderService = new WorkOrderService(db, dataFolder);
                var updateDto = new UpdateWorkOrderDto
                {
                    ConcurrencyToken = oldWo.ConcurrencyToken,
                    CustomerComplaint = "تعديل ناجح بدون تعارض زائف",
                    FuelLevel = "Full",
                    OdometerInKm = 52000,
                    Lines = new List<CreateWorkOrderLineDto>()
                };

                var updatedWo = await workOrderService.UpdateAsync(oldWo.Id, updateDto);
                Assert.NotNull(updatedWo);
                Assert.False(string.IsNullOrEmpty(updatedWo.ConcurrencyToken));

                var oldInv = await db.Invoices.FirstAsync(i => i.InvoiceNumber == "INV-OLD-01");
                Assert.Equal("", oldInv.ConcurrencyToken);

                var invoiceService = new InvoiceService(db, dataFolder);
                var updateInvDto = new UpdateInvoiceDateDto
                {
                    NewIssuedAt = DateTime.UtcNow,
                    Reason = "تعديل تاريخ فاتورة قديمة",
                    ConcurrencyToken = oldInv.ConcurrencyToken
                };

                var updatedInv = await invoiceService.UpdateInvoiceDateAsync(oldInv.Id, updateInvDto, "Admin", true);
                Assert.NotNull(updatedInv);
                Assert.False(string.IsNullOrEmpty(updatedInv.ConcurrencyToken));
            }

            connection.Close();
        }

        [Fact]
        public async Task Test_FullPayment()
        {
            var (db, dataFolder, conn) = CreateCleanTestContext();
            using (conn)
            using (db)
            {
                var customer = new Customer { FullName = "عميل سداد كلي", Phone = "01011112222" };
                var car = new Car { Customer = customer, LicensePlate = "س د د 1 1 1", Make = "Toyota", Model = "Yaris" };
                db.Customers.Add(customer);
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var invoice = new Invoice
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    InvoiceNumber = "INV-FULL-001",
                    Subtotal = 1000m,
                    TotalAmount = 1000m,
                    PaidAmount = 0m,
                    Status = "Issued",
                    Currency = "EGP",
                    IssuedAt = DateTime.UtcNow
                };
                db.Invoices.Add(invoice);
                await db.SaveChangesAsync();

                var invoiceService = new InvoiceService(db, dataFolder);
                var paymentRes = await invoiceService.RecordPaymentAsync(invoice.Id, new RecordPaymentDto
                {
                    Amount = 1000m,
                    PaymentMethod = "Cash",
                    Notes = "دفع كامل"
                }, "Admin");

                Assert.Equal(1000m, paymentRes.PaidAmount);
                Assert.Equal(0m, paymentRes.RemainingAmount);

                var reloaded = await db.Invoices.FindAsync(invoice.Id);
                Assert.NotNull(reloaded);
                Assert.Equal("Paid", reloaded.Status);
                Assert.Equal(1000m, reloaded.PaidAmount);
            }
        }

        [Fact]
        public async Task Test_PartialThenRest()
        {
            var (db, dataFolder, conn) = CreateCleanTestContext();
            using (conn)
            using (db)
            {
                var customer = new Customer { FullName = "عميل سداد جزئي", Phone = "01033334444" };
                var car = new Car { Customer = customer, LicensePlate = "ج ز ء 2 2 2", Make = "Hyundai", Model = "Elantra" };
                db.Customers.Add(customer);
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var invoice = new Invoice
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    InvoiceNumber = "INV-PART-001",
                    Subtotal = 1000m,
                    TotalAmount = 1000m,
                    PaidAmount = 0m,
                    Status = "Issued",
                    Currency = "EGP",
                    IssuedAt = DateTime.UtcNow
                };
                db.Invoices.Add(invoice);
                await db.SaveChangesAsync();

                var invoiceService = new InvoiceService(db, dataFolder);
                
                var part1 = await invoiceService.RecordPaymentAsync(invoice.Id, new RecordPaymentDto
                {
                    Amount = 400m,
                    PaymentMethod = "Cash"
                }, "Admin");

                Assert.Equal(400m, part1.PaidAmount);
                Assert.Equal(600m, part1.RemainingAmount);

                var reloaded1 = await db.Invoices.FindAsync(invoice.Id);
                Assert.NotNull(reloaded1);
                Assert.Equal("PartiallyPaid", reloaded1.Status);

                var part2 = await invoiceService.RecordPaymentAsync(invoice.Id, new RecordPaymentDto
                {
                    Amount = 600m,
                    PaymentMethod = "Cash"
                }, "Admin");

                Assert.Equal(1000m, part2.PaidAmount);
                Assert.Equal(0m, part2.RemainingAmount);

                var reloaded2 = await db.Invoices.FindAsync(invoice.Id);
                Assert.NotNull(reloaded2);
                Assert.Equal("Paid", reloaded2.Status);
            }
        }

        [Fact]
        public async Task Test_OverpaymentRejected()
        {
            var (db, dataFolder, conn) = CreateCleanTestContext();
            using (conn)
            using (db)
            {
                var customer = new Customer { FullName = "عميل زيادة", Phone = "01055556666" };
                var car = new Car { Customer = customer, LicensePlate = "ز ي د 3 3 3", Make = "Kia", Model = "Cerato" };
                db.Customers.Add(customer);
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var invoice = new Invoice
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    InvoiceNumber = "INV-OVER-001",
                    Subtotal = 1000m,
                    TotalAmount = 1000m,
                    PaidAmount = 0m,
                    Status = "Issued",
                    Currency = "EGP",
                    IssuedAt = DateTime.UtcNow
                };
                db.Invoices.Add(invoice);
                await db.SaveChangesAsync();

                var invoiceService = new InvoiceService(db, dataFolder);
                await Assert.ThrowsAsync<InvalidOperationException>(() => invoiceService.RecordPaymentAsync(invoice.Id, new RecordPaymentDto
                {
                    Amount = 1500m,
                    PaymentMethod = "Cash"
                }, "Admin"));
            }
        }

        [Fact]
        public async Task Test_CancelledInvoiceRejected()
        {
            var (db, dataFolder, conn) = CreateCleanTestContext();
            using (conn)
            using (db)
            {
                var customer = new Customer { FullName = "عميل ملغي", Phone = "01077779999" };
                var car = new Car { Customer = customer, LicensePlate = "ل غ ي 4 4 4", Make = "Nissan", Model = "Sunny" };
                db.Customers.Add(customer);
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var invoice = new Invoice
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    InvoiceNumber = "INV-CANC-001",
                    Subtotal = 1000m,
                    TotalAmount = 1000m,
                    PaidAmount = 0m,
                    Status = "Cancelled",
                    Currency = "EGP",
                    IssuedAt = DateTime.UtcNow
                };
                db.Invoices.Add(invoice);
                await db.SaveChangesAsync();

                var invoiceService = new InvoiceService(db, dataFolder);
                await Assert.ThrowsAsync<InvalidOperationException>(() => invoiceService.RecordPaymentAsync(invoice.Id, new RecordPaymentDto
                {
                    Amount = 500m,
                    PaymentMethod = "Cash"
                }, "Admin"));
            }
        }

        [Fact]
        public async Task Test_DashboardRevenueExpensesNetProfit_WithRefundAndCancelledInvoice()
        {
            var (db, dataFolder, conn) = CreateCleanTestContext();
            using (conn)
            using (db)
            {
                var customer = new Customer { FullName = "عميل أرباح", Phone = "01088880000" };
                var car = new Car { Customer = customer, LicensePlate = "ر ب ح 5 5 5", Make = "BMW", Model = "320i" };
                db.Customers.Add(customer);
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var inv1 = new Invoice
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    InvoiceNumber = "INV-DASH-001",
                    Subtotal = 1000m,
                    TotalAmount = 1000m,
                    PaidAmount = 1000m,
                    Status = "Paid",
                    Currency = "EGP",
                    IssuedAt = DateTime.UtcNow
                };
                db.Invoices.Add(inv1);
                await db.SaveChangesAsync();

                db.InvoicePayments.Add(new InvoicePayment
                {
                    InvoiceId = inv1.Id,
                    Amount = 1000m,
                    PaymentMethod = "Cash",
                    PaidAt = DateTime.UtcNow,
                    ReceivedByUserId = "Admin"
                });

                var inv2 = new Invoice
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    InvoiceNumber = "INV-DASH-002",
                    Subtotal = 500m,
                    TotalAmount = 500m,
                    PaidAmount = 0m,
                    Status = "Credited",
                    Currency = "EGP",
                    IssuedAt = DateTime.UtcNow
                };
                db.Invoices.Add(inv2);
                await db.SaveChangesAsync();

                db.InvoicePayments.Add(new InvoicePayment
                {
                    InvoiceId = inv2.Id,
                    Amount = 500m,
                    PaymentMethod = "Cash",
                    PaidAt = DateTime.UtcNow,
                    ReceivedByUserId = "Admin"
                });
                db.InvoicePayments.Add(new InvoicePayment
                {
                    InvoiceId = inv2.Id,
                    Amount = -500m,
                    PaymentMethod = "Refund",
                    PaidAt = DateTime.UtcNow,
                    ReceivedByUserId = "Admin"
                });

                var inv3 = new Invoice
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    InvoiceNumber = "INV-DASH-003",
                    Subtotal = 300m,
                    TotalAmount = 300m,
                    PaidAmount = 300m,
                    Status = "Cancelled",
                    Currency = "EGP",
                    IssuedAt = DateTime.UtcNow
                };
                db.Invoices.Add(inv3);
                await db.SaveChangesAsync();

                db.InvoicePayments.Add(new InvoicePayment
                {
                    InvoiceId = inv3.Id,
                    Amount = 300m,
                    PaymentMethod = "Cash",
                    PaidAt = DateTime.UtcNow,
                    ReceivedByUserId = "Admin"
                });

                db.TreasuryTransactions.Add(new TreasuryTransaction
                {
                    TransactionType = "Expense",
                    Amount = 200m,
                    Category = "Utilities",
                    Description = "كهرباء ومياه",
                    TransactionDate = DateTime.UtcNow,
                    PerformedByUserId = "Admin"
                });

                await db.SaveChangesAsync();

                var workOrderService = new WorkOrderService(db, dataFolder);
                var dashboardService = new DashboardService(db, workOrderService);
                var summary = await dashboardService.GetFinancialSummaryAsync("today");

                Assert.NotNull(summary);
                Assert.Equal(1000m, summary.TotalRevenue);
                Assert.Equal(200m, summary.TotalExpenses);
                Assert.Equal(800m, summary.NetProfit);
            }
        }

        [Fact]
        public async Task Test_RecordPayment_TwoDevicesPayingSameInvoice_SecondIsRejected()
        {
            var (db, dataFolder, conn) = CreateCleanTestContext();
            using (conn)
            using (db)
            {
                var customer = new Customer { FullName = "عميل تزامن الدفع", Phone = "01099991111" };
                var car = new Car { Customer = customer, LicensePlate = "د ف ع 1 1 1", Make = "Toyota", Model = "Corolla" };
                db.Customers.Add(customer);
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var invoice = new Invoice
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    InvoiceNumber = "INV-CONCUR-001",
                    Subtotal = 1000m,
                    TotalAmount = 1000m,
                    PaidAmount = 0m,
                    Status = "Issued",
                    Currency = "EGP",
                    IssuedAt = DateTime.UtcNow
                };
                db.Invoices.Add(invoice);
                await db.SaveChangesAsync();

                var token = invoice.ConcurrencyToken;
                var invoiceService = new InvoiceService(db, dataFolder);

                var device1Req = new RecordPaymentDto
                {
                    Amount = 400m,
                    PaymentMethod = "Cash",
                    ReferenceNumber = "PAY-DEV1",
                    ConcurrencyToken = token
                };
                var dev1Payment = await invoiceService.RecordPaymentAsync(invoice.Id, device1Req, "Device1");
                Assert.NotNull(dev1Payment);
                Assert.Equal(400m, dev1Payment.PaidAmount);
                Assert.Equal(600m, dev1Payment.RemainingAmount);

                var device2Req = new RecordPaymentDto
                {
                    Amount = 300m,
                    PaymentMethod = "Cash",
                    ReferenceNumber = "PAY-DEV2",
                    ConcurrencyToken = token
                };

                var ex = await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() =>
                    invoiceService.RecordPaymentAsync(invoice.Id, device2Req, "Device2"));
                Assert.Contains("تم تعديل هذا السجل من جهاز آخر، أعد التحميل", ex.Message);

                var controller = new InvoicesController(invoiceService);
                controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
                var actionResult = await controller.RecordPayment(invoice.Id, device2Req);
                var objectResult = Assert.IsType<ObjectResult>(actionResult.Result);
                Assert.Equal(409, objectResult.StatusCode);

                var refreshedInvoice = await invoiceService.GetByIdAsync(invoice.Id);
                Assert.NotNull(refreshedInvoice);
                Assert.Equal(400m, refreshedInvoice.PaidAmount);
                Assert.Equal(600m, refreshedInvoice.RemainingAmount);
                Assert.Single(refreshedInvoice.Payments);
            }
        }

        [Fact]
        public async Task Test_RecordPayment_RetryOfSameRequest_DoesNotDoubleRecordPayment()
        {
            var (db, dataFolder, conn) = CreateCleanTestContext();
            using (conn)
            using (db)
            {
                var customer = new Customer { FullName = "عميل إعادة المحاولة", Phone = "01099992222" };
                var car = new Car { Customer = customer, LicensePlate = "ع د د 2 2 2", Make = "Honda", Model = "Civic" };
                db.Customers.Add(customer);
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var invoice = new Invoice
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    InvoiceNumber = "INV-RETRY-001",
                    Subtotal = 1000m,
                    TotalAmount = 1000m,
                    PaidAmount = 0m,
                    Status = "Issued",
                    Currency = "EGP",
                    IssuedAt = DateTime.UtcNow
                };
                db.Invoices.Add(invoice);
                await db.SaveChangesAsync();

                var invoiceService = new InvoiceService(db, dataFolder);
                var controller = new InvoicesController(invoiceService);
                controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

                var paymentReq = new RecordPaymentDto
                {
                    InvoiceId = invoice.Id,
                    Amount = 500m,
                    PaymentMethod = "Cash",
                    ReferenceNumber = "TX-IDEMP-001",
                    ConcurrencyToken = invoice.ConcurrencyToken
                };

                var firstRes = await controller.RecordPayment(invoice.Id, paymentReq);
                var firstOk = Assert.IsType<OkObjectResult>(firstRes.Result);
                var firstPayment = Assert.IsType<PaymentResponseDto>(firstOk.Value);
                Assert.Equal(500m, firstPayment.Amount);

                var retryRes = await controller.RecordPayment(invoice.Id, paymentReq);
                var retryOk = Assert.IsType<OkObjectResult>(retryRes.Result);
                var retryPayment = Assert.IsType<PaymentResponseDto>(retryOk.Value);
                Assert.Equal(firstPayment.Id, retryPayment.Id);

                var paymentsCount = await db.InvoicePayments.CountAsync(p => p.InvoiceId == invoice.Id && !p.IsDeleted);
                Assert.Equal(1, paymentsCount);

                var refreshedInvoice = await invoiceService.GetByIdAsync(invoice.Id);
                Assert.NotNull(refreshedInvoice);
                Assert.Equal(500m, refreshedInvoice.PaidAmount);
                Assert.Equal(500m, refreshedInvoice.RemainingAmount);

                var treasuryTransactionsCount = await db.TreasuryTransactions.CountAsync(t => t.ReferenceNumber == invoice.InvoiceNumber && t.Category == "InvoicePayment");
                Assert.Equal(1, treasuryTransactionsCount);
            }
        }
    }
}
