using AutoFix.BackgroundServices;
using AutoFix.Data;
using AutoFix.Hubs;
using AutoFix.Middleware;
using AutoFix.Services;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System;
using System.Security.Claims;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Network binding: localhost:5000 by default (external network access OFF)
// Network access from other devices enabled ONLY if Network:AllowExternalAccess is true
var allowExternal = builder.Configuration.GetValue<bool>("Network:AllowExternalAccess", false);
if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    var host = allowExternal ? "0.0.0.0" : "localhost";
    builder.WebHost.UseUrls($"http://{host}:5000");
}

// 1. Data Folder & Configuration Service
using var loggerFactory = LoggerFactory.Create(b => b.AddConsole());
var dataFolderLogger = loggerFactory.CreateLogger<DataFolderService>();
var dataFolder = new DataFolderService(builder.Configuration, dataFolderLogger);
builder.Services.AddSingleton<IDataFolderService>(dataFolder);

// 2. Database Provider Configuration (Sqlite default, SqlServer configurable)
var dbProvider = builder.Configuration["DatabaseProvider"] ?? "Sqlite";

if (dbProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            sqlOptions => sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null)
        ));
}
else
{
    // SQLite (Single-process offline default, WAL mode, Foreign Keys, Busy Timeout)
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(dataFolder.GetConnectionString()));
}

// 3. Dependency Injection Services
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IMechanicService, MechanicService>();
builder.Services.AddScoped<IRepairOrderService, RepairOrderService>();
builder.Services.AddScoped<ICarService, CarService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<ISparePartService, SparePartService>();
builder.Services.AddScoped<IReceiptService, ReceiptService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IRealtimeService, RealtimeService>();

// Stage A Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBackupService, BackupService>();
builder.Services.AddScoped<ISqliteMigrationService, SqliteMigrationService>();
builder.Services.AddHostedService<AutoFixBackgroundWorker>();

// Stage B Services
builder.Services.AddScoped<IWorkOrderService, WorkOrderService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IInspectionService, InspectionService>();
builder.Services.AddScoped<IDraftService, DraftService>();

builder.Services.AddHttpClient();
builder.Services.AddSignalR();

// 4. Authentication Configuration (Local default vs Keycloak legacy)
var authMode = builder.Configuration["AuthMode"] ?? "Local";

if (authMode.Equals("Keycloak", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Keycloak:Authority"];
        options.Audience = builder.Configuration["Keycloak:Audience"];
        options.RequireHttpsMetadata = false;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            RoleClaimType = "roles"
        };
    });
}
else
{
    // Local Authentication (Dynamic random signing key stored in data folder)
    var signingKey = dataFolder.GetOrCreateJwtSigningKey();

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(signingKey),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = ClaimTypes.Role
        };
    });
}

builder.Services.AddAuthorization();

// 5. Swagger / OpenAPI Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AutoFix Workshop API",
        Version = "v1",
        Description = "Offline-First Car Workshop Management System API"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token here}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// 6. Database Migration & Startup Initialization (Migrate() only, no EnsureCreated)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Technical correction: Apply EF Core Migrate() automatically
    db.Database.Migrate();

    // Enable WAL mode, foreign keys, and busy timeout for SQLite
    if (dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
    {
        db.Database.ExecuteSqlRaw("PRAGMA journal_mode = WAL;");
        db.Database.ExecuteSqlRaw("PRAGMA foreign_keys = ON;");
        db.Database.ExecuteSqlRaw("PRAGMA busy_timeout = 5000;");
    }

    // Seed default admin if missing (forces password change on first login)
    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    await authService.EnsureDefaultAdminCreatedAsync();

    // Seed initial workshop services & spare parts
    DbInitializer.Initialize(db);

    // Emergency CLI tool: AutoFix.exe --reset-admin [optionalPassword]
    if (args.Any(a => a.Equals("--reset-admin", StringComparison.OrdinalIgnoreCase)))
    {
        var argList = args.ToList();
        var idx = argList.FindIndex(a => a.Equals("--reset-admin", StringComparison.OrdinalIgnoreCase));
        string? customPass = (idx >= 0 && idx + 1 < argList.Count && !argList[idx + 1].StartsWith("--"))
            ? argList[idx + 1]
            : null;

        await authService.EmergencyResetAdminAsync(customPass);
        Console.WriteLine("[EMERGENCY RESET SUCCESS] Admin account has been unlocked and password reset. Password change is required on next login.");
        return;
    }
}

// 7. HTTP Request Pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger(c =>
{
    c.RouteTemplate = "swagger/{documentName}/swagger.json";
});

app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "AutoFix API v1");
    c.RoutePrefix = "swagger";
    c.DocumentTitle = "AutoFix API Documentation";
    c.DefaultModelsExpandDepth(-1);
    c.DisplayRequestDuration();
});

// Single process: Serve compiled React SPA from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Condition 2: Block application until default admin changes password
app.UseMiddleware<MustChangePasswordMiddleware>();

if (authMode.Equals("Keycloak", StringComparison.OrdinalIgnoreCase))
{
    app.UseMiddleware<UserAutoProvisioningMiddleware>();
}

// 8. Endpoints & SPA Fallback (Strict order: Hub & Controllers FIRST, Fallback LAST)
app.MapHub<AutoFixHub>("/hubs/autofix");
app.MapHub<AutoFixHub>("/repairHub");
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
