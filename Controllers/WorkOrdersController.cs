using AutoFix.Data;
using AutoFix.DTOs.Invoice;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/work-orders")]
    [Authorize]
    public class WorkOrdersController : ControllerBase
    {
        private readonly IWorkOrderService _service;
        private readonly AppDbContext _db;

        public WorkOrdersController(IWorkOrderService service, AppDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<List<WorkOrderResponseDto>>> GetAll(
            [FromQuery] string? status, 
            [FromQuery] int? customerId,
            [FromQuery] int? mechanicId)
        {
            var results = await _service.GetAllAsync(status, customerId, mechanicId);
            return Ok(results);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<WorkOrderResponseDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<WorkOrderResponseDto>> Create([FromBody] CreateWorkOrderDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<WorkOrderResponseDto>> Update(int id, [FromBody] UpdateWorkOrderDto dto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, dto);
                return updated == null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/assign-mechanics")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<WorkOrderResponseDto>> AssignMechanics(int id, [FromBody] AssignMechanicRequestDto dto)
        {
            try
            {
                var updated = await _service.AssignMechanicsAsync(id, dto);
                return Ok(updated);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}/mechanic-history")]
        public async Task<ActionResult<List<WorkOrderMechanicHistoryDto>>> GetMechanicHistory(int id)
        {
            try
            {
                var history = await _service.GetMechanicHistoryAsync(id);
                return Ok(history);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPut("{id:int}/status")]
        [HttpPost("{id:int}/transition")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<WorkOrderResponseDto>> TransitionStatus(int id, [FromBody] WorkOrderStatusTransitionDto dto)
        {
            try
            {
                var updated = await _service.TransitionStatusAsync(id, dto.NewStatus, dto.Notes);
                return Ok(updated);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/items")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<WorkOrderResponseDto>> AddItem(int id, [FromBody] CreateWorkOrderLineDto itemDto)
        {
            try
            {
                var updated = await _service.AddLineAsync(id, itemDto);
                return Ok(updated);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/photos")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<WorkOrderPhotoResponseDto>> UploadPhoto(int id, IFormFile file, [FromForm] string? photoType, [FromForm] string? caption)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded." });
            }

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var photoBytes = ms.ToArray();

            try
            {
                var result = await _service.AddPhotoAsync(id, file.FileName, photoBytes, photoType ?? "Reception", caption);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("{id:int}/convert-to-invoice")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<InvoiceResponseDto>> ConvertToInvoice(int id, [FromBody] ConvertWorkOrderToInvoiceDto? options)
        {
            try
            {
                var invoice = await _service.ConvertToInvoiceAsync(id, options);
                return Ok(invoice);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}/print")]
        [HttpGet("{id:int}/print-html")]
        public async Task<IActionResult> PrintOrder(int id)
        {
            try
            {
                var html = await _service.GeneratePrintedOrderHtmlAsync(id);
                return Content(html, "text/html; charset=utf-8");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPatch("{id:int}/claim")]
        [HttpPost("{id:int}/claim")]
        [Authorize(Roles = "Mechanic,Admin,Owner")]
        public async Task<ActionResult<WorkOrderResponseDto>> ClaimOrder(int id)
        {
            var mechanicId = await GetCurrentMechanicId();
            if (mechanicId == 0)
            {
                return BadRequest(new { message = "Mechanic profile not found for current user." });
            }

            try
            {
                var result = await _service.ClaimOrderAsync(id, mechanicId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/credit-invoice")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<InvoiceResponseDto>> CreditInvoice(int id, [FromBody] CreditInvoiceRequestDto? dto)
        {
            try
            {
                var result = await _service.CreditWorkOrderInvoiceAsync(id, dto?.Reason);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private async Task<int> GetCurrentMechanicId()
        {
            var keycloakUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var mechanic = await _db.Mechanics.AsNoTracking().FirstOrDefaultAsync(m => m.KeycloakUserId == keycloakUserId);
            if (mechanic != null) return mechanic.Id;

            var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("preferred_username")?.Value;
            if (!string.IsNullOrEmpty(username))
            {
                var byUser = await _db.Mechanics.AsNoTracking().FirstOrDefaultAsync(m => m.Email == username);
                if (byUser != null) return byUser.Id;
            }
            return 0;
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var success = await _service.DeleteAsync(id);
                return success ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class CreditInvoiceRequestDto
    {
        public string? Reason { get; set; }
    }
}
