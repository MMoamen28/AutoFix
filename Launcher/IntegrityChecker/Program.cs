using System;
using Microsoft.Data.Sqlite;

namespace IntegrityChecker
{
    internal class Program
    {
        static int Main(string[] args)
        {
            if (args.Length == 0)
            {
                Console.WriteLine("ALERT: No file specified");
                return 1;
            }

            try
            {
                using var conn = new SqliteConnection($"Data Source={args[0]};Mode=ReadOnly;");
                conn.Open();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "PRAGMA integrity_check;";
                var res = cmd.ExecuteScalar()?.ToString();
                if (res != null && res.Equals("ok", StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine("OK");
                    return 0;
                }
                Console.WriteLine("ALERT: " + res);
                return 2;
            }
            catch (Exception ex)
            {
                Console.WriteLine("ALERT: " + ex.Message);
                return 3;
            }
        }
    }
}
