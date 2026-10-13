using AutoFix.Data;
using AutoFix.DTOs.Dashboard;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _service;
        private readonly AppDbContext _db;

        public DashboardController(IDashboardService service, AppDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<AdminDashboardDto>> GetAdminDashboard()
        {
            var data = await _service.GetAdminDashboardAsync();
            return Ok(data);
        }

        [HttpGet("financial")]
        [Authorize(Roles = "Admin,Owner,Accountant")]
        public async Task<ActionResult<FinancialSummaryDto>> GetFinancialSummary(
            [FromQuery] string period = "month",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var data = await _service.GetFinancialSummaryAsync(period, startDate, endDate);
            return Ok(data);
        }

        [HttpGet("customer")]
        public async Task<ActionResult<CustomerDashboardDto>> GetCustomerDashboard([FromQuery] int? customerId)
        {
            int targetCustomerId = 0;

            if (User.IsInRole("Customer"))
            {
                // Strict isolation: extract customer ID linked to logged-in user
                var customerIdClaim = User.FindFirst("customer_id")?.Value;
                if (!int.TryParse(customerIdClaim, out targetCustomerId) || targetCustomerId <= 0)
                {
                    // Fallback to checking AppUser or KeycloakId
                    var username = User.Identity?.Name;
                    var appUser = await _db.AppUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username);
                    if (appUser?.CustomerId != null)
                    {
                        targetCustomerId = appUser.CustomerId.Value;
                    }
                    else
                    {
                        var keycloakUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                        var cust = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.KeycloakUserId == keycloakUserId);
                        targetCustomerId = cust?.Id ?? 0;
                    }
                }

                if (targetCustomerId == 0)
                {
                    return BadRequest(new { message = "Customer profile not linked to user account." });
                }

                if (customerId.HasValue && customerId.Value > 0 && customerId.Value != targetCustomerId)
                {
                    return Forbid();
                }
            }
            else
            {
                // Admin or Owner can query any customer dashboard
                if (!customerId.HasValue || customerId.Value <= 0)
                {
                    return BadRequest(new { message = "CustomerId parameter required for Admin view." });
                }
                targetCustomerId = customerId.Value;
            }

            var dashboard = await _service.GetCustomerDashboardAsync(targetCustomerId);
            return dashboard == null ? NotFound() : Ok(dashboard);
        }
    }
}
