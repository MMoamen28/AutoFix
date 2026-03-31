using AutoFix.Data;
using AutoFix.Jobs;
using AutoFix.Services;
using AutoFix.Services.Interfaces;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Services (Dependency Injection)
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IMechanicService, MechanicService>();
builder.Services.AddScoped<IRepairOrderService, RepairOrderService>();
builder.Services.AddScoped<ICarService, CarService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<ISparePartService, SparePartService>();
builder.Services.AddScoped<ISparePartCategoryService, SparePartCategoryService>();
builder.Services.AddHttpClient();

// Keycloak JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Keycloak:Authority"];
        options.Audience  = builder.Configuration["Keycloak:Audience"];
        options.RequireHttpsMetadata = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer   = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            RoleClaimType    = "realm_access.roles",
        };

        // Role mapping from Keycloak to ClaimTypes.Role
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var token = context.SecurityToken as System.IdentityModel.Tokens.Jwt.JwtSecurityToken;
                if (token != null)
                {
                    var realmAccess = token.Claims
                        .FirstOrDefault(c => c.Type == "realm_access")?.Value;
                    if (realmAccess != null)
                    {
                        var parsed = JsonDocument.Parse(realmAccess);
                        if (parsed.RootElement.TryGetProperty("roles", out var roles))
                        {
                            var identity = context.Principal?.Identity as System.Security.Claims.ClaimsIdentity;
                            foreach (var role in roles.EnumerateArray())
                            {
                                identity?.AddClaim(new System.Security.Claims.Claim(
                                    System.Security.Claims.ClaimTypes.Role,
                                    role.GetString() ?? ""));
                            }
                        }
                    }
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly",       p => p.RequireRole("Admin"));
    options.AddPolicy("MechanicOrAdmin", p => p.RequireRole("Mechanic", "Admin"));
    options.AddPolicy("CustomerOnly",    p => p.RequireRole("Customer"));
});

// Hangfire
builder.Services.AddHangfire(config =>
    config.UseSqlServerStorage(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddHangfireServer();
builder.Services.AddScoped<OverdueOrderJob>();

// Swagger with Bearer token support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "AutoFix API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        Description  = "Paste your Keycloak JWT token here"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    int retries = 0;
    while (retries < 15)
    {
        try
        {
            logger.LogInformation("Attempting to initialize database (Attempt {0})...", retries + 1);
            db.Database.EnsureCreated();
            logger.LogInformation("Database initialized successfully.");
            break;
        }
        catch (Exception ex)
        {
            retries++;
            logger.LogWarning("Database initialization failed: {0}. Retrying in 5 seconds...", ex.Message);
            System.Threading.Thread.Sleep(5000);
            if (retries >= 15) throw;
        }
    }
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.UseHangfireDashboard("/hangfire");
RecurringJob.AddOrUpdate<OverdueOrderJob>(
    "flag-overdue-orders",
    job => job.FlagOverdueOrdersAsync(),
    Cron.Daily);

RecurringJob.AddOrUpdate<OverdueOrderJob>(
    "flag-low-stock-parts",
    job => job.FlagLowStockPartsAsync(),
    Cron.Daily);

app.MapControllers();
app.Run();
