using AutoFix.DTOs.Draft;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DraftsController : ControllerBase
    {
        private readonly IDraftService _draftService;

        public DraftsController(IDraftService draftService)
        {
            _draftService = draftService;
        }

        private string GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                ?? User.FindFirst("sub")?.Value 
                ?? User.FindFirst(ClaimTypes.Name)?.Value 
                ?? User.FindFirst("preferred_username")?.Value 
                ?? "anonymous";
        }

        [HttpGet("{formKey}")]
        public async Task<ActionResult<FormDraftDto>> GetDraft(string formKey)
        {
            var userId = GetCurrentUserId();
            var draft = await _draftService.GetDraftAsync(userId, formKey);
            if (draft == null) return NotFound();
            return Ok(draft);
        }

        [HttpPost("{formKey}")]
        public async Task<ActionResult<FormDraftDto>> SaveDraft(string formKey, [FromBody] SaveFormDraftDto dto)
        {
            var userId = GetCurrentUserId();
            var draft = await _draftService.SaveDraftAsync(userId, formKey, dto.FormDataJson);
            return Ok(draft);
        }

        [HttpDelete("{formKey}")]
        public async Task<IActionResult> DeleteDraft(string formKey)
        {
            var userId = GetCurrentUserId();
            var deleted = await _draftService.DeleteDraftAsync(userId, formKey);
            return deleted ? NoContent() : NotFound();
        }
    }
}
