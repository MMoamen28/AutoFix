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

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (int Attempts, DateTime? LockoutUntil)> _pinAttempts = new();

        [HttpGet("network")]
        public async Task<IActionResult> GetNetworkSettings()
        {
            var settings = await _settingsService.GetSettingsAsync();
            var ips = new System.Collections.Generic.List<string>();

            try
            {
                foreach (var netInterface in System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (netInterface.OperationalStatus != System.Net.NetworkInformation.OperationalStatus.Up) continue;
                    var ipProps = netInterface.GetIPProperties();
                    foreach (var addr in ipProps.UnicastAddresses)
                    {
                        if (addr.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork && !System.Net.IPAddress.IsLoopback(addr.Address))
                        {
                            ips.Add(addr.Address.ToString());
                        }
                    }
                }
            }
            catch {}

            if (ips.Count == 0) ips.Add("127.0.0.1");

            var urls = ips.Select(ip => $"http://{ip}:5000").ToList();

            return Ok(new
            {
                allowNetworkAccess = settings.AllowNetworkAccess,
                requirePin = settings.RequirePin,
                hasPinSet = !string.IsNullOrEmpty(settings.PinHash),
                pinRememberDays = settings.PinRememberDays,
                ipAddresses = ips,
                port = 5000,
                urls = urls,
                connectedDevices = settings.ConnectedDevices ?? new()
            });
        }

        public class VerifyPinDto
        {
            public string Pin { get; set; } = string.Empty;
            public string DeviceName { get; set; } = string.Empty;
        }

        [HttpPost("verify-pin")]
        public async Task<IActionResult> VerifyPin([FromBody] VerifyPinDto dto)
        {
            var settings = await _settingsService.GetSettingsAsync();
            if (!settings.RequirePin && string.IsNullOrEmpty(settings.PinHash))
            {
                return Ok(new { success = true, message = "No PIN required" });
            }

            var key = Request.Headers["X-Device-Name"].FirstOrDefault() ?? dto.DeviceName ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            if (_pinAttempts.TryGetValue(key, out var state))
            {
                if (state.LockoutUntil.HasValue && state.LockoutUntil > DateTime.UtcNow)
                {
                    var remMinutes = Math.Ceiling((state.LockoutUntil.Value - DateTime.UtcNow).TotalMinutes);
                    return StatusCode(429, new { message = $"تم قفل إدخال الرقم السري مؤقتاً بسبب 5 محاولات خاطئة. يرجى المحاولة بعد {remMinutes} دقيقة." });
                }
            }

            var enteredHash = ComputeSha256(dto.Pin ?? "");
            if (enteredHash == settings.PinHash)
            {
                _pinAttempts.TryRemove(key, out _);
                return Ok(new { success = true });
            }

            // Record failed attempt
            var attempts = (state.Attempts) + 1;
            DateTime? lockout = null;
            if (attempts >= 5)
            {
                lockout = DateTime.UtcNow.AddMinutes(15);
            }
            _pinAttempts[key] = (attempts, lockout);

            if (lockout.HasValue)
            {
                return StatusCode(429, new { message = "تم قفل إدخال الرقم السري لمدة 15 دقيقة بعد 5 محاولات خاطئة." });
            }

            return BadRequest(new { message = $"الرقم السري غير صحيح. المحاولات المتبقية: {5 - attempts}" });
        }

        public class SetPinDto
        {
            public string? CurrentPin { get; set; }
            public string NewPin { get; set; } = string.Empty;
            public bool RequirePin { get; set; }
            public int RememberDays { get; set; } = 30;
        }

        [HttpPost("set-pin")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> SetPin([FromBody] SetPinDto dto)
        {
            var settings = await _settingsService.GetSettingsAsync();

            // If PIN already set, verify current PIN first
            if (!string.IsNullOrEmpty(settings.PinHash) && settings.RequirePin)
            {
                if (string.IsNullOrEmpty(dto.CurrentPin) || ComputeSha256(dto.CurrentPin) != settings.PinHash)
                {
                    return BadRequest(new { message = "الرقم السري الحالي غير صحيح." });
                }
            }

            if (dto.RequirePin)
            {
                if (string.IsNullOrWhiteSpace(dto.NewPin) || dto.NewPin.Length < 4 || dto.NewPin.Length > 8)
                {
                    return BadRequest(new { message = "الرقم السري يجب أن يكون بين 4 إلى 8 أرقام." });
                }
                settings.PinHash = ComputeSha256(dto.NewPin.Trim());
            }

            settings.RequirePin = dto.RequirePin;
            settings.PinRememberDays = dto.RememberDays > 0 ? dto.RememberDays : 30;
            await _settingsService.UpdateSettingsAsync(settings);

            return Ok(new { success = true, message = "تم تحديث إعدادات الرقم السري بنجاح" });
        }

        public class RegisterDeviceDto
        {
            public string DeviceName { get; set; } = string.Empty;
        }

        [HttpPost("register-device")]
        public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.DeviceName)) return BadRequest(new { message = "Device name required" });

            var settings = await _settingsService.GetSettingsAsync();
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

            settings.ConnectedDevices ??= new();
            var existing = settings.ConnectedDevices.FirstOrDefault(d => d.DeviceName == dto.DeviceName.Trim());
            if (existing != null)
            {
                existing.IpAddress = ip;
                existing.LastSeen = DateTime.UtcNow;
            }
            else
            {
                settings.ConnectedDevices.Add(new DTOs.Settings.ConnectedDeviceDto
                {
                    DeviceName = dto.DeviceName.Trim(),
                    IpAddress = ip,
                    LastSeen = DateTime.UtcNow
                });
            }

            // Keep only latest 20 devices seen in last 30 days
            settings.ConnectedDevices = settings.ConnectedDevices
                .OrderByDescending(d => d.LastSeen)
                .Take(20)
                .ToList();

            await _settingsService.UpdateSettingsAsync(settings);
            return Ok(new { success = true });
        }

        private static string ComputeSha256(string raw)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            var bytes = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(raw));
            return System.Convert.ToHexString(bytes);
        }
    }
}
