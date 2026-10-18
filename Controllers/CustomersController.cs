using AutoFix.DTOs.Customer;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Owner")]
    public class CustomersController : ControllerBase
    {
        private readonly ICustomerService _service;
        public CustomersController(ICustomerService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<List<CustomerResponseDto>>> GetAll([FromQuery] string? search, [FromQuery] bool includeArchived = false)
        {
            if (!string.IsNullOrWhiteSpace(search))
            {
                return Ok(await _service.SearchAsync(search, includeArchived));
            }
            return Ok(await _service.GetAllAsync(includeArchived));
        }

        [HttpGet("check-duplicate")]
        public async Task<ActionResult<CustomerResponseDto?>> CheckDuplicate([FromQuery] string phone, [FromQuery] int? excludeId)
        {
            var duplicate = await _service.CheckDuplicatePhoneAsync(phone, excludeId);
            return Ok(duplicate);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CustomerResponseDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<CustomerResponseDto>> Create([FromBody] CreateCustomerDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (AutoFix.Exceptions.ValidationWarningException ex)
            {
                return StatusCode(409, new
                {
                    requiresConfirmation = true,
                    code = ex.Code,
                    message = ex.Message,
                    existingRecordId = ex.ExistingRecordId,
                    existingRecordName = ex.ExistingRecordName
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("quick-add")]
        public async Task<ActionResult<QuickAddCustomerCarResponseDto>> QuickAdd([FromBody] QuickAddCustomerCarDto dto)
        {
            try
            {
                var result = await _service.QuickAddAsync(dto);
                return Ok(result);
            }
            catch (AutoFix.Exceptions.ValidationWarningException ex)
            {
                return StatusCode(409, new
                {
                    requiresConfirmation = true,
                    code = ex.Code,
                    message = ex.Message,
                    existingRecordId = ex.ExistingRecordId,
                    existingRecordName = ex.ExistingRecordName
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<CustomerResponseDto>> Update(int id, [FromBody] UpdateCustomerDto dto)
        {
            try
            {
                var result = await _service.UpdateAsync(id, dto);
                return result == null ? NotFound() : Ok(result);
            }
            catch (AutoFix.Exceptions.ValidationWarningException ex)
            {
                return StatusCode(409, new
                {
                    requiresConfirmation = true,
                    code = ex.Code,
                    message = ex.Message,
                    existingRecordId = ex.ExistingRecordId,
                    existingRecordName = ex.ExistingRecordName
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            return await Archive(id);
        }

        [HttpPost("{id}/archive")]
        public async Task<IActionResult> Archive(int id)
        {
            try
            {
                var result = await _service.ArchiveAsync(id);
                return result ? NoContent() : NotFound();
            }
            catch (System.InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/restore")]
        public async Task<IActionResult> Restore(int id)
        {
            var result = await _service.RestoreAsync(id);
            return result ? Ok(new { message = "Customer restored successfully." }) : NotFound();
        }
    }
}
