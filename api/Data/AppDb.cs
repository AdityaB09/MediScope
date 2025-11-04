using Npgsql;
using api.Models;
using System.Text.Json;

namespace api.Data;

public class AppDb
{
    private readonly string _conn;
    public AppDb(string conn) => _conn = conn;

    public async Task InsertSessionAsync(SessionRow row)
    {
        await using var con = new NpgsqlConnection(_conn);
        await con.OpenAsync();
        var cmd = new NpgsqlCommand(@"
INSERT INTO sessions (id, patient_json, risk_label, risk_score, shap, model_version)
VALUES (@id, @patient_json, @risk_label, @risk_score, @shap, @model_version)", con);

        cmd.Parameters.AddWithValue("id", row.Id);
        cmd.Parameters.AddWithValue("patient_json", JsonSerializer.Serialize(row.PatientJson));
        cmd.Parameters.AddWithValue("risk_label", row.RiskLabel);
        cmd.Parameters.AddWithValue("risk_score", row.RiskScore);
        cmd.Parameters.AddWithValue("shap", JsonSerializer.Serialize(row.Shap));
        cmd.Parameters.AddWithValue("model_version", row.ModelVersion);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<SessionRow>> LatestAsync(int limit = 50)
    {
        var results = new List<SessionRow>();
        await using var con = new NpgsqlConnection(_conn);
        await con.OpenAsync();
        var cmd = new NpgsqlCommand(@"
SELECT id, created_at, patient_json, risk_label, risk_score, shap, model_version
FROM sessions ORDER BY created_at DESC LIMIT @limit", con);
        cmd.Parameters.AddWithValue("limit", limit);

        await using var rdr = await cmd.ExecuteReaderAsync();
        while (await rdr.ReadAsync())
        {
            results.Add(new SessionRow
            {
                Id = rdr.GetGuid(0),
                CreatedAt = rdr.GetDateTime(1),
                PatientJson = JsonSerializer.Deserialize<System.Text.Json.Nodes.JsonObject>(rdr.GetString(2))!,
                RiskLabel = rdr.GetString(3),
                RiskScore = rdr.GetDouble(4),
                Shap = JsonSerializer.Deserialize<System.Text.Json.Nodes.JsonObject>(rdr.GetString(5))!,
                ModelVersion = rdr.GetString(6)
            });
        }
        return results;
    }
}
