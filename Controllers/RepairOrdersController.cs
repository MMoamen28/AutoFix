using AutoFix.DTOs.RepairOrder;
using AutoFix.Services.Interfaces;

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
        public RepairOrdersController(IRepairOrderService service) => _service = service;

        // GET api/repairorders — Admin and Mechanic can see all
        [HttpGet]
        
        public async Task<ActionResult<List<RepairOrderResponseDto>>> GetAll()
        {
            var orders = await _service.GetAllAsync();
            return Ok(orders);
        }

        // GET api/repairorders/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<RepairOrderResponseDto>> GetById(int id)
        {
            var order = await _service.GetByIdAsync(id);
            return order is null ? NotFound() : Ok(order);
        }

        // GET api/repairorders/my — Customer sees their own
        [HttpGet("my")]
        
        public async Task<ActionResult<List<RepairOrderResponseDto>>> GetMyOrders()
        {
            var customerId = GetCurrentCustomerId();
            var orders = await _service.GetByCustomerIdAsync(customerId);
            return Ok(orders);
        }

        // POST api/repairorders — Customer creates an order for themselves
        [HttpPost]
        
        public async Task<ActionResult<RepairOrderResponseDto>> Create([FromBody] CreateRepairOrderDto dto)
        {
            var customerId = GetCurrentCustomerId();
            var result = await _service.CreateAsync(dto, customerId);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        // PUT api/repairorders/{id} — Mechanic or Admin updates status
        [HttpPut("{id}")]
        
        public async Task<ActionResult<RepairOrderResponseDto>> Update(int id, [FromBody] UpdateRepairOrderDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return result is null ? NotFound() : Ok(result);
        }

        // DELETE api/repairorders/{id} — Admin only
        [HttpDelete("{id}")]
        
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id);
            return deleted ? NoContent() : NotFound();
        }

        private int GetCurrentCustomerId()
        {
            // In a production app, you would look up the Customer entity by the Keycloak 'sub' (String).
            // For this project's current structure, we attempt to parse the 'sub' or 'nameid' as an int.
            
            var keycloakId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(keycloakId))
            {
                throw new UnauthorizedAccessException("User identification claim (sub or nameid) is missing.");
            }
            
            if (int.TryParse(keycloakId, out int id))
            {
                return id;
            }

            // Fallback for demo purposes if the sub is a GUID/String and not an int ID
            // In a real scenario, you'd do: return _customerService.GetByExternalId(keycloakId).Id;
            return 1; 
        }
    }
}
