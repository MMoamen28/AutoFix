using AutoFix.DTOs.RepairOrder;
using AutoFix.Services.Interfaces;
using AutoFix.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RepairOrdersController : ControllerBase
    {
        private readonly IRepairOrderService _service;
        private readonly AppDbContext _db;

        public RepairOrdersController(IRepairOrderService service, AppDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Owner,Mechanic,Customer")]
        public async Task<ActionResult<List<RepairOrderResponseDto>>> GetAll()
        {
            // Staff and Admins see everything
            if (User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Mechanic"))
            {
                var allOrders = await _service.GetAllAsync();
                return Ok(allOrders);
            }

            // Customers only see their own
            if (User.IsInRole("Customer"))
            {
                var customerId = await GetCurrentCustomerId();
                if (customerId == 0) return Ok(new List<RepairOrderResponseDto>());
                return Ok(await _service.GetByCustomerIdAsync(customerId));
            }
            
            return Forbid();
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Owner,Mechanic,Customer")]
        public async Task<ActionResult<RepairOrderResponseDto>> GetById(int id)
        {
            var order = await _service.GetByIdAsync(id);
            if (order == null) return NotFound();

            if (User.IsInRole("Customer"))
            {
                var customerId = await GetCurrentCustomerId();
                if (order.CustomerId != customerId) return Forbid();
            }

            return Ok(order);
        }

        [HttpGet("my")]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult<List<RepairOrderResponseDto>>> GetMyOrders()
        {
            var customerId = await GetCurrentCustomerId();
            var orders = await _service.GetByCustomerIdAsync(customerId);
            return Ok(orders);
        }

        [HttpPost]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult<RepairOrderResponseDto>> Create([FromBody] CreateRepairOrderDto dto)
        {
            var customerId = await GetCurrentCustomerId();
            if (customerId == 0) return BadRequest(new { message = "Customer profile not found" });

            try 
            {
                var result = await _service.CreateAsync(dto, customerId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateRepairOrderDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return result is null ? NotFound() : Ok(result);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id);
            return deleted ? NoContent() : NotFound();
        }

        [HttpPatch("{id}/claim")]
        [Authorize(Roles = "Mechanic")]
        public async Task<IActionResult> ClaimOrder(int id)
        {
            var mechanicId = await GetCurrentMechanicId();
            if (mechanicId == 0) 
                return BadRequest(new { message = "Mechanic profile not found" });

            var order = await _service.GetByIdAsync(id);
            if (order == null) return NotFound();
            
            if (order.Status != "Pending")
                return BadRequest(new { 
                    message = "This repair order is no longer available. It may have already been claimed." 
                });

            if (order.MechanicId != null)
                return BadRequest(new { 
                    message = "This order has already been assigned to a mechanic." 
                });

            var result = await _service.ClaimOrderAsync(id, mechanicId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("available")]
        [Authorize(Roles = "Mechanic")]
        public async Task<ActionResult<List<RepairOrderResponseDto>>> GetAvailable()
        {
            var orders = await _service.GetAvailableAsync();
            return Ok(orders);
        }

        [HttpGet("my-assigned")]
        [Authorize(Roles = "Mechanic")]
        public async Task<ActionResult<List<RepairOrderResponseDto>>> GetMyAssigned()
        {
            var mechanicId = await GetCurrentMechanicId();
            var orders = await _service.GetByMechanicIdAsync(mechanicId);
            return Ok(orders);
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
