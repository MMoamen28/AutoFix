using AutoFix.Data;
using AutoFix.DTOs.Invoice;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Exceptions;
using AutoFix.Helpers;
using AutoFix.Models;
using AutoFix.Services;
using AutoFix.Services.Interfaces;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
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
    public class JobCardAndLiveSyncTests
    {
        private static (AppDbContext Db, IDataFolderService DataFolder, SqliteConnection Connection) CreateMigratedTestContext()
        {
            var testDbId = Guid.NewGuid().ToString("N");
            var testDbFolder = Path.Combine(@"C:\AutoFixTestData", testDbId);
            Directory.CreateDirectory(testDbFolder);

            var inMemoryConfig = new Dictionary<string, string?>
            {
                { "DataDirectory", testDbFolder },
                { "DatabaseProvider", "Sqlite" },
                { "AuthMode", "Local" }
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

        [Theory]
        [InlineData("01012345678", "1012345678")]
        [InlineData("+201012345678", "1012345678")]
        [InlineData("00201012345678", "1012345678")]
        [InlineData("201012345678", "1012345678")]
        [InlineData("010-1234-5678", "1012345678")]
        [InlineData("010 1234 5678", "1012345678")]
        [InlineData("010  1234--5678", "1012345678")]
        [InlineData("٠١٠١٢٣٤٥٦٧٨", "1012345678")]
        [InlineData("۰۱۰۱۲۳۴۵۶۷۸", "1012345678")]
        [InlineData("+20 10 1234 5678", "1012345678")]
        [InlineData("0020-10-1234-5678", "1012345678")]
        [InlineData("٠١٠-١٢٣٤-٥٦٧٨", "1012345678")]
        [InlineData("+٢٠١٠١٢٣٤٥٦٧٨", "1012345678")]
        [InlineData("00٢٠١٠١٢٣٤٥٦٧٨", "1012345678")]
        [InlineData("+20-10-1234-5678", "1012345678")]
        [InlineData("01155566677", "1155566677")]
        [InlineData("٠١١٥٥٥٦٦٦٧٧", "1155566677")]
        [InlineData("+201200001111", "1200001111")]
        [InlineData("01599998888", "1599998888")]
        public void NormalizePhoneForComparison_NormalizesVariousFormatsAccurately(string rawInput, string expectedNormalized)
        {
            var actual = ArabicSearchNormalizer.NormalizePhoneForComparison(rawInput);
            Assert.Equal(expectedNormalized, actual);
            var stored = ArabicSearchNormalizer.FormatPhoneForStorage(rawInput);
            Assert.StartsWith("0", stored);
        }

        [Fact]
        public async Task ThreeConfirmationFlags_AreCompletelySeparated()
        {
            var (db, dataFolder, conn) = CreateMigratedTestContext();
            using (conn)
            using (db)
            {
                var workOrderService = new WorkOrderService(db, dataFolder);

                var customer = new Customer
                {
                    FullName = "عميل تجربة الفئات",
                    Phone = "01000000001"
                };
                db.Customers.Add(customer);
                await db.SaveChangesAsync();

                var car = new Car
                {
                    CustomerId = customer.Id,
                    LicensePlate = "ق ط ر 1 1 1",
                    Make = "Toyota",
                    Model = "Corolla",
                    CurrentOdometerKm = 50000
                };
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var bundleDto = new CreateWorkOrderBundleDto
                {
                    CustomerId = customer.Id,
                    CustomerName = customer.FullName,
                    CustomerPhone = "01000000001",
                    CarId = car.Id,
                    LicensePlate = car.LicensePlate,
                    Make = car.Make,
                    Model = car.Model,
                    OdometerInKm = 40000,
                    AllowDuplicatePhone = true,
                    AllowDuplicateCar = false,
                    AllowLowerOdometer = false
                };

                var ex = await Assert.ThrowsAsync<ValidationWarningException>(() => workOrderService.CreateBundleAsync(bundleDto));
                Assert.Equal("LowerOdometer", ex.Code);
                Assert.True(ex.RequiresConfirmation);

                bundleDto.AllowLowerOdometer = true;
                var created = await workOrderService.CreateBundleAsync(bundleDto);
                Assert.NotNull(created);
                Assert.Equal(40000, created.OdometerInKm);
            }
        }

        [Fact]
        public async Task ExistingCustomer_WithOneCar_ProcessesSuccessfully()
        {
            var (db, dataFolder, conn) = CreateMigratedTestContext();
            using (conn)
            using (db)
            {
                var workOrderService = new WorkOrderService(db, dataFolder);

                var customer = new Customer
                {
                    FullName = "عميل بسيارة واحدة",
                    Phone = "01111111111"
                };
                db.Customers.Add(customer);
                await db.SaveChangesAsync();

                var car = new Car
                {
                    CustomerId = customer.Id,
                    LicensePlate = "أ ب ج 1 2 3",
                    Make = "Hyundai",
                    Model = "Elantra",
                    CurrentOdometerKm = 20000
                };
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var bundleDto = new CreateWorkOrderBundleDto
                {
                    CustomerId = customer.Id,
                    CustomerName = customer.FullName,
                    CustomerPhone = customer.Phone,
                    CarId = car.Id,
                    LicensePlate = car.LicensePlate,
                    Make = car.Make,
                    Model = car.Model,
                    OdometerInKm = 25000
                };

                var created = await workOrderService.CreateBundleAsync(bundleDto);
                Assert.NotNull(created);
                Assert.Equal(customer.Id, created.CustomerId);
                Assert.Equal(car.Id, created.CarId);

                var updatedCar = await db.Cars.FindAsync(car.Id);
                Assert.Equal(25000, updatedCar!.CurrentOdometerKm);
            }
        }

        [Fact]
        public async Task ExistingCustomer_WithSeveralCars_SelectsSpecificCar()
        {
            var (db, dataFolder, conn) = CreateMigratedTestContext();
            using (conn)
            using (db)
            {
                var workOrderService = new WorkOrderService(db, dataFolder);

                var customer = new Customer
                {
                    FullName = "عميل بعدة سيارات",
                    Phone = "01222222222"
                };
                db.Customers.Add(customer);
                await db.SaveChangesAsync();

                var car1 = new Car { CustomerId = customer.Id, LicensePlate = "س ي ر 1", Make = "BMW", Model = "320i", CurrentOdometerKm = 30000 };
                var car2 = new Car { CustomerId = customer.Id, LicensePlate = "س ي ر 2", Make = "Mercedes", Model = "C200", CurrentOdometerKm = 45000 };
                db.Cars.AddRange(car1, car2);
                await db.SaveChangesAsync();

                var bundleDto = new CreateWorkOrderBundleDto
                {
                    CustomerId = customer.Id,
                    CustomerName = customer.FullName,
                    CustomerPhone = customer.Phone,
                    CarId = car2.Id,
                    LicensePlate = car2.LicensePlate,
                    Make = car2.Make,
                    Model = car2.Model,
                    OdometerInKm = 48000
                };

                var created = await workOrderService.CreateBundleAsync(bundleDto);
                Assert.NotNull(created);
                Assert.Equal(car2.Id, created.CarId);

                var dbCar2 = await db.Cars.FindAsync(car2.Id);
                Assert.Equal(48000, dbCar2!.CurrentOdometerKm);
            }
        }

        [Fact]
        public async Task ExistingCustomer_AddNewCar_SuccessfullyAttachesAndAudits()
        {
            var (db, dataFolder, conn) = CreateMigratedTestContext();
            using (conn)
            using (db)
            {
                var workOrderService = new WorkOrderService(db, dataFolder);

                var customer = new Customer
                {
                    FullName = "عميل يضيف سيارة جديدة",
                    Phone = "01555555555"
                };
                db.Customers.Add(customer);
                await db.SaveChangesAsync();

                var bundleDto = new CreateWorkOrderBundleDto
                {
                    CustomerId = customer.Id,
                    CustomerName = customer.FullName,
                    CustomerPhone = customer.Phone,
                    CarId = 0,
                    LicensePlate = "ج د ي د 9 9 9",
                    Make = "Nissan",
                    Model = "Sunny",
                    OdometerInKm = 10000
                };

                var created = await workOrderService.CreateBundleAsync(bundleDto);
                Assert.NotNull(created);
                Assert.Equal(customer.Id, created.CustomerId);
                Assert.True(created.CarId > 0);

                var addedCar = await db.Cars.FindAsync(created.CarId);
                Assert.NotNull(addedCar);
                Assert.Equal("ج د ي د 9 9 9", addedCar.LicensePlate);
                Assert.Equal(customer.Id, addedCar.CustomerId);
            }
        }

        [Fact]
        public async Task ExistingCustomer_ChangedPlate_AuditsOldAndNewValue()
        {
            var (db, dataFolder, conn) = CreateMigratedTestContext();
            using (conn)
            using (db)
            {
                var workOrderService = new WorkOrderService(db, dataFolder);

                var customer = new Customer
                {
                    FullName = "عميل يغير اللوحة",
                    Phone = "01099998888"
                };
                db.Customers.Add(customer);
                await db.SaveChangesAsync();

                var car = new Car
                {
                    CustomerId = customer.Id,
                    LicensePlate = "ق د ي م 1 1 1",
                    Make = "Kia",
                    Model = "Cerato",
                    CurrentOdometerKm = 15000
                };
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var bundleDto = new CreateWorkOrderBundleDto
                {
                    CustomerId = customer.Id,
                    CustomerName = customer.FullName,
                    CustomerPhone = customer.Phone,
                    CarId = car.Id,
                    LicensePlate = "م ع د ل 2 2 2",
                    Make = car.Make,
                    Model = car.Model,
                    OdometerInKm = 16000,
                    UpdateCarProfile = true
                };

                var created = await workOrderService.CreateBundleAsync(bundleDto);
                Assert.NotNull(created);

                var updatedCar = await db.Cars.FindAsync(car.Id);
                Assert.Equal("م ع د ل 2 2 2", updatedCar!.LicensePlate);

                var audit = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityName == "Car" && a.Action == "Update");
                Assert.NotNull(audit);
                using var oldDoc = System.Text.Json.JsonDocument.Parse(audit.OldValues!);
                Assert.Equal("ق د ي م 1 1 1", oldDoc.RootElement.GetProperty("LicensePlate").GetString());

                using var newDoc = System.Text.Json.JsonDocument.Parse(audit.NewValues!);
                Assert.Equal("م ع د ل 2 2 2", newDoc.RootElement.GetProperty("LicensePlate").GetString());
            }
        }

        [Fact]
        public async Task CustomerPhoneCollision_RejectsClearlyWithDuplicatePhoneCode()
        {
            var (db, dataFolder, conn) = CreateMigratedTestContext();
            using (conn)
            using (db)
            {
                var customerService = new CustomerService(db);

                var c1 = new Customer { FullName = "عميل أول", Phone = "01011112222" };
                var c2 = new Customer { FullName = "عميل ثان", Phone = "01033334444" };
                db.Customers.AddRange(c1, c2);
                await db.SaveChangesAsync();

                var updateDto = new AutoFix.DTOs.Customer.UpdateCustomerDto
                {
                    FullName = "عميل ثان معدل",
                    Phone = "+20 10 1111 2222"
                };

                var ex = await Assert.ThrowsAsync<ValidationWarningException>(() => customerService.UpdateAsync(c2.Id, updateDto));
                Assert.Equal("DuplicatePhone", ex.Code);
                Assert.True(ex.RequiresConfirmation);
                Assert.Equal(c1.Id, ex.ExistingRecordId);
            }
        }

        [Fact]
        public async Task ConcurrencyToken_PreventsConflictingUpdates()
        {
            var (db, dataFolder, conn) = CreateMigratedTestContext();
            using (conn)
            using (db)
            {
                var workOrderService = new WorkOrderService(db, dataFolder);

                var customer = new Customer { FullName = "عميل تجربة التزامن", Phone = "01077778888" };
                db.Customers.Add(customer);
                await db.SaveChangesAsync();

                var car = new Car { CustomerId = customer.Id, LicensePlate = "ت ز م 1 2 3", Make = "Fiat", Model = "Tipo", CurrentOdometerKm = 10000 };
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var bundle = await workOrderService.CreateBundleAsync(new CreateWorkOrderBundleDto
                {
                    CustomerId = customer.Id,
                    CustomerName = customer.FullName,
                    CustomerPhone = customer.Phone,
                    CarId = car.Id,
                    LicensePlate = car.LicensePlate,
                    Make = car.Make,
                    Model = car.Model,
                    OdometerInKm = 10000
                });

                var tokenDevice1 = bundle.ConcurrencyToken;
                var tokenDevice2 = bundle.ConcurrencyToken;

                var update1 = new UpdateWorkOrderDto
                {
                    ConcurrencyToken = tokenDevice1,
                    CustomerComplaint = "تعديل من جهاز 1",
                    FuelLevel = "Full",
                    OdometerInKm = 10500,
                    Lines = new List<CreateWorkOrderLineDto>()
                };

                var result1 = await workOrderService.UpdateAsync(bundle.Id, update1);
                Assert.NotNull(result1);
                Assert.NotEqual(tokenDevice1, result1.ConcurrencyToken);

                var update2 = new UpdateWorkOrderDto
                {
                    ConcurrencyToken = tokenDevice2,
                    CustomerComplaint = "تعديل من جهاز 2 متعارض",
                    FuelLevel = "Half",
                    OdometerInKm = 10600,
                    Lines = new List<CreateWorkOrderLineDto>()
                };

                await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => workOrderService.UpdateAsync(bundle.Id, update2));
            }
        }

        [Fact]
        public async Task InvoiceConcurrency_PreventsConflictingUpdates()
        {
            var (db, dataFolder, conn) = CreateMigratedTestContext();
            using (conn)
            using (db)
            {
                var customer = new Customer
                {
                    FullName = "عميل الفاتورة المتزامنة",
                    Phone = "01099887766"
                };
                db.Customers.Add(customer);

                var car = new Car
                {
                    LicensePlate = "ق م ن 456",
                    Make = "Toyota",
                    Model = "Corolla",
                    Year = 2021,
                    Customer = customer
                };
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var invoiceService = new InvoiceService(db, dataFolder);
                var created = await invoiceService.CreateAsync(new CreateInvoiceDto
                {
                    CustomerId = customer.Id,
                    CarId = car.Id,
                    Notes = "فاتورة اختبار التعارض"
                });

                var tokenDevice1 = created.ConcurrencyToken;
                var tokenDevice2 = created.ConcurrencyToken;

                var update1 = new UpdateInvoiceNumberDto
                {
                    NewInvoiceNumber = "INV-CUSTOM-001",
                    Reason = "تعديل جهاز 1",
                    ConcurrencyToken = tokenDevice1
                };

                var result1 = await invoiceService.UpdateInvoiceNumberAsync(created.Id, update1, "Admin", true);
                Assert.NotNull(result1);
                Assert.NotEqual(tokenDevice1, result1.ConcurrencyToken);

                var update2 = new UpdateInvoiceNumberDto
                {
                    NewInvoiceNumber = "INV-CUSTOM-002",
                    Reason = "تعديل جهاز 2 متعارض",
                    ConcurrencyToken = tokenDevice2
                };

                var ex = await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() =>
                    invoiceService.UpdateInvoiceNumberAsync(created.Id, update2, "Admin", true));
                Assert.Equal("تم تعديل هذا السجل من جهاز آخر، أعد التحميل", ex.Message);
            }
        }
    }
}
