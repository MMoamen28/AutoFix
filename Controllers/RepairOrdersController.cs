using AutoFix.DTOs.RepairOrder;
using AutoFix.DTOs.MechanicActionRequest;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public RepairOrdersController(IRepairOrderService service, IMechanicActionRequestService actionRequestService)
        {
            _service = service;
            _actionRequestService = actionRequestService;
        }

        // GET api/repairorders — Admin, Owner and Mechanic can see all
        [HttpGet]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<List<RepairOrderResponseDto>>> GetAll()
        {
            var orders = await _service.GetAllAsync();
            return Ok(orders);
        }

        // GET api/repairorders/{id}
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Owner,Mechanic,Customer")]
        public async Task<ActionResult<RepairOrderResponseDto>> GetById(int id)
        {
            var order = await _service.GetByIdAsync(id);
            if (order == null) return NotFound();

            if (User.IsInRole("Customer"))
            {
                var customerId = GetCurrentCustomerId();
                if (order.CustomerId != customerId) return Forbid();
            }

            return Ok(order);
        }

        // GET api/repairorders/my — Customer sees their own
        [HttpGet("my")]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult<List<RepairOrderResponseDto>>> GetMyOrders()
        {
            var customerId = GetCurrentCustomerId();
            var orders = await _service.GetByCustomerIdAsync(customerId);
            return Ok(orders);
        }

        // POST api/repairorders — Customer creates an order for themselves
        [HttpPost]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult<RepairOrderResponseDto>> Create([FromBody] CreateRepairOrderDto dto)
        {
            var customerId = GetCurrentCustomerId();
            var result = await _service.CreateAsync(dto, customerId);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        // PUT api/repairorders/{id} — Mechanic submits request, Admin or Owner updates directly
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateRepairOrderDto dto)
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Admin and Owner can update directly
            if (userRole == "Admin" || userRole == "Owner")
            {
                var result = await _service.UpdateAsync(id, dto);
                return result is null ? NotFound() : Ok(result);
            }

            // Mechanic must submit a request for Owner approval
            var mechanicId = GetCurrentMechanicId();
            var mechanicName = User.FindFirst("preferred_username")?.Value ?? "Mechanic";
            var payload = System.Text.Json.JsonSerializer.Serialize(new { repairOrderId = id, dto.Status, dto.MechanicId, dto.Notes });

            await _actionRequestService.CreateAsync(new CreateMechanicActionRequestDto
            {
                ActionType = "UpdateRepairOrderStatus",
                ActionPayload = payload
            }, mechanicId, mechanicName);

            return Accepted(new { message = "Your request has been submitted for Owner approval." });
        }

        // DELETE api/repairorders/{id} — Admin and Owner only
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id);
            return deleted ? NoContent() : NotFound();
        }

        private int GetCurrentCustomerId()
        {
            var keycloakId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
            return int.TryParse(keycloakId, out int id) ? id : 0;
        }

        private int GetCurrentMechanicId()
        {
            var keycloakId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
            return int.TryParse(keycloakId, out int id) ? id : 0;
        }
    }
}
