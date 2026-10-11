using AutoFix.Data;
using AutoFix.Services;
using AutoFix.Services.Interfaces;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;

namespace AutoFix.Tests
{
    public static class TestHelper
    {
        public static readonly string TestDataRoot = @"C:\AutoFixTestData";

        public static (AppDbContext Db, IDataFolderService DataFolder, SqliteConnection Connection) CreateTestContext()
        {
            // Ensure test directory is clean and isolated
            Directory.CreateDirectory(TestDataRoot);
            var testDbId = Guid.NewGuid().ToString("N");
            var testDbFolder = Path.Combine(TestDataRoot, testDbId);
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

            // Create dedicated persistent SQLite test connection
            var connection = new SqliteConnection(dataFolder.GetConnectionString());
            connection.Open();

            // Enable WAL mode & foreign keys
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;";
                cmd.ExecuteNonQuery();
            }

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(connection)
                .Options;

            var db = new AppDbContext(options);
            db.Database.EnsureCreated(); // Ensure fresh test schema
            DbInitializer.Initialize(db);

            return (db, dataFolder, connection);
        }
    }
}
