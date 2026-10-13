using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Linq;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;

namespace AutoFix.Authentication
{
    public class NoneAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public NoneAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var deviceName = Request.Headers["X-Device-Name"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(deviceName))
            {
                deviceName = "ورشة العمل الرئيسية";
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "admin-system"),
                new Claim(ClaimTypes.Name, deviceName),
                new Claim(ClaimTypes.Role, "Admin"),
                new Claim(ClaimTypes.Role, "Owner"),
                new Claim(ClaimTypes.Role, "Accountant"),
                new Claim(ClaimTypes.Role, "Receptionist"),
                new Claim(ClaimTypes.Role, "Reception"),
                new Claim(ClaimTypes.Role, "Mechanic"),
                new Claim(ClaimTypes.Role, "Customer"),
                new Claim("DeviceName", deviceName)
            };

            var identity = new ClaimsIdentity(claims, "None");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, "None");

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
