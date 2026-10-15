using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public class BackupInfoDto
    {
        public string FileName { get; set; } = string.Empty;
        public string FullPath { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsVerified { get; set; }
    }

    public class DatabaseStatsDto
    {
        public int CustomersCount { get; set; }
        public int WorkOrdersCount { get; set; }
        public int InvoicesCount { get; set; }
        public int TotalRecords => CustomersCount + WorkOrdersCount + InvoicesCount;
    }

    public interface IBackupService
    {
        Task<BackupInfoDto> CreateBackupAsync(string reason);
        Task<List<BackupInfoDto>> ListBackupsAsync();
        Task<bool> VerifyDatabaseIntegrityAsync(string? specificDbPath = null);
        Task<bool> RestoreBackupAsync(string backupFileName);
        DateTime? GetLastBackupTime();
        Task<Dictionary<string, string>> ExportAllDataAsCsvAsync();
        Task PruneOldBackupsAsync();
        Task<DatabaseStatsDto> GetDatabaseStatsAsync(string? backupFileName = null);
    }
}
