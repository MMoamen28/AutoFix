using AutoFix.Models;
using AutoFix.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace AutoFix.Tests
{
    public class DataSafetyAndBackupTests
    {
        [Fact]
        public async Task SoftDelete_HidesRecordWithoutPhysicalDeletion()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var customer = new Customer
                {
                    FullName = "Tarek Al-Masry",
                    Phone = "01123456789",
                    Email = "tarek@workshop.local"
                };
                db.Customers.Add(customer);
                await db.SaveChangesAsync();

                var customerId = customer.Id;
                Assert.True(customerId > 0);

                // Perform soft delete
                db.Customers.Remove(customer);
                await db.SaveChangesAsync();

                // Standard query with global filter should NOT find it
                var activeCustomer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId);
                Assert.Null(activeCustomer);

                // Query ignoring filter confirms it was NOT physically deleted
                var deletedCustomer = await db.Customers.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == customerId);
                Assert.NotNull(deletedCustomer);
                Assert.True(deletedCustomer.IsDeleted);
                Assert.NotNull(deletedCustomer.DeletedAt);
            }
        }

        [Fact]
        public async Task SoftRestore_BringsArchivedRecordBack()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var part = new SparePart
                {
                    Name = "Air Filter",
                    PartNumber = "PN-AIRFILTER-TEST",
                    UnitPrice = 150m,
                    StockQuantity = 10
                };
                db.SpareParts.Add(part);
                await db.SaveChangesAsync();

                // Soft delete
                db.SpareParts.Remove(part);
                await db.SaveChangesAsync();

                Assert.Null(await db.SpareParts.FirstOrDefaultAsync(p => p.PartNumber == "PN-AIRFILTER-TEST"));

                // Restore
                var archivedPart = await db.SpareParts.IgnoreQueryFilters().FirstAsync(p => p.PartNumber == "PN-AIRFILTER-TEST");
                archivedPart.IsDeleted = false;
                archivedPart.DeletedAt = null;
                await db.SaveChangesAsync();

                var restoredPart = await db.SpareParts.FirstOrDefaultAsync(p => p.PartNumber == "PN-AIRFILTER-TEST");
                Assert.NotNull(restoredPart);
                Assert.False(restoredPart.IsDeleted);
            }
        }

        [Fact]
        public async Task OnlineBackup_CreatesVerifiedBackupFile()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<BackupService>();
                var backupService = new BackupService(dataFolder, logger, db);

                var backupInfo = await backupService.CreateBackupAsync("TestBackupRoutine");

                Assert.NotNull(backupInfo.FileName);
                Assert.True(File.Exists(backupInfo.FullPath));
                Assert.True(backupInfo.SizeBytes > 0);
                Assert.True(backupInfo.IsVerified);

                var integrityOk = await backupService.VerifyDatabaseIntegrityAsync(backupInfo.FullPath);
                Assert.True(integrityOk);
            }
        }

        [Fact]
        public async Task SafeRestore_CreatesSafetyCopyAndRestoresDatabase()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<BackupService>();
                var backupService = new BackupService(dataFolder, logger, db);

                // Add test customer before backup
                db.Customers.Add(new Customer { FullName = "Snapshot Customer", Phone = "01000000001" });
                await db.SaveChangesAsync();

                var backupInfo = await backupService.CreateBackupAsync("PreChangeBackup");

                // Add second customer after backup
                db.Customers.Add(new Customer { FullName = "PostBackup Customer", Phone = "01000000002" });
                await db.SaveChangesAsync();

                Assert.Equal(2, await db.Customers.CountAsync());

                // Restore from pre-change backup
                var restoreSuccess = await backupService.RestoreBackupAsync(backupInfo.FileName);
                Assert.True(restoreSuccess);

                // Verify pre-restore safety copy was created
                var backups = await backupService.ListBackupsAsync();
                Assert.Contains(backups, b => b.FileName.StartsWith("safety_pre_restore_"));
            }
        }

        [Fact]
        public async Task ExportAllDataAsCsv_ProducesValidTables()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<BackupService>();
                var backupService = new BackupService(dataFolder, logger, db);

                var csvData = await backupService.ExportAllDataAsCsvAsync();

                Assert.True(csvData.ContainsKey("customers.csv"));
                Assert.True(csvData.ContainsKey("cars.csv"));
                Assert.True(csvData.ContainsKey("repair_orders.csv"));
                Assert.True(csvData.ContainsKey("receipts.csv"));
                Assert.True(csvData.ContainsKey("spare_parts.csv"));

                Assert.Contains("FullName", csvData["customers.csv"]);
                Assert.Contains("LicensePlate", csvData["cars.csv"]);
            }
        }

        [Fact]
        public async Task RestoreWhileAppIsRunning_MaintainsIntegrityAndSnapshot()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<BackupService>();
                var backupService = new BackupService(dataFolder, logger, db);

                // Add original baseline data
                db.Customers.Add(new Customer { FullName = "Baseline Customer", Phone = "01100000001" });
                await db.SaveChangesAsync();

                var baselineBackup = await backupService.CreateBackupAsync("OnlineBaseline");

                // Simulate active operations: add new unconfirmed data
                db.Customers.Add(new Customer { FullName = "Unsaved Temporary Customer", Phone = "01100000002" });
                await db.SaveChangesAsync();
                Assert.Equal(2, await db.Customers.CountAsync());

                // Concurrent read while restoring
                var readTask = Task.Run(async () =>
                {
                    await Task.Delay(10);
                    return await db.Customers.AnyAsync();
                });

                var restoreSuccess = await backupService.RestoreBackupAsync(baselineBackup.FileName);
                await readTask;

                Assert.True(restoreSuccess);

                // Verify pre-restore safety snapshot was recorded
                var backups = await backupService.ListBackupsAsync();
                Assert.Contains(backups, b => b.FileName.StartsWith("safety_pre_restore_"));

                // Verify restored state has exactly the baseline customer
                db.ChangeTracker.Clear();
                var customers = await db.Customers.ToListAsync();
                Assert.Single(customers);
                Assert.Equal("Baseline Customer", customers[0].FullName);

                // Database integrity verified
                var integrity = await backupService.VerifyDatabaseIntegrityAsync(dataFolder.DatabasePath);
                Assert.True(integrity);
            }
        }

        [Fact]
        public async Task MidWriteInterruption_WalDurability_NoCorruptionOrHalfSavedRecords()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<BackupService>();
                var backupService = new BackupService(dataFolder, logger, db);

                var initialCount = await db.Customers.CountAsync();

                // Open independent connection simulating mid-operation write crash
                using (var crashConn = new SqliteConnection(dataFolder.GetConnectionString()))
                {
                    await crashConn.OpenAsync();
                    using var tran = crashConn.BeginTransaction();
                    using var cmd = crashConn.CreateCommand();
                    cmd.Transaction = tran;
                    cmd.CommandText = "INSERT INTO Customers (FullName, Phone, Email, KeycloakUserId, IsDeleted, CreatedAt) VALUES ('Killed Customer', '01999999999', 'killed@autofix.test', 'kc-test-id', 0, '2026-10-12');";
                    cmd.ExecuteNonQuery();

                    // Simulate sudden process termination / crash before commit
                    crashConn.Close(); // Closes without transaction commit
                }

                // Verify WAL durability: rollback occurred, zero uncommitted records
                db.ChangeTracker.Clear();
                var afterCrashCount = await db.Customers.CountAsync();
                Assert.Equal(initialCount, afterCrashCount);

                // Verify integrity is intact
                var integrity = await backupService.VerifyDatabaseIntegrityAsync(dataFolder.DatabasePath);
                Assert.True(integrity);
            }
        }

        [Fact]
        public async Task BackupRetention_NeverDeletesNewestBackups_AndAbortsIfVerificationFails()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<BackupService>();
                var backupService = new BackupService(dataFolder, logger, db);

                // Generate 5 backups
                var createdFiles = new List<string>();
                for (int i = 1; i <= 5; i++)
                {
                    var b = await backupService.CreateBackupAsync($"RetentionTest_{i}");
                    createdFiles.Add(b.FileName);
                    await Task.Delay(20);
                }

                var backupsBefore = await backupService.ListBackupsAsync();
                Assert.True(backupsBefore.Count >= 5);

                // Prune retention: newest backups must NOT be touched
                await backupService.PruneOldBackupsAsync();
                var backupsAfter = await backupService.ListBackupsAsync();

                // The most recent backup must ALWAYS exist
                var latestBackup = createdFiles.Last();
                Assert.Contains(backupsAfter, b => b.FileName == latestBackup);

                // Simulate corrupted latest backup
                SqliteConnection.ClearAllPools();
                var corruptPath = Path.Combine(dataFolder.BackupsPath, latestBackup);
                await File.WriteAllTextAsync(corruptPath, "CORRUPT_INVALID_HEADER_DATA");

                // Prune should detect verification failure and abort pruning
                await backupService.PruneOldBackupsAsync();

                // File is preserved for forensics rather than blindly purged
                Assert.True(File.Exists(corruptPath));
            }
        }
    }
}
