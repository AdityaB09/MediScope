// api/Models/SessionRow.cs
namespace Api.Models;

public record SessionRow(
    DateTime When,
    string Model,
    double Prob,
    double Score
);
