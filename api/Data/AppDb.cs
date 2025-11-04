using System.Text.Json;
using System.Text.Json.Nodes;
using api.Models;
using Npgsql;

namespace api.Data;

public class AppDb
{
    private readonly string _conn;
    public AppDb(string conn) => _conn = conn;

    public async Task InsertSessionAsync(SessionRow row)
    {
        await using var con = new NpgsqlConnection(_conn);
        await con.OpenAsync();

        var patientJson = JsonSerializer.Serialize(row.PatientJson);
        var shapJson = JsonSerializer.Serialize(row.Shap);

        const string sql = @"
            INSERT INTO sessions (id, created_at, model_version, patient_json, risk_label, risk_score, shap)
            VALUES (@id, @created_at, @model_version, @patient_json::jsonb, @risk_label, @risk_score, @shap::jsonb)";

        await using var cmd = new NpgsqlCommand(sql, con);
        cmd.Parameters.AddWithValue("id", row.Id);
        cmd.Parameters.AddWithValue("created_at", row.CreatedAt);
        cmd.Parameters.AddWithValue("model_version", row.ModelVersion);
        cmd.Parameters.AddWithValue("patient_json", patientJson);
        cmd.Parameters.AddWithValue("risk_label", row.RiskLabel);
        cmd.Parameters.AddWithValue("risk_score", row.RiskScore);
        cmd.Parameters.AddWithValue("shap", shapJson);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<SessionRow>> LatestAsync(int n)
    {
        await using var con = new NpgsqlConnection(_conn);
        await con.OpenAsync();

        const string sql = @"
            SELECT id, created_at, model_version, patient_json, risk_label, risk_score, shap
            FROM sessions
            ORDER BY created_at DESC
            LIMIT @n";

        await using var cmd = new NpgsqlCommand(sql, con);
        cmd.Parameters.AddWithValue("n", n);

        var list = new List<SessionRow>();
        await using var rdr = await cmd.ExecuteReaderAsync();
        while (await rdr.ReadAsync())
        {
            var row = new SessionRow
            {
                Id = rdr.GetGuid(0),
                CreatedAt = rdr.GetDateTime(1),
                ModelVersion = rdr.GetString(2),
                PatientJson = JsonSerializer.Deserialize<JsonObject>(rdr.GetString(3)) ?? new(),
                RiskLabel = rdr.GetString(4),
                RiskScore = rdr.GetDouble(5),
                Shap = JsonSerializer.Deserialize<Dictionary<string,double>>(rdr.GetString(6)) ?? new()
            };
            list.Add(row);
        }
        return list;
    }
}
