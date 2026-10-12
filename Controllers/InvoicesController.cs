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
            var isCustomer = User.IsInRole("Customer");
            if (isCustomer)
            {
                // Strict isolation: if customer calls, only their own invoices
                var userCustId = User.FindFirst("customer_id")?.Value;
                if (int.TryParse(userCustId, out var cid))
                {
                    customerId = cid;
                }
            }

            var invoices = await _service.GetAllAsync(customerId, isCustomer);
            return Ok(invoices);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<InvoiceResponseDto>> GetById(int id)
        {
            var isCustomer = User.IsInRole("Customer");
            var invoice = await _service.GetByIdAsync(id, isCustomer);
            if (invoice == null) return NotFound();

            if (isCustomer)
            {
                var userCustId = User.FindFirst("customer_id")?.Value;
                if (int.TryParse(userCustId, out var cid) && invoice.CustomerId != cid)
                {
                    return Forbid();
                }
            }

            return Ok(invoice);
        }

        [HttpGet("{id:int}/print")]
        public async Task<IActionResult> Print(int id)
        {
            try
            {
                var html = await _service.GeneratePrintedInvoiceHtmlAsync(id);
                return Content(html, "text/html; charset=utf-8");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
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
