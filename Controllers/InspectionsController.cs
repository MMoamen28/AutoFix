using AutoFix.DTOs.Inspection;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InspectionsController : ControllerBase
    {
        private readonly IInspectionService _service;

        public InspectionsController(IInspectionService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<List<InspectionResponseDto>>> GetAll([FromQuery] int? customerId)
        {
            if (User.IsInRole("Customer"))
            {
                var userCustId = User.FindFirst("customer_id")?.Value;
                if (int.TryParse(userCustId, out var cid))
                {
                    customerId = cid;
                }
            }

            var inspections = await _service.GetAllAsync(customerId);
            return Ok(inspections);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<InspectionResponseDto>> GetById(int id)
        {
            var inspection = await _service.GetByIdAsync(id);
            if (inspection == null) return NotFound();

            if (User.IsInRole("Customer"))
            {
                var userCustId = User.FindFirst("customer_id")?.Value;
                if (int.TryParse(userCustId, out var cid) && inspection.CustomerId != cid)
                {
                    return Forbid();
                }
            }

            return Ok(inspection);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<InspectionResponseDto>> Create([FromBody] CreateInspectionDto dto)
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
        public async Task<ActionResult<InspectionResponseDto>> Update(int id, [FromBody] UpdateInspectionDto dto)
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

        [HttpPost("{id:int}/revise")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<InspectionResponseDto>> Revise(int id, [FromBody] UpdateInspectionDto dto)
        {
            try
            {
                var revised = await _service.ReviseAsync(id, dto);
                return Ok(revised);
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

        [HttpPost("{id:int}/finalize")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<InspectionResponseDto>> Finalize(int id)
        {
            try
            {
                var finalized = await _service.FinalizeAsync(id);
                return Ok(finalized);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            return success ? NoContent() : NotFound();
        }

        [HttpGet("{id:int}/print")]
        [HttpGet("{id:int}/html")]
        public async Task<IActionResult> GetHtmlPrintReport(int id)
        {
            try
            {
                var inspection = await _service.GetByIdAsync(id);
                if (inspection == null) return NotFound();

                if (User.IsInRole("Customer"))
                {
                    var userCustId = User.FindFirst("customer_id")?.Value;
                    if (int.TryParse(userCustId, out var cid) && inspection.CustomerId != cid)
                    {
                        return Forbid();
                    }
                }

                var html = await _service.GenerateHtmlPrintReportAsync(id);
                return Content(html, "text/html; charset=utf-8");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpGet("blank-form")]
        [HttpGet("blank-form-html")]
        public async Task<IActionResult> GetBlankFormHtml()
        {
            var html = await _service.GenerateBlankFormHtmlAsync();
            return Content(html, "text/html; charset=utf-8");
        }

        [HttpPost("{id:int}/generate-pdf")]
        public async Task<IActionResult> GeneratePdf(int id)
        {
            try
            {
                var bytes = await _service.GenerateOrGetPdfAsync(id);
                return File(bytes, "text/html", $"INSP-{id}.html");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpGet("{id:int}/whatsapp-link")]
        public async Task<ActionResult<object>> GetWhatsAppLink(int id, [FromQuery] string? notes)
        {
            try
            {
                var url = await _service.GetWhatsAppShareUrlAsync(id, notes);
                return Ok(new { url });
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}
