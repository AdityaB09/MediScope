using System.Text.Json.Nodes;
namespace api.Models;
public class WhatIfRequest
{
    public JsonObject Base { get; set; } = new();
    public JsonObject Deltas { get; set; } = new();
}
