using AutoFix.DTOs.SparePartCategory;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SparePartCategoriesController : ControllerBase
    {
        private readonly ISparePartCategoryService _service;
        public SparePartCategoriesController(ISparePartCategoryService service) => _service = service;

        [HttpGet]
        [Authorize(Roles = "Admin,Mechanic")]
        public async Task<ActionResult<List<SparePartCategoryResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Mechanic")]
        public async Task<ActionResult<SparePartCategoryResponseDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SparePartCategoryResponseDto>> Create([FromBody] CreateSparePartCategoryDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SparePartCategoryResponseDto>> Update(int id, [FromBody] UpdateSparePartCategoryDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var (success, error) = await _service.DeleteAsync(id);
            if (!success)
            {
                return BadRequest(new { error });
            }
            return NoContent();
        }
    }
}
