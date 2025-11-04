using System.Text.Json.Nodes;

namespace api.Models;

public class SessionRow
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string ModelVersion { get; set; } = "";
    public JsonObject PatientJson { get; set; } = new();
    public string RiskLabel { get; set; } = "";
    public double RiskScore { get; set; }

    // Store SHAP as a dictionary; we’ll serialize to jsonb in AppDb
    public Dictionary<string, double> Shap { get; set; } = new();
}
