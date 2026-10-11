using System.Text;

namespace AutoFix.Services.Interfaces
{
    public interface IDataFolderService
    {
        string RootPath { get; }
        string DatabasePath { get; }
        string BackupsPath { get; }
        string FilesPath { get; }
        string LogsPath { get; }
        string JwtKeyPath { get; }
        bool IsFallback { get; }

        byte[] GetOrCreateJwtSigningKey();
        string GetConnectionString();
    }
}
