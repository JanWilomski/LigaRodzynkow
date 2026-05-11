using LigaRodzynkow.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting; // <-- Gwarantuje, że widzi AddOpenApi
using Scalar.AspNetCore;            // <-- Gwarantuje, że widzi MapScalarApiReference

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();

var allowFrontendPolicy = "AllowFrontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: allowFrontendPolicy, policy =>
    {
        policy.AllowAnyOrigin() // Zamiast .WithOrigins(...)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Dodanie OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options => 
    {
        options.WithTitle("Liga Rodzynków API");
        options.WithDefaultHttpClient(ScalarTarget.JavaScript, ScalarClient.Fetch);
    });
}



app.UseHttpsRedirection();
app.UseCors(allowFrontendPolicy);
app.UseAuthorization();
app.MapControllers();

app.Run();