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
    [Route("api/mechanic-requests")]
    public class MechanicActionRequestsController : ControllerBase
    {
        private readonly IMechanicActionRequestService _service;
        public MechanicActionRequestsController(IMechanicActionRequestService service) => _service = service;

        [HttpGet]
        [Authorize(Roles = "Owner")]
        public async Task<ActionResult<List<MechanicActionRequestResponseDto>>> GetAll()
        {
            return await _service.GetAllAsync();
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Owner")]
        public async Task<ActionResult<List<MechanicActionRequestResponseDto>>> GetPending()
        {
            return await _service.GetAllPendingAsync();
        }

        [HttpGet("mine")]
        [Authorize(Roles = "Mechanic")]
        public async Task<ActionResult<List<MechanicActionRequestResponseDto>>> GetMine()
        {
            var mechanicId = GetCurrentMechanicId();
            return await _service.GetByMechanicIdAsync(mechanicId);
        }

        [HttpPost]
        [Authorize(Roles = "Mechanic")]
        public async Task<ActionResult<MechanicActionRequestResponseDto>> Create([FromBody] CreateMechanicActionRequestDto dto)
        {
            var mechanicId = GetCurrentMechanicId();
            var mechanicName = User.FindFirst("preferred_username")?.Value ?? "Mechanic";
            var result = await _service.CreateAsync(dto, mechanicId, mechanicName);
            return Ok(result);
        }

        [HttpPatch("{id}/review")]
        [Authorize(Roles = "Owner")]
        public async Task<ActionResult<MechanicActionRequestResponseDto>> Review(int id, [FromBody] ReviewActionRequestDto dto)
        {
            var result = await _service.ReviewAsync(id, dto);
            return result is null ? NotFound() : Ok(result);
        }

        private int GetCurrentMechanicId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(idClaim, out int id) ? id : 0;
        }
    }
}
