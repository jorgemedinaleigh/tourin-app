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
    if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
    {
      return false;
    }

    Directory.CreateDirectory(outputDir);

    RunProcess(
      "dotnet",
      $"publish \"{_projectFilePath}\" -c Release -r {_runtimeIdentifier} --self-contained true -p:PublishSingleFile=true -o \"{outputDir}\"");

    var bootstrapPath = Path.Combine(outputDir, "bootstrap");
    File.WriteAllText(
      bootstrapPath,
      $"#!/bin/sh{System.Environment.NewLine}set -e{System.Environment.NewLine}./{_executableName}{System.Environment.NewLine}");

    RunProcess("chmod", $"+x \"{bootstrapPath}\" \"{Path.Combine(outputDir, _executableName)}\"");

    return true;
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
