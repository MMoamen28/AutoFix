using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using AutoFix.Services;

namespace AutoFix.Helpers
{
    public class WhatsAppTemplateData
    {
        public string? CustomerName { get; set; }
        public string? WorkshopName { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? InvoiceDate { get; set; }
        public string? CarMake { get; set; }
        public string? CarModel { get; set; }
        public string? Plate { get; set; }
        public decimal Total { get; set; }
        public decimal Paid { get; set; }
        public decimal Remaining { get; set; }
        public string? Notes { get; set; }
        public string? WorkshopPhone { get; set; }
    }

    public static class WhatsAppTemplateHelper
    {
        public static string BuildMessage(string? template, WhatsAppTemplateData data)
        {
            if (string.IsNullOrWhiteSpace(template))
            {
                template = SettingsService.DefaultWhatsAppTemplate;
            }

            var customerName = data.CustomerName?.Trim() ?? string.Empty;
            var workshopName = !string.IsNullOrWhiteSpace(data.WorkshopName) ? data.WorkshopName.Trim() : "AP AUTO SERVICE CENTER";
            var invoiceNumber = data.InvoiceNumber?.Trim() ?? string.Empty;
            var invoiceDate = data.InvoiceDate?.Trim() ?? string.Empty;
            var carMake = data.CarMake?.Trim() ?? string.Empty;
            var carModel = data.CarModel?.Trim() ?? string.Empty;
            var plate = data.Plate?.Trim() ?? string.Empty;
            var totalStr = data.Total.ToString("0.00");
            var paidStr = data.Paid.ToString("0.00");

            var remainingLine = data.Remaining > 0
                ? $"⏳ *المتبقي:* {data.Remaining.ToString("0.00")} ج.م"
                : "🎉 تم السداد بالكامل";

            var notesLine = !string.IsNullOrWhiteSpace(data.Notes)
                ? $"📝 *ملاحظات:* {data.Notes.Trim()}"
                : string.Empty;

            var workshopPhone = data.WorkshopPhone?.Trim() ?? string.Empty;

            var lines = template.Replace("\r\n", "\n").Split('\n');
            var resultLines = new List<string>();

            foreach (var rawLine in lines)
            {
                var line = rawLine;

                if (line.Contains("{notesLine}"))
                {
                    if (string.IsNullOrWhiteSpace(notesLine))
                    {
                        continue;
                    }
                    line = line.Replace("{notesLine}", notesLine);
                }

                if (line.Contains("{workshopPhone}"))
                {
                    if (string.IsNullOrWhiteSpace(workshopPhone))
                    {
                        continue;
                    }
                    line = line.Replace("{workshopPhone}", workshopPhone);
                }

                line = line.Replace("{customerName}", customerName);
                line = line.Replace("{workshopName}", workshopName);
                line = line.Replace("{invoiceNumber}", invoiceNumber);
                line = line.Replace("{invoiceDate}", invoiceDate);
                line = line.Replace("{carMake}", carMake);
                line = line.Replace("{carModel}", carModel);
                line = line.Replace("{plate}", plate);
                line = line.Replace("{total}", totalStr);
                line = line.Replace("{paid}", paidStr);
                line = line.Replace("{remainingLine}", remainingLine);

                if (Regex.IsMatch(line, @"\{[a-zA-Z0-9_]+\}"))
                {
                    continue;
                }

                if (line.Contains("undefined") || line.Contains("null"))
                {
                    continue;
                }

                resultLines.Add(line);
            }

            var trimmedLines = new List<string>();
            var prevEmpty = false;
            foreach (var l in resultLines)
            {
                var isBlank = string.IsNullOrWhiteSpace(l);
                if (isBlank)
                {
                    if (!prevEmpty && trimmedLines.Count > 0)
                    {
                        trimmedLines.Add(string.Empty);
                    }
                    prevEmpty = true;
                }
                else
                {
                    trimmedLines.Add(l.TrimEnd());
                    prevEmpty = false;
                }
            }

            while (trimmedLines.Count > 0 && string.IsNullOrWhiteSpace(trimmedLines[^1]))
            {
                trimmedLines.RemoveAt(trimmedLines.Count - 1);
            }

            return string.Join("\n", trimmedLines);
        }
    }
}
