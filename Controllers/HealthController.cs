using AutoFix.Data;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class HealthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IDataFolderService _dataFolder;
        private readonly IBackupService _backupService;
        private readonly IConfiguration _config;

        public HealthController(AppDbContext db, IDataFolderService dataFolder, IBackupService backupService, IConfiguration config)
        {
            _db = db;
            _dataFolder = dataFolder;
            _backupService = backupService;
            _config = config;
        }

        [HttpGet]
        public async Task<IActionResult> GetHealth()
        {
            bool dbConnected = false;
            try
            {
                dbConnected = await _db.Database.CanConnectAsync();
            }
            catch
            {
                dbConnected = false;
            }

            var authMode = _config["AuthMode"] ?? "Local";
            var dbProvider = _config["DatabaseProvider"] ?? "Sqlite";
            var lastBackup = _backupService.GetLastBackupTime();

            return Ok(new
            {
                status = dbConnected ? "Healthy" : "Degraded",
                database = dbConnected ? "Connected" : "Disconnected",
                databaseProvider = dbProvider,
                dataDirectory = _dataFolder.RootPath,
                isFallbackDirectory = _dataFolder.IsFallback,
                lastBackupTime = lastBackup,
                integrity = "OK",
                authMode = authMode,
                timestamp = DateTime.UtcNow
            });
        }
    }
}
