using AutoFix.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace AutoFix.BackgroundServices
{
    public class AutoFixBackgroundWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AutoFixBackgroundWorker> _logger;
        private readonly TimeSpan _backupInterval = TimeSpan.FromHours(6);

        public AutoFixBackgroundWorker(IServiceProvider serviceProvider, ILogger<AutoFixBackgroundWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public override async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("AutoFix Background Worker starting...");
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();
                
                // 1. Verify database integrity at startup
                var isHealthy = await backupService.VerifyDatabaseIntegrityAsync();
                if (!isHealthy)
                {
                    _logger.LogCritical("CRITICAL ALERT: Startup database integrity check FAILED!");
                }
                else
                {
                    _logger.LogInformation("Startup database integrity check: PASSED (ok).");
                    // 2. Create startup backup
                    await backupService.CreateBackupAsync("Startup");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during AutoFix Background Worker startup routine.");
            }

            await base.StartAsync(cancellationToken);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_backupInterval, stoppingToken);

                    using var scope = _serviceProvider.CreateScope();
                    var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();
                    _logger.LogInformation("Executing scheduled automated online backup...");
                    await backupService.CreateBackupAsync("Scheduled6Hour");
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error executing scheduled background backup.");
                }
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("AutoFix Background Worker stopping. Taking shutdown safety backup...");
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();
                await backupService.CreateBackupAsync("Shutdown");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create shutdown backup.");
            }

            await base.StopAsync(cancellationToken);
        }
    }
}
