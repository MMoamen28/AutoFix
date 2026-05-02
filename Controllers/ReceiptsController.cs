using AutoFix.DTOs.Receipt;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReceiptsController : ControllerBase
    {
        private readonly IReceiptService _service;
        public ReceiptsController(IReceiptService service) => _service = service;

        [HttpGet]
        [Authorize(Roles = "Owner")]
        public async Task<ActionResult<List<ReceiptResponseDto>>> GetAll()
        {
            return await _service.GetAllAsync();
        }

        [HttpGet("owner-copies")]
        [Authorize(Roles = "Owner")]
        public async Task<ActionResult<List<ReceiptResponseDto>>> GetOwnerCopies()
        {
            return await _service.GetOwnerCopiesAsync();
        }

        [HttpGet("customer/{customerId}")]
        [Authorize(Roles = "Owner,Customer")]
        public async Task<ActionResult<List<ReceiptResponseDto>>> GetByCustomer(int customerId)
        {
            // If Customer role, they can only see their own
            if (User.IsInRole("Customer"))
            {
                var currentCustomerId = GetCurrentCustomerId();
                if (currentCustomerId != customerId) return Forbid();
            }

            return await _service.GetByCustomerIdAsync(customerId);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Owner,Customer")]
        public async Task<ActionResult<ReceiptResponseDto>> GetById(int id)
        {
            var receipt = await _service.GetByIdAsync(id);
            if (receipt == null) return NotFound();

            if (User.IsInRole("Customer"))
            {
                var currentCustomerId = GetCurrentCustomerId();
                if (receipt.CustomerId != currentCustomerId) return Forbid();
            }

            return Ok(receipt);
        }

        [HttpPatch("{id}/void")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> VoidReceipt(int id)
        {
            var result = await _service.VoidReceiptAsync(id);
            return result ? NoContent() : NotFound();
        }

        private int GetCurrentCustomerId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(idClaim, out int id) ? id : 0;
        }
    }
}
