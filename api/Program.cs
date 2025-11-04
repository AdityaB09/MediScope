using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

using api.Data;
using api.Models;

var builder = WebApplication.CreateBuilder(args);

var pyServiceUrl = Environment.GetEnvironmentVariable("PY_SERVICE_URL") ?? "http://localhost:8001";
var conn = builder.Configuration.GetConnectionString("Main")
           ?? Environment.GetEnvironmentVariable("ConnectionStrings__Main")
           ?? "Host=localhost;Port=5432;Database=mediscope;Username=mediscope;Password=mediscope";
var allowedOrigins = (Environment.GetEnvironmentVariable("AllowedOrigins") ?? "*")
                      .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

// 🔑 Register CORS services (this was missing)
builder.Services.AddCors();

builder.Services.AddSingleton(new AppDb(conn));
builder.Services.AddHttpClient("py", c =>
{
    c.BaseAddress = new Uri(pyServiceUrl);
    c.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

// CORS middleware
app.UseCors(p =>
{
    if (allowedOrigins.Length > 0 && allowedOrigins[0] != "*")
        p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    else
        p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
});

app.MapGet("/health", async (IHttpClientFactory http) =>
{
    var r = await http.CreateClient("py").GetAsync("/health");
    var j = await r.Content.ReadAsStringAsync();
    return Results.Json(new { status = "ok", py = JsonDocument.Parse(j).RootElement });
});

app.MapGet("/models", async (IHttpClientFactory http) =>
{
    var r = await http.CreateClient("py").GetAsync("/models");
    var j = await r.Content.ReadFromJsonAsync<JsonObject>();
    return Results.Json(j);
});

app.MapPost("/config/thresholds", async (HttpRequest req, IHttpClientFactory http) =>
{
    var body = await JsonSerializer.DeserializeAsync<JsonObject>(req.Body) ?? new();
    var r = await http.CreateClient("py").PostAsJsonAsync("/config/thresholds", body);
    var j = await r.Content.ReadFromJsonAsync<JsonObject>();
    return Results.Json(j);
});

app.MapPost("/predict", async (PredictRequest req, IHttpClientFactory http, AppDb db) =>
{
    var client = http.CreateClient("py");
    var httpRes = await client.PostAsJsonAsync("/predict", new { features = req.Features });
    if (!httpRes.IsSuccessStatusCode) return Results.Problem("Model service error", statusCode: 502);
    var json = await httpRes.Content.ReadFromJsonAsync<PredictResult>();
    if (json is null) return Results.Problem("Invalid model response", statusCode: 500);

    var row = new SessionRow
    {
        Id = Guid.NewGuid(),
        CreatedAt = DateTime.UtcNow,
        ModelVersion = json.Version ?? "",
        PatientJson = JsonSerializer.Deserialize<JsonObject>(JsonSerializer.Serialize(req.Features))!,
        RiskLabel = json.Label,
        RiskScore = json.Prob,
        Shap = json.Contribs
    };
    await db.InsertSessionAsync(row);
    return Results.Json(json);
});

app.MapPost("/predict-batch", async (HttpRequest req, IHttpClientFactory http) =>
{
    if (!req.HasFormContentType) return Results.BadRequest("multipart/form-data expected");
    var form = await req.ReadFormAsync();
    var file = form.Files["file"];
    if (file is null) return Results.BadRequest("file missing");
    using var ms = new MemoryStream(); await file.CopyToAsync(ms);
    ms.Position = 0;
    var content = new MultipartFormDataContent();
    content.Add(new StreamContent(ms), "file", file.FileName);
    var r = await http.CreateClient("py").PostAsync("/batch", content);
    var csvText = await r.Content.ReadAsStringAsync();
    return Results.Text(csvText, "text/csv");
});

app.MapPost("/whatif", async (HttpRequest req, IHttpClientFactory http) =>
{
    var body = await JsonSerializer.DeserializeAsync<JsonObject>(req.Body) ?? new();
    var r = await http.CreateClient("py").PostAsJsonAsync("/whatif", body);
    var j = await r.Content.ReadFromJsonAsync<JsonObject>();
    return Results.Json(j);
});

app.MapPost("/report", async (PredictRequest req, IHttpClientFactory http) =>
{
    var client = http.CreateClient("py");
    var httpRes = await client.PostAsJsonAsync("/report/pdf", new { features = req.Features });
    var bytes = await httpRes.Content.ReadAsByteArrayAsync();
    return Results.File(bytes, "application/pdf", "mediscope_report.pdf");
});

app.MapGet("/shap/global", async (IHttpClientFactory http) =>
{
    var r = await http.CreateClient("py").GetAsync("/shap/global");
    var j = await r.Content.ReadFromJsonAsync<JsonObject>();
    return Results.Json(j);
});

app.MapGet("/sessions", async (AppDb db) =>
{
    var items = await db.LatestAsync(50);
    return Results.Json(items);
});

app.Run();
