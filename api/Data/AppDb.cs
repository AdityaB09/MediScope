// api/Data/AppDb.cs
using System.Collections.Concurrent;
using Api.Models;

namespace Api.Data
{
    /// <summary>
    /// Minimal in-memory session log that matches the signatures your API expects.
    /// You can swap this to a Postgres-backed implementation later without changing endpoints.
    /// </summary>
    public class AppDb
    {
        private static readonly ConcurrentQueue<SessionRow> _sessions = new();

        public Task InsertSessionAsync(SessionRow row)
        {
            _sessions.Enqueue(row);
            // keep a bounded log
            while (_sessions.Count > 200 && _sessions.TryDequeue(out _)) {}
            return Task.CompletedTask;
        }

        public Task<List<SessionRow>> LatestAsync(int limit)
        {
            // newest first
            var list = _sessions.Reverse().Take(limit).ToList();
            return Task.FromResult(list);
        }
    }
}
