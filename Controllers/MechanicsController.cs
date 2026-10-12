using AutoFix.DTOs.Mechanic;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MechanicsController : ControllerBase
    {
        private readonly IMechanicService _service;
        public MechanicsController(IMechanicService service) => _service = service;

        [HttpGet]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<List<MechanicResponseDto>>> GetAll([FromQuery] bool includeArchived = false)
        {
            return Ok(await _service.GetAllAsync(includeArchived));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<MechanicResponseDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("{id}/work-history")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<MechanicWorkHistoryDto>> GetWorkHistory(
            int id, 
            [FromQuery] DateTime? from = null, 
            [FromQuery] DateTime? to = null)
        {
            var history = await _service.GetWorkHistoryAsync(id, from, to);
            return history == null ? NotFound() : Ok(history);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<MechanicResponseDto>> Create([FromBody] CreateMechanicDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<MechanicResponseDto>> Update(int id, [FromBody] UpdateMechanicDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("{id}/archive")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Archive(int id)
        {
            var result = await _service.ArchiveAsync(id);
            return result ? Ok(new { success = true, message = "Mechanic archived successfully" }) : NotFound();
        }

        [HttpPost("{id}/restore")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Restore(int id)
        {
            var result = await _service.RestoreAsync(id);
            return result ? Ok(new { success = true, message = "Mechanic restored successfully" }) : NotFound();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            return result ? NoContent() : NotFound();
        }
    }
}
