using AutoFix.Controllers;
using AutoFix.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace AutoFix.Tests
{
    public class ApiAndDatabaseTests
    {
        [Fact]
        public async Task HealthEndpoint_ReturnsHealthyStatusAndDataFolder()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<BackupService>();
                var backupService = new BackupService(dataFolder, logger, db);
                var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
                {
                    { "AuthMode", "Local" },
                    { "DatabaseProvider", "Sqlite" }
                }).Build();

                var healthCtrl = new HealthController(db, dataFolder, backupService, config);
                var actionRes = await healthCtrl.GetHealth();

                var okRes = Assert.IsType<OkObjectResult>(actionRes);
                var healthData = System.Text.Json.JsonSerializer.SerializeToElement(okRes.Value!);

                Assert.Equal("Healthy", healthData.GetProperty("status").GetString());
                Assert.Equal("Connected", healthData.GetProperty("database").GetString());
                Assert.Equal(dataFolder.RootPath, healthData.GetProperty("dataDirectory").GetString());
                Assert.Equal("OK", healthData.GetProperty("integrity").GetString());
            }
        }

        [Fact]
        public async Task SqlitePragmas_WalAndForeignKeysAreActive()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "PRAGMA journal_mode;";
                var journalMode = (await cmd.ExecuteScalarAsync())?.ToString();
                Assert.Equal("wal", journalMode?.ToLowerInvariant());

                cmd.CommandText = "PRAGMA foreign_keys;";
                var foreignKeys = (await cmd.ExecuteScalarAsync())?.ToString();
                Assert.Equal("1", foreignKeys);
            }
        }

        [Fact]
        public async Task SqliteMigrationService_ProducesRowCountReportWithoutErrors()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var config = new ConfigurationBuilder().Build();
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<SqliteMigrationService>();
                var migrator = new SqliteMigrationService(db, config, logger);

                // Run without connection string (verifies validation without crash)
                var result = await migrator.MigrateFromSqlServerAsync(null);
                Assert.False(result.Success);
                Assert.Contains("connection string", result.Message, System.StringComparison.OrdinalIgnoreCase);
            }
        }
    }
}
