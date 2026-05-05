using AutoFix.Data;
using AutoFix.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AutoFix.Middleware
{
    public class UserAutoProvisioningMiddleware
    {
        private readonly RequestDelegate _next;

        public UserAutoProvisioningMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, AppDbContext db)
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var keycloakUserId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? context.User.FindFirst("sub")?.Value;
                
                // Extract roles from multiple possible locations
                var roles = context.User.FindAll("roles").Select(r => r.Value).ToList();
                if (!roles.Any())
                {
                    roles = context.User.FindAll(ClaimTypes.Role).Select(r => r.Value).ToList();
                }

                if (!string.IsNullOrEmpty(keycloakUserId))
                {
                    if (roles.Contains("Customer"))
                    {
                        var exists = await db.Customers.AnyAsync(c => c.KeycloakUserId == keycloakUserId);
                        if (!exists)
                        {
                            var username = context.User.FindFirst("preferred_username")?.Value ?? "New Customer";
                            var email = context.User.FindFirst(ClaimTypes.Email)?.Value ?? $"{username}@example.com";
                            
                            db.Customers.Add(new Customer
                            {
                                KeycloakUserId = keycloakUserId,
                                FullName = username,
                                Email = email,
                                Phone = "555-0000",
                                CreatedAt = DateTime.UtcNow
                            });
                            await db.SaveChangesAsync();
                        }
                    }
                    else if (roles.Contains("Mechanic"))
                    {
                        var exists = await db.Mechanics.AnyAsync(m => m.KeycloakUserId == keycloakUserId);
                        if (!exists)
                        {
                            var username = context.User.FindFirst("preferred_username")?.Value ?? "New Mechanic";
                            
                            db.Mechanics.Add(new Mechanic
                            {
                                KeycloakUserId = keycloakUserId,
                                FirstName = username,
                                LastName = "Staff",
                                Email = context.User.FindFirst(ClaimTypes.Email)?.Value ?? $"{username}@staff.com",
                                HiredAt = DateTime.UtcNow
                            });
                            await db.SaveChangesAsync();
                        }
                    }
                }
            }

            await _next(context);
        }
    }
}
