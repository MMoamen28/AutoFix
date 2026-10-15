using AutoFix.Data;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class BackupService : IBackupService
    {
        private readonly IDataFolderService _dataFolder;
        private readonly ILogger<BackupService> _logger;
        private readonly AppDbContext _db;
        private static readonly SemaphoreSlim _lock = new(1, 1);
        private static DateTime? _lastBackupTime;

        public BackupService(IDataFolderService dataFolder, ILogger<BackupService> logger, AppDbContext db)
        {
            _dataFolder = dataFolder;
            _logger = logger;
            _db = db;
        }

        public DateTime? GetLastBackupTime() => _lastBackupTime;

        public async Task<bool> VerifyDatabaseIntegrityAsync(string? specificDbPath = null)
        {
            var dbPath = specificDbPath ?? _dataFolder.DatabasePath;
            if (!File.Exists(dbPath)) return false;

            try
            {
                var connStr = $"Data Source={dbPath};";
                using var conn = new SqliteConnection(connStr);
                await conn.OpenAsync();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "PRAGMA integrity_check;";
                var result = (await cmd.ExecuteScalarAsync())?.ToString();

                var ok = string.Equals(result, "ok", StringComparison.OrdinalIgnoreCase);
                if (!ok)
                {
                    _logger.LogCritical("Database integrity check FAILED for {DbPath}. Result: {Result}", dbPath, result);
                }
                return ok;
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "Exception running integrity check for {DbPath}", dbPath);
                return false;
            }
        }

        public async Task<BackupInfoDto> CreateBackupAsync(string reason)
        {
            await _lock.WaitAsync();
            try
            {
                if (!File.Exists(_dataFolder.DatabasePath))
                {
                    throw new FileNotFoundException("Cannot backup database: main database file does not exist yet.");
                }

                var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss_fff");
                var fileName = $"autofix_backup_{timestamp}.db";
                var backupPath = Path.Combine(_dataFolder.BackupsPath, fileName);

                _logger.LogInformation("Creating online SQLite backup: {BackupPath} (Reason: {Reason})", backupPath, reason);

                var sourceConnStr = $"Data Source={_dataFolder.DatabasePath};";
                var destConnStr = $"Data Source={backupPath};";

                using (var sourceConn = new SqliteConnection(sourceConnStr))
                using (var destConn = new SqliteConnection(destConnStr))
                {
                    await sourceConn.OpenAsync();
                    await destConn.OpenAsync();

                    // Online non-blocking backup API
                    sourceConn.BackupDatabase(destConn);
                }

                // Verify the newly created backup immediately
                var isVerified = await VerifyDatabaseIntegrityAsync(backupPath);
                if (!isVerified)
                {
                    _logger.LogCritical("CRITICAL: Backup file {BackupPath} failed integrity check! Retention cleanup aborted.", backupPath);
                    throw new InvalidOperationException($"Backup created at {backupPath} failed integrity check!");
                }

                _lastBackupTime = DateTime.UtcNow;

                // Log audit record
                _db.AuditLogs.Add(new AuditLog
                {
                    Action = "BackupCreated",
                    EntityName = "Database",
                    EntityId = fileName,
                    Details = $"Reason: {reason}, Verified: {isVerified}, Path: {backupPath}",
                    Timestamp = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();

                try
                {
                    var externalDir = @"D:\AutoFixBackups";
                    Directory.CreateDirectory(externalDir);
                    var externalCopyPath = Path.Combine(externalDir, fileName);
                    File.Copy(backupPath, externalCopyPath, true);
                    _logger.LogInformation("Mirrored backup to external directory: {ExternalPath}", externalCopyPath);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to mirror backup to D:\\AutoFixBackups");
                }

                await PruneOldBackupsAsync();

                var fi = new FileInfo(backupPath);
                return new BackupInfoDto
                {
                    FileName = fileName,
                    FullPath = backupPath,
                    SizeBytes = fi.Length,
                    CreatedAt = fi.CreationTimeUtc,
                    IsVerified = isVerified
                };
            }
            finally
            {
                _lock.Release();
            }
        }

        public Task<List<BackupInfoDto>> ListBackupsAsync()
        {
            var list = new List<BackupInfoDto>();
            if (!Directory.Exists(_dataFolder.BackupsPath)) return Task.FromResult(list);

            var files = Directory.GetFiles(_dataFolder.BackupsPath, "*.db")
                .Select(f => new FileInfo(f))
                .OrderByDescending(f => f.CreationTimeUtc)
                .ToList();

            foreach (var fi in files)
            {
                list.Add(new BackupInfoDto
                {
                    FileName = fi.Name,
                    FullPath = fi.FullName,
                    SizeBytes = fi.Length,
                    CreatedAt = fi.CreationTimeUtc,
                    IsVerified = true
                });
            }

            return Task.FromResult(list);
        }

        public async Task PruneOldBackupsAsync()
        {
            try
            {
                var files = Directory.GetFiles(_dataFolder.BackupsPath, "*.db")
                    .Select(f => new FileInfo(f))
                    .OrderByDescending(f => f.CreationTimeUtc)
                    .ToList();

                if (!files.Any()) return;

                var latest = files.First();
                var latestVerified = await VerifyDatabaseIntegrityAsync(latest.FullName);
                if (!latestVerified)
                {
                    _logger.LogWarning("Latest backup {FileName} failed verification. Aborting retention pruning to safeguard data.", latest.Name);
                    return;
                }

                var toKeep = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var f in files.Take(10))
                {
                    toKeep.Add(f.FullName);
                }

                var dailyGroups = files
                    .Where(f => f.CreationTimeUtc >= DateTime.UtcNow.AddDays(-30))
                    .GroupBy(f => f.CreationTimeUtc.Date);

                foreach (var group in dailyGroups)
                {
                    toKeep.Add(group.OrderByDescending(f => f.CreationTimeUtc).First().FullName);
                }

                FileInfo? newestWithData = null;
                foreach (var f in files)
                {
                    if (await CheckBackupHasDataAsync(f.FullName))
                    {
                        newestWithData = f;
                        break;
                    }
                }

                if (newestWithData != null)
                {
                    toKeep.Add(newestWithData.FullName);
                }

                foreach (var file in files)
                {
                    if (!toKeep.Contains(file.FullName))
                    {
                        try
                        {
                            file.Delete();
                            _logger.LogInformation("Pruned old backup per retention policy: {FileName}", file.Name);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Could not delete old backup: {FileName}", file.Name);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error while applying backup retention policy");
            }
        }

        private async Task<bool> CheckBackupHasDataAsync(string path)
        {
            try
            {
                using var conn = new SqliteConnection($"Data Source={path};Mode=ReadOnly;");
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT (SELECT COUNT(1) FROM Customers WHERE IsDeleted = 0) + (SELECT COUNT(1) FROM WorkOrders WHERE IsDeleted = 0) + (SELECT COUNT(1) FROM Invoices WHERE IsDeleted = 0);";
                var res = await cmd.ExecuteScalarAsync();
                if (res != null && Convert.ToInt64(res) > 0)
                {
                    return true;
                }
            }
            catch
            {
            }
            return false;
        }

        public async Task<DatabaseStatsDto> GetDatabaseStatsAsync(string? backupFileName = null)
        {
            var dbPath = string.IsNullOrWhiteSpace(backupFileName)
                ? _dataFolder.DatabasePath
                : Path.Combine(_dataFolder.BackupsPath, backupFileName);

            if (!File.Exists(dbPath))
            {
                return new DatabaseStatsDto();
            }

            var stats = new DatabaseStatsDto();
            try
            {
                using var conn = new SqliteConnection($"Data Source={dbPath};Mode=ReadOnly;");
                await conn.OpenAsync();

                using var cmdCust = conn.CreateCommand();
                cmdCust.CommandText = "SELECT COUNT(1) FROM Customers WHERE IsDeleted = 0;";
                stats.CustomersCount = Convert.ToInt32(await cmdCust.ExecuteScalarAsync() ?? 0);

                using var cmdWo = conn.CreateCommand();
                cmdWo.CommandText = "SELECT COUNT(1) FROM WorkOrders WHERE IsDeleted = 0;";
                stats.WorkOrdersCount = Convert.ToInt32(await cmdWo.ExecuteScalarAsync() ?? 0);

                using var cmdInv = conn.CreateCommand();
                cmdInv.CommandText = "SELECT COUNT(1) FROM Invoices WHERE IsDeleted = 0;";
                stats.InvoicesCount = Convert.ToInt32(await cmdInv.ExecuteScalarAsync() ?? 0);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read database stats from {DbPath}", dbPath);
            }

            return stats;
        }

        public async Task<bool> RestoreBackupAsync(string backupFileName)
        {
            await _lock.WaitAsync();
            try
            {
                var targetBackupPath = Path.Combine(_dataFolder.BackupsPath, backupFileName);
                if (!File.Exists(targetBackupPath))
                {
                    throw new FileNotFoundException($"Backup file not found: {backupFileName}");
                }

                // Step 1: Verify the backup file BEFORE touching live database
                var targetVerified = await VerifyDatabaseIntegrityAsync(targetBackupPath);
                if (!targetVerified)
                {
                    throw new InvalidOperationException("Target backup file failed integrity check. Restore aborted.");
                }

                // Step 2: Create a safety backup of current live DB before restoring
                _logger.LogInformation("Creating pre-restore safety backup of live DB...");
                var safetyTimestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
                var safetyPath = Path.Combine(_dataFolder.BackupsPath, $"safety_pre_restore_{safetyTimestamp}.db");

                using (var liveConn = new SqliteConnection($"Data Source={_dataFolder.DatabasePath};"))
                using (var safetyConn = new SqliteConnection($"Data Source={safetyPath};"))
                {
                    await liveConn.OpenAsync();
                    await safetyConn.OpenAsync();
                    liveConn.BackupDatabase(safetyConn);
                }

                // Step 3: Online restore from backup into live database safely
                _logger.LogInformation("Restoring database from {BackupFileName}...", backupFileName);
                using (var backupSource = new SqliteConnection($"Data Source={targetBackupPath};"))
                using (var liveDest = new SqliteConnection($"Data Source={_dataFolder.DatabasePath};"))
                {
                    await backupSource.OpenAsync();
                    await liveDest.OpenAsync();
                    backupSource.BackupDatabase(liveDest);
                }

                // Step 4: Verify restored live database
                var liveVerified = await VerifyDatabaseIntegrityAsync(_dataFolder.DatabasePath);
                if (!liveVerified)
                {
                    _logger.LogCritical("CRITICAL: Restored database failed integrity check! Safety copy available at: {SafetyPath}", safetyPath);
                    return false;
                }

                _db.ChangeTracker.Clear();
                _db.AuditLogs.Add(new AuditLog
                {
                    Action = "DatabaseRestored",
                    EntityName = "Database",
                    EntityId = backupFileName,
                    Details = $"Restored from {backupFileName}. Pre-restore snapshot: {Path.GetFileName(safetyPath)}",
                    Timestamp = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();

                _logger.LogInformation("Database restored successfully from {BackupFileName}", backupFileName);
                return true;
            }
            finally
            {
                _lock.Release();
            }
        }

        public async Task<Dictionary<string, string>> ExportAllDataAsCsvAsync()
        {
            var result = new Dictionary<string, string>();

            // 1. Customers
            var customers = await _db.Customers.IgnoreQueryFilters().ToListAsync();
            var sb = new StringBuilder();
            sb.AppendLine("Id,FullName,Phone,ExtraPhone,Email,Address,IsDeleted,CreatedAt");
            foreach (var c in customers)
            {
                sb.AppendLine($"{c.Id},\"{Escape(c.FullName)}\",\"{c.Phone}\",\"{c.ExtraPhone}\",\"{c.Email}\",\"{Escape(c.Address)}\",{c.IsDeleted},{c.CreatedAt:o}");
            }
            result["customers.csv"] = sb.ToString();

            // 2. Cars
            var cars = await _db.Cars.IgnoreQueryFilters().ToListAsync();
            sb = new StringBuilder();
            sb.AppendLine("Id,CustomerId,Make,Model,Year,LicensePlate,VIN,Color,Engine,OdometerKm,IsDeleted");
            foreach (var car in cars)
            {
                sb.AppendLine($"{car.Id},{car.CustomerId},\"{Escape(car.Make)}\",\"{Escape(car.Model)}\",{car.Year},\"{car.LicensePlate}\",\"{car.VIN}\",\"{car.Color}\",\"{car.Engine}\",{car.CurrentOdometerKm},{car.IsDeleted}");
            }
            result["cars.csv"] = sb.ToString();

            // 3. Repair Orders
            var orders = await _db.RepairOrders.IgnoreQueryFilters().ToListAsync();
            sb = new StringBuilder();
            sb.AppendLine("Id,CustomerId,CarId,MechanicId,Status,TotalCost,CreatedAt,CompletedAt,IsDeleted");
            foreach (var o in orders)
            {
                sb.AppendLine($"{o.Id},{o.CustomerId},{o.CarId},{o.MechanicId},\"{o.Status}\",{o.TotalCost},{o.CreatedAt:o},{o.CompletedAt:o},{o.IsDeleted}");
            }
            result["repair_orders.csv"] = sb.ToString();

            // 4. Receipts
            var receipts = await _db.Receipts.IgnoreQueryFilters().ToListAsync();
            sb = new StringBuilder();
            sb.AppendLine("Id,RepairOrderId,CustomerId,CustomerName,CarInfo,MechanicName,TotalCost,Status,IsOwnerCopy,IssuedAt,IsDeleted");
            foreach (var r in receipts)
            {
                sb.AppendLine($"{r.Id},{r.RepairOrderId},{r.CustomerId},\"{Escape(r.CustomerName)}\",\"{Escape(r.CarInfo)}\",\"{Escape(r.MechanicName)}\",{r.TotalCost},\"{r.Status}\",{r.IsOwnerCopy},{r.IssuedAt:o},{r.IsDeleted}");
            }
            result["receipts.csv"] = sb.ToString();

            // 5. Spare Parts
            var parts = await _db.SpareParts.IgnoreQueryFilters().ToListAsync();
            sb = new StringBuilder();
            sb.AppendLine("Id,PartNumber,Name,NameArabic,Brand,PurchasePrice,UnitPrice,StockQuantity,MinStock,ShelfLocation,IsDeleted");
            foreach (var p in parts)
            {
                sb.AppendLine($"{p.Id},\"{p.PartNumber}\",\"{Escape(p.Name)}\",\"{Escape(p.NameArabic)}\",\"{p.Brand}\",{p.PurchasePrice},{p.UnitPrice},{p.StockQuantity},{p.MinimumStockLevel},\"{p.ShelfLocation}\",{p.IsDeleted}");
            }
            result["spare_parts.csv"] = sb.ToString();

            return result;
        }

        private static string Escape(string? str) => (str ?? string.Empty).Replace("\"", "\"\"");
    }
}
