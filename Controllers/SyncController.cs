using Microsoft.AspNetCore.Mvc;
using System;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SyncController : ControllerBase
    {
        private static long _customersMarker = DateTime.UtcNow.Ticks;
        private static long _workOrdersMarker = DateTime.UtcNow.Ticks;
        private static long _invoicesMarker = DateTime.UtcNow.Ticks;

        public static void NotifyCustomersChanged() => _customersMarker = DateTime.UtcNow.Ticks;
        public static void NotifyWorkOrdersChanged() => _workOrdersMarker = DateTime.UtcNow.Ticks;
        public static void NotifyInvoicesChanged() => _invoicesMarker = DateTime.UtcNow.Ticks;

        public static void UpdateMarker(string entity)
        {
            if (entity.Equals("workorder", StringComparison.OrdinalIgnoreCase)) NotifyWorkOrdersChanged();
            else if (entity.Equals("customer", StringComparison.OrdinalIgnoreCase)) NotifyCustomersChanged();
            else if (entity.Equals("invoice", StringComparison.OrdinalIgnoreCase)) NotifyInvoicesChanged();
        }

        [HttpGet("markers")]
        public IActionResult GetMarkers()
        {
            return Ok(new
            {
                customers = _customersMarker,
                workOrders = _workOrdersMarker,
                invoices = _invoicesMarker
            });
        }
    }
}
