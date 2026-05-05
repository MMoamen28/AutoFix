using AutoFix.Data;
using AutoFix.Middleware;
using AutoFix.Services;
using AutoFix.Services.Interfaces;
using AutoFix.Hubs;
using Hangfire;
using Hangfire.MemoryStorage;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// --- SQLITE FALLBACK FOR TESTING ---
// --- SQL SERVER CONFIGURATION (RESILIENT) ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null)
    ));

// Services (Dependency Injection)
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IMechanicService, MechanicService>();
builder.Services.AddScoped<IRepairOrderService, RepairOrderService>();
builder.Services.AddScoped<ICarService, CarService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<ISparePartService, SparePartService>();

builder.Services.AddScoped<IReceiptService, ReceiptService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IRealtimeService, RealtimeService>();
builder.Services.AddHttpClient();
builder.Services.AddSignalR();

// Authentication - Keep configuration but allow optional validation
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Authority = builder.Configuration["Keycloak:Authority"];
    options.Audience = builder.Configuration["Keycloak:Audience"];
    options.RequireHttpsMetadata = false;
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false, // Loosen for local testing
        ValidateLifetime = true,
        RoleClaimType = "roles"
    };
});

builder.Services.AddAuthorization();

// Hangfire - Use Memory Storage for testing
builder.Services.AddHangfire(config => config.UseMemoryStorage());
builder.Services.AddHangfireServer();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "AutoFix API",
        Version = "v1",
        Description = "AutoFix Car Repair Management System API"
    });

    // Add JWT Bearer authentication to Swagger UI
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token here}"
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
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated(); // Use EnsureCreated for SQLite local testing
    DbInitializer.Initialize(db);
}

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
    c.DefaultModelsExpandDepth(-1); // Hide schemas section by default
    c.DisplayRequestDuration();
});
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<UserAutoProvisioningMiddleware>();
app.MapHub<AutoFixHub>("/hubs/autofix");
app.MapControllers();

app.Run();
