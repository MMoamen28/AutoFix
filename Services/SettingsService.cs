using AutoFix.DTOs.Settings;
using AutoFix.Services.Interfaces;
using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class SettingsService : ISettingsService
    {
        private readonly IDataFolderService _dataFolder;
        private readonly string _settingsFilePath;
        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
        };

        public SettingsService(IDataFolderService dataFolder)
        {
            _dataFolder = dataFolder;
            _settingsFilePath = Path.Combine(_dataFolder.RootPath, "Files", "Settings", "workshop_settings.json");
        }

        public async Task<WorkshopSettingsDto> GetSettingsAsync()
        {
            if (!File.Exists(_settingsFilePath))
            {
                return new WorkshopSettingsDto();
            }

            try
            {
                var json = await File.ReadAllTextAsync(_settingsFilePath, System.Text.Encoding.UTF8);
                var settings = JsonSerializer.Deserialize<WorkshopSettingsDto>(json, _jsonOptions);
                return settings ?? new WorkshopSettingsDto();
            }
            catch
            {
                return new WorkshopSettingsDto();
            }
        }

        public async Task<WorkshopSettingsDto> UpdateSettingsAsync(WorkshopSettingsDto dto)
        {
            var dir = Path.GetDirectoryName(_settingsFilePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(dto, _jsonOptions);
            await File.WriteAllTextAsync(_settingsFilePath, json, System.Text.Encoding.UTF8);
            return dto;
        }
    }
}
