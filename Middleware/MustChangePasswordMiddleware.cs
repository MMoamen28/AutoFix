using Microsoft.AspNetCore.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace AutoFix.Middleware
{
    public class MustChangePasswordMiddleware
    {
        private readonly RequestDelegate _next;

        public MustChangePasswordMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var mustChange = context.User.FindFirst("must_change_password")?.Value;
                if (string.Equals(mustChange, "true", System.StringComparison.OrdinalIgnoreCase))
                {
                    var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
                    
                    bool allowed = path.StartsWith("/api/auth/change-password")
                                || path.StartsWith("/api/auth/me")
                                || path.StartsWith("/api/health")
                                || path.StartsWith("/swagger")
                                || path.StartsWith("/hubs")
                                || !path.StartsWith("/api"); // allow frontend static assets to load

                    if (!allowed)
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";
                        var payload = JsonSerializer.Serialize(new
                        {
                            error = "MustChangePasswordRequired",
                            message = "Password change required before accessing system. You must change your default password."
                        });
                        await context.Response.WriteAsync(payload);
                        return;
                    }
                }
            }

            await _next(context);
        }
    }
}
