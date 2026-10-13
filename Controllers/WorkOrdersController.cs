using AutoFix.Data;
using AutoFix.DTOs.Invoice;
using AutoFix.DTOs.WorkOrder;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/work-orders")]
    [Authorize]
    public class WorkOrdersController : ControllerBase
    {
        private readonly IWorkOrderService _service;
        private readonly AppDbContext _db;

        public WorkOrdersController(IWorkOrderService service, AppDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<List<WorkOrderResponseDto>>> GetAll(
            [FromQuery] string? status, 
            [FromQuery] int? customerId,
            [FromQuery] int? mechanicId)
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

            var results = await _service.GetAllAsync(status, customerId, mechanicId, isCustomer);
            return Ok(results);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<WorkOrderResponseDto>> GetById(int id)
        {
            var isCustomer = User.IsInRole("Customer");
            var result = await _service.GetByIdAsync(id, isCustomer);
            if (result == null) return NotFound();

            if (isCustomer)
            {
                var userCustId = User.FindFirst("customer_id")?.Value;
                if (int.TryParse(userCustId, out var cid) && result.CustomerId != cid)
                {
                    return Forbid();
                }
            }

            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception,Mechanic")]
        public async Task<ActionResult<WorkOrderResponseDto>> Create([FromBody] CreateWorkOrderDto dto)
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

        [HttpPost("bundle")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception")]
        public async Task<ActionResult<WorkOrderResponseDto>> CreateBundle([FromBody] CreateWorkOrderBundleDto dto)
        {
            try
            {
                var userName = User.Identity?.Name ?? "Staff";
                var created = await _service.CreateBundleAsync(dto, userName);
                return Ok(created);
            }
            catch (InvalidOperationException ex) when (ex.Message.StartsWith("LowerOdometerWarning"))
            {
                return Conflict(new { message = ex.Message, isLowerOdometerWarning = true });
            }
            catch (InvalidOperationException ex) when (ex.Message.StartsWith("DuplicatePhoneWarning") || ex.Message.StartsWith("DuplicateCarWarning"))
            {
                return Conflict(new { message = ex.Message, isDuplicateWarning = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("car/{carId:int}/history")]
        public async Task<ActionResult<List<CarServiceHistoryDto>>> GetCarServiceHistory(int carId)
        {
            var isCustomer = User.IsInRole("Customer");
            var history = await _service.GetCarServiceHistoryAsync(carId, isCustomer);
            return Ok(history);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception,Mechanic")]
        public async Task<ActionResult<WorkOrderResponseDto>> Update(int id, [FromBody] UpdateWorkOrderDto dto)
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

        [HttpPost("{id:int}/lines")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception")]
        public async Task<ActionResult<WorkOrderResponseDto>> AddLine(int id, [FromBody] CreateWorkOrderLineDto lineDto)
        {
            try
            {
                var userName = User.Identity?.Name ?? "Staff";
                var updated = await _service.AddLineAsync(id, lineDto, userName);
                return Ok(updated);
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

        [HttpPut("{id:int}/lines/{lineId:int}")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception")]
        public async Task<ActionResult<WorkOrderResponseDto>> UpdateLine(int id, int lineId, [FromBody] UpdateWorkOrderLineDto lineDto)
        {
            try
            {
                var userName = User.Identity?.Name ?? "Staff";
                var updated = await _service.UpdateLineAsync(id, lineId, lineDto, userName);
                return Ok(updated);
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

        [HttpDelete("{id:int}/lines/{lineId:int}")]
        [Authorize(Roles = "Admin,Owner,Receptionist,Reception")]
        public async Task<ActionResult<WorkOrderResponseDto>> DeleteLine(int id, int lineId, [FromQuery] string? revisionReason)
        {
            try
            {
                var userName = User.Identity?.Name ?? "Staff";
                var updated = await _service.DeleteLineAsync(id, lineId, userName, revisionReason);
                return Ok(updated);
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

        [HttpPost("{id:int}/assign-mechanics")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<WorkOrderResponseDto>> AssignMechanics(int id, [FromBody] AssignMechanicRequestDto dto)
        {
            try
            {
                var updated = await _service.AssignMechanicsAsync(id, dto);
                return Ok(updated);
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

        [HttpGet("{id:int}/mechanic-history")]
        public async Task<ActionResult<List<WorkOrderMechanicHistoryDto>>> GetMechanicHistory(int id)
        {
            try
            {
                var history = await _service.GetMechanicHistoryAsync(id);
                return Ok(history);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPut("{id:int}/status")]
        [HttpPost("{id:int}/transition")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<WorkOrderResponseDto>> TransitionStatus(int id, [FromBody] WorkOrderStatusTransitionDto dto)
        {
            try
            {
                var updated = await _service.TransitionStatusAsync(id, dto.NewStatus, dto.Notes);
                return Ok(updated);
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

        [HttpPost("{id:int}/items")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<WorkOrderResponseDto>> AddItem(int id, [FromBody] CreateWorkOrderLineDto itemDto)
        {
            try
            {
                var updated = await _service.AddLineAsync(id, itemDto);
                return Ok(updated);
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

        [HttpPost("{id:int}/photos")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<WorkOrderPhotoResponseDto>> UploadPhoto(int id, IFormFile file, [FromForm] string? photoType, [FromForm] string? caption)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded." });
            }

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var photoBytes = ms.ToArray();

            try
            {
                var result = await _service.AddPhotoAsync(id, file.FileName, photoBytes, photoType ?? "Reception", caption);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("{id:int}/convert-to-invoice")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<InvoiceResponseDto>> ConvertToInvoice(int id, [FromBody] ConvertWorkOrderToInvoiceDto? options)
        {
            try
            {
                var invoice = await _service.ConvertToInvoiceAsync(id, options);
                return Ok(invoice);
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

        [HttpGet("{id:int}/print")]
        [HttpGet("{id:int}/print-html")]
        public async Task<IActionResult> PrintOrder(int id)
        {
            try
            {
                var html = await _service.GeneratePrintedOrderHtmlAsync(id);
                return Content(html, "text/html; charset=utf-8");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPatch("{id:int}/claim")]
        [HttpPost("{id:int}/claim")]
        [Authorize(Roles = "Mechanic,Admin,Owner")]
        public async Task<ActionResult<WorkOrderResponseDto>> ClaimOrder(int id)
        {
            var mechanicId = await GetCurrentMechanicId();
            if (mechanicId == 0)
            {
                return BadRequest(new { message = "Mechanic profile not found for current user." });
            }

            try
            {
                var result = await _service.ClaimOrderAsync(id, mechanicId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/credit-invoice")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<InvoiceResponseDto>> CreditInvoice(int id, [FromBody] CreditInvoiceRequestDto? dto)
        {
            try
            {
                var result = await _service.CreditWorkOrderInvoiceAsync(id, dto?.Reason);
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

        private async Task<int> GetCurrentMechanicId()
        {
            var keycloakUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var mechanic = await _db.Mechanics.AsNoTracking().FirstOrDefaultAsync(m => m.KeycloakUserId == keycloakUserId);
            if (mechanic != null) return mechanic.Id;

            var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("preferred_username")?.Value;
            if (!string.IsNullOrEmpty(username))
            {
                var byUser = await _db.Mechanics.AsNoTracking().FirstOrDefaultAsync(m => m.Email == username);
                if (byUser != null) return byUser.Id;
            }
            return 0;
        }

        [HttpGet("{id:int}/inspection")]
        public async Task<IActionResult> GetOrCreateInspection(int id)
        {
            var wo = await _db.WorkOrders.Include(w => w.Customer).Include(w => w.Car).FirstOrDefaultAsync(w => w.Id == id);
            if (wo == null) return NotFound(new { message = $"Work order {id} not found." });

            var existing = await _db.CarInspections.FirstOrDefaultAsync(ci => ci.WorkOrderId == id && !ci.IsDeleted);
            if (existing != null)
            {
                return Ok(new { inspectionId = existing.Id, reportNumber = existing.ReportNumber, status = existing.Status });
            }

            var count = await _db.CarInspections.CountAsync() + 1;
            var reportNum = $"INSP-{DateTime.UtcNow:yyyyMM}-{count:D4}";

            var newInsp = new AutoFix.Models.CarInspection
            {
                ReportNumber = reportNum,
                WorkOrderId = wo.Id,
                CustomerId = wo.CustomerId,
                CustomerName = wo.Customer?.FullName ?? string.Empty,
                CustomerPhone = wo.Customer?.Phone ?? string.Empty,
                CarId = wo.CarId,
                CarPlate = wo.Car?.LicensePlate ?? string.Empty,
                CarChassis = wo.Car?.VIN ?? string.Empty,
                CarMake = wo.Car?.Make ?? string.Empty,
                CarModel = wo.Car?.Model ?? string.Empty,
                CarYear = wo.Car?.Year ?? DateTime.UtcNow.Year,
                OdometerKm = wo.OdometerInKm,
                Status = "Draft",
                InspectedAt = DateTime.UtcNow
            };

            _db.CarInspections.Add(newInsp);
            await _db.SaveChangesAsync();

            return Ok(new { inspectionId = newInsp.Id, reportNumber = newInsp.ReportNumber, status = newInsp.Status });
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

    public class CreditInvoiceRequestDto
    {
        public string? Reason { get; set; }
    }
}
