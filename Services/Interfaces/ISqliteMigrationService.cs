using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public class TableMigrationCountDto
    {
        public string TableName { get; set; } = string.Empty;
        public int SqlServerRowCount { get; set; }
        public int SqliteRowCountBefore { get; set; }
        public int RowsCopied { get; set; }
        public int SqliteRowCountAfter { get; set; }
        public string Status { get; set; } = "Success";
    }

    public class SqlServerMigrationResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<TableMigrationCountDto> TableReports { get; set; } = new();
    }

    public interface ISqliteMigrationService
    {
        Task<SqlServerMigrationResultDto> MigrateFromSqlServerAsync(string? sqlServerConnectionString = null);
    }
}
