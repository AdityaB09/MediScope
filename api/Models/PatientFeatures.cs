using System.Text.Json.Serialization;

namespace api.Models;

public class PatientFeatures
{
    [JsonPropertyName("age")] public double Age { get; set; }
    [JsonPropertyName("sex")] public double Sex { get; set; }
    [JsonPropertyName("cp")] public double Cp { get; set; }
    [JsonPropertyName("trestbps")] public double Trestbps { get; set; }
    [JsonPropertyName("chol")] public double Chol { get; set; }
    [JsonPropertyName("fbs")] public double Fbs { get; set; }
    [JsonPropertyName("restecg")] public double Restecg { get; set; }
    [JsonPropertyName("thalach")] public double Thalach { get; set; }
    [JsonPropertyName("exang")] public double Exang { get; set; }
    [JsonPropertyName("oldpeak")] public double Oldpeak { get; set; }
    [JsonPropertyName("slope")] public double Slope { get; set; }
    [JsonPropertyName("ca")] public double Ca { get; set; }
    [JsonPropertyName("thal")] public double Thal { get; set; }
}
