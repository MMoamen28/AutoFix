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
        private readonly IWorkOrderService _workOrderService;

        public CarsController(ICarService service, AppDbContext db, IWorkOrderService workOrderService)
        {
            _service = service;
            _db = db;
            _workOrderService = workOrderService;
        }

        [HttpGet]
        public async Task<ActionResult<List<CarResponseDto>>> GetAll(
            [FromQuery] string? search,
            [FromQuery] int? mechanicId,
            [FromQuery] bool includeArchived = false)
        {
            if (User.IsInRole("Customer"))
            {
                var customerId = await GetCurrentCustomerId();
                if (customerId == 0) return Ok(new List<CarResponseDto>());
                return Ok(await _service.GetByCustomerIdAsync(customerId, includeArchived));
            }

            if (mechanicId.HasValue && mechanicId.Value > 0)
            {
                return Ok(await _service.GetCarsByMechanicAsync(mechanicId.Value));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                return Ok(await _service.SearchCarsAsync(search, includeArchived));
            }

            return Ok(await _service.GetAllAsync(includeArchived));
        }

        [HttpGet("by-mechanic/{mechanicId:int}")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<List<CarResponseDto>>> GetByMechanic(int mechanicId)
        {
            return Ok(await _service.GetCarsByMechanicAsync(mechanicId));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<CarResponseDto>> GetById(int id)
        {
            var car = await _service.GetByIdAsync(id);
            if (car == null) return NotFound();

            if (User.IsInRole("Customer"))
            {
                var customerId = await GetCurrentCustomerId();
                if (car.CustomerId != customerId) return Forbid();
            }

            return Ok(car);
        }

        [HttpGet("{id:int}/service-history")]
        public async Task<ActionResult<List<AutoFix.DTOs.WorkOrder.CarServiceHistoryDto>>> GetServiceHistory(int id)
        {
            var isCustomer = User.IsInRole("Customer");
            if (isCustomer)
            {
                var customerId = await GetCurrentCustomerId();
                var car = await _service.GetByIdAsync(id);
                if (car == null) return NotFound();
                if (car.CustomerId != customerId) return Forbid();
            }

            var history = await _workOrderService.GetCarServiceHistoryAsync(id, isCustomer);
            return Ok(history);
        }

        [HttpGet("check-duplicate")]
        public async Task<ActionResult<CarResponseDto?>> CheckDuplicate([FromQuery] string plate, [FromQuery] string vin, [FromQuery] int? excludeId)
        {
            var duplicate = await _service.CheckDuplicatePlateOrVinAsync(plate ?? "", vin ?? "", excludeId);
            return Ok(duplicate);
        }

        [HttpPost]
        [Authorize(Roles = "Customer,Admin,Owner")]
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
                if (!dto.CustomerId.HasValue || dto.CustomerId.Value <= 0)
                {
                    return BadRequest(new { message = "CustomerId is required when creating a car as Admin/Owner." });
                }
                customerId = dto.CustomerId.Value;
            }

            try 
            {
                var result = await _service.CreateAsync(dto, customerId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (AutoFix.Exceptions.ValidationWarningException ex)
            {
                return StatusCode(409, new
                {
                    requiresConfirmation = true,
                    code = ex.Code,
                    message = ex.Message,
                    existingRecordId = ex.ExistingRecordId,
                    existingRecordName = ex.ExistingRecordName
                });
            }
            catch (System.InvalidOperationException ex) when (ex.Message.StartsWith("DuplicateCarWarning"))
            {
                return Conflict(new { message = ex.Message, isDuplicateWarning = true });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Customer,Admin,Owner")]
        public async Task<ActionResult<CarResponseDto>> Update(int id, [FromBody] CreateCarDto dto)
        {
            try
            {
                if (User.IsInRole("Customer"))
                {
                    var customerId = await GetCurrentCustomerId();
                    var existing = await _service.GetByIdAsync(id);
                    if (existing == null) return NotFound();
                    if (existing.CustomerId != customerId) return Forbid();
                }

                var updated = await _service.UpdateAsync(id, dto);
                return updated == null ? NotFound() : Ok(updated);
            }
            catch (System.InvalidOperationException ex) when (ex.Message.StartsWith("LowerOdometerWarning"))
            {
                return Conflict(new { message = ex.Message, isLowerOdometerWarning = true });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/odometer")]
        [Authorize(Roles = "Customer,Admin,Owner,Mechanic")]
        public async Task<ActionResult<CarOdometerLogDto>> UpdateOdometer(int id, [FromBody] UpdateOdometerRequestDto request)
        {
            try
            {
                if (User.IsInRole("Customer"))
                {
                    var customerId = await GetCurrentCustomerId();
                    var existing = await _service.GetByIdAsync(id);
                    if (existing == null) return NotFound();
                    if (existing.CustomerId != customerId) return Forbid();
                }

                var result = await _service.UpdateOdometerAsync(id, request);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (System.InvalidOperationException ex) when (ex.Message.StartsWith("LowerOdometerWarning"))
            {
                return Conflict(new { message = ex.Message, isLowerOdometerWarning = true });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}/odometer-history")]
        public async Task<ActionResult<List<CarOdometerLogDto>>> GetOdometerHistory(int id)
        {
            if (User.IsInRole("Customer"))
            {
                var customerId = await GetCurrentCustomerId();
                var existing = await _service.GetByIdAsync(id);
                if (existing == null) return NotFound();
                if (existing.CustomerId != customerId) return Forbid();
            }

            var history = await _service.GetOdometerHistoryAsync(id);
            return Ok(history);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Customer,Admin,Owner")]
        public async Task<IActionResult> Delete(int id)
        {
            return await Archive(id);
        }

        [HttpPost("{id}/archive")]
        [Authorize(Roles = "Customer,Admin,Owner")]
        public async Task<IActionResult> Archive(int id)
        {
            try
            {
                if (User.IsInRole("Customer"))
                {
                    var customerId = await GetCurrentCustomerId();
                    var existing = await _service.GetByIdAsync(id);
                    if (existing == null) return NotFound();
                    if (existing.CustomerId != customerId) return Forbid();
                }

                var success = await _service.ArchiveAsync(id);
                return success ? NoContent() : NotFound();
            }
            catch (System.InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/restore")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Restore(int id)
        {
            var success = await _service.RestoreAsync(id);
            return success ? Ok(new { message = "Car restored successfully." }) : NotFound();
        }

        private async Task<int> GetCurrentCustomerId()
        {
            var customerIdClaim = User.FindFirst("customer_id")?.Value;
            if (int.TryParse(customerIdClaim, out int cid) && cid > 0)
            {
                return cid;
            }

            var username = User.Identity?.Name;
            if (!string.IsNullOrEmpty(username))
            {
                var appUser = await _db.AppUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username);
                if (appUser?.CustomerId != null)
                {
                    return appUser.CustomerId.Value;
                }
            }

            var keycloakUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var customer = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.KeycloakUserId == keycloakUserId);
            return customer?.Id ?? 0;
        }
    }
}
