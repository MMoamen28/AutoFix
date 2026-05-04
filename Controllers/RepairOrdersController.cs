using AutoFix.DTOs.RepairOrder;
using AutoFix.DTOs.MechanicActionRequest;
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
        private readonly IMechanicActionRequestService _actionRequestService;
        private readonly AppDbContext _db;

        public RepairOrdersController(IRepairOrderService service, IMechanicActionRequestService actionRequestService, AppDbContext db)
        {
            _service = service;
            _actionRequestService = actionRequestService;
            _db = db;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<List<RepairOrderResponseDto>>> GetAll()
        {
            var orders = await _service.GetAllAsync();
            return Ok(orders);
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
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (userRole == "Admin" || userRole == "Owner")
            {
                var result = await _service.UpdateAsync(id, dto);
                return result is null ? NotFound() : Ok(result);
            }

            var mechanicId = await GetCurrentMechanicId();
            var mechanicName = User.FindFirst("preferred_username")?.Value ?? "Mechanic";
            var payload = System.Text.Json.JsonSerializer.Serialize(new { repairOrderId = id, dto.Status, dto.MechanicId, dto.Notes });

            await _actionRequestService.CreateAsync(new CreateMechanicActionRequestDto
            {
                ActionType = "UpdateRepairOrderStatus",
                ActionPayload = payload
            }, mechanicId, mechanicName);

            return Accepted(new { message = "Your request has been submitted for Owner approval." });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id);
            return deleted ? NoContent() : NotFound();
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
