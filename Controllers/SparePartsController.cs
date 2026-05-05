using AutoFix.DTOs.SparePart;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SparePartsController : ControllerBase
    {
        private readonly ISparePartService _service;
        
        public SparePartsController(ISparePartService service)
        {
            _service = service;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<List<SparePartResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("public-list")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicList()
        {
            return Ok(await _service.GetMarketplaceAsync());
        }

        [HttpGet("public-list/category/{categoryId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicListByCategory(int categoryId)
        {
            return Ok(await _service.GetMarketplaceByCategoryAsync(categoryId));
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<SparePartResponseDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("lowstock")]
        [Authorize(Roles = "Admin,Owner,Mechanic")]
        public async Task<ActionResult<List<SparePartResponseDto>>> GetLowStock()
        {
            return Ok(await _service.GetLowStockAsync());
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Create([FromBody] CreateSparePartDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<ActionResult<SparePartResponseDto>> Update(int id, [FromBody] UpdateSparePartDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPatch("{id}/stock")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> AdjustStock(int id, [FromBody] AdjustStockDto dto)
        {
            var (success, error, part) = await _service.AdjustStockAsync(id, dto);
            if (!success) return BadRequest(new { error });
            return Ok(part);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            return success ? NoContent() : NotFound();
        }


    }
}
