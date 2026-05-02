using AutoFix.DTOs.SparePart;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SparePartsController : ControllerBase
    {
        private readonly ISparePartService _service;
        private readonly IMechanicActionRequestService _actionRequestService;

        public SparePartsController(ISparePartService service, IMechanicActionRequestService actionRequestService)
        {
            _service = service;
            _actionRequestService = actionRequestService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<List<SparePartResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<SparePartResponseDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("category/{categoryId}")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<List<SparePartResponseDto>>> GetByCategory(int categoryId)
        {
            return Ok(await _service.GetByCategoryAsync(categoryId));
        }

        [HttpGet("lowstock")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<List<SparePartResponseDto>>> GetLowStock()
        {
            return Ok(await _service.GetLowStockAsync());
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<IActionResult> Create([FromBody] CreateSparePartDto dto)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole == "Admin" || userRole == "Owner")
            {
                var result = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }

            var mechanicId = GetCurrentMechanicId();
            var mechanicName = User.FindFirst("preferred_username")?.Value ?? "Mechanic";
            var payload = System.Text.Json.JsonSerializer.Serialize(dto);

            await _actionRequestService.CreateAsync(new DTOs.MechanicActionRequest.CreateMechanicActionRequestDto
            {
                ActionType = "AddSparePart",
                ActionPayload = payload
            }, mechanicId, mechanicName);

            return Accepted(new { message = "Your request has been submitted for Owner approval." });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<SparePartResponseDto>> Update(int id, [FromBody] UpdateSparePartDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPatch("{id}/stock")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<IActionResult> AdjustStock(int id, [FromBody] AdjustStockDto dto)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole == "Admin" || userRole == "Owner")
            {
                var (success, error, part) = await _service.AdjustStockAsync(id, dto);
                if (!success) return BadRequest(new { error });
                return Ok(part);
            }

            var mechanicId = GetCurrentMechanicId();
            var mechanicName = User.FindFirst("preferred_username")?.Value ?? "Mechanic";
            var payload = System.Text.Json.JsonSerializer.Serialize(new { sparePartId = id, dto.Adjustment, dto.Reason });

            await _actionRequestService.CreateAsync(new DTOs.MechanicActionRequest.CreateMechanicActionRequestDto
            {
                ActionType = "AdjustStock",
                ActionPayload = payload
            }, mechanicId, mechanicName);

            return Accepted(new { message = "Your request has been submitted for Owner approval." });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            return success ? NoContent() : NotFound();
        }

        private int GetCurrentMechanicId()
        {
            var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(idClaim, out int id) ? id : 0;
        }
    }
}
