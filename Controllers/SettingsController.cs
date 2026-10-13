using AutoFix.Data;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly IDataFolderService _dataFolder;
        private readonly AppDbContext _db;
        private readonly ISettingsService _settingsService;

        public SettingsController(IDataFolderService dataFolder, AppDbContext db, ISettingsService settingsService)
        {
            _dataFolder = dataFolder;
            _db = db;
            _settingsService = settingsService;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await _settingsService.GetSettingsAsync();
            return Ok(settings);
        }

        [HttpPut]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> UpdateSettings([FromBody] AutoFix.DTOs.Settings.WorkshopSettingsDto dto)
        {
            var updated = await _settingsService.UpdateSettingsAsync(dto);
            return Ok(updated);
        }

        [HttpGet("logo")]
        [AllowAnonymous]
        public IActionResult GetLogo()
        {
            var customPath = Path.Combine(_dataFolder.RootPath, "Files", "Settings", "logo.png");
            if (System.IO.File.Exists(customPath))
            {
                return PhysicalFile(customPath, "image/png");
            }
            var defaultPath = @"D:\AutoFix\Assets\InvoiceTemplate\logo.png";
            if (System.IO.File.Exists(defaultPath))
            {
                return PhysicalFile(defaultPath, "image/png");
            }
            return NotFound();
        }

        [HttpGet("watermark")]
        [AllowAnonymous]
        public IActionResult GetWatermark()
        {
            var customPath = Path.Combine(_dataFolder.RootPath, "Files", "Settings", "watermark.png");
            if (System.IO.File.Exists(customPath))
            {
                return PhysicalFile(customPath, "image/png");
            }
            var defaultPath = @"D:\AutoFix\Assets\InvoiceTemplate\watermark.png";
            if (System.IO.File.Exists(defaultPath))
            {
                return PhysicalFile(defaultPath, "image/png");
            }
            return NotFound();
        }

        [HttpPost("logo")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> UploadLogo(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "No file uploaded." });
            var settingsFolder = Path.Combine(_dataFolder.RootPath, "Files", "Settings");
            Directory.CreateDirectory(settingsFolder);
            var savePath = Path.Combine(settingsFolder, "logo.png");
            using (var stream = new FileStream(savePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            return Ok(new { message = "Logo updated successfully.", url = "/api/settings/logo" });
        }

        [HttpPost("watermark")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> UploadWatermark(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "No file uploaded." });
            var settingsFolder = Path.Combine(_dataFolder.RootPath, "Files", "Settings");
            Directory.CreateDirectory(settingsFolder);
            var savePath = Path.Combine(settingsFolder, "watermark.png");
            using (var stream = new FileStream(savePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            return Ok(new { message = "Watermark updated successfully.", url = "/api/settings/watermark" });
        }
    }
}
