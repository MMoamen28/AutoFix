using AutoFix.DTOs.Auth;
using AutoFix.Services;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;
using Xunit;

namespace AutoFix.Tests
{
    public class AuthAndSecurityTests
    {
        [Fact]
        public async Task EnsureDefaultAdminCreated_SeedsAdminWithMustChangePassword()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<AuthService>();
                var authService = new AuthService(db, dataFolder, logger);

                await authService.EnsureDefaultAdminCreatedAsync();

                var loginRes = await authService.LoginAsync(new LoginRequestDto
                {
                    Username = "admin",
                    Password = "AutoFixAdmin2026!"
                });

                Assert.NotNull(loginRes.AccessToken);
                Assert.Equal("Admin", loginRes.Role);
                Assert.True(loginRes.MustChangePassword); // Condition 2: Must be true initially
            }
        }

        [Fact]
        public async Task ChangePassword_ClearsMustChangePasswordFlag()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<AuthService>();
                var authService = new AuthService(db, dataFolder, logger);

                await authService.EnsureDefaultAdminCreatedAsync();
                var loginRes = await authService.LoginAsync(new LoginRequestDto { Username = "admin", Password = "AutoFixAdmin2026!" });

                var changed = await authService.ChangePasswordAsync(1, new ChangePasswordDto
                {
                    CurrentPassword = "AutoFixAdmin2026!",
                    NewPassword = "MyNewSecurePassword@123"
                });

                Assert.NotNull(changed);
                Assert.False(changed.MustChangePassword);
                Assert.NotNull(changed.AccessToken);

                var profile = await authService.GetUserProfileAsync(1);
                Assert.NotNull(profile);
                Assert.False(profile.MustChangePassword); // Flag cleared

                // Can log in with new password
                var newLogin = await authService.LoginAsync(new LoginRequestDto { Username = "admin", Password = "MyNewSecurePassword@123" });
                Assert.NotNull(newLogin.AccessToken);
                Assert.False(newLogin.MustChangePassword);
            }
        }

        [Fact]
        public async Task Lockout_After5ConsecutiveFailedAttempts_BlocksUser()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<AuthService>();
                var authService = new AuthService(db, dataFolder, logger);
                await authService.EnsureDefaultAdminCreatedAsync();

                // 5 failed attempts
                for (int i = 0; i < 5; i++)
                {
                    await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                        authService.LoginAsync(new LoginRequestDto { Username = "admin", Password = "WrongPassword" }));
                }

                // 6th attempt should be blocked by lockout policy
                var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                    authService.LoginAsync(new LoginRequestDto { Username = "admin", Password = "AutoFixAdmin2026!" }));

                Assert.Contains("locked", ex.Message, StringComparison.OrdinalIgnoreCase);
            }
        }

        [Fact]
        public async Task CustomerRegistration_CreatesCustomerAndAppUser()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<AuthService>();
                var authService = new AuthService(db, dataFolder, logger);

                var regRes = await authService.RegisterCustomerAsync(new RegisterRequestDto
                {
                    Username = "cairo_driver",
                    Password = "DriverPass@2026",
                    FirstName = "Ahmed",
                    LastName = "Hassan",
                    Email = "ahmed@example.com",
                    Phone = "01012345678"
                });

                Assert.NotNull(regRes.AccessToken);
                Assert.Equal("Customer", regRes.Role);
                Assert.False(regRes.MustChangePassword);
            }
        }

        [Fact]
        public async Task EmergencyResetAdmin_UnlocksAccountAndResetsPassword()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger<AuthService>();
                var authService = new AuthService(db, dataFolder, logger);

                await authService.EnsureDefaultAdminCreatedAsync();

                // Lock out the admin
                for (int i = 0; i < 5; i++)
                {
                    await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                        authService.LoginAsync(new LoginRequestDto { Username = "admin", Password = "WrongPassword" }));
                }

                // Verify admin is locked
                var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                    authService.LoginAsync(new LoginRequestDto { Username = "admin", Password = "AutoFixAdmin2026!" }));
                Assert.Contains("locked", ex.Message, StringComparison.OrdinalIgnoreCase);

                // Run emergency reset with custom password
                var resetSuccess = await authService.EmergencyResetAdminAsync("EmergencyPass2026!#");
                Assert.True(resetSuccess);

                // Verify admin can immediately log in with emergency password
                var loginRes = await authService.LoginAsync(new LoginRequestDto
                {
                    Username = "admin",
                    Password = "EmergencyPass2026!#"
                });

                Assert.NotNull(loginRes.AccessToken);
                Assert.True(loginRes.MustChangePassword); // Must change on first login after reset
            }
        }
    }
}
