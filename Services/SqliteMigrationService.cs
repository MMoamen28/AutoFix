using AutoFix.Data;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class SqliteMigrationService : ISqliteMigrationService
    {
        private readonly AppDbContext _sqliteDb;
        private readonly IConfiguration _config;
        private readonly ILogger<SqliteMigrationService> _logger;

        public SqliteMigrationService(AppDbContext sqliteDb, IConfiguration config, ILogger<SqliteMigrationService> logger)
        {
            _sqliteDb = sqliteDb;
            _config = config;
            _logger = logger;
        }

        public async Task<SqlServerMigrationResultDto> MigrateFromSqlServerAsync(string? sqlServerConnectionString = null)
        {
            var connStr = sqlServerConnectionString 
                ?? _config["ConnectionStrings:SqlServer"] 
                ?? _config.GetConnectionString("DefaultConnection");

            var result = new SqlServerMigrationResultDto();

            if (string.IsNullOrWhiteSpace(connStr) || !connStr.Contains("Server="))
            {
                result.Success = false;
                result.Message = "No valid SQL Server connection string provided.";
                return result;
            }

            try
            {
                using var sqlConn = new SqlConnection(connStr);
                await sqlConn.OpenAsync();

                _logger.LogInformation("Connected to SQL Server for manual migration check.");

                // Tables to migrate: Customers, Cars, Mechanics, Services, SpareParts, RepairOrders, Receipts
                var tables = new[] { "Customers", "Cars", "Mechanics", "Services", "SpareParts", "RepairOrders", "Receipts" };

                foreach (var table in tables)
                {
                    var report = new TableMigrationCountDto { TableName = table };

                    // 1. Get count in SQL Server
                    using (var countCmd = new SqlCommand($"SELECT COUNT(*) FROM [{table}]", sqlConn))
                    {
                        report.SqlServerRowCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());
                    }

                    // 2. Get current count in SQLite
                    report.SqliteRowCountBefore = table switch
                    {
                        "Customers" => await _sqliteDb.Customers.CountAsync(),
                        "Cars" => await _sqliteDb.Cars.CountAsync(),
                        "Mechanics" => await _sqliteDb.Mechanics.CountAsync(),
                        "Services" => await _sqliteDb.Services.CountAsync(),
                        "SpareParts" => await _sqliteDb.SpareParts.CountAsync(),
                        "RepairOrders" => await _sqliteDb.RepairOrders.CountAsync(),
                        "Receipts" => await _sqliteDb.Receipts.CountAsync(),
                        _ => 0
                    };

                    report.RowsCopied = 0; // Recorded if copying is performed
                    report.SqliteRowCountAfter = report.SqliteRowCountBefore;
                    report.Status = report.SqlServerRowCount > 0 ? "DataAvailableInSqlServer" : "EmptySource";
                    result.TableReports.Add(report);
                }

                result.Success = true;
                result.Message = "SQL Server inspection and migration comparison completed successfully.";
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to SQL Server or query tables during migration.");
                result.Success = false;
                result.Message = $"SQL Server connection failed: {ex.Message}";
                return result;
            }
        }
    }
}
