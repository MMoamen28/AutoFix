using AutoFix.Data;
using AutoFix.Jobs;
using AutoFix.Middleware;
using AutoFix.Services;
using AutoFix.Services.Interfaces;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Database - Using ConnectionString from environment (will be set in docker-compose)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services (Dependency Injection)
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IMechanicService, MechanicService>();
builder.Services.AddScoped<IRepairOrderService, RepairOrderService>();
builder.Services.AddScoped<ICarService, CarService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<ISparePartService, SparePartService>();
builder.Services.AddScoped<ISparePartCategoryService, SparePartCategoryService>();
builder.Services.AddScoped<IReceiptService, ReceiptService>();
builder.Services.AddScoped<IMechanicActionRequestService, MechanicActionRequestService>();
builder.Services.AddHttpClient();

// Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Authority = builder.Configuration["Keycloak:Authority"];
    options.Audience = builder.Configuration["Keycloak:Audience"];
    options.RequireHttpsMetadata = false; // For dev
    options.MapInboundClaims = false; // Prevent remapping Keycloak claims to MS claim types
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        // Disable issuer validation in dev: Keycloak issues tokens with 'localhost:8080'
        // but the API resolves Keycloak internally as 'keycloak:8080' (Docker networking).
        ValidateIssuer = false,
        ValidateAudience = true,
        ValidateLifetime = true,
        RoleClaimType = "roles" // Keycloak roles are in 'roles' array
    };
});

builder.Services.AddAuthorization();

// Hangfire - Using ConnectionString from environment
builder.Services.AddHangfire(config =>
    config.UseSqlServerStorage(builder.Configuration.GetConnectionString("Hangfire")));
builder.Services.AddHangfireServer(); // Enable worker in the same API container
builder.Services.AddScoped<OverdueOrderJob>();

// Swagger
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
        Description  = "Paste your JWT token here"
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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",  // Vite dev server
                "http://localhost:3001",  // Vite dev server (secondary)
                "http://localhost:5173"   // Vite fallback port
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});


var app = builder.Build();

// Apply Migrations/Ensure Database on Startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("Ensuring database is created and seeded...");
        db.Database.EnsureCreated();
        DbInitializer.Initialize(db); // Seed initial data for testing
        logger.LogInformation("Database is ready.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during database initialization.");
    }
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.UseHangfireDashboard("/hangfire");

// Recurring Jobs
RecurringJob.AddOrUpdate<OverdueOrderJob>(
    "flag-overdue-orders",
    job => job.FlagOverdueOrdersAsync(),
    Cron.Daily);

RecurringJob.AddOrUpdate<OverdueOrderJob>(
    "flag-low-stock-parts",
    job => job.FlagLowStockPartsAsync(),
    Cron.Daily);

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();


app.Run();
