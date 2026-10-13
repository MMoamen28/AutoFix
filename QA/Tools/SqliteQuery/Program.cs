using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace SqliteQuery
{
    internal class Program
    {
        static int Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.Error.WriteLine("Usage: SqliteQuery <dbPath> <counts|integrity|query> [sqlString]");
                return 1;
            }

            var dbPath = Path.GetFullPath(args[0]).TrimEnd('\\', '/');
            var forbidden = Path.GetFullPath(@"C:\AutoFixData").TrimEnd('\\', '/');

            // Strictly enforce Safety Guard
            if (dbPath.Equals(forbidden, StringComparison.OrdinalIgnoreCase) ||
                dbPath.Contains(@"\AutoFixData", StringComparison.OrdinalIgnoreCase) ||
                !dbPath.Contains("AutoFixTestData", StringComparison.OrdinalIgnoreCase))
            {
                Console.Error.WriteLine($"[FATAL SAFETY GUARD] Refusing to run SqliteQuery against forbidden path: {dbPath}");
                return 99;
            }

            if (!File.Exists(dbPath))
            {
                Console.Error.WriteLine($"Database file not found: {dbPath}");
                return 2;
            }

            var mode = args[1].ToLowerInvariant();
            var connStr = mode == "exec" ? $"Data Source={dbPath};" : $"Data Source={dbPath};Mode=ReadOnly;";

            try
            {
                using var conn = new SqliteConnection(connStr);
                conn.Open();

                if (mode == "integrity")
                {
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = "PRAGMA integrity_check;";
                    var res = cmd.ExecuteScalar()?.ToString() ?? "unknown";
                    Console.WriteLine(res);
                    return res.Equals("ok", StringComparison.OrdinalIgnoreCase) ? 0 : 2;
                }
                else if (mode == "counts")
                {
                    var tableCounts = new SortedDictionary<string, int>();
                    var tables = new List<string>();

                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__EFMigrationsHistory' ORDER BY name;";
                        using var reader = cmd.ExecuteReader();
                        while (reader.Read())
                        {
                            tables.Add(reader.GetString(0));
                        }
                    }

                    foreach (var tbl in tables)
                    {
                        using var countCmd = conn.CreateCommand();
                        countCmd.CommandText = $"SELECT COUNT(*) FROM \"{tbl}\";";
                        var count = Convert.ToInt32(countCmd.ExecuteScalar());
                        tableCounts[tbl] = count;
                    }

                    var json = JsonSerializer.Serialize(tableCounts, new JsonSerializerOptions { WriteIndented = true });
                    Console.WriteLine(json);
                    return 0;
                }
                else if (mode == "query")
                {
                    if (args.Length < 3)
                    {
                        Console.Error.WriteLine("Missing SQL query string.");
                        return 1;
                    }

                    var sql = args[2];
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = sql;
                    using var reader = cmd.ExecuteReader();

                    var rows = new List<Dictionary<string, object?>>();
                    while (reader.Read())
                    {
                        var row = new Dictionary<string, object?>();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                        }
                        rows.Add(row);
                    }

                    var json = JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true });
                    Console.WriteLine(json);
                    return 0;
                }
                else if (mode == "exec")
                {
                    if (args.Length < 3)
                    {
                        Console.Error.WriteLine("Missing SQL query string.");
                        return 1;
                    }

                    var sql = args[2];
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = sql;
                    var affected = cmd.ExecuteNonQuery();
                    Console.WriteLine($"Rows affected: {affected}");
                    return 0;
                }
                else
                {
                    Console.Error.WriteLine($"Unknown mode: {mode}");
                    return 1;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error: {ex.Message}");
                return 1;
            }
        }
    }
}
