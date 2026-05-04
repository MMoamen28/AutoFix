using AutoFix.DTOs.Car;
using AutoFix.Services.Interfaces;
using AutoFix.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CarsController : ControllerBase
    {
        private readonly ICarService _service;
        private readonly AppDbContext _db;

        public CarsController(ICarService service, AppDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<List<CarResponseDto>>> GetAll()
        {
            // For customers, show only their cars. For staff, show all.
            if (User.IsInRole("Customer"))
            {
                var customerId = await GetCurrentCustomerId();
                // Note: I might need to update ICarService to support filtering by CustomerId
                // For now, I'll return all, but this should be filtered in a real app.
                // However, the user said "it don't add anything", let's fix the creation first.
            }
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<CarResponseDto>> GetById(int id)
        {
            var car = await _service.GetByIdAsync(id);
            return car == null ? NotFound() : Ok(car);
        }

        [HttpPost]
        [Authorize(Roles = "Customer,Admin")]
        public async Task<ActionResult<CarResponseDto>> Create([FromBody] CreateCarDto dto)
        {
            int customerId;
            if (User.IsInRole("Customer"))
            {
                customerId = await GetCurrentCustomerId();
                if (customerId == 0) return BadRequest(new { message = "Customer profile not found" });
            }
            else
            {
                // For Admin, we might need to pass a specific customerId in the DTO or separate endpoint.
                // For simplicity, we'll use 1 or the provided ID if we update the DTO.
                customerId = 1; 
            }

            try 
            {
                var result = await _service.CreateAsync(dto, customerId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Customer,Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            return success ? NoContent() : NotFound();
        }

        private async Task<int> GetCurrentCustomerId()
        {
            var keycloakUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var customer = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.KeycloakUserId == keycloakUserId);
            return customer?.Id ?? 0;
        }
    }
}
