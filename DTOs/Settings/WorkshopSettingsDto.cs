namespace AutoFix.DTOs.Settings
{
    public class WorkshopSettingsDto
    {
        public bool ShowVat { get; set; } = false;
        public bool PrintNotesOnInvoice { get; set; } = false;
        public string WorkshopName { get; set; } = "AP AUTO SERVICE CENTER";
        public string WorkshopPhone { get; set; } = "";
        public string WorkshopAddress { get; set; } = "";
    }
}
