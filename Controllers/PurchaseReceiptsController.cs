using AutoFix.Data;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PurchaseReceiptsController : ControllerBase
    {
        private readonly IPurchaseReceiptService _service;
        private readonly AppDbContext _db;

        public PurchaseReceiptsController(IPurchaseReceiptService service, AppDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("owner-copies")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> GetOwnerCopies()
        {
            return Ok(await _service.GetOwnerCopiesAsync());
        }

        [HttpGet("my")]
        [Authorize(Roles = "Customer")]
        public async Task<IActionResult> GetMine()
        {
            var customerId = await GetCurrentCustomerId();
            return Ok(await _service.GetByCustomerIdAsync(customerId));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Owner,Customer")]
        public async Task<IActionResult> GetById(int id)
        {
            var receipt = await _service.GetByIdAsync(id);
            if (receipt == null) return NotFound();

            if (User.IsInRole("Customer"))
            {
                var customerId = await GetCurrentCustomerId();
                if (receipt.CustomerId != customerId) return Forbid();
            }

            return Ok(receipt);
        }

        [HttpGet("order/{orderId}")]
        [Authorize(Roles = "Owner,Customer")]
        public async Task<IActionResult> GetByOrder(int orderId)
        {
            var receipt = await _service.GetByOrderIdAsync(orderId);
            if (receipt == null) return NotFound();

            if (User.IsInRole("Customer"))
            {
                var customerId = await GetCurrentCustomerId();
                if (receipt.CustomerId != customerId) return Forbid();
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

        private async Task<int> GetCurrentCustomerId()
        {
            var keycloakUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var customer = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.KeycloakUserId == keycloakUserId);
            return customer?.Id ?? 0;
        }
    }
}
