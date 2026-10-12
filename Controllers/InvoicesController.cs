using AutoFix.DTOs.Invoice;
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
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoiceService _service;

        public InvoicesController(IInvoiceService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<List<InvoiceResponseDto>>> GetAll([FromQuery] int? customerId)
        {
            if (User.IsInRole("Customer"))
            {
                // Strict isolation: if customer calls, only their own invoices
                var userCustId = User.FindFirst("customer_id")?.Value;
                if (int.TryParse(userCustId, out var cid))
                {
                    customerId = cid;
                }
            }

            var invoices = await _service.GetAllAsync(customerId);
            return Ok(invoices);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<InvoiceResponseDto>> GetById(int id)
        {
            var invoice = await _service.GetByIdAsync(id);
            if (invoice == null) return NotFound();

            if (User.IsInRole("Customer"))
            {
                var userCustId = User.FindFirst("customer_id")?.Value;
                if (int.TryParse(userCustId, out var cid) && invoice.CustomerId != cid)
                {
                    return Forbid();
                }
            }

            return Ok(invoice);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<InvoiceResponseDto>> Create([FromBody] CreateInvoiceDto dto)
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

        [HttpPost("{id:int}/payments")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<PaymentResponseDto>> RecordPayment(int id, [FromBody] RecordPaymentDto dto)
        {
            try
            {
                var userName = User.Identity?.Name ?? "Admin";
                var payment = await _service.RecordPaymentAsync(id, dto, userName);
                return Ok(payment);
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
}
