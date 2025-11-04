// api/Program.cs
using System.Net.Http.Json;
using Api.Data;
using Api.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true).AllowCredentials()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<AppDb>();

builder.Services.AddHttpClient("py", c => { c.BaseAddress = new Uri("http://python:8001"); })
                .SetHandlerLifetime(TimeSpan.FromMinutes(5));

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();

var py = app.Services.GetRequiredService<IHttpClientFactory>().CreateClient("py");
var db = app.Services.GetRequiredService<AppDb>();

app.MapGet("/health", async () =>
{
    try {
        var pyHealth = await py.GetFromJsonAsync<Dictionary<string,object>>("/health");
        return Results.Json(new { status = "ok", py = pyHealth });
    } catch (Exception e) {
        return Results.Problem(detail: $"python not reachable: {e.Message}");
    }
});

app.MapGet("/metrics/fairness", async () =>
{
    try { return Results.Json(await py.GetFromJsonAsync<object>("/metrics/fairness")); }
    catch (Exception e) { return Results.Problem(detail: e.Message); }
});

app.MapPost("/cohorts/explore", async (HttpRequest req) =>
{
    try {
        var payload = await req.ReadFromJsonAsync<object>() ?? new { };
        var r = await py.PostAsJsonAsync("/cohorts/explore", payload);
        var body = await r.Content.ReadFromJsonAsync<object>() ?? new { };
        return Results.Json(body);
    } catch (Exception e) { return Results.Problem(detail: e.Message); }
});

app.MapPost("/predict", async (HttpRequest req) =>
{
    try {
        var payload = await req.ReadFromJsonAsync<object>() ?? new { };
        var r = await py.PostAsJsonAsync("/predict", payload);

        // NOTE: remove the '?? new {}' type mismatch.
        Prediction? res = await r.Content.ReadFromJsonAsync<Prediction>();
        if (res is null) return Results.Json(new { });

        await db.InsertSessionAsync(new SessionRow(
            DateTime.UtcNow, res.Model ?? "heart-v1", res.Prob, res.Prob));

        return Results.Json(res);
    } catch (Exception e) { return Results.Problem(detail: e.Message); }
});

app.MapPost("/whatif", async (HttpRequest req) =>
{
    try {
        var payload = await req.ReadFromJsonAsync<object>() ?? new { };
        var r = await py.PostAsJsonAsync("/whatif", payload);
        var body = await r.Content.ReadFromJsonAsync<object>() ?? new { };
        return Results.Json(body);
    } catch (Exception e) { return Results.Problem(detail: e.Message); }
});

app.MapPost("/batch/upload", async (HttpRequest req) =>
{
    if (!req.HasFormContentType) return Results.BadRequest(new { error = "multipart/form-data required" });
    var form = await req.ReadFormAsync();
    var file = form.Files["file"];
    if (file is null) return Results.BadRequest(new { error = "file required" });

    using var ms = new MemoryStream();
    await file.CopyToAsync(ms);
    ms.Position = 0;

    using var content = new MultipartFormDataContent();
    content.Add(new StreamContent(ms), "file", file.FileName);

    var r = await py.PostAsync("/batch/upload", content);
    var body = await r.Content.ReadFromJsonAsync<object>() ?? new { };
    return Results.Json(body);
});

app.MapGet("/shap/global", async () =>
{
    try { return Results.Json(await py.GetFromJsonAsync<object>("/shap/global") ?? new { }); }
    catch (Exception e) { return Results.Problem(detail: e.Message); }
});

app.MapGet("/sessions", async () =>
{
    var rows = await db.LatestAsync(25);
    var shaped = rows.Select(s => new {
        when = s.When.ToUniversalTime().ToString("o"),
        model = s.Model,
        prob = s.Prob,
        score = s.Score
    });
    return Results.Json(shaped);
});

app.MapGet("/report.pdf", async () =>
{
    try {
        var b = await py.GetByteArrayAsync("/report.pdf");
        return Results.File(b, "application/pdf", "report.pdf");
    } catch {
        var minimalPdf = Convert.FromBase64String("JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nPj4KZW5kb2JqCnhyZWYKMCAyCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAp0cmFpbGVyCjw8L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjYKYm9vdGxlbmQK");
        return Results.File(minimalPdf, "application/pdf", "report.pdf");
    }
});

app.Run();

// Response shape from python /predict
public record Prediction(double Prob, string? Model);
