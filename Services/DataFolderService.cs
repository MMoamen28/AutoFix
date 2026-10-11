using AutoFix.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Security.Cryptography;

namespace AutoFix.Services
{
    public class DataFolderService : IDataFolderService
    {
        private readonly ILogger<DataFolderService> _logger;
        public string RootPath { get; private set; }
        public string DatabasePath { get; private set; }
        public string BackupsPath { get; private set; }
        public string FilesPath { get; private set; }
        public string LogsPath { get; private set; }
        public string JwtKeyPath { get; private set; }
        public bool IsFallback { get; private set; }

        public DataFolderService(IConfiguration config, ILogger<DataFolderService> logger)
        {
            _logger = logger;
            
            var configuredPath = config["DataDirectory"] ?? @"C:\AutoFixData";
            var resolvedPath = configuredPath;
            bool isFallback = false;

            try
            {
                EnsureDirectoryWritable(configuredPath);
                resolvedPath = configuredPath;
            }
            catch (Exception ex)
            {
                var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var fallbackPath = Path.Combine(localAppData, "AutoFixData");
                _logger.LogWarning(ex, "Failed to use configured data directory '{ConfiguredPath}'. Falling back to '{FallbackPath}'.", configuredPath, fallbackPath);
                EnsureDirectoryWritable(fallbackPath);
                resolvedPath = fallbackPath;
                isFallback = true;
            }

            RootPath = resolvedPath;
            IsFallback = isFallback;
            DatabasePath = Path.Combine(RootPath, "autofix.db");
            BackupsPath = Path.Combine(RootPath, "Backups");
            FilesPath = Path.Combine(RootPath, "Files");
            LogsPath = Path.Combine(RootPath, "Logs");
            JwtKeyPath = Path.Combine(RootPath, "jwt.key");

            Directory.CreateDirectory(BackupsPath);
            Directory.CreateDirectory(FilesPath);
            Directory.CreateDirectory(LogsPath);

            _logger.LogInformation("AutoFix Data Directory initialized at: {RootPath} (Fallback: {IsFallback})", RootPath, IsFallback);
        }

        private static void EnsureDirectoryWritable(string path)
        {
            Directory.CreateDirectory(path);
            var testFile = Path.Combine(path, $".test_write_{Guid.NewGuid():N}.tmp");
            File.WriteAllText(testFile, "test");
            File.Delete(testFile);
        }

        public byte[] GetOrCreateJwtSigningKey()
        {
            if (File.Exists(JwtKeyPath))
            {
                var existingKey = File.ReadAllBytes(JwtKeyPath);
                if (existingKey.Length >= 32)
                {
                    return existingKey;
                }
            }

            // Generate cryptographically secure 64-byte random key
            var newKey = new byte[64];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(newKey);
            }

            File.WriteAllBytes(JwtKeyPath, newKey);
            _logger.LogInformation("Generated new secure random JWT key in: {JwtKeyPath}", JwtKeyPath);
            return newKey;
        }

        public string GetConnectionString()
        {
            // Do NOT use Cache=Shared. Use WAL mode + Busy Timeout (via PRAGMA & Default Timeout) + scoped DbContext only.
            return $"Data Source={DatabasePath};Default Timeout=5;";
        }
    }
}
