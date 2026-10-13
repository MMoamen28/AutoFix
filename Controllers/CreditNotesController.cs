using AutoFix.DTOs.Invoice;
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
    [Route("api/credit-notes")]
    [Authorize]
    public class CreditNotesController : ControllerBase
    {
        private readonly IInvoiceService _service;

        public CreditNotesController(IInvoiceService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<List<CreditNoteResponseDto>>> GetAll([FromQuery] int? customerId)
        {
            var isCustomer = User.IsInRole("Customer");
            if (isCustomer)
            {
                var userCustId = User.FindFirst("customer_id")?.Value;
                if (int.TryParse(userCustId, out var cid))
                {
                    customerId = cid;
                }
            }

            var notes = await _service.GetAllCreditNotesAsync(customerId);
            return Ok(notes);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception,Accountant")]
        public async Task<ActionResult<InvoiceResponseDto>> Create([FromBody] CreateCreditNoteDto dto)
        {
            if (dto == null || dto.InvoiceId <= 0 || string.IsNullOrWhiteSpace(dto.Reason))
            {
                return BadRequest(new { message = "Invoice ID and mandatory reason are required." });
            }

            try
            {
                var userName = User.Identity?.Name ?? "Admin";
                var result = await _service.CreditInvoiceAsync(dto.InvoiceId, dto.Reason, userName);
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
    }

    public class CreateCreditNoteDto
    {
        public int InvoiceId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}
