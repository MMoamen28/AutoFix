using AutoFix.Data;
using AutoFix.Middleware;
using AutoFix.Services;
using AutoFix.Services.Interfaces;
using Hangfire;
using Hangfire.MemoryStorage;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// --- SQLITE FALLBACK FOR TESTING ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=autofix_local.db"));

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
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
builder.Services.AddScoped<IPurchaseReceiptService, PurchaseReceiptService>();
builder.Services.AddHttpClient();

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
builder.Services.AddSwaggerGen();
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
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<UserAutoProvisioningMiddleware>();
app.MapControllers();

app.Run();
