using AutoFix.Data;
using AutoFix.DTOs.Cart;
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
    [Authorize(Roles = "Customer")]
    public class CartController : ControllerBase
    {
        private readonly ICartService _service;
        private readonly AppDbContext _db;

        public CartController(ICartService service, AppDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var customerId = await GetCurrentCustomerId();
            var cart = await _service.GetCartAsync(customerId);
            return Ok(cart);
        }

        [HttpPost]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDto dto)
        {
            var customerId = await GetCurrentCustomerId();
            try
            {
                var result = await _service.AddToCartAsync(customerId, dto);
                return Ok(result);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{cartItemId}")]
        public async Task<IActionResult> UpdateQuantity(int cartItemId, [FromBody] UpdateCartItemDto dto)
        {
            var customerId = await GetCurrentCustomerId();
            try
            {
                var result = await _service.UpdateQuantityAsync(cartItemId, customerId, dto);
                return result != null ? Ok(result) : NotFound();
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{cartItemId}")]
        public async Task<IActionResult> RemoveItem(int cartItemId)
        {
            var customerId = await GetCurrentCustomerId();
            var result = await _service.RemoveFromCartAsync(cartItemId, customerId);
            return result ? NoContent() : NotFound();
        }

        [HttpDelete]
        public async Task<IActionResult> ClearCart()
        {
            var customerId = await GetCurrentCustomerId();
            await _service.ClearCartAsync(customerId);
            return NoContent();
        }

        [HttpGet("total")]
        public async Task<IActionResult> GetTotal()
        {
            var customerId = await GetCurrentCustomerId();
            var total = await _service.GetCartTotalAsync(customerId);
            return Ok(total);
        }

        private async Task<int> GetCurrentCustomerId()
        {
            var keycloakUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var customer = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.KeycloakUserId == keycloakUserId);
            return customer?.Id ?? 0;
        }
    }
}
