using System.Diagnostics;
using System.Runtime.InteropServices;
using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;

internal sealed class DotNetLambdaBundling : ILocalBundling
{
  private readonly string _projectFilePath;
  private readonly string _runtimeIdentifier;
  private readonly string _executableName;

  public DotNetLambdaBundling(string projectFilePath, string runtimeIdentifier)
  {
    _projectFilePath = projectFilePath;
    _runtimeIdentifier = runtimeIdentifier;
    _executableName = Path.GetFileNameWithoutExtension(projectFilePath);
  }

  public bool TryBundle(string outputDir, IBundlingOptions options)
  {
    Directory.CreateDirectory(outputDir);

    RunProcess(
      "dotnet",
      $"publish \"{_projectFilePath}\" -c Release -r {_runtimeIdentifier} --self-contained true -o \"{outputDir}\"");

    var systemTextJsonSource = ResolveSystemTextJsonPath();
    File.Copy(systemTextJsonSource, Path.Combine(outputDir, "System.Text.Json.dll"), overwrite: true);

    var bootstrapPath = Path.Combine(outputDir, "bootstrap");
    File.WriteAllText(
      bootstrapPath,
      "#!/bin/sh\nset -e\n./" + _executableName + "\n");

    if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
    {
      RunProcess("chmod", $"+x \"{bootstrapPath}\" \"{Path.Combine(outputDir, _executableName)}\"");
    }

    return true;
  }

  private static string ResolveSystemTextJsonPath()
  {
    var homeDirectory = System.Environment.GetFolderPath(System.Environment.SpecialFolder.UserProfile);
    var runtimePackRoot = Path.Combine(homeDirectory, ".nuget", "packages", "microsoft.netcore.app.runtime.linux-x64");

    var systemTextJsonPath = Directory
      .EnumerateDirectories(runtimePackRoot)
      .OrderByDescending(path => path, StringComparer.OrdinalIgnoreCase)
      .Select(path => Path.Combine(path, "runtimes", "linux-x64", "lib", "net8.0", "System.Text.Json.dll"))
      .FirstOrDefault(File.Exists);

    return systemTextJsonPath
      ?? throw new InvalidOperationException($"System.Text.Json.dll was not found under '{runtimePackRoot}'.");
  }

  private static void RunProcess(string fileName, string arguments)
  {
    var startInfo = new ProcessStartInfo(fileName, arguments)
    {
      RedirectStandardOutput = true,
      RedirectStandardError = true,
      UseShellExecute = false,
    };

    using var process = Process.Start(startInfo)
      ?? throw new InvalidOperationException($"Failed to start process '{fileName}'.");

    process.WaitForExit();

    if (process.ExitCode == 0)
    {
      return;
    }

    var standardOutput = process.StandardOutput.ReadToEnd();
    var standardError = process.StandardError.ReadToEnd();

    throw new InvalidOperationException(
      $"Command '{fileName} {arguments}' failed with exit code {process.ExitCode}.{System.Environment.NewLine}{standardOutput}{System.Environment.NewLine}{standardError}");
  }
}
