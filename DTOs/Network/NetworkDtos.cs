using System.Collections.Generic;

namespace AutoFix.DTOs.Network
{
    public class NetworkAdapterCandidateDto
    {
        public string AdapterName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public bool HasDefaultGateway { get; set; }
        public string? Gateway { get; set; }
    }

    public class NetworkInfoDto
    {
        public string? ChosenAddress { get; set; }
        public int Port { get; set; } = 5000;
        public string? Url { get; set; }
        public List<NetworkAdapterCandidateDto> Candidates { get; set; } = new();
        public bool IsFixedAddress { get; set; }
        public string? FixedAddress { get; set; }
        public bool AddressChanged { get; set; }
        public string? PreviousAddress { get; set; }
    }
}
