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

        public const string DefaultWhatsAppTemplate =
@"السلام عليكم {customerName} 🌟

شكرًا لاختياركم *{workshopName}*

📄 *فاتورة رقم:* {invoiceNumber}
📅 *التاريخ:* {invoiceDate}
🚗 *السيارة:* {carMake} {carModel} - {plate}

💰 *الإجمالي:* {total} ج.م
✅ *المدفوع:* {paid} ج.م
{remainingLine}

{notesLine}
📞 للاستفسار: {workshopPhone}

نتمنى لكم رحلة آمنة 🌹";

        public async Task<WorkshopSettingsDto> GetSettingsAsync()
        {
            if (!File.Exists(_settingsFilePath))
            {
                var s = new WorkshopSettingsDto();
                s.WhatsAppMessageTemplate = DefaultWhatsAppTemplate;
                return s;
            }

            try
            {
                var json = await File.ReadAllTextAsync(_settingsFilePath, System.Text.Encoding.UTF8);
                var settings = JsonSerializer.Deserialize<WorkshopSettingsDto>(json, _jsonOptions);
                if (settings == null)
                {
                    settings = new WorkshopSettingsDto();
                }
                if (string.IsNullOrWhiteSpace(settings.WorkshopPhone))
                {
                    settings.WorkshopPhone = "01277252262";
                }
                if (string.IsNullOrWhiteSpace(settings.WhatsAppMessageTemplate))
                {
                    settings.WhatsAppMessageTemplate = DefaultWhatsAppTemplate;
                }
                return settings;
            }
            catch
            {
                var s = new WorkshopSettingsDto();
                s.WhatsAppMessageTemplate = DefaultWhatsAppTemplate;
                return s;
            }
        }

        public async Task<WorkshopSettingsDto> UpdateSettingsAsync(WorkshopSettingsDto dto)
        {
            var dir = Path.GetDirectoryName(_settingsFilePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            if (string.IsNullOrWhiteSpace(dto.WorkshopPhone))
            {
                dto.WorkshopPhone = "01277252262";
            }
            if (string.IsNullOrWhiteSpace(dto.WorkshopName))
            {
                dto.WorkshopName = "AP AUTO SERVICE CENTER";
            }
            if (string.IsNullOrWhiteSpace(dto.WhatsAppMessageTemplate))
            {
                dto.WhatsAppMessageTemplate = DefaultWhatsAppTemplate;
            }

            var json = JsonSerializer.Serialize(dto, _jsonOptions);
            await File.WriteAllTextAsync(_settingsFilePath, json, System.Text.Encoding.UTF8);
            return dto;
        }
    }
}
