using AutoFix.Data;
using AutoFix.DTOs.Expense;
using AutoFix.Models;
using AutoFix.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Owner,Accountant")]
    public class ExpensesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly Services.Interfaces.IRealtimeService _realtime;

        public ExpensesController(AppDbContext db, Services.Interfaces.IRealtimeService realtime)
        {
            _db = db;
            _realtime = realtime;
        }

        [HttpGet]
        public async Task<ActionResult<ExpenseListSummaryDto>> GetExpenses(
            [FromQuery] string period = "month",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var cairoNow = InvoiceService.GetCairoNow();
            DateTime currentStart, currentEnd = cairoNow;

            switch (period?.ToLowerInvariant())
            {
                case "today":
                    currentStart = cairoNow.Date;
                    break;
                case "week":
                    currentStart = cairoNow.Date.AddDays(-6);
                    break;
                case "year":
                    currentStart = new DateTime(cairoNow.Year, 1, 1);
                    break;
                case "custom":
                    currentStart = startDate ?? cairoNow.Date.AddDays(-30);
                    currentEnd = endDate ?? cairoNow;
                    break;
                case "month":
                default:
                    currentStart = new DateTime(cairoNow.Year, cairoNow.Month, 1);
                    break;
            }

            var startUtc = currentStart.AddHours(-2);
            var endUtc = currentEnd.AddHours(-2);

            var list = await _db.TreasuryTransactions
                .AsNoTracking()
                .Where(t => !t.IsDeleted && t.TransactionType == "Expense" && t.TransactionDate >= startUtc && t.TransactionDate <= endUtc)
                .OrderByDescending(t => t.TransactionDate)
                .ToListAsync();

            decimal total = list.Sum(t => t.Amount);
            var byCategory = list
                .GroupBy(t => string.IsNullOrWhiteSpace(t.Category) ? "أخرى" : t.Category)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

            var items = list.Select(t => new ExpenseItemDto
            {
                Id = t.Id,
                Amount = t.Amount,
                Category = string.IsNullOrWhiteSpace(t.Category) ? "أخرى" : t.Category,
                Description = t.Description,
                ReferenceNumber = t.ReferenceNumber,
                TransactionDate = t.TransactionDate,
                PerformedBy = t.PerformedByUserId ?? "ورشة العمل"
            }).ToList();

            return Ok(new ExpenseListSummaryDto
            {
                TotalAmount = total,
                TotalsByCategory = byCategory,
                Items = items
            });
        }

        [HttpPost]
        public async Task<ActionResult<ExpenseItemDto>> CreateExpense([FromBody] CreateExpenseDto dto)
        {
            if (dto.Amount <= 0)
            {
                return BadRequest(new { message = "المبلغ يجب أن يكون أكبر من صفر" });
            }

            var deviceName = Request.Headers["X-Device-Name"].FirstOrDefault() ?? User.Identity?.Name ?? "ورشة العمل";

            var expense = new TreasuryTransaction
            {
                TransactionType = "Expense",
                Amount = dto.Amount,
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "أخرى" : dto.Category.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                ReferenceNumber = dto.ReferenceNumber?.Trim(),
                TransactionDate = dto.TransactionDate ?? DateTime.UtcNow,
                PerformedByUserId = deviceName
            };

            _db.TreasuryTransactions.Add(expense);

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "CreateExpense",
                EntityName = "TreasuryTransaction",
                Details = $"تسجيل مصروف: {dto.Amount} ج.م - تصنيف: {dto.Category} - بيان: {dto.Description}",
                Timestamp = DateTime.UtcNow,
                UserId = deviceName,
                UserName = deviceName
            });

            await _db.SaveChangesAsync();
            await _realtime.NotifyAsync("expense-updated", new { Id = expense.Id, Amount = expense.Amount });
            await _realtime.NotifyAsync("dashboard-updated", new { });

            return Ok(new ExpenseItemDto
            {
                Id = expense.Id,
                Amount = expense.Amount,
                Category = expense.Category,
                Description = expense.Description,
                ReferenceNumber = expense.ReferenceNumber,
                TransactionDate = expense.TransactionDate,
                PerformedBy = expense.PerformedByUserId
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(int id)
        {
            var expense = await _db.TreasuryTransactions.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted && t.TransactionType == "Expense");
            if (expense == null) return NotFound(new { message = "المصروف غير موجود" });

            var deviceName = Request.Headers["X-Device-Name"].FirstOrDefault() ?? User.Identity?.Name ?? "ورشة العمل";

            expense.IsDeleted = true;
            expense.DeletedAt = DateTime.UtcNow;
            expense.DeletedBy = deviceName;

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "DeleteExpense",
                EntityName = "TreasuryTransaction",
                EntityId = expense.Id.ToString(),
                Details = $"حذف مصروف بقيمة: {expense.Amount} ج.م - تصنيف: {expense.Category}",
                Timestamp = DateTime.UtcNow,
                UserId = deviceName,
                UserName = deviceName
            });

            await _db.SaveChangesAsync();
            await _realtime.NotifyAsync("expense-updated", new { Id = expense.Id, Deleted = true });
            await _realtime.NotifyAsync("dashboard-updated", new { });
            return Ok(new { message = "تم حذف المصروف بنجاح" });
        }
    }
}
