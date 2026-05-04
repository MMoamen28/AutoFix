using AutoFix.Data;
using AutoFix.DTOs.PurchaseOrder;
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
    public class PurchaseOrdersController : ControllerBase
    {
        private readonly IPurchaseOrderService _service;
        private readonly AppDbContext _db;

        public PurchaseOrdersController(IPurchaseOrderService service, AppDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("my")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> GetMine()
        {
            var customerId = await GetCurrentCustomerId();
            return Ok(await _service.GetByCustomerIdAsync(customerId));
        }

        [HttpGet("assigned")]
        [Authorize(Roles = "Mechanic")]
        public async Task<IActionResult> GetAssigned()
        {
            var mechanicId = await GetCurrentMechanicId();
            return Ok(await _service.GetByMechanicIdAsync(mechanicId));
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> GetPending()
        {
            return Ok(await _service.GetPendingAsync());
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Owner,Customer,Mechanic")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _service.GetByIdAsync(id);
            if (order == null) return NotFound();

            // Authorization checks
            if (User.IsInRole("Customer"))
            {
                var customerId = await GetCurrentCustomerId();
                if (order.CustomerId != customerId) return Forbid();
            }
            else if (User.IsInRole("Mechanic"))
            {
                var mechanicId = await GetCurrentMechanicId();
                if (order.MechanicId != mechanicId) return Forbid();
            }

            return Ok(order);
        }

        [HttpPost]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> PlaceOrder([FromBody] PlaceOrderDto dto)
        {
            var customerId = await GetCurrentCustomerId();
            try
            {
                var order = await _service.PlaceOrderAsync(customerId, dto);
                return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/assign")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> AssignMechanic(int id, [FromBody] AssignMechanicDto dto)
        {
            var result = await _service.AssignMechanicAsync(id, dto);
            return result != null ? Ok(result) : NotFound();
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Owner,Mechanic")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdatePurchaseOrderStatusDto dto)
        {
            if (User.IsInRole("Mechanic"))
            {
                var order = await _service.GetByIdAsync(id);
                var mechanicId = await GetCurrentMechanicId();
                if (order?.MechanicId != mechanicId) return Forbid();
            }

            var result = await _service.UpdateStatusAsync(id, dto);
            return result != null ? Ok(result) : NotFound();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> CancelOrder(int id)
        {
            var customerId = await GetCurrentCustomerId();
            var result = await _service.CancelOrderAsync(id, customerId);
            return result ? NoContent() : BadRequest(new { message = "Order cannot be cancelled. It must be in Pending status." });
        }

        private async Task<int> GetCurrentCustomerId()
        {
            var keycloakUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var customer = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.KeycloakUserId == keycloakUserId);
            return customer?.Id ?? 0;
        }

        private async Task<int> GetCurrentMechanicId()
        {
            var keycloakUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var mechanic = await _db.Mechanics.AsNoTracking().FirstOrDefaultAsync(m => m.KeycloakUserId == keycloakUserId);
            return mechanic?.Id ?? 0;
        }
    }
}
