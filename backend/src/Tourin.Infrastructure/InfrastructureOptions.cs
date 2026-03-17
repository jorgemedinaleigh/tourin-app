namespace Tourin.Infrastructure;

public sealed class DatabaseOptions
{
  public const string SectionName = "Database";

  public string Provider { get; set; } = "InMemory";
  public string? ConnectionString { get; set; }
  public string InMemoryName { get; set; } = "tourin-dev";
}

public sealed class StorageOptions
{
  public const string SectionName = "Storage";

  public string Region { get; set; } = "us-east-1";
  public string AvatarBucketName { get; set; } = string.Empty;
  public string? PublicBaseUrl { get; set; }
  public int UploadUrlExpiryMinutes { get; set; } = 15;
}
