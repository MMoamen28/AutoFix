using AutoFix.DTOs.Service;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServicesController : ControllerBase
    {
        private readonly IServiceService _service;
        public ServicesController(IServiceService service) => _service = service;

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<List<ServiceResponseDto>>> GetAll([FromQuery] bool includeArchived = false)
        {
            var isStaff = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Receptionist") || User.IsInRole("Reception") || User.IsInRole("Accountant");
            var result = await _service.GetAllAsync(includeArchived && isStaff);

            // Customers or non-staff never see internal cost
            if (!isStaff)
            {
                foreach (var s in result)
                {
                    s.DefaultCost = 0;
                }
            }

            return Ok(result);
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<ActionResult<ServiceResponseDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();

            var isStaff = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Receptionist") || User.IsInRole("Reception") || User.IsInRole("Accountant");
            if (!isStaff)
            {
                result.DefaultCost = 0;
            }

            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception")]
        public async Task<ActionResult<ServiceResponseDto>> Create([FromBody] CreateServiceDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception")]
        public async Task<ActionResult<ServiceResponseDto>> Update(int id, [FromBody] UpdateServiceDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            return success ? NoContent() : NotFound();
        }

        [HttpPost("{id:int}/restore")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception")]
        public async Task<IActionResult> Restore(int id)
        {
            var success = await _service.RestoreAsync(id);
            return success ? NoContent() : NotFound();
        }
    }
}
