using AutoFix.DTOs.Invoice;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

        [HttpGet("by-number/{invoiceNumber}")]
        public async Task<ActionResult<InvoiceResponseDto>> GetByNumber(string invoiceNumber)
        {
            var isCustomer = User.IsInRole("Customer");
            var invoice = await _service.GetByInvoiceNumberAsync(invoiceNumber, isCustomer);
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

        [HttpGet("{id:int}/preview")]
        public async Task<IActionResult> Preview(int id)
        {
            try
            {
                var isCustomer = User.IsInRole("Customer");
                var html = await _service.GenerateWordTemplateInvoiceHtmlAsync(id, isCustomer);
                return Content(html, "text/html; charset=utf-8");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpGet("{id:int}/print")]
        public async Task<IActionResult> Print(int id)
        {
            try
            {
                var isCustomer = User.IsInRole("Customer");
                var html = await _service.GenerateWordTemplateInvoiceHtmlAsync(id, isCustomer);
                return Content(html, "text/html; charset=utf-8");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpGet("by-work-order/{workOrderId:int}/preview")]
        public async Task<IActionResult> PreviewByWorkOrder(int workOrderId)
        {
            try
            {
                var isCustomer = User.IsInRole("Customer");
                var html = await _service.GenerateWordTemplateInvoiceHtmlForWorkOrderAsync(workOrderId, isCustomer);
                return Content(html, "text/html; charset=utf-8");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPut("{id:int}/number")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<InvoiceResponseDto>> UpdateInvoiceNumber(int id, [FromBody] UpdateInvoiceNumberDto dto)
        {
            try
            {
                var userName = User.Identity?.Name ?? "Admin";
                var isAdmin = User.IsInRole("Admin") || User.IsInRole("Owner");
                var result = await _service.UpdateInvoiceNumberAsync(id, dto, userName, isAdmin);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(409, new { message = "تم تعديل هذا السجل من جهاز آخر، أعد التحميل", isConcurrencyConflict = true });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}/date")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<InvoiceResponseDto>> UpdateInvoiceDate(int id, [FromBody] UpdateInvoiceDateDto dto)
        {
            try
            {
                var userName = User.Identity?.Name ?? "Admin";
                var isAdmin = User.IsInRole("Admin") || User.IsInRole("Owner");
                var result = await _service.UpdateInvoiceDateAsync(id, dto, userName, isAdmin);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(409, new { message = "تم تعديل هذا السجل من جهاز آخر، أعد التحميل", isConcurrencyConflict = true });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
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
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception,Accountant")]
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

        [HttpPost("payments")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception,Accountant")]
        public async Task<ActionResult<PaymentResponseDto>> RecordPaymentFromBody([FromBody] RecordPaymentDto dto)
        {
            if (!dto.InvoiceId.HasValue || dto.InvoiceId.Value <= 0)
            {
                return BadRequest(new { message = "رقم الفاتورة مطلوب لتسجيل الدفعة" });
            }
            return await RecordPayment(dto.InvoiceId.Value, dto);
        }

        [HttpPost("{id:int}/credit")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception,Accountant")]
        public async Task<ActionResult<InvoiceResponseDto>> CreditInvoice(int id, [FromBody] CreditInvoiceRequestDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Reason))
            {
                return BadRequest(new { message = "A mandatory reason is required to issue a credit note." });
            }

            try
            {
                var userName = User.Identity?.Name ?? "Admin";
                var result = await _service.CreditInvoiceAsync(id, dto.Reason, userName);
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
