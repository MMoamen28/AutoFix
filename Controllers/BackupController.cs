using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Owner")]
    public class BackupController : ControllerBase
    {
        private readonly IBackupService _backupService;
        private readonly ISqliteMigrationService _migrationService;
        private readonly IDataFolderService _dataFolder;
        private readonly AutoFix.Data.AppDbContext _db;

        public BackupController(IBackupService backupService, ISqliteMigrationService migrationService, IDataFolderService dataFolder, AutoFix.Data.AppDbContext db)
        {
            _backupService = backupService;
            _migrationService = migrationService;
            _dataFolder = dataFolder;
            _db = db;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            bool isOk = false;
            try
            {
                isOk = await _backupService.VerifyDatabaseIntegrityAsync();
            }
            catch
            {
                isOk = false;
            }

            var backups = await _backupService.ListBackupsAsync();
            var lastBackup = _backupService.GetLastBackupTime();

            long dbSize = 0;
            try
            {
                if (System.IO.File.Exists(_dataFolder.DatabasePath))
                {
                    dbSize = new FileInfo(_dataFolder.DatabasePath).Length;
                }
            }
            catch { }

            long freeSpace = 0;
            try
            {
                var root = Path.GetPathRoot(_dataFolder.RootPath);
                if (!string.IsNullOrEmpty(root))
                {
                    var drive = new DriveInfo(root);
                    freeSpace = drive.AvailableFreeSpace;
                }
            }
            catch { }

            var auditList = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
                System.Linq.Queryable.Take(
                    System.Linq.Queryable.OrderByDescending(
                        System.Linq.Queryable.Where(_db.AuditLogs, a => a.Action.Contains("Backup") || a.Action.Contains("Restore")),
                        a => a.Timestamp
                    ),
                    10
                )
            );

            return Ok(new
            {
                isDatabaseHealthy = isOk,
                lastBackupTime = lastBackup,
                backupCount = backups.Count,
                dataSizeBytes = dbSize,
                dataFolderPath = _dataFolder.RootPath,
                isFallback = _dataFolder.IsFallback,
                freeDiskSpaceBytes = freeSpace,
                auditLogs = auditList.Select(a => new
                {
                    a.Id,
                    a.Action,
                    a.UserName,
                    a.Details,
                    a.Timestamp
                })
            });
        }

        [HttpPost("create")]
        [HttpPost("manual")]
        public async Task<IActionResult> CreateBackup([FromQuery] string? reason)
        {
            var backup = await _backupService.CreateBackupAsync(reason ?? "ManualAdminTrigger");
            return Ok(backup);
        }

        [HttpGet("integrity-check")]
        public async Task<IActionResult> IntegrityCheck()
        {
            var isOk = await _backupService.VerifyDatabaseIntegrityAsync();
            return Ok(new { integrityResult = isOk ? "ok" : "corrupted", isOk });
        }

        [HttpGet("list")]
        public async Task<IActionResult> ListBackups()
        {
            var list = await _backupService.ListBackupsAsync();
            return Ok(list);
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetDatabaseStats([FromQuery] string? fileName = null)
        {
            var stats = await _backupService.GetDatabaseStatsAsync(fileName);
            return Ok(stats);
        }

        public class RestoreRequest
        {
            public string FileName { get; set; } = string.Empty;
            public string ConfirmationText { get; set; } = string.Empty;
            public bool ConfirmFewerRecords { get; set; } = false;
        }

        [HttpPost("restore")]
        public async Task<IActionResult> RestoreBackup([FromBody] RestoreRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FileName))
            {
                return BadRequest(new { message = "Backup file name is required." });
            }

            if (!string.Equals(request.ConfirmationText?.Trim(), "RESTORE", StringComparison.Ordinal))
            {
                return BadRequest(new { message = "Type RESTORE to proceed." });
            }

            var liveStats = await _backupService.GetDatabaseStatsAsync(null);
            var backupStats = await _backupService.GetDatabaseStatsAsync(request.FileName);

            if (backupStats.TotalRecords < liveStats.TotalRecords && !request.ConfirmFewerRecords)
            {
                return BadRequest(new
                {
                    message = "Warning: Backup has fewer records than current live database.",
                    requiresSecondConfirmation = true,
                    liveStats,
                    backupStats
                });
            }

            var success = await _backupService.RestoreBackupAsync(request.FileName);
            if (!success)
            {
                return StatusCode(500, new { message = "Failed to restore backup safely." });
            }

            return Ok(new { message = $"Database successfully restored from {request.FileName}." });
        }

        [HttpGet("download/{fileName}")]
        public IActionResult DownloadBackup(string fileName)
        {
            var filePath = Path.Combine(_dataFolder.BackupsPath, fileName);
            if (!System.IO.File.Exists(filePath))
            {
                return NotFound(new { message = "Backup file not found." });
            }

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(fileBytes, "application/octet-stream", fileName);
        }

        [HttpGet("export-csv")]
        public async Task<IActionResult> ExportAllCsv([FromQuery] string? table = null)
        {
            var files = await _backupService.ExportAllDataAsCsvAsync();

            if (!string.IsNullOrWhiteSpace(table))
            {
                var matchingKey = System.Linq.Enumerable.FirstOrDefault(files.Keys, k =>
                    k.StartsWith(table, System.StringComparison.OrdinalIgnoreCase) ||
                    k.Replace(".csv", "").Equals(table, System.StringComparison.OrdinalIgnoreCase) ||
                    k.Replace("_", "").Replace(".csv", "").Equals(table.Replace("_", ""), System.StringComparison.OrdinalIgnoreCase));
                if (matchingKey != null)
                {
                    var bytes = Encoding.UTF8.GetBytes(files[matchingKey]);
                    return File(bytes, "text/csv", matchingKey);
                }
                return NotFound(new { message = $"Table '{table}' not found in CSV export." });
            }

            using var ms = new MemoryStream();
            using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, true))
            {
                foreach (var kvp in files)
                {
                    var entry = zip.CreateEntry(kvp.Key);
                    using var entryStream = entry.Open();
                    using var writer = new StreamWriter(entryStream, Encoding.UTF8);
                    await writer.WriteAsync(kvp.Value);
                }
            }

            ms.Position = 0;
            return File(ms.ToArray(), "application/zip", $"autofix_export_{System.DateTime.UtcNow:yyyyMMdd_HHmmss}.zip");
        }

        public class SqlServerMigrateRequest
        {
            public string? ConnectionString { get; set; }
        }

        [HttpPost("sqlserver-migration")]
        public async Task<IActionResult> MigrateFromSqlServer([FromBody] SqlServerMigrateRequest? request)
        {
            var result = await _migrationService.MigrateFromSqlServerAsync(request?.ConnectionString);
            return Ok(result);
        }
    }
}
