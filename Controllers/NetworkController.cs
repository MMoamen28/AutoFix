using AutoFix.DTOs.Network;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NetworkController : ControllerBase
    {
        private readonly ISettingsService _settingsService;

        public NetworkController(ISettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        [HttpGet("info")]
        public async Task<ActionResult<NetworkInfoDto>> GetInfo()
        {
            var settings = await _settingsService.GetSettingsAsync();
            var candidates = new List<NetworkAdapterCandidateDto>();

            try
            {
                var interfaces = NetworkInterface.GetAllNetworkInterfaces();
                foreach (var ni in interfaces)
                {
                    if (ni.OperationalStatus != OperationalStatus.Up)
                    {
                        continue;
                    }

                    if (IsExcluded(ni))
                    {
                        continue;
                    }

                    var ipProps = ni.GetIPProperties();
                    var gateway = ipProps.GatewayAddresses
                        .Select(g => g.Address)
                        .FirstOrDefault(a => a.AddressFamily == AddressFamily.InterNetwork && !a.Equals(IPAddress.Any) && !a.ToString().StartsWith("0."));

                    foreach (var u in ipProps.UnicastAddresses)
                    {
                        if (u.Address.AddressFamily == AddressFamily.InterNetwork && IsPrivateIPv4(u.Address))
                        {
                            candidates.Add(new NetworkAdapterCandidateDto
                            {
                                AdapterName = ni.Name,
                                Description = ni.Description,
                                IpAddress = u.Address.ToString(),
                                HasDefaultGateway = gateway != null,
                                Gateway = gateway?.ToString()
                            });
                        }
                    }
                }
            }
            catch
            {
            }

            string? chosenAddress = null;
            var isFixed = false;

            if (!string.IsNullOrWhiteSpace(settings.FixedIpAddress))
            {
                var trimmed = settings.FixedIpAddress.Trim();
                if (IPAddress.TryParse(trimmed, out var parsedIp) && IsPrivateIPv4(parsedIp))
                {
                    chosenAddress = trimmed;
                    isFixed = true;
                }
            }

            if (chosenAddress == null && candidates.Count > 0)
            {
                var withGateway = candidates.Where(c => c.HasDefaultGateway).ToList();
                if (withGateway.Count > 0)
                {
                    var wifiCandidate = withGateway.FirstOrDefault(c =>
                        c.AdapterName.IndexOf("wi-fi", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        c.AdapterName.IndexOf("wireless", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        c.Description.IndexOf("wireless", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        c.Description.IndexOf("802.11", StringComparison.OrdinalIgnoreCase) >= 0);

                    chosenAddress = (wifiCandidate ?? withGateway[0]).IpAddress;
                }
                else
                {
                    chosenAddress = candidates[0].IpAddress;
                }
            }

            var addressChanged = false;
            string? previousAddress = null;

            if (!isFixed && !string.IsNullOrEmpty(chosenAddress))
            {
                if (!string.IsNullOrEmpty(settings.LastDetectedIpAddress) && settings.LastDetectedIpAddress != chosenAddress)
                {
                    addressChanged = true;
                    previousAddress = settings.LastDetectedIpAddress;
                }

                if (settings.LastDetectedIpAddress != chosenAddress)
                {
                    settings.LastDetectedIpAddress = chosenAddress;
                    await _settingsService.UpdateSettingsAsync(settings);
                }
            }

            const int port = 5000;
            var url = chosenAddress != null ? $"http://{chosenAddress}:{port}" : null;

            return Ok(new NetworkInfoDto
            {
                ChosenAddress = chosenAddress,
                Port = port,
                Url = url,
                Candidates = candidates,
                IsFixedAddress = isFixed,
                FixedAddress = settings.FixedIpAddress,
                AddressChanged = addressChanged,
                PreviousAddress = previousAddress
            });
        }

        private static bool IsExcluded(NetworkInterface ni)
        {
            if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback)
            {
                return true;
            }

            var text = (ni.Name + " " + ni.Description).ToLowerInvariant();
            var keywords = new[]
            {
                "loopback",
                "docker",
                "wsl",
                "hyper-v",
                "vethernet",
                "vpn",
                "bluetooth",
                "virtual",
                "vmware",
                "host-only",
                "tap",
                "tun"
            };

            foreach (var kw in keywords)
            {
                if (text.Contains(kw))
                {
                    return true;
                }
            }

            return false;
        }

        private static bool IsPrivateIPv4(IPAddress ip)
        {
            if (ip.AddressFamily != AddressFamily.InterNetwork || IPAddress.IsLoopback(ip))
            {
                return false;
            }

            var bytes = ip.GetAddressBytes();
            if (bytes[0] == 169 && bytes[1] == 254)
            {
                return false;
            }

            if (bytes[0] == 10)
            {
                return true;
            }

            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
            {
                return true;
            }

            if (bytes[0] == 192 && bytes[1] == 168)
            {
                return true;
            }

            return false;
        }
    }
}
