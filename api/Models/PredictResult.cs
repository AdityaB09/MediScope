using System.Text.Json.Nodes;
namespace api.Models;
public class PredictResult
{
    public double Prob { get; set; }
    public string Label { get; set; } = "";
    public int Yhat { get; set; }
    public JsonObject Contribs { get; set; } = new();
    public string Version { get; set; } = "";
}
