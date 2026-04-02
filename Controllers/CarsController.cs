using AutoFix.DTOs.Car;
using AutoFix.Services.Interfaces;

using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    
    public class CarsController : ControllerBase
    {
        private readonly ICarService _service;
        public CarsController(ICarService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<List<CarResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CarResponseDto>> GetById(int id)
        {
            var car = await _service.GetByIdAsync(id);
            return car == null ? NotFound() : Ok(car);
        }

        [HttpPost]
        
        public async Task<ActionResult<CarResponseDto>> Create([FromBody] CreateCarDto dto)
        {
            var customerId = 1; // Simplified mapping
            var result = await _service.CreateAsync(dto, customerId);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
    }
}
