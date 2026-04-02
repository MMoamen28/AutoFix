using AutoFix.DTOs.SparePart;
using AutoFix.Services.Interfaces;
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
        public SparePartsController(ISparePartService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<List<SparePartResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SparePartResponseDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("category/{categoryId}")]
        public async Task<ActionResult<List<SparePartResponseDto>>> GetByCategory(int categoryId)
        {
            return Ok(await _service.GetByCategoryAsync(categoryId));
        }

        [HttpGet("lowstock")]
        public async Task<ActionResult<List<SparePartResponseDto>>> GetLowStock()
        {
            return Ok(await _service.GetLowStockAsync());
        }

        [HttpPost]
        public async Task<ActionResult<SparePartResponseDto>> Create([FromBody] CreateSparePartDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<SparePartResponseDto>> Update(int id, [FromBody] UpdateSparePartDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPatch("{id}/stock")]
        public async Task<ActionResult<SparePartResponseDto>> AdjustStock(int id, [FromBody] AdjustStockDto dto)
        {
            var (success, error, part) = await _service.AdjustStockAsync(id, dto);
            if (!success)
            {
                return BadRequest(new { error });
            }
            return Ok(part);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            return success ? NoContent() : NotFound();
        }
    }
}
