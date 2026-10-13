using System;
using System.Collections.Generic;

namespace AutoFix.DTOs.Settings
{
    public class ConnectedDeviceDto
    {
        public string DeviceName { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public DateTime LastSeen { get; set; } = DateTime.UtcNow;
    }

    public class WorkshopSettingsDto
    {
        public bool ShowVat { get; set; } = false;
        public bool PrintNotesOnInvoice { get; set; } = false;
        public string WorkshopName { get; set; } = "AP AUTO SERVICE CENTER";
        public string WorkshopPhone { get; set; } = "";
        public string WorkshopAddress { get; set; } = "";

        // Part 3 & 4: Security PIN & Network Access
        public bool RequirePin { get; set; } = false;
        public string PinHash { get; set; } = "";
        public int PinRememberDays { get; set; } = 30;
        public bool AllowNetworkAccess { get; set; } = false;
        public List<ConnectedDeviceDto> ConnectedDevices { get; set; } = new();
    }
}
