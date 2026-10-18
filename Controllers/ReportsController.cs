using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly IReportExportService _reportService;

        public ReportsController(IReportExportService reportService)
        {
            _reportService = reportService;
        }

        [HttpGet("business")]
        [Authorize(Roles = "Admin,Owner,Accountant")]
        public async Task<IActionResult> ExportBusinessReport(
            [FromQuery] string periodType = "month",
            [FromQuery] DateTime? date = null,
            [FromQuery] int? year = null,
            [FromQuery] int? month = null)
        {
            try
            {
                var (content, contentType, fileName) = await _reportService.ExportBusinessReportAsync(periodType, date, year, month);
                return File(content, contentType, fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("customer/{customerId:int}")]
        [Authorize(Roles = "Admin,Owner,Accountant")]
        public async Task<IActionResult> ExportCustomerRecord(int customerId)
        {
            try
            {
                var (content, contentType, fileName) = await _reportService.ExportCustomerRecordAsync(customerId);
                return File(content, contentType, fileName);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Customer not found." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("spareparts")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<IActionResult> ExportSpareParts(
            [FromQuery] string? filter = null,
            [FromQuery] string format = "xlsx")
        {
            try
            {
                var (content, contentType, fileName) = await _reportService.ExportSparePartsAsync(filter, format);
                return File(content, contentType, fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
