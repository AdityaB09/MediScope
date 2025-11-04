using System.Text.Json;

namespace api.Models;

public class PredictResult
{
    public string Label { get; set; } = "";
    public double Prob { get; set; }
    public string? Version { get; set; }

    // Accept whatever the Python service returns for "contribs"
    public JsonElement Contribs { get; set; }  // could be object/null/etc.
}
