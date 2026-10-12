using AutoFix.DTOs.Car;
using AutoFix.DTOs.Customer;
using AutoFix.DTOs.Mechanic;
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
    public class StageB_Features1And2Tests
    {
        [Fact]
        public async Task QuickAdd_AtomicCustomerAndCar_SuccessCreatesBothAndInitialOdometerLog()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);

                var dto = new QuickAddCustomerCarDto
                {
                    FullName = "Mahmoud Soliman",
                    Phone = "01012345678",
                    Email = "mahmoud@workshop.local",
                    Make = "Toyota",
                    Model = "Corolla",
                    Year = 2023,
                    LicensePlate = "س ل م 1 2 3",
                    VIN = "JTDKN3DU5N0099881",
                    CurrentOdometerKm = 24500
                };

                var result = await custService.QuickAddAsync(dto);

                Assert.NotNull(result);
                Assert.NotNull(result.Customer);
                Assert.NotNull(result.Car);
                Assert.Equal("Mahmoud Soliman", result.Customer.FullName);
                Assert.Equal(result.Customer.Id, result.Car.CustomerId);
                Assert.Equal("Toyota", result.Car.Make);
                Assert.Equal(24500, result.Car.CurrentOdometerKm);

                // Verify initial odometer log was created
                var odoLog = await db.CarOdometerLogs.FirstOrDefaultAsync(l => l.CarId == result.Car.Id);
                Assert.NotNull(odoLog);
                Assert.Equal(24500, odoLog.OdometerKm);
                Assert.Equal("QuickAdd", odoLog.Source);
            }
        }

        [Fact]
        public async Task QuickAdd_RollbackOnDuplicatePlate_DoesNotLeaveOrphanCustomer()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);

                // 1. First quick-add
                await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "First Owner",
                    Phone = "01111111111",
                    Make = "Honda",
                    Model = "Civic",
                    Year = 2022,
                    LicensePlate = "ق م ر 9 9 9",
                    VIN = "1HGCR2F83HA001122",
                    CurrentOdometerKm = 10000
                });

                var customerCountBefore = await db.Customers.CountAsync();

                // 2. Second quick add with duplicate plate and new customer phone
                var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    custService.QuickAddAsync(new QuickAddCustomerCarDto
                    {
                        FullName = "Second Owner",
                        Phone = "01222222222",
                        Make = "Honda",
                        Model = "Accord",
                        Year = 2023,
                        LicensePlate = "ق م ر 9 9 9", // DUPLICATE
                        VIN = "1HGCR2F83HA998877",
                        AllowDuplicateCar = false
                    }));

                Assert.Contains("DuplicateCarWarning", ex.Message);

                // Verify customer count did NOT increase (atomic rollback)
                var customerCountAfter = await db.Customers.CountAsync();
                Assert.Equal(customerCountBefore, customerCountAfter);
            }
        }

        [Fact]
        public async Task FastSearch_NormalizesArabicDigitsAndEgyptianPhone()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);

                // Create customer with standard phone
                await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "أحمد رضوان",
                    Phone = "01065432109",
                    Make = "Mitsubishi",
                    Model = "Lancer",
                    Year = 2021,
                    LicensePlate = "ل ن س 7 8 9",
                    VIN = "JA32U2FU8NU123456",
                    CurrentOdometerKm = 50000
                });

                // Search by Arabic digits phone "٠١٠٦٥٤٣٢١٠٩"
                var search1 = await custService.SearchAsync("٠١٠٦٥٤٣٢١٠٩");
                Assert.NotEmpty(search1);
                Assert.Equal("أحمد رضوان", search1[0].FullName);

                // Search with international prefix "+20 106 543 2109"
                var search2 = await custService.SearchAsync("+20 106 543 2109");
                Assert.NotEmpty(search2);
                Assert.Equal("أحمد رضوان", search2[0].FullName);

                // Search by plate with Arabic letters
                var search3 = await custService.SearchAsync("ل ن س");
                Assert.NotEmpty(search3);
                Assert.Equal("أحمد رضوان", search3[0].FullName);
            }
        }

        [Fact]
        public async Task OdometerTracking_LowerReading_RequiresConfirmationAndLogsWarning()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var carService = new CarService(db);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Nader Fawzy",
                    Phone = "01234567890",
                    Make = "Nissan",
                    Model = "Sunny",
                    Year = 2020,
                    LicensePlate = "ن د ر 1 1 1",
                    VIN = "3N1AB7AP8KL112233",
                    CurrentOdometerKm = 80000
                });

                var carId = quick.Car.Id;

                // 1. Normal increase to 85,000 km
                var log1 = await carService.UpdateOdometerAsync(carId, new UpdateOdometerRequestDto
                {
                    NewOdometerKm = 85000,
                    Source = "WorkOrder",
                    Notes = "Routine service check"
                });

                Assert.Equal(85000, log1.OdometerKm);
                Assert.False(log1.IsLowerReadingWarning);

                // 2. Attempt to lower to 75,000 km without confirmation -> throws LowerOdometerWarning
                var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    carService.UpdateOdometerAsync(carId, new UpdateOdometerRequestDto
                    {
                        NewOdometerKm = 75000,
                        AllowLowerOdometer = false
                    }));

                Assert.Contains("LowerOdometerWarning", ex.Message);

                // 3. Lower with AllowLowerOdometer = true -> succeeds and flags warning
                var log2 = await carService.UpdateOdometerAsync(carId, new UpdateOdometerRequestDto
                {
                    NewOdometerKm = 75000,
                    AllowLowerOdometer = true,
                    Notes = "Instrument cluster odometer replacement"
                });

                Assert.Equal(75000, log2.OdometerKm);
                Assert.True(log2.IsLowerReadingWarning);

                // 4. Verify history retrieves in chronological descending order
                var history = await carService.GetOdometerHistoryAsync(carId);
                Assert.Equal(3, history.Count); // QuickAdd (80k), Log1 (85k), Log2 (75k)
                Assert.Equal(75000, history[0].OdometerKm);
                Assert.True(history[0].IsLowerReadingWarning);
            }
        }

        [Fact]
        public async Task CustomerAndCarArchiving_PreservesHistoryAndAllowsRestore()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var carService = new CarService(db);

                var quick = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Sameh Samir",
                    Phone = "01511223344",
                    Make = "Renault",
                    Model = "Megane",
                    Year = 2022,
                    LicensePlate = "س م هـ 4 4 4",
                    VIN = "VF1KZ040E51234567",
                    CurrentOdometerKm = 40000
                });

                var custId = quick.Customer.Id;
                var carId = quick.Car.Id;

                // Create a completed work order
                var wo = new WorkOrder
                {
                    CustomerId = custId,
                    CarId = carId,
                    OrderNumber = "WO-TEST-001",
                    Status = "Completed",
                    CompletedAt = DateTime.UtcNow
                };
                db.WorkOrders.Add(wo);
                await db.SaveChangesAsync();

                // Archive customer
                var archived = await custService.ArchiveAsync(custId);
                Assert.True(archived);

                // Normal list excludes archived
                var activeList = await custService.GetAllAsync(includeArchived: false);
                Assert.DoesNotContain(activeList, c => c.Id == custId);

                // Query with includeArchived includes it
                var fullList = await custService.GetAllAsync(includeArchived: true);
                var archivedCust = fullList.FirstOrDefault(c => c.Id == custId);
                Assert.NotNull(archivedCust);
                Assert.True(archivedCust.IsDeleted);

                // Work order history remains intact in DB
                var woInDb = await db.WorkOrders.FirstOrDefaultAsync(w => w.Id == wo.Id);
                Assert.NotNull(woInDb);

                // Restore customer
                var restored = await custService.RestoreAsync(custId);
                Assert.True(restored);

                var activeListAfter = await custService.GetAllAsync(includeArchived: false);
                Assert.Contains(activeListAfter, c => c.Id == custId);
            }
        }

        [Fact]
        public async Task MechanicFilter_ReturnsCarsAssignedToMechanic()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);
                var carService = new CarService(db);

                // Create mechanic
                var mech = new Mechanic { FirstName = "Ali", LastName = "Mechanic", Email = "ali@workshop.local" };
                db.Mechanics.Add(mech);
                await db.SaveChangesAsync();

                var c1 = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Customer One",
                    Phone = "01011112222",
                    Make = "Ford",
                    Model = "Focus",
                    Year = 2020,
                    LicensePlate = "ف و ر 1",
                    VIN = "1FADP3F28LL112233"
                });

                var c2 = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Customer Two",
                    Phone = "01022223333",
                    Make = "Peugeot",
                    Model = "3008",
                    Year = 2021,
                    LicensePlate = "ب ج و 2",
                    VIN = "VF3M4AHXHJS001122"
                });

                // Assign mechanic to c1 work order
                db.WorkOrders.Add(new WorkOrder
                {
                    CustomerId = c1.Customer.Id,
                    CarId = c1.Car.Id,
                    OrderNumber = "WO-MECH-001",
                    AssignedTechnicianId = mech.Id
                });
                await db.SaveChangesAsync();

                // Query cars by mechanic
                var mechCars = await carService.GetCarsByMechanicAsync(mech.Id);

                Assert.Single(mechCars);
                Assert.Equal(c1.Car.Id, mechCars[0].Id);
                Assert.DoesNotContain(mechCars, c => c.Id == c2.Car.Id);
            }
        }

        [Fact]
        public async Task QuickAdd_SimplifiedForm_WithoutVinAndExtraFields_SuccessAndEmptyVinsDoNotCollide()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var custService = new CustomerService(db);

                // 1. Add first car with null VIN and omitted customer address/email/extraPhone
                var car1 = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Karim Zaki",
                    Phone = "01098765432",
                    CustomerNotes = "Regular customer",
                    Make = "Toyota",
                    Model = "Yaris",
                    Year = 2022,
                    LicensePlate = "ي ر س 1 2",
                    VIN = null, // Empty / omitted VIN
                    CurrentOdometerKm = 12000,
                    CarNotes = "First car"
                });

                Assert.NotNull(car1);
                Assert.Equal(string.Empty, car1.Car.VIN);
                Assert.Null(car1.Customer.Address);
                Assert.Null(car1.Customer.ExtraPhone);

                // 2. Add second car also with empty VIN - must NOT collide with car1
                var car2 = await custService.QuickAddAsync(new QuickAddCustomerCarDto
                {
                    FullName = "Sameh Hany",
                    Phone = "01187654321",
                    CustomerNotes = "New client",
                    Make = "Hyundai",
                    Model = "Elantra",
                    Year = 2021,
                    LicensePlate = "ل ن ت 4 5",
                    VIN = "", // Empty string VIN
                    CurrentOdometerKm = 35000,
                    CarNotes = "Second car"
                });

                Assert.NotNull(car2);
                Assert.NotEqual(car1.Car.Id, car2.Car.Id);
                Assert.Equal(string.Empty, car2.Car.VIN);

                // 3. Duplicate phone still throws
                await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    custService.QuickAddAsync(new QuickAddCustomerCarDto
                    {
                        FullName = "Duplicate Phone Guy",
                        Phone = "01098765432", // DUPLICATE PHONE
                        Make = "Kia",
                        Model = "Cerato",
                        Year = 2020,
                        LicensePlate = "ك ي ا 9 9"
                    }));

                // 4. Duplicate plate still throws
                await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    custService.QuickAddAsync(new QuickAddCustomerCarDto
                    {
                        FullName = "Duplicate Plate Guy",
                        Phone = "01599998888",
                        Make = "Kia",
                        Model = "Cerato",
                        Year = 2020,
                        LicensePlate = "ي ر س 1 2" // DUPLICATE PLATE
                    }));
            }
        }

        [Fact]
        public async Task Mechanic_StaffRecordOperations_CreateWithoutLogin_ArchiveAndWorkHistory()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var mechService = new MechanicService(db);

                // 1. Create pure staff mechanic (no username/email/password required)
                var created = await mechService.CreateAsync(new CreateMechanicDto
                {
                    FullName = "Hassan Abdelrahman",
                    Phone = "01055554444",
                    Notes = "Transmission expert",
                    IsActive = true
                });

                Assert.NotNull(created);
                Assert.Equal("Hassan", created.FirstName);
                Assert.Equal("Abdelrahman", created.LastName);
                Assert.Equal("01055554444", created.Phone);
                Assert.True(created.IsActive);
                Assert.False(created.IsDeleted);

                // 2. Active list contains created mechanic
                var activeList = await mechService.GetAllAsync(includeArchived: false);
                Assert.Contains(activeList, m => m.Id == created.Id);

                // 3. Create a work order assigned to this mechanic
                var cust = new Customer { FullName = "Owner Test", Phone = "01099991111" };
                db.Customers.Add(cust);
                await db.SaveChangesAsync();

                var car = new Car { CustomerId = cust.Id, Make = "Nissan", Model = "Qashqai", Year = 2022, LicensePlate = "ق ش ق 1" };
                db.Cars.Add(car);
                await db.SaveChangesAsync();

                var wo = new WorkOrder
                {
                    CustomerId = cust.Id,
                    CarId = car.Id,
                    OrderNumber = "WO-STAFF-001",
                    AssignedTechnicianId = created.Id,
                    TotalAmount = 1500m,
                    Status = "InProgress"
                };
                db.WorkOrders.Add(wo);
                await db.SaveChangesAsync();

                // 4. Check Work History profile
                var history = await mechService.GetWorkHistoryAsync(created.Id);
                Assert.NotNull(history);
                Assert.Equal(1, history.TotalOrdersWorked);
                Assert.Single(history.WorkOrders);
                Assert.Equal("WO-STAFF-001", history.WorkOrders[0].OrderNumber);
                Assert.Equal("Main", history.WorkOrders[0].Role);
                Assert.Equal(1500m, history.WorkOrders[0].TotalAmount);

                // 5. Archive mechanic (soft delete)
                var archived = await mechService.ArchiveAsync(created.Id);
                Assert.True(archived);

                // 6. Archived mechanic disappears from active dropdown list
                var activeListAfter = await mechService.GetAllAsync(includeArchived: false);
                Assert.DoesNotContain(activeListAfter, m => m.Id == created.Id);

                // 7. But appears when includeArchived = true
                var allList = await mechService.GetAllAsync(includeArchived: true);
                Assert.Contains(allList, m => m.Id == created.Id);

                // 8. Work history is still preserved!
                var historyAfterArchive = await mechService.GetWorkHistoryAsync(created.Id);
                Assert.NotNull(historyAfterArchive);
                Assert.Equal(1, historyAfterArchive.TotalOrdersWorked);
            }
        }

        [Fact]
        public async Task Mechanic_LoginRejected_WhenAttemptingDirectAuth()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<AuthService>.Instance;
                var authService = new AuthService(db, dataFolder, logger);

                // Seed mechanic user
                var mechUser = new AppUser
                {
                    Username = "mechanic_test",
                    FullName = "Old Mechanic",
                    Role = "Mechanic",
                    PasswordHash = "hashed"
                };
                db.AppUsers.Add(mechUser);
                await db.SaveChangesAsync();

                // Attempt to log in as mechanic
                var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                    authService.LoginAsync(new DTOs.Auth.LoginRequestDto
                    {
                        Username = "mechanic_test",
                        Password = "password123"
                    }));

                Assert.Contains("Mechanic accounts do not have direct login access", ex.Message);
            }
        }
    }
}
